import { describe, it, expect } from 'vitest';
import {
  routeTask,
  detectTaskIntent,
  generateWorkflowPlan,
  planSmartTask,
  generateSmartSuggestions,
  INTENT_CAPABILITIES,
} from '../services/taskRouter';
import {
  classifyDocument,
  detectDocumentType,
} from '../services/classificationService';

describe('Phase 3 Step 1B — Deterministic Smart Task Router', () => {
  describe('Structured routeTask outputs (detectedIntent, confidence, requiredCapabilities)', () => {
    it('returns structured result for Bangla PDF summary', () => {
      const res = routeTask('এই PDF থেকে summary বানাও');
      expect(res.detectedIntent).toBe('PDF_SUMMARY');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toEqual(INTENT_CAPABILITIES.PDF_SUMMARY);
    });

    it('returns structured result for English OCR', () => {
      const res = routeTask('Extract text via OCR from scanned document');
      expect(res.detectedIntent).toBe('OCR');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toContain('tesseract');
    });

    it('returns structured result for PDF Split', () => {
      const res = routeTask('পৃষ্ঠা আলাদা করো split pages');
      expect(res.detectedIntent).toBe('PDF_SPLIT');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toContain('pdf_split');
    });

    it('returns structured result for Image Resize', () => {
      const res = routeTask('Resize image to 800px width');
      expect(res.detectedIntent).toBe('IMAGE_RESIZE');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toContain('canvas_resampling');
    });

    it('returns structured result for Image Convert', () => {
      const res = routeTask('Convert image to WebP');
      expect(res.detectedIntent).toBe('IMAGE_CONVERT');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toContain('format_transcoding');
    });

    it('returns structured result for Document Analysis', () => {
      const res = routeTask('Check word file docx word count');
      expect(res.detectedIntent).toBe('DOCUMENT_ANALYSIS');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toContain('docx_parser');
    });

    it('returns structured result for Translation', () => {
      const res = routeTask('এই নথি বাংলায় translate করো');
      expect(res.detectedIntent).toBe('TRANSLATION');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.requiredCapabilities).toContain('bilingual_translation');
    });

    it('returns UNKNOWN with baseline confidence when input cannot be resolved', () => {
      const res = routeTask('hello some random text', []);
      expect(res.detectedIntent).toBe('UNKNOWN');
      expect(res.confidence).toBeLessThanOrEqual(0.3);
      expect(res.requiredCapabilities).toEqual(['general_inspection']);
    });

    it('routes by file types alone with confidence when instruction is empty', () => {
      const res = routeTask('', ['doc1.pdf', 'doc2.pdf']);
      expect(res.detectedIntent).toBe('PDF_MERGE');
      expect(res.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.requiredCapabilities).toContain('pdf_merge');
    });
  });
  describe('Bangla Smart Task Intent Routing', () => {
    it('routes "এই PDF থেকে summary বানাও" to PDF_SUMMARY', () => {
      const intent = detectTaskIntent('এই PDF থেকে summary বানাও');
      expect(intent).toBe('PDF_SUMMARY');
    });

    it('routes "এই scan OCR করে editable text দাও" to OCR', () => {
      const intent = detectTaskIntent('এই scan OCR করে editable text দাও');
      expect(intent).toBe('OCR');
    });

    it('routes "সব JPG 500KB-এর নিচে করো" to IMAGE_COMPRESS', () => {
      const intent = detectTaskIntent('সব JPG 500KB-এর নিচে করো');
      expect(intent).toBe('IMAGE_COMPRESS');
    });

    it('routes "এই invoice Excel-এ বের করো" to SPREADSHEET_ANALYSIS', () => {
      const intent = detectTaskIntent('এই invoice Excel-এ বের করো');
      expect(intent).toBe('SPREADSHEET_ANALYSIS');
    });

    it('routes "এই files merge করে ZIP দাও" to PDF_MERGE or BATCH_PROCESS', () => {
      const intent = detectTaskIntent('এই files merge করে ZIP দাও');
      expect(intent).toBe('PDF_MERGE');
    });

    it('routes "এই report থেকে presentation বানাও" to PRESENTATION_ANALYSIS', () => {
      const intent = detectTaskIntent('এই report থেকে presentation বানাও');
      expect(intent).toBe('PRESENTATION_ANALYSIS');
    });

    it('routes "এই দলিল বাংলায় অনুবাদ করো" to TRANSLATION', () => {
      const intent = detectTaskIntent('এই দলিল বাংলায় অনুবাদ করো');
      expect(intent).toBe('TRANSLATION');
    });

    it('routes "পিডিএফ পৃষ্ঠাগুলো আলাদা করো" to PDF_SPLIT', () => {
      const intent = detectTaskIntent('পিডিএফ পৃষ্ঠাগুলো আলাদা করো');
      expect(intent).toBe('PDF_SPLIT');
    });
  });

  describe('English Smart Task Intent Routing', () => {
    it('routes "Summarize this PDF document" to PDF_SUMMARY', () => {
      const intent = detectTaskIntent('Summarize this PDF document');
      expect(intent).toBe('PDF_SUMMARY');
    });

    it('routes "Extract text via OCR from scanned document" to OCR', () => {
      const intent = detectTaskIntent('Extract text via OCR from scanned document');
      expect(intent).toBe('OCR');
    });

    it('routes "Compress images under 500kb" to IMAGE_COMPRESS', () => {
      const intent = detectTaskIntent('Compress images under 500kb');
      expect(intent).toBe('IMAGE_COMPRESS');
    });

    it('routes "Resize image to 800 width" to IMAGE_RESIZE', () => {
      const intent = detectTaskIntent('Resize image to 800 width');
      expect(intent).toBe('IMAGE_RESIZE');
    });

    it('routes "Convert image from PNG to WebP" to IMAGE_CONVERT', () => {
      const intent = detectTaskIntent('Convert image from PNG to WebP');
      expect(intent).toBe('IMAGE_CONVERT');
    });

    it('routes "Clean spreadsheet and remove duplicates" to SPREADSHEET_ANALYSIS', () => {
      const intent = detectTaskIntent('Clean spreadsheet and remove duplicates');
      expect(intent).toBe('SPREADSHEET_ANALYSIS');
    });

    it('routes "Batch process all images and export ZIP" to BATCH_PROCESS', () => {
      const intent = detectTaskIntent('Batch process all images and export ZIP');
      expect(intent).toBe('BATCH_PROCESS');
    });
  });

  describe('File-Type Fallback Routing (When instruction is empty)', () => {
    it('routes multiple PDFs to PDF_MERGE', () => {
      const f1 = new File(['1'], 'doc1.pdf', { type: 'application/pdf' });
      const f2 = new File(['2'], 'doc2.pdf', { type: 'application/pdf' });
      const intent = detectTaskIntent('', [f1, f2]);
      expect(intent).toBe('PDF_MERGE');
    });

    it('routes multiple images to BATCH_PROCESS', () => {
      const f1 = new File(['1'], 'img1.png', { type: 'image/png' });
      const f2 = new File(['2'], 'img2.jpg', { type: 'image/jpeg' });
      const intent = detectTaskIntent('', [f1, f2]);
      expect(intent).toBe('BATCH_PROCESS');
    });

    it('routes XLSX file to SPREADSHEET_ANALYSIS', () => {
      const f = new File(['1'], 'accounts.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const intent = detectTaskIntent('', [f]);
      expect(intent).toBe('SPREADSHEET_ANALYSIS');
    });

    it('routes PPTX file to PRESENTATION_ANALYSIS', () => {
      const f = new File(['1'], 'pitch.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const intent = detectTaskIntent('', [f]);
      expect(intent).toBe('PRESENTATION_ANALYSIS');
    });

    it('routes DOCX file to DOCUMENT_ANALYSIS', () => {
      const f = new File(['1'], 'contract.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const intent = detectTaskIntent('', [f]);
      expect(intent).toBe('DOCUMENT_ANALYSIS');
    });
  });

  describe('Deterministic detectDocumentType (Step 1E Specification)', () => {
    it('detects CV in English and Bangla', () => {
      const en = detectDocumentType('John_Doe_Resume_2026.pdf', 'application/pdf');
      expect(en.documentType).toBe('CV');
      expect(en.confidence).toBeGreaterThanOrEqual(0.85);
      expect(en.suggestedActions.length).toBeGreaterThan(0);

      const bn = detectDocumentType('Monir_জীবনবৃত্তান্ত.pdf', 'application/pdf');
      expect(bn.documentType).toBe('CV');
    });

    it('detects INVOICE / Challan in English and Bangla', () => {
      const en = detectDocumentType('Invoice_INV_9082.pdf', 'application/pdf');
      expect(en.documentType).toBe('INVOICE');

      const bn = detectDocumentType('মালপত্র_চালান_রসিদ.pdf', 'application/pdf');
      expect(bn.documentType).toBe('INVOICE');
    });

    it('detects CERTIFICATE / Sanad in English and Bangla', () => {
      const en = detectDocumentType('Graduation_Certificate.jpg', 'image/jpeg');
      expect(en.documentType).toBe('CERTIFICATE');

      const bn = detectDocumentType('প্রশংসাপত্র_সনদ.png', 'image/png');
      expect(bn.documentType).toBe('CERTIFICATE');
    });

    it('detects BANK_STATEMENT in English and Bangla', () => {
      const en = detectDocumentType('Bank_Statement_Jan_2026.pdf', 'application/pdf');
      expect(en.documentType).toBe('BANK_STATEMENT');

      const bn = detectDocumentType('হিসাব_বিবরণী_স্টেটমেন্ট.pdf', 'application/pdf');
      expect(bn.documentType).toBe('BANK_STATEMENT');
    });

    it('detects REPORT in English and Bangla', () => {
      const en = detectDocumentType('Annual_Audit_Report.docx', 'application/docx');
      expect(en.documentType).toBe('REPORT');

      const bn = detectDocumentType('বার্ষিক_প্রতিবেদন_২০২৬.docx', 'application/docx');
      expect(bn.documentType).toBe('REPORT');
    });

    it('detects APPLICATION in English and Bangla', () => {
      const en = detectDocumentType('Leave_Application_Letter.pdf', 'application/pdf');
      expect(en.documentType).toBe('APPLICATION');

      const bn = detectDocumentType('ছুটির_দরখাস্ত_আবেদন.pdf', 'application/pdf');
      expect(bn.documentType).toBe('APPLICATION');
    });

    it('detects TRANSCRIPT in English and Bangla', () => {
      const en = detectDocumentType('Academic_Transcript_Marksheet.pdf', 'application/pdf');
      expect(en.documentType).toBe('TRANSCRIPT');

      const bn = detectDocumentType('নম্বরপত্র_গ্রেডশিট.jpg', 'image/jpeg');
      expect(bn.documentType).toBe('TRANSCRIPT');
    });

    it('detects OFFICE_LETTER / Memo in English and Bangla', () => {
      const en = detectDocumentType('Official_Notice_Memo_Order.pdf', 'application/pdf');
      expect(en.documentType).toBe('OFFICE_LETTER');

      const bn = detectDocumentType('স্মারক_পরিপত্র_প্রজ্ঞাপন.pdf', 'application/pdf');
      expect(bn.documentType).toBe('OFFICE_LETTER');
    });

    it('detects QUOTATION in English and Bangla', () => {
      const en = detectDocumentType('Price_Quotation_Tender.xlsx', 'application/xlsx');
      expect(en.documentType).toBe('QUOTATION');

      const bn = detectDocumentType('দর_প্রস্তাব_দরপত্র.pdf', 'application/pdf');
      expect(bn.documentType).toBe('QUOTATION');
    });

    it('detects MEETING_MINUTES in English and Bangla', () => {
      const en = detectDocumentType('Meeting_Minutes_Board.docx', 'application/docx');
      expect(en.documentType).toBe('MEETING_MINUTES');

      const bn = detectDocumentType('সভার_কার্যবিবরণী_রেজুলেশন.pdf', 'application/pdf');
      expect(bn.documentType).toBe('MEETING_MINUTES');
    });

    it('detects via extracted text when filename is generic', () => {
      const res = detectDocumentType(
        'scan_001.pdf',
        'application/pdf',
        'Company Tax Invoice Bill No: 99401 Total Amount Due: 5000'
      );
      expect(res.documentType).toBe('INVOICE');
    });

    it('falls back to GENERAL_DOCUMENT when evidence is low without pretending certainty', () => {
      const res = detectDocumentType('document_file.pdf', 'application/pdf', '');
      expect(res.documentType).toBe('GENERAL_DOCUMENT');
      expect(res.confidence).toBeLessThan(0.6);
    });

    it('returns UNKNOWN when input has no meaningful document evidence', () => {
      const res = detectDocumentType('', '', '');
      expect(res.documentType).toBe('UNKNOWN');
      expect(res.confidence).toBeLessThanOrEqual(0.2);
    });
  });

  describe('Document Type Intelligence (Classification Layer)', () => {
    it('classifies CV / Resume with high confidence and tailored actions', () => {
      const f = new File(['cv data'], 'Monir_Hossain_CV_2026.pdf', { type: 'application/pdf' });
      const res = classifyDocument([f]);
      expect(res.type).toBe('CV');
      expect(res.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.suggestedActions.length).toBeGreaterThan(0);
    });

    it('classifies Invoices, Challans, and Bills with specific reasons', () => {
      const f = new File(['invoice data'], 'Office_Stationery_Challan_April.pdf', { type: 'application/pdf' });
      const res = classifyDocument([f]);
      expect(res.type).toBe('INVOICE');
      expect(res.reasonsBn[0]).toContain('চালান');
    });

    it('classifies Bank Statements accurately', () => {
      const f = new File(['stmt'], 'Dutch_Bangla_Bank_Statement.pdf', { type: 'application/pdf' });
      const res = classifyDocument([f]);
      expect(res.type).toBe('BANK_STATEMENT');
    });

    it('classifies Certificates and Sanads accurately', () => {
      const f = new File(['cert'], 'SSC_Board_Certificate_Sanad.jpg', { type: 'image/jpeg' });
      const res = classifyDocument([f]);
      expect(res.type).toBe('CERTIFICATE');
    });

    it('falls back to GENERAL_DOCUMENT when evidence is low without pretending certainty', () => {
      const f = new File(['generic'], 'document_123.pdf', { type: 'application/pdf' });
      const res = classifyDocument([f]);
      expect(res.type).toBe('GENERAL_DOCUMENT');
      expect(res.confidence).toBeLessThan(0.6);
    });

    it('returns UNKNOWN when no files or text are supplied', () => {
      const res = classifyDocument([]);
      expect(res.type).toBe('UNKNOWN');
      expect(res.confidence).toBeLessThan(0.2);
    });
  });

  describe('Workflow Planner Step Generation & Privacy Modes', () => {
    it('generates sequential steps with explicit LOCAL and CLOUD_AI execution modes', () => {
      const plan = generateWorkflowPlan('PDF_SUMMARY', 'এই PDF থেকে summary বানাও');
      expect(plan.steps.length).toBeGreaterThanOrEqual(4);
      expect(plan.hasCloudAi).toBe(true);

      const localSteps = plan.steps.filter((s) => s.mode === 'LOCAL');
      const aiSteps = plan.steps.filter((s) => s.mode === 'CLOUD_AI');

      expect(localSteps.length).toBeGreaterThanOrEqual(2);
      expect(aiSteps.length).toBeGreaterThanOrEqual(1);
      expect(aiSteps[0].title).toBe('AI consent required');
      expect(plan.steps.map((s) => s.title)).toEqual([
        'Extract PDF text',
        'AI consent required',
        'Summarize',
        'Prepare output',
      ]);
      expect(plan.steps[0].stepStatus).toBe('ready');
      expect(plan.steps[1].stepStatus).toBe('planned');
    });

    it('generates OCR workflow preview with Detect input, OCR, and Prepare extracted text', () => {
      const plan = generateWorkflowPlan('OCR', 'এই scan OCR করে editable text দাও');
      expect(plan.hasCloudAi).toBe(false);
      expect(plan.steps.every((s) => s.mode === 'LOCAL')).toBe(true);
      expect(plan.steps.map((s) => s.title)).toEqual([
        'Detect input',
        'OCR',
        'Prepare extracted text',
      ]);
      expect(plan.steps[0].stepStatus).toBe('ready');
      expect(plan.steps[1].stepStatus).toBe('planned');
      expect(plan.steps[2].stepStatus).toBe('planned');
    });

    it('generates IMAGE_COMPRESS workflow preview with Validate images, Compress locally, and Prepare downloads', () => {
      const plan = generateWorkflowPlan('IMAGE_COMPRESS', 'সব JPG 500KB-এর নিচে করো');
      expect(plan.hasCloudAi).toBe(false);
      expect(plan.steps.every((s) => s.mode === 'LOCAL')).toBe(true);
      expect(plan.steps.map((s) => s.title)).toEqual([
        'Validate images',
        'Compress locally',
        'Prepare downloads',
      ]);
      expect(plan.steps[0].stepStatus).toBe('ready');
      expect(plan.steps[1].stepStatus).toBe('planned');
    });

    it('flags unsupported high-fidelity presentation creation honestly with alternative proposal', () => {
      const plan = generateWorkflowPlan(
        'PRESENTATION_ANALYSIS',
        'এই report থেকে presentation বানাও'
      );
      expect(plan.hasUnsupported).toBe(true);

      const unsupportedStep = plan.steps.find((s) => s.supportStatus === 'NOT_YET_SUPPORTED');
      expect(unsupportedStep).toBeDefined();
      expect(unsupportedStep?.unsupportedReasonBn).toContain('পরবর্তী সংস্করণে আসছে');
      expect(unsupportedStep?.alternativeProposalBn).toBeDefined();
    });

    it('executes end-to-end planSmartTask deterministically without requiring cloud network calls', async () => {
      const f = new File(['dummy bytes'], 'April_Invoice_Challan.pdf', { type: 'application/pdf' });
      const task = await planSmartTask('এই invoice Excel-এ বের করো', [f]);

      expect(task.id).toMatch(/^task_/);
      expect(task.detectedIntent).toBe('SPREADSHEET_ANALYSIS');
      expect(task.classification?.type).toBe('INVOICE');
      expect(task.workflowSteps.length).toBeGreaterThanOrEqual(2);
      expect(task.status).toBe('READY');
    });
  });

  describe('Smart Suggestions Context Generator (Step 1D Rules)', () => {
    it('provides exactly the 5 PDF suggestions: Summarize, Extract Text, Merge, Split, OCR if scanned', () => {
      const f = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
      const sugs = generateSmartSuggestions([f]);
      const labels = sugs.map((s) => s.label);
      expect(labels).toEqual(['Summarize', 'Extract Text', 'Merge', 'Split', 'OCR if scanned']);
      expect(sugs[0].promptTemplateBn).toBe('এই PDF থেকে summary বানাও');
    });

    it('provides exactly the 4 Image suggestions: Compress, Resize, OCR, Convert', () => {
      const f = new File(['img'], 'photo.png', { type: 'image/png' });
      const sugs = generateSmartSuggestions([f]);
      const labels = sugs.map((s) => s.label);
      expect(labels).toEqual(['Compress', 'Resize', 'OCR', 'Convert']);
      expect(sugs[0].promptTemplateBn).toBe('সব JPG 500KB-এর নিচে করো');
    });

    it('provides exactly the 4 DOCX suggestions: Analyze, Summarize, Translate, Extract Text', () => {
      const f = new File(['docx'], 'contract.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const sugs = generateSmartSuggestions([f]);
      const labels = sugs.map((s) => s.label);
      expect(labels).toEqual(['Analyze', 'Summarize', 'Translate', 'Extract Text']);
      expect(sugs[2].label).toBe('Translate');
    });

    it('provides exactly the 4 XLSX/CSV suggestions: Analyze Data, Clean Data, Find Duplicates, Export CSV', () => {
      const f = new File(['sheet'], 'sales.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const sugs = generateSmartSuggestions([f]);
      const labels = sugs.map((s) => s.label);
      expect(labels).toEqual(['Analyze Data', 'Clean Data', 'Find Duplicates', 'Export CSV']);
      expect(sugs[2].label).toBe('Find Duplicates');
    });

    it('provides exactly the 3 PPTX suggestions: Extract Slide Text, Summarize, Generate Notes', () => {
      const f = new File(['presentation'], 'deck.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const sugs = generateSmartSuggestions([f]);
      const labels = sugs.map((s) => s.label);
      expect(labels).toEqual(['Extract Slide Text', 'Summarize', 'Generate Notes']);
    });
  });
});
