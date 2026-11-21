/**
 * Visual PDF editor engine (all in the browser, nothing is uploaded).
 *
 * The editor keeps a list of edit operations (EditOp) on top of the current PDF bytes.
 * `applyEdits` bakes them into a new PDF with pdf-lib. Page operations (rotate / delete / move)
 * work on the bytes directly, so the UI first bakes the pending edits and then changes the pages.
 *
 * All coordinates are fractions (0-1) of the page as displayed, measured from the top-left corner.
 * Pages that are rotated (/Rotate != 0) cannot be edited, the same limit other online editors have.
 *
 * Known limits (shown to the user in the UI):
 *  - "Edit text" and "Replace" cover the old text with a white box and draw the new text on top.
 *    The old text is still inside the file (it can be selected / copied). Use Redact PDF to remove it for good.
 *  - New text uses the built-in fonts (Helvetica / Times / Courier). Non-Latin text (for example Bengali)
 *    is drawn by the browser into an image so the letters are shaped correctly; that text is not selectable.
 */
import { PDFDocument, StandardFonts, rgb, degrees, LineCapStyle, type PDFFont } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { configurePdfJsWorker } from './pdfToImageService';
import { hexToRgb } from './pdfService';

// ───────────────────────── Types ─────────────────────────

export type FontFamilyKey = 'sans' | 'serif' | 'mono';

interface OpBase {
  id: string;
  /** 1-based page number */
  page: number;
}

