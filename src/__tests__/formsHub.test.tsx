import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import { BangladeshFormsHub } from '../components/forms/BangladeshFormsHub';
import { FORM_CATEGORIES, SAMPLE_TEMPLATES } from '../data/formTemplates';

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

function changeInput(input: HTMLElement, value: string) {
  const isTextArea = input instanceof HTMLTextAreaElement;
  const proto = isTextArea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  const tracker = (input as any)._valueTracker;
  if (tracker) {
    tracker.setValue('___prev___');
  }
  if (descriptor?.set) {
    descriptor.set.call(input, value);
  } else {
    (input as any).value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
}

describe('Phase 3 Step 2A — Bangladesh Smart Forms Hub UI', () => {
  it('renders all 10 required form categories', () => {
    const requiredCategories = [
      'CV',
      'Job Application',
      'Office Letter',
      'Leave Application',
      'Invoice',
      'Quotation',
      'Business Proposal',
      'Meeting Minutes',
      'School Form',
      'Bank Letter',
    ];

    const categoryIds = FORM_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toEqual(requiredCategories);
  });

  it('mounts BangladeshFormsHub and renders search, categories, and template cards', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkspaceProvider>
          <BangladeshFormsHub />
        </WorkspaceProvider>
      );
    });

    // Verify Header / Branding
    expect(container.textContent).toContain('বাংলাদেশ প্রমিত ফরম ও ডকুমেন্ট হাব');
    expect(container.textContent).toContain('স্মার্ট অফিস ও সরকারি ফরম লাইব্রেরি');

    // Verify Search Box Presence
    const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    // Verify all 10 categories rendered in filter bar
    FORM_CATEGORIES.forEach((cat) => {
      expect(container.textContent).toContain(cat.labelBn);
    });

    // Verify each template card displays required fields
    const useTemplateButtons = container.querySelectorAll('button');
    const hasUseTemplateBtn = Array.from(useTemplateButtons).some((btn) =>
      btn.textContent?.includes('Use Template')
    );
    expect(hasUseTemplateBtn).toBe(true);

    // Verify first template card content
    const firstTpl = SAMPLE_TEMPLATES[0];
    expect(container.textContent).toContain(firstTpl.titleBn);
    expect(container.textContent).toContain(firstTpl.language);
    expect(container.textContent).toContain(firstTpl.categoryBn);

    // Test Search filtering
    await act(async () => {
      searchInput.value = 'Challan';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Test Clicking "Use Template" button
    const useBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Use Template')
    );
    expect(useBtn).toBeTruthy();

    if (useBtn) {
      await act(async () => {
        useBtn.click();
      });
      // Form Builder opens
      expect(container.textContent).toMatch(/টেমপ্লেটে ফিরুন|Back to Templates/);
      expect(container.textContent).toContain('Save Draft');
    }

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders FormBuilder with all 7 reusable field types, language toggle, and Save Draft', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const testTemplate = SAMPLE_TEMPLATES[0]; // CV template

    await act(async () => {
      root.render(
        <WorkspaceProvider>
          <BangladeshFormsHub />
        </WorkspaceProvider>
      );
    });

    // Click "Use Template" for the first template
    const useBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Use Template')
    );
    expect(useBtn).toBeTruthy();

    await act(async () => {
      useBtn?.click();
    });

    // 1. Shows template title & category
    expect(container.textContent).toContain(testTemplate.titleBn);
    expect(container.textContent).toContain('CV');

    // 2. Language selector: Bangla / English
    const enBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('English (EN)')
    );
    expect(enBtn).toBeTruthy();

    await act(async () => {
      enBtn?.click();
    });
    expect(container.textContent).toContain('Back to Templates');
    expect(container.textContent).toContain('Full Name');

    const bnBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('বাংলা (BN)')
    );
    expect(bnBtn).toBeTruthy();

    await act(async () => {
      bnBtn?.click();
    });
    expect(container.textContent).toContain('পূর্ণ নাম');

    // 3. Render structured input fields
    const inputs = container.querySelectorAll('input, textarea');
    expect(inputs.length).toBeGreaterThanOrEqual(6);

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const phoneInput = container.querySelector('input[type="tel"]') as HTMLInputElement;
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    const numInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;

    expect(emailInput).toBeTruthy();
    expect(phoneInput).toBeTruthy();
    expect(dateInput).toBeTruthy();
    expect(numInput).toBeTruthy();
    expect(textarea).toBeTruthy();

    // 4. Validation: Click Save Draft on empty form -> required errors appear
    const saveDraftBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save Draft')
    );
    expect(saveDraftBtn).toBeTruthy();

    await act(async () => {
      saveDraftBtn?.click();
    });
    expect(container.textContent).toContain('আবশ্যক');

    // 5. Validation: Invalid Email format error
    await act(async () => {
      changeInput(emailInput, 'invalid-email');
      saveDraftBtn?.click();
    });
    expect(container.textContent).toContain('সঠিক ইমেইল ঠিকানা দিন');

    // 6. Validation: Valid Email & Phone & Required Fields
    await act(async () => {
      changeInput(emailInput, 'rahim@example.com');
      changeInput(phoneInput, '01712345678');

      const nameInput = container.querySelector('input[name="fullName"]') as HTMLInputElement;
      if (nameInput) {
        changeInput(nameInput, 'Mohammad Rahim');
      }

      const addrInput = container.querySelector('input[name="presentAddress"]') as HTMLInputElement;
      if (addrInput) {
        changeInput(addrInput, 'Mirpur 10, Dhaka');
      }

      changeInput(dateInput, '1995-05-15');
      saveDraftBtn?.click();
    });

    // In-memory draft confirmation
    expect(container.textContent).toContain('সংরক্ষিত');

    // 7. Verify Download DOCX and Download PDF buttons are rendered
    const docxBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Download DOCX')
    );
    const pdfBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Download PDF')
    );
    expect(docxBtn).toBeTruthy();
    expect(pdfBtn).toBeTruthy();

    // 8. Back to Templates
    const backBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('টেমপ্লেটে ফিরুন') || b.textContent?.includes('Back to Templates')
    );
    expect(backBtn).toBeTruthy();

    await act(async () => {
      backBtn?.click();
    });

    // Back to hub: check draft indicator
    expect(container.textContent).toContain('খসড়া সংরক্ষিত');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
