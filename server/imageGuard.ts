/**
 * Image payload validation for the expensive vision / image endpoints.
 * Pure functions (no express) so they can be unit-tested directly.
 *
 * We never trust the client's `mimeType`: the type is derived from the file's magic bytes and
 * must be on the allowlist. Size is computed from the base64 length BEFORE decoding, so an
 * oversized payload is rejected without allocating a buffer.
 */
import { limitFor, type AiFeatureId } from '../src/config/plans';
import type { FeatureGuardOptions } from './express';

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export type ImageCheck =
  | { ok: true; mime: AllowedImageMime; base64: string; bytes: number }
  | { ok: false; status: 400 | 413 | 415; code: 'BAD_IMAGE' | 'IMAGE_TOO_LARGE' | 'UNSUPPORTED_IMAGE_TYPE'; message: string };

const fail = (status: 400 | 413 | 415, code: 'BAD_IMAGE' | 'IMAGE_TOO_LARGE' | 'UNSUPPORTED_IMAGE_TYPE', message: string): ImageCheck => ({
  ok: false,
  status,
  code,
  message,
});

/** Detect the real image type from the first bytes. Returns null when it is not an allowed type. */
export function sniffImageMime(head: Uint8Array): AllowedImageMime | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (
    head.length >= 8 &&
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
    head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    head.length >= 12 &&
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && // RIFF
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // WEBP
  ) {
    return 'image/webp';
  }
  return null;
}

const DATA_URL_RE = /^data:([a-zA-Z0-9.+/-]{1,80});base64,/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1);
}

/**
 * Validate a base64 (or data-URL) image string.
 * 400 malformed, 413 too large, 415 not a JPEG/PNG/WebP.
 */
export function validateImageBase64(input: unknown, maxBytes: number): ImageCheck {
  if (typeof input !== 'string' || input.length === 0) {
    return fail(400, 'BAD_IMAGE', 'ছবি পাওয়া যায়নি। (An image is required.)');
  }
  // Cheap upper bound first: even the raw string must not be absurdly long.
  if (input.length > Math.ceil((maxBytes * 4) / 3) + 128) {
    return fail(413, 'IMAGE_TOO_LARGE', `ছবি অনেক বড়; সর্বোচ্চ ${mb(maxBytes)} MB। (Image too large; max ${mb(maxBytes)} MB.)`);
  }
  let b64 = input;
  if (b64.startsWith('data:')) {
    const m = DATA_URL_RE.exec(b64);
    if (!m) return fail(400, 'BAD_IMAGE', 'ছবির ডেটা সঠিক নয়। (Malformed data URL.)');
    b64 = b64.slice(m[0].length);
  }
  if (b64.length === 0 || b64.length % 4 !== 0 || !BASE64_RE.test(b64)) {
    return fail(400, 'BAD_IMAGE', 'ছবির ডেটা সঠিক নয়। (Image is not valid base64.)');
  }
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const bytes = (b64.length / 4) * 3 - padding;
  if (bytes > maxBytes) {
    return fail(413, 'IMAGE_TOO_LARGE', `ছবি অনেক বড়; সর্বোচ্চ ${mb(maxBytes)} MB। (Image too large; max ${mb(maxBytes)} MB.)`);
  }
  const mime = sniffImageMime(Buffer.from(b64.slice(0, 32), 'base64'));
  if (!mime) {
    return fail(415, 'UNSUPPORTED_IMAGE_TYPE', 'শুধু JPG, PNG বা WebP ছবি দিন। (Only JPEG, PNG or WebP images are accepted.)');
  }
  return { ok: true, mime, base64: b64, bytes };
}

/** Optional free-text field (custom instruction, prompt): must be a string, no control chars, length-capped. */
export function cleanShortText(input: unknown, maxChars: number): { ok: true; text: string } | { ok: false; message: string } {
  if (input === undefined || input === null || input === '') return { ok: true, text: '' };
  if (typeof input !== 'string') return { ok: false, message: 'টেক্সট ফিল্ড সঠিক নয়। (Text field must be a string.)' };
  // eslint-disable-next-line no-control-regex
  const text = input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (text.length > maxChars) {
    return { ok: false, message: `সর্বোচ্চ ${maxChars} অক্ষর। (Max ${maxChars} characters.)` };
  }
  return { ok: true, text };
}

/**
 * Builds the `validate` hook for requireFeature() on image endpoints.
 * - reads the image from the first present body field (default imageBase64, then image)
 * - enforces the plan's maxBytes, real type via magic bytes
 * - rewrites req.body.imageBase64 (clean base64, no data-URL prefix) and req.body.mimeType (detected)
 * - optionally validates a short text field against the plan's maxChars
 */
export function imageBodyValidator(
  feature: AiFeatureId,
  opts: { fields?: string[]; textField?: string } = {}
): NonNullable<FeatureGuardOptions['validate']> {
  const fields = opts.fields ?? ['imageBase64', 'image'];
  return (req, { plan }) => {
    const limit = limitFor(feature, plan);
    const body = req.body && typeof req.body === 'object' ? req.body : null;
    if (!body) return { ok: false, status: 400, code: 'BAD_IMAGE', message: 'ছবি পাওয়া যায়নি। (An image is required.)' };
    const field = fields.find((f) => body[f] !== undefined && body[f] !== null && body[f] !== '');
    const img = validateImageBase64(field ? body[field] : undefined, limit.maxBytes ?? 4 * 1024 * 1024);
    if (!img.ok) return { ok: false, status: img.status, code: img.code, message: img.message };
    body.imageBase64 = img.base64;
    body.mimeType = img.mime;
    if (opts.textField) {
      const t = cleanShortText(body[opts.textField], limit.maxChars);
      if (!t.ok) return { ok: false, status: 400, code: 'BAD_TEXT', message: t.message };
      body[opts.textField] = t.text;
    }
    return { ok: true };
  };
}
