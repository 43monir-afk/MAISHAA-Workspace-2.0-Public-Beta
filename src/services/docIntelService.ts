/**
 * MAISHAA WORKSPACE — Phase 2 Document Intelligence Service
 * Parses DOCX, TXT, and document streams into normalized text structures.
 * Supports outline extraction, reading metrics, and basic text-only DOCX export.
 */

import mammoth from 'mammoth';
import JSZip from 'jszip';
import { validateFileInput } from '../utils/privacy';

export interface DocumentAnalysisResult {
  fileName: string;
  fileSize: number;
  wordCount: number;
  charCount: number;
  lineCount: number;
  readingTimeMinutes: number;
  extractedText: string;
  outline: Array<{ text: string; level: number }>;
  htmlSnippet?: string;
  warnings?: string[];
}

/**
 * Analyze a plain text or normalized text document.
 */
export function analyzePlainText(text: string, fileName = 'document.txt', fileSize = 0): DocumentAnalysisResult {
  const clean = text || '';
  const lines = clean.split('\n');
  const words = clean.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = clean.length;
  const lineCount = lines.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Extract outline: lines starting with # or numbered sections (e.g. "1.", "1.1")
  const outline: Array<{ text: string; level: number }> = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#+)\s*(.*)$/);
      if (match) {
        outline.push({ level: match[1].length, text: match[2] });
      }
    } else if (/^\d+(\.\d+)*\s+[A-Z\u0980-\u09FF]/.test(trimmed)) {
      outline.push({ level: 1, text: trimmed });
    }
  });

  return {
    fileName,
    fileSize,
    wordCount,
    charCount,
    lineCount,
    readingTimeMinutes,
    extractedText: clean,
    outline,
  };
}

/**
 * Decodes all standard XML entities and numeric decimal/hex entities into Unicode.
 */
export function decodeXmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    });
}

/**
 * Pre-render validation: detects corrupted text extraction patterns.
 * If input contains Bangla characters but extracted text becomes repeated 'F', '?', or replacement boxes,
 * export is aborted to prevent generating corrupted documents.
 */
export function validateUnicodeExtraction(text: string, contextLabel = 'Document'): void {
  if (!text) return;
  const hasBengali = /[\u0980-\u09FF]/.test(text);

  // Check for corrupted strings like FFFFFFF, ??????, or replacement boxes
  const hasCorruptedF = /\bF{5,}\b/i.test(text) || /(?:F\s+){4,}F/i.test(text);
  const hasCorruptedQ = /\?{5,}/.test(text);
  const hasCorruptedBoxes = /[□\uFFFD]{3,}/.test(text);

  if ((hasCorruptedF || hasCorruptedQ || hasCorruptedBoxes) && hasBengali) {
    throw new Error('Bangla text extraction failed. PDF was not generated to prevent corrupted output.');
  }
}

/**
 * Extracts raw text with 100% Unicode fidelity directly from DOCX OpenXML (word/document.xml).
 * Correctly concatenates runs <w:r> within each paragraph <w:p> so that words split across runs
 * (common in Word for complex scripts like Bangla) are merged without injecting spurious spaces.
 */
