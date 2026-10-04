/**
 * MAISHAA WORKSPACE — Phase 4 Step 4A
 * AI Command Service
 * 
 * Reusable client abstraction for AI Command Center.
 * Handles environment-based provider routing, timeout management,
 * structured schema validation, error isolation, quota resilience,
 * and lightweight audit metadata tracking.
 * 
 * Security: Never holds API keys. API keys stay exclusively on the server.
 */

import {
  AiCommandRequest,
  AiCommandAnalysisResult,
  AiCommandPlan,
  AiCommandAuditMetadata,
  AiIntentCategory,
  AiDetectedLanguage,
  SuggestedOfficeOutput,
  AiExecutionAuditRecord,
  AiExecutionTextRequest,
  AiCommandStatus,
  BatchExecutionAuditRecord,
} from '../types/aiCommand';

const DEFAULT_TIMEOUT_MS = 15000;

// Read provider settings from environment variables (safe frontend config)
export function getAiProviderConfig(): { provider: string; endpoint: string } {
  const provider = (import.meta.env.VITE_AI_PROVIDER as string) || 'gemini';
  const endpoint = (import.meta.env.VITE_AI_API_ENDPOINT as string) || '/api/ai/command';
  return { provider, endpoint };
}

// Session-scoped lightweight audit trail (metadata only — never stores sensitive source text)
const sessionAuditTrail: AiCommandAuditMetadata[] = [];

export function getSessionAuditTrail(): readonly AiCommandAuditMetadata[] {
  return [...sessionAuditTrail];
}

export function clearSessionAuditTrail(): void {
  sessionAuditTrail.length = 0;
}

// Phase 4 Step 4B: Execution Audit Trail (Metadata-only: timestamps, intents, format lists, durations, never source text or keys)
const sessionExecutionAuditTrail: AiExecutionAuditRecord[] = [];

export function getSessionExecutionAuditTrail(): readonly AiExecutionAuditRecord[] {
  return [...sessionExecutionAuditTrail];
}

export function clearSessionExecutionAuditTrail(): void {
  sessionExecutionAuditTrail.length = 0;
}

export function recordExecutionAudit(record: AiExecutionAuditRecord): void {
  sessionExecutionAuditTrail.push(record);
}

// Phase 4 Step 4D: Multi-file Batch Execution Audit Trail
// Strictly metadata-only: run ID, status, duration, formats, counts (never logs source text, instructions, private content, or API keys)
const sessionBatchAuditTrail: BatchExecutionAuditRecord[] = [];

export function getSessionBatchAuditTrail(): readonly BatchExecutionAuditRecord[] {
  return [...sessionBatchAuditTrail];
}

export function clearSessionBatchAuditTrail(): void {
  sessionBatchAuditTrail.length = 0;
}

export function recordBatchExecutionAudit(record: BatchExecutionAuditRecord): void {
  sessionBatchAuditTrail.push(record);
}

/**
 * Computes a deterministic fingerprint of user inputs and current plan.
 * Used to invalidate confirmation if the instruction, source file, intent, or outputs change.
 */
export function computeConfirmationFingerprint(
  instruction: string,
  sourceName: string | null,
  sourceSize: number,
  intent?: string,
  selectedOutputs?: SuggestedOfficeOutput[]
): string {
  const cleanInst = (instruction || '').trim().toLowerCase();
  const cleanSource = (sourceName || 'none').toLowerCase();
  const cleanIntent = (intent || 'none').toLowerCase();
  const sortedOutputs = (selectedOutputs || []).slice().sort().join(',');
  return `${cleanInst}::${cleanSource}::${sourceSize}::${cleanIntent}::${sortedOutputs}`;
}

/**
 * Phase 4 Step 4D: Computes a deterministic fingerprint for multi-file batch confirmation.
 * Invalidates confirmation whenever instruction, file selection, file contents (sizes), intent, or outputs change.
 */
export function computeBatchConfirmationFingerprint(
  instruction: string,
  files: { name: string; size: number }[],
  intent?: string,
  selectedOutputs?: SuggestedOfficeOutput[]
): string {
  const cleanInst = (instruction || '').trim().toLowerCase();
  const fileList = files
    .map((f) => `${f.name.toLowerCase()}:${f.size}`)
    .sort()
    .join(';');
  const cleanIntent = (intent || 'none').toLowerCase();
  const sortedOutputs = (selectedOutputs || []).slice().sort().join(',');
  return `${cleanInst}::files[${fileList}]::${cleanIntent}::${sortedOutputs}`;
}

/**
 * Validates whether an object strictly adheres to the AiCommandPlan schema.
 */
