/**
 * Client for the account / licence / contact / admin API (server/api.ts).
 * The session lives in an HttpOnly cookie, so no token is ever handled in JS.
 */

export interface LicenseInfo {
  hint: string;
  expiresAt: number | null;
  status: 'active' | 'revoked' | 'expired';
  devices: number;
  maxDevices: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  license: LicenseInfo | null;
  createdAt: number;
}

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
  /** server error code, e.g. LOGIN_REQUIRED, PRO_REQUIRED, LIMIT_REACHED */
  code?: string;
  error?: string;
}

export async function apiFetch<T = any>(path: string, method = 'GET', body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data, code: data?.code, error: data?.error };
  } catch {
    return {
      ok: false,
      status: 0,
      data: {} as T,
      error: 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। (Cannot reach the server.)',
    };
  }
}

export const fetchMe = () => apiFetch<{ user: AuthUser | null; plan: 'free' | 'pro'; source: string }>('/api/auth/me');
export const registerAccount = (email: string, password: string, name: string) =>
  apiFetch<{ user: AuthUser }>('/api/auth/register', 'POST', { email, password, name });
export const loginAccount = (email: string, password: string) =>
  apiFetch<{ user: AuthUser }>('/api/auth/login', 'POST', { email, password });
export const logoutAccount = () => apiFetch('/api/auth/logout', 'POST', {});
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch('/api/auth/change-password', 'POST', { currentPassword, newPassword });
export const redeemLicenseKey = (key: string) => apiFetch<{ user: AuthUser }>('/api/license/redeem', 'POST', { key });
export const sendContact = (payload: { name: string; email: string; subject: string; message: string; website?: string }) =>
  apiFetch('/api/contact', 'POST', payload);

export interface SiteInfo {
  siteName: string;
  contactEmail: string;
  howToBuy: string;
  desktop: { version: string; releaseNotes: string; windowsUrl: string; macUrl: string; linuxUrl: string; updatedAt: number | null };
}
export const fetchSite = () => apiFetch<SiteInfo>('/api/site');

export interface UsageInfo {
  plan: 'free' | 'pro';
  signedIn: boolean;
  features: Record<string, { used: number; daily: number; maxChars: number }>;
}
export const fetchUsage = () => apiFetch<UsageInfo>('/api/usage');

export function formatDate(ms: number | null | undefined, lang: 'bn' | 'en' = 'en'): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}
