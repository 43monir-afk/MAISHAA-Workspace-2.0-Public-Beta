/**
 * MAISHAA WORKSPACE — Phase 3 Step 3C Office Pack Document Generator
 * Real client-side generation for DOCX and PDF deliverables.
 * Strictly adheres to:
 * - Real document synthesis (OpenXML DOCX via JSZip, Vector PDF via pdf-lib)
 * - Zero fake output, zero AI calls, pure client-side processing
 * - Preserves Bangla and English typography
 * - Clean professional layout
 * - Safe output filenames
 * - Source content validation before generation
 * - Explicit NOT SUPPORTED handling for unparseable source files
 * - Selective generation: only generates DOCX if selected, only generates PDF if selected
 */

import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import {
  OfficePackWorkflowPlan,
  OutputFormat,
  NormalizedSourceContent,
  SourceExtractionStatus,
  SupportedSourceType,
  QualityStatus,
  QualityIssue,
  QualityReport,
  BatchSourceItem,
  BatchItemStatus,
  OfficePackType,
  PlannedOutput,
} from '../types/officePack';
import { isSourceFileSupported, buildOfficePackPlan } from './officePackPlanner';
import { sanitizeFilename } from '../utils/fileDetection';
import mammoth from 'mammoth';

export interface SourceValidationResult {
  isValid: boolean;
  isSupported: boolean;
  status: SourceExtractionStatus;
  error?: string;
  extractedText?: string;
  normalized?: NormalizedSourceContent;
}

export interface GeneratedPackFile {
  format: OutputFormat;
  filename: string;
  blob: Blob;
  size: number;
  qualityReport?: QualityReport;
}

export type FormatGenerationStatus = 'Generated' | 'Failed' | 'Not Selected' | 'NOT SUPPORTED';

export interface FormatStatusInfo {
  format: OutputFormat;
  status: FormatGenerationStatus;
  qualityStatus?: QualityStatus;
  qualityReport?: QualityReport;
  filename?: string;
  error?: string;
  size?: number;
}

export interface OfficePackGenerationResult {
  success: boolean;
  packType: string;
  files: GeneratedPackFile[];
  formatStatuses: Record<OutputFormat, FormatStatusInfo>;
  qualityReports?: Record<OutputFormat, QualityReport>;
  unsupportedNotice?: string;
  error?: string;
  isPartialSuccess?: boolean;
}

/**
 * Sanitize and create safe, standardized filenames for office pack deliverables.
 */
export function generateOfficePackFilename(
  sourceFilename: string,
  packType: string,
  format: 'docx' | 'pdf' | 'xlsx' | 'pptx'
): string {
  const cleanBase = sanitizeFilename(sourceFilename, 'document')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);

  const cleanPack = packType.replace(/[^a-zA-Z0-9_-]/g, '_');
  const suffix =
    format === 'docx'
      ? 'report'
      : format === 'xlsx'
      ? 'dataset'
      : format === 'pptx'
      ? 'presentation'
      : 'summary';

  return `${cleanBase}_${cleanPack}_${suffix}.${format}`;
}

/**
 * Generate a safe filename for the consolidated ZIP bundle deliverable.
 */
