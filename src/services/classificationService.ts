/**
 * MAISHAA WORKSPACE — Phase 3 Document Classification Service
 * Deterministic, evidence-based document classifier.
 * Never pretends certainty when evidence is sparse.
 */

import {
  DocumentClassificationResult,
  DocumentClassificationType,
  DocumentTypeDetectionResult,
  ClassificationAction,
} from '../types/task';

interface ClassificationRule {
  type: DocumentClassificationType;
  label: string;
  labelBn: string;
  keywords: string[];
  reasons: string;
  reasonsBn: string;
  actions: ClassificationAction[];
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: 'CV',
    label: 'CV / Resume / Biodata',
    labelBn: 'জীবনবৃত্তান্ত / সিভি / বায়োডাটা',
    keywords: [
      'cv',
      'resume',
      'biodata',
      'bio-data',
      'curriculum',
      'vitae',
      'জীবনবৃত্তান্ত',
      'জীবন বৃত্তান্ত',
      'সিভি',
    ],
    reasons: 'Filename or content contains CV/Resume keywords',
    reasonsBn: 'ফাইল বা টেক্সটে জীবনবৃত্তান্ত/সিভি সংক্রান্ত নির্দেশনা পাওয়া গেছে',
    actions: [
      {
        id: 'cv_summary',
        label: 'Summarize Profile',
        labelBn: 'প্রোফাইল সারসংক্ষেপ তৈরি',
        prompt: 'এই CV-র কাজের অভিজ্ঞতা, শিক্ষাগত যোগ্যতা এবং মূল স্কিলগুলো সংক্ষেপে বের করো',
      },
      {
        id: 'cv_txt',
        label: 'Extract Contact & Skills',
        labelBn: 'যোগাযোগ ও স্কিল এক্সট্রাক্ট',
        prompt: 'এই জীবনবৃত্তান্ত থেকে প্রার্থীর যোগাযোগ তথ্য ও প্রধান দক্ষতাসমূহ তালিকাভুক্ত করো',
      },
    ],
  },
  {
    type: 'INVOICE',
    label: 'Invoice / Bill / Challan',
    labelBn: 'চালান / ইনভয়েস / বিল',
    keywords: [
      'invoice',
      'inv',
      'bill',
      'challan',
      'voucher',
      'receipt',
      'চালান',
      'ইনভয়েস',
      'বিল',
      'ভাউচার',
      'রসিদ',
      'ট্যাক্স ইনভয়েস',
      'tax invoice',
    ],
    reasons: 'Billing, challan, invoice or voucher identifiers detected',
    reasonsBn: 'বিল, ইনভয়েস বা চালান সংক্রান্ত পরিভাষা শনাক্ত হয়েছে',
    actions: [
      {
        id: 'inv_ocr',
        label: 'Extract Data to Excel/CSV',
        labelBn: 'ডাটা এক্সেল বা স্প্রেডশিটে বের করো',
        prompt: 'এই ইনভয়েস/বিল থেকে আইটেম, দর, পরিমাণ ও মোট টাকার পরিমাণ আলাদা করে ছক তৈরি করো',
      },
      {
        id: 'inv_summary',
        label: 'Summarize Payable Amount',
        labelBn: 'মোট প্রদেয় বিলের হিসাব',
        prompt: 'এই বিলের মোট টাকা, ভ্যাট ও বকেয়া থাকলে সংক্ষেপে বের করো',
      },
    ],
  },
  {
    type: 'BANK_STATEMENT',
    label: 'Bank Statement / Financial Record',
    labelBn: 'ব্যাংক স্টেটমেন্ট / আর্থিক হিসাব বিবরণী',
    keywords: [
      'statement',
      'bank',
      'account',
      'ledger',
      'balance',
      'লেনদেন',
      'হিসাব বিবরণী',
      'স্টেটমেন্ট',
      'ব্যাংক স্টেটমেন্ট',
    ],
    reasons: 'Banking statement or ledger identifiers detected',
    reasonsBn: 'ব্যাংক বিবরণী বা লেনদেন সংক্রান্ত রেকর্ড শনাক্ত হয়েছে',
    actions: [
      {
        id: 'bank_clean',
        label: 'Analyze Transactions & Duplicates',
        labelBn: 'লেনদেন ও ডুপ্লিকেট সারি যাচাই',
        prompt: 'এই ব্যাংক স্টেটমেন্টের মোট ডেবিট, ক্রেডিট এবং ডুপ্লিকেট কোনো এন্ট্রি আছে কিনা বিশ্লেষণ করো',
      },
      {
        id: 'bank_csv',
        label: 'Export to Clean CSV',
        labelBn: 'ক্লিন CSV এক্সপোর্ট',
        prompt: 'এই বিবরণীর ডেটা স্প্রেডশিটে পরিষ্কার করে CSV আকারে দাও',
      },
    ],
  },
  {
    type: 'CERTIFICATE',
    label: 'Certificate / Sanad / Testimonial',
    labelBn: 'সনদপত্র / প্রত্যয়নপত্র / প্রশংসাপত্র',
    keywords: [
      'certificate',
      'sanad',
      'cert',
      'testimonial',
      'সনদ',
      'প্রত্যয়ন',
      'প্রত্যয়ন',
      'প্রশংসাপত্র',
      'সনদপত্র',
    ],
    reasons: 'Certificate, credential, or testimonial markers detected',
    reasonsBn: 'সনদপত্র বা প্রত্যয়নপত্র সংক্রান্ত প্রমাণ পাওয়া গেছে',
    actions: [
      {
        id: 'cert_ocr',
        label: 'OCR Text to Clean Text',
        labelBn: 'স্ক্যান OCR করে টেক্সট বের করো',
        prompt: 'এই সনদের লেখা নির্ভুলভাবে OCR করে এডিটেবল টেক্সট আকারে দাও',
      },
    ],
  },
  {
    type: 'REPORT',
    label: 'Official Report / Survey / Audit',
    labelBn: 'প্রতিবেদন / রিপোর্ট / নিরীক্ষা',
    keywords: [
      'report',
      'survey',
      'audit',
      'annual',
      'quarterly',
      'প্রতিবেদন',
      'রিপোর্ট',
      'নিরীক্ষা',
      'বার্ষিক প্রতিবেদন',
      'প্রকল্প প্রতিবেদন',
    ],
    reasons: 'Formal report, audit, or review terminology detected',
    reasonsBn: 'প্রাতিষ্ঠানিক প্রতিবেদন বা রিপোর্ট সংক্রান্ত প্রমাণ শনাক্ত হয়েছে',
    actions: [
      {
        id: 'rep_sum',
        label: 'Executive Summary',
        labelBn: 'নির্বাহী সারসংক্ষেপ তৈরি',
        prompt: 'এই রিপোর্টটির মূল ফলাফল, সমস্যা ও সুপারিশ সংক্ষেপে ৩-৪টি প্যারায় সারসংক্ষেপ করো',
      },
      {
        id: 'rep_word',
        label: 'Analyze Document Statistics',
        labelBn: 'ডকুমেন্ট পরিসংখ্যান ও আউটলাইন',
        prompt: 'এই রিপোর্টের শব্দ সংখ্যা, অনুচ্ছেদ ও কাঠামোগত আউটলাইন প্রদর্শন করো',
      },
    ],
  },
  {
    type: 'APPLICATION',
    label: 'Formal Application / Leave Request',
    labelBn: 'আবেদনপত্র / দরখাস্ত',
    keywords: [
      'application',
      'abedon',
      'petition',
      'দরখাস্ত',
      'আবেদন',
      'ছুটির আবেদন',
      'ছুটি',
      'আবেদনপত্র',
    ],
    reasons: 'Application or formal petition pattern detected',
    reasonsBn: 'আবেদনপত্র বা দরখাস্তের ফরম্যাট শনাক্ত হয়েছে',
    actions: [
      {
        id: 'app_review',
        label: 'Review & Proofread',
        labelBn: 'আবেদনপত্র নিরীক্ষা ও বানান সংশোধন',
        prompt: 'এই আবেদনপত্রের ভাষা, শিষ্টাচার ও বানান পর্যালোচনা করো',
      },
    ],
  },
  {
    type: 'OFFICE_LETTER',
    label: 'Office Order / Memo / Circular',
    labelBn: 'অফিস আদেশ / স্মারক / প্রজ্ঞাপন / পরিপত্র',
    keywords: [
      'letter',
      'memo',
      'circular',
      'order',
      'notice',
      'স্মারক',
      'পরিপত্র',
      'প্রজ্ঞাপন',
      'বিজ্ঞপ্তি',
      'অফিস আদেশ',
      'গেজেট',
    ],
    reasons: 'Official governmental/corporate communication markers detected',
    reasonsBn: 'দাপ্তরিক চিঠি, স্মারক বা পরিপত্র সংক্রান্ত শিরোনাম শনাক্ত হয়েছে',
    actions: [
      {
        id: 'memo_sum',
        label: 'Extract Directives',
        labelBn: 'মূল নির্দেশনাসমূহ আলাদা করো',
        prompt: 'এই অফিস আদেশের মূল নির্দেশাবলী ও তারিখগুলো বুলেট পয়েন্ট আকারে দাও',
      },
    ],
  },
  {
    type: 'TRANSCRIPT',
    label: 'Academic Transcript / Marksheet',
    labelBn: 'নম্বরপত্র / একাডেমিক ট্রান্সক্রিপ্ট',
    keywords: [
      'transcript',
      'marksheet',
      'mark-sheet',
      'result',
      'grade',
      'নম্বরপত্র',
      'ট্রান্সক্রিপ্ট',
      'গ্রেডশিট',
      'গ্রেড শিট',
    ],
    reasons: 'Academic grade, marksheet, or transcript markers detected',
    reasonsBn: 'একাডেমিক ফলাফল বা নম্বরপত্র সংক্রান্ত তথ্য শনাক্ত হয়েছে',
    actions: [
      {
        id: 'trans_ocr',
        label: 'OCR Grade Table',
        labelBn: 'গ্রেড ও বিষয়সমূহ টেক্সটে রূপান্তর',
        prompt: 'এই মার্কশিটের বিষয়, প্রাপ্ত নম্বর ও জিপিএ ছক আকারে টেক্সট বের করো',
      },
    ],
  },
  {
    type: 'QUOTATION',
    label: 'Price Quotation / Tender Proposal',
    labelBn: 'দর প্রস্তাব / কোটেশন / টেন্ডার',
    keywords: [
      'quotation',
      'quote',
      'tender',
      'rfp',
      'rfq',
      'দরপত্র',
      'কোটেশন',
      'দর প্রস্তাব',
      'টেন্ডার',
    ],
    reasons: 'Quotation or commercial bidding terminology detected',
    reasonsBn: 'কোটেশন বা বাণিজ্যিক দর প্রস্তাবনা শনাক্ত হয়েছে',
    actions: [
      {
        id: 'quote_table',
        label: 'Extract Item Rates to Spreadsheet',
        labelBn: 'আইটেম ও রেট স্প্রেডশিটে বের করো',
        prompt: 'এই কোটেশনের সব মালামাল ও তার দর স্প্রেডশিট টেবিলে সাজাও',
      },
    ],
  },
  {
    type: 'MEETING_MINUTES',
    label: 'Meeting Minutes / Resolution',
    labelBn: 'সভার কার্যবিবরণী / রেজুলেশন',
    keywords: [
      'minutes',
      'meeting',
      'resolution',
      'কার্যবিবরণী',
      'রেজুলেশন',
      'সভার কার্যবিবরণী',
      'মিটিং',
    ],
    reasons: 'Meeting records or resolution syntax detected',
    reasonsBn: 'মিটিংয়ের কার্যবিবরণী বা সিদ্ধান্তসমূহ শনাক্ত হয়েছে',
    actions: [
      {
        id: 'min_action',
        label: 'Extract Action Items & Decisions',
        labelBn: 'গৃহীত সিদ্ধান্ত ও দায়িত্ব বণ্টন তালিকা',
        prompt: 'এই সভার গৃহীত সিদ্ধান্ত এবং কার ওপর কী দায়িত্ব দেওয়া হয়েছে তা বের করো',
      },
    ],
  },
];

