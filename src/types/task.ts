/**
 * MAISHAA WORKSPACE — Phase 3 Smart Task & Workflow Types
 */

export type TaskIntent =
  | 'PDF_MERGE'
  | 'PDF_SPLIT'
  | 'PDF_SUMMARY'
  | 'OCR'
  | 'IMAGE_COMPRESS'
  | 'IMAGE_RESIZE'
  | 'IMAGE_CONVERT'
  | 'DOCUMENT_ANALYSIS'
  | 'SPREADSHEET_ANALYSIS'
  | 'PRESENTATION_ANALYSIS'
  | 'TRANSLATION'
  | 'BATCH_PROCESS'
  | 'OFFICE_PACK'
  | 'FORM_CREATE'
  | 'UNKNOWN';

export interface TaskRouterResult {
  detectedIntent: TaskIntent;
  confidence: number;
  requiredCapabilities: string[];
}

export type StepExecutionMode = 'LOCAL' | 'CLOUD_AI' | 'USER_CONFIRMATION';

export type StepSupportStatus = 'SUPPORTED' | 'NOT_YET_SUPPORTED' | 'PARTIAL';

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  mode: StepExecutionMode;
  supportStatus: StepSupportStatus;
  stepStatus?: 'planned' | 'ready';
  targetModule?:
    | 'universal'
    | 'pdf'
    | 'image'
    | 'batch'
    | 'convert'
    | 'ocr'
    | 'doc_intel'
    | 'sheet_intel'
    | 'slides_intel'
    | 'ai_assistant';
  targetAction?: string;
  unsupportedReason?: string;
  unsupportedReasonBn?: string;
  alternativeProposal?: string;
  alternativeProposalBn?: string;
}

export type DocumentClassificationType =
  | 'CV'
  | 'INVOICE'
  | 'CERTIFICATE'
  | 'BANK_STATEMENT'
  | 'REPORT'
  | 'APPLICATION'
  | 'TRANSCRIPT'
  | 'OFFICE_LETTER'
  | 'QUOTATION'
  | 'MEETING_MINUTES'
  | 'GENERAL_DOCUMENT'
  | 'UNKNOWN';

export interface ClassificationAction {
  id: string;
  label: string;
  labelBn: string;
  prompt: string;
}

export interface DocumentClassificationResult {
  type: DocumentClassificationType;
  label: string;
  labelBn: string;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
  reasonsBn: string[];
  suggestedActions: ClassificationAction[];
}

export interface DocumentTypeDetectionResult {
  documentType: DocumentClassificationType;
  confidence: number;
  reasons: string[];
  suggestedActions: ClassificationAction[];
}

export interface SmartTask {
  id: string;
  instruction: string;
  files: File[];
  detectedIntent: TaskIntent;
  requiredCapabilities: string[];
  workflowSteps: WorkflowStep[];
  status:
    | 'PLANNING'
    | 'READY'
    | 'EXECUTING'
    | 'COMPLETED'
    | 'FAILED'
    | 'REQUIRES_USER_ACTION';
  warnings: string[];
  warningsBn: string[];
  classification?: DocumentClassificationResult;
  hasUnsupportedStep: boolean;
  hasCloudAiStep: boolean;
  activeStepIndex?: number;
  resultSummary?: string;
  resultSummaryBn?: string;
}

export interface SmartSuggestion {
  id: string;
  label: string;
  labelBn: string;
  promptTemplate: string;
  promptTemplateBn?: string;
  targetModule: string;
  isCloudAi: boolean;
  icon?: string;
}

export interface SmartTaskHistoryEntry {
  id: string;
  taskName: string;
  instruction: string;
  sourceFilenames: string[];
  workflowSteps: string[];
  outputFilename?: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  processingMode: 'LOCAL' | 'CLOUD_AI' | 'HYBRID';
  timestamp: number;
}
