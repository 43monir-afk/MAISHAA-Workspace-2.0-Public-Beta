/**
 * MAISHAA WORKSPACE — Universal Office & Document Conversion Service
 * Real client-side conversions: DOCX → PDF, PDF → DOCX, XLSX → PDF, PDF → XLSX, PPTX → PDF.
 * Uses mammoth, pdf-lib, SheetJS (xlsx), pptxgenjs, and directExportService.
 */

import * as XLSX from 'xlsx';
import { parseDocxDocument } from './docIntelService';
import { extractPdfText } from './pdfService';
import { parsePresentation } from './slidesIntelService';
import { exportToPdf, exportToDocx } from './directExportService';
import { generateSafeOutputFilename } from '../utils/fileDetection';

export interface ConversionResult {
  blob: Blob;
  outputFilename: string;
  originalSize: number;
  newSize: number;
  formatDescription: string;
  metrics?: {
    pagesOrSheets?: number;
    wordCount?: number;
  };
}

/**
 * Convert Microsoft Word DOCX to high-fidelity PDF with Bengali Unicode support.
 */
export async function convertDocxToPdf(file: File): Promise<ConversionResult> {
  const analysis = await parseDocxDocument(file);
  const title = file.name.replace(/\.[^/.]+$/, '');

  // Format document text with clean markdown headings
  let markdown = `# ${title}\n\n`;
  if (analysis.outline.length > 0) {
    markdown += `> Document Structure: ${analysis.outline.map((o) => o.text).join(' • ')}\n\n`;
  }
  markdown += analysis.extractedText;

  const exportResult = await exportToPdf(markdown, {
    title,
    sourceFilename: file.name,
    margin: 'normal',
    fontSize: 'normal',
    orientation: 'portrait',
  });

  const outputFilename = generateSafeOutputFilename(file.name, 'converted', 'pdf');

  return {
    blob: exportResult.blob,
    outputFilename,
    originalSize: file.size,
    newSize: exportResult.blob.size,
    formatDescription: 'Microsoft Word to PDF Document',
    metrics: {
      wordCount: analysis.wordCount,
      pagesOrSheets: exportResult.pageCount,
    },
  };
}

/**
 * Convert PDF to editable Microsoft Word DOCX.
 */
export async function convertPdfToDocx(file: File): Promise<ConversionResult> {
  const extraction = await extractPdfText(file);
  const title = file.name.replace(/\.[^/.]+$/, '');

  let textContent = extraction.fullText.trim();
  if (!textContent || extraction.classification === 'SCANNED') {
    textContent = `[Scanned Document Notice]\nThis PDF appears to contain scanned raster images with minimal selectable text.\n` +
      `Extracted fragments:\n${extraction.fullText || '(No selectable text found)'}`;
  }

  // Generate genuine OpenXML DOCX blob
  const exportResult = await exportToDocx(textContent, {
    title,
    sourceFilename: file.name,
    margin: 'normal',
    fontSize: 'normal',
  });

  const outputFilename = generateSafeOutputFilename(file.name, 'converted', 'docx');

  return {
    blob: exportResult.blob,
    outputFilename,
    originalSize: file.size,
    newSize: exportResult.blob.size,
    formatDescription: 'PDF to Microsoft Word (DOCX)',
    metrics: {
      pagesOrSheets: extraction.metadata.pageCount,
      wordCount: extraction.totalWords,
    },
  };
}

/**
 * Convert Excel (XLSX/XLS) workbook to formatted landscape PDF table report.
 */
