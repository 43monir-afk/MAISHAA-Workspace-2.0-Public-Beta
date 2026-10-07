/**
 * MAISHAA WORKSPACE 2 - Word-to-PDF Bangla Unicode & Complex Script Integrity Test Suite
 * 
 * Verifies:
 * 1. DOCX Extraction Pipeline preserves Unicode text runs, merges split runs, and decodes XML entities.
 * 2. Pre-render validation prevents generating corrupted PDFs with FFFFFFF / ?????? / replacement boxes.
 * 3. Bangla-capable OpenType shaping embeds Noto Sans Bengali with complete ToUnicode CMap.
 * 4. Complex Bangla conjuncts (ক্ষ, জ্ঞ, ত্র, শ্র, ক্ত, ন্দ্র, প্র, গ্র, ক্র) and vowel signs render accurately.
 * 5. PDF text extraction verification: extracted PDF text contains the original Unicode strings.
 * 6. End-to-end Unicode preservation using a synthetic fixture.
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { exportToPdf } from '../services/directExportService';
import { extractPdfText } from '../services/pdfService';
import { convertDocxToPdf } from '../services/conversionService';
import {
  parseDocxDocument,
  extractDocxOpenXmlText,
  decodeXmlEntities,
  validateUnicodeExtraction,
} from '../services/docIntelService';

/**
 * Creates an in-memory DOCX file from XML paragraphs.
 */
