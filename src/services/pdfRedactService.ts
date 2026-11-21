/**
 * Permanent PDF redaction.
 *
 * Pages that contain redaction boxes are rendered to an image, the boxes are burned in as solid black,
 * and the page is rebuilt from that image. The hidden text underneath therefore no longer exists in the file
 * (it cannot be selected, searched or copied). Pages without boxes are copied unchanged.
 * Trade-off: redacted pages become images (text on them is no longer selectable and file size can grow).
 */
import { PDFDocument } from 'pdf-lib';
import { convertPdfToImages } from './pdfToImageService';

export interface RedactRect {
  /** 1-based page number */
  page: number;
  /** All values are fractions (0-1) of the page, measured from the top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export function validateRedactRects(rects: RedactRect[], totalPages: number): void {
  if (!rects || rects.length === 0) {
    throw new Error('Draw at least one box over the area you want to hide.');
  }
  for (const r of rects) {
    if (!Number.isInteger(r.page) || r.page < 1 || r.page > totalPages) {
      throw new Error(`Redaction page must be between 1 and ${totalPages}.`);
    }
    const ok = [r.x, r.y, r.w, r.h].every((v) => Number.isFinite(v)) && r.w > 0 && r.h > 0;
    if (!ok || r.x < 0 || r.y < 0 || r.x + r.w > 1.0001 || r.y + r.h > 1.0001) {
      throw new Error('A redaction box is outside the page. Please redraw it.');
    }
  }
}

/**
 * Build the output PDF: replace the given pages by full-page PNG images, copy every other page unchanged.
 * `replacements` maps a 1-based page number to PNG bytes of the already-redacted page.
 */
export async function assembleRedactedPdf(
  source: Uint8Array | ArrayBuffer,
  replacements: Map<number, Uint8Array>
): Promise<Uint8Array> {
  const src = await PDFDocument.load(source, { ignoreEncryption: true });
  const out = await PDFDocument.create();

  for (let i = 0; i < src.getPageCount(); i++) {
    const png = replacements.get(i + 1);
    if (png) {
      const { width, height } = src.getPage(i).getSize();
      const page = out.addPage([width, height]);
      const img = await out.embedPng(png);
      page.drawImage(img, { x: 0, y: 0, width, height });
    } else {
      const [copied] = await out.copyPages(src, [i]);
      out.addPage(copied);
    }
  }
  // Drop document metadata that could still hold sensitive text.
  out.setTitle('');
  out.setAuthor('');
  out.setSubject('');
  out.setKeywords([]);
  return out.save();
}

/** Browser-only: paint black boxes onto a rendered page image and return PNG bytes. */
async function burnRectangles(pageImage: Blob, rects: RedactRect[]): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(pageImage);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the page for redaction (canvas unavailable).');
  ctx.drawImage(bitmap, 0, 0);
  ctx.fillStyle = '#000000';
  for (const r of rects) {
    ctx.fillRect(r.x * canvas.width, r.y * canvas.height, r.w * canvas.width, r.h * canvas.height);
  }
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Could not export the redacted page.');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function redactPdf(
  file: File,
  rects: RedactRect[],
  onProgress?: (done: number, total: number) => void
): Promise<{ blob: Blob; originalSize: number; newSize: number; pageCount: number; redactedPages: number[] }> {
  const srcBytes = new Uint8Array(await file.arrayBuffer());
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();
  validateRedactRects(rects, total);

  const pages = Array.from(new Set(rects.map((r) => r.page))).sort((a, b) => a - b);
  const rendered = await convertPdfToImages(file, { format: 'image/png', scale: 2, pageNumbers: pages });

  const replacements = new Map<number, Uint8Array>();
  let done = 0;
  for (const img of rendered.images) {
    const pageRects = rects.filter((r) => r.page === img.pageNumber);
    replacements.set(img.pageNumber, await burnRectangles(img.blob, pageRects));
    onProgress?.(++done, pages.length);
  }
  if (replacements.size !== pages.length) {
    throw new Error('Some pages could not be rendered for redaction. Nothing was changed.');
  }

  const bytes = await assembleRedactedPdf(srcBytes, replacements);
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: file.size, newSize: blob.size, pageCount: total, redactedPages: pages };
}
