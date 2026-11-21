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

const setInput = (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('All Tools grid: search, category filter, no fake upgrade box', () => {
  it('filters cards by search and category and removes the Upgrade box', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<App />); });

    expect(container.textContent).not.toContain('Upgrade Now');
    expect(container.textContent).not.toContain('Upgrade to Pro Plan');

    const countCards = () =>
      Array.from(container.querySelectorAll('button')).filter((b) => b.className.includes('min-h-[168px]')).length;
    expect(countCards()).toBe(13);

    const search = container.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => { setInput(search, 'whiteboard'); });
    expect(countCards()).toBe(1);

    await act(async () => { setInput(search, 'zzzz-nothing'); });
    expect(countCards()).toBe(0);
    expect(container.textContent).toContain('পাওয়া যায়নি');

    await act(async () => { setInput(search, ''); });
    const imageTab = Array.from(container.querySelectorAll('[role="tab"]')).find((b) => b.textContent === 'ছবি') as HTMLElement;
    await act(async () => { imageTab.click(); });
    expect(countCards()).toBe(2);
  });
});
