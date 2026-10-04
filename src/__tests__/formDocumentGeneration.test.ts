import { describe, it, expect } from 'vitest';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { SAMPLE_TEMPLATES } from '../data/formTemplates';
import {
  validateFormBeforeGeneration,
  generateSafeFilename,
  generateFormDocxBlob,
  generateFormPdfBlob,
} from '../services/formDocumentService';

describe('Phase 3 Step 2C — Document Generation Service', () => {
  const sampleCvTemplate = SAMPLE_TEMPLATES[0]; // Professional CV
  const sampleInvoiceTemplate = SAMPLE_TEMPLATES.find((t) => t.category === 'Invoice')!;

  describe('1. Required-field blocking and validation', () => {
    it('blocks generation when required fields are missing', () => {
      const emptyValues = {};
      const validation = validateFormBeforeGeneration(sampleCvTemplate, emptyValues, 'bn');

      expect(validation.isValid).toBe(false);
      expect(validation.errors['fullName']).toBeDefined();
      expect(validation.errors['fullName']).toContain('আবশ্যক');
      expect(validation.errors['email']).toBeDefined();
      expect(validation.errors['phone']).toBeDefined();
    });

    it('blocks generation when email format is invalid', () => {
      const invalidEmailValues = {
        fullName: 'Md. Karim',
        email: 'invalid-email-format',
        phone: '01712345678',
        dateOfBirth: '1995-01-01',
        presentAddress: 'Dhaka',
      };
      const validation = validateFormBeforeGeneration(sampleCvTemplate, invalidEmailValues, 'en');

      expect(validation.isValid).toBe(false);
      expect(validation.errors['email']).toBeDefined();
      expect(validation.errors['email']).toContain('valid email');
    });

    it('passes validation when all required fields are correctly supplied', () => {
      const validValues = {
        fullName: 'মোহাম্মদ করিম উদ্দিন',
        email: 'karim@example.com',
        phone: '01712345678',
        dateOfBirth: '1995-01-01',
        presentAddress: 'মিরপুর, ঢাকা',
      };
      const validation = validateFormBeforeGeneration(sampleCvTemplate, validValues, 'bn');

      expect(validation.isValid).toBe(true);
      expect(Object.keys(validation.errors).length).toBe(0);
    });
  });

  describe('2. Safe filenames generation', () => {
    it('generates safe filename in English without special characters', () => {
      const fn = generateSafeFilename(sampleCvTemplate, 'docx', 'en');
      expect(fn).toBe('Standard_Bangladesh_Professional_CV.docx');
      expect(fn).not.toMatch(/[\\/:*?"<>|]/);
    });

    it('generates safe filename in Bangla without special characters', () => {
      const fn = generateSafeFilename(sampleCvTemplate, 'pdf', 'bn');
      expect(fn).toBe('স্ট্যান্ডার্ড_প্রফেশনাল_জীবনবৃত্তান্ত.pdf');
      expect(fn).not.toMatch(/[\\/:*?"<>|]/);
    });

    it('sanitizes titles with unsafe characters like slashes, colons, and quotes', () => {
      const dirtyTemplate = {
        ...sampleCvTemplate,
        title: 'CV: Standard / Senior "Officer" <Special>',
        titleBn: 'সিভি: প্রমিত / কর্মকর্তা "বিশেষ"',
      };

      const fnEn = generateSafeFilename(dirtyTemplate, 'docx', 'en');
      expect(fnEn).toBe('CV_Standard_Senior_Officer_Special.docx');

      const fnBn = generateSafeFilename(dirtyTemplate, 'pdf', 'bn');
      expect(fnBn).toBe('সিভি_প্রমিত_কর্মকর্তা_বিশেষ.pdf');
    });
  });

  describe('3. DOCX generation with Bangla and English text', () => {
    it('generates real DOCX file with English form data and preserves layout', async () => {
      const formValues = {
        fullName: 'Tanvir Ahmed',
        email: 'tanvir@domain.com',
        phone: '01811223344',
        dateOfBirth: '1992-04-12',
        presentAddress: 'House 12, Road 4\nBanani, Dhaka-1213',
        profileSummary: 'Experienced software engineer with 5 years in fintech.',
      };

      const docxBlob = await generateFormDocxBlob(sampleCvTemplate, formValues, 'en');

      expect(docxBlob).toBeInstanceOf(Blob);
      expect(docxBlob.size).toBeGreaterThan(1000);
      expect(docxBlob.type).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      // Verify with mammoth and JSZip that contents open correctly
      const arrayBuffer = await docxBlob.arrayBuffer();
      const extracted = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });

      expect(extracted.value).toContain('Standard Bangladesh Professional CV');
      expect(extracted.value).toContain('Tanvir Ahmed');
      expect(extracted.value).toContain('tanvir@domain.com');
      expect(extracted.value).toContain('Banani, Dhaka-1213');

      // Verify line break preservation in XML
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file('word/document.xml')?.async('text');
      expect(documentXml).toBeDefined();
      expect(documentXml).toContain('<w:br/>');
    });

    it('generates real DOCX file with Bangla text and preserves Bengali script', async () => {
      const formValues = {
        fullName: 'তানভীর আহমেদ',
        email: 'tanvir.bd@domain.com',
        phone: '০১৮১১২২৩৩৪4',
        dateOfBirth: '১৯৯২-০৪-১২',
        presentAddress: 'বাড়ি ১২, রোড ৪\nবনানী, ঢাকা-১২১৩',
        profileSummary: 'সফটওয়্যার ডেভেলপমেন্ট ও ফিনটেক সলিউশনে ৫ বছরের বাস্তব অভিজ্ঞতা।',
      };

      const docxBlob = await generateFormDocxBlob(sampleCvTemplate, formValues, 'bn');
      const arrayBuffer = await docxBlob.arrayBuffer();
      const extracted = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });

      expect(extracted.value).toContain('স্ট্যান্ডার্ড প্রফেশনাল জীবনবৃত্তান্ত');
      expect(extracted.value).toContain('তানভীর আহমেদ');
      expect(extracted.value).toContain('বাড়ি ১২, রোড ৪');
      expect(extracted.value).toContain('ফিনটেক সলিউশন');
    });
  });

  describe('4. PDF generation with Bangla and English metadata', () => {
    it('generates real PDF file with English form data and valid binary structure', async () => {
      const formValues = {
        invoiceNo: 'INV-2026-9001',
        invoiceDate: '2026-09-29',
        customerName: 'Dhaka Tech Ltd',
        customerEmail: 'billing@dhakatech.com',
        customerPhone: '01700000000',
        billingAddress: 'Gulshan-1, Dhaka',
        totalAmount: 75000,
        invoiceNotes: 'Net 30 payment terms.',
      };

      const pdfBlob = await generateFormPdfBlob(sampleInvoiceTemplate, formValues, 'en');

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.size).toBeGreaterThan(500);
      expect(pdfBlob.type).toBe('application/pdf');

      // Verify PDF binary header and structure using pdf-lib
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      expect(headerStr).toBe('%PDF-');

      const loadedDoc = await PDFDocument.load(arrayBuffer);
      expect(loadedDoc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(loadedDoc.getTitle()).toContain(sampleInvoiceTemplate.title);
      expect(loadedDoc.getAuthor()).toBe('MAISHAA WORKSPACE');
    });

    it('generates real PDF file with Bangla form data and valid metadata', async () => {
      const formValues = {
        invoiceNo: 'চালান-২০২৬-৯০০১',
        invoiceDate: '২০২৬-০৯-২৯',
        customerName: 'ঢাকা টেক লিমিটেড',
        customerEmail: 'billing@dhakatech.com',
        customerPhone: '০১৭০০০০০০০০',
        billingAddress: 'গুলশান-১, ঢাকা',
        totalAmount: '৭৫০০০',
        invoiceNotes: '৩০ দিনের মধ্যে প্রদেয়।',
      };

      const pdfBlob = await generateFormPdfBlob(sampleInvoiceTemplate, formValues, 'bn');

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.size).toBeGreaterThan(500);

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const headerStr = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      expect(headerStr).toBe('%PDF-');

      const loadedDoc = await PDFDocument.load(arrayBuffer);
      expect(loadedDoc.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(loadedDoc.getTitle()).toBe(sampleInvoiceTemplate.titleBn);
    });
  });
});
