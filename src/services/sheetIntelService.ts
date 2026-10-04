/**
 * MAISHAA WORKSPACE — Phase 2 Spreadsheet Intelligence Service
 * Reads and analyzes XLSX and CSV workbooks safely using SheetJS.
 * Features data type inference, duplicate row detection, and safe CSV export.
 */

import * as XLSX from 'xlsx';
import { validateFileInput } from '../utils/privacy';

export interface SheetAnalysis {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  sampleRows: Array<Record<string, any>>;
  emptyRowCount: number;
  duplicateRowCount: number;
  columnTypes: Record<string, string>;
}

export interface WorkbookAnalysisResult {
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  activeSheet: SheetAnalysis;
  allSheets: Record<string, SheetAnalysis>;
}

/**
 * Infer data type of an array of cell values.
 */
function inferDataType(values: any[]): string {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'empty';

  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const v of nonNull) {
    if (typeof v === 'number') numberCount++;
    else if (typeof v === 'boolean') booleanCount++;
    else if (v instanceof Date || (!isNaN(Date.parse(v)) && !/^\d+$/.test(v))) dateCount++;
  }

  const threshold = nonNull.length * 0.7;
  if (numberCount >= threshold) return 'number';
  if (dateCount >= threshold) return 'date';
  if (booleanCount >= threshold) return 'boolean';
  return 'string';
}

/**
 * Analyze a specific worksheet.
 */
export function analyzeWorksheet(worksheet: XLSX.WorkSheet, sheetName: string): SheetAnalysis {
  const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (json.length === 0) {
    return {
      sheetName,
      rowCount: 0,
      columnCount: 0,
      headers: [],
      sampleRows: [],
      emptyRowCount: 0,
      duplicateRowCount: 0,
      columnTypes: {},
    };
  }

  // First non-empty row as header
  const headerRow = json[0] || [];
  const headers = headerRow.map((h, i) => (h !== '' ? String(h).trim() : `Column_${i + 1}`));
  const columnCount = headers.length;

  const dataRows = json.slice(1);
  const rowCount = dataRows.length;

  let emptyRowCount = 0;
  const rowSignatures = new Map<string, number>();

  const objectRows: Array<Record<string, any>> = [];

  for (const row of dataRows) {
    const isAllEmpty = row.every((c) => c === '' || c === null || c === undefined);
    if (isAllEmpty) {
      emptyRowCount++;
      continue;
    }

    const rowObj: Record<string, any> = {};
    headers.forEach((hdr, idx) => {
      rowObj[hdr] = row[idx] !== undefined ? row[idx] : '';
    });
    objectRows.push(rowObj);

    // Duplicate detection signature
    const sig = JSON.stringify(row.map((c) => String(c).trim().toLowerCase()));
    rowSignatures.set(sig, (rowSignatures.get(sig) || 0) + 1);
  }

  let duplicateRowCount = 0;
  for (const count of rowSignatures.values()) {
    if (count > 1) {
      duplicateRowCount += count - 1;
    }
  }

  // Type inference per column
  const columnTypes: Record<string, string> = {};
  headers.forEach((hdr, idx) => {
    const columnValues = dataRows.map((r) => r[idx]);
    columnTypes[hdr] = inferDataType(columnValues);
  });

  return {
    sheetName,
    rowCount,
    columnCount,
    headers,
    sampleRows: objectRows.slice(0, 100), // First 100 rows for preview
    emptyRowCount,
    duplicateRowCount,
    columnTypes,
  };
}

/**
 * Parse an XLSX or CSV file and extract full workbook intelligence.
 */
export async function parseSpreadsheet(file: File): Promise<WorkbookAnalysisResult> {
  const val = validateFileInput(file);
  if (!val.isValid) throw new Error(val.error);

  const arrayBuffer = await file.arrayBuffer();

  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      throw new Error('স্প্রেডশিটে কোনো শিট পাওয়া যায়নি (No sheets found in workbook)');
    }

    const allSheets: Record<string, SheetAnalysis> = {};
    sheetNames.forEach((name) => {
      allSheets[name] = analyzeWorksheet(workbook.Sheets[name], name);
    });

    const firstSheetName = sheetNames[0];

    return {
      fileName: file.name,
      fileSize: file.size,
      sheetNames,
      activeSheet: allSheets[firstSheetName],
      allSheets,
    };
  } catch (err: any) {
    throw new Error(`স্প্রেডশিট লোড করতে ব্যর্থ: ${err.message || 'Corrupted or unreadable file'}`);
  }
}

/**
 * Export selected worksheet to CSV Blob.
 */
export async function exportSheetToCsvBlob(file: File, sheetName?: string): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const targetName = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetName];

  if (!worksheet) {
    throw new Error(`Sheet "${targetName}" not found`);
  }

  const csvString = XLSX.utils.sheet_to_csv(worksheet);
  return new Blob([csvString], { type: 'text/csv;charset=utf-8' });
}

/**
 * Clean data rows: remove duplicates and trim whitespace without mutating source file.
 */
export function cleanSpreadsheetRows(rows: Array<Record<string, any>>): Array<Record<string, any>> {
  const seen = new Set<string>();
  const cleaned: Array<Record<string, any>> = [];

  for (const row of rows) {
    const cleanRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      cleanRow[k] = typeof v === 'string' ? v.trim() : v;
    }

    const sig = JSON.stringify(cleanRow);
    if (!seen.has(sig)) {
      seen.add(sig);
      cleaned.push(cleanRow);
    }
  }

  return cleaned;
}