export function generateOfficePackZipFilename(
  sourceFilename: string,
  packType: string
): string {
  const cleanBase = sanitizeFilename(sourceFilename, 'document')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);

  const cleanPack = packType.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanBase}_${cleanPack}_bundle.zip`;
}

/**
 * Parse RFC 4180 compliant CSV text into structured 2D table rows.
 * Preserves quotes, commas, Bangla, and English Unicode characters safely.
 */
export function parseCsvText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c !== '')) rows.push(currentRow);
  }

  return rows;
}

/**
 * Extract embedded text from a PDF binary stream safely.
 * Detects whether the PDF is a text-based document or scanned/image-only.
 * Returns text and scanned classification.
 */
export async function extractPdfTextFromBuffer(
  arrayBuffer: ArrayBuffer
): Promise<{ text: string; isScanned: boolean }> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();
  if (totalPages === 0) return { text: '', isScanned: true };

  const pageTexts: string[] = [];
  let scannedPages = 0;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    let pageText = '';

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
          const rawBytes: Uint8Array = sObj?.getContents?.();
          if (rawBytes && rawBytes.length > 0) {
            let decompressed = '';
            try {
              const zlib = await import('node:zlib');
              decompressed = zlib.inflateSync(Buffer.from(rawBytes as any)).toString('utf-8');
            } catch {
              try {
                decompressed = new TextDecoder('utf-8').decode(rawBytes);
              } catch {
                decompressed = '';
              }
            }
            if (decompressed) streamData += ' ' + decompressed;
          }
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
            matches.push(innerMatches.map((m) => m.slice(1, -1)).join(''));
          }
        }
        // Match hex strings <...> before Tj or inside TJ
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

        pageText = matches.join(' ').replace(/\\([()\\])/g, '$1').trim();
      }
    } catch (_) {}

    const words = pageText.split(/\s+/).filter(Boolean).length;
    if (words < 2) {
      scannedPages++;
    }
    pageTexts.push(pageText);
  }

  const fullText = pageTexts.filter(Boolean).join('\n\n').trim();
  const isScanned = scannedPages === totalPages || fullText.length === 0;
  return { text: fullText, isScanned };
}

/**
 * Validate source file and extract readable content into a normalized source structure.
 * Supports: TXT, MD, CSV, DOCX, and text-based PDF.
 * Rejects empty files (EMPTY), unsupported formats (NOT SUPPORTED),
 * and scanned/image-only PDFs (NOT SUPPORTED).
 */
export async function validateAndExtractSourceContent(
  file: File | { name: string; size: number; textContent?: string; isScanned?: boolean; arrayBuffer?: () => Promise<ArrayBuffer> }
): Promise<SourceValidationResult> {
  const rawFilename = file?.name || 'document';
  const filename = sanitizeFilename(rawFilename, 'document');

  // 1. Detect extension and supported source type
  const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1] : '';

  let sourceType: SupportedSourceType = 'unsupported';
  if (ext === 'txt') sourceType = 'txt';
  else if (ext === 'md') sourceType = 'md';
  else if (ext === 'csv') sourceType = 'csv';
  else if (ext === 'docx') sourceType = 'docx';
  else if (ext === 'pdf') sourceType = 'pdf';

  const createEmptyResult = (st: SupportedSourceType, msg = 'Source file is empty (0 bytes).'): SourceValidationResult => ({
    isValid: false,
    isSupported: true,
    status: 'EMPTY',
    error: msg,
    normalized: {
      title: filename.replace(/\.[^.]+$/, ''),
      plainText: '',
      paragraphs: [],
      headings: [],
      rows: [],
      sourceType: st,
      sourceFileName: filename,
      extractionStatus: 'EMPTY',
      charCount: 0,
      paragraphCount: 0,
      error: msg,
    },
  });

  const createUnsupportedResult = (reason: string): SourceValidationResult => ({
    isValid: false,
    isSupported: false,
    status: 'NOT SUPPORTED',
    error: reason,
    normalized: {
      title: filename.replace(/\.[^.]+$/, ''),
      plainText: '',
      paragraphs: [],
      headings: [],
      rows: [],
      sourceType: 'unsupported',
      sourceFileName: filename,
      extractionStatus: 'NOT SUPPORTED',
      charCount: 0,
      paragraphCount: 0,
      error: reason,
    },
  });

  const createFailedResult = (st: SupportedSourceType, reason: string): SourceValidationResult => ({
    isValid: false,
    isSupported: true,
    status: 'EXTRACTION FAILED',
    error: reason,
    normalized: {
      title: filename.replace(/\.[^.]+$/, ''),
      plainText: '',
      paragraphs: [],
      headings: [],
      rows: [],
      sourceType: st,
      sourceFileName: filename,
      extractionStatus: 'EXTRACTION FAILED',
      charCount: 0,
      paragraphCount: 0,
      error: reason,
    },
  });

  // Check supported source format
  if (sourceType === 'unsupported') {
    return createUnsupportedResult(
      `NOT SUPPORTED: Format '.${ext || 'unknown'}' cannot be parsed by local office extraction engine. Supported formats: TXT, MD, CSV, DOCX, and PDF.`
    );
  }

  // Check 0 byte file
  if (file.size === 0) {
    return createEmptyResult(sourceType);
  }

  try {
    // 2. TXT & MD extraction
    if (sourceType === 'txt' || sourceType === 'md') {
      let rawText = '';
      if ('textContent' in file && typeof file.textContent === 'string') {
        rawText = file.textContent;
      } else if (file instanceof File || typeof (file as any).text === 'function') {
        rawText = await (file as any).text();
      }

      const plainText = rawText.trim();
      if (!plainText) {
        return createEmptyResult(sourceType, 'Source file contains only empty or whitespace characters.');
      }

      const paragraphs = plainText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
      const headings: string[] = [];
      const rows: string[][] = [];

      paragraphs.forEach((p) => {
        if (/^(Project\s+Title|Title|শিরোনাম|প্রকল্পের\s+শিরোনাম):/i.test(p)) {
          headings.push(p);
        } else if (p.startsWith('#')) {
          headings.push(p.replace(/^#+\s*/, '').trim());
        } else if (/^(\d+|[১-৯]+)[\.\)]\s+/.test(p)) {
          headings.push(p);
        } else if (p.length < 50 && p.endsWith(':')) {
          headings.push(p.replace(/:$/, '').trim());
        }

        if (p.includes('|')) {
          const cells = p.split('|').map((c) => c.trim()).filter((c) => c !== '' && !c.match(/^-+$/));
          if (cells.length > 1) rows.push(cells);
        } else if (p.includes('\t')) {
          rows.push(p.split('\t').map((c) => c.trim()));
        } else if (p.includes(':') && p.indexOf(':') < 40) {
          const k = p.substring(0, p.indexOf(':')).trim();
          const v = p.substring(p.indexOf(':') + 1).trim();
          if (k && v) rows.push([k, v]);
        }
      });

      const title = headings[0] || paragraphs[0]?.slice(0, 60) || filename.replace(/\.[^.]+$/, '');
      const normalized: NormalizedSourceContent = {
        title,
        plainText,
        paragraphs,
        headings,
        rows,
        sourceType,
        sourceFileName: filename,
        extractionStatus: 'READY',
        charCount: plainText.length,
        paragraphCount: paragraphs.length,
      };

      return {
        isValid: true,
        isSupported: true,
        status: 'READY',
        extractedText: plainText,
        normalized,
      };
    }

    // 3. CSV extraction
    if (sourceType === 'csv') {
      let rawCsv = '';
      if ('textContent' in file && typeof file.textContent === 'string') {
        rawCsv = file.textContent;
      } else if (file instanceof File || typeof (file as any).text === 'function') {
        rawCsv = await (file as any).text();
      }

      const trimmedCsv = rawCsv.trim();
      if (!trimmedCsv) {
        return createEmptyResult('csv', 'CSV file contains no rows or content.');
      }

      const parsedRows = parseCsvText(trimmedCsv);
      if (parsedRows.length === 0) {
        return createEmptyResult('csv', 'CSV file could not be parsed into tabular rows.');
      }

      const headings = parsedRows[0] || [];
      const paragraphs = parsedRows.map((r, idx) => {
        if (idx === 0) return `Header: ${r.join(' | ')}`;
        return r.map((val, cIdx) => (headings[cIdx] ? `${headings[cIdx]}: ${val}` : val)).join(', ');
      });

      const plainText = parsedRows.map((r) => r.join(' | ')).join('\n');
      const title = filename.replace(/\.[^.]+$/, '');

      const normalized: NormalizedSourceContent = {
        title,
        plainText,
        paragraphs,
        headings,
        rows: parsedRows,
        sourceType: 'csv',
        sourceFileName: filename,
        extractionStatus: 'READY',
        charCount: plainText.length,
        paragraphCount: paragraphs.length,
      };

      return {
        isValid: true,
        isSupported: true,
        status: 'READY',
        extractedText: plainText,
        normalized,
      };
    }

    // 4. DOCX extraction
    if (sourceType === 'docx') {
      let rawText = '';
      if ('textContent' in file && typeof file.textContent === 'string') {
        rawText = file.textContent;
      } else {
        try {
          let arrayBuffer: ArrayBuffer;
          if (file instanceof File || typeof (file as any).arrayBuffer === 'function') {
            arrayBuffer = await (file as any).arrayBuffer();
          } else {
            return createFailedResult('docx', 'EXTRACTION FAILED: No binary buffer available for Word document.');
          }

          // Verify OpenXML zip signature
          let zip: JSZip;
          try {
            zip = await JSZip.loadAsync(arrayBuffer);
            if (!zip.file('word/document.xml') && !zip.file('[Content_Types].xml')) {
              return createFailedResult('docx', 'EXTRACTION FAILED: The file is not a valid Microsoft Word OpenXML (.docx) package.');
            }
          } catch (zipErr: any) {
            return createFailedResult('docx', `EXTRACTION FAILED: Corrupted Word document archive (${zipErr.message || 'unreadable'}).`);
          }

          try {
            const mammothOptions = typeof Buffer !== 'undefined'
              ? { buffer: Buffer.from(arrayBuffer) }
              : { arrayBuffer };
            const mammothRes = await mammoth.extractRawText(mammothOptions);
            rawText = mammothRes.value || '';
          } catch {
            // Direct OpenXML fallback
            const docXml = await zip.file('word/document.xml')?.async('string');
            if (docXml) {
              const paragraphs: string[] = [];
              const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
              let pMatch: RegExpExecArray | null;
              while ((pMatch = pRegex.exec(docXml)) !== null) {
                let paraText = '';
                const elemRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
                let elemMatch: RegExpExecArray | null;
                while ((elemMatch = elemRegex.exec(pMatch[1])) !== null) {
                  if (elemMatch[1] !== undefined) {
                    paraText += elemMatch[1]
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&apos;/g, "'");
                  } else if (elemMatch[0] === '<w:tab/>') {
                    paraText += '\t';
                  } else if (elemMatch[0] === '<w:br/>') {
                    paraText += '\n';
                  }
                }
                const trimmed = paraText.trim();
                if (trimmed) paragraphs.push(trimmed);
              }
              rawText = paragraphs.join('\n\n');
            }
          }
        } catch (mErr: any) {
          return createFailedResult('docx', `EXTRACTION FAILED: Could not parse Word document (${mErr.message || 'error'}).`);
        }
      }

      const plainText = rawText.trim();
      if (!plainText) {
        return createEmptyResult('docx', 'Word document contains no extractable text.');
      }

      const paragraphs = plainText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
      const headings: string[] = [];
      paragraphs.forEach((p) => {
        if (/^(\d+|[১-৯]+)[\.\)]\s+/.test(p) || (p.length < 50 && p.endsWith(':'))) {
          headings.push(p.replace(/:$/, '').trim());
        }
      });

      const title = headings[0] || paragraphs[0]?.slice(0, 60) || filename.replace(/\.[^.]+$/, '');
      const normalized: NormalizedSourceContent = {
        title,
        plainText,
        paragraphs,
        headings,
        rows: [],
        sourceType: 'docx',
        sourceFileName: filename,
        extractionStatus: 'READY',
        charCount: plainText.length,
        paragraphCount: paragraphs.length,
      };

      return {
        isValid: true,
        isSupported: true,
        status: 'READY',
        extractedText: plainText,
        normalized,
      };
    }

    // 5. PDF extraction
    if (sourceType === 'pdf') {
      if ((file as any).isScanned || (file as any).textContent === '[SCANNED_IMAGE_ONLY]') {
        return createUnsupportedResult(
          'NOT SUPPORTED: PDF appears to be scanned or image-only with no selectable text. OCR is not supported in this milestone.'
        );
      }

      let plainText = '';
      if ('textContent' in file && typeof file.textContent === 'string') {
        plainText = file.textContent.trim();
      } else {
        try {
          let arrayBuffer: ArrayBuffer;
          if (file instanceof File || typeof (file as any).arrayBuffer === 'function') {
            arrayBuffer = await (file as any).arrayBuffer();
          } else {
            return createFailedResult('pdf', 'EXTRACTION FAILED: No binary buffer available for PDF document.');
          }

          let extracted: { text: string; isScanned: boolean };
          try {
            extracted = await extractPdfTextFromBuffer(arrayBuffer);
          } catch (pdfErr: any) {
            return createFailedResult('pdf', `EXTRACTION FAILED: Corrupted or unreadable PDF document (${pdfErr.message}).`);
          }

          if (extracted.isScanned || !extracted.text.trim()) {
            return createUnsupportedResult(
              'NOT SUPPORTED: PDF appears to be scanned or image-only with no selectable text. OCR is not supported in this milestone.'
            );
          }

          plainText = extracted.text.trim();
        } catch (err: any) {
          return createFailedResult('pdf', `EXTRACTION FAILED: ${err.message || 'Failed to extract text from PDF.'}`);
        }
      }

      if (!plainText) {
        return createEmptyResult('pdf', 'PDF document contains no extractable text.');
      }

      const paragraphs = plainText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
      const headings: string[] = [];
      paragraphs.forEach((p) => {
        if (/^(\d+|[১-৯]+)[\.\)]\s+/.test(p) || (p.length < 50 && p.endsWith(':'))) {
          headings.push(p.replace(/:$/, '').trim());
        }
      });

      const title = headings[0] || paragraphs[0]?.slice(0, 60) || filename.replace(/\.[^.]+$/, '');
      const normalized: NormalizedSourceContent = {
        title,
        plainText,
        paragraphs,
        headings,
        rows: [],
        sourceType: 'pdf',
        sourceFileName: filename,
        extractionStatus: 'READY',
        charCount: plainText.length,
        paragraphCount: paragraphs.length,
      };

      return {
        isValid: true,
        isSupported: true,
        status: 'READY',
        extractedText: plainText,
        normalized,
      };
    }

    return createUnsupportedResult('NOT SUPPORTED: Unrecognized file type.');
  } catch (err: any) {
    return createFailedResult(sourceType, `EXTRACTION FAILED: ${err.message || 'Unexpected extraction failure'}`);
  }
}

/**
 * Escape XML special characters for safe OpenXML embedding.
 */
function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a real, well-formatted Microsoft Word DOCX document using JSZip.
 * Preserves Bangla and English fonts with SolaimanLipi/Calibri fallback.
 */
export async function generateOfficePackDocx(
  plan: OfficePackWorkflowPlan,
  sourceText: string,
  language: 'bn' | 'en' = 'en'
): Promise<Blob> {
  const zip = new JSZip();

  const title = language === 'bn' ? plan.packNameBn : plan.packName;
  const dateStr = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Split source text into clean paragraphs
  const paragraphs = (sourceText || 'No source content available.')
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const paragraphXml = paragraphs
    .map((p) => {
      const esc = escapeXml(p);
      return `
        <w:p>
          <w:pPr>
            <w:spacing w:before="80" w:after="80" w:line="276" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="SolaimanLipi"/>
              <w:sz w:val="22"/>
              <w:color w:val="1E293B"/>
            </w:rPr>
            <w:t xml:space="preserve">${esc}</w:t>
          </w:r>
        </w:p>`;
    })
    .join('');

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/document.xml
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Document Header Banner -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="120" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="SolaimanLipi"/>
          <w:b/>
          <w:sz w:val="36"/>
          <w:color w:val="0D9488"/>
        </w:rPr>
        <w:t>MAISHAA WORKSPACE</w:t>
      </w:r>
    </w:p>

    <!-- Subtitle -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="0" w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="SolaimanLipi"/>
          <w:sz w:val="20"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(title)} — Office Pack Report</w:t>
      </w:r>
    </w:p>

    <!-- Metadata Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>

      <!-- Row 1: Source File -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="475569"/></w:rPr><w:t>Source File</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(plan.sourceFileName)}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 2: Pack Type -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="475569"/></w:rPr><w:t>Pack Configuration</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(title)} (${plan.packType})</w:t></w:r></w:p>
        </w:tc>
      </w:tr>

      <!-- Row 3: Generated Date -->
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="475569"/></w:rPr><w:t>Generated On</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>
          <w:p><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="1E293B"/></w:rPr><w:t>${escapeXml(dateStr)}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Section Heading -->
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="80"/></w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="SolaimanLipi"/>
          <w:b/>
          <w:sz w:val="26"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>${language === 'bn' ? 'নথি বিবরণ ও কনটেন্ট' : 'Document Content & Overview'}</w:t>
      </w:r>
    </w:p>

    <!-- Body paragraphs -->
    ${paragraphXml}

    <!-- Footer Note -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="300" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="SolaimanLipi"/>
          <w:sz w:val="18"/>
          <w:color w:val="94A3B8"/>
        </w:rPr>
        <w:t>Generated locally by MAISHAA WORKSPACE • Client-Side Privacy Sandbox</w:t>
      </w:r>
    </w:p>

    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Converts any string to a clean, safe WinAnsi string for pdf-lib's standard fonts.
 * Guarantees that characters outside the WinAnsi code page (like Bengali Unicode) do not crash pdf-lib.
 */
export function toPdfSafeWinAnsi(text: string, fallback: string = ''): string {
  if (!text) return fallback;
  const filtered = text
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
        return ch;
      }
      return '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return filtered || fallback;
}

/**
 * Generate a real, clean vector PDF document using pdf-lib.
 * Handles pagination, header branding, clean typography, and safe WinAnsi encoding.
 * In browser: uses high-DPI canvas when available for Bengali shaping.
 * In vector/headless: generates clean PDF structure with safe encoding.
 */
export async function generateOfficePackPdf(
  plan: OfficePackWorkflowPlan,
  sourceText: string,
  language: 'bn' | 'en' = 'en'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Check if browser HTML5 Canvas 2D is available for high-DPI rendering
  let canvasContextAvailable = false;
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  if (typeof document !== 'undefined') {
    try {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
      canvasContextAvailable = !!ctx;
    } catch {
      canvasContextAvailable = false;
    }
  }

  const title = plan.packName || 'Office Pack';
  const displayTitle = language === 'bn' ? (plan.packNameBn || plan.packName) : plan.packName;
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (canvasContextAvailable && canvas && ctx) {
    // Browser High-DPI Canvas 2D pipeline (preserves Bengali font shaping SolaimanLipi/Kalpurush)
    const width = 1240;
    const height = 1754;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Header Banner
    ctx.fillStyle = '#0F2942';
    ctx.fillRect(0, 0, width, 140);
    ctx.fillStyle = '#0D9488';
    ctx.fillRect(0, 140, width, 8);

    ctx.font = 'bold 22px SolaimanLipi, Kalpurush, Arial, sans-serif';
    ctx.fillStyle = '#14B8A6';
    ctx.fillText('MAISHAA WORKSPACE • ONE-CLICK OFFICE PACK', 60, 50);

    ctx.font = 'bold 32px SolaimanLipi, Kalpurush, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${displayTitle} — Summary`, 60, 100);

    // Metadata Card
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(60, 170, width - 120, 60);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(60, 170, width - 120, 60);

    ctx.font = 'bold 18px SolaimanLipi, Kalpurush, Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`Source: ${plan.sourceFileName}`, 80, 205);
    ctx.font = '16px SolaimanLipi, Kalpurush, Arial, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`Outputs: ${plan.selectedFormats.join(', ').toUpperCase()}`, 80, 222);

    // Text content lines
    ctx.font = '18px SolaimanLipi, Kalpurush, Arial, sans-serif';
    ctx.fillStyle = '#1E293B';
    let textY = 270;
    const paras = (sourceText || 'No source content.').split(/\r?\n/).slice(0, 45);
    for (const p of paras) {
      if (textY < height - 60) {
        ctx.fillText(p.substring(0, 85), 60, textY);
        textY += 30;
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const pngBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      pngBytes[i] = binaryStr.charCodeAt(i);
    }

    const page = pdfDoc.addPage([595.28, 841.89]);
    const embeddedImage = await pdfDoc.embedPng(pngBytes);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
    });

    return await pdfDoc.save();
  }

  // Vector / Standard PDF generation
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Helper for drawing header banner
  const drawPageHeader = (p: any, pageNum: number) => {
    p.drawRectangle({
      x: margin,
      y: pageHeight - margin - 3,
      width: contentWidth,
      height: 3,
      color: rgb(0.05, 0.58, 0.53),
    });

    p.drawText('MAISHAA WORKSPACE', {
      x: margin,
      y: pageHeight - margin - 18,
      size: 11,
      font: fontBold,
      color: rgb(0.05, 0.58, 0.53),
    });

    const sub = `${title} • Office Pack Summary`;
    p.drawText(sub.substring(0, 60), {
      x: margin + 140,
      y: pageHeight - margin - 18,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.53),
    });

    p.drawText(dateStr, {
      x: pageWidth - margin - 70,
      y: pageHeight - margin - 18,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.53),
    });

    p.drawLine({
      start: { x: margin, y: pageHeight - margin - 26 },
      end: { x: pageWidth - margin, y: pageHeight - margin - 26 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });
  };

  // Helper for drawing footer
  const drawPageFooter = (p: any, pageNum: number) => {
    p.drawLine({
      start: { x: margin, y: margin + 16 },
      end: { x: pageWidth - margin, y: margin + 16 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    p.drawText('Generated by MAISHAA WORKSPACE • Client-Side Document Intelligence', {
      x: margin,
      y: margin + 4,
      size: 8,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.68),
    });

    const pageNotice = `Page ${pageNum}`;
    p.drawText(pageNotice, {
      x: pageWidth - margin - 40,
      y: margin + 4,
      size: 8,
      font: fontRegular,
      color: rgb(0.55, 0.6, 0.68),
    });
  };

  let pageIndex = 1;
  drawPageHeader(page, pageIndex);
  currentY = pageHeight - margin - 45;

  // Metadata Card on First Page
  page.drawRectangle({
    x: margin,
    y: currentY - 55,
    width: contentWidth,
    height: 55,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  const safeFileName = toPdfSafeWinAnsi(plan.sourceFileName, 'source_document');
  page.drawText(`Source Document: ${safeFileName}`, {
    x: margin + 14,
    y: currentY - 18,
    size: 9.5,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText(`Pack Type: ${title} (${plan.packType})`, {
    x: margin + 14,
    y: currentY - 32,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.42),
  });

  page.drawText(`Outputs Configured: ${plan.selectedFormats.join(', ').toUpperCase()}`, {
    x: margin + 14,
    y: currentY - 46,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.52),
  });

  currentY -= 75;

  // Text splitting and wrapping logic with safe WinAnsi output
  const paragraphs = (sourceText || 'No source content.')
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const lineHeight = 14;
  const maxCharsPerLine = 85;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxCharsPerLine) {
        if (currentY <= margin + 35) {
          drawPageFooter(page, pageIndex);
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          pageIndex++;
          drawPageHeader(page, pageIndex);
          currentY = pageHeight - margin - 45;
        }

        const safeLine = toPdfSafeWinAnsi(currentLine, '[Unicode content preserved in DOCX report]');
        page.drawText(safeLine, {
          x: margin,
          y: currentY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.12, 0.16, 0.23),
        });
        currentY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (currentY <= margin + 35) {
        drawPageFooter(page, pageIndex);
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageIndex++;
        drawPageHeader(page, pageIndex);
        currentY = pageHeight - margin - 45;
      }

      const safeLine = toPdfSafeWinAnsi(currentLine, '[Unicode content preserved in DOCX report]');
      page.drawText(safeLine, {
        x: margin,
        y: currentY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.12, 0.16, 0.23),
      });
      currentY -= lineHeight + 6;
    }
  }

  drawPageFooter(page, pageIndex);
  return await pdfDoc.save();
}

