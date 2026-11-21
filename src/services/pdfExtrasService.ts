/**
 * PDF extras inspired by the PDF24 tool list (own implementation, no code copied):
 *  - Extract images from a PDF
 *  - Add text to a PDF ("Edit PDF" light: overlay text boxes)
 *  - Overlay one PDF on or under another (letterhead / stamp)
 * Everything runs in the browser.
 */
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFNumber,
  PDFArray,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import pako from 'pako';
import JSZip from 'jszip';
import { validateFileInput } from '../utils/privacy';
import { assertLatinText, hexToRgb, type PdfResult } from './pdfService';

// ───────────────────────── Extract images ─────────────────────────

export interface ExtractedImage {
  filename: string;
  mime: 'image/jpeg' | 'image/png';
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ExtractImagesResult {
  images: ExtractedImage[];
  /** Image objects found but not exportable (masks, CMYK, predictor-encoded, JPEG2000, ...) */
  skipped: number;
  zipBlob: Blob | null;
}

let crcTable: Uint32Array | null = null;
function crc32(buf: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encode raw 8-bit gray (channels=1) or RGB (channels=3) pixels as PNG. */
export function encodePng(pixels: Uint8Array, width: number, height: number, channels: 1 | 3): Uint8Array {
  const stride = width * channels;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = channels === 1 ? 0 : 2;
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', pako.deflate(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function filterNames(stream: PDFRawStream): string[] {
  const f = stream.dict.lookup(PDFName.of('Filter'));
  if (!f) return [];
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray) {
    return f.asArray().map((x) => (x instanceof PDFName ? x.decodeText() : ''));
  }
  return [];
}

function numberOf(stream: PDFRawStream, key: string): number {
  const v = stream.dict.lookup(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : 0;
}

export async function extractPdfImages(file: File): Promise<ExtractImagesResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const images: ExtractedImage[] = [];
  let skipped = 0;
  let index = 0;

  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.lookup(PDFName.of('Subtype'));
    if (!(subtype instanceof PDFName) || subtype.decodeText() !== 'Image') continue;

    const width = numberOf(obj, 'Width');
    const height = numberOf(obj, 'Height');
    const filters = filterNames(obj);
    const isMask = obj.dict.lookup(PDFName.of('ImageMask'));
    if (isMask || !width || !height) {
      skipped++;
      continue;
    }

    if (filters.length === 1 && filters[0] === 'DCTDecode') {
      index++;
      images.push({
        filename: `image_${String(index).padStart(3, '0')}.jpg`,
        mime: 'image/jpeg',
        bytes: obj.contents,
        width,
        height,
      });
      continue;
    }

    const cs = obj.dict.lookup(PDFName.of('ColorSpace'));
    const csName = cs instanceof PDFName ? cs.decodeText() : '';
    const bpc = numberOf(obj, 'BitsPerComponent');
    const hasPredictor = !!obj.dict.lookup(PDFName.of('DecodeParms'));
    const channels = csName === 'DeviceRGB' ? 3 : csName === 'DeviceGray' ? 1 : 0;

    if (filters.length === 1 && filters[0] === 'FlateDecode' && channels && bpc === 8 && !hasPredictor) {
      try {
        const pixels = pako.inflate(obj.contents);
        if (pixels.length >= width * height * channels) {
          index++;
          images.push({
            filename: `image_${String(index).padStart(3, '0')}.png`,
            mime: 'image/png',
            bytes: encodePng(pixels, width, height, channels as 1 | 3),
            width,
            height,
          });
          continue;
        }
      } catch {
        /* fall through to skipped */
      }
    }
    skipped++;
  }

  let zipBlob: Blob | null = null;
  if (images.length > 0) {
    const zip = new JSZip();
    for (const img of images) zip.file(img.filename, img.bytes);
    zipBlob = await zip.generateAsync({ type: 'blob' });
  }
  return { images, skipped, zipBlob };
}

// ───────────────────────── Add text (Edit PDF light) ─────────────────────────

export interface PdfTextItem {
  /** 1-based page number */
  page: number;
  text: string;
  /** Left edge, 0-100 % of page width */
  xPct: number;
  /** Top edge, 0-100 % of page height (0 = top) */
  yPct: number;
  size?: number;
  color?: string;
}

export async function addTextToPdf(file: File, items: PdfTextItem[]): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const clean = items.filter((i) => (i.text || '').trim());
  if (clean.length === 0) throw new Error('Type the text you want to add.');
  clean.forEach((i) => assertLatinText(i.text.replace(/[\r\n]+/g, ' ')));

  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();

  for (const item of clean) {
    if (item.page < 1 || item.page > total) {
      throw new Error(`Page ${item.page} does not exist (the PDF has ${total} pages).`);
    }
    const page = doc.getPage(item.page - 1);
    const { width, height } = page.getSize();
    const size = Math.min(200, Math.max(6, item.size ?? 14));
    const { r, g, b } = hexToRgb(item.color || '#000000');
    const x = (Math.min(100, Math.max(0, item.xPct)) / 100) * width;
    const yTop = (Math.min(100, Math.max(0, item.yPct)) / 100) * height;
    item.text.split('\n').forEach((line, i) => {
      page.drawText(line, { x, y: height - yTop - size * (i + 1), size, font, color: rgb(r, g, b) });
    });
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: file.size, newSize: blob.size, pageCount: doc.getPageCount() };
}

// ───────────────────────── Overlay ─────────────────────────

/** pdf-lib cannot embed a page that has no /Contents (blank page), so give it an empty stream. */
function ensurePageContents(doc: PDFDocument): void {
  for (const page of doc.getPages()) {
    if (!page.node.Contents()) {
      page.node.set(PDFName.of('Contents'), doc.context.register(doc.context.stream('')));
    }
  }
}

export interface OverlayOptions {
  /** 'over' = overlay on top of the base page, 'under' = behind it (letterhead) */
  position: 'over' | 'under';
  /** 'first' = always use the overlay's first page, 'match' = page N uses overlay page N (last page repeats) */
  pageMode: 'first' | 'match';
}

export async function overlayPdf(base: File, overlay: File, options: OverlayOptions): Promise<PdfResult> {
  for (const f of [base, overlay]) {
    const val = validateFileInput(f);
    if (!val.isValid) throw new Error(val.error);
  }
  const baseDoc = await PDFDocument.load(await base.arrayBuffer(), { ignoreEncryption: true });
  const overDoc = await PDFDocument.load(await overlay.arrayBuffer(), { ignoreEncryption: true });
  ensurePageContents(baseDoc);
  ensurePageContents(overDoc);
  const overCount = overDoc.getPageCount();

  const out = await PDFDocument.create();
  const basePages = await out.embedPdf(baseDoc, baseDoc.getPageIndices());
  const overIdx =
    options.pageMode === 'first'
      ? [0]
      : Array.from({ length: overCount }, (_, i) => i);
  const overPages = await out.embedPdf(overDoc, overIdx);

  basePages.forEach((bp, i) => {
    const page = out.addPage([bp.width, bp.height]);
    const op = overPages[Math.min(options.pageMode === 'first' ? 0 : i, overPages.length - 1)];
    const drawBase = () => page.drawPage(bp, { x: 0, y: 0, width: bp.width, height: bp.height });
    const drawOver = () => page.drawPage(op, { x: 0, y: 0, width: bp.width, height: bp.height });
    if (options.position === 'under') {
      drawOver();
      drawBase();
    } else {
      drawBase();
      drawOver();
    }
  });

  const bytes = await out.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: base.size, newSize: blob.size, pageCount: out.getPageCount() };
}
