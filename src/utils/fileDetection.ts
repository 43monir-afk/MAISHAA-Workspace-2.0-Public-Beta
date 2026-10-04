import { SupportedFileType, FileDetectionResult } from '../types/workspace';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function sanitizeFilename(filename: string, fallback = 'document'): string {
  if (!filename) return fallback;
  // Strip dangerous path separators, control characters, tags, script injections
  const clean = filename
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
    .replace(/\.\.+/g, '.')
    .trim();
  return clean || fallback;
}

export function generateSafeOutputFilename(
  originalName: string,
  suffix: string,
  targetExtension?: string
): string {
  const clean = sanitizeFilename(originalName);
  const lastDot = clean.lastIndexOf('.');
  const baseName = lastDot > 0 ? clean.substring(0, lastDot) : clean;
  const originalExt = lastDot > 0 ? clean.substring(lastDot + 1) : '';
  const finalExt = targetExtension || originalExt || 'pdf';
  return `${baseName}-${suffix}.${finalExt}`;
}

export function detectFileType(file: File): FileDetectionResult {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  let type: SupportedFileType = 'unsupported';
  let extension = '';

  const extMatch = name.match(/\.([a-z0-9]+)$/i);
  if (extMatch) {
    extension = extMatch[1].toLowerCase();
  }

  // PDF
  if (mime === 'application/pdf' || extension === 'pdf') {
    type = 'pdf';
  }
  // JPEG
  else if (mime === 'image/jpeg' || extension === 'jpg' || extension === 'jpeg') {
    type = 'jpeg';
  }
  // PNG
  else if (mime === 'image/png' || extension === 'png') {
    type = 'png';
  }
  // WebP
  else if (mime === 'image/webp' || extension === 'webp') {
    type = 'webp';
  }
  // DOCX
  else if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx' ||
    extension === 'doc'
  ) {
    type = 'docx';
  }
  // XLSX
  else if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    extension === 'xlsx' ||
    extension === 'xls'
  ) {
    type = 'xlsx';
  }
  // CSV
  else if (mime === 'text/csv' || extension === 'csv') {
    type = 'csv';
  }
  // PPTX
  else if (
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    extension === 'pptx' ||
    extension === 'ppt'
  ) {
    type = 'pptx';
  }
  // TXT
  else if (mime === 'text/plain' || extension === 'txt') {
    type = 'txt';
  }

  const isPhase1Supported = [
    'pdf',
    'jpeg',
    'png',
    'webp',
    'txt',
  ].includes(type);

  // Define suggested actions
  const suggestedActions: FileDetectionResult['suggestedActions'] = [];

  if (type === 'pdf') {
    suggestedActions.push(
      { id: 'merge', labelBn: 'পিডিএফ একত্রীকরণ (Merge)', labelEn: 'Merge PDF', targetModule: 'pdf', actionType: 'merge' },
      { id: 'split', labelBn: 'পিডিএফ বিভক্তকরণ (Split)', labelEn: 'Split PDF', targetModule: 'pdf', actionType: 'split' },
      { id: 'compress', labelBn: 'পিডিএফ অপটিমাইজ ও কম্প্রেশন', labelEn: 'Compress PDF', targetModule: 'pdf', actionType: 'compress' },
      { id: 'pdf_to_docx', labelBn: 'ওয়ার্ডে রূপান্তর (PDF → Word)', labelEn: 'Convert to Word', targetModule: 'convert', actionType: 'convert' },
      { id: 'pdf_to_xlsx', labelBn: 'এক্সেলে রূপান্তর (PDF → Excel)', labelEn: 'Convert to Excel', targetModule: 'convert', actionType: 'convert' }
    );
  } else if (['jpeg', 'png', 'webp'].includes(type)) {
    suggestedActions.push(
      { id: 'resize', labelBn: 'সাইজ পরিবর্তন (Resize)', labelEn: 'Resize Image', targetModule: 'image', actionType: 'resize' },
      { id: 'compress_img', labelBn: 'কম্প্রেশন (Compress)', labelEn: 'Compress Image', targetModule: 'image', actionType: 'compress' },
      { id: 'crop', labelBn: 'ক্রপ (Crop)', labelEn: 'Crop Image', targetModule: 'image', actionType: 'crop' },
      { id: 'convert_fmt', labelBn: 'ফরম্যাট পরিবর্তন (JPG/PNG/WebP)', labelEn: 'Convert Format', targetModule: 'image', actionType: 'convert' },
      { id: 'img_to_pdf', labelBn: 'ছবি থেকে পিডিএফ (To PDF)', labelEn: 'Convert to PDF', targetModule: 'pdf', actionType: 'imagesToPdf' }
    );
  } else if (type === 'txt') {
    suggestedActions.push(
      { id: 'normalize_txt', labelBn: 'টেক্সট ক্লিনআপ ও নরমালাইজ', labelEn: 'Normalize & Clean TXT', targetModule: 'convert', actionType: 'txtNormalize' }
    );
  }

  const unsupportedMessageBn = !isPhase1Supported
    ? 'এই ফাইলটি শনাক্ত করা হয়েছে, তবে এই টুলটি পরবর্তী সংস্করণে সম্পূর্ণভাবে সমর্থিত হবে।'
    : undefined;

  const unsupportedMessageEn = !isPhase1Supported
    ? 'This file type was detected, but full processing will be supported in a future version.'
    : undefined;

  return {
    file,
    type,
    extension,
    isPhase1Supported,
    suggestedActions,
    unsupportedMessageBn,
    unsupportedMessageEn,
  };
}

