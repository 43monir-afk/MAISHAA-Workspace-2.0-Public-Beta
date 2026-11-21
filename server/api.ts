/**
 * Framework-agnostic API core: auth, Free/Pro entitlements, licence keys,
 * contact form and admin panel. Express is only a thin adapter (express.ts),
 * so everything here is unit-testable with plain objects.
 */
import { AI_FEATURES, type AiFeatureId, type PlanId, limitFor } from '../src/config/plans';
import {
  generateLicenseKey,
  hashLicenseKey,
  hashPassword,
  randomId,
  signToken,
  verifyPassword,
  verifyToken,
} from './crypto';
import { RateLimiter } from './ratelimit';
import { Store, type License, type Settings, type User, defaultSettings } from './store';

export interface ApiRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: any;
  /** lower-case header names */
  headers: Record<string, string | undefined>;
  ip: string;
  secure: boolean;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  setCookie?: string[];
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export interface ApiOptions {
  store: Store;
  sessionSecret: string;
  now?: () => number;
}

export const SESSION_COOKIE = 'mw_session';
export const LICENSE_HEADER = 'x-maishaa-license';
const DAY = 86_400_000;
const SESSION_TTL = 30 * DAY;
const DEVICE_TOKEN_TTL = 30 * DAY;

export interface Identity {
  user: User | null;
  /** licence proven by a desktop-app token (no account needed) */
  deviceLicense: License | null;
  plan: PlanId;
  source: 'anonymous' | 'account' | 'admin' | 'device';
  /** stable id used for usage metering */
  subject: string | null;
}

type Handler = (ctx: { req: ApiRequest; id: Identity; params: Record<string, string> }) => Promise<ApiResponse> | ApiResponse;
interface Route {
  method: string;
  re: RegExp;
  keys: string[];
  auth: 'none' | 'user' | 'admin';
  handler: Handler;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const json = (status: number, body: unknown, setCookie?: string[]): ApiResponse => ({ status, body, setCookie });

export function normalizeEmail(email: unknown): string {
  return String(email ?? '').trim().toLowerCase();
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export class Api {
  readonly store: Store;
  private secret: string;
  private now: () => number;
  private routes: Route[] = [];
  private limiter = new RateLimiter();

  constructor(opts: ApiOptions) {
    this.store = opts.store;
    this.secret = opts.sessionSecret;
    this.now = opts.now ?? Date.now;
    this.registerRoutes();
  }

  // ───────────────────────── public helpers ─────────────────────────

  /** Create the admin account from env on boot (never overwrites an existing password). */
  ensureAdmin(email: string, password: string): void {
    const e = normalizeEmail(email);
    if (!EMAIL_RE.test(e) || password.length < 8) {
      throw new Error('ADMIN_EMAIL must be a valid email and ADMIN_PASSWORD at least 8 characters.');
    }
    const existing = this.store.data.users.find((u) => u.email === e);
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        this.store.save();
      }
      return;
    }
    this.store.data.users.push(this.newUser(e, 'Admin', password, 'admin'));
    this.store.save();
  }

  /** Who is calling? Reads the session cookie and the desktop licence header. */
  identify(req: ApiRequest): Identity {
    const anon: Identity = { user: null, deviceLicense: null, plan: 'free', source: 'anonymous', subject: null };
    const cookies = parseCookies(req.headers['cookie']);
    const session = cookies[SESSION_COOKIE]
      ? verifyToken<{ uid: string; v: number; exp: number }>(cookies[SESSION_COOKIE], this.secret)
      : null;
    if (session && session.exp > this.now()) {
      const user = this.store.data.users.find((u) => u.id === session.uid);
      if (user && !user.disabled && user.tokenVersion === session.v) {
        const plan = this.planOfUser(user);
        return { user, deviceLicense: null, plan, source: user.role === 'admin' ? 'admin' : 'account', subject: user.id };
      }
    }
    const dev = req.headers[LICENSE_HEADER];
    if (dev) {
      const lic = this.licenseFromDeviceToken(dev);
      if (lic) return { ...anon, deviceLicense: lic, plan: 'pro', source: 'device', subject: `lic:${lic.id}` };
    }
    return anon;
  }

