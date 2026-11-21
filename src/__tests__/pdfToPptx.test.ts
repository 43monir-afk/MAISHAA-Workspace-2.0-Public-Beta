import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildPptxFromPageImages } from '../services/conversionService';

const PNG_1PX = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
);

describe('PDF to PPTX builder', () => {
  it('creates one slide per page image in a valid OOXML package', async () => {
    const imgs = [1, 2, 3].map(() => ({ bytes: PNG_1PX, mime: 'image/png' as const, width: 595, height: 842 }));
    const blob = await buildPptxFromPageImages(imgs, 'Test deck');
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    expect(slides.length).toBe(3);
    const media = Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/'));
    expect(media.length).toBeGreaterThan(0);
    // Portrait page => slide taller than wide
    const pres = await zip.file('ppt/presentation.xml')!.async('string');
    const m = /<p:sldSz cx="(\d+)" cy="(\d+)"/.exec(pres)!;
    expect(Number(m[2])).toBeGreaterThan(Number(m[1]));
  });

  it('rejects an empty page list', async () => {
    await expect(buildPptxFromPageImages([], 'x')).rejects.toThrow(/No pages/);
  });
});
