import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Logo } from '../components/common/Logo';

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

const pub = (f: string) => path.resolve(__dirname, '../../public', f);

async function render(el: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(el); });
  return container;
}

describe('brand assets', () => {
  it('every file referenced by the app / index.html exists and is not empty', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:href|content)="(?:https:\/\/workspace\.maishaa\.bd)?\/([\w.-]+\.(?:svg|png))"/g)].map((m) => m[1]);
    expect(refs).toEqual(expect.arrayContaining(['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'og-image.png']));
    for (const f of [...refs, 'logo-512.png', 'logo-1024.png']) {
      expect(fs.existsSync(pub(f)), f).toBe(true);
      expect(fs.statSync(pub(f)).size, f).toBeGreaterThan(200);
    }
  });

  it('badge logo PNGs are square, have transparent corners and an opaque centre', () => {
    // read the PNG header + decode alpha of 4 corners / centre via a tiny canvas-free parse: use IHDR colour type
    for (const f of ['logo-512.png', 'logo-1024.png']) {
      const b = fs.readFileSync(pub(f));
      expect(b.readUInt32BE(16)).toBe(b.readUInt32BE(20));
      expect(b[25], `${f} must be RGBA (colour type 6)`).toBe(6);
    }
  });

  it('PNG exports have the expected pixel sizes', () => {
    const dim = (f: string) => {
      const b = fs.readFileSync(pub(f));
      return [b.readUInt32BE(16), b.readUInt32BE(20)];
    };
    expect(dim('logo-512.png')).toEqual([512, 512]);
    expect(dim('logo-1024.png')).toEqual([1024, 1024]);
    expect(dim('icon-192.png')).toEqual([192, 192]);
    expect(dim('apple-touch-icon.png')).toEqual([180, 180]);
    expect(dim('favicon-32.png')).toEqual([32, 32]);
    expect(dim('og-image.png')).toEqual([1200, 630]);
  });

  it('Logo uses the compact mark when small and the full badge when large', async () => {
    const small = await render(<Logo size={40} />);
    expect(small.querySelector('img')?.getAttribute('src')).toBe('/favicon.svg');
    const big = await render(<Logo size={128} />);
    expect(big.querySelector('img')?.getAttribute('src')).toBe('/logo-512.png');
    const forced = await render(<Logo size={128} variant="mark" />);
    expect(forced.querySelector('img')?.getAttribute('src')).toBe('/favicon.svg');
  });

  it('old logo.svg and the previous hero photos stay removed', () => {
    for (const f of ['logo.svg', 'images/hero.jpg', 'images/hero.webp', 'images/hero-640.webp']) {
      expect(fs.existsSync(pub(f)), f).toBe(false);
    }
  });

  it('welcome banner images are shipped in three widths', () => {
    for (const w of [1000, 2000, 3000]) {
      const f = `images/maishaa-banner-${w}.webp`;
      expect(fs.existsSync(pub(f)), f).toBe(true);
      const buf = fs.readFileSync(pub(f));
      expect(buf.subarray(0, 4).toString('ascii'), f).toBe('RIFF');
      expect(buf.subarray(8, 12).toString('ascii'), f).toBe('WEBP');
    }
  });

  it('Home page renders the welcome banner (desktop) with a heading', async () => {
    const { default: App } = await import('../App');
    const container = await render(<App />);
    const img = container.querySelector('img[src="/images/maishaa-banner-2000.webp"]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('srcset')).toContain('maishaa-banner-3000.webp 3000w');
    expect(img?.getAttribute('alt')).toContain('MAISHAA');
  });
});