/**
 * Deterministic Document Type Detection
 * Inputs:
 * - filename
 * - file type
 * - extracted text when already available
 * Outputs:
 * - documentType
 * - confidence
 * - reasons
 * - suggestedActions
 * Rules:
 * - use filename + extracted-text keywords
 * - do not pretend certainty
 * - low confidence => GENERAL_DOCUMENT or UNKNOWN
 * - no cloud AI call
 */
export function detectDocumentType(
  filename = '',
  fileType = '',
  extractedText = ''
): DocumentTypeDetectionResult {
  const normFilename = filename.toLowerCase().trim();
  const normFileType = fileType.toLowerCase().trim();
  const normText = extractedText.slice(0, 3000).toLowerCase().trim();

  if (!normFilename && !normFileType && !normText) {
    return {
      documentType: 'UNKNOWN',
      confidence: 0.1,
      reasons: ['No filename, file type, or extracted text provided'],
      suggestedActions: [],
    };
  }

  const sanitizedFileType = normFileType
    .replace(/^application\//, '')
    .replace(/^image\//, '')
    .replace(/^text\//, '');

  for (const rule of CLASSIFICATION_RULES) {
    for (const kw of rule.keywords) {
      const kwLower = kw.toLowerCase();
      // Match whole word with delimiters (spaces, underscores, dashes, dots, brackets, slashes)
      const regex = new RegExp(`(^|[\\s._\\-\\(\\[/\\\\])${kwLower}([\\s._\\-\\)\\]/\\\\]|$)`, 'i');
      if (regex.test(normFilename) || regex.test(normText) || regex.test(sanitizedFileType)) {
        const isInText = regex.test(normText);
        const isInFilename = regex.test(normFilename);
        const confidence = isInFilename && isInText ? 0.95 : 0.88;

        return {
          documentType: rule.type,
          confidence,
          reasons: [rule.reasons],
          suggestedActions: rule.actions,
        };
      }
    }
  }

  // If file extension indicates standard document but content has no specific category
  const isDocumentFile =
    /\.(pdf|docx?|txt|xlsx?|csv|pptx?)$/i.test(normFilename) ||
    normFileType.includes('pdf') ||
    normFileType.includes('document') ||
    normFileType.includes('sheet') ||
    normFileType.includes('text');

  if (isDocumentFile || normText.length > 20) {
    return {
      documentType: 'GENERAL_DOCUMENT',
      confidence: 0.45,
      reasons: ['Standard office document without distinctive domain keywords'],
      suggestedActions: [
        {
          id: 'gen_sum',
          label: 'Summarize Document',
          labelBn: 'সারসংক্ষেপ তৈরি করো',
          prompt: 'এই ডকুমেন্টের মূল বিষয়বস্তু সংক্ষেপে ৩-৪টি বাক্যে সারসংক্ষেপ করো',
        },
        {
          id: 'gen_extract',
          label: 'Extract Text',
          labelBn: 'টেক্সট বের করো',
          prompt: 'এই ফাইলের সমস্ত টেক্সট পরিষ্কার আকারে এক্সট্রাক্ট করো',
        },
      ],
    };
  }

  return {
    documentType: 'UNKNOWN',
    confidence: 0.15,
    reasons: ['Insufficient evidence to classify document structure'],
    suggestedActions: [],
  };
}

/**
 * Classify document based on files and optional text preview.
 * Returns GENERAL_DOCUMENT or UNKNOWN if evidence is low or missing.
 */
export function classifyDocument(
  files: File[] = [],
  sampleText = ''
): DocumentClassificationResult {
  const primaryFile = files[0];
  const combinedFilenames = files.map((f) => f.name).join(' ');
  const combinedType = files.map((f) => f.type).join(' ');

  const result = detectDocumentType(combinedFilenames, combinedType, sampleText);
  const matchedRule = CLASSIFICATION_RULES.find((r) => r.type === result.documentType);

  if (matchedRule) {
    return {
      type: matchedRule.type,
      label: matchedRule.label,
      labelBn: matchedRule.labelBn,
      confidence: result.confidence,
      reasons: result.reasons,
      reasonsBn: [matchedRule.reasonsBn],
      suggestedActions: result.suggestedActions,
    };
  }

  if (result.documentType === 'GENERAL_DOCUMENT') {
    return {
      type: 'GENERAL_DOCUMENT',
      label: 'General Document',
      labelBn: 'সাধারণ অফিস ডকুমেন্ট',
      confidence: result.confidence,
      reasons: result.reasons,
      reasonsBn: ['সুনির্দিষ্ট ক্যাটাগরি শনাক্ত হয়নি; সাধারণ অফিস ডকুমেন্ট হিসেবে বিবেচিত'],
      suggestedActions: result.suggestedActions,
    };
  }

  return {
    type: 'UNKNOWN',
    label: 'Unknown Document',
    labelBn: 'অনির্ধারিত ডকুমেন্ট',
    confidence: result.confidence,
    reasons: result.reasons,
    reasonsBn: ['বিশ্লেষণের জন্য পর্যাপ্ত তথ্য বা প্রমাণ পাওয়া যায়নি'],
    suggestedActions: [],
  };
}
