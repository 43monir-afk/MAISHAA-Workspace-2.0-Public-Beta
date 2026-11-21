// Run with:  npx tsx --test server/tests/api.nodetest.ts   (node:test, no extra deps)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Api, type ApiRequest, LICENSE_HEADER, SESSION_COOKIE } from '../api';
import { Store } from '../store';

function setup() {
  let t = Date.UTC(2026, 9, 27, 12, 0, 0);
  const store = new Store(null);
  const api = new Api({ store, sessionSecret: 'test-secret-test-secret-test-secret', now: () => t });
  api.ensureAdmin('admin@maishaa.bd', 'adminpass123');
  let ipN = 0;
  const call = async (method: string, path: string, body?: any, cookie?: string, extra: Record<string, string> = {}, ip?: string) => {
    const req: ApiRequest = {
      method, path, query: {}, body: body ?? {},
      headers: { ...(cookie ? { cookie } : {}), ...extra },
      ip: ip ?? `10.0.0.${++ipN % 250}`, secure: false,
    };
    const res = await api.handle(req);
    const sc = res.setCookie?.[0]?.split(';')[0];
    return { ...res, body: res.body as any, cookie: sc };
  };
  return { api, store, call, advance: (ms: number) => (t += ms), now: () => t };
}

async function signup(s: ReturnType<typeof setup>, email = 'user@example.com') {
  const r = await s.call('POST', '/api/auth/register', { email, password: 'password123', name: 'Test' });
  assert.equal(r.status, 201);
  return r.cookie!;
}
async function adminCookie(s: ReturnType<typeof setup>) {
  const r = await s.call('POST', '/api/auth/login', { email: 'admin@maishaa.bd', password: 'adminpass123' });
  assert.equal(r.status, 200);
  return r.cookie!;
}

describe('auth', () => {
  it('registers, reads /me, logs out and rejects wrong password', async () => {
    const s = setup();
    const c = await signup(s);
    const me = await s.call('GET', '/api/auth/me', undefined, c);
    assert.equal(me.body.user.email, 'user@example.com');
    assert.equal(me.body.plan, 'free');
    assert.equal(me.body.user.passwordHash, undefined);
    assert.equal((await s.call('GET', '/api/auth/me')).body.user, null);
    assert.equal((await s.call('POST', '/api/auth/login', { email: 'user@example.com', password: 'nope' })).status, 401);
    assert.equal((await s.call('POST', '/api/auth/login', { email: 'USER@example.com', password: 'password123' })).status, 200);
  });
  it('validates input and blocks duplicate email', async () => {
    const s = setup();
    assert.equal((await s.call('POST', '/api/auth/register', { email: 'bad', password: 'password123' })).status, 400);
    assert.equal((await s.call('POST', '/api/auth/register', { email: 'a@b.co', password: 'short' })).status, 400);
    await signup(s);
    assert.equal((await s.call('POST', '/api/auth/register', { email: 'User@Example.com', password: 'password123' })).status, 409);
  });
  it('rejects tampered cookies and expired sessions', async () => {
    const s = setup();
    const c = await signup(s);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, c + 'x')).body.user, null);
    s.advance(31 * 86_400_000);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, c)).body.user, null);
  });
  it('change-password signs out old sessions', async () => {
    const s = setup();
    const c = await signup(s);
    const r = await s.call('POST', '/api/auth/change-password', { currentPassword: 'password123', newPassword: 'newpassword456' }, c);
    assert.equal(r.status, 200);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, c)).body.user, null);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, r.cookie)).body.user.email, 'user@example.com');
  });
  it('rate-limits repeated login attempts for one email', async () => {
    const s = setup();
    await signup(s);
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await s.call('POST', '/api/auth/login', { email: 'user@example.com', password: 'bad' }, undefined, {}, '9.9.9.9')).status;
    assert.equal(last, 429);
  });
});

describe('admin protection', () => {
  it('requires login and admin role', async () => {
    const s = setup();
    assert.equal((await s.call('GET', '/api/admin/users')).status, 401);
    const c = await signup(s);
    assert.equal((await s.call('GET', '/api/admin/users', undefined, c)).status, 403);
    assert.equal((await s.call('GET', '/api/admin/users', undefined, await adminCookie(s))).status, 200);
  });
});

