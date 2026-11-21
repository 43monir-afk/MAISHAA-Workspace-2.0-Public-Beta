/**
 * Express adapter + AI feature guard. All logic lives in api.ts.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Express, NextFunction, Request, Response } from 'express';
import { limitFor, type AiFeatureId, type PlanId } from '../src/config/plans';
import { Api, type ApiRequest } from './api';
import { Store } from './store';

export function resolveSessionSecret(dataDir: string | null): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 24) return fromEnv;
  if (process.env.NODE_ENV === 'production' && !dataDir) {
    console.warn('[auth] SESSION_SECRET is not set; set it (24+ random chars) in production.');
  }
  // Fall back to a generated secret kept next to the database so sessions survive restarts.
  if (dataDir) {
    const file = path.join(dataDir, '.session-secret');
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
      const secret = crypto.randomBytes(32).toString('hex');
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(file, secret, { mode: 0o600 });
      return secret;
    } catch (err) {
      console.error('[auth] could not persist session secret', err);
    }
  }
  return crypto.randomBytes(32).toString('hex');
}

export function toApiRequest(req: Request): ApiRequest {
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  return {
    method: req.method,
    path: req.path,
    query: Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, String(v)])),
    body: req.body,
    headers,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    secure: req.secure,
  };
}

/** Reject cross-site browser requests that would ride on the session cookie. */
function sameOrigin(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients (desktop app) send no Origin
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function createApi(): { api: Api; store: Store } {
  // Quotas and rate limits live in this process (+ a JSON file). More than one instance would each
  // keep its own counters and overwrite the same file, so say so loudly instead of failing silently.
  const workers = Number(process.env.WEB_CONCURRENCY || 1);
  if (Number.isFinite(workers) && workers > 1) {
    console.warn(`[api] WEB_CONCURRENCY=${workers}: quotas, rate limits and the JSON store only work with ONE instance. Use a shared database before scaling out.`);
  }
  const dataDir = process.env.VITEST || process.env.NODE_ENV === 'test' ? null : path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
  const store = new Store(dataDir);
  const api = new Api({ store, sessionSecret: resolveSessionSecret(dataDir) });
  const email = process.env.ADMIN_EMAIL;
  const pw = process.env.ADMIN_PASSWORD;
  if (email && pw) {
    try {
      api.ensureAdmin(email, pw);
    } catch (err) {
      console.error('[auth]', (err as Error).message);
    }
  } else if (!store.data.users.some((u) => u.role === 'admin') && dataDir) {
    console.warn('[auth] No admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment and restart.');
  }
  if (dataDir) {
    const flush = () => store.flush();
    process.on('SIGTERM', () => { flush(); process.exit(0); });
    process.on('SIGINT', () => { flush(); process.exit(0); });
  }
  return { api, store };
}

export function mountApi(app: Express, api: Api): void {
  app.set('trust proxy', 1);
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!sameOrigin(req)) return res.status(403).json({ error: 'Cross-site request blocked.' });
    next();
  });

  const handle = async (req: Request, res: Response) => {
    const out = await api.handle(toApiRequest(req));
    if (out.setCookie) res.setHeader('Set-Cookie', out.setCookie);
    res.status(out.status).json(out.body);
  };
  // Only the routes owned by Api; /api/ai/* and /api/image/* stay in server.ts
  app.all(['/api/site', '/api/auth/*', '/api/license/*', '/api/usage', '/api/contact', '/api/admin/*'], handle);
}

export type PayloadCheck = { ok: true } | { ok: false; status: number; code: string; message: string };

export interface FeatureGuardOptions {
  checkField?: string;
  clampField?: string;
  /**
   * Payload validation that runs after sign-in/plan/daily-limit checks and BEFORE any quota is
   * reserved. May normalise req.body (e.g. replace a data URL with clean base64).
   */
  validate?: (req: Request, ctx: { plan: PlanId; subject: string }) => PayloadCheck;
}

const deny = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: message, message, code, status: 'DENIED' });

/**
 * Express middleware protecting an AI / expensive route:
 *   1. sign-in, plan and daily-limit checks (api.checkFeature)
 *   2. optional payload validation (opts.validate)
 *   3. per-account burst limit (limit.burstPerMin, if the feature defines one)
 *   4. quota slot is RESERVED immediately and refunded if the handler answers non-2xx.
 *
 * Reserving up front (instead of counting after the response) closes the race where N parallel
 * requests all pass the daily check before any of them is counted. A client that disconnects
 * mid-request keeps its slot, because the upstream call is still paid for.
 *
 * - checkField: reject (403/413) when that body text exceeds the plan's maxChars.
 * - clampField: silently truncate that body text to the plan's maxChars instead.
 */
export function requireFeature(api: Api, feature: AiFeatureId, opts: FeatureGuardOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const text = opts.checkField ? req.body?.[opts.checkField] : undefined;
    const len = typeof text === 'string' ? text.length : 0;
    const check = api.checkFeature(toApiRequest(req), feature, len);
    if (!check.ok) return deny(res, check.status, check.code, check.error);
    const limit = limitFor(feature, check.plan);
    if (opts.clampField && typeof req.body?.[opts.clampField] === 'string') {
      req.body[opts.clampField] = req.body[opts.clampField].slice(0, limit.maxChars);
    }
    if (opts.validate) {
      const v = opts.validate(req, { plan: check.plan, subject: check.subject });
      if (!v.ok) return deny(res, v.status, v.code, v.message);
    }
    if (limit.burstPerMin && !api.allowBurst(`${feature}:${check.subject}`, limit.burstPerMin, 60_000)) {
      return deny(res, 429, 'RATE_LIMITED', 'অনেক দ্রুত অনুরোধ করা হচ্ছে, এক মিনিট পর আবার চেষ্টা করুন। (Too many requests, wait a minute.)');
    }
    api.consume(check.subject, feature);
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) api.refund(check.subject, feature);
    });
    next();
  };
}

/**
 * Pre-body gate: mount BEFORE express.json() so that anonymous, over-quota or oversized requests
 * are rejected without the server first buffering and parsing up to 10 MB of JSON.
 * (Requests sent with chunked encoding have no Content-Length; those are still capped by the
 * body-parser limit and then fully checked by requireFeature.)
 */
export function protectExpensiveRoutes(app: Express, api: Api, routes: { path: string; feature: AiFeatureId }[]): void {
  for (const { path: routePath, feature } of routes) {
    app.post(routePath, (req: Request, res: Response, next: NextFunction) => {
      const apiReq = toApiRequest(req);
      const check = api.checkFeature(apiReq, feature);
      if (!check.ok) return deny(res, check.status, check.code, check.error);
      if (!api.allowBurst(`ip:${apiReq.ip}:${feature}`, 60, 60_000)) {
        return deny(res, 429, 'RATE_LIMITED', 'অনেক দ্রুত অনুরোধ করা হচ্ছে, এক মিনিট পর আবার চেষ্টা করুন। (Too many requests, wait a minute.)');
      }
      const maxBytes = limitFor(feature, check.plan).maxBytes;
      const declared = Number(req.headers['content-length']);
      if (maxBytes && Number.isFinite(declared) && declared > Math.ceil((maxBytes * 4) / 3) + 8192) {
        return deny(res, 413, 'IMAGE_TOO_LARGE', 'অনুরোধ অনেক বড়। (Request body too large.)');
      }
      next();
    });
  }
}
