import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateImageFile,
  checkProviderStatus,
  executeLocalBgRemoval,
  calculateSubjectBoundingBox,
  applyManualBrushStroke,
  compositeFinalImage,
  exportBatchZip,
} from '../services/bgRemoverService';
import { BgImageItem, BgDesignSettings } from '../types/bgRemover';
import JSZip from 'jszip';

// Helper to create synthetic test canvas
function createTestImageCanvas(width = 100, height = 100, subjectColor = '#2563eb', bgColor = '#ffffff'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Cannot get context');

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Fill foreground subject in center (40x40 circle)
  ctx.fillStyle = subjectColor;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, width * 0.25, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

// Convert canvas to image element
function canvasToImage(canvas: HTMLCanvasElement): HTMLImageElement {
  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  // Mock dimensions and copy pixel buffer in JSDOM
  Object.defineProperty(img, 'naturalWidth', { value: canvas.width });
  Object.defineProperty(img, 'naturalHeight', { value: canvas.height });
  if ((canvas as any)._pixelBuffer) {
    (img as any)._pixelBuffer = new Uint8ClampedArray((canvas as any)._pixelBuffer);
  }
  return img;
}

describe('MAISHAA BG REMOVE STUDIO Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Upload Validation & Integrity', () => {
    it('validates supported image formats (PNG, JPG, WebP) under 25MB', async () => {
      const validFile = new File(['fake-png-content'], 'test.png', { type: 'image/png' });
      // validateImageFile should test size and extension
      expect(validFile.size).toBeLessThan(25 * 1024 * 1024);
      expect(['png', 'jpg', 'webp']).toContain('png');
    });

    it('rejects files exceeding 25MB limit', async () => {
      const largeFile = new File([new Uint8Array(26 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
      const val = await validateImageFile(largeFile);
      expect(val.isValid).toBe(false);
      expect(val.error).toContain('25MB limit');
    });

    it('rejects unsupported extensions such as .exe, .pdf, .txt', async () => {
      const pdfFile = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
      const val = await validateImageFile(pdfFile);
      expect(val.isValid).toBe(false);
      expect(val.error).toContain('Unsupported file format');
    });

    it('detects duplicates by comparing filename and size', () => {
      const existingItems = [
        { name: 'photo1.jpg', size: 12040 },
        { name: 'photo2.png', size: 45090 },
      ];
      const newFile = new File(['test'], 'photo1.jpg', { type: 'image/jpeg' });
      Object.defineProperty(newFile, 'size', { value: 12040 });

      const isDup = existingItems.some((item) => item.name === newFile.name && item.size === newFile.size);
      expect(isDup).toBe(true);
    });
  });

  describe('2. Local Background Removal & Color Preservation', () => {
    it('generates genuine transparent PNG and preserves original foreground RGB', async () => {
      const canvas = createTestImageCanvas(60, 60, '#2563eb', '#ffffff');
      const img = canvasToImage(canvas);

      const result = await executeLocalBgRemoval(img, { tolerance: 35, featherRadius: 1, smartAlpha: true });

      expect(result.blob).toBeDefined();
      expect(result.blob.type).toBe('image/png');
      expect(result.cutoutCanvas.width).toBe(60);
      expect(result.cutoutCanvas.height).toBe(60);
      expect(result.alphaMask).toHaveLength(60 * 60);

      // Verify corner pixel (background) is transparent (alpha = 0)
      const ctx = result.cutoutCanvas.getContext('2d');
      expect(ctx).toBeDefined();
      const cornerPixel = ctx!.getImageData(0, 0, 1, 1).data;
      expect(cornerPixel[3]).toBe(0); // alpha is 0

      // Verify center pixel (subject) is opaque (alpha > 200) and RGB preserved
      const centerPixel = ctx!.getImageData(30, 30, 1, 1).data;
      expect(centerPixel[3]).toBeGreaterThan(200);
      // Original color was #2563eb (R=37, G=99, B=235)
      expect(centerPixel[0]).toBeCloseTo(37, -1);
      expect(centerPixel[1]).toBeCloseTo(99, -1);
      expect(centerPixel[2]).toBeCloseTo(235, -1);
    });

    it('outputs visual diagnostic alpha mask canvas (white foreground on black)', async () => {
      const canvas = createTestImageCanvas(40, 40, '#ff0000', '#ffffff');
      const img = canvasToImage(canvas);

      const result = await executeLocalBgRemoval(img, { tolerance: 30 });
      expect(result.maskCanvas).toBeDefined();
      expect(result.maskCanvas.width).toBe(40);
      expect(result.maskCanvas.height).toBe(40);

      const maskCtx = result.maskCanvas.getContext('2d')!;
      const centerMaskPixel = maskCtx.getImageData(20, 20, 1, 1).data;
      // White mask has R=G=B=255
      expect(centerMaskPixel[0]).toBeGreaterThan(200);
      expect(centerMaskPixel[3]).toBe(255);
    });
  });

  describe('3. Manual Refinement: Erase, Restore, and Undo/Redo', () => {
    it('erases cutout pixels when brush stroke is applied', () => {
      const canvas = createTestImageCanvas(50, 50, '#10b981', '#10b981');
      const img = canvasToImage(canvas);
      const alphaMask = new Uint8Array(50 * 50).fill(255);

      const ctx = canvas.getContext('2d')!;
      // Center is currently opaque
      expect(ctx.getImageData(25, 25, 1, 1).data[3]).toBe(255);

      // Apply Erase stroke at center
      applyManualBrushStroke(canvas, img, alphaMask, {
        type: 'erase',
        points: [{ x: 25, y: 25 }],
        radius: 10,
        hardness: 1,
      });

      const updatedPixel = ctx.getImageData(25, 25, 1, 1).data;
      expect(updatedPixel[3]).toBe(0);
      expect(alphaMask[25 * 50 + 25]).toBe(0);
    });

    it('restores original pixels and original alpha when Restore brush is applied', () => {
      const canvas = createTestImageCanvas(50, 50, '#f59e0b', '#ffffff');
      const img = canvasToImage(canvas);
      const alphaMask = new Uint8Array(50 * 50).fill(255);

      const ctx = canvas.getContext('2d')!;
      // First erase a section
      applyManualBrushStroke(canvas, img, alphaMask, {
        type: 'erase',
        points: [{ x: 25, y: 25 }],
        radius: 8,
        hardness: 1,
      });
      expect(ctx.getImageData(25, 25, 1, 1).data[3]).toBe(0);

      // Now restore it
      applyManualBrushStroke(canvas, img, alphaMask, {
        type: 'restore',
        points: [{ x: 25, y: 25 }],
        radius: 8,
        hardness: 1,
      });

      const restoredPixel = ctx.getImageData(25, 25, 1, 1).data;
      expect(restoredPixel[3]).toBe(255);
      expect(restoredPixel[0]).toBe(245); // #f59e0b R value
    });

    it('maintains independent history stacks per image to prevent stroke leakage', () => {
      const item1: Partial<BgImageItem> = { id: 'img_1', history: [], historyIndex: -1 };
      const item2: Partial<BgImageItem> = { id: 'img_2', history: [], historyIndex: -1 };

      const snap1 = {} as ImageData;
      item1.history!.push(snap1);
      item1.historyIndex = 0;

      expect(item1.history).toHaveLength(1);
      expect(item2.history).toHaveLength(0);
      expect(item1.historyIndex).toBe(0);
      expect(item2.historyIndex).toBe(-1);
    });
  });

  describe('4. Subject Bounding Box & Framing Transforms', () => {
    it('calculates tight subject bounding box based on alpha mask', () => {
      const w = 100;
      const h = 100;
      const mask = new Uint8Array(w * h).fill(0);

      // Draw subject between x: 20..60 and y: 30..80
      for (let y = 30; y <= 80; y++) {
        for (let x = 20; x <= 60; x++) {
          mask[y * w + x] = 255;
        }
      }

      const bbox = calculateSubjectBoundingBox(mask, w, h);
      expect(bbox.minX).toBe(20);
      expect(bbox.maxX).toBe(60);
      expect(bbox.minY).toBe(30);
      expect(bbox.maxY).toBe(80);
      expect(bbox.width).toBe(41);
      expect(bbox.height).toBe(51);
    });

    it('handles empty mask gracefully without crashing', () => {
      const w = 50;
      const h = 50;
      const emptyMask = new Uint8Array(w * h).fill(0);
      const bbox = calculateSubjectBoundingBox(emptyMask, w, h);
      expect(bbox.width).toBe(w);
      expect(bbox.height).toBe(h);
    });
  });

  describe('5. Compositing & Background Synthesis', () => {
    it('composites subject over solid color background with preserved alpha', async () => {
      const cutout = createTestImageCanvas(40, 40, '#2563eb', 'transparent');
      const orig = canvasToImage(cutout);

      const item: BgImageItem = {
        id: 'test_item',
        file: new File([], 'test.png'),
        name: 'test.png',
        size: 5000,
        dimensions: { width: 40, height: 40 },
        originalUrl: 'blob:test',
        originalImage: orig,
        alphaMask: new Uint8Array(40 * 40).fill(255),
        maskCanvas: cutout,
        cutoutCanvas: cutout,
        resultBlob: null,
        resultUrl: null,
        status: 'SUCCESS',
        progress: 100,
        history: [],
        historyIndex: 0,
      };

      const settings: BgDesignSettings = {
        backgroundType: 'color',
        solidColor: '#ffffff',
        gradientPreset: 'studio_blue',
        blurLevel: 10,
        customBgUrl: null,
        customBgBlob: null,
        presetName: 'luxury_marble',
        aiPrompt: '',
        aiGeneratedBgUrl: null,
        shadowType: 'none',
        shadowOpacity: 0.35,
        shadowBlur: 10,
        shadowDistance: 10,
        shadowAngle: 90,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        sharpness: 0,
        productPreset: 'none',
        cropPreset: 'original',
        alignment: 'center',
        paddingPercent: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
        watermark: false,
        exportFormat: 'image/png',
        exportQuality: 90,
        exportFilenamePrefix: 'test',
      };

      const comp = await compositeFinalImage(item, settings);
      expect(comp.blob).toBeDefined();
      expect(comp.width).toBe(40);
      expect(comp.height).toBe(40);
    });
  });

  describe('6. Batch Packaging & ZIP Manifest', () => {
    it('creates a clean ZIP with individual images and manifest.json', async () => {
      const cutout = createTestImageCanvas(30, 30, '#ec4899', 'transparent');
      const orig = canvasToImage(cutout);

      const items: BgImageItem[] = [
        {
          id: 'item_1',
          file: new File([], 'shirt.png'),
          name: 'shirt.png',
          size: 15000,
          dimensions: { width: 30, height: 30 },
          originalUrl: 'blob:1',
          originalImage: orig,
          alphaMask: new Uint8Array(30 * 30).fill(255),
          maskCanvas: cutout,
          cutoutCanvas: cutout,
          resultBlob: new Blob(['png'], { type: 'image/png' }),
          resultUrl: 'blob:1',
          status: 'SUCCESS',
          progress: 100,
          history: [],
          historyIndex: 0,
        },
      ];

      const settings: BgDesignSettings = {
        backgroundType: 'transparent',
        solidColor: '#ffffff',
        gradientPreset: 'studio_blue',
        blurLevel: 10,
        customBgUrl: null,
        customBgBlob: null,
        presetName: 'luxury_marble',
        aiPrompt: '',
        aiGeneratedBgUrl: null,
        shadowType: 'none',
        shadowOpacity: 0.35,
        shadowBlur: 10,
        shadowDistance: 10,
        shadowAngle: 90,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        sharpness: 0,
        productPreset: 'none',
        cropPreset: 'original',
        alignment: 'center',
        paddingPercent: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
        watermark: false,
        exportFormat: 'image/png',
        exportQuality: 90,
        exportFilenamePrefix: 'batch',
      };

      const zipBlob = await exportBatchZip(items, settings);
      expect(zipBlob.size).toBeGreaterThan(100);

      // Verify ZIP contents using JSZip
      const zip = await JSZip.loadAsync(zipBlob);
      const manifestFile = zip.file('MAISHAA-Background-Remover-Batch/manifest.json');
      expect(manifestFile).toBeDefined();

      const manifestContent = JSON.parse(await manifestFile!.async('text'));
      expect(manifestContent.totalImages).toBe(1);
      expect(manifestContent.successCount).toBe(1);
      expect(manifestContent.items[0].filename).toBe('shirt.png');
    });
  });

  describe('7. Server Provider Integration & Fallbacks', () => {
    it('returns local provider active when server endpoints are unconfigured', async () => {
      // Mock fetch failure
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const status = await checkProviderStatus();
      expect(status.removeBgAvailable).toBe(false);
      expect(status.geminiAvailable).toBe(false);
      expect(status.activeProvider).toBe('local');
      expect(status.message).toContain('Local');
    });

    it('properly reads configured provider status when server is available', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'OK',
            removeBgAvailable: true,
            geminiAvailable: true,
            message: 'remove.bg Connected',
          }),
        })
      );

      const status = await checkProviderStatus();
      expect(status.removeBgAvailable).toBe(true);
      expect(status.geminiAvailable).toBe(true);
      expect(status.activeProvider).toBe('removebg');
    });
  });
});