  /**
   * Gate a server-side AI feature. Does NOT consume quota; call consume() after
   * the work succeeded.
   */
  checkFeature(req: ApiRequest, feature: AiFeatureId, textLength = 0):
    | { ok: true; subject: string; plan: PlanId }
    | { ok: false; status: number; code: string; error: string } {
    const id = this.identify(req);
    if (!id.subject) {
      return { ok: false, status: 401, code: 'LOGIN_REQUIRED', error: 'এআই ফিচার ব্যবহার করতে সাইন ইন করুন। (Sign in to use AI features.)' };
    }
    const limit = limitFor(feature, id.plan);
    const label = AI_FEATURES[feature];
    if (limit.daily <= 0) {
      return {
        ok: false,
        status: 403,
        code: 'PRO_REQUIRED',
        error: `${label.labelBn} শুধু Pro প্ল্যানে পাওয়া যায়। (${label.labelEn} is a Pro feature.)`,
      };
    }
    if (textLength > limit.maxChars) {
      return {
        ok: false,
        status: id.plan === 'free' ? 403 : 413,
        code: id.plan === 'free' ? 'PRO_REQUIRED' : 'TOO_LARGE',
        error:
          id.plan === 'free'
            ? `ফ্রি প্ল্যানে সর্বোচ্চ ${limit.maxChars.toLocaleString()} অক্ষর। বেশি টেক্সটের জন্য Pro নিন। (Free plan limit: ${limit.maxChars.toLocaleString()} characters.)`
            : `Text too large (max ${limit.maxChars.toLocaleString()} characters).`,
      };
    }
    if (this.usageToday(id.subject, feature) >= limit.daily) {
      return {
        ok: false,
        status: 429,
        code: 'LIMIT_REACHED',
        error:
          id.plan === 'free'
            ? `আজকের ফ্রি সীমা (${limit.daily}) শেষ। কাল আবার চেষ্টা করুন বা Pro নিন। (Daily free limit reached.)`
            : `Daily limit (${limit.daily}) reached. Try again tomorrow.`,
      };
    }
    return { ok: true, subject: id.subject, plan: id.plan };
  }

  consume(subject: string, feature: AiFeatureId): void {
    const day = this.dayKey();
    const key = `${subject}|${day}`;
    const bucket = (this.store.data.usage[key] ||= {});
    bucket[feature] = (bucket[feature] || 0) + 1;
    // prune old days
    const cutoff = this.dayKey(this.now() - 3 * DAY);
    for (const k of Object.keys(this.store.data.usage)) {
      if (k.split('|')[1] < cutoff) delete this.store.data.usage[k];
    }
    this.store.save();
  }

  /** Undo one consume() (the work failed after the quota slot was reserved). Never goes below 0. */
  refund(subject: string, feature: AiFeatureId): void {
    const bucket = this.store.data.usage[`${subject}|${this.dayKey()}`];
    if (!bucket || !bucket[feature]) return;
    bucket[feature] -= 1;
    this.store.save();
  }

  /** Sliding-window burst limiter shared with the auth limiter. true = allowed (and recorded). */
  allowBurst(key: string, max: number, windowMs: number): boolean {
    return this.limiter.allow(`burst:${key}`, max, windowMs, this.now());
  }

  usageToday(subject: string, feature: AiFeatureId): number {
    return this.store.data.usage[`${subject}|${this.dayKey()}`]?.[feature] || 0;
  }

