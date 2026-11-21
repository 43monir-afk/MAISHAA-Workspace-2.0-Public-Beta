import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../App';

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/x');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('Home and sidebar do not show fake content', () => {
  it('has no sample recent files, no Home-only sidebar links and no over-claiming card text', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<App />); });
    const text = container.textContent || '';

    // Hard-coded sample files that looked like the user's own files
    expect(text).not.toContain('Application_Form.pdf');
    expect(text).not.toContain('Passport_Photo.jpg');
    expect(text).not.toContain('Exam_Result.docx');

    // Honest empty state when nothing was processed yet
    expect(text).toContain('এখনো কোনো ফাইল প্রসেস করা হয়নি');

    // Sidebar links that only went back to Home are gone (FAQ text elsewhere may use similar words, so check the sidebar only)
    const sidebar = container.querySelector('aside')?.textContent || '';
    expect(sidebar).toContain('সাম্প্রতিক ফাইল');
    expect(sidebar).not.toContain('ক্লাউড স্টোরেজ');
    expect(sidebar).not.toContain('প্রিয় ফাইল');
    expect(sidebar).not.toContain('আমার ফাইল');

    // Card text must not promise features that do not exist
    expect(text).not.toContain('create sheets, charts');
    expect(text).not.toContain('Create, edit and convert Word');
    expect(text).not.toContain('100+ files');
    expect(text).not.toContain('many more formats');
    // Upload limit text must match the enforced 150 MB limit (validateFileInput)
    expect(text).not.toContain('Max 500 MB');
    expect(text).toContain('Max 150 MB');
  });
});
