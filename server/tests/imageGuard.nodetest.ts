// Tests for the image/AI endpoint protection: pure payload validation, plus an end-to-end run over
// real HTTP with real express (body parser included) using the SAME guards server.ts mounts.
// Only the upstream calls (Gemini / remove.bg) are replaced by stub handlers.
// Run: npx tsx --test server/tests/imageGuard.nodetest.ts
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { AI_FEATURES, type AiFeatureId } from '../../src/config/plans';
import { Api } from '../api';
import { mountApi, protectExpensiveRoutes, requireFeature } from '../express';
import { cleanShortText, imageBodyValidator, sniffImageMime, validateImageBase64 } from '../imageGuard';
import { Store } from '../store';

const MB = 1024 * 1024;
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_HEAD = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBP')]);
/** Smallest real PNG (1x1), same one the vitest setup uses. */
const REAL_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** A buffer of exactly `size` bytes that starts with the given magic bytes. */
const fake = (head: Buffer, size: number) => Buffer.concat([head, Buffer.alloc(Math.max(0, size - head.length))]);

describe('validateImageBase64 (pure)', () => {
  it('accepts real PNG, JPEG and WebP and reports the DETECTED type', () => {
    const png = validateImageBase64(REAL_PNG_B64, 4 * MB);
    assert.ok(png.ok && png.mime === 'image/png' && png.bytes === Buffer.from(REAL_PNG_B64, 'base64').length);
    const jpg = validateImageBase64(fake(JPEG_HEAD, 100).toString('base64'), 4 * MB);
    assert.ok(jpg.ok && jpg.mime === 'image/jpeg');
    const webp = validateImageBase64(fake(WEBP_HEAD, 100).toString('base64'), 4 * MB);
    assert.ok(webp.ok && webp.mime === 'image/webp');
  });

  it('strips a data-URL prefix, whatever MIME it claims (the claim is ignored)', () => {
    const r = validateImageBase64(`data:image/svg+xml;base64,${REAL_PNG_B64}`, 4 * MB);
    assert.ok(r.ok);
    assert.equal(r.mime, 'image/png');
    assert.equal(r.base64, REAL_PNG_B64);
  });

  it('rejects disallowed types with 415 even when the client says image/png', () => {
    const cases: Record<string, Buffer> = {
      gif: fake(Buffer.from('GIF89a'), 64),
      svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      html: Buffer.from('<!doctype html><html></html>'),
      pdf: fake(Buffer.from('%PDF-1.7'), 64),
      exe: fake(Buffer.from('MZ'), 64),
      riffWav: Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WAVE'), Buffer.alloc(20)]),
    };
    for (const [name, buf] of Object.entries(cases)) {
      const r = validateImageBase64(`data:image/png;base64,${buf.toString('base64')}`, 4 * MB);
      assert.ok(!r.ok, `${name} must be rejected`);
      assert.equal(r.status, 415, name);
      assert.equal(r.code, 'UNSUPPORTED_IMAGE_TYPE', name);
    }
  });

  it('rejects malformed input with 400', () => {
    for (const bad of [undefined, null, '', 123, {}, [], 'not base64!!', 'abc', 'data:image/png,rawtext', 'data:image/png;base64,', 'AAAA AAAA']) {
      const r = validateImageBase64(bad, 4 * MB);
      assert.ok(!r.ok, `${JSON.stringify(bad)} must be rejected`);
      assert.equal(r.status, 400, JSON.stringify(bad));
    }
  });

  it('size limit is exact: maxBytes passes, maxBytes + 1 gets 413', () => {
    const max = 1 * MB;
    assert.ok(validateImageBase64(fake(PNG_HEAD, max).toString('base64'), max).ok);
    const over = validateImageBase64(fake(PNG_HEAD, max + 1).toString('base64'), max);
    assert.ok(!over.ok);
    assert.equal(over.status, 413);
    assert.equal(over.code, 'IMAGE_TOO_LARGE');
  });

  it('a gigantic string is refused on length alone, without being decoded', () => {
    const huge = 'A'.repeat(50 * MB);
    const t0 = Date.now();
    const r = validateImageBase64(huge, 4 * MB);
    assert.ok(!r.ok && r.status === 413);
    assert.ok(Date.now() - t0 < 100, 'must not scan or decode the whole string');
  });

  it('sniffImageMime needs the full signature', () => {
    assert.equal(sniffImageMime(Buffer.from([0xff, 0xd8])), null);
    assert.equal(sniffImageMime(Buffer.from('RIFF')), null);
    assert.equal(sniffImageMime(new Uint8Array(0)), null);
  });

  it('cleanShortText: strips control chars, caps length, rejects non-strings', () => {
    assert.deepEqual(cleanShortText(undefined, 10), { ok: true, text: '' });
    assert.deepEqual(cleanShortText('  hi\u0000there\u0007 ', 20), { ok: true, text: 'hithere' });
    assert.equal(cleanShortText('x'.repeat(11), 10).ok, false);
    assert.equal(cleanShortText({ a: 1 }, 10).ok, false);
  });
});

