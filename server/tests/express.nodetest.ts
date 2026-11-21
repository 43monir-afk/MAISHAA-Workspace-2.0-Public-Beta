// Exercises the express glue (mountApi + requireFeature) with a minimal fake of express's app/req/res,
// because express itself is not installed in every environment. Run: npx tsx --test server/tests/express.nodetest.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Api } from '../api';
import { mountApi, requireFeature } from '../express';
import { Store } from '../store';

function fakeApp() {
  const mw: any[] = [];
  const routes: { paths: string[]; fn: any }[] = [];
  return {
    mw, routes,
    set() {},
    use(p: string, fn: any) { mw.push({ p, fn }); },
    all(paths: string[], fn: any) { routes.push({ paths, fn }); },
  };
}
function fakeRes() {
  const res: any = { headers: {} as Record<string, any>, statusCode: 200, body: undefined, listeners: [] as any[] };
  res.setHeader = (k: string, v: any) => { res.headers[k] = v; };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; res.finish(); return res; };
  res.on = (ev: string, fn: any) => { if (ev === 'finish') res.listeners.push(fn); };
  res.finish = () => res.listeners.splice(0).forEach((f: any) => f());
  return res;
}
const mkReq = (over: any = {}) => ({ method: 'GET', path: '/', headers: {}, query: {}, body: {}, ip: '1.2.3.4', secure: false, socket: {}, ...over });

describe('express glue', () => {
  const store = new Store(null);
  const api = new Api({ store, sessionSecret: 's'.repeat(32) });
  const app = fakeApp();
  mountApi(app as any, api);
  const origin = app.mw[0].fn;
  const handler = app.routes[0].fn;

  it('blocks cross-site POSTs but allows same-origin and header-less clients', async () => {
    let nexted = 0;
    const next = () => nexted++;
    const bad = fakeRes();
    origin(mkReq({ method: 'POST', headers: { origin: 'https://evil.example', host: 'workspace.maishaa.bd' } }), bad, next);
    assert.equal(bad.statusCode, 403);
    origin(mkReq({ method: 'POST', headers: { origin: 'https://workspace.maishaa.bd', host: 'workspace.maishaa.bd' } }), fakeRes(), next);
    origin(mkReq({ method: 'POST', headers: { host: 'x' } }), fakeRes(), next);
    assert.equal(nexted, 2);
  });

  it('register sets an HttpOnly cookie and /me returns the user', async () => {
    const res = fakeRes();
    await handler(mkReq({ method: 'POST', path: '/api/auth/register', body: { email: 'a@b.co', password: 'password123' } }), res);
    assert.equal(res.statusCode, 201);
    const cookie = String(res.headers['Set-Cookie'][0]);
    assert.match(cookie, /HttpOnly/);
    const me = fakeRes();
    await handler(mkReq({ path: '/api/auth/me', headers: { cookie: cookie.split(';')[0] } }), me);
    assert.equal(me.body.user.email, 'a@b.co');
  });

  it('requireFeature: 401 anonymous, counts usage only on 2xx, 429 after limit, clamps context', async () => {
    const guard = requireFeature(api, 'aiChat', { clampField: 'documentContext' });
    const anon = fakeRes();
    guard(mkReq({ method: 'POST', body: {} }), anon, () => {});
    assert.equal(anon.statusCode, 401);

    const reg = fakeRes();
    await handler(mkReq({ method: 'POST', path: '/api/auth/register', body: { email: 'c@d.co', password: 'password123' } }), reg);
    const cookie = String(reg.headers['Set-Cookie'][0]).split(';')[0];

    // failed downstream call (503) must not consume quota
    for (let i = 0; i < 6; i++) {
      const res = fakeRes();
      let passed = false;
      const req = mkReq({ method: 'POST', headers: { cookie }, body: { documentContext: 'x'.repeat(20000) } });
      guard(req, res, () => { passed = true; });
      assert.equal(passed, true);
      assert.equal(req.body.documentContext.length, 8000, 'free plan context clamped');
      res.status(503).json({});
    }
    // 5 successful calls
    for (let i = 0; i < 5; i++) {
      const res = fakeRes();
      let passed = false;
      guard(mkReq({ method: 'POST', headers: { cookie } }), res, () => { passed = true; });
      assert.equal(passed, true, `call ${i + 1} should pass`);
      res.status(200).json({ ok: true });
    }
    const sixth = fakeRes();
    guard(mkReq({ method: 'POST', headers: { cookie } }), sixth, () => {});
    assert.equal(sixth.statusCode, 429);
    assert.equal(sixth.body.code, 'LIMIT_REACHED');
  });
});
