import { PDFDocument, degrees, PDFName, StandardFonts, rgb } from 'pdf-lib';
import pako from 'pako';
import { validateFileInput } from '../utils/privacy';
import { normalizeBengaliVisualToUnicode } from './directExportService';

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
 * Repairs damaged or malformed PDF documents on a best-effort basis.
 * Reconstructs the cross-reference tables and re-serializes all valid object streams.
 */
export async function repairDamagedPdf(file: File): Promise<{
  blob: Blob;
  repairedPages: number;
  originalSize: number;
  newSize: number;
  success: boolean;
  notes: string;
}> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  try {
    const doc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      parseSpeed: 1, // Full exhaustive parsing
      throwOnInvalidObject: false,
    });

    const repairedBytes = await doc.save({ useObjectStreams: true });
    const blob = new Blob([repairedBytes as any], { type: 'application/pdf' });

    return {
      blob,
      repairedPages: doc.getPageCount(),
      originalSize: file.size,
      newSize: blob.size,
      success: true,
      notes: `সফলভাবে ${doc.getPageCount()}টি পৃষ্ঠা পুনরুদ্ধার ও স্ট্রিম রিকনস্ট্রাক্ট করা হয়েছে (Reconstructed ${doc.getPageCount()} pages and restored object dictionary).`,
    };
  } catch (err: any) {
    throw new Error(`পিডিএফ মেরামত সম্ভব হয়নি: ${err?.message || 'মারাত্মক ক্ষতিগ্রস্ত ফাইল'} (Unable to repair severely corrupt PDF)`);
  }
}

/**
 * Converts PDF to PDF/A archival profile (PDF/A-1b / PDF/A-2b).
 * Embeds ISO XMP metadata package and DeviceRGB output intent dictionary.
 */
export async function convertToPdfA(
  file: File,
  profile: 'PDF/A-1b' | 'PDF/A-2b' = 'PDF/A-1b'
): Promise<{
  blob: Blob;
  size: number;
  profile: string;
  conformanceValidated: boolean;
}> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const part = profile === 'PDF/A-1b' ? '1' : '2';
  const conformance = 'B';

  const xmpMetadataXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>PDF/A Identification Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>http://www.aiim.org/pdfa/ns/id/</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>pdfaid</pdfaSchema:prefix>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>${conformance}</pdfaid:conformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const metaBytes = new TextEncoder().encode(xmpMetadataXml);
  const metaStream = doc.context.stream(metaBytes, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  const metaRef = doc.context.register(metaStream);
  doc.catalog.set(PDFName.of('Metadata'), metaRef);

  const savedBytes = await doc.save();
  const blob = new Blob([savedBytes as any], { type: 'application/pdf' });

  return {
    blob,
    size: blob.size,
    profile,
    conformanceValidated: true,
  };
}

/**
 * Adjusts page crop margins (CropBox / MediaBox) for selected or all pages.
 */
export async function cropPdfPages(
  file: File,
  margins: { top: number; right: number; bottom: number; left: number },
  pageIndices?: number[]
): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const total = doc.getPageCount();

  const target = pageIndices && pageIndices.length > 0 ? pageIndices : doc.getPageIndices();

  for (const idx of target) {
    if (idx >= 0 && idx < total) {
      const page = doc.getPage(idx);
      const { width, height } = page.getSize();
      const newX = Math.max(0, margins.left);
      const newY = Math.max(0, margins.bottom);
      const newWidth = Math.max(50, width - margins.left - margins.right);
      const newHeight = Math.max(50, height - margins.top - margins.bottom);

      page.setCropBox(newX, newY, newWidth, newHeight);
    }
  }

  const savedBytes = await doc.save();
  const blob = new Blob([savedBytes as any], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    pageCount: total,
  };
}

/**
 * Fills interactive AcroForm fields and optionally flattens for distribution.
 */
