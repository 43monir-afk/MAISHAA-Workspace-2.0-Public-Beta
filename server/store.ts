import fs from 'node:fs';
import path from 'node:path';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin';
  disabled: boolean;
  /** Bumped on password change / reset to invalidate old sessions. */
  tokenVersion: number;
  licenseId: string | null;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface Device {
  deviceId: string;
  name: string;
  activatedAt: number;
  lastSeenAt: number;
}

export interface License {
  id: string;
  keyHash: string;
  /** Last 4 chars of the key, for admin lists (the full key is shown only once). */
  hint: string;
  plan: 'pro';
  /** null = lifetime */
  durationDays: number | null;
  maxDevices: number;
  note: string;
  status: 'active' | 'revoked';
  createdAt: number;
  createdBy: string;
  /** Set on first activation (account or device). */
  activatedAt: number | null;
  expiresAt: number | null;
  redeemedBy: string | null;
  devices: Device[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: number;
  read: boolean;
  ip: string;
}

export interface Settings {
  siteName: string;
  contactEmail: string;
  /** Free text on how to buy a key (bKash / Nagad / bank ...). */
  howToBuy: string;
  desktop: {
    version: string;
    releaseNotes: string;
    windowsUrl: string;
    macUrl: string;
    linuxUrl: string;
    updatedAt: number | null;
  };
}

export interface DbShape {
  users: User[];
  licenses: License[];
  contacts: ContactMessage[];
  /** key: `${subject}|${yyyy-mm-dd}` -> { feature: count } */
  usage: Record<string, Record<string, number>>;
  settings: Settings;
}

export function defaultSettings(): Settings {
  return {
    siteName: 'MAISHAA WORKSPACE',
    contactEmail: '',
    howToBuy:
      'Pro key কিনতে Contact পেজে মেসেজ দিন। পেমেন্ট নিশ্চিত হলে আমরা ইমেইলে আপনার Pro key পাঠিয়ে দেব। (Send us a message from the Contact page; we email your Pro key after payment is confirmed.)',
    desktop: { version: '', releaseNotes: '', windowsUrl: '', macUrl: '', linuxUrl: '', updatedAt: null },
  };
}

function emptyDb(): DbShape {
  return { users: [], licenses: [], contacts: [], usage: {}, settings: defaultSettings() };
}

/**
 * Tiny JSON-file database. Single process only (Render: one instance + a
 * persistent disk mounted at DATA_DIR). Writes are atomic (tmp file + rename)
 * and debounced. Pass dir=null for a purely in-memory database (tests).
 */
export class Store {
  data: DbShape;
  private file: string | null;
  private timer: NodeJS.Timeout | null = null;

  constructor(dir: string | null) {
    this.file = dir ? path.join(dir, 'maishaa-db.json') : null;
    this.data = emptyDb();
    if (this.file) {
      fs.mkdirSync(dir as string, { recursive: true });
      if (fs.existsSync(this.file)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<DbShape>;
          this.data = {
            ...emptyDb(),
            ...parsed,
            settings: {
              ...defaultSettings(),
              ...(parsed.settings || {}),
              desktop: { ...defaultSettings().desktop, ...(parsed.settings?.desktop || {}) },
            },
          };
        } catch (err) {
          // Never silently overwrite a database we could not read.
          const backup = `${this.file}.corrupt-${Date.now()}`;
          fs.copyFileSync(this.file, backup);
          console.error(`[store] Could not parse ${this.file}; copied to ${backup} and starting empty.`, err);
        }
      }
    }
  }

  save(): void {
    if (!this.file) return;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 150);
    this.timer.unref?.();
  }

  flush(): void {
    if (!this.file) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}
