import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import {
  parsePageRange,
  convertPdfToImages,
} from '../services/pdfToImageService';

describe('PDF to JPG / Image Converter Suite', () => {
  describe('Page Range Parser', () => {
    it('returns all pages when range is empty, whitespace, or "all"', () => {
      expect(parsePageRange('', 5)).toEqual([1, 2, 3, 4, 5]);
      expect(parsePageRange('   ', 3)).toEqual([1, 2, 3]);
      expect(parsePageRange('all', 4)).toEqual([1, 2, 3, 4]);
      expect(parsePageRange('ALL', 4)).toEqual([1, 2, 3, 4]);
    });

    it('parses individual comma-separated page numbers correctly', () => {
      expect(parsePageRange('1, 3, 5', 5)).toEqual([1, 3, 5]);
      expect(parsePageRange('2; 4', 5)).toEqual([2, 4]);
    });

    it('parses page ranges such as 2-4 and mixed formats', () => {
      expect(parsePageRange('2-4', 6)).toEqual([2, 3, 4]);
      expect(parsePageRange('1-2, 5', 5)).toEqual([1, 2, 5]);
      expect(parsePageRange('4-2', 5)).toEqual([2, 3, 4]); // Reversed range handled gracefully
    });

    it('clamps numbers outside boundaries and removes duplicates', () => {
      expect(parsePageRange('0, 1, 2, 2, 99', 3)).toEqual([1, 2]);
    });
  });

  describe('PDF to JPG / Image Conversion Engine', () => {
    it('converts a single-page PDF into a crisp JPEG image', async () => {
      // Create a test PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([400, 600]);
      page.drawText('MAISHAA Test Page', { x: 50, y: 500 });
      const pdfBytes = await pdfDoc.save();

      const testFile = new File([pdfBytes as any], 'sample_single.pdf', {
        type: 'application/pdf',
      });

      const result = await convertPdfToImages(testFile, {
        format: 'image/jpeg',
        quality: 0.9,
        scale: 1.5,
      });

      expect(result.totalPages).toBe(1);
      expect(result.selectedPageCount).toBe(1);
      expect(result.images.length).toBe(1);
      expect(result.images[0].pageNumber).toBe(1);
      expect(result.images[0].filename).toBe('sample_single_page_1.jpg');
      expect(result.images[0].blob).toBeInstanceOf(Blob);
      expect(result.images[0].blob.size).toBeGreaterThan(0);
      expect(result.images[0].width).toBeGreaterThan(0);
      expect(result.images[0].height).toBeGreaterThan(0);
      // For single page, zip is optional
      expect(result.totalImagesSize).toBeGreaterThan(0);
    });

    it('converts a multi-page PDF and bundles all pages into a valid ZIP archive', async () => {
      const pdfDoc = await PDFDocument.create();
      const p1 = pdfDoc.addPage([300, 400]);
      p1.drawText('Page 1 Content', { x: 30, y: 350 });
      const p2 = pdfDoc.addPage([300, 400]);
      p2.drawText('Page 2 Content', { x: 30, y: 350 });
      const p3 = pdfDoc.addPage([300, 400]);
      p3.drawText('Page 3 Content', { x: 30, y: 350 });

      const pdfBytes = await pdfDoc.save();
      const testFile = new File([pdfBytes as any], 'multipage_report.pdf', {
        type: 'application/pdf',
      });

      const result = await convertPdfToImages(testFile, {
        format: 'image/jpeg',
        quality: 0.92,
        scale: 2.0,
      });

      expect(result.totalPages).toBe(3);
      expect(result.selectedPageCount).toBe(3);
      expect(result.images.length).toBe(3);

      expect(result.images[0].filename).toBe('multipage_report_page_1.jpg');
      expect(result.images[1].filename).toBe('multipage_report_page_2.jpg');
      expect(result.images[2].filename).toBe('multipage_report_page_3.jpg');

      // Verify ZIP bundle
      expect(result.zipBlob).toBeDefined();
      expect(result.zipFilename).toBe('multipage_report_jpg_pages.zip');
      expect(result.zipBlob!.size).toBeGreaterThan(0);

      // Verify ZIP contents using JSZip
      const zip = await JSZip.loadAsync(await result.zipBlob!.arrayBuffer());
      expect(zip.file('multipage_report_page_1.jpg')).not.toBeNull();
      expect(zip.file('multipage_report_page_2.jpg')).not.toBeNull();
      expect(zip.file('multipage_report_page_3.jpg')).not.toBeNull();
    });

    it('converts with custom page numbers selection', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([200, 200]);
      pdfDoc.addPage([200, 200]);
      pdfDoc.addPage([200, 200]);

      const pdfBytes = await pdfDoc.save();
      const testFile = new File([pdfBytes as any], 'invoice.pdf', {
        type: 'application/pdf',
      });

      const result = await convertPdfToImages(testFile, {
        format: 'image/png',
        pageNumbers: [2],
      });

      expect(result.totalPages).toBe(3);
      expect(result.selectedPageCount).toBe(1);
      expect(result.images.length).toBe(1);
      expect(result.images[0].pageNumber).toBe(2);
      expect(result.images[0].filename).toBe('invoice_page_2.png');
    });

    it('invokes progress callback with rendered page updates', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([100, 100]);
      pdfDoc.addPage([100, 100]);

      const pdfBytes = await pdfDoc.save();
      const testFile = new File([pdfBytes as any], 'doc.pdf', {
        type: 'application/pdf',
      });

      const progressEvents: number[] = [];
      await convertPdfToImages(testFile, {
        onProgress: (p) => {
          progressEvents.push(p.current);
        },
      });

      expect(progressEvents).toEqual([1, 2]);
    });
  });
});
