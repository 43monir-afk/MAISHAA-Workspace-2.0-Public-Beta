import { describe, it, expect } from 'vitest';
import {
  detectFileType,
  formatFileSize,
  sanitizeFilename,
  generateSafeOutputFilename,
} from '../utils/fileDetection';
import { parsePageRanges } from '../services/pdfService';

describe('File Detection & Naming Utilities', () => {
  it('correctly detects PDF files and suggested actions', () => {
    const file = new File(['%PDF-1.4 mock content'], 'annual_report.pdf', {
      type: 'application/pdf',
    });
    const result = detectFileType(file);
    expect(result.type).toBe('pdf');
    expect(result.isPhase1Supported).toBe(true);
    expect(result.suggestedActions.some((a) => a.id === 'merge')).toBe(true);
    expect(result.suggestedActions.some((a) => a.id === 'split')).toBe(true);
  });

  it('correctly detects Image files (PNG, JPEG, WebP)', () => {
    const png = new File(['mock png'], 'logo.png', { type: 'image/png' });
    const resPng = detectFileType(png);
    expect(resPng.type).toBe('png');
    expect(resPng.isPhase1Supported).toBe(true);

    const jpg = new File(['mock jpg'], 'photo.jpg', { type: 'image/jpeg' });
    const resJpg = detectFileType(jpg);
    expect(resJpg.type).toBe('jpeg');
    expect(resJpg.isPhase1Supported).toBe(true);
  });

  it('flags unsupported Office files with Phase 1 honesty notice', () => {
    const docx = new File(['mock docx'], 'contract.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const resDocx = detectFileType(docx);
    expect(resDocx.type).toBe('docx');
    expect(resDocx.isPhase1Supported).toBe(false);
    expect(resDocx.unsupportedMessageBn).toContain('এই ফাইলটি শনাক্ত করা হয়েছে');
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024 * 5.25)).toBe('5.3 MB');
  });

  it('sanitizes unsafe filenames and generates safe output names', () => {
    const unsafe = 'invoice/report:2026<audit>?.pdf';
    const sanitized = sanitizeFilename(unsafe);
    expect(sanitized).not.toContain('/');
    expect(sanitized).not.toContain(':');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');

    const out = generateSafeOutputFilename('my invoice.pdf', 'merged', 'pdf');
    expect(out).toBe('my invoice-merged.pdf');
  });

  it('correctly parses PDF page range strings', () => {
    const totalPages = 10;
    const indices1 = parsePageRanges('1-3, 5', totalPages);
    expect(indices1).toEqual([0, 1, 2, 4]); // 0-based indices for pages 1, 2, 3, 5

    const indices2 = parsePageRanges('2, 8-10', totalPages);
    expect(indices2).toEqual([1, 7, 8, 9]);

    const outOfBounds = parsePageRanges('15, 20', totalPages);
    expect(outOfBounds).toEqual([]);
  });
});
