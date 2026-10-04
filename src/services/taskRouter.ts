/**
 * MAISHAA WORKSPACE — Phase 3 Task Router & Workflow Planner
 * Deterministic, intent-aware task engine.
 * Plans visible workflows, tags execution mode (LOCAL vs CLOUD_AI vs USER_CONFIRMATION),
 * and transparently flags unsupported high-fidelity conversions with closest real alternatives.
 */

import {
  SmartTask,
  TaskIntent,
  TaskRouterResult,
  WorkflowStep,
  SmartSuggestion,
  StepExecutionMode,
  StepSupportStatus,
} from '../types/task';
import { classifyDocument } from './classificationService';

export const INTENT_CAPABILITIES: Record<TaskIntent, string[]> = {
  PDF_MERGE: ['pdf_merge', 'pdf_lib', 'client_side'],
  PDF_SPLIT: ['pdf_split', 'pdf_lib', 'client_side'],
  PDF_SUMMARY: ['pdf_text_extraction', 'summarization', 'grounded_ai'],
  OCR: ['ocr_engine', 'canvas_preprocessing', 'tesseract'],
  IMAGE_COMPRESS: ['canvas_compression', 'image_pipeline'],
  IMAGE_RESIZE: ['canvas_resampling', 'image_pipeline'],
  IMAGE_CONVERT: ['format_transcoding', 'image_pipeline'],
  DOCUMENT_ANALYSIS: ['docx_parser', 'text_extraction', 'metrics'],
  SPREADSHEET_ANALYSIS: ['sheetjs', 'schema_inference', 'row_cleaning'],
  PRESENTATION_ANALYSIS: ['pptx_decompress', 'slide_extraction'],
  TRANSLATION: ['text_extraction', 'bilingual_translation'],
  BATCH_PROCESS: ['batch_queue', 'zip_packager'],
  OFFICE_PACK: ['office_template_generator'],
  FORM_CREATE: ['form_schema_builder'],
  UNKNOWN: ['general_inspection'],
};

/**
 * Deterministic Smart Task Router
 * Input: user instruction, selected file types
 * Output: detectedIntent, confidence, requiredCapabilities
 * Pure keyword + file-type rules only (no AI network call).
 */
