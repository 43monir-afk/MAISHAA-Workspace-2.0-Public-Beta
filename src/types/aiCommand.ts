/**
 * MAISHAA WORKSPACE — Phase 4 Step 4A
 * AI Command Center Types
 * 
 * Strict deterministic schema for AI intent analysis,
 * structured planning, and non-destructive execution guards.
 */

export type AiIntentCategory =
  | 'summarize'
  | 'rewrite'
  | 'translate'
  | 'document_plan'
  | 'office_pack_plan'
  | 'spreadsheet_analysis'
  | 'presentation_plan'
  | 'extract_information'
  | 'organize_content'
  | 'unsupported';

export type AiDetectedLanguage = 'Bangla' | 'English' | 'Mixed' | 'Unknown';

export type SuggestedOfficeOutput = 'DOCX' | 'PDF' | 'XLSX' | 'PPTX';

export type AiCommandStatus =
  | 'READY'
  | 'ANALYZING'
  | 'COMPLETE'
  | 'NOT CONFIGURED'
  | 'QUOTA EXCEEDED'
  | 'TIMEOUT'
  | 'ERROR';

export interface AiCommandPlan {
  intent: AiIntentCategory;
  confidence: number;
  language: AiDetectedLanguage;
  summary: string;
  suggestedActions: string[];
  suggestedOutputs: SuggestedOfficeOutput[];
  requiresConfirmation: true;
  warnings: string[];
}

export type AiExecutionStatus =
  | 'IDLE'
  | 'AWAITING_CONFIRMATION'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'CANCELLED'
  | 'FAILED';

export interface AiExecutionProgress {
  step: string;
  stepBn: string;
  percent: number;
  details?: string;
}

export interface AiExecutionAuditRecord {
  timestamp: string;
  intent: AiIntentCategory;
  executionStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  durationMs: number;
  outputFormats: string[];
  filesCount: number;
  hasTextPreview: boolean;
  error?: string;
}

export interface AiExecutionResult {
  success: boolean;
  intent: AiIntentCategory;
  generatedText?: string;
  generatedFiles?: any[];
  formatStatuses?: Record<string, any>;
  unsupportedNotice?: string;
  error?: string;
  audit?: AiExecutionAuditRecord;
}

export interface AiExecutionTextRequest {
  action: 'summarize' | 'rewrite' | 'translate' | 'extract_information' | 'organize_content';
  instruction: string;
  sourceText?: string;
  targetLanguage?: 'Bangla' | 'English' | 'Mixed';
}

export interface AiCommandSourceContext {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  extractedSnippet?: string;
}

export interface AiCommandRequest {
  instruction: string;
  sourceContext?: AiCommandSourceContext;
}

export interface AiCommandAuditMetadata {
  timestamp: string;
  intent: AiIntentCategory;
  providerStatus: string;
  status: 'SUCCESS' | 'FAILURE';
  confirmationRequired: boolean;
}

export interface AiCommandAnalysisResult {
  plan?: AiCommandPlan;
  status: AiCommandStatus;
  message?: string;
  audit?: AiCommandAuditMetadata;
}

// ============================================================================
// Phase 4 Step 4D: Multi-file Batch Command Execution Types
// ============================================================================

export type BatchFileExecutionStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNSUPPORTED';

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isSupported: boolean;
  unsupportedReason?: string;
  status: BatchFileExecutionStatus;
  progressPercent?: number;
  textSnippet?: string;
  charCount?: number;
  isTruncated?: boolean;
  generatedText?: string;
  generatedFiles?: any[];
  formatStatuses?: Record<string, any>;
  error?: string;
}

export interface BatchExecutionProgress {
  totalCount: number;
  completedCount: number;
  currentFileName?: string;
  currentFileIndex: number;
  overallPercent: number;
  status:
    | 'IDLE'
    | 'AWAITING_CONFIRMATION'
    | 'RUNNING'
    | 'PAUSED_QUOTA'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'FAILED';
}

export interface BatchExecutionAuditRecord {
  runId: string;
  timestamp: string;
  intent: AiIntentCategory;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  durationMs: number;
  outputFormats: string[];
  totalFiles: number;
  successCount: number;
  failedCount: number;
  unsupportedCount: number;
  cancelledCount: number;
}

export interface BatchManifestItem {
  fileName: string;
  fileSize: number;
  status: BatchFileExecutionStatus;
  outputFormatsGenerated: string[];
  generatedFilesCount: number;
  hasTextPreview: boolean;
  error?: string;
}

export interface BatchManifest {
  manifestVersion: string;
  runId: string;
  timestamp: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  unsupportedCount: number;
  cancelledCount: number;
  files: BatchManifestItem[];
}
