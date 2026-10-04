import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import { OneClickOfficePack } from '../components/officepack/OneClickOfficePack';
import { OFFICE_PACKS } from '../data/officePacks';

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('Phase 3 Step 3A — One-Click Office Pack UI', () => {
  it('defines all 5 required pack types with their planned outputs', () => {
    const requiredPackIds = [
      'project_report',
      'business',
      'meeting',
      'study',
      'custom',
    ];

    const packIds = OFFICE_PACKS.map((p) => p.id);
    expect(packIds).toEqual(requiredPackIds);

    // Project Report Pack outputs
    const projectPack = OFFICE_PACKS.find((p) => p.id === 'project_report')!;
    const projectFormats = projectPack.defaultOutputs.map((o) => o.format);
    expect(projectFormats).toEqual(['docx', 'pdf', 'xlsx', 'pptx']);

    // Business Pack outputs
    const businessPack = OFFICE_PACKS.find((p) => p.id === 'business')!;
    const businessFormats = businessPack.defaultOutputs.map((o) => o.format);
    expect(businessFormats).toEqual(['docx', 'pdf', 'xlsx', 'pptx']);
  });

  it('mounts OneClickOfficePack and displays pack selector, AI indicator, and checklist', async () => {
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

    // 1. Verify Page Titles and Design
    expect(container.textContent).toContain('One-Click Office Pack');
    expect(container.textContent).toContain('Project Report Pack');
    expect(container.textContent).toContain('Business Pack');
    expect(container.textContent).toContain('Meeting Pack');
    expect(container.textContent).toContain('Study Pack');
    expect(container.textContent).toContain('Custom Pack');

    // 2. Verify LOCAL / CLOUD AI indicator placeholder
    expect(container.textContent).toContain('LOCAL AI');
    expect(container.textContent).toContain('CLOUD AI');
    expect(container.textContent).toMatch(/AI প্রসেসিং মোড|AI Engine Mode/);

    // 3. Verify Project Report Pack default planned outputs
    expect(container.textContent).toContain('DOCX report');
    expect(container.textContent).toContain('PDF summary');
    expect(container.textContent).toContain('XLSX data/summary');
    expect(container.textContent).toContain('PPTX presentation');

    // 4. Test validation: Click "Create Office Pack" without a source file
    const createBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Create Office Pack')
    );
    expect(createBtn).toBeTruthy();

    await act(async () => {
      createBtn?.click();
    });
    // Validation error triggers: source file required
    expect(container.textContent).toMatch(/উৎস ফাইল|source file/i);

    // 5. Select a source file via file input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const mockFile = new File(['Quarterly report content for company review'], 'quarterly_report.txt', {
      type: 'text/plain',
    });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify selected source file is displayed
    expect(container.textContent).toContain('quarterly_report.txt');

    // Wait for async source extraction to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Verify small source status badge and type are displayed
    expect(container.textContent).toMatch(/Source Ready|উৎস প্রস্তুত/);
    expect(container.textContent).toMatch(/Type:|টাইপ:/);

    // 6. Switch to Business Pack
    const businessPackBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Business Pack') || b.textContent?.includes('বিজনেস প্যাক')
    );
    expect(businessPackBtn).toBeTruthy();

    await act(async () => {
      businessPackBtn?.click();
    });

    // Verify Business Pack planned outputs
    expect(container.textContent).toContain('DOCX report');
    expect(container.textContent).toContain('PDF brief');
    expect(container.textContent).toContain('XLSX table');
    expect(container.textContent).toContain('PPTX presentation');

    // 7. Test enabling/disabling output checklist items
    const checklistItems = container.querySelectorAll('div[class*="cursor-pointer"]');
    const firstOutputItem = Array.from(checklistItems).find((el) =>
      el.textContent?.includes('DOCX report')
    );
    expect(firstOutputItem).toBeTruthy();

    await act(async () => {
      (firstOutputItem as HTMLElement).click();
    });

    // 8. Click "Create Office Pack" with source file selected -> Generates visible Workflow Plan
    await act(async () => {
      createBtn?.click();
    });

    // Verify Workflow Plan View is rendered
    expect(container.textContent).toMatch(/Office Pack Workflow Plan|অফিস প্যাক কার্যপরিকল্পনা/);
    expect(container.textContent).toContain('Detect source file');
    expect(container.textContent).toContain('Extract source content');
    expect(container.textContent).toContain('Prepare report structure');
    expect(container.textContent).toContain('AI summary if needed');
    expect(container.textContent).toContain('LOCAL');
    expect(container.textContent).toContain('CLOUD AI');
    expect(container.textContent).toMatch(/PLANNED|READY/);

    // Verify AI consent requirement notice before cloud step
    expect(container.textContent).toMatch(/AI সম্মতি আবশ্যক|AI Consent Required/);

    // 9. Verify Confirm Plan and Back/Edit buttons
    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm Plan') || b.textContent?.includes('পরিকল্পনা নিশ্চিত করুন')
    );
    const backEditBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Back/Edit') || b.textContent?.includes('পুনরায় সম্পাদনা')
    );
    expect(confirmBtn).toBeTruthy();
    expect(backEditBtn).toBeTruthy();

    // 10. Click "Confirm Plan"
    await act(async () => {
      confirmBtn?.click();
    });

    // Verify confirmed plan status banner appears
    expect(container.textContent).toMatch(/Plan Confirmed|নিশ্চিত করা হয়েছে/);

    // 11. Click "Generate Office Pack (DOCX & PDF)" button
    const generateBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Generate Office Pack') || b.textContent?.includes('DOCX ও PDF তৈরি করুন')
    );
    expect(generateBtn).toBeTruthy();

    await act(async () => {
      generateBtn?.click();
    });

    // Await async document generation completion
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    // Verify Generated Deliverables Section with Download buttons
    expect(container.textContent).toMatch(/Generated Deliverables|প্রস্তুতকৃত অফিস ডকুমেন্টস/);
    const downloadButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Download') || b.textContent?.includes('ডাউনলোড')
    );
    expect(downloadButtons.length).toBeGreaterThanOrEqual(1);

    // Verify Download XLSX and PPTX UI buttons are present and functional
    const downloadXlsxBtn = downloadButtons.find((b) => b.textContent?.includes('XLSX'));
    expect(downloadXlsxBtn).toBeTruthy();

    const downloadPptxBtn = downloadButtons.find((b) => b.textContent?.includes('PPTX'));
    expect(downloadPptxBtn).toBeTruthy();

    // Verify existing PDF/DOCX download buttons are not broken
    const downloadPdfBtn = downloadButtons.find((b) => b.textContent?.includes('PDF'));
    expect(downloadPdfBtn).toBeTruthy();

    // Verify Download All button is rendered when >= 2 deliverables are generated
    const downloadAllBtn = downloadButtons.find(
      (b) => b.textContent?.includes('Download All') || b.textContent?.includes('সকল ফাইল ZIP')
    );
    expect(downloadAllBtn).toBeTruthy();

    // Verify per-format output status grid is displayed with Quality indicator
    expect(container.textContent).toMatch(/Output & Quality|আউটপুট ও মান নিয়ন্ত্রণ|Output Status|আউটপুট স্ট্যাটাস/);
    expect(container.textContent).toMatch(/VALID|Generated/);

    // 12. Click "Back/Edit" to return to configuration view
    await act(async () => {
      backEditBtn?.click();
    });

    // Back to configuration mode
    expect(container.textContent).toMatch(/Source File Selection|উৎস ফাইল আপলোড \/ নির্বাচন/);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('mounts OneClickOfficePack, handles multi-file selection, renders batch orchestrator, and executes batch workflow', async () => {
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

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.multiple).toBe(true);

    const mockFile1 = new File(['Sample report 1 English text content'], 'doc1.txt', { type: 'text/plain' });
    const mockFile2 = new File(['Sample report 2 বাংলা বিবরণ তথ্য'], 'doc2.txt', { type: 'text/plain' });

    // Select multiple files at once
    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile1, mockFile2],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify batch summary card is displayed in Step 1
    expect(container.textContent).toMatch(/Batch:|ব্যাচ:/);
    expect(container.textContent).toContain('doc1.txt');
    expect(container.textContent).toContain('doc2.txt');

    // Click "Create Office Pack" to generate visible batch plan
    const createBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Create Office Pack')
    );
    expect(createBtn).toBeTruthy();

    await act(async () => {
      createBtn?.click();
    });

    // Verify Batch Workflow Orchestrator View is displayed
    expect(container.textContent).toMatch(/Office Pack Batch Orchestration|অফিস প্যাক ব্যাচ প্রসেসিং/);
    expect(container.textContent).toMatch(/Progress:|অগ্রগতি:/);

    // Confirm Batch Plan
    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Confirm Batch Plan') || b.textContent?.includes('Confirm Plan')
    );
    expect(confirmBtn).toBeTruthy();

    await act(async () => {
      confirmBtn?.click();
    });

    // Start Batch Processing
    const startBatchBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start Batch Processing') || b.textContent?.includes('ব্যাচ শুরু করুন')
    );
    expect(startBatchBtn).toBeTruthy();

    await act(async () => {
      startBatchBtn?.click();
    });

    // Wait for batch generation
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // Verify both items show COMPLETED or outputs
    expect(container.textContent).toMatch(/COMPLETED|VALID/);

    // Verify Download Batch button is present
    const downloadBatchBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Download Batch')
    );
    expect(downloadBatchBtn).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});