export function routeTask(
  instruction: string,
  selectedFileTypes: (string | File)[] = []
): TaskRouterResult {
  const norm = instruction.toLowerCase().trim();
  const has = (...keywords: string[]) => keywords.some((kw) => norm.includes(kw.toLowerCase()));

  const fileNamesOrTypes = selectedFileTypes.map((item) =>
    typeof item === 'string' ? item.toLowerCase() : item.name.toLowerCase()
  );

  let detectedIntent: TaskIntent = 'UNKNOWN';
  let confidence = 0.2;

  // 1. Keyword-based matching
  if (has('merge', 'একত্র', 'জোড়া', 'একসাথে', 'জুড়ে', 'combine pdf', 'একত্রে')) {
    detectedIntent = 'PDF_MERGE';
    confidence = 0.95;
  } else if (has('split', 'কাটো', 'ভাগ', 'আলাদা', 'extract page', 'পৃষ্ঠা আলাদা', 'পৃষ্ঠা কেটে')) {
    detectedIntent = 'PDF_SPLIT';
    confidence = 0.95;
  } else if (has('summary', 'সারসংক্ষেপ', 'সারাংশ', 'সংক্ষেপ', 'summarize', 'সামারি')) {
    detectedIntent = 'PDF_SUMMARY';
    confidence = 0.95;
  } else if (has('ocr', 'স্ক্যান', 'লেখা বের', 'text বের', 'টেক্সট বের', 'editable text', 'scan', 'ওসিআর')) {
    detectedIntent = 'OCR';
    confidence = 0.95;
  } else if (has('compress', 'ছোট', 'কমাও', 'kb', 'mb', 'সাইজ কমাও', 'কম্প্রেস')) {
    detectedIntent = 'IMAGE_COMPRESS';
    confidence = 0.95;
  } else if (has('resize', 'রিসাইজ', 'প্রস্থ', 'উচ্চতা', 'পিক্সেল', 'dimension', 'width', 'height')) {
    detectedIntent = 'IMAGE_RESIZE';
    confidence = 0.95;
  } else if (has('convert image', 'jpg to png', 'png to jpg', 'webp', 'ছবি রূপান্তর')) {
    detectedIntent = 'IMAGE_CONVERT';
    confidence = 0.95;
  } else if (has('translate', 'অনুবাদ', 'বাংলায় করো', 'ইংরেজি করো', 'english to bangla', 'bangla to english')) {
    detectedIntent = 'TRANSLATION';
    confidence = 0.95;
  } else if (has('presentation', 'pptx', 'slide', 'স্লাইড', 'পাওয়ারপয়েন্ট', 'powerpoint')) {
    detectedIntent = 'PRESENTATION_ANALYSIS';
    confidence = 0.95;
  } else if (has('excel', 'sheet', 'csv', 'স্প্রেডশিট', 'হিসাব', 'duplicate', 'ডুপ্লিকেট', 'এক্সেল')) {
    detectedIntent = 'SPREADSHEET_ANALYSIS';
    confidence = 0.95;
  } else if (has('word file', 'docx', 'ডকুমেন্ট', 'আউটলাইন', 'word count', 'শব্দ সংখ্যা')) {
    detectedIntent = 'DOCUMENT_ANALYSIS';
    confidence = 0.95;
  } else if (has('batch', 'সবগুলো', 'সব ফাইল', 'zip', 'একসাথে zip', 'zip দাও', 'জিপ')) {
    detectedIntent = 'BATCH_PROCESS';
    confidence = 0.95;
  } else if (has('office pack', 'অফিস প্যাক', 'সরকারি ফরম্যাট')) {
    detectedIntent = 'OFFICE_PACK';
    confidence = 0.95;
  } else if (has('form', 'ফরম', 'আবেদন ফরম', 'ফর্ম')) {
    detectedIntent = 'FORM_CREATE';
    confidence = 0.95;
  }

  // 2. File-type fallback if keyword wasn't conclusive
  if (detectedIntent === 'UNKNOWN' && fileNamesOrTypes.length > 0) {
    const allPdf = fileNamesOrTypes.every((t) => t.includes('pdf'));
    const allImages = fileNamesOrTypes.every((t) =>
      /(jpe?g|png|webp|gif|bmp|image)/i.test(t)
    );
    const hasSpreadsheet = fileNamesOrTypes.some((t) => /(xlsx|xls|csv|spreadsheet|sheet)/i.test(t));
    const hasDocx = fileNamesOrTypes.some((t) => /(docx|txt|doc|word)/i.test(t));
    const hasPptx = fileNamesOrTypes.some((t) => /(pptx|ppt|presentation)/i.test(t));

    if (fileNamesOrTypes.length > 1 && allPdf) {
      detectedIntent = 'PDF_MERGE';
      confidence = 0.85;
    } else if (fileNamesOrTypes.length > 1 && allImages) {
      detectedIntent = 'BATCH_PROCESS';
      confidence = 0.85;
    } else if (hasSpreadsheet) {
      detectedIntent = 'SPREADSHEET_ANALYSIS';
      confidence = 0.80;
    } else if (hasPptx) {
      detectedIntent = 'PRESENTATION_ANALYSIS';
      confidence = 0.80;
    } else if (hasDocx) {
      detectedIntent = 'DOCUMENT_ANALYSIS';
      confidence = 0.80;
    } else if (allImages) {
      detectedIntent = 'OCR';
      confidence = 0.75;
    } else if (allPdf) {
      detectedIntent = 'PDF_SUMMARY';
      confidence = 0.75;
    }
  }

  return {
    detectedIntent,
    confidence,
    requiredCapabilities: INTENT_CAPABILITIES[detectedIntent] || ['general_inspection'],
  };
}

/**
 * Deterministic Intent Classifier (convenience wrapper)
 */
export function detectTaskIntent(instruction: string, files: (File | string)[] = []): TaskIntent {
  return routeTask(instruction, files).detectedIntent;
}

/**
 * Plan Workflow Steps for a Given Intent and Files
 */
