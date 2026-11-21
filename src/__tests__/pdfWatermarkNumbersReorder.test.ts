import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  addWatermark,
  addPageNumbers,
  reorderPages,
  parsePageOrder,
} from '../services/pdfService';

/** Build a PDF whose pages have different widths so page order can be verified. */
async function makePdf(widths: number[]): Promise<File> {
  const doc = await PDFDocument.create();
  widths.forEach((w) => doc.addPage([w, 400]));
  const bytes = await doc.save();
  return new File([bytes as Uint8Array<ArrayBuffer>], 'test.pdf', { type: 'application/pdf' });
}

async function pageWidths(blob: Blob): Promise<number[]> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}

describe('PDF watermark / page numbers / reorder', () => {
  it('reorders pages into the typed order', async () => {
    const file = await makePdf([300, 400, 500]);
    const res = await reorderPages(file, '3,1,2');
    expect(await pageWidths(res.blob)).toEqual([500, 300, 400]);
  });

  it('supports descending ranges and rejects incomplete orders', async () => {
    const file = await makePdf([300, 400, 500]);
    expect(await pageWidths((await reorderPages(file, '3-1')).blob)).toEqual([500, 400, 300]);
    await expect(reorderPages(file, '1,2')).rejects.toThrow(/every page exactly once/);
    await expect(reorderPages(file, '1,1,2')).rejects.toThrow(/every page exactly once/);
    await expect(reorderPages(file, '1,2,9')).rejects.toThrow(/between 1 and 3/);
    expect(() => parsePageOrder('a,b', 3)).toThrow(/not a valid/);
  });

  it('adds a watermark and keeps page count', async () => {
    const file = await makePdf([300, 300]);
    const res = await addWatermark(file, { text: 'CONFIDENTIAL' });
    expect(res.pageCount).toBe(2);
    expect(res.newSize).toBeGreaterThan(file.size);
    const doc = await PDFDocument.load(await res.blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(2);
  });

  it('rejects empty and Bengali watermark text with a clear message', async () => {
    const file = await makePdf([300]);
    await expect(addWatermark(file, { text: '  ' })).rejects.toThrow(/empty/);
    await expect(addWatermark(file, { text: 'গোপনীয়' })).rejects.toThrow(/English letters/);
  });

  it('adds page numbers to every page', async () => {
    const file = await makePdf([300, 300, 300]);
    const res = await addPageNumbers(file, { showTotal: true, position: 'top-right', startAt: 1 });
    expect(res.pageCount).toBe(3);
    expect(res.newSize).toBeGreaterThan(file.size);
  });
});

import { addSignature } from '../services/pdfService';

// 1x1 transparent PNG
const PNG_1PX = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
);

describe('Sign PDF (visual signature)', () => {
  it('stamps a typed signature and keeps page count', async () => {
    const file = await makePdf([300, 300]);
    const res = await addSignature(file, { signature: { kind: 'text', text: 'Monir Hossain' }, pages: 'all' });
    expect(res.pageCount).toBe(2);
    expect(res.newSize).toBeGreaterThan(file.size);
  });

  it('stamps an image signature on a chosen page', async () => {
    const file = await makePdf([300, 300, 300]);
    const res = await addSignature(file, {
      signature: { kind: 'image', bytes: PNG_1PX, mime: 'image/png' },
      pages: 2,
      position: 'center',
    });
    expect(res.pageCount).toBe(3);
    expect(res.newSize).toBeGreaterThan(file.size);
  });

  it('rejects empty signature, bad page and Bengali typed text', async () => {
    const file = await makePdf([300]);
    await expect(addSignature(file, { signature: { kind: 'text', text: ' ' } })).rejects.toThrow(/empty/);
    await expect(addSignature(file, { signature: { kind: 'text', text: 'মনির' } })).rejects.toThrow(/English letters/);
    await expect(
      addSignature(file, { signature: { kind: 'text', text: 'A' }, pages: 5 })
    ).rejects.toThrow(/between 1 and 1/);
  });
});
