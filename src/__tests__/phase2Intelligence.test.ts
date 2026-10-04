import { describe, it, expect, vi, beforeAll } from 'vitest';
import { cleanOcrText, preprocessImageForOcr } from '../services/ocrService';
import { analyzePlainText } from '../services/docIntelService';
import { cleanSpreadsheetRows, analyzeWorksheet } from '../services/sheetIntelService';
import { parsePresentation } from '../services/slidesIntelService';
import { extractPdfText } from '../services/pdfService';
import { checkAiStatus, requestDocumentAi } from '../services/aiService';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(
    () => `blob:http://localhost/${Math.random().toString(36).substring(2)}`
  );
  globalThis.URL.revokeObjectURL = vi.fn();

  HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') {
      return {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        fillStyle: '#FFFFFF',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(400),
          width: 10,
          height: 10,
        })),
        putImageData: vi.fn(),
      } as any;
    }
    return null;
  };

  HTMLCanvasElement.prototype.toBlob = function (callback: (b: Blob | null) => void) {
    callback(new Blob(['fake-image-bytes'], { type: 'image/png' }));
  };
});

describe('Phase 2 — Advanced Document Intelligence & OCR Verification', () => {
  describe('Scan & OCR Studio Utilities', () => {
    it('cleans OCR text by removing excessive blank lines and normalizing irregular whitespace', () => {
      const dirty = '  Line 1   with   spaces  \r\n\r\n\r\n\r\n  Line 2  ';
      const cleaned = cleanOcrText(dirty);
      expect(cleaned).toContain('Line 1 with spaces');
      expect(cleaned).toContain('Line 2');
      expect(cleaned).not.toContain('\r');
    });

    it('preprocesses image for OCR and generates transformed canvas and blob', async () => {
      // Mock Image
      const origImage = globalThis.Image;
      (globalThis as any).Image = class {
        onload: () => void = () => {};
        src = '';
        naturalWidth = 100;
        naturalHeight = 100;
        width = 100;
        height = 100;
        constructor() {
          setTimeout(() => this.onload(), 10);
        }
      };

      const testBlob = new Blob(['test-image'], { type: 'image/png' });
      const result = await preprocessImageForOcr(testBlob, {
        grayscale: true,
        contrast: 20,
        brightness: 10,
        threshold: 128,
      });

      expect(result.canvas).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);

      globalThis.Image = origImage;
    });
  });

  describe('Document Intelligence Studio', () => {
    it('analyzes plain text and accurately computes word count, char count, and reading time', () => {
      const content = 'MAISHAA WORKSPACE brings advanced document intelligence to every office task.';
      const res = analyzePlainText(content, 'test.txt', 100);

      expect(res.fileName).toBe('test.txt');
      expect(res.wordCount).toBe(10);
      expect(res.charCount).toBe(content.length);
      expect(res.readingTimeMinutes).toBe(1);
      expect(res.extractedText).toBe(content);
    });
  });

  describe('Spreadsheet Intelligence Studio', () => {
    it('detects columns, rows, headers, and type inference from worksheet', () => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Name', 'Age', 'Department'],
        ['Monir', 32, 'Engineering'],
        ['Rahim', 28, 'Finance'],
      ]);

      const analysis = analyzeWorksheet(ws, 'StaffSheet');
      expect(analysis.sheetName).toBe('StaffSheet');
      expect(analysis.rowCount).toBe(2);
      expect(analysis.columnCount).toBe(3);
      expect(analysis.headers).toEqual(['Name', 'Age', 'Department']);
      expect(analysis.columnTypes['Age']).toBe('number');
      expect(analysis.columnTypes['Name']).toBe('string');
    });

    it('cleans spreadsheet rows by eliminating duplicate rows and trimming strings', () => {
      const rawRows = [
        { Name: '  Monir  ', Role: 'Engineer' },
        { Name: 'Monir', Role: 'Engineer' }, // Duplicate after trimming
        { Name: 'Ayesha', Role: '  Manager ' },
      ];

      const cleaned = cleanSpreadsheetRows(rawRows);
      expect(cleaned.length).toBe(2);
      expect(cleaned[0].Name).toBe('Monir');
      expect(cleaned[1].Role).toBe('Manager');
    });
  });

  describe('Presentation Intelligence Studio', () => {
    it('extracts slide text, titles, and slide counts from PPTX archive safely', async () => {
      const zip = new JSZip();
      // Mock OpenXML PPTX structure
      zip.file(
        'ppt/slides/slide1.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:txBody>
                  <a:p><a:r><a:t>Quarterly Financial Overview</a:t></a:r></a:p>
                  <a:p><a:r><a:t>Revenue grew by 24% year-over-year.</a:t></a:r></a:p>
                </p:txBody>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>`
      );

      const pptxBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const pptxFile = new File([pptxBuffer], 'quarterly.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      const res = await parsePresentation(pptxFile);
      expect(res.slideCount).toBe(1);
      expect(res.slides[0].title).toBe('Quarterly Financial Overview');
      expect(res.slides[0].texts).toContain('Revenue grew by 24% year-over-year.');
      expect(res.totalWordCount).toBeGreaterThan(5);
    });
  });

  describe('PDF Intelligence Studio', () => {
    it('extracts page text and accurately classifies text-based vs scanned PDF', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([400, 600]);
      page.drawText('MAISHAA WORKSPACE Official Procurement Tender Specification Document', { x: 50, y: 500 });

      const pdfBytes = await pdfDoc.save();
      const pdfFile = new File([pdfBytes as any], 'tender.pdf', { type: 'application/pdf' });

      const res = await extractPdfText(pdfFile);
      expect(res.pages.length).toBe(1);
      expect(res.classification).toBe('TEXT_BASED');
      expect(res.fullText).toContain('MAISHAA WORKSPACE Official Procurement Tender');
    });

    it('classifies empty or raster page as likely scanned with honest notice', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([400, 600]); // Blank page with zero text streams

      const pdfBytes = await pdfDoc.save();
      const pdfFile = new File([pdfBytes as any], 'scanned_scan.pdf', { type: 'application/pdf' });

      const res = await extractPdfText(pdfFile);
      expect(res.pages.length).toBe(1);
      expect(res.classification).toBe('SCANNED');
      expect(res.warning).toContain('OCR প্রয়োজন');
    });
  });

  describe('AI Assistant Architecture & Privacy Consent Gating', () => {
    it('correctly handles NOT_CONFIGURED status when AI is not configured', async () => {
      // Mock fetch returning NOT_CONFIGURED
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ configured: false, status: 'NOT_CONFIGURED' }),
      } as any);

      const status = await checkAiStatus();
      expect(status.configured).toBe(false);
      expect(status.status).toBe('NOT_CONFIGURED');

      globalThis.fetch = originalFetch;
    });

    it('rejects empty prompts safely without network call', async () => {
      await expect(requestDocumentAi('')).rejects.toThrow('Prompt cannot be empty');
    });

    it('safely truncates document context exceeding safe token budget', async () => {
      const originalFetch = globalThis.fetch;
      let requestPayload: any = null;

      globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
        requestPayload = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ reply: 'Document grounded analysis result', taskType: 'summary' }),
        });
      });

      const longContext = 'A'.repeat(45000);
      const res = await requestDocumentAi('Summarize this', longContext, 'summary', 'en');

      expect(requestPayload.documentContext.length).toBeLessThanOrEqual(30000);
      expect(res.warning).toBeDefined();
      expect(res.isAiOutput).toBe(true);

      globalThis.fetch = originalFetch;
    });
  });
});