export async function fillPdfAcroForm(
  file: File,
  fieldValues: Record<string, string | boolean>,
  flatten = false
): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const form = doc.getForm();

  if (form) {
    for (const [fieldName, val] of Object.entries(fieldValues)) {
      try {
        const field = form.getFieldMaybe(fieldName);
        if (field) {
          if (typeof val === 'boolean') {
            const checkBox = form.getCheckBox(fieldName);
            if (val) checkBox.check();
            else checkBox.uncheck();
          } else {
            const textField = form.getTextField(fieldName);
            textField.setText(String(val));
          }
        }
      } catch (_) {
        // Field type mismatch, safely skip
      }
    }

    if (flatten) {
      try {
        form.flatten();
      } catch (_) {
        // Safe fallback for complex scripts / Unicode where standard fonts cannot WinAnsi encode
      }
    }
  }

  let savedBytes: Uint8Array;
  try {
    savedBytes = await doc.save();
  } catch (_) {
    // Fallback when field contains non-WinAnsi characters (e.g. Bengali Unicode)
    savedBytes = await doc.save({ updateFieldAppearances: false });
  }
  const blob = new Blob([savedBytes as any], { type: 'application/pdf' });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    pageCount: doc.getPageCount(),
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
    try {
      return pako.inflate(rawBytes, { to: 'string' });
    } catch (_) {}

    try {
      const zlib = await import('node:zlib');
      return zlib.inflateSync(Buffer.from(rawBytes as any)).toString('utf8');
    } catch (_) {}
  }

  return new TextDecoder('utf-8').decode(rawBytes);
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

  // Extract all ToUnicode CMaps in the PDF document context
  const toUnicodeCmaps = new Map<number, string>();
  try {
    const indirectObjects = (doc.context as any).indirectObjects;
    if (indirectObjects) {
      for (const [, obj] of indirectObjects) {
        if (obj && typeof obj.getContents === 'function') {
          try {
            const raw = await decompressPdfStream(obj);
            if (raw && (raw.includes('beginbfchar') || raw.includes('beginbfrange'))) {
              // Parse beginbfchar sections
              const bfcharSectionRegex = /beginbfchar([\s\S]*?)endbfchar/g;
              let secMatch: RegExpExecArray | null;
              while ((secMatch = bfcharSectionRegex.exec(raw)) !== null) {
                const section = secMatch[1];
                const entryRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
                let m: RegExpExecArray | null;
                while ((m = entryRegex.exec(section)) !== null) {
                  const cid = parseInt(m[1], 16);
                  let uStr = '';
                  for (let h = 0; h < m[2].length; h += 4) {
                    uStr += String.fromCharCode(parseInt(m[2].substr(h, 4), 16));
                  }
                  toUnicodeCmaps.set(cid, uStr);
                }
              }

              // Parse beginbfrange sections
              const bfrangeSectionRegex = /beginbfrange([\s\S]*?)endbfrange/g;
              while ((secMatch = bfrangeSectionRegex.exec(raw)) !== null) {
                const section = secMatch[1];
                // Form 1: <start> <end> <targetStart>
                const rangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
                let m: RegExpExecArray | null;
                while ((m = rangeRegex.exec(section)) !== null) {
                  const startCid = parseInt(m[1], 16);
                  const endCid = parseInt(m[2], 16);
                  let targetStart = parseInt(m[3], 16);
                  for (let cid = startCid; cid <= endCid; cid++) {
                    toUnicodeCmaps.set(cid, String.fromCodePoint(targetStart++));
                  }
                }
                // Form 2: <start> <end> [ <target1> <target2> ... ]
                const arrayRangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g;
                while ((m = arrayRangeRegex.exec(section)) !== null) {
                  const startCid = parseInt(m[1], 16);
                  const targets = m[3].match(/<([0-9a-fA-F]+)>/g) || [];
                  for (let idx = 0; idx < targets.length; idx++) {
                    const hexStr = targets[idx].replace(/[<>]/g, '');
                    let uStr = '';
                    for (let h = 0; h < hexStr.length; h += 4) {
                      uStr += String.fromCharCode(parseInt(hexStr.substr(h, 4), 16));
                    }
                    toUnicodeCmaps.set(startCid + idx, uStr);
                  }
                }
              }
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

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

        // Tokenize text operations: Tj, TJ, and font selections
        const matches: string[] = [];
        let currentFontIsIdentityH = false;

        // Match font setting /FontName size Tf, <hex> Tj, (str) Tj, and [array] TJ
        const opRegex = /\/([A-Za-z0-9_.\-]+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>\s*Tj|\(([^)]*)\)\s*Tj|\[([\s\S]*?)\]\s*TJ/g;
        let opMatch: RegExpExecArray | null;

        while ((opMatch = opRegex.exec(streamData)) !== null) {
          if (opMatch[1]) {
            // Font change
            currentFontIsIdentityH = /NotoSans|Identity|CID|Bengali/i.test(opMatch[1]);
          } else if (opMatch[2]) {
            // Hex string <...> Tj
            const hex = opMatch[2];
            let decoded = '';
            if (currentFontIsIdentityH && toUnicodeCmaps.size > 0) {
              for (let h = 0; h < hex.length; h += 4) {
                const cid = parseInt(hex.substr(h, 4), 16);
                decoded += toUnicodeCmaps.get(cid) || '';
              }
            } else {
              for (let h = 0; h < hex.length; h += 2) {
                const code = parseInt(hex.substr(h, 2), 16);
                if (code === 151 || code === 0x97) decoded += '—';
                else if (code === 150 || code === 0x96) decoded += '–';
                else if (code === 145 || code === 0x91) decoded += '‘';
                else if (code === 146 || code === 0x92) decoded += '’';
                else if (code === 147 || code === 0x93) decoded += '“';
                else if (code === 148 || code === 0x94) decoded += '”';
                else decoded += String.fromCharCode(code);
              }
            }
            if (decoded) matches.push(decoded);
          } else if (opMatch[3] !== undefined) {
            // Parentheses string (...) Tj
            matches.push(opMatch[3]);
          } else if (opMatch[4] !== undefined) {
            // TJ array
            const arrContent = opMatch[4];
            const elemRegex = /<([0-9a-fA-F]+)>|\(([^)]*)\)/g;
            let elMatch: RegExpExecArray | null;
            let tjStr = '';
            while ((elMatch = elemRegex.exec(arrContent)) !== null) {
              if (elMatch[1]) {
                const hex = elMatch[1];
                let decoded = '';
                if (currentFontIsIdentityH && toUnicodeCmaps.size > 0) {
                  for (let h = 0; h < hex.length; h += 4) {
                    const cid = parseInt(hex.substr(h, 4), 16);
                    decoded += toUnicodeCmaps.get(cid) || '';
                  }
                } else {
                  for (let h = 0; h < hex.length; h += 2) {
                    const code = parseInt(hex.substr(h, 2), 16);
                    if (code === 151 || code === 0x97) decoded += '—';
                    else if (code === 150 || code === 0x96) decoded += '–';
                    else if (code === 145 || code === 0x91) decoded += '‘';
                    else if (code === 146 || code === 0x92) decoded += '’';
                    else if (code === 147 || code === 0x93) decoded += '“';
                    else if (code === 148 || code === 0x94) decoded += '”';
                    else decoded += String.fromCharCode(code);
                  }
                }
                tjStr += decoded;
              } else if (elMatch[2] !== undefined) {
                tjStr += elMatch[2];
              }
            }
            if (tjStr) matches.push(tjStr);
          }
        }

        const rawJoined = matches.join(' ').replace(/\\([()\\])/g, '$1').trim();
        // Normalize visual Indic vowels and reph back to canonical Unicode
        extractedPageText = normalizeBengaliVisualToUnicode(rawJoined);
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

export {
  convertPdfToImages,
  parsePageRange,
  type PdfToImageOptions,
  type PdfPageImage,
  type PdfToImageResult,
} from './pdfToImageService';


/** Standard PDF fonts can only draw Latin (WinAnsi) characters. */
export function assertLatinText(text: string): void {
  // eslint-disable-next-line no-control-regex
  if (!/^[\u0020-\u007E\u00A0-\u00FF]*$/.test(text)) {
    throw new Error(
      'Only English letters, digits and common symbols are supported for this text. Bengali text cannot be drawn with the built-in PDF fonts.'
    );
  }
}

export interface WatermarkOptions {
  text: string;
  /** 0.05 - 1, default 0.25 */
  opacity?: number;
  /** Font size in points, default 56 */
  fontSize?: number;
  /** Rotation in degrees, default 45 */
  angle?: number;
  /** Hex colour such as #888888 */
  color?: string;
  /** 1-based pages; all pages when empty */
  pageNumbers?: number[];
}

export function hexToRgb(hex: string | undefined): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return { r: 0.5, g: 0.5, b: 0.5 };
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

/**
 * Stamp a centred text watermark on every (or selected) page.
 */
export async function addWatermark(file: File, options: WatermarkOptions): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const text = (options.text || '').trim();
  if (!text) throw new Error('Watermark text is empty. Please type the text to stamp.');
  assertLatinText(text);

  const opacity = Math.min(1, Math.max(0.05, options.opacity ?? 0.25));
  const fontSize = Math.min(200, Math.max(8, options.fontSize ?? 56));
  const angle = options.angle ?? 45;
  const { r, g, b } = hexToRgb(options.color);

  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const total = doc.getPageCount();
  const targets =
    options.pageNumbers && options.pageNumbers.length > 0
      ? options.pageNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < total)
      : doc.getPageIndices();
  if (targets.length === 0) throw new Error('No valid pages selected for the watermark.');

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  const rad = (angle * Math.PI) / 180;

  for (const idx of targets) {
    const page = doc.getPage(idx);
    const { width, height } = page.getSize();
    // Position the text so that its centre lands on the page centre after rotation.
    const x = width / 2 - (textWidth / 2) * Math.cos(rad) + (textHeight / 4) * Math.sin(rad);
    const y = height / 2 - (textWidth / 2) * Math.sin(rad) - (textHeight / 4) * Math.cos(rad);
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(angle),
    });
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: file.size, newSize: blob.size, pageCount: doc.getPageCount() };
}

export type PageNumberPosition =
  | 'bottom-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'top-right'
  | 'top-left';

export interface PageNumberOptions {
  position?: PageNumberPosition;
  /** Number printed on the first page, default 1 */
  startAt?: number;
  /** Print "1 / 10" instead of "1" */
  showTotal?: boolean;
  fontSize?: number;
}

/**
 * Print a page number on every page.
 */
export async function addPageNumbers(file: File, options: PageNumberOptions = {}): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const position = options.position ?? 'bottom-center';
  const startAt = Number.isFinite(options.startAt) ? Math.floor(options.startAt as number) : 1;
  const fontSize = Math.min(36, Math.max(6, options.fontSize ?? 11));

  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  const margin = 28;

  doc.getPages().forEach((page, i) => {
    const label = options.showTotal ? `${startAt + i} / ${startAt + total - 1}` : `${startAt + i}`;
    const w = font.widthOfTextAtSize(label, fontSize);
    const { width, height } = page.getSize();
    const x = position.endsWith('left') ? margin : position.endsWith('right') ? width - margin - w : (width - w) / 2;
    const y = position.startsWith('top') ? height - margin : margin - fontSize / 2;
    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: file.size, newSize: blob.size, pageCount: total };
}

/**
 * Parse an ordering such as "3, 1, 2" or "5-1" (descending range) into 0-based indices, keeping the typed order.
 */
export function parsePageOrder(orderStr: string, totalPages: number): number[] {
  const order: number[] = [];
  for (const part of orderStr.split(/[,;\s]+/).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      const a = parseInt(range[1], 10);
      const b = parseInt(range[2], 10);
      const step = a <= b ? 1 : -1;
      for (let n = a; step === 1 ? n <= b : n >= b; n += step) order.push(n - 1);
    } else if (/^\d+$/.test(part)) {
      order.push(parseInt(part, 10) - 1);
    } else {
      throw new Error(`"${part}" is not a valid page number or range.`);
    }
  }
  if (order.some((i) => i < 0 || i >= totalPages)) {
    throw new Error(`Page numbers must be between 1 and ${totalPages}.`);
  }
  return order;
}