describe('licences', () => {
  it('admin creates keys; user redeems; plan becomes pro; revoke downgrades', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const created = await s.call('POST', '/api/admin/licenses', { count: 2, durationDays: 30, maxDevices: 2, note: 'bKash 1' }, admin);
    assert.equal(created.status, 201);
    const [k1, k2] = created.body.keys as string[];
    assert.match(k1, /^MSHA-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);

    const list = await s.call('GET', '/api/admin/licenses', undefined, admin);
    assert.equal(JSON.stringify(list.body).includes(k1), false, 'plain key must not be listed');

    const u1 = await signup(s, 'u1@example.com');
    const bad = await s.call('POST', '/api/license/redeem', { key: 'MSHA-AAAAA-AAAAA-AAAAA-AAAAA' }, u1);
    assert.equal(bad.status, 400);
    const ok = await s.call('POST', '/api/license/redeem', { key: k1.toLowerCase().replace(/-/g, ' ') }, u1);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.plan, 'pro');

    const u2 = await signup(s, 'u2@example.com');
    assert.equal((await s.call('POST', '/api/license/redeem', { key: k1 }, u2)).body.code, 'KEY_USED');

    // expiry after 30 days
    s.advance(31 * 86_400_000);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, u1)).body.plan, 'free');
    s.advance(-31 * 86_400_000);

    const id = list.body.licenses.find((l: any) => l.hint === k1.slice(-4)).id;
    await s.call('POST', `/api/admin/licenses/${id}/revoke`, {}, admin);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, u1)).body.plan, 'free');
    assert.equal((await s.call('POST', '/api/license/redeem', { key: k1 }, u1)).body.code, 'KEY_REVOKED');
    assert.ok(k2);
  });

  it('desktop device activation: device limit, token grants pro, validate refreshes, revoke kills it', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const { body } = await s.call('POST', '/api/admin/licenses', { count: 1, durationDays: null, maxDevices: 1 }, admin);
    const key = body.keys[0];
    const a = await s.call('POST', '/api/license/activate-device', { key, deviceId: 'device-aaaaaaaa', deviceName: 'PC-1' });
    assert.equal(a.status, 200);
    const b = await s.call('POST', '/api/license/activate-device', { key, deviceId: 'device-bbbbbbbb' });
    assert.equal(b.body.code, 'DEVICE_LIMIT');

    const me = await s.call('GET', '/api/auth/me', undefined, undefined, { [LICENSE_HEADER]: a.body.token });
    assert.equal(me.body.plan, 'pro');
    assert.equal(me.body.source, 'device');
    assert.equal((await s.call('GET', '/api/auth/me', undefined, undefined, { [LICENSE_HEADER]: a.body.token + 'x' })).body.plan, 'free');

    const v = await s.call('POST', '/api/license/validate', { token: a.body.token });
    assert.equal(v.body.valid, true);

    const lic = (await s.call('GET', '/api/admin/licenses', undefined, admin)).body.licenses[0];
    assert.equal(lic.devices.length, 1);
    await s.call('POST', `/api/admin/licenses/${lic.id}/revoke`, {}, admin);
    assert.equal((await s.call('POST', '/api/license/validate', { token: a.body.token })).body.valid, false);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, undefined, { [LICENSE_HEADER]: a.body.token })).body.plan, 'free');
  });

  it('deactivate frees a device slot', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const key = (await s.call('POST', '/api/admin/licenses', { durationDays: 365, maxDevices: 1 }, admin)).body.keys[0];
    const a = await s.call('POST', '/api/license/activate-device', { key, deviceId: 'device-aaaaaaaa' });
    await s.call('POST', '/api/license/deactivate-device', { token: a.body.token });
    assert.equal((await s.call('POST', '/api/license/activate-device', { key, deviceId: 'device-bbbbbbbb' })).status, 200);
  });

  it('admin can grant pro directly to a user', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const c = await signup(s);
    const uid = (await s.call('GET', '/api/auth/me', undefined, c)).body.user.id;
    const r = await s.call('POST', `/api/admin/users/${uid}/grant-pro`, { durationDays: 30 }, admin);
    assert.equal(r.body.user.plan, 'pro');
    assert.equal((await s.call('GET', '/api/auth/me', undefined, c)).body.plan, 'pro');
    await s.call('POST', `/api/admin/users/${uid}/revoke-pro`, {}, admin);
    assert.equal((await s.call('GET', '/api/auth/me', undefined, c)).body.plan, 'free');
  });
});

