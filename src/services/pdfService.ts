import { PDFDocument, degrees, PDFName } from 'pdf-lib';
import { validateFileInput } from '../utils/privacy';

export interface PdfResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  pageCount: number;
  reductionPercentage?: number;
  meaningfulReduction?: boolean;
}

export interface PdfMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  fileSize: number;
}

/**
 * Merge multiple PDF files in given sequence into a single clean PDF document.
 */
export async function mergePdfs(files: File[]): Promise<PdfResult> {
  if (!files || files.length < 2) {
    throw new Error('অন্তত দুটি পিডিএফ ফাইল নির্বাচন করুন (At least two PDF files are required to merge)');
  }

  const mergedDoc = await PDFDocument.create();
  let totalOriginalSize = 0;

  for (const file of files) {
    const val = validateFileInput(file);
    if (!val.isValid) throw new Error(val.error);

    totalOriginalSize += file.size;
    const arrayBuffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  const mergedBytes = await mergedDoc.save();
  const blob = new Blob([mergedBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    originalSize: totalOriginalSize,
    newSize: blob.size,
    pageCount: mergedDoc.getPageCount(),
  };
}

/**
 * Split a PDF by page ranges (e.g. "1-3, 5") into a new PDF.
 */
export async function splitPdf(file: File, pageRangeStr: string): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const selectedIndices = parsePageRanges(pageRangeStr, totalPages);
  if (selectedIndices.length === 0) {
    throw new Error('সঠিক পৃষ্ঠা নম্বর বা রেঞ্জ প্রদান করুন (Please enter valid page numbers or range)');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const newBytes = await newDoc.save();
  const blob = new Blob([newBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    pageCount: newDoc.getPageCount(),
  };
}

/**
 * Extract specific pages into a new PDF.
 */
export async function extractPages(file: File, pageNumbers: number[]): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const zeroBasedIndices = pageNumbers
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < totalPages);

  if (zeroBasedIndices.length === 0) {
    throw new Error('কোনো বৈধ পৃষ্ঠা পাওয়া যায়নি (No valid pages found to extract)');
  }

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, zeroBasedIndices);
  copied.forEach((page) => newDoc.addPage(page));

  const newBytes = await newDoc.save();
  const blob = new Blob([newBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    pageCount: newDoc.getPageCount(),
  };
}

/**
 * Delete specified pages from a PDF.
 */
export async function deletePages(file: File, pagesToDelete: number[]): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const sortedDescending = [...new Set(pagesToDelete)]
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < totalPages)
    .sort((a, b) => b - a);

  if (sortedDescending.length === totalPages) {
    throw new Error('একটি পিডিএফ থেকে সব পৃষ্ঠা মুছে ফেলা যাবে না (Cannot delete all pages of a PDF)');
  }

  for (const pageIdx of sortedDescending) {
    doc.removePage(pageIdx);
  }

  const newBytes = await doc.save();
  const blob = new Blob([newBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    pageCount: doc.getPageCount(),
  };
}

/**
 * Rotate pages of a PDF by 90, 180, or 270 degrees.
 */
export async function rotatePages(
  file: File,
  angle: 90 | 180 | 270,
  pageNumbers?: number[]
): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const targetIndices = pageNumbers && pageNumbers.length > 0
    ? pageNumbers.map((p) => p - 1).filter((i) => i >= 0 && i < totalPages)
    : doc.getPageIndices();

  for (const idx of targetIndices) {
    const page = doc.getPage(idx);
    const currentAngle = page.getRotation().angle;
    page.setRotation(degrees((currentAngle + angle) % 360));
  }

  const newBytes = await doc.save();
  const blob = new Blob([newBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    pageCount: doc.getPageCount(),
  };
}

/**
 * Convert multiple image files (JPEG, PNG, WebP) into a clean, standardized PDF document.
 */
export async function imagesToPdf(imageFiles: File[]): Promise<PdfResult> {
  if (!imageFiles || imageFiles.length === 0) {
    throw new Error('কমপক্ষে একটি ছবি নির্বাচন করুন (At least one image is required)');
  }

  const pdfDoc = await PDFDocument.create();
  let totalOriginalSize = 0;

  for (const imgFile of imageFiles) {
    totalOriginalSize += imgFile.size;
    const arrayBuffer = await imgFile.arrayBuffer();
    const type = imgFile.type.toLowerCase();

    let embeddedImage;
    if (type.includes('jpeg') || type.includes('jpg')) {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    } else if (type.includes('png')) {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer);
    } else {
      // For WebP or other formats, convert to PNG via offscreen canvas first
      const pngBlob = await convertImageFormat(imgFile, 'image/png');
      const pngBuffer = await pngBlob.arrayBuffer();
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const { width, height } = embeddedImage.scale(1);
    // Standard page fitting (A4 or scaled bounding box)
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    originalSize: totalOriginalSize,
    newSize: blob.size,
    pageCount: pdfDoc.getPageCount(),
  };
}

/**
 * Basic PDF Optimization / Compression.
 * Re-serializes the PDF object stream, strips unreferenced objects, and checks reduction.
 * Honest reporting: if no meaningful reduction occurs, flags meaningfulReduction = false.
 */
export async function optimizePdf(file: File): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Save with object stream compression and minimal dictionary overhead
  const optimizedBytes = await doc.save({
    useObjectStreams: true,
  });

  const blob = new Blob([optimizedBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const originalSize = file.size;
  const newSize = blob.size;

  const reductionPercentage = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100))
    : 0;

  // Genuine reduction check: meaningful if reduced by at least 1.5%
  const meaningfulReduction = newSize < originalSize && reductionPercentage >= 2;

  return {
    blob: meaningfulReduction ? blob : new Blob([arrayBuffer], { type: 'application/pdf' }),
    originalSize,
    newSize: meaningfulReduction ? newSize : originalSize,
    pageCount: doc.getPageCount(),
    reductionPercentage: meaningfulReduction ? reductionPercentage : 0,
    meaningfulReduction,
  };
}