export function validateAiCommandPlan(data: any): { valid: boolean; error?: string; plan?: AiCommandPlan } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'AI plan payload is not an object.' };
  }

  const validIntents: AiIntentCategory[] = [
    'summarize',
    'rewrite',
    'translate',
    'document_plan',
    'office_pack_plan',
    'spreadsheet_analysis',
    'presentation_plan',
    'extract_information',
    'organize_content',
    'unsupported',
  ];

  if (!validIntents.includes(data.intent)) {
    return { valid: false, error: `Invalid intent category: "${data.intent}".` };
  }

  const validLanguages: AiDetectedLanguage[] = ['Bangla', 'English', 'Mixed', 'Unknown'];
  if (!validLanguages.includes(data.language)) {
    return { valid: false, error: `Invalid language classification: "${data.language}".` };
  }

  if (typeof data.summary !== 'string') {
    return { valid: false, error: 'AI summary must be a string.' };
  }

  if (!Array.isArray(data.suggestedActions)) {
    return { valid: false, error: 'suggestedActions must be an array.' };
  }

  if (!Array.isArray(data.suggestedOutputs)) {
    return { valid: false, error: 'suggestedOutputs must be an array.' };
  }

  const allowedOutputs: SuggestedOfficeOutput[] = ['DOCX', 'PDF', 'XLSX', 'PPTX'];
  for (const out of data.suggestedOutputs) {
    if (!allowedOutputs.includes(out)) {
      return { valid: false, error: `Invalid suggested output: "${out}".` };
    }
  }

  if (!Array.isArray(data.warnings)) {
    return { valid: false, error: 'warnings must be an array.' };
  }

  // Confirmation is strictly mandatory in Phase 4 Step 4A
  if (data.requiresConfirmation !== true) {
    return { valid: false, error: 'requiresConfirmation must strictly be true.' };
  }

  const confidence = typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.8;

  const sanitizedPlan: AiCommandPlan = {
    intent: data.intent,
    confidence,
    language: data.language,
    summary: data.summary,
    suggestedActions: data.suggestedActions.map((a: any) => String(a)),
    suggestedOutputs: data.suggestedOutputs,
    requiresConfirmation: true,
    warnings: data.warnings.map((w: any) => String(w)),
  };

  return { valid: true, plan: sanitizedPlan };
}

/**
 * Client-side language detection utility
 * Detects presence of Bengali Unicode range (\u0980-\u09FF) vs Latin/English
 */
export function detectInputLanguage(text: string): AiDetectedLanguage {
  if (!text || !text.trim()) return 'Unknown';
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasBengali && hasLatin) return 'Mixed';
  if (hasBengali) return 'Bangla';
  if (hasLatin) return 'English';
  return 'Unknown';
}

/**
 * Text sanitizer to prevent raw HTML rendering or script execution
 */
export function sanitizeDisplayText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Primary entry point: analyze user command and return structured suggested action plan.
 * Does NOT execute any generation, modification, or destructive operation.
 */