/**
 * Safely computes auto-sized column widths for tabular rows.
 */
export function autoSizeColumns(rows: any[][]): Array<{ wch: number }> {
  const maxLens: number[] = [];
  rows.forEach((row) => {
    row.forEach((cell, colIdx) => {
      const str = cell !== null && cell !== undefined ? String(cell) : '';
      const len = Math.min(Math.max(str.length + 3, 14), 60);
      maxLens[colIdx] = Math.max(maxLens[colIdx] || 14, len);
    });
  });
  return maxLens.map((w) => ({ wch: w }));
}

/**
 * Generate a real, well-formatted Microsoft Excel XLSX workbook using SheetJS.
 * Preserves Bangla and English text cleanly with UTF-8 encoding.
 * Creates meaningful sheet names, auto-sizes columns safely, and formats
 * headings, structured rows, simple tables, and plain text.
 */
export async function generateOfficePackXlsx(
  plan: OfficePackWorkflowPlan,
  sourceText: string,
  language: 'bn' | 'en' = 'en'
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  const title = language === 'bn' ? plan.packNameBn : plan.packName;
  const dateStr = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sheet 1: Overview & Executive Summary
  const overviewRows: (string | number)[][] = [
    ['MAISHAA WORKSPACE', 'ONE-CLICK OFFICE PACK WORKBOOK'],
    ['Pack Configuration:', `${title} (${plan.packType})`],
    ['Source File:', plan.sourceFileName],
    ['Generated On:', dateStr],
    ['Configured Outputs:', plan.selectedFormats.join(', ').toUpperCase()],
    ['Local Privacy Sandbox:', 'All operations computed client-side. Zero telemetry.'],
    [], // empty spacer
    ['Executive Overview & Document Content'],
    [],
  ];

  // Parse lines from sourceText
  const rawLines = (sourceText || 'No source content available.')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  rawLines.forEach((line, idx) => {
    // Check for Markdown table or delimited data
    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c !== '' && !c.match(/^-+$/));
      if (cells.length > 0) {
        overviewRows.push(cells);
        return;
      }
    }

    // Check for tab delimited data
    if (line.includes('\t')) {
      overviewRows.push(line.split('\t').map((c) => c.trim()));
      return;
    }

    // Check for key-value pair (e.g. "Key: Value" or "১. শিরোনাম: ...")
    const colonIdx = line.indexOf(':');
    if (colonIdx > 1 && colonIdx < 40) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      overviewRows.push([key, val]);
      return;
    }

    overviewRows.push([idx + 1, line]);
  });

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  wsOverview['!cols'] = autoSizeColumns(overviewRows);

  // Add Sheet 1: Meaningful Sheet Name
  const sheet1Name = language === 'bn' ? 'সারসংক্ষেপ' : 'Overview';
  XLSX.utils.book_append_sheet(wb, wsOverview, sheet1Name);

  // Sheet 2: Structured Data Records
  const tableRows: (string | number)[][] = [
    language === 'bn'
      ? ['ক্রমিক', 'বিভাগ / ফিল্ড', 'বিবরণ / মান', 'স্ট্যাটাস / মন্তব্য']
      : ['Item #', 'Section / Field', 'Description / Value', 'Status / Notes'],
  ];

  rawLines.forEach((line, idx) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 1 && colonIdx < 40) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      tableRows.push([idx + 1, key, val, 'Active']);
    } else {
      tableRows.push([
        idx + 1,
        language === 'bn' ? `সেকশন ${idx + 1}` : `Section ${idx + 1}`,
        line,
        'Recorded',
      ]);
    }
  });

  const wsTable = XLSX.utils.aoa_to_sheet(tableRows);
  wsTable['!cols'] = autoSizeColumns(tableRows);

  // Add Sheet 2: Meaningful Sheet Name
  const sheet2Name = language === 'bn' ? 'উপাত্ত_রেকর্ড' : 'Data_Records';
  XLSX.utils.book_append_sheet(wb, wsTable, sheet2Name);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate a real, editable Microsoft PowerPoint OpenXML (.pptx) presentation.
 * Uses PptxGenJS to generate presentation slides with:
 * - Real editable text and shapes (never screenshots/images)
 * - 16:9 widescreen layout
 * - Dedicated title slide
 * - Safe splitting of long content across multiple slides
 * - Heading and section hierarchy preservation
 * - Tables and key-value card structures
 * - Bangla and English Unicode text preservation
 */
