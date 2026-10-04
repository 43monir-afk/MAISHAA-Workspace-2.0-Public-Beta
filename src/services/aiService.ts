/**
 * MAISHAA WORKSPACE — Phase 2 Client AI Service
 * Communicates with server-side AI proxy routes (/api/ai/*).
 * Never exposes API keys in frontend code.
 * Implements strict grounding, client-side size safety, and consent guards.
 */

export interface AiStatusResult {
  configured: boolean;
  status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';
  model?: string;
  message?: string;
}

export interface AiChatResponse {
  reply: string;
  isAiOutput: boolean;
  taskType: string;
  modelUsed?: string;
  warning?: string;
}

export interface AiTranslateResponse {
  translatedText: string;
  targetLanguage: 'bn' | 'en';
  isAiOutput: boolean;
}

const MAX_SAFE_CHARS = 30000;

/**
 * Check whether server has a valid AI provider configured.
 */
export async function checkAiStatus(): Promise<AiStatusResult> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) {
      return {
        configured: false,
        status: 'NOT_CONFIGURED',
        message: 'AI Assistant বর্তমানে কনফিগার করা নেই। (AI Assistant not configured)',
      };
    }
    const data = await res.json();
    return {
      configured: !!data.configured,
      status: data.status || (data.configured ? 'CONFIGURED' : 'NOT_CONFIGURED'),
      model: data.model,
      message: data.message,
    };
  } catch (_) {
    // If backend route is unreachable or in static client test
    return {
      configured: false,
      status: 'NOT_CONFIGURED',
      message: 'AI Assistant বর্তমানে কনফিগার করা নেই।',
    };
  }
}

/**
 * Send grounded prompt with document context to server AI route.
 */
export async function requestDocumentAi(
  prompt: string,
  documentContext?: string,
  taskType = 'general',
  language: 'bn' | 'en' = 'bn'
): Promise<AiChatResponse> {
  if (!prompt || !prompt.trim()) {
    throw new Error('অনুগ্রহ করে একটি প্রশ্ন বা নির্দেশনা লিখুন (Prompt cannot be empty)');
  }

  let safeContext = documentContext || '';
  let warning: string | undefined;

  // Safe chunking / truncation with explicit notification
  if (safeContext.length > MAX_SAFE_CHARS) {
    safeContext = safeContext.slice(0, MAX_SAFE_CHARS);
    warning = language === 'bn'
      ? `সতর্কতা: ডকুমেন্টটি বড় হওয়ায় প্রথম ${MAX_SAFE_CHARS.toLocaleString()} ক্যারেক্টার বিশ্লেষণ করা হয়েছে।`
      : `Notice: Document exceeded token limit; first ${MAX_SAFE_CHARS.toLocaleString()} characters analyzed.`;
  }

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt.trim(),
      documentContext: safeContext,
      taskType,
      language,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 503 || errData.status === 'NOT_CONFIGURED') {
      throw new Error(errData.error || 'AI Assistant বর্তমানে কনফিগার করা নেই। (AI Assistant not configured)');
    }
    throw new Error(errData.error || 'AI অনুরোধ ব্যর্থ হয়েছে (AI request failed)');
  }

  const data = await res.json();
  return {
    reply: data.reply || '',
    isAiOutput: true,
    taskType: data.taskType || taskType,
    modelUsed: data.modelUsed,
    warning,
  };
}

/**
 * Translate document text using server-side AI provider.
 */
export async function requestAiTranslation(
  text: string,
  targetLanguage: 'bn' | 'en'
): Promise<AiTranslateResponse> {
  if (!text || !text.trim()) {
    throw new Error('অনুবাদ করার জন্য টেক্সট প্রয়োজন (Text is required for translation)');
  }

  const safeText = text.slice(0, MAX_SAFE_CHARS);

  const res = await fetch('/api/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: safeText,
      targetLanguage,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 503 || errData.status === 'NOT_CONFIGURED') {
      throw new Error(errData.error || 'AI Translation বর্তমানে কনফিগার করা নেই।');
    }
    throw new Error(errData.error || 'অনুবাদ ব্যর্থ হয়েছে (Translation failed)');
  }

  const data = await res.json();
  return {
    translatedText: data.translatedText || '',
    targetLanguage,
    isAiOutput: true,
  };
}