export async function extractDocxOpenXmlText(arrayBuffer: ArrayBuffer): Promise<{
  text: string;
  outline: Array<{ text: string; level: number }>;
}> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('word/document.xml not found in archive');
  }

  const xmlContent = await docXmlFile.async('string');
  const paragraphs: string[] = [];
  const outline: Array<{ text: string; level: number }> = [];

  // Match all paragraphs <w:p ...>...</w:p>
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const pBody = pMatch[1];

    // Check heading level in <w:pStyle w:val="Heading1"/>
    const headingMatch = pBody.match(/<w:pStyle\b[^>]*\bw:val=["'](?:Heading|Title)?\s*([1-6])?["']/i);
    let headingLevel: number | undefined;
    if (headingMatch) {
      headingLevel = headingMatch[1] ? parseInt(headingMatch[1], 10) : 1;
    }

    // Extract all text runs and whitespace elements in sequence within this paragraph
    let paraText = '';
    const elemRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g;
    let elemMatch: RegExpExecArray | null;

    while ((elemMatch = elemRegex.exec(pBody)) !== null) {
      if (elemMatch[1] !== undefined) {
        paraText += decodeXmlEntities(elemMatch[1]);
      } else if (elemMatch[0] === '<w:tab/>') {
        paraText += '\t';
      } else if (elemMatch[0] === '<w:br/>' || elemMatch[0] === '<w:cr/>') {
        paraText += '\n';
      }
    }

    const trimmed = paraText.trim();
    if (trimmed) {
      paragraphs.push(trimmed);
      if (headingLevel) {
        outline.push({ text: trimmed, level: headingLevel });
      }
    }
  }

  const fullText = paragraphs.join('\n\n');
  return { text: fullText, outline };
}

/**
 * Parse a Microsoft Word DOCX document safely using high-fidelity OpenXML parsing and mammoth.
 * Extracts paragraphs, headings, tables, and outline without executing macros or corrupting Unicode.
 */
export async function parseDocxDocument(file: File): Promise<DocumentAnalysisResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();

  try {
    // 1. High-fidelity direct OpenXML extraction (guarantees run preservation & Unicode safety)
    let rawText = '';
    let outline: Array<{ text: string; level: number }> = [];

    try {
      const openXmlRes = await extractDocxOpenXmlText(arrayBuffer);
      rawText = openXmlRes.text;
      outline = openXmlRes.outline;
    } catch {
      // Fall through to mammoth if OpenXML parsing encountered custom structure
    }

    // 2. Also run mammoth for HTML snippet / secondary structure detection
    let html = '';
    const warnings: string[] = [];

    try {
      const mammothOptions = typeof Buffer !== 'undefined'
        ? { buffer: Buffer.from(arrayBuffer) }
        : { arrayBuffer };
      
      const textResult = await mammoth.extractRawText(mammothOptions);
      if (!rawText && textResult.value) {
        rawText = textResult.value;
      }
      if (textResult.messages) {
        warnings.push(...textResult.messages.map((m) => m.message));
      }

      const htmlResult = await mammoth.convertToHtml(mammothOptions);
      html = htmlResult.value || '';

      if (outline.length === 0 && html) {
        const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
        let match;
        while ((match = headingRegex.exec(html)) !== null) {
          const level = parseInt(match[1], 10);
          const text = match[2].replace(/<[^>]+>/g, '').trim();
          if (text) {
            outline.push({ level, text });
          }
        }
      }
    } catch {
      // If mammoth failed (e.g. buffer issues in certain environments), we already have direct OpenXML text
    }

    // 3. Pre-render validation: verify Unicode integrity
    validateUnicodeExtraction(rawText, file.name);

    const words = rawText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = rawText.length;
    const lineCount = rawText.split('\n').filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    return {
      fileName: file.name,
      fileSize: file.size,
      wordCount,
      charCount,
      lineCount,
      readingTimeMinutes,
      extractedText: rawText,
      outline,
      htmlSnippet: html,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err: any) {
    throw new Error(`DOCX পার্স করা ব্যর্থ হয়েছে: ${err.message || 'Corrupted or unreadable DOCX'}`);
  }
}

/**
 * Generate a Basic Text-First DOCX file from raw extracted text.
 * Strictly labeled: "Basic PDF → DOCX (Text Only)".
 * Does not claim complex vector/table preservation.
 */
export async function createTextDocxBlob(text: string, title = 'Document'): Promise<Blob> {
  const zip = new JSZip();

  // Standard OpenXML manifest files
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  const paragraphs = text
    .split('\n')
    .map((p) => {
      const escaped = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<w:p><w:r><w:t>${escaped}</w:t></w:r></w:p>`;
    })
    .join('');

  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${title}</w:t></w:r>
    </w:p>
    ${paragraphs}
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
