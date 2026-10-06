/**
 * MAISHAA WORKSPACE 2 - Vitest Global Setup
 * Provides stable JSDOM environment mocks for Windows & Linux:
 * 1. Canvas 2D context, toDataURL, and toBlob helpers (removes requirement for native canvas npm package)
 * 2. Anchor click & navigation behavior (prevents JSDOM "Not implemented: navigation to another Document")
 * 3. Safe location and console error filters for JSDOM stubs
 */
import { vi } from 'vitest';
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';

// Ensure Web Streams API is available in JSDOM environment
if (typeof globalThis.ReadableStream === 'undefined') {
  (globalThis as any).ReadableStream = ReadableStream;
}
if (typeof globalThis.WritableStream === 'undefined') {
  (globalThis as any).WritableStream = WritableStream;
}
if (typeof globalThis.TransformStream === 'undefined') {
  (globalThis as any).TransformStream = TransformStream;
}
if (typeof window !== 'undefined') {
  if (typeof (window as any).ReadableStream === 'undefined') {
    (window as any).ReadableStream = ReadableStream;
  }
  if (typeof (window as any).WritableStream === 'undefined') {
    (window as any).WritableStream = WritableStream;
  }
  if (typeof (window as any).TransformStream === 'undefined') {
    (window as any).TransformStream = TransformStream;
  }
}

// Global URL objectURL mocks for JSDOM
if (typeof globalThis.URL !== 'undefined') {
  globalThis.URL.createObjectURL = vi.fn(
    () => `blob:http://localhost/${Math.random().toString(36).substring(2)}`
  );
  globalThis.URL.revokeObjectURL = vi.fn();
}
if (typeof window !== 'undefined' && window.URL) {
  window.URL.createObjectURL = globalThis.URL.createObjectURL;
  window.URL.revokeObjectURL = globalThis.URL.revokeObjectURL;
}

// Global Image constructor mock for JSDOM image loading
if (typeof window !== 'undefined') {
  class MockImage {
    naturalWidth = 800;
    naturalHeight = 600;
    width = 800;
    height = 600;
    _src = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    get src() {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  }

  (globalThis as any).Image = MockImage;
  (window as any).Image = MockImage;
}

// 1. Mock HTMLCanvasElement 2D context & helpers unconditionally
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') {
      return {
        canvas: this,
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        strokeRect: vi.fn(),
        getImageData: vi.fn((x: number, y: number, w: number, h: number) => ({
          width: w || 1,
          height: h || 1,
          data: new Uint8ClampedArray((w || 1) * (h || 1) * 4),
        })),
        putImageData: vi.fn(),
        createImageData: vi.fn((w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        })),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        rect: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn((text: string) => ({
          width: (text || '').length * 8,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
        })),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        clip: vi.fn(),
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      } as any;
    }
    return null;
  };

  HTMLCanvasElement.prototype.toBlob = function (
    cb: (blob: Blob | null) => void,
    type?: string,
    quality?: number
  ) {
    const format = type || 'image/png';
    const mockSize = quality ? Math.round(50000 * quality) : 40000;
    const blob = new Blob([new Uint8Array(mockSize)], { type: format });
    cb(blob);
  };

  HTMLCanvasElement.prototype.toDataURL = function (type?: string) {
    const format = type || 'image/png';
    return `data:${format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  };
}

// 2. Mock navigation behavior in JSDOM so "Not implemented: navigation to another Document" disappears
if (typeof HTMLAnchorElement !== 'undefined') {
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const preventNavigation = (event: Event) => {
      event.preventDefault();
    };
    this.addEventListener('click', preventNavigation, { capture: true, once: true });
    try {
      return origAnchorClick.call(this);
    } finally {
      this.removeEventListener('click', preventNavigation, { capture: true });
    }
  };
}

if (typeof window !== 'undefined') {
  // Prevent JSDOM unhandled navigation error when anchor elements in DOM are clicked
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'A' || target.closest('a'))) {
        e.preventDefault();
      }
    },
    true
  );

  // Safely mock location methods in JSDOM
  try {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      href: 'http://localhost:3000/',
    } as any;
  } catch {
    try {
      Object.defineProperty(window.location, 'assign', { value: vi.fn(), writable: true });
      Object.defineProperty(window.location, 'replace', { value: vi.fn(), writable: true });
      Object.defineProperty(window.location, 'reload', { value: vi.fn(), writable: true });
    } catch {
      // Ignore
    }
  }

  // Intercept jsdom virtualConsole navigation and canvas warnings if forwarded to console.error
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const firstArg = typeof args[0] === 'string' ? args[0] : args[0]?.message || String(args[0] || '');
    if (
      firstArg.includes("HTMLCanvasElement's getContext() method: without installing the canvas npm package") ||
      firstArg.includes("HTMLCanvasElement's toDataURL() method: without installing the canvas npm package") ||
      firstArg.includes('Not implemented: navigation to another Document')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

// Intercept JSDOM virtualConsole errors written directly to process.stderr
if (typeof process !== 'undefined' && process.stderr && process.stderr.write) {
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = function (chunk: any, ...rest: any[]) {
    const str = typeof chunk === 'string' ? chunk : chunk?.toString?.() || '';
    if (
      str.includes("HTMLCanvasElement's getContext() method: without installing the canvas npm package") ||
      str.includes("HTMLCanvasElement's toDataURL() method: without installing the canvas npm package") ||
      str.includes('Not implemented: navigation to another Document')
    ) {
      return true;
    }
    return (originalStderrWrite as any)(chunk, ...rest);
  };
}
