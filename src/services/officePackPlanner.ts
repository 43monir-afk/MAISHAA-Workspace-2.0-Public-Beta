/**
 * MAISHAA WORKSPACE — Phase 3 One-Click Office Pack Workflow Planner
 * Generates transparent, visible step-by-step execution plans.
 * Strictly adheres to privacy guarantees:
 * - Only includes steps needed for selected outputs
 * - Shows LOCAL / CLOUD AI tier for each step
 * - Shows PLANNED / READY / NOT SUPPORTED status
 * - Explicitly marks AI consent requirement before any cloud step
 * - No fake execution, no premature file generation, no premature AI calls
 */

import {
  OfficePackType,
  PlannedOutput,
  AiProcessingMode,
  WorkflowPlanStep,
  OfficePackWorkflowPlan,
  OutputFormat,
} from '../types/officePack';
import { getPackConfig } from '../data/officePacks';

const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'doc',
  'xlsx',
  'xls',
  'csv',
  'pptx',
  'ppt',
  'txt',
  'md',
  'png',
  'jpg',
  'jpeg',
  'webp',
]);

/**
 * Determine whether a source file is supported for office extraction.
 */
export function isSourceFileSupported(filename: string): boolean {
  if (!filename) return false;
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/i);
  if (!match) return false;
  return SUPPORTED_SOURCE_EXTENSIONS.has(match[1]);
}

/**
 * Construct the visible workflow plan for the selected pack and active outputs.
 */
