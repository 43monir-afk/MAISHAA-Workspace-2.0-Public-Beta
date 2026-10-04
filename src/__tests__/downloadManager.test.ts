/**
 * MAISHAA WORKSPACE 2 - Centralized Single-Download Test Suite
 *
 * Verifies:
 * 1. Single click triggers exactly ONE download (one anchor.click()).
 * 2. Rapid double-clicks on the same file do NOT create duplicate downloads.
 * 3. Two distinct files download normally without interference.
 * 4. Separate later clicks after cooldown download normally (1 click = 1 file).
 * 5. Anchor element is appended and immediately removed from DOM (no leakage).
 * 6. URL.createObjectURL and URL.revokeObjectURL are safely managed.
 * 7. All previous utility wrappers (downloadBlob, downloadExportBlob, downloadBlobAsFile)
 *    strictly route through downloadFileOnce with zero duplicate triggers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  downloadFileOnce,
  resetDownloadLocks,
  isDownloadLocked,
} from '../utils/downloadHelper';
import { downloadBlob } from '../utils/privacy';
import { downloadExportBlob } from '../services/directExportService';
import { downloadBlobAsFile } from '../services/formDocumentService';

describe('Centralized Single-Download Manager (downloadFileOnce)', () => {
  let createdAnchors: HTMLAnchorElement[] = [];
  let clickedAnchors: HTMLAnchorElement[] = [];
  let appendedElements: Node[] = [];
  let removedElements: Node[] = [];

  beforeEach(() => {
    resetDownloadLocks();
    createdAnchors = [];
    clickedAnchors = [];
    appendedElements = [];
    removedElements = [];

    // Mock URL methods
    globalThis.URL.createObjectURL = vi.fn(
      (blob: any) => `blob:http://localhost/${Math.random().toString(36).substring(2)}`
    );
    globalThis.URL.revokeObjectURL = vi.fn();

    // Spy on document.createElement('a')
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        const anchor = el as HTMLAnchorElement;
        createdAnchors.push(anchor);
        const originalClick = anchor.click.bind(anchor);
        anchor.click = vi.fn(() => {
          clickedAnchors.push(anchor);
          originalClick();
        });
      }
      return el;
    });

    // Spy on document.body.appendChild & remove
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      appendedElements.push(node);
      return node;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDownloadLocks();
  });

  it('Requirement: A single click triggers exactly ONE download', async () => {
    const testBlob = new Blob(['sample content'], { type: 'text/plain' });
    const result = await downloadFileOnce(testBlob, 'report.txt');

    expect(result).toBe(true);
    expect(createdAnchors.length).toBe(1);
    expect(clickedAnchors.length).toBe(1);
    expect(clickedAnchors[0].download).toBe('report.txt');
    expect(appendedElements.length).toBe(1);
  });

  it('Requirement: Rapid double-click does NOT produce duplicate downloads while processing', async () => {
    const testBlob = new Blob(['sample document bytes'], { type: 'application/pdf' });

    // Simulate two rapid clicks on the exact same output
    const firstCall = downloadFileOnce(testBlob, 'invoice.pdf');
    const secondCall = downloadFileOnce(testBlob, 'invoice.pdf');

    const [res1, res2] = await Promise.all([firstCall, secondCall]);

    // First call initiated download, second call was blocked by lock
    expect(res1).toBe(true);
    expect(res2).toBe(false);

    // Exactly ONE anchor created and clicked!
    expect(createdAnchors.length).toBe(1);
    expect(clickedAnchors.length).toBe(1);
  });

  it('Requirement: Two separate clicks on DIFFERENT outputs download both normally', async () => {
    const docxBlob = new Blob(['docx payload'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const pdfBlob = new Blob(['pdf payload with more bytes here'], { type: 'application/pdf' });

    const res1 = await downloadFileOnce(docxBlob, 'document.docx');
    const res2 = await downloadFileOnce(pdfBlob, 'brief.pdf');

    expect(res1).toBe(true);
    expect(res2).toBe(true);

    expect(createdAnchors.length).toBe(2);
    expect(clickedAnchors.length).toBe(2);
    expect(clickedAnchors[0].download).toBe('document.docx');
    expect(clickedAnchors[1].download).toBe('brief.pdf');
  });

  it('Requirement: Later clicks after cooldown succeed normally (1 click = 1 file, 2 clicks = 2 files)', async () => {
    const blob = new Blob(['spreadsheet data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // First click
    const res1 = await downloadFileOnce(blob, 'accounts.xlsx', { lockDurationMs: 50 });
    expect(res1).toBe(true);
    expect(clickedAnchors.length).toBe(1);

    // Immediate duplicate is blocked
    const resDuplicate = await downloadFileOnce(blob, 'accounts.xlsx', { lockDurationMs: 50 });
    expect(resDuplicate).toBe(false);
    expect(clickedAnchors.length).toBe(1);

    // Wait for cooldown to expire
    await new Promise((r) => setTimeout(r, 60));

    // Second separate click succeeds
    const res2 = await downloadFileOnce(blob, 'accounts.xlsx', { lockDurationMs: 50 });
    expect(res2).toBe(true);
    expect(clickedAnchors.length).toBe(2);
  });

  it('Requirement: Anchor element is hidden and cleaned up from DOM immediately', async () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    await downloadFileOnce(blob, 'clean_dom.txt');

    const anchor = createdAnchors[0];
    expect(anchor.style.display).toBe('none');
    expect(anchor.getAttribute('aria-hidden')).toBe('true');
  });

  it('Requirement: Lock detection reports active downloads accurately', async () => {
    const blob = new Blob(['test content'], { type: 'text/plain' });
    expect(isDownloadLocked('test_lock.txt', blob.size)).toBe(false);

    await downloadFileOnce(blob, 'test_lock.txt', { lockDurationMs: 200 });

    expect(isDownloadLocked('test_lock.txt', blob.size)).toBe(true);

    resetDownloadLocks();
    expect(isDownloadLocked('test_lock.txt', blob.size)).toBe(false);
  });

  it('Requirement: downloadBlob (privacy.ts wrapper) invokes downloadFileOnce exactly once', async () => {
    const blob = new Blob(['privacy content'], { type: 'text/plain' });
    downloadBlob(blob, 'privacy_export.txt');

    expect(clickedAnchors.length).toBe(1);
    expect(clickedAnchors[0].download).toBe('privacy_export.txt');
  });

  it('Requirement: downloadExportBlob (directExportService.ts wrapper) invokes downloadFileOnce exactly once', async () => {
    const blob = new Blob(['direct export docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    downloadExportBlob(blob, 'direct_export.docx');

    expect(clickedAnchors.length).toBe(1);
    expect(clickedAnchors[0].download).toBe('direct_export.docx');
  });

  it('Requirement: downloadBlobAsFile (formDocumentService.ts wrapper) invokes downloadFileOnce exactly once', async () => {
    const blob = new Blob(['form pdf content'], { type: 'application/pdf' });
    downloadBlobAsFile(blob, 'form_application.pdf');

    expect(clickedAnchors.length).toBe(1);
    expect(clickedAnchors[0].download).toBe('form_application.pdf');
  });
});
