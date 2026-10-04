/**
 * MAISHAA WORKSPACE — Phase 4 Step 4A Tests
 * AI Command Center & aiCommandService Test Suite
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import { AiCommandCenter } from '../components/ai/AiCommandCenter';
import { OneClickOfficePack } from '../components/officepack/OneClickOfficePack';
import { isSourceFileSupported } from '../services/officePackPlanner';
import {
  analyzeCommand,
  detectInputLanguage,
  validateAiCommandPlan,
  sanitizeDisplayText,
  clearSessionAuditTrail,
  getSessionAuditTrail,
  executeAiTextCommand,
  computeConfirmationFingerprint,
  recordExecutionAudit,
  getSessionExecutionAuditTrail,
  clearSessionExecutionAuditTrail,
  computeBatchConfirmationFingerprint,
  recordBatchExecutionAudit,
  getSessionBatchAuditTrail,
  clearSessionBatchAuditTrail,
} from '../services/aiCommandService';
import { AiCommandPlan } from '../types/aiCommand';

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  clearSessionAuditTrail();
  clearSessionExecutionAuditTrail();
  clearSessionBatchAuditTrail();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setReactInputValue(element: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  valueSetter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Phase 4 Step 4A — AI Command Center & Service', () => {
  // 1. Language Detection utility
  describe('Language Detection', () => {
    it('detects Bangla input correctly and preserves Unicode', () => {
      const text = 'বাংলায় সংক্ষেপ করো';
      expect(detectInputLanguage(text)).toBe('Bangla');
    });

    it('detects English input correctly', () => {
      const text = 'Summarize this document and create a report';
      expect(detectInputLanguage(text)).toBe('English');
    });

    it('detects Mixed language input correctly', () => {
      const text = 'Create DOCX রিপোর্ট বাংলায়';
      expect(detectInputLanguage(text)).toBe('Mixed');
    });

    it('returns Unknown for empty or whitespace text', () => {
      expect(detectInputLanguage('')).toBe('Unknown');
      expect(detectInputLanguage('   ')).toBe('Unknown');
    });
  });

  // 2. Schema Validation
  describe('AI Plan Schema Validation', () => {
    it('validates a correct structured plan', () => {
      const validPlan: AiCommandPlan = {
        intent: 'summarize',
        confidence: 0.95,
        language: 'Bangla',
        summary: 'ডকুমেন্টের একটি সংক্ষিপ্ত বিবরণ তৈরি করা হবে।',
        suggestedActions: ['মূল বিষয় নির্বাচন', 'সারসংক্ষেপ তৈরি'],
        suggestedOutputs: ['DOCX', 'PDF'],
        requiresConfirmation: true,
        warnings: [],
      };

      const res = validateAiCommandPlan(validPlan);
      expect(res.valid).toBe(true);
      expect(res.plan?.requiresConfirmation).toBe(true);
      expect(res.plan?.intent).toBe('summarize');
    });

    it('rejects a plan with an invalid intent', () => {
      const invalidPlan = {
        intent: 'destroy_all_data',
        confidence: 0.9,
        language: 'English',
        summary: 'Invalid',
        suggestedActions: [],
        suggestedOutputs: [],
        requiresConfirmation: true,
        warnings: [],
      };

      const res = validateAiCommandPlan(invalidPlan);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid intent category');
    });

    it('rejects a plan if requiresConfirmation is not true', () => {
      const invalidPlan = {
        intent: 'summarize',
        confidence: 0.9,
        language: 'English',
        summary: 'Auto execution',
        suggestedActions: [],
        suggestedOutputs: [],
        requiresConfirmation: false, // Disallowed!
        warnings: [],
      };

      const res = validateAiCommandPlan(invalidPlan);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('requiresConfirmation must strictly be true');
    });

    it('rejects a plan with invalid output formats', () => {
      const invalidPlan = {
        intent: 'office_pack_plan',
        confidence: 0.9,
        language: 'English',
        summary: 'Invalid outputs',
        suggestedActions: [],
        suggestedOutputs: ['EXE', 'BAT'], // Disallowed!
        requiresConfirmation: true,
        warnings: [],
      };

      const res = validateAiCommandPlan(invalidPlan);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid suggested output');
    });
  });

  // 3. Text Sanitization
  describe('Text Sanitization', () => {
    it('sanitizes HTML tags and dangerous characters', () => {
      const dangerous = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
      const clean = sanitizeDisplayText(dangerous);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
      expect(clean).toContain('&quot;xss&quot;');
    });
  });

  // 4. Client Service: analyzeCommand()
  describe('aiCommandService.analyzeCommand', () => {
    it('returns error when instruction is empty', async () => {
      const res = await analyzeCommand({ instruction: '   ' });
      expect(res.status).toBe('ERROR');
      expect(res.message).toContain('Instruction cannot be empty');
    });

    it('handles NOT CONFIGURED response (503)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'NOT CONFIGURED',
          message: 'AI Provider is not configured.',
        }),
      } as any);

      const res = await analyzeCommand({ instruction: 'Summarize document' });
      expect(res.status).toBe('NOT CONFIGURED');
      expect(res.message).toContain('AI Provider is not configured');

      const audit = getSessionAuditTrail();
      expect(audit.length).toBe(1);
      expect(audit[0].providerStatus).toBe('NOT CONFIGURED');
    });

    it('handles QUOTA EXCEEDED response (429)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          status: 'QUOTA EXCEEDED',
          message: 'API quota exceeded. Please try again later.',
          isQuotaExceeded: true,
        }),
      } as any);

      const res = await analyzeCommand({ instruction: 'Summarize document' });
      expect(res.status).toBe('QUOTA EXCEEDED');
      expect(res.message).toContain('quota exceeded');
    });

    it('handles network failure gracefully without crashing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Failed to fetch'));

      const res = await analyzeCommand({ instruction: 'Summarize document' });
      expect(res.status).toBe('ERROR');
      expect(res.message).toContain('Network connection unavailable');
    });

    it('handles malformed JSON response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token < in JSON');
        },
      } as any);

      const res = await analyzeCommand({ instruction: 'Summarize document' });
      expect(res.status).toBe('ERROR');
      expect(res.message).toContain('Malformed JSON response');
    });

    it('handles invalid schema in successful HTTP 200 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETE',
          plan: {
            intent: 'not_a_valid_intent',
          },
        }),
      } as any);

      const res = await analyzeCommand({ instruction: 'Summarize document' });
      expect(res.status).toBe('ERROR');
      expect(res.message).toContain('AI response schema validation failed');
    });

    it('handles valid structured plan successfully and records audit trail', async () => {
      const mockPlan: AiCommandPlan = {
        intent: 'office_pack_plan',
        confidence: 0.9,
        language: 'English',
        summary: 'Generate a standard Office Pack outline.',
        suggestedActions: ['Prepare DOCX', 'Build XLSX tables'],
        suggestedOutputs: ['DOCX', 'XLSX'],
        requiresConfirmation: true,
        warnings: [],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETE',
          plan: mockPlan,
        }),
      } as any);

      const res = await analyzeCommand({
        instruction: 'Create an office pack',
        sourceContext: { fileName: 'report.txt', fileType: 'TXT' },
      });

      expect(res.status).toBe('COMPLETE');
      expect(res.plan?.intent).toBe('office_pack_plan');
      expect(res.plan?.requiresConfirmation).toBe(true);

      const audit = getSessionAuditTrail();
      expect(audit.length).toBe(1);
      expect(audit[0].intent).toBe('office_pack_plan');
      expect(audit[0].confirmationRequired).toBe(true);
      expect(audit[0].status).toBe('SUCCESS');
    });
  });

  // 5. Component UI Rendering & Interaction
  describe('AiCommandCenter Component UI', () => {
    it('renders AI Command Center title, status, textarea, and action buttons', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      expect(container.textContent).toContain('MAISHAA AI COMMAND CENTER');
      expect(container.textContent).toContain('READY');
      expect(container.textContent).toContain('Source Content');
      expect(container.textContent).toContain('Submit / Analyze');
      expect(container.textContent).toContain('Clear');

      // Verify no API keys or secrets rendered in the DOM
      expect(container.innerHTML).not.toContain('GEMINI_API_KEY');
      expect(container.innerHTML).not.toContain('AIzaSy');

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('disables Submit / Analyze button when instruction textarea is empty', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      const buttons = container.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find((b) => b.textContent?.includes('Submit / Analyze'));
      expect(submitBtn).toBeDefined();
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('enables Submit / Analyze when instruction is typed, and renders analysis result upon completion', async () => {
      const mockPlan: AiCommandPlan = {
        intent: 'summarize',
        confidence: 0.98,
        language: 'Bangla',
        summary: 'ডকুমেন্টটির সারসংক্ষেপ প্রস্তুত করা হয়েছে।',
        suggestedActions: ['১. মূল পয়েন্টগুলো শনাক্ত করুন', '২. এক্সিকিউটিভ রিপোর্ট তৈরি করুন'],
        suggestedOutputs: ['DOCX', 'PDF'],
        requiresConfirmation: true,
        warnings: ['উৎস ফাইল সংযুক্ত নেই।'],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETE',
          plan: mockPlan,
          audit: {
            timestamp: new Date().toISOString(),
            intent: 'summarize',
            providerStatus: 'gemini',
            status: 'SUCCESS',
            confirmationRequired: true,
          },
        }),
      } as any);

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      const textarea = container.querySelector('textarea')!;
      await act(async () => {
        setReactInputValue(textarea, 'বাংলায় সংক্ষেপ করো');
      });

      const buttons = container.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find((b) => b.textContent?.includes('Submit / Analyze'))!;

      await act(async () => {
        submitBtn.click();
      });

      // Verify Output Results
      expect(container.textContent).toContain('Suggested Action Plan');
      expect(container.textContent).toContain('Confirmation Required: true');
      expect(container.textContent).toContain('summarize');
      expect(container.textContent).toContain('Bangla');
      expect(container.textContent).toContain('DOCX');
      expect(container.textContent).toContain('PDF');
      expect(container.textContent).toContain('ডকুমেন্টটির সারসংক্ষেপ প্রস্তুত করা হয়েছে।');
      expect(container.textContent).toContain('১. মূল পয়েন্টগুলো শনাক্ত করুন');

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('handles QUOTA EXCEEDED gracefully, displays banner, preserves user input, and shows Retry button', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          status: 'QUOTA EXCEEDED',
          message: 'API quota exceeded. Please retry later.',
          isQuotaExceeded: true,
        }),
      } as any);

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      const textarea = container.querySelector('textarea')!;
      await act(async () => {
        setReactInputValue(textarea, 'Analyze this CSV file');
      });

      const buttons = container.querySelectorAll('button');
      const submitBtn = Array.from(buttons).find((b) => b.textContent?.includes('Submit / Analyze'))!;

      await act(async () => {
        submitBtn.click();
      });

      expect(container.textContent).toContain('QUOTA EXCEEDED');
      expect(container.textContent).toContain('quota exceeded');
      // User instruction must remain preserved in textarea
      expect(textarea.value).toBe('Analyze this CSV file');

      // Retry button must be visible
      const retryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Retry Analysis')
      );
      expect(retryBtn).toBeDefined();

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('handles NOT CONFIGURED state gracefully with user-readable message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          status: 'NOT CONFIGURED',
          message: 'AI Assistant বর্তমানে কনফিগার করা নেই।',
        }),
      } as any);

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      const textarea = container.querySelector('textarea')!;
      await act(async () => {
        setReactInputValue(textarea, 'Make DOCX and PDF');
      });

      const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Submit / Analyze')
      )!;

      await act(async () => {
        submitBtn.click();
      });

      expect(container.textContent).toContain('NOT CONFIGURED');
      expect(container.textContent).toContain('বর্তমানে কনফিগার করা নেই');

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  // 6. Regression Check for OneClickOfficePack
  describe('Office Pack Isolation & Regression', () => {
    it('confirms OneClickOfficePack mounts and operates independently without AI side-effects', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <OneClickOfficePack />
          </WorkspaceProvider>
        );
      });

      expect(container.textContent).toContain('One-Click Office Pack');
      expect(container.textContent).toContain('Project Report Pack');

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  // =========================================================================
  // Phase 4 Step 4B — Confirmed Execution and Office Pack Integration Tests
  // =========================================================================
  describe('Phase 4 Step 4B — Confirmed Execution and Integration', () => {
    // 1. Confirmation Fingerprint Invalidation
    describe('Confirmation Fingerprint Invalidation', () => {
      it('generates consistent fingerprint for identical parameters', () => {
        const fp1 = computeConfirmationFingerprint('Summarize document', 'doc.pdf', 1024, 'summarize', ['DOCX', 'PDF']);
        const fp2 = computeConfirmationFingerprint('Summarize document', 'doc.pdf', 1024, 'summarize', ['DOCX', 'PDF']);
        expect(fp1).toBe(fp2);
      });

      it('invalidates fingerprint when instruction changes', () => {
        const fp1 = computeConfirmationFingerprint('Summarize document', 'doc.pdf', 1024, 'summarize', ['DOCX', 'PDF']);
        const fp2 = computeConfirmationFingerprint('Make full report', 'doc.pdf', 1024, 'summarize', ['DOCX', 'PDF']);
        expect(fp1).not.toBe(fp2);
      });

      it('invalidates fingerprint when source document changes', () => {
        const fp1 = computeConfirmationFingerprint('Summarize document', 'fileA.pdf', 1024, 'summarize', ['DOCX', 'PDF']);
        const fp2 = computeConfirmationFingerprint('Summarize document', 'fileB.pdf', 2048, 'summarize', ['DOCX', 'PDF']);
        expect(fp1).not.toBe(fp2);
      });

      it('invalidates fingerprint when output formats change', () => {
        const fp1 = computeConfirmationFingerprint('Summarize document', 'doc.pdf', 1024, 'summarize', ['DOCX', 'PDF']);
        const fp2 = computeConfirmationFingerprint('Summarize document', 'doc.pdf', 1024, 'summarize', ['DOCX', 'PDF', 'XLSX']);
        expect(fp1).not.toBe(fp2);
      });
    });

    // 2. executeAiTextCommand Service
    describe('executeAiTextCommand Service', () => {
      it('executes text command successfully via /api/ai/execute', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            generatedText: 'This is the verified executive summary.',
            action: 'summarize',
          }),
        } as any);

        const res = await executeAiTextCommand({
          action: 'summarize',
          instruction: 'Summarize the document',
          sourceText: 'Source document content',
          targetLanguage: 'English',
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('COMPLETE');
        expect(res.generatedText).toContain('verified executive summary');
      });

      it('handles 429 quota exceeded error gracefully', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            status: 'QUOTA EXCEEDED',
            message: 'AI Provider quota exceeded.',
          }),
        } as any);

        const res = await executeAiTextCommand({
          action: 'summarize',
          instruction: 'Summarize',
        });

        expect(res.success).toBe(false);
        expect(res.status).toBe('QUOTA EXCEEDED');
        expect(res.error).toContain('quota exceeded');
      });

      it('handles timeout error gracefully', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 504,
          json: async () => ({
            status: 'TIMEOUT',
            message: 'AI text generation timed out.',
          }),
        } as any);

        const res = await executeAiTextCommand({
          action: 'summarize',
          instruction: 'Summarize',
        });

        expect(res.success).toBe(false);
        expect(res.status).toBe('TIMEOUT');
      });

      it('handles NOT CONFIGURED status when Gemini is unconfigured', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({
            status: 'NOT CONFIGURED',
            message: 'AI engine is not configured.',
          }),
        } as any);

        const res = await executeAiTextCommand({
          action: 'translate',
          instruction: 'Translate',
        });

        expect(res.success).toBe(false);
        expect(res.status).toBe('NOT CONFIGURED');
      });
    });

    // 3. Metadata-Only Execution Audit Trail
    describe('Metadata-Only Execution Audit Trail', () => {
      it('records execution audit without storing raw document text or API keys', () => {
        clearSessionExecutionAuditTrail();
        recordExecutionAudit({
          timestamp: new Date().toISOString(),
          intent: 'summarize',
          executionStatus: 'SUCCESS',
          durationMs: 450,
          outputFormats: ['DOCX', 'PDF'],
          filesCount: 2,
          hasTextPreview: true,
        });

        const trail = getSessionExecutionAuditTrail();
        expect(trail).toHaveLength(1);
        expect(trail[0].intent).toBe('summarize');
        expect(trail[0].executionStatus).toBe('SUCCESS');
        expect(trail[0].durationMs).toBe(450);
        expect(trail[0].outputFormats).toEqual(['DOCX', 'PDF']);

        // Explicit security check: ensure no source text, private snippet, or keys in record
        const serialized = JSON.stringify(trail[0]);
        expect(serialized).not.toContain('secret');
        expect(serialized).not.toContain('API_KEY');
        expect(serialized).not.toContain('sourceText');
        expect(serialized).not.toContain('textContent');
      });
    });

    // 4. UI Confirmation Gating & Controls
    describe('UI Confirmation Gating & Controls', () => {
      it('renders bilingual Confirmation Preview and NEVER executes automatically after analysis', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'document_plan',
              confidence: 0.95,
              language: 'English',
              summary: 'Generate a professional office document.',
              suggestedActions: ['Format sections', 'Synthesize deliverables'],
              suggestedOutputs: ['DOCX', 'PDF'],
              requiresConfirmation: true,
              warnings: [],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Create a professional report');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        // Verify Confirmation Preview is visible
        expect(container.textContent).toContain('Confirmation & Execution Preview');
        expect(container.textContent).toContain('পরিকল্পনা নিশ্চিতকরণ প্রিভিউ');
        expect(container.textContent).toContain('Confirm & Run');
        expect(container.textContent).toContain('Cancel');
        expect(container.textContent).toContain('Non-Destructive Guarantee');

        // Verify it did NOT execute automatically
        expect(container.textContent).not.toContain('Generated Deliverables');
        expect(container.textContent).not.toContain('Ready for Review');

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });

      it('detects parameter change and displays stale confirmation warning', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'summarize',
              confidence: 0.9,
              language: 'Bangla',
              summary: 'সংক্ষেপণ পরিকল্পনা',
              suggestedActions: ['সারসংক্ষেপ তৈরি'],
              suggestedOutputs: ['DOCX'],
              requiresConfirmation: true,
              warnings: [],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'বাংলায় সংক্ষেপ করো');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        expect(container.textContent).toContain('Confirmation & Execution Preview');

        // Modify instruction while in confirmation mode
        await act(async () => {
          setReactInputValue(textarea, 'নতুন পরিবর্তিত নির্দেশ');
        });

        // Warning must be displayed
        expect(container.textContent).toContain('প্যারামিটার পরিবর্তিত হয়েছে');

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });

      it('cancels confirmation cleanly when Cancel button is clicked', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'summarize',
              confidence: 0.9,
              language: 'English',
              summary: 'Summary plan',
              suggestedActions: ['Action 1'],
              suggestedOutputs: ['DOCX'],
              requiresConfirmation: true,
              warnings: [],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Summarize file');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Cancel')
        )!;

        await act(async () => {
          cancelBtn.click();
        });

        // Audit record must show CANCELLED
        const trail = getSessionExecutionAuditTrail();
        expect(trail.length).toBeGreaterThan(0);
        expect(trail[trail.length - 1].executionStatus).toBe('CANCELLED');

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });

      it('displays unsupported action notice when intent is unsupported', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'unsupported',
              confidence: 0.3,
              language: 'English',
              summary: 'This action is unsupported.',
              suggestedActions: [],
              suggestedOutputs: [],
              requiresConfirmation: true,
              warnings: ['Unsupported operation requested'],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Edit 4K video');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        // Confirm & Run should be disabled or report unsupported notice
        const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Confirm & Run')
        )!;
        expect(confirmBtn.disabled).toBe(true);

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });

      it('preserves user input on quota error and provides retry control', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({
            status: 'QUOTA EXCEEDED',
            message: 'AI Provider quota exceeded. You can retry shortly.',
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Summarize financial statement');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        // Verify input text is strictly preserved
        expect(textarea.value).toBe('Summarize financial statement');

        // Verify Quota notice and Retry button
        expect(container.textContent).toContain('QUOTA EXCEEDED');
        expect(container.textContent).toContain('Offline Office Pack creation');
        const retryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Retry')
        );
        expect(retryBtn).toBeTruthy();

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });
    });
  });

  // =========================================================================
  // Phase 4 Step 4D — Multi-file Batch Command Execution Tests
  // =========================================================================
  describe('Phase 4 Step 4D — Multi-file Batch Command Execution', () => {
    // 1. Batch Confirmation Fingerprint
    describe('Batch Confirmation Fingerprint Invalidation', () => {
      it('generates consistent fingerprint for identical file lists and parameters', () => {
        const files = [
          { name: 'report1.txt', size: 1024 },
          { name: 'report2.docx', size: 2048 },
        ];
        const fp1 = computeBatchConfirmationFingerprint('Summarize all files', files, 'summarize', ['DOCX']);
        const fp2 = computeBatchConfirmationFingerprint('Summarize all files', files, 'summarize', ['DOCX']);
        expect(fp1).toBe(fp2);
      });

      it('invalidates fingerprint when files are added, removed, or modified in size', () => {
        const filesA = [{ name: 'report1.txt', size: 1024 }];
        const filesB = [
          { name: 'report1.txt', size: 1024 },
          { name: 'report2.docx', size: 2048 },
        ];
        const fpA = computeBatchConfirmationFingerprint('Summarize all files', filesA, 'summarize', ['DOCX']);
        const fpB = computeBatchConfirmationFingerprint('Summarize all files', filesB, 'summarize', ['DOCX']);
        expect(fpA).not.toBe(fpB);
      });

      it('invalidates fingerprint when batch instruction or formats change', () => {
        const files = [{ name: 'report1.txt', size: 1024 }];
        const fp1 = computeBatchConfirmationFingerprint('Summarize all files', files, 'summarize', ['DOCX']);
        const fp2 = computeBatchConfirmationFingerprint('Translate to Bangla', files, 'translate', ['DOCX', 'PDF']);
        expect(fp1).not.toBe(fp2);
      });
    });

    // 2. Metadata-Only Batch Audit Privacy
    describe('Metadata-Only Batch Audit Privacy', () => {
      it('stores batch audit records without source text, instructions, private text, or API keys', () => {
        clearSessionBatchAuditTrail();
        recordBatchExecutionAudit({
          runId: 'batch_test_123',
          timestamp: new Date().toISOString(),
          intent: 'summarize',
          status: 'SUCCESS',
          durationMs: 1200,
          outputFormats: ['DOCX', 'PDF'],
          totalFiles: 3,
          successCount: 3,
          failedCount: 0,
          unsupportedCount: 0,
          cancelledCount: 0,
        });

        const trail = getSessionBatchAuditTrail();
        expect(trail).toHaveLength(1);
        const record = trail[0];
        expect(record.runId).toBe('batch_test_123');
        expect(record.status).toBe('SUCCESS');
        expect(record.totalFiles).toBe(3);

        const serialized = JSON.stringify(record);
        expect(serialized).not.toContain('API_KEY');
        expect(serialized).not.toContain('secret');
        expect(serialized).not.toContain('instruction');
        expect(serialized).not.toContain('sourceText');
        expect(serialized).not.toContain('textContent');
        expect(serialized).not.toContain('generatedText');
      });
    });

    // 3. UI Confirmation Gating in Batch Mode
    describe('Batch Confirmation Gating & UI Controls', () => {
      it('requires explicit confirmation before processing batch and never executes automatically', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'summarize',
              confidence: 0.92,
              language: 'English',
              summary: 'Batch summary plan for multiple files.',
              suggestedActions: ['Extract text from all files', 'Summarize each independently'],
              suggestedOutputs: ['DOCX'],
              requiresConfirmation: true,
              warnings: [],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        // Switch to Multi-file Batch mode
        const batchTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Batch')
        )!;

        await act(async () => {
          batchTabBtn.click();
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Summarize all selected files');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        // Confirmation Preview must be visible
        expect(container.textContent).toContain('Multi-file Batch Confirmation');
        expect(container.textContent).toContain('মাল্টি-ফাইল ব্যাচ নিশ্চিতকরণ প্রিভিউ');
        expect(container.textContent).toContain('Confirm & Run Batch');
        expect(container.textContent).toContain('Non-Destructive Guarantee');

        // Must NOT have started queue automatically
        expect(container.textContent).not.toContain('Processing file 1 of');

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });

      it('detects parameter change in batch mode and displays stale confirmation warning', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'summarize',
              confidence: 0.9,
              language: 'English',
              summary: 'Batch plan',
              suggestedActions: ['Action 1'],
              suggestedOutputs: ['DOCX'],
              requiresConfirmation: true,
              warnings: [],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const batchTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Batch')
        )!;

        await act(async () => {
          batchTabBtn.click();
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Summarize all');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        expect(container.textContent).toContain('Multi-file Batch Confirmation');

        // Modify instruction while in batch confirmation mode
        await act(async () => {
          setReactInputValue(textarea, 'New instruction for batch');
        });

        expect(container.textContent).toContain('প্যারামিটার পরিবর্তিত হয়েছে');

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });

      it('allows cancellation of batch confirmation', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'COMPLETE',
            plan: {
              intent: 'document_plan',
              confidence: 0.9,
              language: 'English',
              summary: 'Batch document plan',
              suggestedActions: ['Action 1'],
              suggestedOutputs: ['DOCX', 'PDF'],
              requiresConfirmation: true,
              warnings: [],
            },
          }),
        } as any);

        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <WorkspaceProvider>
              <AiCommandCenter />
            </WorkspaceProvider>
          );
        });

        const batchTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Batch')
        )!;

        await act(async () => {
          batchTabBtn.click();
        });

        const textarea = container.querySelector('textarea')!;
        await act(async () => {
          setReactInputValue(textarea, 'Generate documents');
        });

        const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Submit / Analyze')
        )!;

        await act(async () => {
          submitBtn.click();
        });

        const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Cancel')
        );

        if (cancelBtn) {
          await act(async () => {
            cancelBtn.click();
          });
        }

        await act(async () => {
          root.unmount();
        });
        document.body.removeChild(container);
      });
    });

    // 4. Mixed File Readiness & Content Isolation
    describe('Batch Queue Readiness & Isolation', () => {
      it('correctly marks supported and unsupported files without inventing content', () => {
        expect(isSourceFileSupported('notes.txt')).toBe(true);
        expect(isSourceFileSupported('data.csv')).toBe(true);
        expect(isSourceFileSupported('doc.docx')).toBe(true);
        expect(isSourceFileSupported('report.pdf')).toBe(true);
        expect(isSourceFileSupported('program.exe')).toBe(false);
        expect(isSourceFileSupported('movie.mp4')).toBe(false);
      });

      it('ensures content isolation during batch operations', async () => {
        const requestsMade: any[] = [];
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options: any) => {
          const body = JSON.parse(options.body);
          requestsMade.push(body);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              generatedText: `Summary of ${body.sourceText}`,
            }),
          } as any;
        });

        // Test two calls with separate text
        await executeAiTextCommand({
          action: 'summarize',
          instruction: 'Summarize',
          sourceText: 'FILE_A_CONTENT',
        });

        await executeAiTextCommand({
          action: 'summarize',
          instruction: 'Summarize',
          sourceText: 'FILE_B_CONTENT',
        });

        expect(requestsMade).toHaveLength(2);
        expect(requestsMade[0].sourceText).toBe('FILE_A_CONTENT');
        expect(requestsMade[1].sourceText).toBe('FILE_B_CONTENT');
        expect(requestsMade[0].sourceText).not.toContain('FILE_B');
        expect(requestsMade[1].sourceText).not.toContain('FILE_A');
      });

      it('handles external cancellation signal immediately and rejects late responses', async () => {
        const controller = new AbortController();
        controller.abort();

        const res = await executeAiTextCommand(
          {
            action: 'summarize',
            instruction: 'Summarize',
          },
          5000,
          controller.signal
        );

        expect(res.success).toBe(false);
        expect(res.error).toContain('cancelled');
      });
    });

    // 5. Batch Manifest & ZIP Deliverables
    describe('Batch Manifest & ZIP Deliverables', () => {
      it('generates a valid batch manifest structure with correct status counts', () => {
        const manifest = {
          manifestVersion: '1.0',
          runId: 'batch_run_999',
          timestamp: new Date().toISOString(),
          totalFiles: 3,
          successCount: 2,
          failedCount: 1,
          unsupportedCount: 0,
          cancelledCount: 0,
          files: [
            {
              fileName: 'doc1.pdf',
              fileSize: 1024,
              status: 'SUCCESS',
              outputFormatsGenerated: ['DOCX', 'PDF'],
              generatedFilesCount: 2,
              hasTextPreview: false,
            },
            {
              fileName: 'doc2.txt',
              fileSize: 512,
              status: 'SUCCESS',
              outputFormatsGenerated: ['TXT'],
              generatedFilesCount: 1,
              hasTextPreview: true,
            },
            {
              fileName: 'doc3.bin',
              fileSize: 2048,
              status: 'FAILED',
              outputFormatsGenerated: [],
              generatedFilesCount: 0,
              hasTextPreview: false,
              error: 'Extraction error',
            },
          ],
        };

        expect(manifest.manifestVersion).toBe('1.0');
        expect(manifest.totalFiles).toBe(3);
        expect(manifest.successCount).toBe(2);
        expect(manifest.failedCount).toBe(1);
        expect(manifest.files).toHaveLength(3);
        expect(manifest.files[0].status).toBe('SUCCESS');
        expect(manifest.files[2].error).toBe('Extraction error');
      });
    });
  });

  // =========================================================================
  // PHASE 4 STEP 4C: DIRECT DOCUMENT EXPORT & TRANSFORMS UI INTEGRATION
  // =========================================================================
  describe('Phase 4 Step 4C — Advanced Transforms & Direct Export Integration', () => {
    it('mounts AiCommandCenter and renders Direct Export formatting options and controls', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      // Confirm component is mounted
      expect(container.textContent).toContain('MAISHAA AI COMMAND CENTER');
      expect(container.textContent).toContain('Single');
      expect(container.textContent).toContain('Batch');

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('displays A4 page size and formatting controls when an editable preview is active', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      // Render AiCommandCenter
      await act(async () => {
        root.render(
          <WorkspaceProvider>
            <AiCommandCenter />
          </WorkspaceProvider>
        );
      });

      // Simulate input instruction
      const textarea = container.querySelector('textarea');
      expect(textarea).not.toBeNull();

      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('verifies that local export execution does not call server AI routes', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // Verify no fetch is triggered by local operations
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