  async handle(req: ApiRequest): Promise<ApiResponse> {
    try {
      const path = req.path.replace(/\/+$/, '') || '/';
      for (const r of this.routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(path);
        if (!m) continue;
        const params: Record<string, string> = {};
        r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        const id = this.identify(req);
        if (r.auth !== 'none' && !id.user) throw new HttpError(401, 'Please sign in.', 'LOGIN_REQUIRED');
        if (r.auth === 'admin' && id.user?.role !== 'admin') throw new HttpError(403, 'Admin only.', 'FORBIDDEN');
        return await r.handler({ req, id, params });
      }
      return json(404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { error: err.message, code: err.code });
      console.error('[api] unexpected error', err);
      return json(500, { error: 'Server error. Please try again.' });
    }
  }

  // ───────────────────────── internals ─────────────────────────

  private dayKey(t = this.now()): string {
    return new Date(t).toISOString().slice(0, 10);
  }

  private newUser(email: string, name: string, password: string, role: 'user' | 'admin'): User {
    return {
      id: randomId(8),
      email,
      name,
      passwordHash: hashPassword(password),
      role,
      disabled: false,
      tokenVersion: 1,
      licenseId: null,
      createdAt: this.now(),
      lastLoginAt: null,
    };
  }

  private licenseValid(l: License | undefined | null): boolean {
    return !!l && l.status === 'active' && (l.expiresAt === null || l.expiresAt > this.now());
  }

  private planOfUser(u: User): PlanId {
    if (u.role === 'admin') return 'pro';
    const l = u.licenseId ? this.store.data.licenses.find((x) => x.id === u.licenseId) : null;
    return this.licenseValid(l) ? 'pro' : 'free';
  }

  private licenseFromDeviceToken(token: string): License | null {
    const p = verifyToken<{ lid: string; did: string; exp: number }>(token, this.secret);
    if (!p || typeof p.exp !== 'number' || p.exp < this.now()) return null;
    const lic = this.store.data.licenses.find((l) => l.id === p.lid);
    if (!lic || !this.licenseValid(lic)) return null;
    if (!lic.devices.some((d) => d.deviceId === p.did)) return null;
    return lic;
  }

  private sessionCookie(user: User, secure: boolean): string[] {
    const exp = this.now() + SESSION_TTL;
    const token = signToken({ uid: user.id, v: user.tokenVersion, exp }, this.secret);
    return [`${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}${secure ? '; Secure' : ''}`];
  }

  private clearCookie(secure: boolean): string[] {
    return [`${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`];
  }

  private licenseOfUser(u: User): License | null {
    return u.licenseId ? this.store.data.licenses.find((l) => l.id === u.licenseId) ?? null : null;
  }

