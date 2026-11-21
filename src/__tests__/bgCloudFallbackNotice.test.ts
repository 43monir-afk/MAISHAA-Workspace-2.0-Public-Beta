import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeBackground } from '../services/bgRemoverService';

// The model inference is stubbed in setup.ts; this checks only that a refused/failed cloud call is
// reported to the user instead of silently using the local processor.
const file = new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' });
const img = new (globalThis as any).Image() as HTMLImageElement;

afterEach(() => vi.unstubAllGlobals());

const stubFetch = (res: Response | Error) =>
  vi.stubGlobal('fetch', vi.fn(async () => { if (res instanceof Error) throw res; return res; }));
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('cloud background removal fallback notice', () => {
  it('401 -> tells the user to sign in, still returns a local result', async () => {
    stubFetch(json(401, { code: 'LOGIN_REQUIRED' }));
    const r = await removeBackground(file, img, { provider: 'cloud_removebg' } as any);
    expect(r.providerUsed).toBe('ai_segmentation');
    expect(r.fallbackNotice).toMatch(/সাইন ইন/);
  });
  it('429 -> passes the server message (daily limit) through', async () => {
    stubFetch(json(429, { message: 'আজকের ফ্রি সীমা (3) শেষ।' }));
    const r = await removeBackground(file, img, { provider: 'cloud_gemini' } as any);
    expect(r.fallbackNotice).toContain('আজকের ফ্রি সীমা (3) শেষ।');
  });
  it('503 and network errors get their own notices', async () => {
    stubFetch(json(503, {}));
    expect((await removeBackground(file, img, { provider: 'cloud_removebg' } as any)).fallbackNotice).toMatch(/পাওয়া যাচ্ছে না/);
    stubFetch(new Error('offline'));
    expect((await removeBackground(file, img, { provider: 'cloud_removebg' } as any)).fallbackNotice).toMatch(/পৌঁছানো যায়নি/);
  });
  it('no notice when the user chose a local provider', async () => {
    stubFetch(json(500, {}));
    const r = await removeBackground(file, img, { provider: 'ai_segmentation' } as any);
    expect(r.fallbackNotice).toBeUndefined();
  });
});
