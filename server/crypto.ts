import crypto from 'node:crypto';

/** scrypt password hashing: "scrypt$N$saltB64$hashB64" */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const N = 16384;
  const hash = crypto.scryptSync(password, salt, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(nStr),
      r: 8,
      p: 1,
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const b64u = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

/** Compact signed token: base64url(JSON payload) + "." + HMAC-SHA256 signature. */
export function signToken(payload: Record<string, unknown>, secret: string): string {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string, secret: string): T | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function randomId(bytes = 12): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// No 0/O/1/I to avoid typos when a key is read over the phone or chat.
const KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** MSHA-XXXXX-XXXXX-XXXXX-XXXXX  (20 chars of ~5 bits = ~100 bits of entropy) */
export function generateLicenseKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let part = '';
    for (let i = 0; i < 5; i++) part += KEY_ALPHABET[crypto.randomInt(KEY_ALPHABET.length)];
    groups.push(part);
  }
  return `MSHA-${groups.join('-')}`;
}

export function normalizeLicenseKey(input: string): string {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Hash of the normalised key (so spaces / dashes / case do not matter). */
export function hashLicenseKey(input: string): string {
  return sha256('license:' + normalizeLicenseKey(input));
}