describe('Free vs Pro AI limits', () => {
  const req = (cookie?: string, headers: Record<string, string> = {}): ApiRequest => ({
    method: 'POST', path: '/api/ai/chat', query: {}, body: {}, ip: '1.1.1.1', secure: false,
    headers: { ...(cookie ? { cookie } : {}), ...headers },
  });

  it('anonymous -> 401; free chat limited per day; command is Pro only', async () => {
    const s = setup();
    assert.equal((s.api.checkFeature(req(), 'aiChat') as any).status, 401);
    const c = await signup(s);
    for (let i = 0; i < 5; i++) {
      const chk = s.api.checkFeature(req(c), 'aiChat');
      assert.equal(chk.ok, true);
      if (chk.ok) s.api.consume(chk.subject, 'aiChat');
    }
    const sixth = s.api.checkFeature(req(c), 'aiChat') as any;
    assert.equal(sixth.status, 429);
    assert.equal(sixth.code, 'LIMIT_REACHED');
    s.advance(86_400_000); // next UTC day
    assert.equal(s.api.checkFeature(req(c), 'aiChat').ok, true);

    const cmd = s.api.checkFeature(req(c), 'aiCommand') as any;
    assert.equal(cmd.status, 403);
    assert.equal(cmd.code, 'PRO_REQUIRED');
  });

  it('free translate has a character cap; pro raises it and unlocks command', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const c = await signup(s);
    assert.equal((s.api.checkFeature(req(c), 'aiTranslate', 2500) as any).code, 'PRO_REQUIRED');
    assert.equal(s.api.checkFeature(req(c), 'aiTranslate', 1500).ok, true);
    const uid = (await s.call('GET', '/api/auth/me', undefined, c)).body.user.id;
    await s.call('POST', `/api/admin/users/${uid}/grant-pro`, { durationDays: 30 }, admin);
    assert.equal(s.api.checkFeature(req(c), 'aiTranslate', 25000).ok, true);
    assert.equal(s.api.checkFeature(req(c), 'aiCommand').ok, true);
  });

  it('desktop token (no account) gets Pro AI access', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const key = (await s.call('POST', '/api/admin/licenses', { durationDays: 30, maxDevices: 1 }, admin)).body.keys[0];
    const a = await s.call('POST', '/api/license/activate-device', { key, deviceId: 'device-aaaaaaaa' });
    assert.equal(s.api.checkFeature(req(undefined, { [LICENSE_HEADER]: a.body.token }), 'aiCommand').ok, true);
  });
});

describe('contact + settings', () => {
  it('stores messages, honeypot is dropped, admin reads and deletes', async () => {
    const s = setup();
    const ok = await s.call('POST', '/api/contact', { name: 'Rafi', email: 'rafi@example.com', message: 'Pro key kinte chai, kivabe?' });
    assert.equal(ok.status, 201);
    await s.call('POST', '/api/contact', { name: 'Bot', email: 'bot@example.com', message: 'spam spam spam spam', website: 'http://spam' });
    assert.equal((await s.call('POST', '/api/contact', { name: '', email: 'x', message: 'short' })).status, 400);
    const admin = await adminCookie(s);
    const list = await s.call('GET', '/api/admin/contacts', undefined, admin);
    assert.equal(list.body.messages.length, 1);
    assert.equal(list.body.messages[0].ip, undefined);
    assert.equal((await s.call('GET', '/api/admin/stats', undefined, admin)).body.unreadMessages, 1);
    await s.call('POST', `/api/admin/contacts/${list.body.messages[0].id}/read`, {}, admin);
    assert.equal((await s.call('GET', '/api/admin/stats', undefined, admin)).body.unreadMessages, 0);
    await s.call('DELETE', `/api/admin/contacts/${list.body.messages[0].id}`, undefined, admin);
    assert.equal((await s.call('GET', '/api/admin/contacts', undefined, admin)).body.messages.length, 0);
  });
  it('rate-limits the contact form', async () => {
    const s = setup();
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await s.call('POST', '/api/contact', { name: 'A', email: 'a@b.co', message: 'hello hello hello' }, undefined, {}, '7.7.7.7')).status;
    assert.equal(last, 429);
  });
  it('settings accept https download links only and are public via /api/site', async () => {
    const s = setup();
    const admin = await adminCookie(s);
    const bad = await s.call('PUT', '/api/admin/settings', { desktop: { windowsUrl: 'javascript:alert(1)' } }, admin);
    assert.equal(bad.status, 400);
    const ok = await s.call('PUT', '/api/admin/settings', { contactEmail: 'help@maishaa.bd', desktop: { version: '1.0.0', windowsUrl: 'https://github.com/x/y/releases/download/v1/Setup.exe' } }, admin);
    assert.equal(ok.status, 200);
    const pub = await s.call('GET', '/api/site');
    assert.equal(pub.body.desktop.windowsUrl.startsWith('https://'), true);
  });
});

describe('store persistence', () => {
  it('writes atomically and reloads', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maishaa-'));
    const a = new Store(dir);
    const api = new Api({ store: a, sessionSecret: 'x'.repeat(32) });
    api.ensureAdmin('admin@maishaa.bd', 'adminpass123');
    a.flush();
    const b = new Store(dir);
    assert.equal(b.data.users.length, 1);
    assert.equal(b.data.users[0].passwordHash.startsWith('scrypt$'), true);
    assert.ok(SESSION_COOKIE);
  });
});
