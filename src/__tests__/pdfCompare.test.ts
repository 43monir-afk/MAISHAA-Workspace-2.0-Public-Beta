import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { diffLines, comparePageLines, buildComparisonReport, comparePdfs } from '../services/pdfCompareService';

async function pdfWith(pagesLines: string[][]): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pagesLines) {
    const page = doc.addPage([400, 400]);
    lines.forEach((t, i) => page.drawText(t, { x: 20, y: 350 - i * 24, size: 14, font }));
  }
  return new File([(await doc.save()) as Uint8Array<ArrayBuffer>], 'x.pdf', { type: 'application/pdf' });
}

describe('PDF compare', () => {
  it('diffs lines', () => {
    const ops = diffLines(['a', 'b', 'c'], ['a', 'x', 'c']);
    expect(ops.map((o) => o.type + ':' + o.text)).toEqual(['same:a', 'del:b', 'add:x', 'same:c']);
  });

  it('summarises pages and builds a report', () => {
    const cmp = comparePageLines([['one', 'two'], ['same']], [['one', 'TWO'], ['same'], ['extra']]);
    expect(cmp.identicalPages).toBe(1);
    expect(cmp.changedPages).toBe(2);
    expect(cmp.pages[2].status).toBe('only-in-second');
    const report = buildComparisonReport(cmp, 'a.pdf', 'b.pdf');
    expect(report).toContain('- two');
    expect(report).toContain('+ TWO');
    expect(report).toContain('Page 2: identical text');
  });

  it('compares two real PDFs end to end', async () => {
    const a = await pdfWith([['Invoice 100', 'Total 500'], ['Terms apply']]);
    const b = await pdfWith([['Invoice 100', 'Total 650'], ['Terms apply']]);
    const cmp = await comparePdfs(a, b);
    expect(cmp.identicalPages).toBe(1);
    expect(cmp.pages[0].ops.some((o) => o.type === 'del' && o.text.includes('500'))).toBe(true);
    expect(cmp.pages[0].ops.some((o) => o.type === 'add' && o.text.includes('650'))).toBe(true);
  });

  it('refuses PDFs without selectable text', async () => {
    const blank = await pdfWith([[]]);
    await expect(comparePdfs(blank, blank)).rejects.toThrow(/selectable text/);
  });
});
