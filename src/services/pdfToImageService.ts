import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { createManagedObjectUrl } from '../utils/privacy';

export interface PdfToImageOptions {
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number; // 0.1 to 1.0 (for JPEG and WebP)
  scale?: number; // Scale multiplier (1.0 = standard 72 DPI, 2.0 = crisp 144 DPI, 3.0 = ultra 216 DPI)
  pageNumbers?: number[]; // Specific 1-indexed page numbers, or undefined for all pages
  filenamePrefix?: string;
  onProgress?: (progress: { current: number; total: number; percent: number; message: string }) => void;
}

export interface PdfPageImage {
  pageNumber: number;
  width: number;
  height: number;
  blob: Blob;
  url: string;
  filename: string;
  fileSize: number;
}

export interface PdfToImageResult {
  images: PdfPageImage[];
  totalPages: number;
  selectedPageCount: number;
  zipBlob?: Blob;
  zipUrl?: string;
  zipFilename?: string;
  totalImagesSize: number;
}

let isWorkerConfigured = false;

export function configurePdfJsWorker(): void {
  if (isWorkerConfigured && (pdfjsLib as any).GlobalWorkerOptions?.workerSrc) return;
  try {
    const isNodeOrJsdom = typeof process !== 'undefined' && Boolean(process?.versions?.node);

    if (isNodeOrJsdom) {
      // In Node.js / JSDOM / Vitest testing environments, point to the absolute filesystem path
      const cwd = process.cwd ? process.cwd() : '.';
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `${cwd}/node_modules/pdfjs-dist/build/pdf.worker.mjs`;
    } else {
      // In real browser client, point to the served public worker asset
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    }
    isWorkerConfigured = true;
  } catch (err) {
    console.warn('PDF.js worker initialization warning:', err);
  }
}

/**
 * Parse human readable page range input like "1-3, 5, 8-10" into sorted unique 1-indexed page numbers.
 */
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim() || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const result = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let p = from; p <= to; p++) {
          result.add(p);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        result.add(num);
      }
    }
  }

  const sorted = Array.from(result).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : Array.from({ length: maxPages }, (_, i) => i + 1);
}

/**
 * Convert PDF pages to high-resolution JPEG, PNG, or WebP images.
 * Provides both individual page items (with object URLs) and an optional JSZip archive.
 */
export async function convertPdfToImages(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  options: PdfToImageOptions = {}
): Promise<PdfToImageResult> {
  configurePdfJsWorker();

  const format = options.format || 'image/jpeg';
  const quality = typeof options.quality === 'number' ? Math.max(0.1, Math.min(1.0, options.quality)) : 0.92;
  const scale = typeof options.scale === 'number' ? Math.max(0.5, Math.min(4.0, options.scale)) : 2.0;

  let baseName = 'document';
  let dataBytes: Uint8Array;

  if (fileOrBuffer instanceof File) {
    baseName = fileOrBuffer.name.replace(/\.[^/.]+$/, '');
    const buffer = await fileOrBuffer.arrayBuffer();
    dataBytes = new Uint8Array(buffer);
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    dataBytes = new Uint8Array(fileOrBuffer);
  } else {
    dataBytes = fileOrBuffer;
  }

  const prefix = options.filenamePrefix || baseName || 'pdf_page';
  const extension = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';

  // Load PDF Document via PDF.js
  const loadingTask = (pdfjsLib as any).getDocument({
    data: dataBytes,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  if (totalPages === 0) {
    throw new Error('পিডিএফ ডকুমেন্টে কোনো পৃষ্ঠা পাওয়া যায়নি (PDF contains no pages)');
  }

  // Determine pages to render
  const targetPages = options.pageNumbers && options.pageNumbers.length > 0
    ? options.pageNumbers.filter((p) => p >= 1 && p <= totalPages)
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  if (targetPages.length === 0) {
    throw new Error('নির্বাচিত পৃষ্ঠা রেঞ্জ অবৈধ (Invalid page range selected)');
  }

  const images: PdfPageImage[] = [];
  let totalImagesSize = 0;

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];

    if (options.onProgress) {
      options.onProgress({
        current: i + 1,
        total: targetPages.length,
        percent: Math.round(((i + 1) / targetPages.length) * 100),
        message: `পৃষ্ঠা ${pageNum} রূপান্তর হচ্ছে... (Rendering page ${pageNum}/${totalPages})`,
      });
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context could not be created');
    }

    // Fill with solid white background for JPEG exports or opaque presentation
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const renderContext = {
      canvasContext: ctx,
      viewport,
    };

    const renderTask = page.render(renderContext);
    await renderTask.promise;

    // Convert Canvas to Blob
    const pageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to convert page ${pageNum} to ${format}`));
        },
        format,
        quality
      );
    });

    const pageUrl = createManagedObjectUrl(pageBlob);
    const paddedIndex = String(pageNum).padStart(totalPages >= 10 ? 2 : 1, '0');
    const filename = `${prefix}_page_${paddedIndex}.${extension}`;

    totalImagesSize += pageBlob.size;

    images.push({
      pageNumber: pageNum,
      width: canvas.width,
      height: canvas.height,
      blob: pageBlob,
      url: pageUrl,
      filename,
      fileSize: pageBlob.size,
    });
  }

  // Generate ZIP Archive if multiple images or requested
  let zipBlob: Blob | undefined;
  let zipUrl: string | undefined;
  let zipFilename: string | undefined;

  if (images.length > 1) {
    const zip = new JSZip();
    images.forEach((img) => {
      zip.file(img.filename, img.blob);
    });

    zipBlob = await zip.generateAsync({ type: 'blob' });
    zipUrl = createManagedObjectUrl(zipBlob);
    zipFilename = `${prefix}_jpg_pages.zip`;
  }

  return {
    images,
    totalPages,
    selectedPageCount: images.length,
    zipBlob,
    zipUrl,
    zipFilename,
    totalImagesSize,
  };
}