describe('plan config for the new features', () => {
  it('every image feature has a daily quota, size cap, burst limit, and Free < Pro', () => {
    const ids: AiFeatureId[] = ['aiOcr', 'aiImagePrompt', 'bgRemoveCloud'];
    for (const id of ids) {
      const f = AI_FEATURES[id];
      assert.ok(f.free.daily > 0 && f.free.daily < f.pro.daily, id);
      assert.ok(f.free.maxBytes! > 0 && f.free.maxBytes! <= f.pro.maxBytes!, id);
      // base64 of the largest allowed image must fit the 10 MB JSON limit in server.ts
      assert.ok(Math.ceil((f.pro.maxBytes! * 4) / 3) + 1024 < 10 * MB, `${id} fits JSON limit`);
      assert.ok(f.free.burstPerMin! > 0 && f.pro.burstPerMin! > 0, id);
    }
    assert.ok(AI_FEATURES.bgGenerate.free.daily > 0 && AI_FEATURES.bgGenerate.free.maxChars > 0);
  });
});

// ───────────────────────── end-to-end over real HTTP ─────────────────────────

describe('protected image endpoints (real express + real HTTP)', () => {
  const store = new Store(null);
  const api = new Api({ store, sessionSecret: 's'.repeat(32) });
  api.ensureAdmin('boss@example.com', 'adminpass123'); // admin == Pro plan
  let server: Server;
  let base = '';
  const hits: Record<string, number> = {};
  let gate: Promise<void> | null = null; // lets a test hold handlers open to create concurrency
  let failNext = false;

  before(async () => {
    const app = express();
    // Same order as server.ts: pre-body gate -> JSON parser -> account routes -> guarded routes.
    protectExpensiveRoutes(app, api, [
      { path: '/api/ai/ocr', feature: 'aiOcr' },
      { path: '/api/ai/image-to-prompt', feature: 'aiImagePrompt' },
      { path: '/api/image/remove-bg', feature: 'bgRemoveCloud' },
      { path: '/api/image/generate-bg', feature: 'bgGenerate' },
    ]);
    app.use(express.json({ limit: '10mb' }));
    mountApi(app, api);
    const stub = (name: string) => async (req: express.Request, res: express.Response) => {
      hits[name] = (hits[name] || 0) + 1;
      if (gate) await gate;
      if (failNext) {
        failNext = false;
        return res.status(503).json({ status: 'PROVIDER_UNAVAILABLE' });
      }
      res.json({ status: 'SUCCESS', seen: { mimeType: req.body.mimeType, b64Len: req.body.imageBase64?.length, ci: req.body.customInstruction } });
    };
    app.post('/api/ai/ocr', requireFeature(api, 'aiOcr', { validate: imageBodyValidator('aiOcr') }), stub('ocr'));
    app.post('/api/ai/image-to-prompt', requireFeature(api, 'aiImagePrompt', { validate: imageBodyValidator('aiImagePrompt', { textField: 'customInstruction' }) }), stub('prompt'));
    app.post('/api/image/remove-bg', requireFeature(api, 'bgRemoveCloud', { validate: imageBodyValidator('bgRemoveCloud') }), stub('removebg'));
    app.post('/api/image/generate-bg', requireFeature(api, 'bgGenerate', { checkField: 'prompt' }), stub('genbg'));
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const post = (path: string, body: unknown, cookie?: string, extra: Record<string, string> = {}) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...extra },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  async function signUp(email: string): Promise<string> {
    const r = await post('/api/auth/register', { email, password: 'password123' });
    assert.equal(r.status, 201);
    return r.headers.getSetCookie()[0].split(';')[0];
  }
  async function signInAdmin(): Promise<string> {
    const r = await post('/api/auth/login', { email: 'boss@example.com', password: 'adminpass123' });
    assert.equal(r.status, 200);
    return r.headers.getSetCookie()[0].split(';')[0];
  }
  const used = (email: string, feature: AiFeatureId) => {
    const u = store.data.users.find((x) => x.email === email)!;
    return api.usageToday(u.id, feature);
  };
  const png = { imageBase64: `data:image/png;base64,${REAL_PNG_B64}`, mimeType: 'image/png' };

  it('AUTH: anonymous callers get 401 on all four endpoints and no handler runs', async () => {
    const before = { ...hits };
    for (const [path, body] of [
      ['/api/ai/ocr', png],
      ['/api/ai/image-to-prompt', png],
      ['/api/image/remove-bg', png],
      ['/api/image/generate-bg', { prompt: 'blue sky' }],
    ] as const) {
      const r = await post(path, body);
      assert.equal(r.status, 401, path);
      const j = await r.json();
      assert.equal(j.code, 'LOGIN_REQUIRED', path);
    }
    assert.deepEqual(hits, before, 'upstream handlers must not have been reached');
  });

  it('AUTH: a forged or tampered session cookie is rejected', async () => {
    const good = await signUp('forge@example.com');
    const tampered = good.slice(0, -2) + (good.endsWith('AA') ? 'BB' : 'AA');
    assert.equal((await post('/api/ai/ocr', png, tampered)).status, 401);
    assert.equal((await post('/api/ai/ocr', png, 'mw_session=abc.def')).status, 401);
  });

  it('happy path: valid PNG passes, handler sees the DETECTED mime + clean base64, usage is metered', async () => {
    const cookie = await signUp('ok@example.com');
    const r = await post('/api/ai/ocr', { imageBase64: `data:image/jpeg;base64,${REAL_PNG_B64}`, mimeType: 'image/jpeg' }, cookie);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.seen.mimeType, 'image/png', 'client-declared jpeg must be replaced by the sniffed png');
    assert.equal(j.seen.b64Len, REAL_PNG_B64.length, 'data-URL prefix removed');
    assert.equal(used('ok@example.com', 'aiOcr'), 1);
    // old remove-bg contract field `image` is still accepted
    const rb = await post('/api/image/remove-bg', { image: REAL_PNG_B64 }, cookie);
    assert.equal(rb.status, 200);
    assert.equal(used('ok@example.com', 'bgRemoveCloud'), 1);
    // the /api/usage endpoint reports the new features
    const u = await (await fetch(base + '/api/usage', { headers: { cookie } })).json();
    assert.equal(u.features.aiOcr.used, 1);
    assert.equal(u.features.aiOcr.daily, AI_FEATURES.aiOcr.free.daily);
  });

  it('MIME: SVG/GIF/HTML disguised as image/png get 415 and consume no quota', async () => {
    const cookie = await signUp('mime@example.com');
    for (const buf of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), fake(Buffer.from('GIF89a'), 50), Buffer.from('<html>')]) {
      const r = await post('/api/ai/image-to-prompt', { imageBase64: buf.toString('base64'), mimeType: 'image/png' }, cookie);
      assert.equal(r.status, 415);
      assert.equal((await r.json()).code, 'UNSUPPORTED_IMAGE_TYPE');
    }
    assert.equal(used('mime@example.com', 'aiImagePrompt'), 0);
  });

  it('SIZE: free cap is exact (4 MB ok, 4 MB + 1 byte -> 413) and the oversize body is refused before parsing', async () => {
    const cookie = await signUp('size@example.com');
    const max = AI_FEATURES.aiOcr.free.maxBytes!;
    const okRes = await post('/api/ai/ocr', { imageBase64: fake(PNG_HEAD, max).toString('base64') }, cookie);
    assert.equal(okRes.status, 200);
    // +1 byte is rejected by the validator after parsing (code IMAGE_TOO_LARGE, from our code)
    const over = await post('/api/ai/ocr', { imageBase64: fake(PNG_HEAD, max + 1).toString('base64') }, cookie);
    assert.equal(over.status, 413);
    assert.equal((await over.json()).code, 'IMAGE_TOO_LARGE');
    // 9 MB of base64 is refused by the pre-body gate from Content-Length alone
    const before = hits.ocr;
    const huge = await post('/api/ai/ocr', { imageBase64: fake(PNG_HEAD, 6.5 * MB).toString('base64') }, cookie);
    assert.equal(huge.status, 413);
    assert.equal((await huge.json()).code, 'IMAGE_TOO_LARGE');
    assert.equal(hits.ocr, before, 'handler not reached');
    assert.equal(used('size@example.com', 'aiOcr'), 1, 'only the one successful call was metered');
  });

  it('SIZE: Pro plan gets the larger cap', async () => {
    const cookie = await signInAdmin();
    const r = await post('/api/ai/ocr', { imageBase64: fake(PNG_HEAD, 6 * MB).toString('base64') }, cookie);
    assert.equal(r.status, 200);
  });

  it('QUOTA: Free daily limit for OCR is enforced server-side (6th call -> 429 LIMIT_REACHED)', async () => {
    const cookie = await signUp('quota@example.com');
    const daily = AI_FEATURES.aiOcr.free.daily;
    // stay under the 3/min burst limit by clearing it between calls: use distinct windows via fake clock is
    // not available over HTTP, so spend the quota directly through the metering API for the first calls.
    const uid = store.data.users.find((u) => u.email === 'quota@example.com')!.id;
    for (let i = 0; i < daily - 1; i++) api.consume(uid, 'aiOcr');
    const last = await post('/api/ai/ocr', png, cookie);
    assert.equal(last.status, 200, 'the last allowed call still works');
    assert.equal(used('quota@example.com', 'aiOcr'), daily);
    const blocked = await post('/api/ai/ocr', png, cookie);
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, 'LIMIT_REACHED');
    assert.equal(used('quota@example.com', 'aiOcr'), daily, 'a rejected call is not counted');
  });

  it('QUOTA: an exhausted user is refused BEFORE the body is parsed (pre-body gate)', async () => {
    const cookie = await signUp('quota2@example.com');
    const uid = store.data.users.find((u) => u.email === 'quota2@example.com')!.id;
    for (let i = 0; i < AI_FEATURES.aiOcr.free.daily; i++) api.consume(uid, 'aiOcr');
    // invalid JSON would be a 400 from body-parser if it were parsed first; the gate answers 429 instead
    const r = await post('/api/ai/ocr', '{ this is not json', cookie);
    assert.equal(r.status, 429);
    assert.equal((await r.json()).code, 'LIMIT_REACHED');
  });

  it('QUOTA: failed upstream (503) refunds the reserved slot', async () => {
    const cookie = await signUp('refund@example.com');
    failNext = true;
    const r = await post('/api/image/remove-bg', png, cookie);
    assert.equal(r.status, 503);
    assert.equal(used('refund@example.com', 'bgRemoveCloud'), 0);
    const ok = await post('/api/image/remove-bg', png, cookie);
    assert.equal(ok.status, 200);
    assert.equal(used('refund@example.com', 'bgRemoveCloud'), 1);
  });

  it('QUOTA RACE: parallel requests cannot exceed the daily limit (only the remaining slots reach the provider)', async () => {
    // Isolate the reservation logic from the burst limiter: leave 2 daily slots, but allow a burst of 3,
    // so ONLY the quota reservation can stop the third parallel request.
    const cookie = await signUp('race@example.com');
    const uid = store.data.users.find((u) => u.email === 'race@example.com')!.id;
    const { daily, burstPerMin } = AI_FEATURES.aiOcr.free;
    const remaining = 2;
    assert.ok(burstPerMin! > remaining, 'test precondition: burst limit must be higher than the remaining quota');
    for (let i = 0; i < daily - remaining; i++) api.consume(uid, 'aiOcr');

    let release!: () => void;
    gate = new Promise<void>((r) => (release = r)); // hold every handler open so all requests overlap
    const before = hits.ocr || 0;
    const calls = Array.from({ length: burstPerMin! }, () => post('/api/ai/ocr', png, cookie));
    await new Promise((r) => setTimeout(r, 300));
    release();
    gate = null;
    const results = await Promise.all(calls);
    const statuses = results.map((r) => r.status).sort();
    assert.equal(statuses.filter((s) => s === 200).length, remaining, `statuses: ${statuses}`);
    const blocked = results.find((r) => r.status === 429)!;
    assert.equal((await blocked.json()).code, 'LIMIT_REACHED', 'rejected by quota, not by the burst limiter');
    assert.equal((hits.ocr || 0) - before, remaining, 'only the remaining slots reached the paid provider');
    assert.equal(used('race@example.com', 'aiOcr'), daily);
  });

  it('RATE LIMIT: per-minute burst limit applies even when the daily quota remains (Pro OCR)', async () => {
    const cookie = await signInAdmin();
    const burst = AI_FEATURES.aiOcr.pro.burstPerMin!;
    let ok = 0;
    let limited: any = null;
    for (let i = 0; i < burst + 3; i++) {
      const r = await post('/api/ai/ocr', png, cookie);
      if (r.status === 200) ok++;
      else if (r.status === 429) limited ||= await r.json();
    }
    // the earlier Pro-size test already used one slot of this minute
    assert.ok(ok <= burst && ok >= burst - 1, `ok=${ok}`);
    assert.equal(limited?.code, 'RATE_LIMITED');
  });

  it('TEXT: generate-bg prompt length follows the plan; non-string / empty inputs are rejected', async () => {
    const cookie = await signUp('text@example.com');
    const tooLong = await post('/api/image/generate-bg', { prompt: 'x'.repeat(AI_FEATURES.bgGenerate.free.maxChars + 1) }, cookie);
    assert.equal(tooLong.status, 403);
    assert.equal((await tooLong.json()).code, 'PRO_REQUIRED');
    const ci = await post('/api/ai/image-to-prompt', { ...png, customInstruction: 'y'.repeat(501) }, cookie);
    assert.equal(ci.status, 400);
    assert.equal((await ci.json()).code, 'BAD_TEXT');
    const ciType = await post('/api/ai/image-to-prompt', { ...png, customInstruction: { evil: true } }, cookie);
    assert.equal(ciType.status, 400);
    assert.equal(used('text@example.com', 'aiImagePrompt'), 0);
    assert.equal(used('text@example.com', 'bgGenerate'), 0);
  });

  it('CSRF: a cross-site POST that rides on the cookie is blocked (existing same-origin check still covers new routes)', async () => {
    const cookie = await signUp('csrf@example.com');
    const r = await post('/api/ai/ocr', png, cookie, { origin: 'https://evil.example' });
    assert.equal(r.status, 403);
    assert.equal(used('csrf@example.com', 'aiOcr'), 0);
  });
});
