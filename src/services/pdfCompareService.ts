/**
 * Compare two PDF files by their text, page by page, and produce a PDF report of the differences.
 * Works on selectable text only: scanned (image-only) PDFs have no text to compare.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { configurePdfJsWorker } from './pdfToImageService';
import { exportToPdf } from './directExportService';

export type LineOp = { type: 'same' | 'add' | 'del'; text: string };

export interface PageComparison {
  page: number;
  status: 'identical' | 'changed' | 'only-in-first' | 'only-in-second';
  added: number;
  removed: number;
  ops: LineOp[];
}

export interface PdfComparison {
  pages: PageComparison[];
  pagesFirst: number;
  pagesSecond: number;
  identicalPages: number;
  changedPages: number;
  totalAdded: number;
  totalRemoved: number;
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Extract the text of each page as lines (items on the same baseline are joined). */
export async function extractPageLines(data: Uint8Array): Promise<string[][]> {
  configurePdfJsWorker();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    const rows: { y: number; parts: { x: number; str: string }[] }[] = [];
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const x = it.transform[4] as number;
      const y = it.transform[5] as number;
      const row = rows.find((r) => Math.abs(r.y - y) < 2);
      if (row) row.parts.push({ x, str: it.str });
      else rows.push({ y, parts: [{ x, str: it.str }] });
    }
    rows.sort((a, b) => b.y - a.y);
    pages.push(
      rows
        .map((r) => normalize(r.parts.sort((a, b) => a.x - b.x).map((q) => q.str).join(' ')))
        .filter(Boolean)
    );
  }
  return pages;
}

/** Longest-common-subsequence line diff. */
export function diffLines(a: string[], b: string[]): LineOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: LineOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: a[i++] });
    } else {
      ops.push({ type: 'add', text: b[j++] });
    }
  }
  while (i < n) ops.push({ type: 'del', text: a[i++] });
  while (j < m) ops.push({ type: 'add', text: b[j++] });
  return ops;
}

export function comparePageLines(first: string[][], second: string[][]): PdfComparison {
  const total = Math.max(first.length, second.length);
  const pages: PageComparison[] = [];
  for (let i = 0; i < total; i++) {
    const a = first[i];
    const b = second[i];
    if (!a || !b) {
      const lines = (a ?? b) as string[];
      pages.push({
        page: i + 1,
        status: a ? 'only-in-first' : 'only-in-second',
        added: a ? 0 : lines.length,
        removed: a ? lines.length : 0,
        ops: lines.map((text) => ({ type: a ? ('del' as const) : ('add' as const), text })),
      });
      continue;
    }
    const ops = diffLines(a, b);
    const added = ops.filter((o) => o.type === 'add').length;
    const removed = ops.filter((o) => o.type === 'del').length;
    pages.push({ page: i + 1, status: added + removed === 0 ? 'identical' : 'changed', added, removed, ops });
  }
  return {
    pages,
    pagesFirst: first.length,
    pagesSecond: second.length,
    identicalPages: pages.filter((p) => p.status === 'identical').length,
    changedPages: pages.filter((p) => p.status !== 'identical').length,
    totalAdded: pages.reduce((s, p) => s + p.added, 0),
    totalRemoved: pages.reduce((s, p) => s + p.removed, 0),
  };
}

export async function comparePdfs(fileA: File, fileB: File): Promise<PdfComparison> {
  const [a, b] = await Promise.all([
    extractPageLines(new Uint8Array(await fileA.arrayBuffer())),
    extractPageLines(new Uint8Array(await fileB.arrayBuffer())),
  ]);
  const hasText = (pages: string[][]) => pages.some((p) => p.length > 0);
  if (!hasText(a) && !hasText(b)) {
    throw new Error(
      'Neither PDF has selectable text (they look like scanned images), so they cannot be compared by text. Run OCR first.'
    );
  }
  return comparePageLines(a, b);
}

export function buildComparisonReport(cmp: PdfComparison, nameA: string, nameB: string): string {
  const lines: string[] = [];
  lines.push(`PDF Comparison Report`);
  lines.push(`First file (A): ${nameA} - ${cmp.pagesFirst} pages`);
  lines.push(`Second file (B): ${nameB} - ${cmp.pagesSecond} pages`);
  lines.push('');
  lines.push(
    `Summary: ${cmp.identicalPages} identical page(s), ${cmp.changedPages} page(s) with differences, ` +
      `${cmp.totalRemoved} line(s) only in A, ${cmp.totalAdded} line(s) only in B.`
  );
  lines.push('Legend: "-" = only in A (removed), "+" = only in B (added).');
  lines.push('');
  for (const p of cmp.pages) {
    if (p.status === 'identical') {
      lines.push(`Page ${p.page}: identical text`);
      continue;
    }
    const note =
      p.status === 'only-in-first' ? ' (page exists only in A)' : p.status === 'only-in-second' ? ' (page exists only in B)' : '';
    lines.push('');
    lines.push(`Page ${p.page}: ${p.removed} removed, ${p.added} added${note}`);
    for (const op of p.ops) {
      if (op.type === 'del') lines.push(`  - ${op.text}`);
      else if (op.type === 'add') lines.push(`  + ${op.text}`);
    }
  }
  return lines.join('\n');
}

/** Full flow used by the UI: compare and return a PDF report (Bengali-capable export). */
export async function comparePdfsToReport(fileA: File, fileB: File) {
  const cmp = await comparePdfs(fileA, fileB);
  const text = buildComparisonReport(cmp, fileA.name, fileB.name);
  const exported = await exportToPdf(text, { title: 'PDF Comparison Report', sourceFilename: fileA.name });
  return { comparison: cmp, blob: exported.blob, size: exported.size, pageCount: exported.pageCount ?? 1 };
}