  private publicUser(u: User) {
    const lic = this.licenseOfUser(u);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: this.planOfUser(u),
      license: lic
        ? { hint: lic.hint, expiresAt: lic.expiresAt, status: this.licenseValid(lic) ? 'active' : lic.status === 'revoked' ? 'revoked' : 'expired', devices: lic.devices.length, maxDevices: lic.maxDevices }
        : null,
      createdAt: u.createdAt,
    };
  }

  private adminLicense(l: License) {
    const owner = l.redeemedBy ? this.store.data.users.find((u) => u.id === l.redeemedBy) : null;
    return {
      id: l.id,
      hint: l.hint,
      durationDays: l.durationDays,
      maxDevices: l.maxDevices,
      note: l.note,
      status: l.status === 'revoked' ? 'revoked' : this.licenseValid(l) ? (l.activatedAt ? 'in_use' : 'unused') : 'expired',
      createdAt: l.createdAt,
      activatedAt: l.activatedAt,
      expiresAt: l.expiresAt,
      redeemedBy: owner ? owner.email : null,
      devices: l.devices.map((d) => ({ name: d.name, activatedAt: d.activatedAt, lastSeenAt: d.lastSeenAt })),
    };
  }

  private limit(req: ApiRequest, bucket: string, max: number, windowMs: number, extra = '') {
    if (!this.limiter.allow(`${bucket}:${req.ip}${extra}`, max, windowMs, this.now())) {
      throw new HttpError(429, 'অনেকবার চেষ্টা করা হয়েছে, একটু পরে আবার চেষ্টা করুন। (Too many attempts, please wait.)', 'RATE_LIMITED');
    }
  }

  private findLicenseByKey(key: unknown): License {
    if (typeof key !== 'string' || key.trim().length < 8 || key.length > 64) throw new HttpError(400, 'Invalid licence key.', 'INVALID_KEY');
    const h = hashLicenseKey(key);
    const lic = this.store.data.licenses.find((l) => l.keyHash === h);
    if (!lic) throw new HttpError(400, 'Invalid licence key.', 'INVALID_KEY');
    if (lic.status === 'revoked') throw new HttpError(400, 'This key has been revoked. Please contact support.', 'KEY_REVOKED');
    if (lic.expiresAt !== null && lic.expiresAt <= this.now()) throw new HttpError(400, 'This key has expired.', 'KEY_EXPIRED');
    return lic;
  }

  private startLicenseClock(l: License) {
    if (l.activatedAt === null) {
      l.activatedAt = this.now();
      l.expiresAt = l.durationDays === null ? null : l.activatedAt + l.durationDays * DAY;
    }
  }

  private issueDeviceToken(l: License, deviceId: string): { token: string; expiresAt: number } {
    const exp = Math.min(l.expiresAt ?? Infinity, this.now() + DEVICE_TOKEN_TTL);
    return { token: signToken({ lid: l.id, did: deviceId, iat: this.now(), exp }, this.secret), expiresAt: exp };
  }

  private createLicense(opts: { durationDays: number | null; maxDevices: number; note: string; by: string }): { license: License; key: string } {
    let key = generateLicenseKey();
    while (this.store.data.licenses.some((l) => l.keyHash === hashLicenseKey(key))) key = generateLicenseKey();
    const license: License = {
      id: randomId(8),
      keyHash: hashLicenseKey(key),
      hint: key.slice(-4),
      plan: 'pro',
      durationDays: opts.durationDays,
      maxDevices: opts.maxDevices,
      note: opts.note,
      status: 'active',
      createdAt: this.now(),
      createdBy: opts.by,
      activatedAt: null,
      expiresAt: null,
      redeemedBy: null,
      devices: [],
    };
    this.store.data.licenses.push(license);
    return { license, key };
  }

  private parseDuration(v: unknown): number | null {
    if (v === null || v === undefined || v === '' || v === 'lifetime') return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 3650) throw new HttpError(400, 'durationDays must be 1–3650 or empty for lifetime.');
    return n;
  }

  private route(method: string, pattern: string, auth: Route['auth'], handler: Handler) {
    const keys: string[] = [];
    const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_m, k) => (keys.push(k), '([^/]+)')) + '$');
    this.routes.push({ method, re, keys, auth, handler });
  }

  // ───────────────────────── routes ─────────────────────────

  private registerRoutes() {
    const S = this.store;
    const r = this.route.bind(this);

    r('GET', '/api/site', 'none', () => {
      const s = S.data.settings;
      return json(200, { siteName: s.siteName, contactEmail: s.contactEmail, howToBuy: s.howToBuy, desktop: s.desktop });
    });

    // ── auth ──
    r('POST', '/api/auth/register', 'none', ({ req }) => {
      this.limit(req, 'register', 10, 3_600_000);
      const email = normalizeEmail(req.body?.email);
      const name = str(req.body?.name, 80) || email.split('@')[0];
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!EMAIL_RE.test(email)) throw new HttpError(400, 'সঠিক ইমেইল দিন। (Enter a valid email.)', 'BAD_EMAIL');
      if (password.length < 8 || password.length > 200) throw new HttpError(400, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে। (Password must be at least 8 characters.)', 'WEAK_PASSWORD');
      if (S.data.users.some((u) => u.email === email)) throw new HttpError(409, 'এই ইমেইল আগে থেকেই নিবন্ধিত। (Email already registered.)', 'EMAIL_TAKEN');
      const user = this.newUser(email, name, password, 'user');
      user.lastLoginAt = this.now();
      S.data.users.push(user);
      S.save();
      return json(201, { user: this.publicUser(user) }, this.sessionCookie(user, req.secure));
    });

    r('POST', '/api/auth/login', 'none', ({ req }) => {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      this.limit(req, 'login-ip', 20, 15 * 60_000);
      this.limit(req, 'login-email', 8, 15 * 60_000, `:${email}`);
      const user = S.data.users.find((u) => u.email === email);
      // verify even when user is missing, to keep timing similar
      const ok = verifyPassword(password, user?.passwordHash ?? 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA');
      if (!user || !ok) throw new HttpError(401, 'ইমেইল বা পাসওয়ার্ড ভুল। (Wrong email or password.)', 'BAD_CREDENTIALS');
      if (user.disabled) throw new HttpError(403, 'এই অ্যাকাউন্ট বন্ধ আছে। (This account is disabled.)', 'DISABLED');
      user.lastLoginAt = this.now();
      S.save();
      return json(200, { user: this.publicUser(user) }, this.sessionCookie(user, req.secure));
    });

    r('POST', '/api/auth/logout', 'none', ({ req }) => json(200, { ok: true }, this.clearCookie(req.secure)));

    r('GET', '/api/auth/me', 'none', ({ id }) => {
      return json(200, {
        user: id.user ? this.publicUser(id.user) : null,
        plan: id.plan,
        source: id.source,
      });
    });

    r('POST', '/api/auth/change-password', 'user', ({ req, id }) => {
      const user = id.user as User;
      const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      this.limit(req, 'chpw', 10, 15 * 60_000, `:${user.id}`);
      if (!verifyPassword(current, user.passwordHash)) throw new HttpError(400, 'বর্তমান পাসওয়ার্ড ভুল। (Current password is wrong.)', 'BAD_CREDENTIALS');
      if (next.length < 8 || next.length > 200) throw new HttpError(400, 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর। (New password must be at least 8 characters.)', 'WEAK_PASSWORD');
      user.passwordHash = hashPassword(next);
      user.tokenVersion += 1; // signs out every other device
      S.save();
      return json(200, { ok: true }, this.sessionCookie(user, req.secure));
    });

    // ── licence ──
    r('POST', '/api/license/redeem', 'user', ({ req, id }) => {
      const user = id.user as User;
      this.limit(req, 'redeem', 10, 15 * 60_000, `:${user.id}`);
      const lic = this.findLicenseByKey(req.body?.key);
      if (lic.redeemedBy && lic.redeemedBy !== user.id) throw new HttpError(400, 'এই কী অন্য অ্যাকাউন্টে ব্যবহৃত হয়েছে। (This key is already used by another account.)', 'KEY_USED');
      if (this.planOfUser(user) === 'pro' && user.licenseId !== lic.id && user.role !== 'admin') {
        throw new HttpError(400, 'আপনার Pro এখনো সক্রিয় আছে। মেয়াদ শেষ হলে নতুন কী দিন। (You already have an active Pro licence.)', 'ALREADY_PRO');
      }
      this.startLicenseClock(lic);
      lic.redeemedBy = user.id;
      user.licenseId = lic.id;
      S.save();
      return json(200, { user: this.publicUser(user) });
    });

    r('POST', '/api/license/activate-device', 'none', ({ req }) => {
      this.limit(req, 'activate', 15, 15 * 60_000);
      const lic = this.findLicenseByKey(req.body?.key);
      const deviceId = str(req.body?.deviceId, 100);
      const deviceName = str(req.body?.deviceName, 80) || 'Windows PC';
      if (deviceId.length < 8) throw new HttpError(400, 'Invalid device id.', 'BAD_DEVICE');
      let dev = lic.devices.find((d) => d.deviceId === deviceId);
      if (!dev) {
        if (lic.devices.length >= lic.maxDevices) {
          throw new HttpError(409, `এই কী সর্বোচ্চ ${lic.maxDevices}টি পিসিতে ব্যবহার করা যায়। (Device limit reached.)`, 'DEVICE_LIMIT');
        }
        dev = { deviceId, name: deviceName, activatedAt: this.now(), lastSeenAt: this.now() };
        lic.devices.push(dev);
      }
      dev.lastSeenAt = this.now();
      this.startLicenseClock(lic);
      S.save();
      const t = this.issueDeviceToken(lic, deviceId);
      return json(200, { valid: true, plan: 'pro', token: t.token, tokenExpiresAt: t.expiresAt, licenseExpiresAt: lic.expiresAt });
    });

    r('POST', '/api/license/validate', 'none', ({ req }) => {
      this.limit(req, 'validate', 60, 15 * 60_000);
      const p = verifyToken<{ lid: string; did: string; exp: number }>(String(req.body?.token || ''), this.secret);
      const lic = p ? S.data.licenses.find((l) => l.id === p.lid) : undefined;
      // An expired token may still be refreshed while the licence itself is valid.
      if (!p || !lic || !this.licenseValid(lic) || !lic.devices.some((d) => d.deviceId === p.did)) {
        return json(200, { valid: false, plan: 'free' });
      }
      const dev = lic.devices.find((d) => d.deviceId === p.did)!;
      dev.lastSeenAt = this.now();
      S.save();
      const t = this.issueDeviceToken(lic, p.did);
      return json(200, { valid: true, plan: 'pro', token: t.token, tokenExpiresAt: t.expiresAt, licenseExpiresAt: lic.expiresAt });
    });

    r('POST', '/api/license/deactivate-device', 'none', ({ req }) => {
      this.limit(req, 'deactivate', 15, 15 * 60_000);
      const p = verifyToken<{ lid: string; did: string }>(String(req.body?.token || ''), this.secret);
      const lic = p ? S.data.licenses.find((l) => l.id === p.lid) : undefined;
      if (p && lic) {
        lic.devices = lic.devices.filter((d) => d.deviceId !== p.did);
        S.save();
      }
      return json(200, { ok: true });
    });

    r('GET', '/api/usage', 'none', ({ id }) => {
      const out: Record<string, { used: number; daily: number; maxChars: number }> = {};
      for (const f of Object.keys(AI_FEATURES) as AiFeatureId[]) {
        const lim = limitFor(f, id.plan);
        out[f] = { used: id.subject ? this.usageToday(id.subject, f) : 0, daily: lim.daily, maxChars: lim.maxChars };
      }
      return json(200, { plan: id.plan, signedIn: !!id.subject, features: out });
    });

    // ── contact ──
    r('POST', '/api/contact', 'none', ({ req }) => {
      const b = req.body || {};
      if (str(b.website, 200)) return json(200, { ok: true }); // honeypot: bots fill hidden fields
      this.limit(req, 'contact', 5, 3_600_000);
      const name = str(b.name, 100);
      const email = normalizeEmail(b.email).slice(0, 200);
      const subject = str(b.subject, 150) || 'General enquiry';
      const message = str(b.message, 5000);
      if (!name) throw new HttpError(400, 'আপনার নাম দিন। (Name is required.)', 'BAD_NAME');
      if (!EMAIL_RE.test(email)) throw new HttpError(400, 'সঠিক ইমেইল দিন। (Enter a valid email.)', 'BAD_EMAIL');
      if (message.length < 10) throw new HttpError(400, 'মেসেজ কমপক্ষে ১০ অক্ষর লিখুন। (Message is too short.)', 'BAD_MESSAGE');
      if (S.data.contacts.length >= 5000) throw new HttpError(503, 'Inbox is full. Please email us directly.');
      S.data.contacts.push({ id: randomId(8), name, email, subject, message, createdAt: this.now(), read: false, ip: req.ip });
      S.save();
      return json(201, { ok: true });
    });

    // ── admin ──
    r('GET', '/api/admin/stats', 'admin', () => {
      const d = S.data;
      const day = this.dayKey();
      let aiToday = 0;
      const aiByFeature: Record<string, number> = {};
      for (const [k, v] of Object.entries(d.usage)) {
        if (!k.endsWith(`|${day}`)) continue;
        for (const [feature, n] of Object.entries(v)) {
          aiToday += n;
          aiByFeature[feature] = (aiByFeature[feature] || 0) + n;
        }
      }
      return json(200, {
        users: d.users.length,
        proUsers: d.users.filter((u) => this.planOfUser(u) === 'pro' && u.role !== 'admin').length,
        licensesTotal: d.licenses.length,
        licensesUnused: d.licenses.filter((l) => l.status === 'active' && !l.activatedAt).length,
        licensesInUse: d.licenses.filter((l) => this.licenseValid(l) && l.activatedAt).length,
        unreadMessages: d.contacts.filter((c) => !c.read).length,
        aiRequestsToday: aiToday,
        aiByFeature,
      });
    });

    r('GET', '/api/admin/users', 'admin', () => {
      const list = S.data.users
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((u) => ({ ...this.publicUser(u), disabled: u.disabled, lastLoginAt: u.lastLoginAt }));
      return json(200, { users: list });
    });

    const findUser = (idParam: string): User => {
      const u = S.data.users.find((x) => x.id === idParam);
      if (!u) throw new HttpError(404, 'User not found.');
      return u;
    };

    r('POST', '/api/admin/users/:id/disable', 'admin', ({ id, params, req }) => {
      const u = findUser(params.id);
      if (u.id === id.user!.id || u.role === 'admin') throw new HttpError(400, 'Cannot disable an admin account.');
      u.disabled = req.body?.disabled !== false;
      u.tokenVersion += 1;
      S.save();
      return json(200, { ok: true, disabled: u.disabled });
    });

    r('POST', '/api/admin/users/:id/reset-password', 'admin', ({ params, req }) => {
      const u = findUser(params.id);
      const pw = typeof req.body?.password === 'string' ? req.body.password : '';
      if (pw.length < 8 || pw.length > 200) throw new HttpError(400, 'Password must be at least 8 characters.');
      u.passwordHash = hashPassword(pw);
      u.tokenVersion += 1;
      S.save();
      return json(200, { ok: true });
    });

    r('POST', '/api/admin/users/:id/grant-pro', 'admin', ({ params, req, id }) => {
      const u = findUser(params.id);
      const { license } = this.createLicense({
        durationDays: this.parseDuration(req.body?.durationDays),
        maxDevices: Math.min(10, Math.max(1, Number(req.body?.maxDevices) || 2)),
        note: str(req.body?.note, 200) || 'Granted by admin',
        by: id.user!.email,
      });
      this.startLicenseClock(license);
      license.redeemedBy = u.id;
      u.licenseId = license.id;
      S.save();
      return json(200, { user: this.publicUser(u) });
    });

    r('POST', '/api/admin/users/:id/revoke-pro', 'admin', ({ params }) => {
      const u = findUser(params.id);
      const lic = this.licenseOfUser(u);
      if (lic) lic.status = 'revoked';
      S.save();
      return json(200, { user: this.publicUser(u) });
    });

    r('DELETE', '/api/admin/users/:id', 'admin', ({ params, id }) => {
      const u = findUser(params.id);
      if (u.id === id.user!.id || u.role === 'admin') throw new HttpError(400, 'Cannot delete an admin account.');
      S.data.users = S.data.users.filter((x) => x.id !== u.id);
      for (const l of S.data.licenses) if (l.redeemedBy === u.id) l.redeemedBy = null;
      S.save();
      return json(200, { ok: true });
    });

    r('GET', '/api/admin/licenses', 'admin', () => {
      return json(200, { licenses: S.data.licenses.slice().sort((a, b) => b.createdAt - a.createdAt).map((l) => this.adminLicense(l)) });
    });

    r('POST', '/api/admin/licenses', 'admin', ({ req, id }) => {
      const count = Number(req.body?.count ?? 1);
      if (!Number.isInteger(count) || count < 1 || count > 100) throw new HttpError(400, 'count must be 1–100.');
      const maxDevices = Number(req.body?.maxDevices ?? 2);
      if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 10) throw new HttpError(400, 'maxDevices must be 1–10.');
      const durationDays = this.parseDuration(req.body?.durationDays);
      const note = str(req.body?.note, 200);
      const keys: string[] = [];
      for (let i = 0; i < count; i++) keys.push(this.createLicense({ durationDays, maxDevices, note, by: id.user!.email }).key);
      S.save();
      return json(201, { keys }); // the only time the plain keys are ever returned
    });

    const findLicense = (idParam: string): License => {
      const l = S.data.licenses.find((x) => x.id === idParam);
      if (!l) throw new HttpError(404, 'Licence not found.');
      return l;
    };

    r('POST', '/api/admin/licenses/:id/revoke', 'admin', ({ params }) => {
      findLicense(params.id).status = 'revoked';
      S.save();
      return json(200, { ok: true });
    });
    r('POST', '/api/admin/licenses/:id/restore', 'admin', ({ params }) => {
      findLicense(params.id).status = 'active';
      S.save();
      return json(200, { ok: true });
    });
    r('POST', '/api/admin/licenses/:id/reset-devices', 'admin', ({ params }) => {
      findLicense(params.id).devices = [];
      S.save();
      return json(200, { ok: true });
    });

    r('GET', '/api/admin/contacts', 'admin', () => {
      return json(200, { messages: S.data.contacts.slice().sort((a, b) => b.createdAt - a.createdAt).map(({ ip: _ip, ...m }) => m) });
    });
    r('POST', '/api/admin/contacts/:id/read', 'admin', ({ params, req }) => {
      const m = S.data.contacts.find((x) => x.id === params.id);
      if (!m) throw new HttpError(404, 'Message not found.');
      m.read = req.body?.read !== false;
      S.save();
      return json(200, { ok: true });
    });
    r('DELETE', '/api/admin/contacts/:id', 'admin', ({ params }) => {
      S.data.contacts = S.data.contacts.filter((x) => x.id !== params.id);
      S.save();
      return json(200, { ok: true });
    });

    r('GET', '/api/admin/settings', 'admin', () => json(200, { settings: S.data.settings }));
    r('PUT', '/api/admin/settings', 'admin', ({ req }) => {
      const b = req.body || {};
      const d = b.desktop || {};
      const url = (v: unknown): string => {
        const s = str(v, 500);
        if (s && !/^https:\/\/[^\s]+$/i.test(s)) throw new HttpError(400, 'Download links must start with https://');
        return s;
      };
      const next: Settings = {
        ...defaultSettings(),
        siteName: str(b.siteName, 80) || 'MAISHAA WORKSPACE',
        contactEmail: str(b.contactEmail, 200),
        howToBuy: str(b.howToBuy, 2000),
        desktop: {
          version: str(d.version, 40),
          releaseNotes: str(d.releaseNotes, 2000),
          windowsUrl: url(d.windowsUrl),
          macUrl: url(d.macUrl),
          linuxUrl: url(d.linuxUrl),
          updatedAt: this.now(),
        },
      };
      S.data.settings = next;
      S.save();
      return json(200, { settings: next });
    });
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k && !(k in out)) out[k] = part.slice(i + 1).trim();
  }
  return out;
}
