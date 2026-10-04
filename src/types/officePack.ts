/**
 * MAISHAA WORKSPACE — Phase 3 One-Click Office Pack Types
 */

export type OfficePackType =
  | 'project_report'
  | 'business'
  | 'meeting'
  | 'study'
  | 'custom';

export type OutputFormat = 'docx' | 'pdf' | 'xlsx' | 'pptx';

export interface PlannedOutput {
  id: string;
  format: OutputFormat;
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  enabled: boolean;
}

export interface OfficePackConfig {
  id: OfficePackType;
  name: string;
  nameBn: string;
  tagline: string;
  taglineBn: string;
  badge: string;
  badgeBn: string;
  defaultOutputs: PlannedOutput[];
}

export type AiProcessingMode = 'local' | 'cloud';

export type StepExecutionTier = 'LOCAL' | 'CLOUD AI';
export type StepStatus = 'READY' | 'PLANNED' | 'NOT SUPPORTED';

export interface WorkflowPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  titleBn: string;
  tier: StepExecutionTier;
  status: StepStatus;
  requiresAiConsent?: boolean;
  format?: OutputFormat;
  description: string;
  descriptionBn: string;
}

export interface OfficePackWorkflowPlan {
  packType: OfficePackType;
  packName: string;
  packNameBn: string;
  sourceFileName: string;
  sourceFileSize: number;
  sourceFileType: string;
  isSourceSupported: boolean;
  unsupportedReason?: string;
  steps: WorkflowPlanStep[];
  selectedFormats: OutputFormat[];
  hasCloudAiStep: boolean;
  totalSteps: number;
  plannedAt: string;
  isConfirmed: boolean;
}

export type SourceExtractionStatus =
  | 'READY'
  | 'EMPTY'
  | 'NOT SUPPORTED'
  | 'EXTRACTION FAILED';

export type SupportedSourceType =
  | 'txt'
  | 'md'
  | 'csv'
  | 'docx'
  | 'pdf'
  | 'unsupported';

export interface NormalizedSourceContent {
  title: string;
  plainText: string;
  paragraphs: string[];
  headings: string[];
  rows: string[][];
  sourceType: SupportedSourceType;
  sourceFileName: string;
  extractionStatus: SourceExtractionStatus;
  charCount: number;
  paragraphCount: number;
  error?: string;
}

export type QualityStatus = 'VALID' | 'WARNING' | 'FAILED';

export interface QualityIssue {
  code: string;
  message: string;
  severity: 'WARNING' | 'FAILED';
}

export interface QualityReport {
  format: OutputFormat;
  status: QualityStatus;
  issues: QualityIssue[];
  checksPassed: string[];
}

export type BatchItemStatus =
  | 'QUEUED'
  | 'EXTRACTING'
  | 'READY'
  | 'GENERATING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'NOT SUPPORTED'
  | 'FAILED'
  | 'CANCELLED';

export interface BatchSourceItem {
  id: string;
  file: File | { name: string; size: number; textContent?: string; isScanned?: boolean; arrayBuffer?: () => Promise<ArrayBuffer> };
  originalFilename: string;
  safeFilename: string;
  sourceType: SupportedSourceType;
  status: BatchItemStatus;
  extractionStatus?: SourceExtractionStatus;
  normalized?: NormalizedSourceContent;
  workflowPlan?: OfficePackWorkflowPlan;
  selectedOutputs: OutputFormat[];
  formatStatuses?: Record<OutputFormat, {
    status: 'Generated' | 'Failed' | 'Not Selected' | 'NOT SUPPORTED';
    qualityStatus?: QualityStatus;
    error?: string;
  }>;
  qualityReports?: Record<OutputFormat, QualityReport>;
  generatedFiles: {
    format: OutputFormat;
    filename: string;
    blob: Blob;
    size: number;
    qualityReport?: QualityReport;
  }[];
  error?: string;
  warningSummary?: string;
}

export interface BatchProcessingState {
  items: BatchSourceItem[];
  isProcessing: boolean;
  isCancelled: boolean;
  totalItems: number;
  completedItems: number;
  activeItemIndex: number;
}
