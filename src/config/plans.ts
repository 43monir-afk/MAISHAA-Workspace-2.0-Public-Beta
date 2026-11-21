/**
 * MAISHAA WORKSPACE — Free vs Pro plan configuration.
 *
 * Single source of truth, imported by BOTH the server (enforcement of AI limits)
 * and the browser (lock icons, pricing table). Change a limit or move a feature
 * between plans here only.
 *
 * Note: tools that run 100% in the browser (PDF, image...) can only be
 * "soft-locked" in the UI. Only server-side features (AI) are hard-enforced.
 */

export type PlanId = 'free' | 'pro';

/** Server-enforced AI features, metered per account per day (UTC). */
export type AiFeatureId =
  | 'aiChat'
  | 'aiTranslate'
  | 'aiCommand'
  | 'aiOcr'
  | 'aiImagePrompt'
  | 'bgRemoveCloud'
  | 'bgGenerate';

export interface AiFeatureLimit {
  /** Requests per day. 0 = not available on this plan. */
  daily: number;
  /** Max characters of input text per request (translate / chat context / prompt). */
  maxChars: number;
  /** Image features: max decoded image size in bytes per request. */
  maxBytes?: number;
  /** Image features: max requests per minute per account (burst limit, on top of `daily`). */
  burstPerMin?: number;
}

export interface AiFeatureConfig {
  id: AiFeatureId;
  labelEn: string;
  labelBn: string;
  free: AiFeatureLimit;
  pro: AiFeatureLimit;
}

export const AI_FEATURES: Record<AiFeatureId, AiFeatureConfig> = {
  aiChat: {
    id: 'aiChat',
    labelEn: 'Document Q&A',
    labelBn: 'ডকুমেন্ট প্রশ্নোত্তর',
    free: { daily: 5, maxChars: 8000 },
    pro: { daily: 200, maxChars: 40000 },
  },
  aiTranslate: {
    id: 'aiTranslate',
    labelEn: 'AI Translate',
    labelBn: 'এআই অনুবাদ',
    free: { daily: 3, maxChars: 2000 },
    pro: { daily: 100, maxChars: 30000 },
  },
  aiCommand: {
    id: 'aiCommand',
    labelEn: 'AI Command Center',
    labelBn: 'এআই কমান্ড সেন্টার',
    free: { daily: 0, maxChars: 0 },
    pro: { daily: 100, maxChars: 40000 },
  },
  // ── Expensive image / vision endpoints (server-enforced) ──
  // Every request costs real money upstream (Gemini Vision, Imagen, remove.bg), so each is
  // signed-in only, metered per day and burst-limited. maxBytes must stay below the JSON body
  // limit in server.ts (10 MB) after base64 expansion (x1.37).
  aiOcr: {
    id: 'aiOcr',
    labelEn: 'Cloud OCR (Gemini Vision)',
    labelBn: 'ক্লাউড ওসিআর (জেমিনি ভিশন)',
    free: { daily: 5, maxChars: 0, maxBytes: 4 * 1024 * 1024, burstPerMin: 3 },
    pro: { daily: 100, maxChars: 0, maxBytes: 7 * 1024 * 1024, burstPerMin: 10 },
  },
  aiImagePrompt: {
    id: 'aiImagePrompt',
    labelEn: 'Image to AI Prompt',
    labelBn: 'ছবি থেকে এআই প্রম্পট',
    free: { daily: 3, maxChars: 500, maxBytes: 4 * 1024 * 1024, burstPerMin: 3 },
    pro: { daily: 60, maxChars: 500, maxBytes: 7 * 1024 * 1024, burstPerMin: 10 },
  },
  bgRemoveCloud: {
    id: 'bgRemoveCloud',
    labelEn: 'Cloud Background Removal',
    labelBn: 'ক্লাউড ব্যাকগ্রাউন্ড রিমুভ',
    free: { daily: 3, maxChars: 0, maxBytes: 4 * 1024 * 1024, burstPerMin: 3 },
    pro: { daily: 50, maxChars: 0, maxBytes: 7 * 1024 * 1024, burstPerMin: 10 },
  },
  bgGenerate: {
    id: 'bgGenerate',
    labelEn: 'AI Background Generator',
    labelBn: 'এআই ব্যাকগ্রাউন্ড জেনারেটর',
    free: { daily: 2, maxChars: 200, burstPerMin: 2 },
    pro: { daily: 30, maxChars: 500, burstPerMin: 5 },
  },
};

