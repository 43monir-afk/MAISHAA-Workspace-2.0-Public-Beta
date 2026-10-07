/**
 * MAISHAA WORKSPACE — Privacy-First Anonymous Metrics & Analytics
 * 
 * Strict Privacy Guidelines:
 * - NO personal data, IP addresses, filenames, document contents, or OCR text is ever tracked.
 * - Only records aggregate local counters (e.g. tool launches, download completions).
 * - Stored locally in browser localStorage or transmitted only if optional analytics endpoint is configured.
 */

export type AnalyticsEventType =
  | 'tool_view'
  | 'tool_start'
  | 'tool_complete'
  | 'file_download'
  | 'tutorial_view'
  | 'ad_impression';

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  toolCategory: string;
  timestamp: number;
}

const STORAGE_KEY = 'maishaa_usage_metrics';

export function trackEvent(event: AnalyticsEventType, toolCategory: string): void {
  try {
    if (typeof window === 'undefined') return;

    // Increment local counter safely
    const stored = localStorage.getItem(STORAGE_KEY);
    const metrics: Record<string, number> = stored ? JSON.parse(stored) : {};
    const key = `${event}:${toolCategory}`;
    metrics[key] = (metrics[key] || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // Fail silently without disrupting user flow
  }
}

export function getLocalMetrics(): Record<string, number> {
  try {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}