export async function analyzeCommand(
  request: AiCommandRequest,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<AiCommandAnalysisResult> {
  const { endpoint, provider } = getAiProviderConfig();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!request.instruction || !request.instruction.trim()) {
    return {
      status: 'ERROR',
      message: 'Instruction cannot be empty.',
    };
  }

  // Setup abort controller for timeout management
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link external signal if provided
  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruction: request.instruction,
        sourceContext: request.sourceContext,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));

      if (res.status === 503 || errData.status === 'NOT CONFIGURED') {
        const auditItem: AiCommandAuditMetadata = {
          timestamp: new Date().toISOString(),
          intent: 'unsupported',
          providerStatus: 'NOT CONFIGURED',
          status: 'FAILURE',
          confirmationRequired: true,
        };
        sessionAuditTrail.push(auditItem);

        return {
          status: 'NOT CONFIGURED',
          message: errData.message || 'AI Provider is not configured. Set GEMINI_API_KEY on the server.',
          audit: auditItem,
        };
      }

      if (res.status === 429 || errData.status === 'QUOTA EXCEEDED' || errData.isQuotaExceeded) {
        const auditItem: AiCommandAuditMetadata = {
          timestamp: new Date().toISOString(),
          intent: 'unsupported',
          providerStatus: 'QUOTA EXCEEDED',
          status: 'FAILURE',
          confirmationRequired: true,
        };
        sessionAuditTrail.push(auditItem);

        return {
          status: 'QUOTA EXCEEDED',
          message:
            errData.message ||
            'API quota exceeded. Please check your plan or try again later. All standard Office Pack features continue to work.',
          audit: auditItem,
        };
      }

      if (res.status === 504 || errData.status === 'TIMEOUT') {
        return {
          status: 'TIMEOUT',
          message: errData.message || 'AI request timed out.',
        };
      }

      return {
        status: 'ERROR',
        message: errData.message || `AI request failed with HTTP ${res.status}.`,
      };
    }

    const json = await res.json().catch(() => null);
    if (!json) {
      return {
        status: 'ERROR',
        message: 'Malformed JSON response from AI provider.',
      };
    }

    // Server-level status checks
    if (json.status === 'NOT CONFIGURED') {
      return {
        status: 'NOT CONFIGURED',
        message: json.message || 'AI Provider is not configured.',
      };
    }

    if (json.status === 'QUOTA EXCEEDED') {
      return {
        status: 'QUOTA EXCEEDED',
        message: json.message || 'AI provider quota exceeded.',
      };
    }

    // Validate structured AI plan schema
    const validation = validateAiCommandPlan(json.plan);
    if (!validation.valid || !validation.plan) {
      return {
        status: 'ERROR',
        message: `AI response schema validation failed: ${validation.error || 'Invalid structure'}`,
      };
    }

    const auditItem: AiCommandAuditMetadata = {
      timestamp: new Date().toISOString(),
      intent: validation.plan.intent,
      providerStatus: provider,
      status: 'SUCCESS',
      confirmationRequired: true,
    };
    sessionAuditTrail.push(auditItem);

    return {
      status: 'COMPLETE',
      plan: validation.plan,
      audit: auditItem,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err?.name === 'AbortError') {
      return {
        status: 'TIMEOUT',
        message: `AI analysis timed out after ${(timeoutMs / 1000).toFixed(0)} seconds.`,
      };
    }

    const errStr = String(err?.message || err).toLowerCase();
    if (errStr.includes('failed to fetch') || errStr.includes('network') || errStr.includes('enotfound')) {
      return {
        status: 'ERROR',
        message: 'Network connection unavailable. Please check your network and retry.',
      };
    }

    return {
      status: 'ERROR',
      message: 'An unexpected error occurred while communicating with the AI service.',
    };
  }
}

/**
 * Executes server-side AI text generation (summarize, rewrite, translate, extract, organize).
 * Safe client abstraction — communicates with /api/ai/execute proxy route.
 * Never exposes API keys in frontend code.
 */
export async function executeAiTextCommand(
  req: AiExecutionTextRequest,
  timeoutMs = 30000,
  externalSignal?: AbortSignal
): Promise<{
  success: boolean;
  generatedText?: string;
  error?: string;
  status: AiCommandStatus;
}> {
  if (externalSignal?.aborted) {
    return {
      success: false,
      status: 'ERROR',
      error: 'Execution was cancelled.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abortHandler = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener('abort', abortHandler, { once: true });
  }

  try {
    const res = await fetch('/api/ai/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortHandler);
    }

    const json = await res.json().catch(() => ({}));

    if (res.status === 429 || json.status === 'QUOTA EXCEEDED') {
      return {
        success: false,
        status: 'QUOTA EXCEEDED',
        error: json.message || 'AI provider quota exceeded. You can retry shortly.',
      };
    }

    if (res.status === 504 || json.status === 'TIMEOUT') {
      return {
        success: false,
        status: 'TIMEOUT',
        error: json.message || 'AI text generation timed out. Please try again.',
      };
    }

    if (res.status === 503 || json.status === 'NOT CONFIGURED') {
      return {
        success: false,
        status: 'NOT CONFIGURED',
        error: json.message || 'AI engine is not configured on the server.',
      };
    }

    if (!res.ok) {
      return {
        success: false,
        status: 'ERROR',
        error: json.error || json.message || `AI execution failed with status ${res.status}.`,
      };
    }

    return {
      success: true,
      status: 'COMPLETE',
      generatedText: json.generatedText || '',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err?.name === 'AbortError') {
      return {
        success: false,
        status: 'TIMEOUT',
        error: `AI text generation timed out after ${(timeoutMs / 1000).toFixed(0)} seconds.`,
      };
    }

    const errStr = String(err?.message || err).toLowerCase();
    if (errStr.includes('failed to fetch') || errStr.includes('network') || errStr.includes('enotfound')) {
      return {
        success: false,
        status: 'ERROR',
        error: 'Network connection unavailable. Please check your connection and retry.',
      };
    }

    return {
      success: false,
      status: 'ERROR',
      error: err?.message || 'An unexpected error occurred during AI execution.',
    };
  }
}