async function createTestDocxFile(
  paragraphs: string[],
  filename = 'demo-fixture.docx'
): Promise<File> {
  const zip = new JSZip();

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

  const bodyXml = paragraphs.map((p) => `<w:p>${p}</w:p>`).join('');
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}</w:body>
</w:document>`;

  zip.folder('word')?.file('document.xml', docXml);

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new File([arrayBuffer], filename, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

describe('Word-to-PDF Bangla Unicode Integrity Suite', () => {
  describe('1. DOCX Extraction Pipeline & Run Preservation', () => {
    it('decodes XML entities including decimal and hexadecimal numeric entities', () => {
      const xml = 'বাংলাদেশ &amp; &lt;ঢাকা&gt; &quot;বাংলা&quot; &apos;মা&apos; &#x0995;&#x09CD;&#x09B7;';
      const decoded = decodeXmlEntities(xml);
      expect(decoded).toBe('বাংলাদেশ & <ঢাকা> "বাংলা" \'মা\' ক্ষ');
    });

    it('merges Word text runs that split a single Bangla word across multiple <w:r> elements without inserting spaces', async () => {
      // Simulate Word splitting "নমুনা" across runs: "নমু" + "না"
      const docxFile = await createTestDocxFile([
        '<w:r><w:t>নমু</w:t></w:r><w:r><w:t>না </w:t></w:r><w:r><w:t>ব্যক্তি</w:t></w:r>',
      ]);

      const buffer = await docxFile.arrayBuffer();
      const extracted = await extractDocxOpenXmlText(buffer);

      expect(extracted.text).toContain('নমুনা ব্যক্তি');
      expect(extracted.text).not.toContain('নমু না');
      expect(extracted.text).not.toContain('FFFFF');
    });

    it('extracts multi-run mixed content with dates, numbers, and punctuation accurately', async () => {
      const docxFile = await createTestDocxFile([
        '<w:r><w:t>Reference No. </w:t></w:r><w:r><w:t>TEST-000001</w:t></w:r>',
        '<w:r><w:t>তারিখ: </w:t></w:r><w:r><w:t>০১ জানুয়ারি ২০০০</w:t></w:r>',
        '<w:r><w:t>বর্তমান ঠিকানা: নমুনা শহর, স্থায়ী ঠিকানা: নমুনা জেলা</w:t></w:r>',
      ]);

      const analysis = await parseDocxDocument(docxFile);
      expect(analysis.extractedText).toContain('Reference No. TEST-000001');
      expect(analysis.extractedText).toContain('তারিখ: ০১ জানুয়ারি ২০০০');
      expect(analysis.extractedText).toContain('বর্তমান ঠিকানা: নমুনা শহর');
      expect(analysis.extractedText).toContain('স্থায়ী ঠিকানা: নমুনা জেলা');
    });
  });

  describe('2. Pre-Render Validation & Unicode Integrity Check', () => {
    it('throws the expected error if extracted Bangla text contains corrupted FFFFFF sequences', () => {
      const corruptedText = 'নমুনা ব্যক্তি FFFFFFF FFFFF পিতা মাতা';
      expect(() => {
        validateUnicodeExtraction(corruptedText, 'test.docx');
      }).toThrow('Bangla text extraction failed. PDF was not generated to prevent corrupted output.');
    });

    it('throws the expected error if extracted Bangla text contains corrupted ????? or replacement boxes', () => {
      const corruptedQ = 'বাংলাদেশ ?????? পিতা';
      expect(() => {
        validateUnicodeExtraction(corruptedQ);
      }).toThrow('Bangla text extraction failed. PDF was not generated to prevent corrupted output.');

      const corruptedBox = 'বাংলাদেশ □□□ পিতা';
      expect(() => {
        validateUnicodeExtraction(corruptedBox);
      }).toThrow('Bangla text extraction failed. PDF was not generated to prevent corrupted output.');
    });

    it('passes clean Unicode text without throwing', () => {
      expect(() => {
        validateUnicodeExtraction('নমুনা আবেদনকারী — পিতা: করিম, মাতা: রহিমা, তারিখ: ০১ জানুয়ারি ২০০০');
      }).not.toThrow();
    });
  });

  describe('3. Complex Bangla Conjuncts & OpenType Shaping in PDF Direct Export', () => {
    it('renders complex conjuncts (ক্ষ, জ্ঞ, ত্র, শ্র, ক্ত, ন্দ্র, প্র, গ্র, ক্র) with valid ToUnicode CMap and extracts them back', async () => {
      const conjunctsText = '# জটিল যুক্তাক্ষর টেস্ট\n\nক্ষ জ্ঞ ত্র শ্র ক্ত ন্দ্র প্র গ্র ক্র';

      const exportResult = await exportToPdf(conjunctsText, {
        title: 'যুক্তাক্ষর টেস্ট',
        sourceFilename: 'conjuncts_test.docx',
      });

      expect(exportResult.blob).toBeDefined();
      expect(exportResult.blob.size).toBeGreaterThan(1000);

      // Verify text extraction from generated PDF
      const pdfFile = new File([exportResult.blob], 'conjuncts.pdf', { type: 'application/pdf' });
      const extracted = await extractPdfText(pdfFile);

      // Verify none of the conjuncts became FFFFF
      expect(extracted.fullText).not.toContain('FFFFF');
      expect(extracted.fullText).not.toContain('???');

      // Verify each conjunct is retained
      const expectedConjuncts = ['ক্ষ', 'জ্ঞ', 'ত্র', 'শ্র', 'ক্ত', 'ন্দ্র', 'প্র', 'গ্র', 'ক্র'];
      for (const conj of expectedConjuncts) {
        expect(extracted.fullText).toContain(conj);
      }
    });

    it('renders real Bangla administrative and personal identity strings accurately', async () => {
      const testDocument = `# প্রত্যয়নপত্র\n\n` +
        `নাম: নমুনা আবেদনকারী\n` +
        `পিতা: নমুনা ব্যক্তি\n` +
        `মাতা: নমুনা ব্যক্তি\n` +
        `বর্তমান ঠিকানা: নমুনা শহর\n` +
        `স্থায়ী ঠিকানা: নমুনা জেলা\n` +
        `তারিখ: ০১ জানুয়ারি ২০০০\n` +
        `দেশ: বাংলাদেশ\n` +
        `Reference No. TEST-000001\n` +
        `City: Sample City, Bangladesh`;

      const exportResult = await exportToPdf(testDocument, {
        title: 'প্রত্যয়নপত্র',
        sourceFilename: 'certificate.docx',
      });

      const pdfFile = new File([exportResult.blob], 'certificate.pdf', { type: 'application/pdf' });
      const extracted = await extractPdfText(pdfFile);

      expect(extracted.fullText).not.toContain('FFFFF');
      expect(extracted.fullText).toContain('নমুনা আবেদনকারী');
      expect(extracted.fullText).toContain('পিতা');
      expect(extracted.fullText).toContain('মাতা');
      expect(extracted.fullText).toContain('বর্তমান ঠিকানা');
      expect(extracted.fullText).toContain('স্থায়ী ঠিকানা');
      expect(extracted.fullText).toContain('০১ জানুয়ারি ২০০০');
      expect(extracted.fullText).toContain('বাংলাদেশ');
      expect(extracted.fullText).toContain('Reference No. TEST-000001');
      expect(extracted.fullText).toContain('Sample City, Bangladesh');
    });
  });

  describe('4. Full End-to-End Word-to-PDF Conversion (Sample Applicant Fixture)', () => {
    it('converts demo-applicant-fi-fixture.docx to PDF with complete Unicode preservation', async () => {
      const docxFile = await createTestDocxFile(
        [
          '<w:r><w:t>Curriculum Vitae — Sample Applicant</w:t></w:r>',
          '<w:r><w:t>নাম: নমুনা আবেদনকারী</w:t></w:r>',
          '<w:r><w:t>পিতা: নমুনা ব্যক্তি</w:t></w:r>',
          '<w:r><w:t>মাতা: নমুনা ব্যক্তি</w:t></w:r>',
          '<w:r><w:t>বর্তমান ঠিকানা: নমুনা শহর, বাংলাদেশ</w:t></w:r>',
          '<w:r><w:t>স্থায়ী ঠিকানা: নমুনা জেলা, বাংলাদেশ</w:t></w:r>',
          '<w:r><w:t>তারিখ: ০১ জানুয়ারি ২০০০</w:t></w:r>',
          '<w:r><w:t>Reference No. TEST-000001</w:t></w:r>',
          '<w:r><w:t>Destination: Sample City, Finland</w:t></w:r>',
        ],
        'demo-applicant-fi-fixture.docx'
      );

      const convResult = await convertDocxToPdf(docxFile);

      expect(convResult.outputFilename).toBe('demo-applicant-fi-fixture-converted.pdf');
      expect(convResult.blob.size).toBeGreaterThan(1000);

      // Verify text extracted back from the converted PDF
      const pdfFile = new File([convResult.blob], convResult.outputFilename, { type: 'application/pdf' });
      const extracted = await extractPdfText(pdfFile);

      // The extracted PDF text MUST contain original Bangla and English, NEVER FFFFF
      expect(extracted.fullText).not.toContain('FFFFF');
      expect(extracted.fullText).not.toContain('????');
      expect(extracted.fullText).toContain('নমুনা আবেদনকারী');
      expect(extracted.fullText).toContain('পিতা');
      expect(extracted.fullText).toContain('মাতা');
      expect(extracted.fullText).toContain('বর্তমান ঠিকানা');
      expect(extracted.fullText).toContain('স্থায়ী ঠিকানা');
      expect(extracted.fullText).toContain('০১ জানুয়ারি ২০০০');
      expect(extracted.fullText).toContain('বাংলাদেশ');
      expect(extracted.fullText).toContain('Reference No. TEST-000001');
    });
  });
});