export async function generateOfficePackPptx(
  plan: OfficePackWorkflowPlan,
  sourceText: string,
  language: 'bn' | 'en' = 'en'
): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = `${plan.packName} Presentation`;
  pptx.author = 'MAISHAA WORKSPACE';
  pptx.company = 'MAISHAA Document Intelligence';

  const fontFace = 'Arial, Calibri, SolaimanLipi, Kalpurush, sans-serif';
  const displayTitle = language === 'bn' ? (plan.packNameBn || plan.packName) : plan.packName;
  const dateStr = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 1. Title Slide (Deep Navy / Teal Luxury Theme)
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '0F172A' };

  // Top accent bar
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.1,
    fill: { color: '0D9488' },
    line: { color: '0D9488', width: 0 },
  });

  titleSlide.addText('MAISHAA WORKSPACE • ONE-CLICK OFFICE PACK', {
    x: 0.8,
    y: 1.1,
    w: 8.4,
    h: 0.4,
    fontSize: 12,
    fontFace,
    color: '14B8A6',
    bold: true,
  });

  titleSlide.addText(displayTitle, {
    x: 0.8,
    y: 1.6,
    w: 8.4,
    h: 1.3,
    fontSize: 32,
    fontFace,
    color: 'FFFFFF',
    bold: true,
  });

  titleSlide.addText(
    `${language === 'bn' ? 'উৎস নথি:' : 'Source Document:'} ${plan.sourceFileName}\n${
      language === 'bn' ? 'প্রস্তুতকরণ তারিখ:' : 'Generated Date:'
    } ${dateStr} • ${language === 'bn' ? 'ফরম্যাট:' : 'Outputs:'} ${plan.selectedFormats.join(', ').toUpperCase()}`,
    {
      x: 0.8,
      y: 3.1,
      w: 8.4,
      h: 0.9,
      fontSize: 14,
      fontFace,
      color: '94A3B8',
    }
  );

  titleSlide.addText(
    'Local Privacy Sandbox • Client-Side Document Intelligence • Zero Telemetry',
    {
      x: 0.8,
      y: 4.6,
      w: 8.4,
      h: 0.4,
      fontSize: 11,
      fontFace,
      color: '64748B',
    }
  );

  // 2. Parse Source Text into Structured Sections
  const rawLines = (sourceText || 'No source content available.')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  interface ContentSection {
    title: string;
    items: string[];
    tableRows?: string[][];
  }

  const sections: ContentSection[] = [];
  let currentSection: ContentSection = {
    title: language === 'bn' ? 'নির্বাহী সারসংক্ষেপ' : 'Executive Overview',
    items: [],
  };

  const isHeadingLine = (line: string): boolean => {
    if (line.startsWith('#')) return true;
    if (/^(\d+|[১-৯]+)[\.\)]\s+/.test(line)) return true;
    if (line.length < 45 && line.endsWith(':')) return true;
    return false;
  };

  const cleanHeadingText = (line: string): string => {
    return line
      .replace(/^#+\s*/, '')
      .replace(/:$/, '')
      .trim();
  };

  for (const line of rawLines) {
    if (isHeadingLine(line)) {
      if (currentSection.items.length > 0 || (currentSection.tableRows && currentSection.tableRows.length > 0)) {
        sections.push(currentSection);
      }
      currentSection = {
        title: cleanHeadingText(line),
        items: [],
      };
      continue;
    }

    // Markdown table row
    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c !== '' && !c.match(/^-+$/));
      if (cells.length > 1) {
        if (!currentSection.tableRows) currentSection.tableRows = [];
        currentSection.tableRows.push(cells);
        continue;
      }
    }

    currentSection.items.push(line);
  }

  if (currentSection.items.length > 0 || (currentSection.tableRows && currentSection.tableRows.length > 0)) {
    sections.push(currentSection);
  }

  // If no sections were identified, put raw lines into the default section
  if (sections.length === 0) {
    sections.push({
      title: language === 'bn' ? 'নথি বিবরণ' : 'Document Details',
      items: rawLines.length > 0 ? rawLines : ['No content available.'],
    });
  }

  // 3. Build Content Slides with Safe Splitting (max 4 items per slide)
  const MAX_ITEMS_PER_SLIDE = 4;

  const addHeaderAndFooter = (slide: any, slideTitleText: string, pageNum: number) => {
    slide.background = { color: 'F8FAFC' };

    // Top accent bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.1,
      fill: { color: '0D9488' },
      line: { color: '0D9488', width: 0 },
    });

    // Subtitle / category
    slide.addText(`MAISHAA WORKSPACE • ${displayTitle.toUpperCase()}`, {
      x: 0.8,
      y: 0.35,
      w: 8.4,
      h: 0.3,
      fontSize: 10,
      fontFace,
      color: '0D9488',
      bold: true,
    });

    // Slide Title
    slide.addText(slideTitleText, {
      x: 0.8,
      y: 0.7,
      w: 8.4,
      h: 0.55,
      fontSize: 22,
      fontFace,
      color: '0F172A',
      bold: true,
    });

    // Divider
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: 1.35,
      w: 8.4,
      h: 0,
      line: { color: 'E2E8F0', width: 1 },
    });

    // Footer
    slide.addShape(pptx.ShapeType.line, {
      x: 0.8,
      y: 5.1,
      w: 8.4,
      h: 0,
      line: { color: 'E2E8F0', width: 0.5 },
    });

    slide.addText('Generated by MAISHAA WORKSPACE • Client-Side Document Intelligence', {
      x: 0.8,
      y: 5.2,
      w: 6.0,
      h: 0.3,
      fontSize: 9,
      fontFace,
      color: '94A3B8',
    });

    slide.addText(`${pageNum}`, {
      x: 8.4,
      y: 5.2,
      w: 0.8,
      h: 0.3,
      fontSize: 9,
      fontFace,
      color: '94A3B8',
      align: 'right',
    });
  };

  let slideCounter = 2;

  for (const section of sections) {
    // If section has table rows
    if (section.tableRows && section.tableRows.length > 0) {
      const slide = pptx.addSlide();
      addHeaderAndFooter(slide, section.title, slideCounter++);

      const formattedTable = section.tableRows.map((row, rIdx) =>
        row.map((cell) => ({
          text: cell,
          options: {
            fill: rIdx === 0 ? '0F2942' : rIdx % 2 === 0 ? 'FFFFFF' : 'F1F5F9',
            color: rIdx === 0 ? 'FFFFFF' : '1E293B',
            fontFace,
            fontSize: rIdx === 0 ? 12 : 11,
            bold: rIdx === 0,
          },
        }))
      );

      slide.addTable(formattedTable as any, {
        x: 0.8,
        y: 1.6,
        w: 8.4,
        colW: Array(section.tableRows[0].length).fill(8.4 / section.tableRows[0].length),
        border: { pt: 0.5, color: 'CBD5E1' },
      });
    }

    // Split items safely across multiple slides if content is long
    const items = section.items;
    if (items.length === 0 && (!section.tableRows || section.tableRows.length === 0)) {
      items.push('No additional details provided.');
    }

    for (let i = 0; i < items.length; i += MAX_ITEMS_PER_SLIDE) {
      const chunk = items.slice(i, i + MAX_ITEMS_PER_SLIDE);
      const isMultiPart = items.length > MAX_ITEMS_PER_SLIDE;
      const partNum = Math.floor(i / MAX_ITEMS_PER_SLIDE) + 1;
      const slideTitle = isMultiPart
        ? `${section.title} (${language === 'bn' ? `পর্ব ${partNum}` : `Part ${partNum}`})`
        : section.title;

      const slide = pptx.addSlide();
      addHeaderAndFooter(slide, slideTitle, slideCounter++);

      const textObjects = chunk.map((item) => ({
        text: item,
        options: {
          bullet: true,
          breakLine: true,
          fontSize: 14,
          fontFace,
          color: '334155',
          paraSpaceAfter: 12,
        },
      }));

      slide.addText(textObjects as any, {
        x: 0.8,
        y: 1.6,
        w: 8.4,
        h: 3.3,
        valign: 'top',
      });
    }
  }

  // Generate presentation ArrayBuffer / Blob
  const buffer = await pptx.write({ outputType: 'arraybuffer' });
  return new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