export type EditOp =
  | (OpBase & { kind: 'text'; x: number; y: number; text: string; size: number; color: string; family?: FontFamilyKey; bold?: boolean })
  | (OpBase & { kind: 'textEdit'; srcId: string; x: number; y: number; w: number; h: number; baseline: number; text: string; size: number; color: string; family: FontFamilyKey })
  | (OpBase & { kind: 'whiteout'; x: number; y: number; w: number; h: number })
  | (OpBase & { kind: 'markup'; style: 'highlight' | 'underline' | 'strike'; x: number; y: number; w: number; h: number; color: string })
  | (OpBase & { kind: 'draw'; points: { x: number; y: number }[]; color: string; width: number })
  | (OpBase & { kind: 'shape'; shape: 'rect' | 'ellipse' | 'line' | 'arrow'; x: number; y: number; w: number; h: number; color: string; width: number; fill?: string })
  | (OpBase & { kind: 'image'; x: number; y: number; w: number; h: number; bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' });

export interface PageTextItem {
  id: string;
  page: number;
  str: string;
  /** bounding box, fractions of the page */
  x: number;
  y: number;
  w: number;
  h: number;
  /** y of the text baseline, fraction of the page height */
  baseline: number;
  /** font size in PDF points */
  size: number;
  family: FontFamilyKey;
}

/** CSS line-height used by the on-screen preview and the export, so both agree. */
export const LINE_HEIGHT = 1.2;
/** Distance from the top of a text box to the first baseline, in font sizes (Helvetica / Arial metrics). */
export const FIRST_BASELINE = 0.9465;

// ───────────────────────── Small helpers ─────────────────────────

let idCounter = 0;
export function newOpId(): string {
  idCounter += 1;
  return `op${Date.now().toString(36)}${idCounter}`;
}

export function isLatinText(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /^[\u0009\u000A\u000D -~ -ÿ]*$/.test(text);
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace every occurrence of `query` in `str`. Returns null when there is no match. */
export function replaceInText(str: string, query: string, replacement: string, matchCase: boolean): string | null {
  if (!query) return null;
  const re = new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi');
  if (!re.test(str)) return null;
  re.lastIndex = 0;
  return str.replace(re, () => replacement);
}

export function countMatches(str: string, query: string, matchCase: boolean): number {
  if (!query) return 0;
  const m = str.match(new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi'));
  return m ? m.length : 0;
}

/** Multiply two PDF.js 2D matrices. */
function multiply(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ───────────────────────── PDF.js access ─────────────────────────

export interface PdfPageInfo {
  /** page size in PDF points as displayed (scale 1) */
  width: number;
  height: number;
  /** /Rotate value of the page (0, 90, 180, 270) */
  rotation: number;
}

export async function loadPdfJsDocument(bytes: Uint8Array): Promise<any> {
  configurePdfJsWorker();
  // PDF.js may take ownership of the buffer, so always hand it a copy.
  const task = (pdfjsLib as any).getDocument({
    data: bytes.slice(),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
  });
  return task.promise;
}

export async function readPageInfos(pdfDoc: any): Promise<PdfPageInfo[]> {
  const infos: PdfPageInfo[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    infos.push({ width: vp.width, height: vp.height, rotation: ((page.rotate || 0) % 360 + 360) % 360 });
  }
  return infos;
}

/** Render one page into a canvas. Returns a handle whose cancel() stops the render. */
export function renderPdfPage(
  pdfDoc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
  pixelRatio: number
): { promise: Promise<void>; cancel: () => void } {
  let task: any = null;
  let cancelled = false;
  const promise = (async () => {
    const page = await pdfDoc.getPage(pageNumber);
    if (cancelled) return;
    const vp = page.getViewport({ scale: scale * pixelRatio });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser.');
    task = page.render({ canvasContext: ctx, viewport: vp });
    try {
      await task.promise;
    } catch (e: any) {
      if (e?.name === 'RenderingCancelledException') return;
      throw e;
    }
  })();
  return {
    promise,
    cancel: () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        /* already finished */
      }
    },
  };
}

/** Existing text of a page as clickable boxes. Rotated pages return nothing (they cannot be edited). */
export async function extractPageTextItems(pdfDoc: any, pageNumber: number): Promise<PageTextItem[]> {
  const page = await pdfDoc.getPage(pageNumber);
  if (((page.rotate || 0) % 360) !== 0) return [];
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const styles = content.styles || {};
  const out: PageTextItem[] = [];
  content.items.forEach((it: any, index: number) => {
    if (!it || typeof it.str !== 'string' || !it.str.trim()) return;
    const tr = multiply(vp.transform, it.transform);
    const size = Math.hypot(tr[2], tr[3]);
    if (!Number.isFinite(size) || size < 1) return;
    const left = tr[4];
    const baselineY = tr[5];
    const top = baselineY - size * 0.9;
    const height = size * 1.15;
    const width = Math.max(2, Number(it.width) || it.str.length * size * 0.5);
    const fam = String(styles[it.fontName]?.fontFamily || '').toLowerCase();
    const family: FontFamilyKey = fam.includes('mono') ? 'mono' : fam.includes('serif') && !fam.includes('sans') ? 'serif' : 'sans';
    out.push({
      id: `p${pageNumber}i${index}`,
      page: pageNumber,
      str: it.str,
      x: clamp01(left / vp.width),
      y: clamp01(top / vp.height),
      w: Math.min(1, width / vp.width),
      h: Math.min(1, height / vp.height),
      baseline: clamp01(baselineY / vp.height),
      size,
      family,
    });
  });
  return out;
}

// ───────────────────────── Find & replace ─────────────────────────

export function buildReplaceOps(
  items: PageTextItem[],
  query: string,
  replacement: string,
  matchCase: boolean
): EditOp[] {
  const ops: EditOp[] = [];
  for (const it of items) {
    const next = replaceInText(it.str, query, replacement, matchCase);
    if (next === null) continue;
    ops.push({
      id: newOpId(),
      kind: 'textEdit',
      srcId: it.id,
      page: it.page,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
      baseline: it.baseline,
      text: next,
      size: it.size,
      color: '#000000',
      family: it.family,
    });
  }
  return ops;
}

// ───────────────────────── Export (bake edits into the PDF) ─────────────────────────

/** Draw text with the browser (correct shaping for Bengali etc.) and return it as a PNG. */
function renderTextToPng(text: string, sizePt: number, color: string, family: FontFamilyKey): { bytes: Uint8Array; width: number; height: number } {
  if (typeof document === 'undefined') throw new Error('Non-English text can only be added in the browser.');
  const k = 3; // pixels per point
  const font = `${sizePt * k}px ${family === 'serif' ? 'serif' : family === 'mono' ? 'monospace' : '"Noto Sans Bengali", "Noto Sans", sans-serif'}`;
  const lines = text.split(/\r?\n/);
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Canvas is not available in this browser.');
  probe.font = font;
  const widthPx = Math.ceil(Math.max(...lines.map((l) => probe.measureText(l).width), 1)) + 4;
  const lineH = sizePt * LINE_HEIGHT * k;
  const heightPx = Math.ceil(lineH * lines.length) + 4;
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, 2, i * lineH + (lineH - sizePt * k) / 2));
  const dataUrl = canvas.toDataURL('image/png');
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return { bytes, width: widthPx / k, height: heightPx / k };
}

export async function applyEdits(bytes: Uint8Array, ops: EditOp[]): Promise<Uint8Array> {
  if (ops.length === 0) return bytes;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = doc.getPageCount();

  const fontCache = new Map<string, PDFFont>();
  const getFont = async (family: FontFamilyKey, bold: boolean): Promise<PDFFont> => {
    const key = `${family}${bold ? 'b' : ''}`;
    const hit = fontCache.get(key);
    if (hit) return hit;
    const std =
      family === 'serif'
        ? bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman
        : family === 'mono'
        ? bold ? StandardFonts.CourierBold : StandardFonts.Courier
        : bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
    const font = await doc.embedFont(std);
    fontCache.set(key, font);
    return font;
  };

  for (const op of ops) {
    if (!Number.isInteger(op.page) || op.page < 1 || op.page > total) {
      throw new Error(`Page ${op.page} does not exist (the PDF has ${total} pages).`);
    }
    const page = doc.getPage(op.page - 1);
    if (page.getRotation().angle % 360 !== 0) {
      throw new Error(`Page ${op.page} is rotated, so it cannot be edited. Edit first, then rotate the page.`);
    }
    const box = page.getCropBox();
    const X = (fx: number) => box.x + fx * box.width;
    const Y = (fy: number) => box.y + box.height - fy * box.height;
    const col = (hex: string) => {
      const c = hexToRgb(hex);
      return rgb(c.r, c.g, c.b);
    };

    const drawTextBlock = async (
      text: string, xFrac: number, topPt: number, size: number, color: string, family: FontFamilyKey, bold: boolean
    ) => {
      text = text.replace(/\t/g, '    ');
      if (!text.trim()) return;
      if (isLatinText(text)) {
        const font = await getFont(family, bold);
        text.split(/\r?\n/).forEach((line, i) => {
          page.drawText(line, {
            x: X(xFrac),
            y: topPt - size * (FIRST_BASELINE + LINE_HEIGHT * i),
            size,
            font,
            color: col(color),
          });
        });
      } else {
        const img = renderTextToPng(text, size, color, family);
        const embedded = await doc.embedPng(img.bytes);
        page.drawImage(embedded, { x: X(xFrac), y: topPt - img.height, width: img.width, height: img.height });
      }
    };

    switch (op.kind) {
      case 'text':
        await drawTextBlock(op.text, op.x, Y(op.y), op.size, op.color, op.family ?? 'sans', !!op.bold);
        break;

      case 'textEdit': {
        const pad = 1;
        page.drawRectangle({
          x: X(op.x) - pad,
          y: Y(op.y + op.h) - pad,
          width: op.w * box.width + pad * 2,
          height: op.h * box.height + pad * 2,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });
        // Place the first baseline exactly where the original baseline was.
        const topPt = Y(op.baseline) + op.size * FIRST_BASELINE;
        await drawTextBlock(op.text, op.x, topPt, op.size, op.color, op.family, false);
        break;
      }

      case 'whiteout':
        page.drawRectangle({
          x: X(op.x),
          y: Y(op.y + op.h),
          width: op.w * box.width,
          height: op.h * box.height,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });
        break;

      case 'markup': {
        const x = X(op.x);
        const w = op.w * box.width;
        const yBottom = Y(op.y + op.h);
        const h = op.h * box.height;
        if (op.style === 'highlight') {
          page.drawRectangle({ x, y: yBottom, width: w, height: h, color: col(op.color), opacity: 0.35, borderWidth: 0 });
        } else {
          const lineY = op.style === 'underline' ? yBottom + h * 0.08 : yBottom + h / 2;
          page.drawLine({ start: { x, y: lineY }, end: { x: x + w, y: lineY }, thickness: Math.max(0.8, h * 0.07), color: col(op.color) });
        }
        break;
      }

      case 'draw': {
        const pts = op.points;
        for (let i = 1; i < pts.length; i++) {
          page.drawLine({
            start: { x: X(pts[i - 1].x), y: Y(pts[i - 1].y) },
            end: { x: X(pts[i].x), y: Y(pts[i].y) },
            thickness: op.width,
            color: col(op.color),
            lineCap: LineCapStyle.Round,
          });
        }
        break;
      }

      case 'shape': {
        const x = X(op.x);
        const y = Y(op.y + op.h);
        const w = op.w * box.width;
        const h = op.h * box.height;
        if (op.shape === 'rect') {
          page.drawRectangle({ x, y, width: w, height: h, borderColor: col(op.color), borderWidth: op.width, ...(op.fill ? { color: col(op.fill) } : {}) });
        } else if (op.shape === 'ellipse') {
          page.drawEllipse({ x: x + w / 2, y: y + h / 2, xScale: Math.max(0.1, w / 2), yScale: Math.max(0.1, h / 2), borderColor: col(op.color), borderWidth: op.width, ...(op.fill ? { color: col(op.fill) } : {}) });
        } else {
          // line / arrow run from (x, y) to (x + w, y + h) in screen space (w and h may be negative)
          const start = { x: X(op.x), y: Y(op.y) };
          const end = { x: X(op.x + op.w), y: Y(op.y + op.h) };
          page.drawLine({ start, end, thickness: op.width, color: col(op.color), lineCap: LineCapStyle.Round });
          if (op.shape === 'arrow') {
            const ang = Math.atan2(end.y - start.y, end.x - start.x);
            const len = Math.max(8, op.width * 4);
            for (const s of [-1, 1]) {
              page.drawLine({
                start: end,
                end: { x: end.x - len * Math.cos(ang + s * 0.45), y: end.y - len * Math.sin(ang + s * 0.45) },
                thickness: op.width,
                color: col(op.color),
                lineCap: LineCapStyle.Round,
              });
            }
          }
        }
        break;
      }

      case 'image': {
        const img = op.mime === 'image/jpeg' ? await doc.embedJpg(op.bytes) : await doc.embedPng(op.bytes);
        page.drawImage(img, { x: X(op.x), y: Y(op.y + op.h), width: op.w * box.width, height: op.h * box.height });
        break;
      }
    }
  }

  return doc.save();
}

// ───────────────────────── Page operations (work on the bytes) ─────────────────────────

async function loadForPageOps(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

function checkIndex(doc: PDFDocument, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= doc.getPageCount()) {
    throw new Error('That page does not exist.');
  }
}

export async function rotatePageBytes(bytes: Uint8Array, index: number, delta: 90 | -90): Promise<Uint8Array> {
  const doc = await loadForPageOps(bytes);
  checkIndex(doc, index);
  const page = doc.getPage(index);
  const next = (((page.getRotation().angle + delta) % 360) + 360) % 360;
  page.setRotation(degrees(next));
  return doc.save();
}

export async function deletePageBytes(bytes: Uint8Array, index: number): Promise<Uint8Array> {
  const doc = await loadForPageOps(bytes);
  checkIndex(doc, index);
  if (doc.getPageCount() <= 1) throw new Error('A PDF needs at least one page.');
  doc.removePage(index);
  return doc.save();
}

export async function movePageBytes(bytes: Uint8Array, from: number, to: number): Promise<Uint8Array> {
  const doc = await loadForPageOps(bytes);
  checkIndex(doc, from);
  checkIndex(doc, to);
  if (from === to) return bytes;
  const page = doc.getPage(from);
  doc.removePage(from);
  doc.insertPage(to, page);
  return doc.save();
}

/** A PDF with one empty A4 page, for "start from a blank document". */
export async function createBlankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  return doc.save();
}
