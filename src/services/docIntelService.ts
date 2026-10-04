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
 * Parse a Microsoft Word DOCX document safely using mammoth.
 * Extracts paragraphs, headings, tables, and outline without executing macros.
 */
export async function parseDocxDocument(file: File): Promise<DocumentAnalysisResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();

  try {
    // 1. Extract raw text for clean parsing
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = textResult.value || '';

    // 2. Extract HTML snippet for headings and structure detection
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value || '';

    // Detect outline/headings from HTML (h1, h2, h3 tags)
    const outline: Array<{ text: string; level: number }> = [];
    const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) {
        outline.push({ level, text });
      }
    }

    const words = rawText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = rawText.length;
    const lineCount = rawText.split('\n').filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const warnings = textResult.messages ? textResult.messages.map((m) => m.message) : [];

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
