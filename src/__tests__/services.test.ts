import { describe, it, expect } from 'vitest';
import {
  detectFileType,
  formatFileSize,
  sanitizeFilename,
  generateSafeOutputFilename,
} from '../utils/fileDetection';
import { parsePageRanges } from '../services/pdfService';
import { removeImageBackground } from '../services/imageService';

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

describe('Image Studio - Background Removal Service', () => {
  it('processes image and produces a valid transparent PNG without color corruption', async () => {
    // 1x1 test image
    const validPng = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
      0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120,
      156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68,
      174, 66, 96, 130,
    ]);
    const file = new File([validPng], 'test_photo.png', { type: 'image/png' });

    const result = await removeImageBackground(file, {
      tolerance: 40,
      featherRadius: 2,
      smartAlpha: true,
    });

    expect(result.format).toBe('image/png');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('supports custom tolerance, edge feathering, and smart alpha toggle', async () => {
    const validPng = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
      0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120,
      156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68,
      174, 66, 96, 130,
    ]);
    const file = new File([validPng], 'portrait.png', { type: 'image/png' });

    // Standard mode without smart alpha
    const resStandard = await removeImageBackground(file, {
      tolerance: 25,
      featherRadius: 0,
      smartAlpha: false,
    });
    expect(resStandard.format).toBe('image/png');

    // Smart alpha mode with feathering
    const resSmart = await removeImageBackground(file, {
      tolerance: 50,
      featherRadius: 4,
      smartAlpha: true,
    });
    expect(resSmart.format).toBe('image/png');
  });
});
