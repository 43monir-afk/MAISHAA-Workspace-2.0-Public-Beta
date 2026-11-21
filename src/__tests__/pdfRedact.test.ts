import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { assembleRedactedPdf, validateRedactRects } from '../services/pdfRedactService';
import { configurePdfJsWorker } from '../services/pdfToImageService';

/** Extract the real text of every page with PDF.js (content streams are compressed, so raw search is not reliable). */
async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  configurePdfJsWorker();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    texts.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  return texts;
}

const PNG_1PX = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
);

async function textPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const t of ['SECRET-ONE', 'PUBLIC-TWO', 'SECRET-THREE']) {
    doc.addPage([300, 300]).drawText(t, { x: 20, y: 150, size: 18, font });
  }
  doc.setTitle('Confidential title');
  return doc.save();
}

describe('PDF redaction', () => {
  it('validates redaction boxes', () => {
    expect(() => validateRedactRects([], 3)).toThrow(/at least one box/);
    expect(() => validateRedactRects([{ page: 4, x: 0, y: 0, w: 0.1, h: 0.1 }], 3)).toThrow(/between 1 and 3/);
    expect(() => validateRedactRects([{ page: 1, x: 0.9, y: 0, w: 0.3, h: 0.1 }], 3)).toThrow(/outside the page/);
    expect(() => validateRedactRects([{ page: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.1 }], 3)).not.toThrow();
  });

  it('replaces redacted pages by images so their text no longer exists, and keeps other pages', async () => {
    const src = await textPdf();
    const out = await assembleRedactedPdf(src, new Map([[1, PNG_1PX], [3, PNG_1PX]]));
    // Sanity check that the extraction method works on the original.
    expect((await pageTexts(src)).join('|')).toContain('SECRET-ONE');
    const texts = await pageTexts(out);
    expect(texts[0]).not.toContain('SECRET');
    expect(texts[2]).not.toContain('SECRET');
    expect(texts[1]).toContain('PUBLIC-TWO');
    const info = await PDFDocument.load(out);
    expect(info.getTitle() ?? '').toBe('');
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
  });
});