export function buildOfficePackPlan(
  file: { name: string; size: number; type?: string; textContent?: string; [key: string]: any } | null,
  packType: OfficePackType,
  enabledOutputs: (PlannedOutput | { format: OutputFormat; enabled?: boolean; [key: string]: any })[],
  aiMode: AiProcessingMode = 'local'
): OfficePackWorkflowPlan {
  const packConfig = getPackConfig(packType);
  const fileName = file?.name || 'source_document';
  const fileSize = file?.size || 0;
  const isSupported = file ? isSourceFileSupported(fileName) : true;

  const steps: WorkflowPlanStep[] = [];
  let stepCounter = 1;

  // 1. Detect source file — LOCAL
  steps.push({
    id: 'step_detect_source',
    stepNumber: stepCounter++,
    title: 'Detect source file',
    titleBn: 'উৎস ফাইল শনাক্তকরণ',
    tier: 'LOCAL',
    status: isSupported ? 'READY' : 'NOT SUPPORTED',
    description: isSupported
      ? 'Inspect file signature, MIME type, encoding, and metadata.'
      : 'Source file format is unrecognized or unsupported.',
    descriptionBn: isSupported
      ? 'ফাইলের ধরন, এক্সটেনশন ও অভ্যন্তরীণ স্ট্রাকচার যাচাই।'
      : 'উৎস ফাইলের ফরম্যাটটি সমর্থিত নয়।',
  });

  // 2. Extract source content — LOCAL
  steps.push({
    id: 'step_extract_content',
    stepNumber: stepCounter++,
    title: 'Extract source content',
    titleBn: 'উৎস কনটেন্ট এক্সট্রাকশন',
    tier: 'LOCAL',
    status: isSupported ? 'READY' : 'NOT SUPPORTED',
    description: isSupported
      ? 'Parse text blocks, tabular data, slides, or structural elements in browser sandbox.'
      : 'Local extraction engine cannot parse unsupported file format.',
    descriptionBn: isSupported
      ? 'ব্রাউজার স্যান্ডবক্সে টেক্সট, ডেটা টেবিল ও স্ট্রাকচারাল উপাদান পার্স করা।'
      : 'অসমর্থিত ফরম্যাট হওয়ায় কনটেন্ট এক্সট্রাক্ট করা সম্ভব নয়।',
  });

  // 3. Prepare report structure — LOCAL
  steps.push({
    id: 'step_prepare_structure',
    stepNumber: stepCounter++,
    title: 'Prepare report structure',
    titleBn: 'রিপোর্ট ও নথি কাঠামো প্রস্তুতি',
    tier: 'LOCAL',
    status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
    description:
      'Generate unified outline, section titles, and cross-format metadata slots.',
    descriptionBn:
      'সমন্বিত রূপরেখা, সেকশন শিরোনাম ও মাল্টি-ডকুমেন্ট মেটাডেটা বিন্যাস তৈরি।',
  });

  // 4. AI summary if needed — CLOUD AI
  steps.push({
    id: 'step_ai_summary',
    stepNumber: stepCounter++,
    title: 'AI summary if needed',
    titleBn: 'AI সারসংক্ষেপ (প্রয়োজনানুসারে)',
    tier: 'CLOUD AI',
    status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
    requiresAiConsent: true,
    description:
      'Requires explicit user consent before cloud execution. Generates executive briefings and smart highlights.',
    descriptionBn:
      'ক্লাউড প্রসেসিং শুরুর পূর্বে ব্যবহারকারীর সুস্পষ্ট সম্মতি প্রয়োজন। সারসংক্ষেপ ও প্রধান পয়েন্ট প্রস্তুত করে।',
  });

  // Output-specific steps (ONLY include steps needed for selected outputs!)
  const selectedFormats: OutputFormat[] = [];

  const hasDocx = enabledOutputs.some((o) => o.format === 'docx' && o.enabled);
  if (hasDocx) {
    selectedFormats.push('docx');
    steps.push({
      id: 'step_prepare_docx',
      stepNumber: stepCounter++,
      title: 'Prepare DOCX',
      titleBn: 'DOCX প্রস্তুতকরণ',
      tier: 'LOCAL',
      status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
      format: 'docx',
      description:
        'Compile formatted WordprocessingML document with preserved layout and headings.',
      descriptionBn:
        'সঠিক হেডিং ও লাইন ব্রেকসহ প্রফেশনাল ওয়ার্ড ডকুমেন্ট তৈরি।',
    });
  }

  const hasPdf = enabledOutputs.some((o) => o.format === 'pdf' && o.enabled);
  if (hasPdf) {
    selectedFormats.push('pdf');
    steps.push({
      id: 'step_prepare_pdf',
      stepNumber: stepCounter++,
      title: 'Prepare PDF',
      titleBn: 'PDF প্রস্তুতকরণ',
      tier: 'LOCAL',
      status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
      format: 'pdf',
      description:
        'Render print-ready A4 document layout with vector branding and clean typography.',
      descriptionBn:
        'ভেক্টর হেডার ও স্পষ্ট ফন্টসহ প্রিন্ট-উপযোগী A4 পিডিএফ তৈরি।',
    });
  }

  const hasXlsx = enabledOutputs.some((o) => o.format === 'xlsx' && o.enabled);
  if (hasXlsx) {
    selectedFormats.push('xlsx');
    steps.push({
      id: 'step_prepare_xlsx',
      stepNumber: stepCounter++,
      title: 'Prepare XLSX summary',
      titleBn: 'XLSX ডেটা ও সারসংক্ষেপ প্রস্তুতি',
      tier: 'LOCAL',
      status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
      format: 'xlsx',
      description:
        'Generate structured workbook with calculation tables, headers, and KPI grids.',
      descriptionBn:
        'হিসাব টেবিল, কলাম হেডার ও ডেটাসেটসহ স্প্রেডশিট প্রস্তুত।',
    });
  }

  const hasPptx = enabledOutputs.some((o) => o.format === 'pptx' && o.enabled);
  if (hasPptx) {
    selectedFormats.push('pptx');
    steps.push({
      id: 'step_prepare_pptx',
      stepNumber: stepCounter++,
      title: 'Prepare PPTX presentation',
      titleBn: 'PPTX প্রেজেন্টেশন স্লাইড প্রস্তুতি',
      tier: 'LOCAL',
      status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
      format: 'pptx',
      description:
        'Assemble widescreen presentation slides, speaker points, and visual deliverables.',
      descriptionBn:
        'ওয়াইডস্ক্রিন স্লাইড, প্রধান পয়েন্ট ও উপস্থাপনা ডেক প্রস্তুত।',
    });
  }

  // Final step: Package outputs — LOCAL
  steps.push({
    id: 'step_package_outputs',
    stepNumber: stepCounter++,
    title: 'Package outputs',
    titleBn: 'আউটপুট প্যাকেজিং ও বান্ডিল',
    tier: 'LOCAL',
    status: isSupported ? 'PLANNED' : 'NOT SUPPORTED',
    description:
      'Coordinate and bundle all configured target documents into a single download pack.',
    descriptionBn:
      'প্রস্তুতকৃত সকল ডকুমেন্টকে সমন্বিত প্যাকেজে একীভূত করা।',
  });

  return {
    packType,
    packName: packConfig.name,
    packNameBn: packConfig.nameBn,
    sourceFileName: fileName,
    sourceFileSize: fileSize,
    sourceFileType: fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN',
    isSourceSupported: isSupported,
    unsupportedReason: isSupported
      ? undefined
      : `Format '.${fileName.split('.').pop()}' is not supported by the local office parser.`,
    steps,
    selectedFormats,
    hasCloudAiStep: steps.some((s) => s.tier === 'CLOUD AI'),
    totalSteps: steps.length,
    plannedAt: new Date().toISOString(),
    isConfirmed: false,
  };
}