/**
 * Quality validation for DOCX deliverables.
 */
export async function validateDocxQuality(
  blob: Blob,
  filename: string,
  sourceText: string
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];
  const checksPassed: string[] = [];

  // Check 1: Filename validation
  if (!filename.endsWith('.docx')) {
    issues.push({ code: 'INVALID_EXTENSION', message: 'Filename does not end with .docx', severity: 'FAILED' });
  } else if (filename.length > 100) {
    issues.push({ code: 'LONG_FILENAME', message: 'Filename exceeds safe length', severity: 'WARNING' });
  } else {
    checksPassed.push('Safe filename');
  }

  // Check 2: Non-empty file
  if (!blob || blob.size === 0) {
    issues.push({ code: 'EMPTY_FILE', message: 'Generated DOCX is 0 bytes', severity: 'FAILED' });
    return { format: 'docx', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push('Non-empty file size');
  }

  // Check 3: Real OpenXML package structure
  let zip: JSZip;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
    checksPassed.push('Valid OpenXML ZIP package');
  } catch (err: any) {
    issues.push({ code: 'CORRUPT_PACKAGE', message: `Not a valid OpenXML ZIP archive: ${err.message}`, severity: 'FAILED' });
    return { format: 'docx', status: 'FAILED', issues, checksPassed };
  }

  // Check 4: Required OpenXML package components
  const hasDocumentXml = !!zip.file('word/document.xml');
  const hasContentTypes = !!zip.file('[Content_Types].xml');

  if (!hasDocumentXml) {
    issues.push({ code: 'MISSING_DOCUMENT_XML', message: 'Missing word/document.xml in DOCX package', severity: 'FAILED' });
  } else {
    checksPassed.push('word/document.xml present');
  }

  if (!hasContentTypes) {
    issues.push({ code: 'MISSING_CONTENT_TYPES', message: 'Missing [Content_Types].xml in DOCX package', severity: 'FAILED' });
  } else {
    checksPassed.push('[Content_Types].xml present');
  }

  // Check 5: Text content and layout heuristics
  if (hasDocumentXml) {
    try {
      const docXml = await zip.file('word/document.xml')!.async('string');
      // Extract text content
      const textMatches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const extractedWords = textMatches
        .map((m) => m.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ');

      if (sourceText.trim() && (!extractedWords || extractedWords.length < 5)) {
        issues.push({
          code: 'EMPTY_TEXT_BODY',
          message: 'DOCX body does not contain expected readable text content',
          severity: 'FAILED',
        });
      } else {
        checksPassed.push('Text body content verified');
      }

      // Check Unicode (Bangla / English preservation)
      const hasBanglaInSource = /[\u0980-\u09FF]/.test(sourceText);
      if (hasBanglaInSource) {
        const hasBanglaInDocx = /[\u0980-\u09FF]/.test(docXml);
        if (hasBanglaInDocx) {
          checksPassed.push('Bangla Unicode text preserved');
        } else {
          issues.push({
            code: 'UNICODE_DEGRADATION',
            message: 'Bangla Unicode text from source is missing in DOCX output',
            severity: 'WARNING',
          });
        }
      }

      // Check for excessive paragraph blocks without headings
      const paragraphCount = (docXml.match(/<w:p[ >]/g) || []).length;
      if (paragraphCount > 50) {
        issues.push({
          code: 'HIGH_PARAGRAPH_COUNT',
          message: 'Large document with over 50 paragraphs; check section formatting',
          severity: 'WARNING',
        });
      } else {
        checksPassed.push('Safe paragraph count and layout');
      }
    } catch (e: any) {
      issues.push({ code: 'DOCX_INSPECT_ERROR', message: `Failed to inspect document.xml: ${e.message}`, severity: 'WARNING' });
    }
  }

  const hasFailed = issues.some((i) => i.severity === 'FAILED');
  const hasWarning = issues.some((i) => i.severity === 'WARNING');
  const status: QualityStatus = hasFailed ? 'FAILED' : hasWarning ? 'WARNING' : 'VALID';

  return { format: 'docx', status, issues, checksPassed };
}

/**
 * Quality validation for PDF deliverables.
 */
export async function validatePdfQuality(
  blob: Blob,
  filename: string,
  sourceText: string
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];
  const checksPassed: string[] = [];

  // Check 1: Filename validation
  if (!filename.endsWith('.pdf')) {
    issues.push({ code: 'INVALID_EXTENSION', message: 'Filename does not end with .pdf', severity: 'FAILED' });
  } else if (filename.length > 100) {
    issues.push({ code: 'LONG_FILENAME', message: 'Filename exceeds safe length', severity: 'WARNING' });
  } else {
    checksPassed.push('Safe filename');
  }

  // Check 2: Non-empty file
  if (!blob || blob.size === 0) {
    issues.push({ code: 'EMPTY_FILE', message: 'Generated PDF is 0 bytes', severity: 'FAILED' });
    return { format: 'pdf', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push('Non-empty file size');
  }

  // Check 3: Check %PDF- header signature
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await blob.arrayBuffer();
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerStr = String.fromCharCode(...headerBytes);
    if (!headerStr.startsWith('%PDF-')) {
      issues.push({ code: 'INVALID_PDF_SIGNATURE', message: 'Missing %PDF- header signature', severity: 'FAILED' });
      return { format: 'pdf', status: 'FAILED', issues, checksPassed };
    }
    checksPassed.push('Valid %PDF- header signature');
  } catch (err: any) {
    issues.push({ code: 'UNREADABLE_BUFFER', message: `Cannot read PDF buffer: ${err.message}`, severity: 'FAILED' });
    return { format: 'pdf', status: 'FAILED', issues, checksPassed };
  }

  // Check 4: Load via pdf-lib and check pages
  let pdfDoc: PDFDocument;
  let pageCount = 0;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();
    checksPassed.push('PDF parsed by document engine');
  } catch (err: any) {
    issues.push({ code: 'CORRUPT_PDF', message: `Corrupted PDF structure: ${err.message}`, severity: 'FAILED' });
    return { format: 'pdf', status: 'FAILED', issues, checksPassed };
  }

  if (pageCount === 0) {
    issues.push({ code: 'ZERO_PAGES', message: 'PDF has 0 pages', severity: 'FAILED' });
  } else {
    checksPassed.push(`Page count valid (${pageCount} page${pageCount > 1 ? 's' : ''})`);
  }

  // Check 5: Page dimensions and safe margins
  if (pageCount > 0) {
    const page1 = pdfDoc.getPage(0);
    const { width, height } = page1.getSize();
    if (width < 200 || height < 200) {
      issues.push({ code: 'PAGE_TOO_SMALL', message: 'PDF page dimensions are abnormally small', severity: 'WARNING' });
    } else if (width > 2000 || height > 2000) {
      issues.push({ code: 'PAGE_TOO_LARGE', message: 'PDF page dimensions exceed standard printing sizes', severity: 'WARNING' });
    } else {
      checksPassed.push('Safe standard page dimensions (A4/Letter)');
    }
  }

  // Check 6: Excess page count warning
  if (pageCount > 30) {
    issues.push({ code: 'HIGH_PAGE_COUNT', message: 'Document exceeds 30 pages; verify page breaks', severity: 'WARNING' });
  }

  const hasFailed = issues.some((i) => i.severity === 'FAILED');
  const hasWarning = issues.some((i) => i.severity === 'WARNING');
  const status: QualityStatus = hasFailed ? 'FAILED' : hasWarning ? 'WARNING' : 'VALID';

  return { format: 'pdf', status, issues, checksPassed };
}

