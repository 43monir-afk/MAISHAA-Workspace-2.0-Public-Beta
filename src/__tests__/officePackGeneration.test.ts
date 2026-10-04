import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  generateOfficePackFilename,
  generateOfficePackZipFilename,
  validateAndExtractSourceContent,
  parseCsvText,
  extractPdfTextFromBuffer,
  generateOfficePackDocx,
  generateOfficePackPdf,
  generateOfficePackXlsx,
  generateOfficePackPptx,
  executeOfficePackGeneration,
  createOfficePackZipBundle,
  createOfficePackBatchZipBundle,
  generateCollisionSafeFilename,
  processOfficePackBatchItem,
  executeOfficePackBatch,
  validateDocxQuality,
  validatePdfQuality,
  validateXlsxQuality,
  validatePptxQuality,
} from '../services/officePackGenerator';
import { buildOfficePackPlan } from '../services/officePackPlanner';
import { OFFICE_PACKS } from '../data/officePacks';
import { BatchSourceItem } from '../types/officePack';

describe('Phase 3 Step 3G — Source Extraction & Multi-Format Compatibility', () => {
  const projectPack = OFFICE_PACKS.find((p) => p.id === 'project_report')!;

  const sampleBanglaText = `প্রকল্পের শিরোনাম: ত্রৈমাসিক বাজেট ও মূল্যায়ন
১. নির্বাহী সারসংক্ষেপ:
এই কার্যপরিকল্পনায় প্রকল্পের অগ্রগতি ও সম্পদ বণ্টন বিস্তারিতভাবে সন্নিবেশ করা হয়েছে।
২. লক্ষ্য ও উদ্দেশ্য:
ডিজিটাল রূপান্তর ত্বরান্বিত করা এবং স্বচ্ছতা বৃদ্ধি করা।
রাজস্ব_লক্ষ্য: ৫০০০
ব্যয়_বরাদ্দ: ৩৫০০`;

  const sampleEnglishText = `Project Title: Quarterly Performance Review
1. Executive Summary:
This office pack summarizes milestones, budget allocations, and key deliverables.
2. Objectives:
Enhance digital operations with strict local client-side privacy.
Revenue_Target: 50000
Budget_Utilized: 32000`;

  const sampleMixedText = `প্রকল্প নিরীক্ষা ও পারফরম্যান্স রিপোর্ট (Performance Audit 2026)
1. নির্বাহী রূপরেখা (Executive Brief):
এই ত্রৈমাসিক পরিকল্পনায় ডিজিটাল রূপান্তরের সকল মাইলস্টোন অন্তর্ভুক্ত রয়েছে।
Key Performance Indicator: ৯০% অর্জন (90% Achieved)
Local Processing Status: Active Verified`;

  const sampleMdText = `# Annual Strategic Blueprint
## 1. Executive Direction
Accelerate internal modernization across ministries and organizations.
## 2. Resource Allocation
| Department | Budget Allocation | Status |
| Operations | 4500000 | Active |
| Research | 2200000 | Approved |`;

  const sampleCsvText = `Item,Department,Allocated_Budget,Status
১. সার্ভার আধুনিকায়ন,IT Infrastructure,250000,Approved
2. Digital Training,Human Resources,120000,Active
3. Security Audit,Cyber Defense,180000,Pending`;

  // 1. TXT Extraction
  it('extracts real UTF-8 text from TXT files and builds normalized source content', async () => {
    const txtFile = {
      name: 'strategy.txt',
      size: 350,
      textContent: sampleEnglishText,
    };

    const res = await validateAndExtractSourceContent(txtFile as any);
    expect(res.isValid).toBe(true);
    expect(res.isSupported).toBe(true);
    expect(res.status).toBe('READY');
    expect(res.extractedText).toContain('Quarterly Performance Review');

    const norm = res.normalized!;
    expect(norm.sourceType).toBe('txt');
    expect(norm.charCount).toBeGreaterThan(100);
    expect(norm.paragraphCount).toBeGreaterThanOrEqual(4);
    expect(norm.headings.length).toBeGreaterThan(0);
    expect(norm.headings[0]).toContain('Quarterly Performance Review');
  });

  // 2. MD Extraction
  it('extracts markdown text, headings, and tables from MD files', async () => {
    const mdFile = {
      name: 'blueprint.md',
      size: 400,
      textContent: sampleMdText,
    };

    const res = await validateAndExtractSourceContent(mdFile as any);
    expect(res.status).toBe('READY');
    expect(res.normalized?.sourceType).toBe('md');
    expect(res.normalized?.headings).toContain('Annual Strategic Blueprint');
    expect(res.normalized?.headings).toContain('1. Executive Direction');
    expect(res.normalized?.rows.length).toBeGreaterThanOrEqual(2);
  });

  // 3. CSV Extraction
  it('parses real CSV content with RFC 4180 compliance, headers, and rows', async () => {
    const csvFile = {
      name: 'finance_dataset.csv',
      size: 300,
      textContent: sampleCsvText,
    };

    const res = await validateAndExtractSourceContent(csvFile as any);
    expect(res.status).toBe('READY');
    expect(res.normalized?.sourceType).toBe('csv');
    expect(res.normalized?.rows.length).toBe(4);
    expect(res.normalized?.headings).toEqual(['Item', 'Department', 'Allocated_Budget', 'Status']);
    expect(res.extractedText).toContain('সার্ভার আধুনিকায়ন');

    // Test parseCsvText with quotes and commas
    const complexCsv = `"ID","Name, Title","Notes"\n"1","Director, IT","Bangla: প্রশিক্ষণ ও বাজেট"`;
    const rows = parseCsvText(complexCsv);
    expect(rows.length).toBe(2);
    expect(rows[1][1]).toBe('Director, IT');
    expect(rows[1][2]).toBe('Bangla: প্রশিক্ষণ ও বাজেট');
  });

  // 4. DOCX Extraction
  it('extracts real text, paragraphs, and headings from DOCX OpenXML packages', async () => {
    // Generate a valid mock DOCX package using JSZip
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types></Types>');
    zip.file(
      'word/document.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>১. নির্বাহী প্রতিবেদন (Executive Brief)</w:t></w:r></w:p>
          <w:p><w:r><w:t>এই প্রকল্পে সমস্ত কার্যক্রম ডিজিটাল পদ্ধতিতে পরিচালিত হবে।</w:t></w:r></w:p>
        </w:body>
      </w:document>`
    );
    const docxArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const docxFile = {
      name: 'executive_brief.docx',
      size: docxArrayBuffer.byteLength,
      arrayBuffer: async () => docxArrayBuffer,
    };

    const res = await validateAndExtractSourceContent(docxFile as any);
    expect(res.status).toBe('READY');
    expect(res.normalized?.sourceType).toBe('docx');
    expect(res.extractedText).toContain('নির্বাহী প্রতিবেদন');
    expect(res.normalized?.paragraphCount).toBeGreaterThanOrEqual(1);
  });

  // 5. Text-based PDF Extraction
  it('extracts embedded text from text-based PDF without OCR', async () => {
    // Generate a real text-based PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('Quarterly Financial Summary 2026', { x: 50, y: 350, font, size: 16 });
    page.drawText('Operational budget allocated cleanly to all departments.', { x: 50, y: 300, font, size: 12 });
    const pdfBytes = await pdfDoc.save();

    const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

    const pdfFile = {
      name: 'financial_summary.pdf',
      size: pdfBytes.length,
      arrayBuffer: async () => pdfBuffer,
    };

    const res = await validateAndExtractSourceContent(pdfFile as any);
    expect(res.status).toBe('READY');
    expect(res.normalized?.sourceType).toBe('pdf');
    expect(res.extractedText).toContain('Quarterly Financial Summary 2026');
  });

  // 6. Bangla Extraction
  it('preserves Bangla Unicode typography during text extraction', async () => {
    const banglaFile = {
      name: 'bangla_brief.txt',
      size: 400,
      textContent: sampleBanglaText,
    };

    const res = await validateAndExtractSourceContent(banglaFile as any);
    expect(res.status).toBe('READY');
    expect(res.extractedText).toContain('ত্রৈমাসিক বাজেট ও মূল্যায়ন');
    expect(res.extractedText).toContain('ডিজিটাল রূপান্তর');
    expect(res.normalized?.paragraphs.some((p) => p.includes('স্বচ্ছতা'))).toBe(true);
  });

  // 7. English Extraction
  it('preserves English characters, numbers, and layout outline', async () => {
    const engFile = {
      name: 'report_en.txt',
      size: 300,
      textContent: sampleEnglishText,
    };

    const res = await validateAndExtractSourceContent(engFile as any);
    expect(res.status).toBe('READY');
    expect(res.extractedText).toContain('Revenue_Target: 50000');
    expect(res.normalized?.headings.length).toBeGreaterThan(0);
  });

  // 8. Mixed Bangla + English Extraction
  it('cleanly handles mixed bilingual Bangla and English text', async () => {
    const mixedFile = {
      name: 'bilingual_audit.txt',
      size: 500,
      textContent: sampleMixedText,
    };

    const res = await validateAndExtractSourceContent(mixedFile as any);
    expect(res.status).toBe('READY');
    expect(res.extractedText).toContain('Performance Audit 2026');
    expect(res.extractedText).toContain('নির্বাহী রূপরেখা');
    expect(res.extractedText).toContain('Key Performance Indicator: ৯০% অর্জন (90% Achieved)');
  });

  // 9. Empty File Handling
  it('rejects empty files (0 bytes) with EMPTY status', async () => {
    const emptyFile = {
      name: 'blank.txt',
      size: 0,
      textContent: '',
    };

    const res = await validateAndExtractSourceContent(emptyFile as any);
    expect(res.isValid).toBe(false);
    expect(res.status).toBe('EMPTY');
    expect(res.error).toContain('empty (0 bytes)');
    expect(res.normalized?.extractionStatus).toBe('EMPTY');
  });

  // 10. Unsupported File Handling
  it('rejects unsupported file formats with NOT SUPPORTED status', async () => {
    const binFile = {
      name: 'firmware.bin',
      size: 1024,
    };

    const res = await validateAndExtractSourceContent(binFile as any);
    expect(res.isValid).toBe(false);
    expect(res.isSupported).toBe(false);
    expect(res.status).toBe('NOT SUPPORTED');
    expect(res.error).toContain('NOT SUPPORTED');
  });

  // 11. Image-only / Scanned PDF returns NOT SUPPORTED
  it('identifies image-only or scanned PDF and returns NOT SUPPORTED without fake text', async () => {
    const scannedPdfFile = {
      name: 'scanned_contract.pdf',
      size: 50000,
      isScanned: true,
      textContent: '[SCANNED_IMAGE_ONLY]',
    };

    const res = await validateAndExtractSourceContent(scannedPdfFile as any);
    expect(res.isValid).toBe(false);
    expect(res.isSupported).toBe(false);
    expect(res.status).toBe('NOT SUPPORTED');
    expect(res.error).toContain('OCR is not supported');
    expect(res.normalized?.extractionStatus).toBe('NOT SUPPORTED');
  });

  // 12. Extraction Failure Handling
  it('returns EXTRACTION FAILED when parsing corrupted documents', async () => {
    const corruptedDocx = {
      name: 'broken.docx',
      size: 500,
      arrayBuffer: async () => new Uint8Array([0x00, 0x11, 0x22, 0x33]).buffer,
    };

    const res = await validateAndExtractSourceContent(corruptedDocx as any);
    expect(res.isValid).toBe(false);
    expect(res.status).toBe('EXTRACTION FAILED');
    expect(res.error).toContain('EXTRACTION FAILED');
    expect(res.normalized?.extractionStatus).toBe('EXTRACTION FAILED');
  });

  // 13. Normalized Source Model
  it('populates full normalized source structure with charCount and paragraphCount', async () => {
    const file = {
      name: 'workplan.md',
      size: 400,
      textContent: sampleMdText,
    };

    const res = await validateAndExtractSourceContent(file as any);
    const norm = res.normalized!;
    expect(norm).toBeDefined();
    expect(typeof norm.title).toBe('string');
    expect(typeof norm.plainText).toBe('string');
    expect(Array.isArray(norm.paragraphs)).toBe(true);
    expect(Array.isArray(norm.headings)).toBe(true);
    expect(Array.isArray(norm.rows)).toBe(true);
    expect(norm.charCount).toBe(norm.plainText.length);
    expect(norm.paragraphCount).toBe(norm.paragraphs.length);
    expect(norm.sourceFileName).toBe('workplan.md');
    expect(norm.extractionStatus).toBe('READY');
  });

  // 14. Office Pack Generation from Extracted Source
  it('generates real office deliverables using extracted normalized source content', async () => {
    const mockSource = {
      name: 'quarterly_audit.txt',
      size: 300,
      textContent: sampleEnglishText,
    };

    const plan = buildOfficePackPlan(mockSource, 'project_report', [
      { format: 'docx', label: 'DOCX Report', enabled: true },
      { format: 'pdf', label: 'PDF Summary', enabled: true },
    ]);

    const result = await executeOfficePackGeneration(mockSource as any, plan, 'en');
    expect(result.success).toBe(true);
    expect(result.files.length).toBe(2);

    // Verify DOCX contains extracted source text
    const docxFile = result.files.find((f) => f.format === 'docx')!;
    const docxZip = await JSZip.loadAsync(docxFile.blob);
    const docxXml = await docxZip.file('word/document.xml')!.async('string');
    expect(docxXml).toContain('Quarterly Performance Review');
  });

  // 15. No Generation on Unsupported or Empty Source
  it('does not generate any deliverables when source extraction is NOT SUPPORTED or EMPTY', async () => {
    const unsupportedFile = {
      name: 'archive.tar',
      size: 1024,
    };

    const plan = buildOfficePackPlan(unsupportedFile, 'project_report', projectPack.defaultOutputs);
    const result = await executeOfficePackGeneration(unsupportedFile as any, plan, 'en');

    expect(result.success).toBe(false);
    expect(result.files.length).toBe(0);
    expect(result.unsupportedNotice).toContain('NOT SUPPORTED');
    expect(result.formatStatuses.docx.status).toBe('NOT SUPPORTED');
  });

  // 16. Existing Office Pack Regression & Download All ZIP
  it('maintains backwards compatibility for all 4 generators and ZIP bundling', async () => {
    const file = {
      name: 'full_deck.txt',
      size: 350,
      textContent: sampleEnglishText,
    };

    const plan = buildOfficePackPlan(file, 'business', [
      { format: 'docx', label: 'DOCX', enabled: true },
      { format: 'pdf', label: 'PDF', enabled: true },
      { format: 'xlsx', label: 'XLSX', enabled: true },
      { format: 'pptx', label: 'PPTX', enabled: true },
    ]);

    const result = await executeOfficePackGeneration(file as any, plan, 'en');
    expect(result.success).toBe(true);
    expect(result.files.length).toBe(4);

    const zipBundle = await createOfficePackZipBundle(result.files, plan.sourceFileName, plan.packType);
    expect(zipBundle.filename.endsWith('_bundle.zip')).toBe(true);

    const zip = await JSZip.loadAsync(zipBundle.blob);
    expect(Object.keys(zip.files).length).toBe(4);
  });

  // 17. Safe Filename Handling
  it('sanitizes unsafe filenames and path traversals', () => {
    const safeName = generateOfficePackFilename('../../../malicious/path?.txt', 'project_report', 'docx');
    expect(safeName).not.toContain('..');
    expect(safeName).not.toContain('?');
    expect(safeName.endsWith('.docx')).toBe(true);

    const safeZip = generateOfficePackZipFilename('../../attack/vector.doc', 'finance');
    expect(safeZip).not.toContain('..');
    expect(safeZip.endsWith('.zip')).toBe(true);
  });

  // ==========================================
  // Phase 3 Step 3H Quality Validation Tests
  // ==========================================

  // 18. Valid DOCX quality check
  it('validates a genuine DOCX and returns VALID with verified check list', async () => {
    const plan = buildOfficePackPlan(
      { name: 'valid_report.txt', size: 100, textContent: sampleEnglishText },
      'project_report',
      [{ format: 'docx', label: 'DOCX', enabled: true }]
    );
    const docxBlob = await generateOfficePackDocx(plan, sampleEnglishText, 'en');
    const quality = await validateDocxQuality(docxBlob, 'valid_report_project_report.docx', sampleEnglishText);

    expect(quality.format).toBe('docx');
    expect(quality.status).toBe('VALID');
    expect(quality.issues.length).toBe(0);
    expect(quality.checksPassed).toContain('Valid OpenXML ZIP package');
    expect(quality.checksPassed).toContain('word/document.xml present');
    expect(quality.checksPassed).toContain('Text body content verified');
  });

  // 19. Corrupt/Invalid DOCX detection
  it('detects corrupted or non-OpenXML DOCX and returns FAILED', async () => {
    const corruptedBlob = new Blob(['not a zip or docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const quality = await validateDocxQuality(corruptedBlob, 'fake.docx', sampleEnglishText);

    expect(quality.status).toBe('FAILED');
    expect(quality.issues.some((i) => i.code === 'CORRUPT_PACKAGE')).toBe(true);
  });

  // 20. Valid PDF quality check
  it('validates a genuine PDF and returns VALID with %PDF- signature and page count verified', async () => {
    const plan = buildOfficePackPlan(
      { name: 'summary.txt', size: 100, textContent: sampleEnglishText },
      'project_report',
      [{ format: 'pdf', label: 'PDF', enabled: true }]
    );
    const pdfBytes = await generateOfficePackPdf(plan, sampleEnglishText, 'en');
    const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const quality = await validatePdfQuality(pdfBlob, 'summary_project_report.pdf', sampleEnglishText);

    expect(quality.format).toBe('pdf');
    expect(quality.status).toBe('VALID');
    expect(quality.issues.length).toBe(0);
    expect(quality.checksPassed).toContain('Valid %PDF- header signature');
    expect(quality.checksPassed).toContain('PDF parsed by document engine');
  });

  // 21. Invalid PDF detection
  it('detects invalid PDF without %PDF- signature and returns FAILED', async () => {
    const fakePdfBlob = new Blob(['Plain text disguised as PDF'], { type: 'application/pdf' });
    const quality = await validatePdfQuality(fakePdfBlob, 'fake.pdf', sampleEnglishText);

    expect(quality.status).toBe('FAILED');
    expect(quality.issues.some((i) => i.code === 'INVALID_PDF_SIGNATURE')).toBe(true);
  });

  // 22. Valid XLSX quality check
  it('validates a genuine XLSX and returns VALID with verified worksheets and cell content', async () => {
    const plan = buildOfficePackPlan(
      { name: 'data.txt', size: 100, textContent: sampleEnglishText },
      'project_report',
      [{ format: 'xlsx', label: 'XLSX', enabled: true }]
    );
    const xlsxBlob = await generateOfficePackXlsx(plan, sampleEnglishText, 'en');
    const quality = await validateXlsxQuality(xlsxBlob, 'data_project_report.xlsx', sampleEnglishText);

    expect(quality.format).toBe('xlsx');
    expect(quality.status).toBe('VALID');
    expect(quality.issues.length).toBe(0);
    expect(quality.checksPassed).toContain('Valid OpenXML workbook structure');
    expect(quality.checksPassed).toContain('All sheet names compliant with Excel specification');
  });

  // 23. Empty workbook detection
  it('detects completely empty workbook and returns FAILED', async () => {
    const wb = XLSX.utils.book_new();
    const emptyWs = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, emptyWs, 'EmptySheet');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const emptyBlob = new Blob([out]);

    const quality = await validateXlsxQuality(emptyBlob, 'empty.xlsx', 'Some source');
    expect(quality.status).toBe('FAILED');
    expect(quality.issues.some((i) => i.code === 'EMPTY_WORKBOOK')).toBe(true);
  });

  // 24. Invalid sheet-name handling (forbidden Excel chars)
  it('detects forbidden Excel characters in sheet names and returns FAILED', async () => {
    // Build a valid workbook first
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Data', 123]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Original');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    // Open as zip and inject an invalid sheet name in xl/workbook.xml
    const zip = await JSZip.loadAsync(out);
    const wbXml = await zip.file('xl/workbook.xml')?.async('string');
    if (wbXml) {
      const modifiedXml = wbXml.replace('name="Original"', 'name="Invalid?Sheet*Name"');
      zip.file('xl/workbook.xml', modifiedXml);
    }
    const modifiedBytes = await zip.generateAsync({ type: 'arraybuffer' });
    const invalidBlob = new Blob([modifiedBytes]);

    const quality = await validateXlsxQuality(invalidBlob, 'invalid_sheet.xlsx', 'Some source');
    expect(quality.status).toBe('FAILED');
    expect(quality.issues.some((i) => i.code === 'FORBIDDEN_SHEET_NAME_CHARS')).toBe(true);
  });

  // 25. Valid PPTX quality check
  it('validates a genuine PPTX presentation and returns VALID with editable slide text verified', async () => {
    const plan = buildOfficePackPlan(
      { name: 'deck.txt', size: 100, textContent: sampleEnglishText },
      'project_report',
      [{ format: 'pptx', label: 'PPTX', enabled: true }]
    );
    const pptxBlob = await generateOfficePackPptx(plan, sampleEnglishText, 'en');
    const quality = await validatePptxQuality(pptxBlob, 'deck_project_report.pptx', sampleEnglishText);

    expect(quality.format).toBe('pptx');
    expect(quality.status).toBe('VALID');
    expect(quality.issues.length).toBe(0);
    expect(quality.checksPassed).toContain('Valid OpenXML presentation package');
    expect(quality.checksPassed).toContain('ppt/presentation.xml present');
    expect(quality.checksPassed).toContain('Editable text preserved in slide shapes');
  });

  // 26. Empty PPTX detection
  it('detects PPTX package with zero slides and returns FAILED', async () => {
    const emptyZip = new JSZip();
    emptyZip.file('ppt/presentation.xml', '<p:presentation></p:presentation>');
    const buf = await emptyZip.generateAsync({ type: 'arraybuffer' });
    const emptyPptxBlob = new Blob([buf]);

    const quality = await validatePptxQuality(emptyPptxBlob, 'empty.pptx', 'Some text');
    expect(quality.status).toBe('FAILED');
    expect(quality.issues.some((i) => i.code === 'ZERO_SLIDES')).toBe(true);
  });

  // 27. PPTX overflow warning heuristic
  it('triggers a WARNING when PPTX slides contain excessively dense content', async () => {
    const excessiveText = 'Very long text block repeat '.repeat(40);
    const fakeZip = new JSZip();
    fakeZip.file('ppt/presentation.xml', '<p:presentation></p:presentation>');
    fakeZip.file(
      'ppt/slides/slide1.xml',
      `<p:sld><p:spTree><p:sp><p:txBody><a:p><a:t>${excessiveText}</a:t></a:p></p:txBody></p:sp></p:spTree></p:sld>`
    );
    const buf = await fakeZip.generateAsync({ type: 'arraybuffer' });
    const overflowBlob = new Blob([buf]);

    const quality = await validatePptxQuality(overflowBlob, 'overflow.pptx', 'Some text');
    expect(quality.status).toBe('WARNING');
    expect(quality.issues.some((i) => i.code === 'SLIDE_OVERFLOW_RISK')).toBe(true);
  });

  // 28. Bangla regression across quality checks
  it('validates Bangla Unicode preservation without quality failure across all formats', async () => {
    const banglaPlan = buildOfficePackPlan(
      { name: 'bangla.txt', size: 100, textContent: sampleBanglaText },
      'project_report',
      [
        { format: 'docx', label: 'DOCX', enabled: true },
        { format: 'xlsx', label: 'XLSX', enabled: true },
        { format: 'pptx', label: 'PPTX', enabled: true },
      ]
    );

    const docxBlob = await generateOfficePackDocx(banglaPlan, sampleBanglaText, 'bn');
    const docxQuality = await validateDocxQuality(docxBlob, 'bangla.docx', sampleBanglaText);
    expect(docxQuality.status).toBe('VALID');
    expect(docxQuality.checksPassed).toContain('Bangla Unicode text preserved');

    const xlsxBlob = await generateOfficePackXlsx(banglaPlan, sampleBanglaText, 'bn');
    const xlsxQuality = await validateXlsxQuality(xlsxBlob, 'bangla.xlsx', sampleBanglaText);
    expect(xlsxQuality.status).toBe('VALID');
    expect(xlsxQuality.checksPassed).toContain('Bangla Unicode text preserved in spreadsheet');

    const pptxBlob = await generateOfficePackPptx(banglaPlan, sampleBanglaText, 'bn');
    const pptxQuality = await validatePptxQuality(pptxBlob, 'bangla.pptx', sampleBanglaText);
    expect(pptxQuality.status).toBe('VALID');
    expect(pptxQuality.checksPassed).toContain('Bangla Unicode text preserved in presentation');
  });

  // 29. English regression across quality checks
  it('validates English text preservation without quality degradation', async () => {
    const engPlan = buildOfficePackPlan(
      { name: 'english.txt', size: 100, textContent: sampleEnglishText },
      'project_report',
      [{ format: 'docx', label: 'DOCX', enabled: true }]
    );
    const docxBlob = await generateOfficePackDocx(engPlan, sampleEnglishText, 'en');
    const docxQuality = await validateDocxQuality(docxBlob, 'english.docx', sampleEnglishText);
    expect(docxQuality.status).toBe('VALID');
    expect(docxQuality.checksPassed).toContain('Text body content verified');
  });

  // 30. WARNING remains downloadable and Download All ZIP excludes FAILED output
  it('allows WARNING outputs in Download All ZIP while strictly excluding FAILED outputs', async () => {
    const validFile: any = {
      format: 'docx',
      filename: 'report.docx',
      blob: new Blob(['valid docx']),
      size: 10,
      qualityReport: { format: 'docx', status: 'VALID', issues: [], checksPassed: ['All good'] },
    };

    const warningFile: any = {
      format: 'xlsx',
      filename: 'sheet.xlsx',
      blob: new Blob(['warning sheet']),
      size: 13,
      qualityReport: {
        format: 'xlsx',
        status: 'WARNING',
        issues: [{ code: 'NARROW_COLUMN', message: 'Narrow column', severity: 'WARNING' }],
        checksPassed: ['Parsed'],
      },
    };

    const failedFile: any = {
      format: 'pptx',
      filename: 'corrupted.pptx',
      blob: new Blob(['corrupted pptx']),
      size: 14,
      qualityReport: {
        format: 'pptx',
        status: 'FAILED',
        issues: [{ code: 'CORRUPT_PRESENTATION', message: 'Corrupt', severity: 'FAILED' }],
        checksPassed: [],
      },
    };

    const files = [validFile, warningFile, failedFile];
    const zipBundle = await createOfficePackZipBundle(files, 'test.txt', 'project_report');

    const zip = await JSZip.loadAsync(zipBundle.blob);
    const zippedFiles = Object.keys(zip.files);

    expect(zippedFiles).toContain('report.docx');
    expect(zippedFiles).toContain('sheet.xlsx');
    expect(zippedFiles).not.toContain('corrupted.pptx');
  });

  // 31. Safe filename validation in quality checkers
  it('detects invalid extension and long filename warnings in quality checkers', async () => {
    const emptyBlob = new Blob(['content']);
    const quality = await validateDocxQuality(emptyBlob, 'bad_file.txt', 'source');
    expect(quality.issues.some((i) => i.code === 'INVALID_EXTENSION')).toBe(true);

    const longName = 'a'.repeat(105) + '.pdf';
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 400]);
    const pdfBytes = await pdfDoc.save();
    const validPdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const pdfQuality = await validatePdfQuality(validPdfBlob, longName, 'source');
    expect(pdfQuality.issues.some((i) => i.code === 'LONG_FILENAME')).toBe(true);
  });

  // 32. Multiple valid source files processed in batch
  it('processes multiple valid source files independently in a batch job', async () => {
    const item1: BatchSourceItem = {
      id: 'item-1',
      file: { name: 'report1.txt', size: 100, textContent: sampleEnglishText },
      originalFilename: 'report1.txt',
      safeFilename: 'report1.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx', 'xlsx'],
      generatedFiles: [],
    };

    const item2: BatchSourceItem = {
      id: 'item-2',
      file: { name: 'report2.txt', size: 100, textContent: sampleBanglaText },
      originalFilename: 'report2.txt',
      safeFilename: 'report2.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx', 'xlsx'],
      generatedFiles: [],
    };

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
      { id: 'out-xlsx', format: 'xlsx' as const, label: 'XLSX', labelBn: 'XLSX', description: '', descriptionBn: '', enabled: true },
    ];

    const results = await executeOfficePackBatch({
      items: [item1, item2],
      packType: 'project_report',
      targetOutputs: outputs,
    });

    expect(results.length).toBe(2);
    expect(results[0].status).toBe('COMPLETED');
    expect(results[0].generatedFiles.length).toBe(2);
    expect(results[1].status).toBe('COMPLETED');
    expect(results[1].generatedFiles.length).toBe(2);
  });

  // 33. Mixed supported and unsupported sources
  it('handles mixed supported and unsupported sources marking unsupported items appropriately', async () => {
    const validItem: BatchSourceItem = {
      id: 'valid-1',
      file: { name: 'valid.txt', size: 100, textContent: sampleEnglishText },
      originalFilename: 'valid.txt',
      safeFilename: 'valid.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const unsupportedItem: BatchSourceItem = {
      id: 'unsupported-1',
      file: { name: 'binary.exe', size: 500 },
      originalFilename: 'binary.exe',
      safeFilename: 'binary.exe',
      sourceType: 'unsupported',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
    ];

    const results = await executeOfficePackBatch({
      items: [validItem, unsupportedItem],
      packType: 'project_report',
      targetOutputs: outputs,
    });

    expect(results[0].status).toBe('COMPLETED');
    expect(results[0].generatedFiles.length).toBe(1);
    expect(results[1].status).toBe('NOT SUPPORTED');
    expect(results[1].generatedFiles.length).toBe(0);
  });

  // 34. One failed file does not stop batch
  it('ensures failure in one item does not stop subsequent batch items from processing', async () => {
    const emptyItem: BatchSourceItem = {
      id: 'empty-1',
      file: { name: 'empty.txt', size: 0, textContent: '' },
      originalFilename: 'empty.txt',
      safeFilename: 'empty.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const validItem: BatchSourceItem = {
      id: 'valid-2',
      file: { name: 'valid2.txt', size: 100, textContent: sampleEnglishText },
      originalFilename: 'valid2.txt',
      safeFilename: 'valid2.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
    ];

    const results = await executeOfficePackBatch({
      items: [emptyItem, validItem],
      packType: 'project_report',
      targetOutputs: outputs,
    });

    expect(results[0].status).toBe('FAILED');
    expect(results[0].extractionStatus).toBe('EMPTY');
    expect(results[1].status).toBe('COMPLETED');
    expect(results[1].generatedFiles.length).toBe(1);
  });

  // 35. Selective outputs per batch item
  it('generates only the selectively configured outputs across batch processing', async () => {
    const item: BatchSourceItem = {
      id: 'selective-1',
      file: { name: 'report.txt', size: 100, textContent: sampleEnglishText },
      originalFilename: 'report.txt',
      safeFilename: 'report.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: [],
      generatedFiles: [],
    };

    // Configure only XLSX
    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: false },
      { id: 'out-xlsx', format: 'xlsx' as const, label: 'XLSX', labelBn: 'XLSX', description: '', descriptionBn: '', enabled: true },
    ];

    const result = await processOfficePackBatchItem({
      item,
      packType: 'project_report',
      targetOutputs: outputs,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.generatedFiles.length).toBe(1);
    expect(result.generatedFiles[0].format).toBe('xlsx');
    expect(result.formatStatuses?.docx.status).toBe('Not Selected');
    expect(result.formatStatuses?.xlsx.status).toBe('Generated');
  });

  // 36. Bangla batch source processing
  it('processes a Bangla batch source file with full Unicode verification', async () => {
    const item: BatchSourceItem = {
      id: 'bn-1',
      file: { name: 'bangla_doc.txt', size: 120, textContent: sampleBanglaText },
      originalFilename: 'bangla_doc.txt',
      safeFilename: 'bangla_doc.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx', 'xlsx'],
      generatedFiles: [],
    };

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
      { id: 'out-xlsx', format: 'xlsx' as const, label: 'XLSX', labelBn: 'XLSX', description: '', descriptionBn: '', enabled: true },
    ];

    const result = await processOfficePackBatchItem({
      item,
      packType: 'project_report',
      targetOutputs: outputs,
      language: 'bn',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.qualityReports?.docx.status).toBe('VALID');
    expect(result.qualityReports?.xlsx.status).toBe('VALID');
  });

  // 37. English batch source processing
  it('processes an English batch source preserving structure and formatting', async () => {
    const item: BatchSourceItem = {
      id: 'en-1',
      file: { name: 'english_doc.txt', size: 120, textContent: sampleEnglishText },
      originalFilename: 'english_doc.txt',
      safeFilename: 'english_doc.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
    ];

    const result = await processOfficePackBatchItem({
      item,
      packType: 'project_report',
      targetOutputs: outputs,
      language: 'en',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.qualityReports?.docx.checksPassed).toContain('Valid OpenXML ZIP package');
  });

  // 38. Duplicate source filenames & collision-safe output names
  it('generates collision-safe filenames when duplicate input names are provided', () => {
    const existing = new Set<string>();
    const name1 = generateCollisionSafeFilename('quarterly_report.docx', existing);
    const name2 = generateCollisionSafeFilename('quarterly_report.docx', existing);
    const name3 = generateCollisionSafeFilename('quarterly_report.docx', existing);

    expect(name1).toBe('quarterly_report.docx');
    expect(name2).toBe('quarterly_report_2.docx');
    expect(name3).toBe('quarterly_report_3.docx');
  });

  // 39. Per-file Download All ZIP bundle
  it('creates a ZIP bundle for an individual batch item containing its valid outputs only', async () => {
    const validFile1 = {
      format: 'docx' as const,
      filename: 'report.docx',
      blob: new Blob(['docx']),
      size: 4,
      qualityReport: { format: 'docx' as const, status: 'VALID' as const, issues: [], checksPassed: [] },
    };
    const validFile2 = {
      format: 'pdf' as const,
      filename: 'report.pdf',
      blob: new Blob(['pdf']),
      size: 3,
      qualityReport: { format: 'pdf' as const, status: 'VALID' as const, issues: [], checksPassed: [] },
    };

    const zipBundle = await createOfficePackZipBundle([validFile1, validFile2], 'report.docx', 'project_report');
    const zip = await JSZip.loadAsync(zipBundle.blob);
    const files = Object.keys(zip.files);

    expect(files).toContain('report.docx');
    expect(files).toContain('report.pdf');
  });

  // 40. Batch Download ZIP with clean folder structure & exclusion of FAILED/NOT SUPPORTED
  it('creates Master Batch Download ZIP with structured folders excluding FAILED and NOT SUPPORTED files', async () => {
    const item1: BatchSourceItem = {
      id: 'b-1',
      file: { name: 'source1.txt', size: 100 },
      originalFilename: 'source1.txt',
      safeFilename: 'source1.txt',
      sourceType: 'txt',
      status: 'COMPLETED',
      selectedOutputs: ['docx'],
      generatedFiles: [
        {
          format: 'docx',
          filename: 'source1.docx',
          blob: new Blob(['content 1']),
          size: 9,
          qualityReport: { format: 'docx', status: 'VALID', issues: [], checksPassed: [] },
        },
      ],
    };

    const item2: BatchSourceItem = {
      id: 'b-2',
      file: { name: 'source2.txt', size: 100 },
      originalFilename: 'source2.txt',
      safeFilename: 'source2.txt',
      sourceType: 'txt',
      status: 'PARTIAL',
      selectedOutputs: ['docx', 'pptx'],
      generatedFiles: [
        {
          format: 'docx',
          filename: 'source2.docx',
          blob: new Blob(['content 2']),
          size: 9,
          qualityReport: { format: 'docx', status: 'VALID', issues: [], checksPassed: [] },
        },
        {
          format: 'pptx',
          filename: 'source2.pptx',
          blob: new Blob(['corrupt']),
          size: 7,
          qualityReport: {
            format: 'pptx',
            status: 'FAILED',
            issues: [{ code: 'CORRUPT', message: 'Fail', severity: 'FAILED' }],
            checksPassed: [],
          },
        },
      ],
    };

    const item3: BatchSourceItem = {
      id: 'b-3',
      file: { name: 'unsupported.exe', size: 200 },
      originalFilename: 'unsupported.exe',
      safeFilename: 'unsupported.exe',
      sourceType: 'unsupported',
      status: 'NOT SUPPORTED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const batchZip = await createOfficePackBatchZipBundle([item1, item2, item3], 'project_report');
    expect(batchZip.fileCount).toBe(2);

    const zip = await JSZip.loadAsync(batchZip.blob);
    const zippedNames = Object.keys(zip.files);

    // Verify root folder and clean subfolder paths
    expect(zippedNames.some((n) => n.startsWith('MAISHAA_Office_Pack_Batch/source1/source1.docx'))).toBe(true);
    expect(zippedNames.some((n) => n.startsWith('MAISHAA_Office_Pack_Batch/source2/source2.docx'))).toBe(true);
    // Verify FAILED file is excluded
    expect(zippedNames.some((n) => n.includes('source2.pptx'))).toBe(false);
    // Verify NOT SUPPORTED item has no folder or fake deliverables
    expect(zippedNames.some((n) => n.includes('unsupported'))).toBe(false);
  });

  // 41. Duplicate folder names handled gracefully in Batch Download ZIP
  it('deduplicates subfolder names when duplicate safeFilenames occur in batch ZIP', async () => {
    const item1: BatchSourceItem = {
      id: 'dup-1',
      file: { name: 'report.txt', size: 50 },
      originalFilename: 'report.txt',
      safeFilename: 'report.txt',
      sourceType: 'txt',
      status: 'COMPLETED',
      selectedOutputs: ['docx'],
      generatedFiles: [
        {
          format: 'docx',
          filename: 'report.docx',
          blob: new Blob(['doc 1']),
          size: 5,
          qualityReport: { format: 'docx', status: 'VALID', issues: [], checksPassed: [] },
        },
      ],
    };

    const item2: BatchSourceItem = {
      id: 'dup-2',
      file: { name: 'report.txt', size: 50 },
      originalFilename: 'report.txt',
      safeFilename: 'report.txt',
      sourceType: 'txt',
      status: 'COMPLETED',
      selectedOutputs: ['docx'],
      generatedFiles: [
        {
          format: 'docx',
          filename: 'report.docx',
          blob: new Blob(['doc 2']),
          size: 5,
          qualityReport: { format: 'docx', status: 'VALID', issues: [], checksPassed: [] },
        },
      ],
    };

    const batchZip = await createOfficePackBatchZipBundle([item1, item2], 'project_report');
    const zip = await JSZip.loadAsync(batchZip.blob);
    const zippedNames = Object.keys(zip.files);

    expect(zippedNames.some((n) => n.startsWith('MAISHAA_Office_Pack_Batch/report/'))).toBe(true);
    expect(zippedNames.some((n) => n.startsWith('MAISHAA_Office_Pack_Batch/report_2/'))).toBe(true);
  });

  // 42. Cancellation behavior in executeOfficePackBatch
  it('stops processing remaining queued items when shouldCancel returns true', async () => {
    const item1: BatchSourceItem = {
      id: 'c-1',
      file: { name: 'doc1.txt', size: 50, textContent: sampleEnglishText },
      originalFilename: 'doc1.txt',
      safeFilename: 'doc1.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    const item2: BatchSourceItem = {
      id: 'c-2',
      file: { name: 'doc2.txt', size: 50, textContent: sampleEnglishText },
      originalFilename: 'doc2.txt',
      safeFilename: 'doc2.txt',
      sourceType: 'txt',
      status: 'QUEUED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
    };

    let cancelRequested = false;

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
    ];

    const results = await executeOfficePackBatch({
      items: [item1, item2],
      packType: 'project_report',
      targetOutputs: outputs,
      onItemProgress: (idx) => {
        if (idx === 0) cancelRequested = true;
      },
      shouldCancel: () => cancelRequested,
    });

    expect(results[0].status).toBe('COMPLETED');
    expect(results[1].status).toBe('CANCELLED');
  });

  // 43. Retry failed individual source item
  it('allows retrying a failed source item independently without affecting others', async () => {
    const failedItem: BatchSourceItem = {
      id: 'retry-1',
      file: { name: 'repaired.txt', size: 80, textContent: sampleEnglishText },
      originalFilename: 'repaired.txt',
      safeFilename: 'repaired.txt',
      sourceType: 'txt',
      status: 'FAILED',
      selectedOutputs: ['docx'],
      generatedFiles: [],
      error: 'Previous network or memory error',
    };

    const outputs = [
      { id: 'out-docx', format: 'docx' as const, label: 'DOCX', labelBn: 'DOCX', description: '', descriptionBn: '', enabled: true },
    ];

    const retried = await processOfficePackBatchItem({
      item: failedItem,
      packType: 'project_report',
      targetOutputs: outputs,
    });

    expect(retried.status).toBe('COMPLETED');
    expect(retried.generatedFiles.length).toBe(1);
    expect(retried.error).toBeUndefined();
  });
});