/** Workspace modules that need Pro (soft lock in the UI). */
export const PRO_MODULES: string[] = ['batch', 'office_pack', 'ai_command'];

/** PDF Studio tabs that need Pro (soft lock in the UI). */
export const PRO_PDF_TABS: string[] = ['redact', 'protect', 'compare', 'overlay', 'pdfa'];

export interface PlanFeatureRow {
  labelEn: string;
  labelBn: string;
  free: string | boolean;
  pro: string | boolean;
}

/** Rows of the Free vs Pro comparison table on the Pricing page. */
export const PLAN_COMPARISON: PlanFeatureRow[] = [
  { labelEn: 'PDF merge, split, compress, rotate, convert', labelBn: 'পিডিএফ মার্জ, স্প্লিট, কম্প্রেস, রোটেট, কনভার্ট', free: true, pro: true },
  { labelEn: 'Image Studio, Background Remover, Creative Studio', labelBn: 'ইমেজ স্টুডিও, ব্যাকগ্রাউন্ড রিমুভার, ক্রিয়েটিভ স্টুডিও', free: true, pro: true },
  { labelEn: 'Scan & OCR, Forms & Letters, Whiteboard', labelBn: 'স্ক্যান ও ওসিআর, ফর্ম ও চিঠি, হোয়াইটবোর্ড', free: true, pro: true },
  { labelEn: 'AI Document Q&A', labelBn: 'এআই ডকুমেন্ট প্রশ্নোত্তর', free: `${AI_FEATURES.aiChat.free.daily} / day`, pro: `${AI_FEATURES.aiChat.pro.daily} / day` },
  { labelEn: 'AI Translate', labelBn: 'এআই অনুবাদ', free: `${AI_FEATURES.aiTranslate.free.daily} / day · ${AI_FEATURES.aiTranslate.free.maxChars.toLocaleString()} chars`, pro: `${AI_FEATURES.aiTranslate.pro.daily} / day · ${AI_FEATURES.aiTranslate.pro.maxChars.toLocaleString()} chars` },
  { labelEn: 'Cloud OCR, Image to Prompt, Cloud background tools', labelBn: 'ক্লাউড ওসিআর, ইমেজ-টু-প্রম্পট, ক্লাউড ব্যাকগ্রাউন্ড টুল', free: `${AI_FEATURES.aiOcr.free.daily} / ${AI_FEATURES.aiImagePrompt.free.daily} / ${AI_FEATURES.bgRemoveCloud.free.daily} / ${AI_FEATURES.bgGenerate.free.daily} per day`, pro: `${AI_FEATURES.aiOcr.pro.daily} / ${AI_FEATURES.aiImagePrompt.pro.daily} / ${AI_FEATURES.bgRemoveCloud.pro.daily} / ${AI_FEATURES.bgGenerate.pro.daily} per day` },
  { labelEn: 'AI Command Center (summarize, rewrite, extract)', labelBn: 'এআই কমান্ড সেন্টার (সারাংশ, পুনর্লিখন, এক্সট্র্যাক্ট)', free: false, pro: true },
  { labelEn: 'Batch Processing', labelBn: 'ব্যাচ প্রসেসিং', free: false, pro: true },
  { labelEn: 'Office Pack templates', labelBn: 'অফিস প্যাক টেমপ্লেট', free: false, pro: true },
  { labelEn: 'PDF Redact, Protect (AES-256), Compare, Overlay, PDF/A', labelBn: 'পিডিএফ রিড্যাক্ট, পাসওয়ার্ড সুরক্ষা (AES-256), তুলনা, ওভারলে, PDF/A', free: false, pro: true },
  { labelEn: 'Windows desktop app', labelBn: 'উইন্ডোজ ডেস্কটপ অ্যাপ', free: 'Free mode', pro: 'Full Pro (licence key)' },
  { labelEn: 'Priority support by email', labelBn: 'ইমেইলে অগ্রাধিকার সাপোর্ট', free: false, pro: true },
];

export function limitFor(feature: AiFeatureId, plan: PlanId): AiFeatureLimit {
  return AI_FEATURES[feature][plan];
}

export function isProModule(moduleId: string): boolean {
  return PRO_MODULES.includes(moduleId);
}

export function isProPdfTab(tabId: string): boolean {
  return PRO_PDF_TABS.includes(tabId);
}
