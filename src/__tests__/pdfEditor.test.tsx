import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import {
  applyEdits,
  buildReplaceOps,
  countMatches,
  createBlankPdf,
  deletePageBytes,
  extractPageTextItems,
  isLatinText,
  loadPdfJsDocument,
  movePageBytes,
  newOpId,
  replaceInText,
  rotatePageBytes,
  type EditOp,
  type PageTextItem,
} from '../services/pdfEditorService';
import PdfEditor from '../components/pdf/PdfEditor';

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

async function textPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([300, 300]).drawText('Hello World', { x: 50, y: 200, size: 20, font });
  return doc.save();
}

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdf = await loadPdfJsDocument(bytes);
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent();
    out.push(c.items.map((it: any) => ('str' in it ? it.str : '')).join(' '));
  }
  return out;
}

describe('text helpers', () => {
  it('replaces and counts matches (case rules, special characters)', () => {
    expect(replaceInText('Total: $10 and $10', '$10', '$20', true)).toBe('Total: $20 and $20');
    expect(replaceInText('Hello hello', 'hello', 'X', false)).toBe('X X');
    expect(replaceInText('Hello hello', 'hello', 'X', true)).toBe('Hello X');
    expect(replaceInText('abc', 'zzz', 'X', false)).toBeNull();
    expect(replaceInText('abc', '', 'X', false)).toBeNull();
    expect(countMatches('a.b.c', '.', true)).toBe(2);
    expect(countMatches('abc', '', true)).toBe(0);
  });

  it('knows which text the built-in fonts can draw', () => {
    expect(isLatinText('Hello, World 123 £')).toBe(true);
    expect(isLatinText('আমার নাম')).toBe(false);
  });

  it('builds one textEdit per matching item and keeps its position', () => {
    const item: PageTextItem = { id: 'p1i0', page: 1, str: 'Name: Rahim', x: 0.1, y: 0.2, w: 0.3, h: 0.04, baseline: 0.23, size: 12, family: 'sans' };
    const other: PageTextItem = { ...item, id: 'p1i1', str: 'Address' };
    const ops = buildReplaceOps([item, other], 'Rahim', 'Karim', false);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'textEdit', srcId: 'p1i0', text: 'Name: Karim', x: 0.1, baseline: 0.23, size: 12 });
  });
});

