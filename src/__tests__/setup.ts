/**
 * MAISHAA WORKSPACE 2 - Vitest Global Setup
 * Provides stable JSDOM environment mocks for Windows & Linux:
 * 1. Canvas 2D context, toDataURL, and toBlob helpers (removes requirement for native canvas npm package)
 * 2. Anchor click & navigation behavior (prevents JSDOM "Not implemented: navigation to another Document")
 * 3. Safe location and console error filters for JSDOM stubs
 */
import { vi } from 'vitest';
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';
import { webcrypto } from 'node:crypto';

// Ensure Web Crypto API is complete in JSDOM environment
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
} else if (!globalThis.crypto.subtle) {
  try {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: webcrypto.subtle,
      writable: true,
      configurable: true,
    });
  } catch {
    (globalThis.crypto as any).subtle = webcrypto.subtle;
  }
}
if (typeof window !== 'undefined') {
  if (typeof (window as any).crypto === 'undefined') {
    (window as any).crypto = webcrypto;
  } else if (!(window as any).crypto.subtle) {
    try {
      Object.defineProperty(window.crypto, 'subtle', {
        value: webcrypto.subtle,
        writable: true,
        configurable: true,
      });
    } catch {
      ((window as any).crypto as any).subtle = webcrypto.subtle;
    }
  }
}

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
  function hexToRgba(color: string): [number, number, number, number] {
    if (!color || color === 'transparent') return [0, 0, 0, 0];
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      const n = parseInt(hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
    }
    return [0, 0, 0, 255];
  }

  HTMLCanvasElement.prototype.getContext = function (type: string) {
    if (type === '2d') {
      const canvasEl = this;
      if (!(canvasEl as any)._pixelBuffer) {
        const w = Math.max(1, canvasEl.width || 1);
        const h = Math.max(1, canvasEl.height || 1);
        (canvasEl as any)._pixelBuffer = new Uint8ClampedArray(w * h * 4);
      }

      let currentFill = '#000000';

      const ctxObj = {
        canvas: canvasEl,
        drawImage: vi.fn((img: any, dx: number, dy: number, dw?: number, dh?: number) => {
          // If drawing from another canvas or image that has pixel data, copy over
          if (img && (img as any)._pixelBuffer) {
            const srcBuf: Uint8ClampedArray = (img as any)._pixelBuffer;
            const destBuf: Uint8ClampedArray = (canvasEl as any)._pixelBuffer;
            if (destBuf && srcBuf) {
              const len = Math.min(destBuf.length, srcBuf.length);
              for (let i = 0; i < len; i++) destBuf[i] = srcBuf[i];
            }
          }
        }),
        fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
          const buf: Uint8ClampedArray = (canvasEl as any)._pixelBuffer;
          const cw = Math.max(1, canvasEl.width || 1);
          const ch = Math.max(1, canvasEl.height || 1);
          if (buf) {
            const [r, g, b, a] = hexToRgba(currentFill);
            const startX = Math.max(0, Math.floor(x));
            const endX = Math.min(cw, Math.ceil(x + w));
            const startY = Math.max(0, Math.floor(y));
            const endY = Math.min(ch, Math.ceil(y + h));
            for (let py = startY; py < endY; py++) {
              for (let px = startX; px < endX; px++) {
                const idx = (py * cw + px) * 4;
                buf[idx] = r;
                buf[idx + 1] = g;
                buf[idx + 2] = b;
                buf[idx + 3] = a;
              }
            }
          }
        }),
        clearRect: vi.fn((x: number, y: number, w: number, h: number) => {
          const buf: Uint8ClampedArray = (canvasEl as any)._pixelBuffer;
          const cw = Math.max(1, canvasEl.width || 1);
          const ch = Math.max(1, canvasEl.height || 1);
          if (buf) {
            const startX = Math.max(0, Math.floor(x));
            const endX = Math.min(cw, Math.ceil(x + w));
            const startY = Math.max(0, Math.floor(y));
            const endY = Math.min(ch, Math.ceil(y + h));
            for (let py = startY; py < endY; py++) {
              for (let px = startX; px < endX; px++) {
                const idx = (py * cw + px) * 4;
                buf[idx + 3] = 0;
              }
            }
          }
        }),
        strokeRect: vi.fn(),
        getImageData: vi.fn((x: number, y: number, w: number, h: number) => {
          const cw = Math.max(1, canvasEl.width || 1);
          const ch = Math.max(1, canvasEl.height || 1);
          const outData = new Uint8ClampedArray(w * h * 4);
          const buf: Uint8ClampedArray = (canvasEl as any)._pixelBuffer;
          if (buf) {
            for (let row = 0; row < h; row++) {
              for (let col = 0; col < w; col++) {
                const srcX = x + col;
                const srcY = y + row;
                const outIdx = (row * w + col) * 4;
                if (srcX >= 0 && srcX < cw && srcY >= 0 && srcY < ch) {
                  const srcIdx = (srcY * cw + srcX) * 4;
                  outData[outIdx] = buf[srcIdx];
                  outData[outIdx + 1] = buf[srcIdx + 1];
                  outData[outIdx + 2] = buf[srcIdx + 2];
                  outData[outIdx + 3] = buf[srcIdx + 3];
                }
              }
            }
          }
          return {
            width: w || 1,
            height: h || 1,
            data: outData,
          };
        }),
        putImageData: vi.fn((imgData: any, dx: number, dy: number) => {
          if (!imgData || !imgData.data) return;
          const cw = Math.max(1, canvasEl.width || 1);
          const ch = Math.max(1, canvasEl.height || 1);
          let buf: Uint8ClampedArray = (canvasEl as any)._pixelBuffer;
          if (!buf || buf.length !== cw * ch * 4) {
            buf = new Uint8ClampedArray(cw * ch * 4);
            (canvasEl as any)._pixelBuffer = buf;
          }
          const sw = imgData.width || cw;
          const sh = imgData.height || ch;
          for (let row = 0; row < sh; row++) {
            for (let col = 0; col < sw; col++) {
              const destX = dx + col;
              const destY = dy + row;
              if (destX >= 0 && destX < cw && destY >= 0 && destY < ch) {
                const srcIdx = (row * sw + col) * 4;
                const destIdx = (destY * cw + destX) * 4;
                buf[destIdx] = imgData.data[srcIdx];
                buf[destIdx + 1] = imgData.data[srcIdx + 1];
                buf[destIdx + 2] = imgData.data[srcIdx + 2];
                buf[destIdx + 3] = imgData.data[srcIdx + 3];
              }
            }
          }
        }),
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
        fill: vi.fn(() => {
          // Approximate fill for circle/rect in tests
          const buf: Uint8ClampedArray = (canvasEl as any)._pixelBuffer;
          const cw = Math.max(1, canvasEl.width || 1);
          const ch = Math.max(1, canvasEl.height || 1);
          if (buf) {
            const [r, g, b, a] = hexToRgba(currentFill);
            // If path was arc around center
            const cx = Math.floor(cw / 2);
            const cy = Math.floor(ch / 2);
            const rad = Math.floor(Math.min(cw, ch) * 0.28);
            const radSq = rad * rad;
            for (let py = 0; py < ch; py++) {
              for (let px = 0; px < cw; px++) {
                const distSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
                if (distSq <= radSq) {
                  const idx = (py * cw + px) * 4;
                  buf[idx] = r;
                  buf[idx + 1] = g;
                  buf[idx + 2] = b;
                  buf[idx + 3] = a;
                }
              }
            }
          }
        }),
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
        get fillStyle() {
          return currentFill;
        },
        set fillStyle(val: string) {
          currentFill = val;
        },
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      } as any;

      return ctxObj;
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