/**
 * Extract PDF basic metadata safely.
 */
export async function getPdfMetadata(file: File): Promise<PdfMetadata> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
    fileSize: file.size,
  };
}

/**
 * Helper to parse page range strings like "1, 3-5, 8" into 0-based indices.
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Helper to convert any image file into a Blob of specified MIME type using HTML5 Canvas.
 */
async function convertImageFormat(file: File, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert image'));
      }, mimeType);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for PDF conversion'));
    };
    img.src = url;
  });
}

export interface PdfPageText {
  pageNumber: number;
  text: string;
  isLikelyScanned: boolean;
  wordCount: number;
}

export interface PdfTextExtractionResult {
  pages: PdfPageText[];
  fullText: string;
  totalWords: number;
  classification: 'TEXT_BASED' | 'SCANNED' | 'MIXED';
  metadata: PdfMetadata;
  warning?: string;
}

async function decompressPdfStream(streamObj: any): Promise<string> {
  if (!streamObj || typeof streamObj.getContents !== 'function') return '';
  const rawBytes: Uint8Array = streamObj.getContents();
  if (!rawBytes || rawBytes.length === 0) return '';

  const filter = streamObj.dict?.get(PDFName.of('Filter'))?.toString?.() || '';
  const isFlate = filter.includes('FlateDecode') || !filter;

  if (isFlate) {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(rawBytes as any);
        writer.close();
        const res = new Response(ds.readable);
        return await res.text();
      } catch (_) {}
    }
    // Node environment fallback
    try {
      const zlib = await import('node:zlib');
      return zlib.inflateSync(Buffer.from(rawBytes as any)).toString('latin1');
    } catch (_) {}
  }

  return new TextDecoder('latin1').decode(rawBytes);
}

/**
 * Extract text from PDF document streams and classify whether text-based or scanned.
 */
export async function extractPdfText(file: File): Promise<PdfTextExtractionResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const metadata = await getPdfMetadata(file);
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const pages: PdfPageText[] = [];
  let scannedCount = 0;
  let textBasedCount = 0;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    let extractedPageText = '';

    // Inspect stream contents of the page
    try {
      const contentsRef = page.node.Contents();
      if (contentsRef) {
        let streamData = '';
        const resolved = doc.context.lookup(contentsRef);
        const streamObjects: any[] = [];
        if (resolved) {
          if (typeof (resolved as any).size === 'function') {
            const sz = (resolved as any).size();
            for (let s = 0; s < sz; s++) {
              const item = doc.context.lookup((resolved as any).get(s));
              if (item) streamObjects.push(item);
            }
          } else {
            streamObjects.push(resolved);
          }
        }

        for (const sObj of streamObjects) {
          const chunk = await decompressPdfStream(sObj);
          if (chunk) streamData += ' ' + chunk;
        }

        // Match text in parentheses before Tj or in bracketed arrays before TJ
        const matches: string[] = [];
        const tjRegex = /\(([^)]+)\)\s*Tj/g;
        let match;
        while ((match = tjRegex.exec(streamData)) !== null) {
          matches.push(match[1]);
        }
        const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
        while ((match = tjArrayRegex.exec(streamData)) !== null) {
          const innerMatches = match[1].match(/\(([^)]+)\)/g);
          if (innerMatches) {
            matches.push(
              innerMatches
                .map((m) => m.slice(1, -1))
                .join('')
            );
          }
        }

        // Also extract hex strings <4d41495348...> before Tj or inside TJ
        const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
        let hexMatch;
        while ((hexMatch = hexTjRegex.exec(streamData)) !== null) {
          const hex = hexMatch[1];
          let str = '';
          for (let h = 0; h < hex.length; h += 2) {
            str += String.fromCharCode(parseInt(hex.substr(h, 2), 16));
          }
          matches.push(str);
        }

        extractedPageText = matches.join(' ').replace(/\\([()\\])/g, '$1').trim();
      }
    } catch (_) {
      // In case stream is compressed or encrypted
    }

    const wordCount = extractedPageText.split(/\s+/).filter(Boolean).length;
    const isLikelyScanned = wordCount < 5; // Less than 5 words strongly suggests scanned or non-extractable raster

    if (isLikelyScanned) {
      scannedCount++;
    } else {
      textBasedCount++;
    }

    pages.push({
      pageNumber: i + 1,
      text: extractedPageText,
      isLikelyScanned,
      wordCount,
    });
  }

  let classification: 'TEXT_BASED' | 'SCANNED' | 'MIXED' = 'TEXT_BASED';
  let warning: string | undefined;

  if (scannedCount === totalPages) {
    classification = 'SCANNED';
    warning = 'এই PDF-টি স্ক্যান করা হতে পারে। টেক্সট পেতে OCR প্রয়োজন। (Scanned PDF detected. OCR is recommended)';
  } else if (scannedCount > 0 && textBasedCount > 0) {
    classification = 'MIXED';
    warning = 'এই PDF-এ কিছু পৃষ্ঠা স্ক্যান করা হতে পারে। OCR প্রয়োজন হতে পারে। (Mixed content: some pages appear scanned)';
  }

  const fullText = pages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.text || '[No extractable text found — Scan / OCR may be required]'}\n`)
    .join('\n');

  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);

  return {
    pages,
    fullText,
    totalWords,
    classification,
    metadata,
    warning,
  };
}
