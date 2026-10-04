import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../App';

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  globalThis.URL.createObjectURL = vi.fn(
    () => `blob:http://localhost/${Math.random().toString(36).substring(2)}`
  );
  globalThis.URL.revokeObjectURL = vi.fn();

  HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') {
      return {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        fillStyle: '#FFFFFF',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      } as any;
    }
    return null;
  };
});

describe('Runtime Component Smoke Checks', () => {
  it('mounts App shell and Universal Workspace cleanly without runtime console errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('MAISHAA WORKSPACE');
    expect(container.textContent).toContain('এক জায়গায় আপনার সব অফিস কাজ।');
    expect(container.textContent).toContain('পিডিএফ স্টুডিও');
    expect(container.textContent).toContain('ছবি স্টুডিও');
    expect(container.textContent).toContain('ব্যাচ প্রসেসিং');
    expect(container.textContent).toContain('কনভার্ট স্টুডিও');
    expect(container.textContent).toContain('স্ক্যান ও ওসিআর');
    expect(container.textContent).toContain('ডকুমেন্ট ইন্টেলিজেন্স');
    expect(container.textContent).toContain('স্প্রেডশিট ডেটা');
    expect(container.textContent).toContain('স্লাইড প্রেজেন্টেশন');
    expect(container.textContent).toContain('মায়িশা অ্যাসিস্ট্যান্ট');
    expect(container.textContent).toContain('আপনি কী কাজ করতে চান?');
    expect(container.textContent).toContain('Run Task');

    // Verify zero active application console errors
    expect(errorSpy).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
    errorSpy.mockRestore();
  });

  it('renders correctly on 375px mobile viewport without throwing or overflowing errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    container.style.width = '375px';
    container.style.height = '667px';
    document.body.appendChild(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    expect(container.textContent).toContain('MAISHAA WORKSPACE');
    expect(errorSpy).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    document.body.removeChild(container);
    errorSpy.mockRestore();
  });
});