export function generateWorkflowPlan(
  intent: TaskIntent,
  instruction: string,
  files: File[] = []
): { steps: WorkflowStep[]; warnings: string[]; warningsBn: string[]; hasUnsupported: boolean; hasCloudAi: boolean } {
  const steps: WorkflowStep[] = [];
  const warnings: string[] = [];
  const warningsBn: string[] = [];
  let hasUnsupported = false;
  let hasCloudAi = false;

  const addStep = (
    title: string,
    titleBn: string,
    description: string,
    descriptionBn: string,
    mode: StepExecutionMode,
    supportStatus: StepSupportStatus,
    targetModule?: WorkflowStep['targetModule'],
    targetAction?: string,
    unsupportedReason?: string,
    unsupportedReasonBn?: string,
    alternativeProposal?: string,
    alternativeProposalBn?: string,
    stepStatus: 'planned' | 'ready' = steps.length === 0 ? 'ready' : 'planned'
  ) => {
    if (mode === 'CLOUD_AI') hasCloudAi = true;
    if (supportStatus === 'NOT_YET_SUPPORTED') hasUnsupported = true;

    steps.push({
      id: `step_${steps.length + 1}`,
      stepNumber: steps.length + 1,
      title,
      titleBn,
      description,
      descriptionBn,
      mode,
      supportStatus,
      stepStatus,
      targetModule,
      targetAction,
      unsupportedReason,
      unsupportedReasonBn,
      alternativeProposal,
      alternativeProposalBn,
    });
  };

  switch (intent) {
    case 'PDF_SUMMARY':
      addStep(
        'Extract PDF text',
        'পিডিএফ টেক্সট এক্সট্রাক্ট',
        'Local PDF parser reads pages, decodes text streams, and verifies content type.',
        'লোকাল পিডিএফ পার্সার ব্রাউজারে পৃষ্ঠা পড়ে টেক্সট স্ট্রিম ডিকোড করে।',
        'LOCAL',
        'SUPPORTED',
        'pdf',
        'EXTRACT_TEXT',
        undefined,
        undefined,
        undefined,
        undefined,
        'ready'
      );
      addStep(
        'AI consent required',
        'ক্লাউড এআই সম্মতি আবশ্যক',
        'Check user consent modal before transmitting extracted text to cloud AI.',
        'ক্লাউড এআই-তে টেক্সট পাঠানোর পূর্বে ব্যবহারকারীর সম্মতি যাচাই করা হয়।',
        'CLOUD_AI',
        'SUPPORTED',
        'ai_assistant',
        'CHECK_CONSENT',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      addStep(
        'Summarize',
        'মূল সারসংক্ষেপ তৈরি',
        'Transmit extracted text to Gemini API with strict grounding instruction. Requires explicit user consent.',
        'এক্সট্রাক্ট করা টেক্সট দিয়ে ক্লাউড এআই সারসংক্ষেপ তৈরি করবে। ব্যবহারকারীর পূর্ব সম্মতি আবশ্যক।',
        'CLOUD_AI',
        'SUPPORTED',
        'ai_assistant',
        'SUMMARIZE',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      addStep(
        'Prepare output',
        'ফলাফল প্রস্তুতকরণ',
        'Export verified summary report as clean text with zero persistent server storage.',
        'সারসংক্ষেপ টেক্সট ফাইল আকারে ডাউনলোড করুন। ব্রাউজারের বাইরে ফাইল সংরক্ষিত হয় না।',
        'LOCAL',
        'SUPPORTED',
        'universal',
        'DOWNLOAD_TXT',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      break;

    case 'OCR':
      addStep(
        'Detect input',
        'ছবি ও ইনপুট শনাক্তকরণ',
        'Inspect uploaded image or scanned PDF frames, prepare canvas context.',
        'ব্রাউজার ক্যানভাসে আপলোডকৃত ছবি বা স্ক্যানকৃত পাতা লোড করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'ocr',
        'DETECT_INPUT',
        undefined,
        undefined,
        undefined,
        undefined,
        'ready'
      );
      addStep(
        'OCR',
        'টেসারাক্ট ব্রাউজার ওসিআর',
        'Run real browser Tesseract worker for Bangla & English text recognition with confidence scoring.',
        'বাংলা ও ইংরেজি উভয় ভাষার জন্য লোকাল ব্রাউজারে ওসিআর চালিয়ে কনফিডেন্স স্কোর গণনা করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'ocr',
        'RECOGNIZE',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      addStep(
        'Prepare extracted text',
        'এডিটেবল টেক্সট প্রস্তুতকরণ',
        'Clean erratic line breaks and export editable text / TXT without uploading raw images.',
        'অপ্রয়োজনীয় স্পেস ও লাইন ব্রেক দূর করে এডিটেবল টেক্সট ডাউনলোড করুন। কোনো ছবি সার্ভারে যায় না।',
        'LOCAL',
        'SUPPORTED',
        'ocr',
        'EXPORT_TEXT',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      break;

    case 'PDF_MERGE':
      addStep(
        'Validate Source PDF Pages',
        'পিডিএফ ফাইল ও পৃষ্ঠা যাচাই',
        'Read headers, calculate total pages, and stage files in processing sequence.',
        'সবগুলো পিডিএফ ফাইলের পৃষ্ঠা ও ফরম্যাট যাচাই করে সিরিয়াল নির্ধারণ করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'pdf',
        'VALIDATE'
      );
      addStep(
        'Client-Side PDF Document Assembly',
        'ব্রাউজারে পিডিএফ ফাইল একত্রীকরণ',
        'Assemble pages into a single merged PDF using pdf-lib entirely in client memory.',
        'pdf-lib লাইব্রেরি ব্যবহার করে সম্পূর্ণ অফলাইনে ব্রাউজার মেমোরিতে একটি একক পিডিএফ তৈরি হয়।',
        'LOCAL',
        'SUPPORTED',
        'pdf',
        'MERGE_EXECUTE'
      );
      addStep(
        'One-Click Download of Combined PDF',
        'একত্রিত নতুন পিডিএফ ডাউনলোড',
        'Download the merged document directly to device with zero server persistence.',
        'নতুন মার্জ করা পিডিএফ সরাসরি নিজের ডিভাইসে ডাউনলোড করুন।',
        'LOCAL',
        'SUPPORTED',
        'pdf',
        'DOWNLOAD'
      );
      break;

    case 'PDF_SPLIT':
      addStep(
        'Inspect Page Index & Structure',
        'পৃষ্ঠার ইনডেক্স ও রেঞ্জ বিশ্লেষণ',
        'Parse total page count and prepare custom extraction ranges (e.g. 1-3, 5).',
        'মোট পৃষ্ঠার সংখ্যা গণনা করে ব্যবহারকারীর নির্দিষ্ট রেঞ্জ প্রস্তুত করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'pdf',
        'INSPECT'
      );
      addStep(
        'Extract Pages to Distinct PDF',
        'নির্দিষ্ট পৃষ্ঠাসমূহ আলাদা করে নতুন পিডিএফ তৈরি',
        'Carve selected page range into an independent standalone PDF document in-memory.',
        'নির্বাচিত পৃষ্ঠাগুলো কেটে আলাদা একটি নতুন পিডিএফ ডকুমেন্ট ব্রাউজারে তৈরি করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'pdf',
        'SPLIT_EXECUTE'
      );
      break;

    case 'IMAGE_COMPRESS':
      addStep(
        'Validate images',
        'ছবি ও সাইজ যাচাই',
        'Analyze image format, dimensions, and current file size in browser.',
        'ব্রাউজারে ছবির বর্তমান সাইজ ও রেজোলিউশন যাচাই করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'image',
        'VALIDATE',
        undefined,
        undefined,
        undefined,
        undefined,
        'ready'
      );
      addStep(
        'Compress locally',
        'ক্যানভাসে লোকাল কম্প্রেশন',
        'Compress image iteratively via HTML5 Canvas with quality tuning and real byte checks.',
        'এইচটিএমএল৫ ক্যানভাস ব্যবহার করে আসল ছবির মান ঠিক রেখে সাইজ কমিয়ে আনা হয়।',
        'LOCAL',
        'SUPPORTED',
        'image',
        'COMPRESS_EXECUTE',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      addStep(
        'Prepare downloads',
        'অপ্টিমাইজড ডাউনলোড প্রস্তুতকরণ',
        'Package optimized assets directly with reported byte reduction metrics.',
        'কমে যাওয়া সাইজের তথ্যসহ অপ্টিমাইজড ছবি ডাউনলোডযোগ্য করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'image',
        'PREPARE_DOWNLOADS',
        undefined,
        undefined,
        undefined,
        undefined,
        'planned'
      );
      break;

    case 'IMAGE_RESIZE':
      addStep(
        'Inspect Aspect Ratio & Target Dimensions',
        'রেজোলিউশন ও অ্যাসপেক্ট রেশিও নির্ধারণ',
        'Compute width and height constraints with optional aspect ratio preservation.',
        'প্রস্থ ও উচ্চতা হিসাব করে ছবির অনুপাত রক্ষা করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'image',
        'MEASURE'
      );
      addStep(
        'High-Fidelity Canvas Resampling',
        'ক্যানভাসে রিসাইজিং',
        'Resample pixels cleanly on canvas and export in requested format.',
        'পিক্সেল নিখুঁত রেখে ক্যানভাসে ছবি রিসাইজ করে তৈরি করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'image',
        'RESIZE_EXECUTE'
      );
      break;

    case 'IMAGE_CONVERT':
      addStep(
        'Decode Raster Stream',
        'ছবির ফরম্যাট শনাক্তকরণ',
        'Detect image binary header and decode raster frames safely in browser.',
        'ব্রাউজারে ছবির আসল বাইনারি ডিকোড করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'convert',
        'DECODE'
      );
      addStep(
        'Transcode Format (PNG / JPEG / WebP)',
        'ফরম্যাট রূপান্তর (PNG / JPEG / WebP)',
        'Convert to destination web format via client canvas without data loss.',
        'কোনো সার্ভার আপলোড ছাড়া অফলাইনে ক্যানভাস রূপান্তর সম্পন্ন হয়।',
        'LOCAL',
        'SUPPORTED',
        'convert',
        'TRANSCODE'
      );
      break;

    case 'SPREADSHEET_ANALYSIS':
      addStep(
        'Read Workbook & Infer Column Schema',
        'স্প্রেডশিট লোড ও কলাম স্কিমা বিশ্লেষণ',
        'Parse sheets with SheetJS, identify headers, and infer types (Number, Date, String).',
        'SheetJS দিয়ে শিট লোড করে কলাম, হেডার ও ডাটার ধরন নির্ণয় করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'sheet_intel',
        'READ_SCHEMA'
      );
      addStep(
        'Duplicate Row Detection & Normalization',
        'ডুপ্লিকেট সারি শনাক্ত ও ডাটা ক্লিন',
        'Detect redundant records and normalize excessive whitespace without mutating source.',
        'মূল ফাইল অক্ষত রেখে ডুপ্লিকেট সারি এবং অপ্রয়োজনীয় স্পেস দূর করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'sheet_intel',
        'CLEAN_ROWS'
      );
      addStep(
        'Export Cleaned Dataset to CSV',
        'ক্লিন CSV এক্সপোর্ট',
        'Generate and download sanitized CSV dataset.',
        'পরিশোধিত ডেটাসেট নতুন CSV আকারে ডাউনলোড করুন।',
        'LOCAL',
        'SUPPORTED',
        'sheet_intel',
        'EXPORT_CSV'
      );
      break;

    case 'PRESENTATION_ANALYSIS':
      addStep(
        'Decompress Presentation OpenXML Package',
        'পাওয়ারপয়েন্ট ওপেন-এক্সএমএল প্যাকেজ আনজিপ',
        'Extract slide XMLs and structure using client-side JSZip.',
        'ব্রাউজারে ক্লায়েন্ট-সাইড আনজিপ করে স্লাইডের কাঠামো খোলা হয়।',
        'LOCAL',
        'SUPPORTED',
        'slides_intel',
        'UNZIP'
      );
      addStep(
        'Extract Slide Titles, Content & Statistics',
        'স্লাইডের শিরোনাম ও বক্তব্য টেক্সট এক্সট্রাক্ট',
        'Read slide-by-slide text, calculate word counts, and group by slide sequence.',
        'প্রতিটি স্লাইডের শিরোনাম ও পয়েন্ট ধারাবাহিকভাবে বের করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'slides_intel',
        'EXTRACT_SLIDES'
      );
      // If user requested creating PPTX from report or vice versa:
      if (instruction.includes('বানাও') || instruction.includes('create') || instruction.includes('make')) {
        addStep(
          'Automated Presentation Deck Styler',
          'অটোমেটেড স্লাইড ডেক ডিজাইনার ও বিল্ডার',
          'Automated graphical slide layout and high-fidelity PPTX theme generation.',
          'সম্পূর্ণ গ্রাফিক্যাল স্লাইড ডেক ও থিমযুক্ত PPTX ফাইল তৈরি।',
          'LOCAL',
          'NOT_YET_SUPPORTED',
          'slides_intel',
          'FULL_PPTX_DESIGN',
          'Automated high-fidelity PPTX deck creation is planned for Phase 3 advanced pipeline.',
          'সম্পূর্ণ থিমযুক্ত স্লাইড ডেক অটো-ডিজাইন পরবর্তী সংস্করণে আসছে।',
          'Currently you can extract or generate full slide outline text, titles, and speaker notes.',
          'বর্তমানে প্রস্তুতকৃত স্লাইড আউটলাইন ও বুলেট পয়েন্ট টেক্সট ফাইল আকারে ডাউনলোড করে ব্যবহার করতে পারবেন।'
        );
      }
      break;

    case 'DOCUMENT_ANALYSIS':
      addStep(
        'Extract Document Text & Outline',
        'ডকুমেন্ট টেক্সট ও হেডিং আউটলাইন এক্সট্রাক্ট',
        'Parse DOCX paragraphs and headings with Mammoth parser.',
        'Mammoth দিয়ে ডকএক্স ফাইলের অনুচ্ছেদ ও হেডিং বের করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'doc_intel',
        'EXTRACT'
      );
      addStep(
        'Calculate Reading Metrics & Word Statistics',
        'শব্দ সংখ্যা ও পড়ার সময় হিসাব',
        'Compute total word count, character count, and estimated reading time.',
        'মোট শব্দ সংখ্যা, অক্ষর সংখ্যা ও পড়ার গড় সময় হিসাব করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'doc_intel',
        'METRICS'
      );
      break;

    case 'TRANSLATION':
      addStep(
        'Extract Source Text for Translation',
        'অনুবাদযোগ্য টেক্সট চিহ্নিতকরণ',
        'Read source document text in browser safely.',
        'ব্রাউজারে ফাইলের টেক্সট আলাদা করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'universal',
        'EXTRACT'
      );
      addStep(
        'AI Contextual Translation (Bangla ↔ English)',
        'ক্লাউড এআই দিয়ে প্রাসঙ্গিক অনুবাদ (বাংলা ↔ ইংরেজি)',
        'Send text to cloud AI translation endpoint with terminology preservation. Requires user consent.',
        'প্রাসঙ্গিক পারিভাষিক শব্দ ঠিক রেখে ক্লাউড এআই দিয়ে অনুবাদ সম্পন্ন করা হবে। ব্যবহারকারীর সম্মতি নেওয়া হবে।',
        'CLOUD_AI',
        'SUPPORTED',
        'ai_assistant',
        'TRANSLATE'
      );
      break;

    case 'BATCH_PROCESS':
      addStep(
        'Queue Batch Files with Failure Isolation',
        'ব্যাচ কিউ তৈরি ও প্রসেস আইসোলেশন',
        'Stage all files so individual file errors do not break the entire batch.',
        'একটি ফাইলে সমস্যা হলেও যেন অন্য ফাইলগুলো অক্ষত থাকে তা নিশ্চিত করে কিউ প্রস্তুত করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'batch',
        'STAGE'
      );
      addStep(
        'Parallel Processing in Web Workers',
        'প্যারালাল প্রসেসিং সম্পন্নকরণ',
        'Run image compression / format conversion / PDF processing per file.',
        'প্রতিটি ফাইলের প্রসেসিং সমান্তরালভাবে সম্পন্ন করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'batch',
        'EXECUTE'
      );
      addStep(
        'Bundle Completed Assets into Safe ZIP',
        'সব ফাইল একত্রিত করে জিপ ফাইল তৈরি',
        'Package all successfully processed outputs into a single downloadable ZIP archive.',
        'সব সফল ফাইল একত্রিত করে সরাসরি একটি জিপ ফাইল ডাউনলোড করুন।',
        'LOCAL',
        'SUPPORTED',
        'batch',
        'BUNDLE_ZIP'
      );
      break;

    case 'OFFICE_PACK':
    case 'FORM_CREATE':
      addStep(
        'Extract Source Information',
        'প্রয়োজনীয় তথ্য এক্সট্রাক্ট',
        'Read candidate or organizational parameters from uploaded documents.',
        'আপলোড করা ফাইল থেকে প্রয়োজনীয় তথ্য বের করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'universal',
        'EXTRACT'
      );
      addStep(
        'Official Bangladesh Form Schema Generation',
        'বাংলাদেশি স্ট্যান্ডার্ড ফরম্যাট আর্কিটেকচার',
        'Automated generation of verified Bangladesh official forms and certificates.',
        'বাংলাদেশি প্রমিত ফরম ও সরকারি ডকুমেন্ট ফরম্যাট স্বয়ংক্রিয়ভাবে তৈরি।',
        'LOCAL',
        'NOT_YET_SUPPORTED',
        'universal',
        'GOVT_FORMS',
        'Official Bangladesh Form templates are scheduled for Phase 3 Step 2.',
        'বাংলাদেশ অফিসিয়াল ফরম ও আবেদন টেমপ্লেট পরবর্তী ধাপে (Phase 3 Step 2) যুক্ত হবে।',
        'Currently, use Document Intelligence to extract structured fields or export text.',
        'বর্তমানে ডকুমেন্ট ইন্টেলিজেন্স ব্যবহার করে প্রয়োজনীয় সব তথ্য আলাদা করে টেক্সট ফাইলে পাওয়া যাচ্ছে।'
      );
      break;

    case 'UNKNOWN':
    default:
      addStep(
        'Inspect File Payload & Format',
        'ফাইলের ধরন ও ফরম্যাট যাচাই',
        'Analyze binary signatures and route to Universal Workspace.',
        'ফাইলের আসল বাইনারি পরীক্ষা করে সঠিক অফিস টুল সাজেস্ট করা হয়।',
        'LOCAL',
        'SUPPORTED',
        'universal',
        'INSPECT'
      );
      addStep(
        'Interactive AI Work Assistant Consultation',
        'মায়িশা অ্যাসিস্ট্যান্টের সাহায্য নিন',
        'Open AI Assistant drawer to clarify instructions or perform grounded tasks with your consent.',
        'আপনার নির্দেশ পরিষ্কার করতে অথবা এআই সহায়তায় কাজ করতে মায়িশা অ্যাসিস্ট্যান্ট ওপেন করুন।',
        'USER_CONFIRMATION',
        'SUPPORTED',
        'ai_assistant',
        'CONSULT'
      );
      warnings.push('Instruction is open-ended. Review the recommended workflow before execution.');
      warningsBn.push('নির্দিষ্ট নির্দেশনা শনাক্ত হয়নি। অনুগ্রহ করে কার্যপ্রণালী দেখে নিশ্চিত করুন।');
      break;
  }

  return {
    steps,
    warnings,
    warningsBn,
    hasUnsupported,
    hasCloudAi,
  };
}

/**
 * Main Smart Task Planner:
 * Coordinates classification, intent detection, and workflow plan generation.
 */
export async function planSmartTask(
  instruction: string,
  files: File[] = [],
  sampleText = ''
): Promise<SmartTask> {
  const detectedIntent = detectTaskIntent(instruction, files);
  const classification = classifyDocument(files, sampleText);
  const { steps, warnings, warningsBn, hasUnsupported, hasCloudAi } = generateWorkflowPlan(
    detectedIntent,
    instruction,
    files
  );

  const requiredCapabilities = Array.from(
    new Set(steps.map((s) => s.targetAction || s.targetModule || 'general'))
  );

  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    instruction: instruction.trim(),
    files,
    detectedIntent,
    requiredCapabilities,
    workflowSteps: steps,
    status: 'READY',
    warnings,
    warningsBn,
    classification,
    hasUnsupportedStep: hasUnsupported,
    hasCloudAiStep: hasCloudAi,
  };
}

/**
 * Generate context-aware smart suggestions based on staged files.
 * Rules:
 * PDF: Summarize, Extract Text, Merge, Split, OCR if scanned
 * Image: Compress, Resize, OCR, Convert
 * DOCX: Analyze, Summarize, Translate, Extract Text
 * XLSX/CSV: Analyze Data, Clean Data, Find Duplicates, Export CSV
 * PPTX: Extract Slide Text, Summarize, Generate Notes
 */
export function generateSmartSuggestions(files: (File | string)[] = []): SmartSuggestion[] {
  const fileNames = files.map((f) => (typeof f === 'string' ? f.toLowerCase() : f.name.toLowerCase()));

  if (!fileNames || fileNames.length === 0) {
    return [
      {
        id: 'sug_pdf_sum',
        label: 'Summarize',
        labelBn: 'সারসংক্ষেপ (Summarize)',
        promptTemplate: 'Summarize this PDF document',
        promptTemplateBn: 'এই PDF থেকে summary বানাও',
        targetModule: 'pdf',
        isCloudAi: true,
      },
      {
        id: 'sug_ocr_scan',
        label: 'OCR',
        labelBn: 'ওসিআর (OCR)',
        promptTemplate: 'Extract text via OCR from scanned file',
        promptTemplateBn: 'এই scan OCR করে editable text দাও',
        targetModule: 'ocr',
        isCloudAi: false,
      },
      {
        id: 'sug_img_comp',
        label: 'Compress',
        labelBn: 'কম্প্রেস (Compress)',
        promptTemplate: 'Compress images under 500KB',
        promptTemplateBn: 'সব JPG 500KB-এর নিচে করো',
        targetModule: 'image',
        isCloudAi: false,
      },
      {
        id: 'sug_inv_excel',
        label: 'Analyze Data',
        labelBn: 'ডেটা বিশ্লেষণ (Analyze Data)',
        promptTemplate: 'Extract invoice and table data to spreadsheet',
        promptTemplateBn: 'এই invoice Excel-এ বের করো',
        targetModule: 'sheet_intel',
        isCloudAi: false,
      },
      {
        id: 'sug_batch_zip',
        label: 'Merge',
        labelBn: 'একত্রীকরণ (Merge / ZIP)',
        promptTemplate: 'Merge files and download as ZIP',
        promptTemplateBn: 'এই files merge করে ZIP দাও',
        targetModule: 'batch',
        isCloudAi: false,
      },
    ];
  }

  const suggestions: SmartSuggestion[] = [];
  const hasPdf = fileNames.some((n) => n.endsWith('.pdf'));
  const hasImage = fileNames.some((n) => /\.(jpe?g|png|webp|gif|bmp)$/i.test(n));
  const hasDocx = fileNames.some((n) => /\.(docx|txt|doc)$/i.test(n));
  const hasSheet = fileNames.some((n) => /\.(xlsx|xls|csv)$/i.test(n));
  const hasPptx = fileNames.some((n) => /\.(pptx|ppt)$/i.test(n));

  // 1. PDF Rules
  if (hasPdf) {
    suggestions.push(
      {
        id: 'pdf_summarize',
        label: 'Summarize',
        labelBn: 'সারসংক্ষেপ (Summarize)',
        promptTemplate: 'Summarize this PDF document',
        promptTemplateBn: 'এই PDF থেকে summary বানাও',
        targetModule: 'pdf',
        isCloudAi: true,
      },
      {
        id: 'pdf_extract_text',
        label: 'Extract Text',
        labelBn: 'টেক্সট বের করো (Extract Text)',
        promptTemplate: 'Extract all text from this PDF',
        promptTemplateBn: 'এই PDF থেকে সমস্ত টেক্সট বের করো',
        targetModule: 'pdf',
        isCloudAi: false,
      },
      {
        id: 'pdf_merge',
        label: 'Merge',
        labelBn: 'একত্রীকরণ (Merge)',
        promptTemplate: 'Merge these PDF files together',
        promptTemplateBn: 'এই PDF ফাইলগুলো একত্র করো',
        targetModule: 'pdf',
        isCloudAi: false,
      },
      {
        id: 'pdf_split',
        label: 'Split',
        labelBn: 'পৃষ্ঠা আলাদা (Split)',
        promptTemplate: 'Split pages from this PDF',
        promptTemplateBn: 'এই PDF থেকে পৃষ্ঠাগুলো আলাদা করো',
        targetModule: 'pdf',
        isCloudAi: false,
      },
      {
        id: 'pdf_ocr_scan',
        label: 'OCR if scanned',
        labelBn: 'স্ক্যান করা হলে OCR করো',
        promptTemplate: 'Run OCR on this scanned PDF',
        promptTemplateBn: 'এই স্ক্যান করা PDF-এ OCR চালিয়ে টেক্সট দাও',
        targetModule: 'ocr',
        isCloudAi: false,
      }
    );
  }

  // 2. Image Rules
  if (hasImage) {
    suggestions.push(
      {
        id: 'image_compress',
        label: 'Compress',
        labelBn: 'কম্প্রেস (Compress)',
        promptTemplate: 'Compress image size under 500KB',
        promptTemplateBn: 'সব JPG 500KB-এর নিচে করো',
        targetModule: 'image',
        isCloudAi: false,
      },
      {
        id: 'image_resize',
        label: 'Resize',
        labelBn: 'রিসাইজ (Resize)',
        promptTemplate: 'Resize image dimensions',
        promptTemplateBn: 'এই ছবির সাইজ রিসাইজ করো',
        targetModule: 'image',
        isCloudAi: false,
      },
      {
        id: 'image_ocr',
        label: 'OCR',
        labelBn: 'ওসিআর (OCR)',
        promptTemplate: 'Extract text via OCR from this image',
        promptTemplateBn: 'এই ছবি থেকে OCR করে টেক্সট বের করো',
        targetModule: 'ocr',
        isCloudAi: false,
      },
      {
        id: 'image_convert',
        label: 'Convert',
        labelBn: 'কনভার্ট (Convert)',
        promptTemplate: 'Convert image format',
        promptTemplateBn: 'এই ছবির ফরম্যাট রূপান্তর করো',
        targetModule: 'convert',
        isCloudAi: false,
      }
    );
  }

  // 3. DOCX Rules
  if (hasDocx) {
    suggestions.push(
      {
        id: 'docx_analyze',
        label: 'Analyze',
        labelBn: 'বিশ্লেষণ (Analyze)',
        promptTemplate: 'Analyze document outline and statistics',
        promptTemplateBn: 'এই ডকুমেন্টের আউটলাইন ও পরিসংখ্যান বিশ্লেষণ করো',
        targetModule: 'doc_intel',
        isCloudAi: false,
      },
      {
        id: 'docx_summarize',
        label: 'Summarize',
        labelBn: 'সারসংক্ষেপ (Summarize)',
        promptTemplate: 'Summarize this Word document',
        promptTemplateBn: 'এই Word ফাইল থেকে সারসংক্ষেপ বানাও',
        targetModule: 'ai_assistant',
        isCloudAi: true,
      },
      {
        id: 'docx_translate',
        label: 'Translate',
        labelBn: 'অনুবাদ (Translate)',
        promptTemplate: 'Translate document between Bangla and English',
        promptTemplateBn: 'এই ডকুমেন্ট বাংলায় অনুবাদ করো',
        targetModule: 'ai_assistant',
        isCloudAi: true,
      },
      {
        id: 'docx_extract_text',
        label: 'Extract Text',
        labelBn: 'টেক্সট বের করো (Extract Text)',
        promptTemplate: 'Extract plain text from this document',
        promptTemplateBn: 'এই ডকুমেন্ট থেকে টেক্সট বের করো',
        targetModule: 'doc_intel',
        isCloudAi: false,
      }
    );
  }

  // 4. XLSX/CSV Rules
  if (hasSheet) {
    suggestions.push(
      {
        id: 'sheet_analyze_data',
        label: 'Analyze Data',
        labelBn: 'ডেটা বিশ্লেষণ (Analyze Data)',
        promptTemplate: 'Analyze spreadsheet structure and columns',
        promptTemplateBn: 'এই স্প্রেডশিটের ডেটা ও কলাম বিশ্লেষণ করো',
        targetModule: 'sheet_intel',
        isCloudAi: false,
      },
      {
        id: 'sheet_clean_data',
        label: 'Clean Data',
        labelBn: 'ডেটা ক্লিন (Clean Data)',
        promptTemplate: 'Clean whitespace and normalize data',
        promptTemplateBn: 'এই স্প্রেডশিটের অপ্রয়োজনীয় স্পেস ক্লিন করো',
        targetModule: 'sheet_intel',
        isCloudAi: false,
      },
      {
        id: 'sheet_find_duplicates',
        label: 'Find Duplicates',
        labelBn: 'ডুপ্লিকেট খুঁজুন (Find Duplicates)',
        promptTemplate: 'Find and remove duplicate rows',
        promptTemplateBn: 'এই স্প্রেডশিট থেকে ডুপ্লিকেট সারি খুঁজুন',
        targetModule: 'sheet_intel',
        isCloudAi: false,
      },
      {
        id: 'sheet_export_csv',
        label: 'Export CSV',
        labelBn: 'CSV এক্সপোর্ট (Export CSV)',
        promptTemplate: 'Export cleaned data to CSV',
        promptTemplateBn: 'এই ডেটা পরিষ্কার CSV আকারে বের করো',
        targetModule: 'sheet_intel',
        isCloudAi: false,
      }
    );
  }

  // 5. PPTX Rules
  if (hasPptx) {
    suggestions.push(
      {
        id: 'pptx_extract_slide_text',
        label: 'Extract Slide Text',
        labelBn: 'স্লাইড টেক্সট এক্সট্রাক্ট (Extract Slide Text)',
        promptTemplate: 'Extract all slide titles and text content',
        promptTemplateBn: 'সবগুলো স্লাইডের টেক্সট ও শিরোনাম বের করো',
        targetModule: 'slides_intel',
        isCloudAi: false,
      },
      {
        id: 'pptx_summarize',
        label: 'Summarize',
        labelBn: 'সারসংক্ষেপ (Summarize)',
        promptTemplate: 'Summarize this presentation',
        promptTemplateBn: 'এই প্রেজেন্টেশনের মূল বিষয়বস্তু সংক্ষেপে দাও',
        targetModule: 'slides_intel',
        isCloudAi: true,
      },
      {
        id: 'pptx_generate_notes',
        label: 'Generate Notes',
        labelBn: 'স্পিকার নোটস (Generate Notes)',
        promptTemplate: 'Generate speaker notes and bullet points',
        promptTemplateBn: 'এই স্লাইডগুলোর জন্য স্পিকার নোটস ও বুলেট পয়েন্ট তৈরি করো',
        targetModule: 'slides_intel',
        isCloudAi: false,
      }
    );
  }

  return suggestions;
}