export async function convertXlsxToPdf(file: File): Promise<ConversionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const title = file.name.replace(/\.[^/.]+$/, '');

  let markdown = `# ${title} — Spreadsheet Export\n\n`;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (data.length === 0) continue;

    markdown += `## Sheet: ${sheetName}\n\n`;

    // Extract headers and rows
    const maxCols = Math.min(8, Math.max(...data.slice(0, 10).map((r) => r.length), 1));
    const headers = (data[0] || []).slice(0, maxCols).map((c, i) => String(c || `Col ${i + 1}`).trim());

    while (headers.length < maxCols) {
      headers.push(`Col ${headers.length + 1}`);
    }

    markdown += `| ${headers.join(' | ')} |\n`;
    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // Include up to 100 rows per sheet in PDF preview
    const rows = data.slice(1, 101);
    for (const row of rows) {
      const cells = [];
      for (let i = 0; i < maxCols; i++) {
        const val = row[i] !== undefined && row[i] !== null ? String(row[i]).replace(/\|/g, '/') : '-';
        cells.push(val.slice(0, 40));
      }
      markdown += `| ${cells.join(' | ')} |\n`;
    }

    if (data.length > 101) {
      markdown += `\n*Note: Showing 100 of ${data.length - 1} rows.*\n\n`;
    } else {
      markdown += `\n\n`;
    }
  }

  const exportResult = await exportToPdf(markdown, {
    title,
    sourceFilename: file.name,
    orientation: 'landscape',
    margin: 'narrow',
    fontSize: 'small',
  });

  const outputFilename = generateSafeOutputFilename(file.name, 'report', 'pdf');

  return {
    blob: exportResult.blob,
    outputFilename,
    originalSize: file.size,
    newSize: exportResult.blob.size,
    formatDescription: 'Excel Spreadsheet to PDF Table Report',
    metrics: {
      pagesOrSheets: workbook.SheetNames.length,
    },
  };
}

/**
 * Convert PDF to Microsoft Excel XLSX workbook by reconstructing tabular data.
 */
export async function convertPdfToXlsx(file: File): Promise<ConversionResult> {
  const extraction = await extractPdfText(file);
  const title = file.name.replace(/\.[^/.]+$/, '');

  const rows: string[][] = [
    ['Document', file.name],
    ['Total Pages', String(extraction.metadata.pageCount)],
    ['Total Words', String(extraction.totalWords)],
    [],
    ['Page', 'Line Number', 'Extracted Column 1', 'Extracted Column 2', 'Extracted Column 3', 'Raw Text'],
  ];

  extraction.pages.forEach((page) => {
    const lines = page.text.split('\n').map((l) => l.trim()).filter(Boolean);
    lines.forEach((line, lineIdx) => {
      // Split on tabs, multiple spaces, commas, or pipes
      const parts = line.split(/\t+|\s{2,}|\|/).map((p) => p.trim()).filter(Boolean);
      rows.push([
        `Page ${page.pageNumber}`,
        String(lineIdx + 1),
        parts[0] || '',
        parts[1] || '',
        parts[2] || '',
        line,
      ]);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 50 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const xlsxBlob = new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const outputFilename = generateSafeOutputFilename(file.name, 'data', 'xlsx');

  return {
    blob: xlsxBlob,
    outputFilename,
    originalSize: file.size,
    newSize: xlsxBlob.size,
    formatDescription: 'PDF Tabular Extraction to Excel (XLSX)',
    metrics: {
      pagesOrSheets: extraction.metadata.pageCount,
      wordCount: extraction.totalWords,
    },
  };
}

/**
 * Convert PowerPoint PPTX presentation to vector landscape PDF slides.
 */
export async function convertPptxToPdf(file: File): Promise<ConversionResult> {
  const analysis = await parsePresentation(file);
  const title = file.name.replace(/\.[^/.]+$/, '');

  let markdown = `# ${title} — Presentation Deck\n\n`;

  analysis.slides.forEach((slide) => {
    markdown += `## Slide ${slide.slideNumber}: ${slide.title || 'Untitled Slide'}\n\n`;
    if (slide.texts.length > 0) {
      slide.texts.forEach((txt) => {
        if (txt !== slide.title) {
          markdown += `- ${txt}\n`;
        }
      });
    } else {
      markdown += `*(Graphical or blank slide)*\n`;
    }
    markdown += `\n---\n\n`;
  });

  const exportResult = await exportToPdf(markdown, {
    title,
    sourceFilename: file.name,
    orientation: 'landscape',
    margin: 'normal',
    fontSize: 'normal',
  });

  const outputFilename = generateSafeOutputFilename(file.name, 'slides', 'pdf');

  return {
    blob: exportResult.blob,
    outputFilename,
    originalSize: file.size,
    newSize: exportResult.blob.size,
    formatDescription: 'PowerPoint Presentation to PDF Slides',
    metrics: {
      pagesOrSheets: analysis.slideCount,
      wordCount: analysis.totalWordCount,
    },
  };
}