/**
 * Quality validation for XLSX deliverables.
 */
export async function validateXlsxQuality(
  blob: Blob,
  filename: string,
  sourceText: string
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];
  const checksPassed: string[] = [];

  // Check 1: Filename validation
  if (!filename.endsWith('.xlsx')) {
    issues.push({ code: 'INVALID_EXTENSION', message: 'Filename does not end with .xlsx', severity: 'FAILED' });
  } else if (filename.length > 100) {
    issues.push({ code: 'LONG_FILENAME', message: 'Filename exceeds safe length', severity: 'WARNING' });
  } else {
    checksPassed.push('Safe filename');
  }

  // Check 2: Non-empty file
  if (!blob || blob.size === 0) {
    issues.push({ code: 'EMPTY_FILE', message: 'Generated XLSX is 0 bytes', severity: 'FAILED' });
    return { format: 'xlsx', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push('Non-empty file size');
  }

  // Check 3: Real OpenXML workbook parsing
  let workbook: XLSX.WorkBook;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
    checksPassed.push('Valid OpenXML workbook structure');
  } catch (err: any) {
    issues.push({ code: 'CORRUPT_WORKBOOK', message: `Cannot parse XLSX workbook: ${err.message}`, severity: 'FAILED' });
    return { format: 'xlsx', status: 'FAILED', issues, checksPassed };
  }

  // Check 4: Worksheet presence
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    issues.push({ code: 'NO_WORKSHEETS', message: 'Workbook contains no worksheets', severity: 'FAILED' });
    return { format: 'xlsx', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push(`Worksheet count valid (${sheetNames.length} sheet${sheetNames.length > 1 ? 's' : ''})`);
  }

  // Check 5: Sheet name validity (Excel forbidden chars: \ / ? * : [ ] and max 31 chars)
  const forbiddenChars = /[\\/?*:[\]]/;
  const uniqueNames = new Set<string>();

  for (const name of sheetNames) {
    if (forbiddenChars.test(name)) {
      issues.push({
        code: 'FORBIDDEN_SHEET_NAME_CHARS',
        message: `Sheet name "${name}" contains forbidden Excel characters (\\ / ? * : [ ])`,
        severity: 'FAILED',
      });
    }
    if (name.length > 31) {
      issues.push({
        code: 'SHEET_NAME_TOO_LONG',
        message: `Sheet name "${name}" exceeds 31 character limit`,
        severity: 'FAILED',
      });
    }
    if (uniqueNames.has(name.toLowerCase())) {
      issues.push({
        code: 'DUPLICATE_SHEET_NAME',
        message: `Duplicate sheet name "${name}" found`,
        severity: 'FAILED',
      });
    }
    uniqueNames.add(name.toLowerCase());
  }

  if (!issues.some((i) => i.code.includes('SHEET_NAME'))) {
    checksPassed.push('All sheet names compliant with Excel specification');
  }

  // Check 6: Check for completely empty workbook
  let totalFilledCells = 0;
  let hasExtractedBangla = false;

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    for (const row of json) {
      for (const cell of row) {
        if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
          totalFilledCells++;
          if (/[\u0980-\u09FF]/.test(String(cell))) {
            hasExtractedBangla = true;
          }
        }
      }
    }

    // Check column width safety
    const cols = sheet['!cols'] || [];
    for (let cIdx = 0; cIdx < cols.length; cIdx++) {
      const col = cols[cIdx];
      if (col && typeof col.wch === 'number') {
        if (col.wch < 3) {
          issues.push({
            code: 'NARROW_COLUMN',
            message: `Sheet "${name}" has very narrow column width (${col.wch})`,
            severity: 'WARNING',
          });
          break;
        } else if (col.wch > 100) {
          issues.push({
            code: 'WIDE_COLUMN',
            message: `Sheet "${name}" has unusually wide column width (${col.wch})`,
            severity: 'WARNING',
          });
          break;
        }
      }
    }
  }

  if (totalFilledCells === 0) {
    issues.push({ code: 'EMPTY_WORKBOOK', message: 'All worksheets in workbook are completely empty', severity: 'FAILED' });
  } else {
    checksPassed.push(`Workbook cells populated (${totalFilledCells} cells)`);
  }

  if (/[\u0980-\u09FF]/.test(sourceText)) {
    if (hasExtractedBangla) {
      checksPassed.push('Bangla Unicode text preserved in spreadsheet');
    } else {
      issues.push({
        code: 'UNICODE_WARNING',
        message: 'Source had Bangla text but spreadsheet cells did not retain it',
        severity: 'WARNING',
      });
    }
  }

  const hasFailed = issues.some((i) => i.severity === 'FAILED');
  const hasWarning = issues.some((i) => i.severity === 'WARNING');
  const status: QualityStatus = hasFailed ? 'FAILED' : hasWarning ? 'WARNING' : 'VALID';

  return { format: 'xlsx', status, issues, checksPassed };
}

/**
 * Quality validation for PPTX deliverables.
 */
export async function validatePptxQuality(
  blob: Blob,
  filename: string,
  sourceText: string
): Promise<QualityReport> {
  const issues: QualityIssue[] = [];
  const checksPassed: string[] = [];

  // Check 1: Filename validation
  if (!filename.endsWith('.pptx')) {
    issues.push({ code: 'INVALID_EXTENSION', message: 'Filename does not end with .pptx', severity: 'FAILED' });
  } else if (filename.length > 100) {
    issues.push({ code: 'LONG_FILENAME', message: 'Filename exceeds safe length', severity: 'WARNING' });
  } else {
    checksPassed.push('Safe filename');
  }

  // Check 2: Non-empty file
  if (!blob || blob.size === 0) {
    issues.push({ code: 'EMPTY_FILE', message: 'Generated PPTX is 0 bytes', severity: 'FAILED' });
    return { format: 'pptx', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push('Non-empty file size');
  }

  // Check 3: Real OpenXML presentation package
  let zip: JSZip;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
    checksPassed.push('Valid OpenXML presentation package');
  } catch (err: any) {
    issues.push({ code: 'CORRUPT_PRESENTATION', message: `Cannot parse PPTX presentation: ${err.message}`, severity: 'FAILED' });
    return { format: 'pptx', status: 'FAILED', issues, checksPassed };
  }

  // Check 4: Check ppt/presentation.xml and slides
  const hasPresentationXml = !!zip.file('ppt/presentation.xml');
  if (!hasPresentationXml) {
    issues.push({ code: 'MISSING_PRESENTATION_XML', message: 'Missing ppt/presentation.xml', severity: 'FAILED' });
    return { format: 'pptx', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push('ppt/presentation.xml present');
  }

  // Count slides
  const slideFiles = Object.keys(zip.files).filter((path) =>
    path.startsWith('ppt/slides/slide') && path.endsWith('.xml')
  );

  if (slideFiles.length === 0) {
    issues.push({ code: 'ZERO_SLIDES', message: 'Presentation contains 0 slides', severity: 'FAILED' });
    return { format: 'pptx', status: 'FAILED', issues, checksPassed };
  } else {
    checksPassed.push(`Slide count valid (${slideFiles.length} slide${slideFiles.length > 1 ? 's' : ''})`);
  }

  // Check 5: Inspect slides for text content, editable text, and overflow risks
  let allSlideText = '';
  let emptySlideCount = 0;
  let hasOverflowRisk = false;

  for (const slidePath of slideFiles) {
    try {
      const slideXml = await zip.file(slidePath)!.async('string');
      // Editable text is in <a:t> elements
      const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      const slideText = textMatches
        .map((m) => m.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ');

      allSlideText += ' ' + slideText;

      if (!slideText || slideText.length === 0) {
        emptySlideCount++;
      }

      // Overflow heuristic: slide text exceeding 800 characters or more than 15 bullet paragraphs
      const pCount = (slideXml.match(/<a:p[ >]/g) || []).length;
      if (slideText.length > 800 || pCount > 15) {
        hasOverflowRisk = true;
      }
    } catch (_) {}
  }

  if (emptySlideCount === slideFiles.length) {
    issues.push({ code: 'ALL_SLIDES_EMPTY', message: 'All slides in presentation are empty', severity: 'FAILED' });
  } else if (emptySlideCount > 0) {
    issues.push({
      code: 'EMPTY_SLIDE_DETECTED',
      message: `${emptySlideCount} slide(s) appear to be empty without text content`,
      severity: 'WARNING',
    });
  } else {
    checksPassed.push('All slides contain content');
  }

  if (hasOverflowRisk) {
    issues.push({
      code: 'SLIDE_OVERFLOW_RISK',
      message: 'Slide contains excessive lines or character count that may overflow viewport',
      severity: 'WARNING',
    });
  } else {
    checksPassed.push('Slide text density within safe layout bounds');
  }

  // Editable text check
  if (allSlideText.trim().length > 10) {
    checksPassed.push('Editable text preserved in slide shapes');
  }

  // Bangla Unicode text check
  if (/[\u0980-\u09FF]/.test(sourceText)) {
    if (/[\u0980-\u09FF]/.test(allSlideText)) {
      checksPassed.push('Bangla Unicode text preserved in presentation');
    } else {
      issues.push({
        code: 'UNICODE_WARNING',
        message: 'Source had Bangla text but presentation did not retain it',
        severity: 'WARNING',
      });
    }
  }

  const hasFailed = issues.some((i) => i.severity === 'FAILED');
  const hasWarning = issues.some((i) => i.severity === 'WARNING');
  const status: QualityStatus = hasFailed ? 'FAILED' : hasWarning ? 'WARNING' : 'VALID';

  return { format: 'pptx', status, issues, checksPassed };
}

/**
 * Package successfully generated deliverables into a single, clean ZIP bundle.
 * Only includes selected, generated files with VALID or WARNING status;
 * never includes failed, unselected, or FAILED-quality outputs.
 */
export async function createOfficePackZipBundle(
  files: GeneratedPackFile[],
  sourceFilename: string,
  packType: string
): Promise<{ filename: string; blob: Blob }> {
  const zip = new JSZip();
  // Include only successfully generated files that passed quality checks (VALID or WARNING)
  const eligibleFiles = files.filter(
    (file) => !file.qualityReport || file.qualityReport.status !== 'FAILED'
  );

  for (const file of eligibleFiles) {
    zip.file(file.filename, file.blob);
  }
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });
  const zipFilename = generateOfficePackZipFilename(sourceFilename, packType);
  return {
    filename: zipFilename,
    blob: zipBlob,
  };
}