export const detectFile = detectFileType;

export function detectMultipleFiles(files: File[]): FileDetectionResult[] {
  return files.map(detectFileType);
}

/**
 * Augment suggested actions with Phase 2 capabilities (OCR, Document Intelligence, Spreadsheet, Slides).
 * Preserves the Phase 1 detectFileType contract untouched for regression safety.
 */
export function getPhase2Actions(result: FileDetectionResult): FileDetectionResult['suggestedActions'] {
  const actions: FileDetectionResult['suggestedActions'] = [...result.suggestedActions];

  if (['jpeg', 'png', 'webp'].includes(result.type)) {
    actions.unshift({
      id: 'ocr_image',
      labelBn: 'ওসিআর টেক্সট এক্সট্রাক্ট (OCR)',
      labelEn: 'Scan & Extract Text (OCR)',
      targetModule: 'ocr',
      actionType: 'ocr',
    });
  } else if (result.type === 'pdf') {
    actions.unshift(
      {
        id: 'pdf_intel',
        labelBn: 'পিডিএফ টেক্সট ও বিশ্লেষণ (Intelligence)',
        labelEn: 'PDF Text & Intelligence',
        targetModule: 'pdf',
        actionType: 'intelligence',
      },
      {
        id: 'ocr_pdf',
        labelBn: 'স্ক্যানড পিডিএফ ওসিআর (OCR)',
        labelEn: 'Scanned PDF OCR',
        targetModule: 'ocr',
        actionType: 'ocr',
      }
    );
  } else if (result.type === 'docx') {
    actions.push({
      id: 'docx_intel',
      labelBn: 'ডকুমেন্ট টেক্সট বিশ্লেষণ (DOCX)',
      labelEn: 'Document Intelligence',
      targetModule: 'doc_intel',
      actionType: 'read',
    });
  } else if (result.type === 'xlsx' || result.type === 'csv') {
    actions.push({
      id: 'sheet_intel',
      labelBn: 'স্প্রেডশিট ডেটা বিশ্লেষণ',
      labelEn: 'Spreadsheet Intelligence',
      targetModule: 'sheet_intel',
      actionType: 'read',
    });
  } else if (result.type === 'pptx') {
    actions.push({
      id: 'slides_intel',
      labelBn: 'স্লাইড টেক্সট অ্যানালাইসিস',
      labelEn: 'Presentation Intelligence',
      targetModule: 'slides_intel',
      actionType: 'read',
    });
  }

  return actions;
}