describe('applyEdits', () => {
  it('adds new text that PDF.js can read back', async () => {
    const out = await applyEdits(await textPdf(), [
      { id: newOpId(), kind: 'text', page: 1, x: 0.1, y: 0.1, text: 'Added-text', size: 14, color: '#112233' },
    ]);
    const [text] = await pageTexts(out);
    expect(text).toContain('Hello World');
    expect(text).toContain('Added-text');
  });

  it('draws every kind of mark without errors and keeps the page count', async () => {
    const png = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
      (c) => c.charCodeAt(0)
    );
    const ops: EditOp[] = [
      { id: 'a', kind: 'whiteout', page: 1, x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
      { id: 'b', kind: 'markup', style: 'highlight', page: 1, x: 0.1, y: 0.3, w: 0.3, h: 0.05, color: '#ffe600' },
      { id: 'c', kind: 'markup', style: 'underline', page: 1, x: 0.1, y: 0.4, w: 0.3, h: 0.05, color: '#e11d48' },
      { id: 'd', kind: 'markup', style: 'strike', page: 1, x: 0.1, y: 0.5, w: 0.3, h: 0.05, color: '#e11d48' },
      { id: 'e', kind: 'draw', page: 1, points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.3, y: 0.15 }], color: '#000000', width: 2 },
      { id: 'f', kind: 'shape', shape: 'rect', page: 1, x: 0.5, y: 0.5, w: 0.2, h: 0.1, color: '#000000', width: 1 },
      { id: 'g', kind: 'shape', shape: 'ellipse', page: 1, x: 0.5, y: 0.6, w: 0.2, h: 0.1, color: '#000000', width: 1 },
      { id: 'h', kind: 'shape', shape: 'line', page: 1, x: 0.5, y: 0.7, w: 0.2, h: -0.1, color: '#000000', width: 1 },
      { id: 'i', kind: 'shape', shape: 'arrow', page: 1, x: 0.5, y: 0.8, w: 0.2, h: -0.1, color: '#000000', width: 1 },
      { id: 'j', kind: 'image', page: 1, x: 0.7, y: 0.7, w: 0.1, h: 0.1, bytes: png, mime: 'image/png' },
    ];
    const out = await applyEdits(await textPdf(), ops);
    const re = await PDFDocument.load(out);
    expect(re.getPageCount()).toBe(1);
  });

  it('replaces existing text: new text is drawn, nothing throws', async () => {
    const doc = await pdfJsDoc();
    const items = await extractPageTextItems(doc, 1);
    const hello = items.find((i) => i.str.includes('Hello'))!;
    expect(hello).toBeTruthy();
    // position comes from the real PDF: x = 50pt of 300pt, baseline = 100pt from the top of 300pt
    expect(hello.x).toBeCloseTo(50 / 300, 1);
    expect(hello.baseline).toBeCloseTo(100 / 300, 1);
    expect(hello.size).toBeCloseTo(20, 0);
    const ops = buildReplaceOps(items, 'World', 'Bangladesh', true);
    expect(ops).toHaveLength(1);
    const out = await applyEdits(await textPdf(), ops);
    const [text] = await pageTexts(out);
    expect(text).toContain('Hello Bangladesh');
  });

  it('refuses to edit a page that is rotated and a page that does not exist', async () => {
    const doc = await PDFDocument.load(await textPdf());
    doc.getPage(0).setRotation(degrees(90));
    const rotated = await doc.save();
    const op: EditOp = { id: 'x', kind: 'whiteout', page: 1, x: 0, y: 0, w: 0.1, h: 0.1 };
    await expect(applyEdits(rotated, [op])).rejects.toThrow(/rotated/);
    await expect(applyEdits(await textPdf(), [{ ...op, page: 2 }])).rejects.toThrow(/does not exist/);
  });

  it('returns the same bytes when there is nothing to apply', async () => {
    const b = await textPdf();
    expect(await applyEdits(b, [])).toBe(b);
  });
});

async function pdfJsDoc() {
  return loadPdfJsDocument(await textPdf());
}

describe('page operations', () => {
  async function threePages(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    doc.addPage([200, 200]);
    doc.addPage([300, 300]);
    return doc.save();
  }
  const widths = async (b: Uint8Array) => (await PDFDocument.load(b)).getPages().map((p) => p.getWidth());

  it('rotates one page', async () => {
    const out = await rotatePageBytes(await threePages(), 1, 90);
    const re = await PDFDocument.load(out);
    expect(re.getPage(1).getRotation().angle).toBe(90);
    expect(re.getPage(0).getRotation().angle).toBe(0);
    const back = await rotatePageBytes(out, 1, -90);
    expect((await PDFDocument.load(back)).getPage(1).getRotation().angle).toBe(0);
  });

  it('deletes a page but never the last one', async () => {
    const out = await deletePageBytes(await threePages(), 0);
    expect(await widths(out)).toEqual([200, 300]);
    const one = await createBlankPdf();
    await expect(deletePageBytes(one, 0)).rejects.toThrow(/at least one page/);
    await expect(deletePageBytes(out, 5)).rejects.toThrow(/does not exist/);
  });

  it('moves a page', async () => {
    const out = await movePageBytes(await threePages(), 0, 2);
    expect(await widths(out)).toEqual([200, 300, 100]);
    const back = await movePageBytes(out, 2, 0);
    expect(await widths(back)).toEqual([100, 200, 300]);
  });
});

describe('PdfEditor component', () => {
  it('starts with an upload button and a blank-page option, no fake file', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<PdfEditor language="en" />); });
    const text = container.textContent || '';
    expect(text).toContain('Open a PDF');
    expect(text).toContain('Start with a blank page');
    expect(container.querySelector('input[type="file"]')?.getAttribute('accept')).toContain('pdf');
    await act(async () => { root.unmount(); });
  });
});