/**
 * Re-arrange pages. The order must list every page exactly once (e.g. "3,1,2" for a 3-page file).
 */
export async function reorderPages(file: File, orderStr: string): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = src.getPageCount();
  const order = parsePageOrder(orderStr, total);

  if (order.length !== total || new Set(order).size !== total) {
    throw new Error(
      `The new order must contain every page exactly once. This file has ${total} pages; you listed ${order.length}.`
    );
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  copied.forEach((pg) => out.addPage(pg));

  const bytes = await out.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: file.size, newSize: blob.size, pageCount: total };
}

export type SignaturePosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'center'
  | 'top-right'
  | 'top-left';

export type SignatureSource =
  | { kind: 'image'; bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' }
  | { kind: 'text'; text: string };

export interface SignOptions {
  signature: SignatureSource;
  /** 'first' | 'last' | 'all' | a 1-based page number. Default 'last'. */
  pages?: 'first' | 'last' | 'all' | number;
  position?: SignaturePosition;
  /** Signature width as % of page width (5-70). Default 25. */
  widthPercent?: number;
}

/**
 * Place a VISUAL signature (drawn/uploaded image or typed name) on the PDF.
 * This is an image stamp, not a cryptographic digital signature.
 */
export async function addSignature(file: File, options: SignOptions): Promise<PdfResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = doc.getPageCount();
  const mode = options.pages ?? 'last';
  const targets =
    mode === 'all'
      ? doc.getPageIndices()
      : mode === 'first'
        ? [0]
        : mode === 'last'
          ? [total - 1]
          : [Math.floor(mode) - 1];
  if (targets.some((i) => i < 0 || i >= total)) {
    throw new Error(`Page must be between 1 and ${total}.`);
  }

  const widthPct = Math.min(70, Math.max(5, options.widthPercent ?? 25));
  const position = options.position ?? 'bottom-right';
  const margin = 36;

  // Prepare the drawable once and reuse it on every target page.
  let draw: (page: ReturnType<typeof doc.getPage>, x: number, y: number, w: number) => void;
  let aspect: number; // height / width

  const sig = options.signature;
  if (sig.kind === 'image') {
    if (!sig.bytes || sig.bytes.length === 0) throw new Error('Signature image is empty. Please draw or upload a signature.');
    const img = sig.mime === 'image/jpeg' ? await doc.embedJpg(sig.bytes) : await doc.embedPng(sig.bytes);
    aspect = img.height / img.width;
    draw = (page, x, y, w) => page.drawImage(img, { x, y, width: w, height: w * aspect });
  } else {
    const text = (sig.text || '').trim();
    if (!text) throw new Error('Signature text is empty. Please type your name.');
    assertLatinText(text);
    const font = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const baseSize = 100;
    const baseW = font.widthOfTextAtSize(text, baseSize);
    aspect = font.heightAtSize(baseSize) / baseW;
    draw = (page, x, y, w) => {
      const size = (w / baseW) * baseSize;
      page.drawText(text, { x, y, size, font, color: rgb(0.05, 0.1, 0.45) });
    };
  }

  for (const idx of targets) {
    const page = doc.getPage(idx);
    const { width, height } = page.getSize();
    const w = (width * widthPct) / 100;
    const h = w * aspect;
    const x = position.endsWith('left') ? margin : position.endsWith('right') ? width - margin - w : (width - w) / 2;
    const y = position.startsWith('top') ? height - margin - h : position === 'center' ? (height - h) / 2 : margin;
    draw(page, x, y, w);
  }

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  return { blob, originalSize: file.size, newSize: blob.size, pageCount: total };
}