/**
 * Helper to deduplicate filenames and create collision-safe output names.
 * Example: report.docx, report_2.docx, report_3.docx
 */
export function generateCollisionSafeFilename(
  filename: string,
  existingNames: Set<string>
): string {
  if (!existingNames.has(filename)) {
    existingNames.add(filename);
    return filename;
  }

  const dotIdx = filename.lastIndexOf('.');
  const base = dotIdx !== -1 ? filename.substring(0, dotIdx) : filename;
  const ext = dotIdx !== -1 ? filename.substring(dotIdx) : '';

  let counter = 2;
  while (true) {
    const candidate = `${base}_${counter}${ext}`;
    if (!existingNames.has(candidate)) {
      existingNames.add(candidate);
      return candidate;
    }
    counter++;
  }
}

/**
 * Package multiple completed batch source items into a structured master ZIP package.
 * Structure:
 * MAISHAA_Office_Pack_Batch/
 *   source-file-1/
 *     file1.docx
 *     file1.pdf
 *   source-file-2/
 *     file2.xlsx
 *
 * Excludes FAILED or NOT SUPPORTED files and ensures collision-free folder and file names.
 */
export async function createOfficePackBatchZipBundle(
  batchItems: BatchSourceItem[],
  packType: string
): Promise<{ filename: string; blob: Blob; fileCount: number }> {
  const zip = new JSZip();
  const rootFolder = 'MAISHAA_Office_Pack_Batch';
  const folderNamesSet = new Set<string>();
  let totalFilesZipped = 0;

  for (const item of batchItems) {
    // Only include successful valid/warning files
    const validFiles = (item.generatedFiles || []).filter(
      (f) => !f.qualityReport || f.qualityReport.status !== 'FAILED'
    );
    if (validFiles.length === 0) continue;

    // Build safe folder name for this source
    const rawSafeFolder = sanitizeFilename(
      item.safeFilename.replace(/\.[^.]+$/, ''),
      'source_doc'
    );
    const folderName = generateCollisionSafeFilename(rawSafeFolder, folderNamesSet);
    const itemFolder = zip.folder(`${rootFolder}/${folderName}`);

    const fileNamesInFolder = new Set<string>();
    for (const f of validFiles) {
      const safeOutputName = generateCollisionSafeFilename(f.filename, fileNamesInFolder);
      if (itemFolder) {
        itemFolder.file(safeOutputName, f.blob);
        totalFilesZipped++;
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFilename = `MAISHAA_Office_Pack_Batch_${packType}_${timestamp}.zip`;

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });

  return {
    filename: zipFilename,
    blob: zipBlob,
    fileCount: totalFilesZipped,
  };
}

/**
 * Execute real Office Pack generation for DOCX, PDF, XLSX, and PPTX.
 * Validates each generated output against deterministic quality checks.
 * Formats with FAILED quality are rejected and not presented as downloadable.
 */
export async function executeOfficePackGeneration(
  file: File | { name: string; size: number; textContent?: string },
  plan: OfficePackWorkflowPlan,
  language: 'bn' | 'en' = 'en'
): Promise<OfficePackGenerationResult> {
  // 1. Validate source content before generation
  const validation = await validateAndExtractSourceContent(file);
  if (!validation.isSupported || !validation.isValid || validation.status !== 'READY') {
    const errorMsg =
      validation.error ||
      (validation.status === 'EMPTY'
        ? 'Source file is empty (0 bytes). Cannot generate office pack from empty document.'
        : validation.status === 'NOT SUPPORTED'
        ? 'NOT SUPPORTED: Source extraction is unsupported.'
        : 'EXTRACTION FAILED: Failed to extract content from source file.');

    const statusForOutputs: FormatGenerationStatus =
      validation.status === 'NOT SUPPORTED' || validation.status === 'EMPTY'
        ? 'NOT SUPPORTED'
        : 'Failed';

    const unsupportedStatuses: Record<OutputFormat, FormatStatusInfo> = {
      docx: { format: 'docx', status: statusForOutputs, error: errorMsg },
      pdf: { format: 'pdf', status: statusForOutputs, error: errorMsg },
      xlsx: { format: 'xlsx', status: statusForOutputs, error: errorMsg },
      pptx: { format: 'pptx', status: statusForOutputs, error: errorMsg },
    };
    return {
      success: false,
      packType: plan.packType,
      files: [],
      formatStatuses: unsupportedStatuses,
      unsupportedNotice: errorMsg,
      error: errorMsg,
    };
  }

  const sourceText = validation.extractedText || validation.normalized?.plainText || '';
  const generatedFiles: GeneratedPackFile[] = [];
  const qualityReports: Partial<Record<OutputFormat, QualityReport>> = {};

  const formatStatuses: Record<OutputFormat, FormatStatusInfo> = {
    docx: {
      format: 'docx',
      status: plan.selectedFormats.includes('docx') ? 'Failed' : 'Not Selected',
    },
    pdf: {
      format: 'pdf',
      status: plan.selectedFormats.includes('pdf') ? 'Failed' : 'Not Selected',
    },
    xlsx: {
      format: 'xlsx',
      status: plan.selectedFormats.includes('xlsx') ? 'Failed' : 'Not Selected',
    },
    pptx: {
      format: 'pptx',
      status: plan.selectedFormats.includes('pptx') ? 'Failed' : 'Not Selected',
    },
  };

  // 2. Generate DOCX only if selected
  if (plan.selectedFormats.includes('docx')) {
    try {
      const docxBlob = await generateOfficePackDocx(plan, sourceText, language);
      const docxFilename = generateOfficePackFilename(plan.sourceFileName, plan.packType, 'docx');
      const quality = await validateDocxQuality(docxBlob, docxFilename, sourceText);
      qualityReports.docx = quality;

      if (quality.status === 'FAILED') {
        const failureIssue = quality.issues.find((i) => i.severity === 'FAILED')?.message || 'DOCX quality check failed';
        formatStatuses.docx = {
          format: 'docx',
          status: 'Failed',
          qualityStatus: 'FAILED',
          qualityReport: quality,
          error: failureIssue,
        };
      } else {
        generatedFiles.push({
          format: 'docx',
          filename: docxFilename,
          blob: docxBlob,
          size: docxBlob.size,
          qualityReport: quality,
        });
        formatStatuses.docx = {
          format: 'docx',
          status: 'Generated',
          qualityStatus: quality.status,
          qualityReport: quality,
          filename: docxFilename,
          size: docxBlob.size,
        };
      }
    } catch (err: any) {
      formatStatuses.docx = {
        format: 'docx',
        status: 'Failed',
        qualityStatus: 'FAILED',
        error: err?.message || 'DOCX generation failed',
      };
    }
  }

  // 3. Generate PDF only if selected
  if (plan.selectedFormats.includes('pdf')) {
    try {
      const pdfBytes = await generateOfficePackPdf(plan, sourceText, language);
      const pdfFilename = generateOfficePackFilename(plan.sourceFileName, plan.packType, 'pdf');
      const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const quality = await validatePdfQuality(pdfBlob, pdfFilename, sourceText);
      qualityReports.pdf = quality;

      if (quality.status === 'FAILED') {
        const failureIssue = quality.issues.find((i) => i.severity === 'FAILED')?.message || 'PDF quality check failed';
        formatStatuses.pdf = {
          format: 'pdf',
          status: 'Failed',
          qualityStatus: 'FAILED',
          qualityReport: quality,
          error: failureIssue,
        };
      } else {
        generatedFiles.push({
          format: 'pdf',
          filename: pdfFilename,
          blob: pdfBlob,
          size: pdfBytes.length,
          qualityReport: quality,
        });
        formatStatuses.pdf = {
          format: 'pdf',
          status: 'Generated',
          qualityStatus: quality.status,
          qualityReport: quality,
          filename: pdfFilename,
          size: pdfBytes.length,
        };
      }
    } catch (err: any) {
      formatStatuses.pdf = {
        format: 'pdf',
        status: 'Failed',
        qualityStatus: 'FAILED',
        error: err?.message || 'PDF generation failed',
      };
    }
  }

  // 4. Generate XLSX only if selected
  if (plan.selectedFormats.includes('xlsx')) {
    try {
      const xlsxBlob = await generateOfficePackXlsx(plan, sourceText, language);
      const xlsxFilename = generateOfficePackFilename(plan.sourceFileName, plan.packType, 'xlsx');
      const quality = await validateXlsxQuality(xlsxBlob, xlsxFilename, sourceText);
      qualityReports.xlsx = quality;

      if (quality.status === 'FAILED') {
        const failureIssue = quality.issues.find((i) => i.severity === 'FAILED')?.message || 'XLSX quality check failed';
        formatStatuses.xlsx = {
          format: 'xlsx',
          status: 'Failed',
          qualityStatus: 'FAILED',
          qualityReport: quality,
          error: failureIssue,
        };
      } else {
        generatedFiles.push({
          format: 'xlsx',
          filename: xlsxFilename,
          blob: xlsxBlob,
          size: xlsxBlob.size,
          qualityReport: quality,
        });
        formatStatuses.xlsx = {
          format: 'xlsx',
          status: 'Generated',
          qualityStatus: quality.status,
          qualityReport: quality,
          filename: xlsxFilename,
          size: xlsxBlob.size,
        };
      }
    } catch (err: any) {
      formatStatuses.xlsx = {
        format: 'xlsx',
        status: 'Failed',
        qualityStatus: 'FAILED',
        error: err?.message || 'XLSX generation failed',
      };
    }
  }

  // 5. Generate PPTX only if selected
  if (plan.selectedFormats.includes('pptx')) {
    try {
      const pptxBlob = await generateOfficePackPptx(plan, sourceText, language);
      const pptxFilename = generateOfficePackFilename(plan.sourceFileName, plan.packType, 'pptx');
      const quality = await validatePptxQuality(pptxBlob, pptxFilename, sourceText);
      qualityReports.pptx = quality;

      if (quality.status === 'FAILED') {
        const failureIssue = quality.issues.find((i) => i.severity === 'FAILED')?.message || 'PPTX quality check failed';
        formatStatuses.pptx = {
          format: 'pptx',
          status: 'Failed',
          qualityStatus: 'FAILED',
          qualityReport: quality,
          error: failureIssue,
        };
      } else {
        generatedFiles.push({
          format: 'pptx',
          filename: pptxFilename,
          blob: pptxBlob,
          size: pptxBlob.size,
          qualityReport: quality,
        });
        formatStatuses.pptx = {
          format: 'pptx',
          status: 'Generated',
          qualityStatus: quality.status,
          qualityReport: quality,
          filename: pptxFilename,
          size: pptxBlob.size,
        };
      }
    } catch (err: any) {
      formatStatuses.pptx = {
        format: 'pptx',
        status: 'Failed',
        qualityStatus: 'FAILED',
        error: err?.message || 'PPTX generation failed',
      };
    }
  }

  const selectedCount = plan.selectedFormats.length;
  const successCount = generatedFiles.length;
  const isPartialSuccess = successCount > 0 && successCount < selectedCount;
  const success = successCount > 0;

  return {
    success,
    packType: plan.packType,
    files: generatedFiles,
    formatStatuses,
    qualityReports: qualityReports as Record<OutputFormat, QualityReport>,
    isPartialSuccess,
    error:
      successCount === 0 && selectedCount > 0
        ? 'All selected formats failed to generate or did not pass quality checks'
        : undefined,
  };
}

/**
 * Process a single batch item through extraction, planning, generation, and quality checks.
 * Completely isolates failures so a single failed or unsupported item does not affect others.
 */
export async function processOfficePackBatchItem({
  item,
  packType,
  targetOutputs,
  language = 'en',
  onStageChange,
}: {
  item: BatchSourceItem;
  packType: OfficePackType;
  targetOutputs: PlannedOutput[];
  language?: 'bn' | 'en';
  onStageChange?: (stage: BatchItemStatus) => void;
}): Promise<BatchSourceItem> {
  try {
    // 1. Extraction Stage
    onStageChange?.('EXTRACTING');
    const validation = await validateAndExtractSourceContent(item.file);

    if (!validation.isSupported || !validation.isValid || validation.status !== 'READY') {
      const err =
        validation.error ||
        (validation.status === 'NOT SUPPORTED'
          ? 'NOT SUPPORTED: Source format or content is not supported for extraction.'
          : validation.status === 'EMPTY'
          ? 'Source file is empty (0 bytes).'
          : 'Extraction failed: Unable to extract content.');
      const finalStatus: BatchItemStatus =
        validation.status === 'NOT SUPPORTED' ? 'NOT SUPPORTED' : 'FAILED';
      return {
        ...item,
        status: finalStatus,
        extractionStatus: validation.status,
        error: err,
        generatedFiles: [],
      };
    }

    // 2. Planning Stage using confirmed configuration
    onStageChange?.('READY');
    const plan = buildOfficePackPlan(item.file, packType, targetOutputs);
    if (plan.selectedFormats.length === 0) {
      return {
        ...item,
        status: 'FAILED',
        extractionStatus: 'READY',
        normalized: validation.normalized,
        workflowPlan: plan,
        selectedOutputs: [],
        error: 'No output formats selected',
        generatedFiles: [],
      };
    }

    // 3. Generating Stage
    onStageChange?.('GENERATING');

    // 4. Quality Validation Stage (built into executeOfficePackGeneration)
    onStageChange?.('VALIDATING');
    const result = await executeOfficePackGeneration(item.file, plan, language);

    const hasFailed = result.files.length === 0;
    const hasPartial = result.isPartialSuccess;
    const finalStatus: BatchItemStatus = hasFailed ? 'FAILED' : hasPartial ? 'PARTIAL' : 'COMPLETED';

    const warningSummary =
      result.files
        .filter((f) => f.qualityReport?.status === 'WARNING')
        .map(
          (f) =>
            `${f.format.toUpperCase()}: ${f.qualityReport?.issues.map((i) => i.message).join(', ')}`
        )
        .join(' | ') || undefined;

    return {
      ...item,
      status: finalStatus,
      extractionStatus: 'READY',
      normalized: validation.normalized,
      workflowPlan: plan,
      selectedOutputs: plan.selectedFormats,
      formatStatuses: result.formatStatuses,
      qualityReports: result.qualityReports,
      generatedFiles: result.files,
      error: result.error,
      warningSummary,
    };
  } catch (err: any) {
    return {
      ...item,
      status: 'FAILED',
      error: err?.message || 'Processing failed unexpectedly',
      generatedFiles: [],
    };
  }
}

/**
 * Execute batch processing for multiple source items sequentially.
 * Safe sequential processing ensures deterministic behavior and protects system memory.
 * Supports graceful cancellation without losing completed outputs.
 */
export async function executeOfficePackBatch({
  items,
  packType,
  targetOutputs,
  language = 'en',
  onItemProgress,
  shouldCancel,
}: {
  items: BatchSourceItem[];
  packType: OfficePackType;
  targetOutputs: PlannedOutput[];
  language?: 'bn' | 'en';
  onItemProgress?: (index: number, updatedItem: BatchSourceItem) => void;
  shouldCancel?: () => boolean;
}): Promise<BatchSourceItem[]> {
  const updatedItems: BatchSourceItem[] = [...items];

  for (let i = 0; i < updatedItems.length; i++) {
    if (shouldCancel && shouldCancel()) {
      for (let j = i; j < updatedItems.length; j++) {
        if (
          updatedItems[j].status === 'QUEUED' ||
          updatedItems[j].status === 'EXTRACTING' ||
          updatedItems[j].status === 'READY' ||
          updatedItems[j].status === 'GENERATING' ||
          updatedItems[j].status === 'VALIDATING'
        ) {
          updatedItems[j] = { ...updatedItems[j], status: 'CANCELLED' };
          onItemProgress?.(j, updatedItems[j]);
        }
      }
      break;
    }

    const currentItem = updatedItems[i];
    // Skip already completed items
    if (currentItem.status === 'COMPLETED') {
      continue;
    }

    const result = await processOfficePackBatchItem({
      item: currentItem,
      packType,
      targetOutputs,
      language,
      onStageChange: (stage) => {
        updatedItems[i] = { ...updatedItems[i], status: stage };
        onItemProgress?.(i, updatedItems[i]);
      },
    });

    updatedItems[i] = result;
    onItemProgress?.(i, result);
  }

  return updatedItems;
}

