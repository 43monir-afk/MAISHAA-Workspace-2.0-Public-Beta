export type SupportedFileType = 
  | 'pdf'
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'docx'
  | 'xlsx'
  | 'csv'
  | 'pptx'
  | 'txt'
  | 'unsupported';

export type ToolCategory =
  | 'universal'
  | 'pdf'
  | 'image'
  | 'bg_remover'
  | 'creative'
  | 'whiteboard'
  | 'batch'
  | 'convert'
  | 'ocr'
  | 'doc_intel'
  | 'sheet_intel'
  | 'slides_intel'
  | 'forms'
  | 'office_pack'
  | 'ai_command'
  | 'ai_assistant'
  | 'document_future'
  | 'spreadsheet_future'
  | 'presentation_future'
  | 'ocr_future'
  | 'ai_future'
  | 'tutorials'
  | 'privacy'
  | 'about';

export type JobStatus = 
  | 'WAITING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ProcessedJob {
  id: string;
  toolType: string;
  fileNames: string[];
  originalSize: number;
  status: JobStatus;
  progress?: number; // 0-100 or undefined for indeterminate
  outputSize?: number;
  outputBlob?: Blob;
  outputUrl?: string;
  outputFilename?: string;
  errorState?: string;
  startedTime: number;
  completedTime?: number;
  reductionPercentage?: number;
  notes?: string;
  workflowSteps?: string[];
  processingMode?: 'LOCAL' | 'CLOUD_AI' | 'HYBRID';
}

export interface SessionHistoryItem {
  id: string;
  toolUsed: string;
  filename: string;
  time: string;
  status: 'COMPLETED' | 'FAILED';
  sizeBefore: number;
  sizeAfter?: number;
  reductionPct?: number;
  workflowSteps?: string[];
  processingMode?: 'LOCAL' | 'CLOUD_AI' | 'HYBRID';
  outputFilename?: string;
}

export type LanguageMode = 'bn' | 'en';

export type ProcessingMode = 'LOCAL' | 'CLOUD_AI';

export interface FileDetectionResult {
  file: File;
  type: SupportedFileType;
  extension: string;
  isPhase1Supported: boolean;
  suggestedActions: {
    id: string;
    labelBn: string;
    labelEn: string;
    targetModule: 'pdf' | 'image' | 'batch' | 'convert' | 'ocr' | 'doc_intel' | 'sheet_intel' | 'slides_intel' | 'ai_assistant';
    actionType: string;
  }[];
  unsupportedMessageBn?: string;
  unsupportedMessageEn?: string;
}

export interface DocumentAnalysis {
  fileId: string;
  fileName: string;
  fileType: SupportedFileType;
  pageCount?: number;
  sheetCount?: number;
  slideCount?: number;
  wordCount?: number;
  charCount?: number;
  extractedText?: string;
  sections?: Array<{ title?: string; content: string }>;
  tables?: Array<Array<string[]>>;
  ocrUsed: boolean;
  ocrConfidence?: number;
  processingMode: ProcessingMode;
  warnings?: string[];
  pdfClassification?: 'TEXT_BASED' | 'SCANNED' | 'MIXED';
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isAiOutput?: boolean;
  groundedInDocument?: boolean;
}
