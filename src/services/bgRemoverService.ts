/**
 * MAISHAA WORKSPACE — BG REMOVE STUDIO ENGINE
 * High-precision background removal, manual brush refinement, and compositing pipeline.
 */

import JSZip from 'jszip';
import {
  BgImageItem,
  BgDesignSettings,
  BgRemovalOptions,
  ProviderStatus,
  BatchManifestItem,
} from '../types/bgRemover';
import { generateSafeOutputFilename } from '../utils/fileDetection';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates image file type, size, and decodability.
 */
export async function validateImageFile(file: File): Promise<{
  isValid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
  imgElement?: HTMLImageElement;
}> {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // Size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: `File size exceeds the 25MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).` };
  }

  // MIME / Extension check
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['jpg', 'jpeg', 'png', 'webp'];
  const isMimeOk = SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) || (ext && validExts.includes(ext));
  if (!isMimeOk) {
    return { isValid: false, error: 'Unsupported file format. Please upload JPG, PNG, or WebP.' };
  }

  // Actual decoding test to catch corrupted or fake image files
  try {
    const img = await loadImageFromFile(file);
    if (!img.naturalWidth || !img.naturalHeight) {
      return { isValid: false, error: 'Corrupted image file with zero dimensions.' };
    }
    return {
      isValid: true,
      dimensions: { width: img.naturalWidth, height: img.naturalHeight },
      imgElement: img,
    };
  } catch {
    return { isValid: false, error: 'Unable to decode image file. The file may be damaged or corrupted.' };
  }
}

/**
 * Asynchronously loads an HTMLImageElement from a File or Blob.
 */
export function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image resource.'));
    };
    img.src = url;
  });
}

/**
 * Checks server provider configuration status.
 */
export async function checkProviderStatus(): Promise<ProviderStatus> {
  try {
    const res = await fetch('/api/image/provider-status', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      return {
        removeBgAvailable: !!data.removeBgAvailable,
        geminiAvailable: !!data.geminiAvailable,
        activeProvider: data.removeBgAvailable ? 'removebg' : data.geminiAvailable ? 'gemini' : 'local',
        message: data.message || 'Local processor active.',
      };
    }
  } catch {
    // Server endpoint not reachable or running standalone
  }

  return {
    removeBgAvailable: false,
    geminiAvailable: false,
    activeProvider: 'local',
    message: 'Local high-performance processor active (simple backgrounds).',
  };
}

/**
 * High-fidelity client-side local background removal.
 * Preserves 100% of the original foreground RGB colors, calculates an alpha mask,
 * and feather-blends boundary pixels to avoid jagged fringes.
 */
export async function executeLocalBgRemoval(
  img: HTMLImageElement,
  options: { tolerance?: number; featherRadius?: number; smartAlpha?: boolean } = {}
): Promise<{
  blob: Blob;
  cutoutCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement;
  alphaMask: Uint8Array;
}> {
  const w = Math.max(1, img.naturalWidth || img.width || 1);
  const h = Math.max(1, img.naturalHeight || img.height || 1);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D Canvas Context unavailable');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  const tolerance = Math.max(5, Math.min(100, options.tolerance ?? 38));
  const feather = Math.max(0, Math.min(10, options.featherRadius ?? 2));
  const smartAlpha = options.smartAlpha ?? true;

  // Initialize alpha mask: 255 = foreground, 0 = background
  const alphaMask = new Uint8Array(totalPixels);
  alphaMask.fill(255);

  // Perceptual Redmean color distance
  const calcDist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    const rmean = (r1 + r2) * 0.5;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(
      ((512 + rmean) * dr * dr) / 256 +
      4 * dg * dg +
      ((767 - rmean) * db * db) / 256
    ) / 3;
  };

  // 1. Gather perimeter samples to model background color distribution
  const borderSamples: Array<{ r: number; g: number; b: number }> = [];
  const stepX = Math.max(1, Math.floor(w / 32));
  const stepY = Math.max(1, Math.floor(h / 32));

  for (let x = 0; x < w; x += stepX) {
    const topIdx = x * 4;
    const botIdx = ((h - 1) * w + x) * 4;
    borderSamples.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });
    borderSamples.push({ r: data[botIdx], g: data[botIdx + 1], b: data[botIdx + 2] });
  }

  for (let y = 0; y < h; y += stepY) {
    const leftIdx = (y * w) * 4;
    const rightIdx = (y * w + (w - 1)) * 4;
    borderSamples.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });
    borderSamples.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
  }

  // Centroids
  const bgCentroids: Array<{ r: number; g: number; b: number }> = [];
  if (borderSamples.length > 0) {
    const sortedR = [...borderSamples].sort((a, b) => a.r - b.r);
    const sortedG = [...borderSamples].sort((a, b) => a.g - b.g);
    const sortedB = [...borderSamples].sort((a, b) => a.b - b.b);
    const mid = Math.floor(borderSamples.length / 2);
    bgCentroids.push({ r: sortedR[mid].r, g: sortedG[mid].g, b: sortedB[mid].b });

    const cornerIndices = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + (w - 1)) * 4];
    for (const cIdx of cornerIndices) {
      bgCentroids.push({ r: data[cIdx], g: data[cIdx + 1], b: data[cIdx + 2] });
    }
  } else {
    bgCentroids.push({ r: 255, g: 255, b: 255 });
  }

  // 2. Initial segmentation pass: test color distance against background clusters
  const thresholdDist = tolerance * 1.6;
  const featherDist = thresholdDist * 1.35;

  for (let i = 0; i < totalPixels; i++) {
    const pIdx = i * 4;
    const pr = data[pIdx];
    const pg = data[pIdx + 1];
    const pb = data[pIdx + 2];

    let minDist = Infinity;
    for (const c of bgCentroids) {
      const d = calcDist(pr, pg, pb, c.r, c.g, c.b);
      if (d < minDist) minDist = d;
    }

    if (minDist <= thresholdDist) {
      alphaMask[i] = 0;
    } else if (minDist < featherDist) {
      const factor = (minDist - thresholdDist) / (featherDist - thresholdDist);
      alphaMask[i] = Math.round(factor * 255);
    }
  }

  // 3. Smart alpha perimeter flood fill (prevents subject interior holes)
  if (smartAlpha) {
    const visited = new Uint8Array(totalPixels);
    const queue: number[] = [];

    // Push all borders into queue
    for (let x = 0; x < w; x++) {
      if (alphaMask[x] === 0) {
        queue.push(x);
        visited[x] = 1;
      }
      const bIdx = (h - 1) * w + x;
      if (alphaMask[bIdx] === 0) {
        queue.push(bIdx);
        visited[bIdx] = 1;
      }
    }
    for (let y = 0; y < h; y++) {
      const lIdx = y * w;
      if (alphaMask[lIdx] === 0) {
        queue.push(lIdx);
        visited[lIdx] = 1;
      }
      const rIdx = y * w + (w - 1);
      if (alphaMask[rIdx] === 0) {
        queue.push(rIdx);
        visited[rIdx] = 1;
      }
    }

    // Flood fill connected background
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = Math.floor(curr / w);

      const neighbors = [
        cx > 0 ? curr - 1 : -1,
        cx < w - 1 ? curr + 1 : -1,
        cy > 0 ? curr - w : -1,
        cy < h - 1 ? curr + w : -1,
      ];

      for (const n of neighbors) {
        if (n !== -1 && !visited[n] && alphaMask[n] < 160) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    // Protect disconnected internal pixels
    for (let i = 0; i < totalPixels; i++) {
      if (!visited[i] && alphaMask[i] < 200) {
        const cx = i % w;
        const cy = Math.floor(i / w);
        const marginX = w * 0.12;
        const marginY = h * 0.12;
        if (cx > marginX && cx < w - marginX && cy > marginY && cy < h - marginY) {
          alphaMask[i] = 255;
        }
      }
    }
  }

  // 4. Edge feathering / smoothing pass
  if (feather > 0) {
    const smoothed = new Uint8Array(alphaMask);
    const radius = Math.min(3, feather);
    for (let y = radius; y < h - radius; y++) {
      for (let x = radius; x < w - radius; x++) {
        const idx = y * w + x;
        const val = alphaMask[idx];
        if (val > 0 && val < 255) {
          let sum = 0;
          let count = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              sum += alphaMask[(y + dy) * w + (x + dx)];
              count++;
            }
          }
          smoothed[idx] = Math.round(sum / count);
        }
      }
    }
    alphaMask.set(smoothed);
  }

  // 5. Apply the mask ONLY to the alpha channel (preserve 100% original RGB colors!)
  for (let i = 0; i < totalPixels; i++) {
    data[i * 4 + 3] = alphaMask[i];
  }

  ctx.putImageData(imgData, 0, 0);

  // Generate Mask Canvas (white foreground on black background) for visual diagnostics
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  if (maskCtx) {
    const maskImgData = maskCtx.createImageData(w, h);
    for (let i = 0; i < totalPixels; i++) {
      const a = alphaMask[i];
      const p = i * 4;
      maskImgData.data[p] = a;
      maskImgData.data[p + 1] = a;
      maskImgData.data[p + 2] = a;
      maskImgData.data[p + 3] = 255;
    }
    maskCtx.putImageData(maskImgData, 0, 0);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas blob conversion failed'))), 'image/png');
  });

  return {
    blob,
    cutoutCanvas: canvas,
    maskCanvas,
    alphaMask,
  };
}

/**
 * Universal Background Removal Dispatcher (Local + Server fallback).
 */
export async function removeBackground(
  file: File,
  imgElement: HTMLImageElement,
  options: BgRemovalOptions
): Promise<{
  blob: Blob;
  cutoutCanvas: HTMLCanvasElement;
  maskCanvas: HTMLCanvasElement;
  alphaMask: Uint8Array;
  providerUsed: 'local' | 'removebg' | 'gemini';
}> {
  // If cloud provider is requested, attempt server-side proxy
  if (options.provider === 'cloud_removebg' || options.provider === 'cloud_gemini') {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('provider', options.provider === 'cloud_removebg' ? 'removebg' : 'gemini');

      const res = await fetch('/api/image/remove-bg', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const resBlob = await res.blob();
        const cloudImg = await loadImageFromFile(resBlob);
        const w = cloudImg.naturalWidth;
        const h = cloudImg.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(cloudImg, 0, 0);
          const imgData = ctx.getImageData(0, 0, w, h);
          const alphaMask = new Uint8Array(w * h);
          for (let i = 0; i < w * h; i++) {
            alphaMask[i] = imgData.data[i * 4 + 3];
          }

          // Build mask canvas
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = w;
          maskCanvas.height = h;
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            const mData = maskCtx.createImageData(w, h);
            for (let i = 0; i < w * h; i++) {
              mData.data[i * 4] = alphaMask[i];
              mData.data[i * 4 + 1] = alphaMask[i];
              mData.data[i * 4 + 2] = alphaMask[i];
              mData.data[i * 4 + 3] = 255;
            }
            maskCtx.putImageData(mData, 0, 0);
          }

          return {
            blob: resBlob,
            cutoutCanvas: canvas,
            maskCanvas,
            alphaMask,
            providerUsed: options.provider === 'cloud_removebg' ? 'removebg' : 'gemini',
          };
        }
      }
    } catch {
      // Fallback to local
    }
  }

  // Fallback to local
  const result = await executeLocalBgRemoval(imgElement, {
    tolerance: options.tolerance,
    featherRadius: options.featherRadius,
    smartAlpha: options.smartAlpha,
  });

  return {
    ...result,
    providerUsed: 'local',
  };
}

/**
 * Calculates tight bounding box of subject from alpha mask.
 */
export function calculateSubjectBoundingBox(
  alphaMask: Uint8Array,
  width: number,
  height: number,
  threshold = 15
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaMask[y * width + x] > threshold) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return { minX: 0, minY: 0, maxX: width, maxY: height, width, height };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Executes an Erase or Restore brush stroke on the cutout canvas.
 * Restore brush directly samples original pixels and alpha from originalImage.
 */
export function applyManualBrushStroke(
  cutoutCanvas: HTMLCanvasElement,
  originalImage: HTMLImageElement,
  alphaMask: Uint8Array,
  stroke: {
    type: 'erase' | 'restore';
    points: Array<{ x: number; y: number }>;
    radius: number;
    hardness: number; // 0 (soft) to 1 (hard)
  }
): ImageData {
  const w = cutoutCanvas.width;
  const h = cutoutCanvas.height;
  const ctx = cutoutCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D Canvas Context unavailable');

  // Obtain current cutout data
  const currentData = ctx.getImageData(0, 0, w, h);

  // Obtain pristine original image pixels
  const origCanvas = document.createElement('canvas');
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
  if (!origCtx) throw new Error('Original canvas context unavailable');
  origCtx.drawImage(originalImage, 0, 0);
  const origData = origCtx.getImageData(0, 0, w, h);

  const radius = Math.max(1, stroke.radius);
  const radiusSq = radius * radius;
  const innerRadius = radius * Math.max(0.1, stroke.hardness);
  const innerRadiusSq = innerRadius * innerRadius;

  for (const pt of stroke.points) {
    const startX = Math.max(0, Math.floor(pt.x - radius));
    const endX = Math.min(w - 1, Math.ceil(pt.x + radius));
    const startY = Math.max(0, Math.floor(pt.y - radius));
    const endY = Math.min(h - 1, Math.ceil(pt.y + radius));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - pt.x;
        const dy = y - pt.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq) {
          const idx = y * w + x;
          const p = idx * 4;

          let factor = 1;
          if (distSq > innerRadiusSq) {
            factor = 1 - (Math.sqrt(distSq) - innerRadius) / (radius - innerRadius);
            factor = Math.max(0, Math.min(1, factor));
          }

          if (stroke.type === 'erase') {
            // Mask out
            const currentA = currentData.data[p + 3];
            const newA = Math.round(currentA * (1 - factor));
            currentData.data[p + 3] = newA;
            alphaMask[idx] = newA;
          } else {
            // Restore original pixels and alpha
            const origR = origData.data[p];
            const origG = origData.data[p + 1];
            const origB = origData.data[p + 2];
            const origA = origData.data[p + 3];

            currentData.data[p] = origR;
            currentData.data[p + 1] = origG;
            currentData.data[p + 2] = origB;

            const targetA = Math.round(currentData.data[p + 3] + factor * (origA - currentData.data[p + 3]));
            currentData.data[p + 3] = targetA;
            alphaMask[idx] = targetA;
          }
        }
      }
    }
  }

  ctx.putImageData(currentData, 0, 0);
  return currentData;
}

/**
 * Composites the final output image with backgrounds, shadows, product framing, and adjustments.
 */
export async function compositeFinalImage(
  item: BgImageItem,
  settings: BgDesignSettings
): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  if (!item.cutoutCanvas || !item.originalImage) {
    throw new Error('Image has not been processed yet.');
  }

  const origW = item.cutoutCanvas.width;
  const origH = item.cutoutCanvas.height;

  // 1. Determine bounding box if auto-crop is selected
  let srcX = 0;
  let srcY = 0;
  let srcW = origW;
  let srcH = origH;

  if (settings.cropPreset === 'auto_subject' && item.alphaMask) {
    const bbox = calculateSubjectBoundingBox(item.alphaMask, origW, origH);
    srcX = bbox.minX;
    srcY = bbox.minY;
    srcW = bbox.width;
    srcH = bbox.height;
  }

  // 2. Determine target canvas dimensions based on crop presets
  let targetW = srcW;
  let targetH = srcH;

  switch (settings.cropPreset) {
    case '1_1': {
      const maxDim = Math.max(srcW, srcH);
      targetW = maxDim;
      targetH = maxDim;
      break;
    }
    case '4_3': {
      targetW = srcW;
      targetH = Math.round((srcW * 3) / 4);
      break;
    }
    case '16_9': {
      targetW = srcW;
      targetH = Math.round((srcW * 9) / 16);
      break;
    }
    case '9_16': {
      targetW = srcW;
      targetH = Math.round((srcW * 16) / 9);
      break;
    }
    case 'fb_post': {
      targetW = 1200;
      targetH = 630;
      break;
    }
    case 'ig_story': {
      targetW = 1080;
      targetH = 1920;
      break;
    }
    case 'yt_thumb': {
      targetW = 1280;
      targetH = 720;
      break;
    }
    case 'web_banner': {
      targetW = 1200;
      targetH = 400;
      break;
    }
    case 'avatar': {
      targetW = 600;
      targetH = 600;
      break;
    }
    default:
      if (settings.customWidth && settings.customHeight) {
        targetW = settings.customWidth;
        targetH = settings.customHeight;
      }
      break;
  }

  // Handle rotation dimension swap
  const isRotated90or270 = settings.rotation === 90 || settings.rotation === 270;
  const outCanvasW = isRotated90or270 ? targetH : targetW;
  const outCanvasH = isRotated90or270 ? targetW : targetH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, outCanvasW);
  canvas.height = Math.max(1, outCanvasH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context failed');

  // 3. Render Background Layer
  ctx.save();
  switch (settings.backgroundType) {
    case 'transparent':
      // Clear canvas (default transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      break;

    case 'color':
      ctx.fillStyle = settings.solidColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;

    case 'gradient': {
      const grad = createGradient(ctx, canvas.width, canvas.height, settings.gradientPreset);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    }

    case 'blur': {
      // Draw blurred original image
      ctx.filter = `blur(${Math.max(4, settings.blurLevel || 16)}px)`;
      ctx.drawImage(item.originalImage, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      break;
    }

    case 'custom_image':
      if (settings.customBgUrl) {
        try {
          const bgImg = await loadImageFromFile(settings.customBgBlob || new Blob());
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } catch {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      break;

    case 'preset': {
      renderStudioPresetBg(ctx, canvas.width, canvas.height, settings.presetName);
      break;
    }

    case 'ai_generated': {
      if (settings.aiGeneratedBgUrl) {
        try {
          const aiImg = new Image();
          aiImg.crossOrigin = 'anonymous';
          await new Promise((res, rej) => {
            aiImg.onload = res;
            aiImg.onerror = rej;
            aiImg.src = settings.aiGeneratedBgUrl!;
          });
          ctx.drawImage(aiImg, 0, 0, canvas.width, canvas.height);
        } catch {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      break;
    }
  }
  ctx.restore();

  // 4. Calculate Subject Scaling, Padding, and Alignment
  const paddingRatio = Math.max(0, Math.min(0.5, (settings.paddingPercent ?? 0) / 100));
  const availW = canvas.width * (1 - paddingRatio * 2);
  const availH = canvas.height * (1 - paddingRatio * 2);

  const scale = Math.min(availW / srcW, availH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;

  let drawX = (canvas.width - drawW) / 2;
  let drawY = (canvas.height - drawH) / 2;

  switch (settings.alignment) {
    case 'top':
      drawY = canvas.height * paddingRatio;
      break;
    case 'bottom':
      drawY = canvas.height - drawH - canvas.height * paddingRatio;
      break;
    case 'left':
      drawX = canvas.width * paddingRatio;
      break;
    case 'right':
      drawX = canvas.width - drawW - canvas.width * paddingRatio;
      break;
    default:
      // Center
      break;
  }

  // 5. Render Cast Shadows
  if (settings.shadowType !== 'none') {
    ctx.save();
    const shadowOpacity = Math.max(0, Math.min(1, settings.shadowOpacity ?? 0.35));
    const shadowBlur = Math.max(1, settings.shadowBlur ?? 20);
    const shadowDist = settings.shadowDistance ?? 15;
    const shadowAngleRad = ((settings.shadowAngle ?? 90) * Math.PI) / 180;

    const offX = Math.cos(shadowAngleRad) * shadowDist;
    const offY = Math.sin(shadowAngleRad) * shadowDist;

    if (settings.shadowType === 'natural' || settings.shadowType === 'floating') {
      // Ground cast ellipse shadow
      const ellipseX = drawX + drawW / 2 + offX * 0.5;
      const ellipseY = drawY + drawH + offY * 0.5 - (settings.shadowType === 'floating' ? 10 : 2);
      const radiusX = (drawW * 0.42);
      const radiusY = Math.max(4, drawH * 0.08 * (settings.shadowType === 'floating' ? 0.7 : 1));

      ctx.beginPath();
      ctx.ellipse(ellipseX, ellipseY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
      ctx.filter = `blur(${shadowBlur * 0.5}px)`;
      ctx.fill();
    } else {
      // Standard drop / studio silhouette shadow
      ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = offX;
      ctx.shadowOffsetY = offY;
      ctx.drawImage(item.cutoutCanvas, srcX, srcY, srcW, srcH, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }

  // 6. Render Subject with Adjustments & Transformations
  ctx.save();

  // Set adjustments filter
  const brightnessVal = 100 + (settings.brightness || 0);
  const contrastVal = 100 + (settings.contrast || 0);
  const saturateVal = 100 + (settings.saturation || 0);
  ctx.filter = `brightness(${brightnessVal}%) contrast(${contrastVal}%) saturate(${saturateVal}%)`;

  // Transformations: Rotation & Flip
  const centerX = drawX + drawW / 2;
  const centerY = drawY + drawH / 2;
  ctx.translate(centerX, centerY);

  if (settings.rotation) {
    ctx.rotate((settings.rotation * Math.PI) / 180);
  }
  if (settings.flipH || settings.flipV) {
    ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
  }

  // Draw the subject
  ctx.drawImage(
    item.cutoutCanvas,
    srcX,
    srcY,
    srcW,
    srcH,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );

  ctx.restore();

  // 7. Optional MAISHAA Watermark
  if (settings.watermark) {
    ctx.save();
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    const wmText = 'MAISHAA BG REMOVER';
    const textWidth = ctx.measureText(wmText).width;
    ctx.fillText(wmText, canvas.width - textWidth - 16, canvas.height - 16);
    ctx.restore();
  }

  // 8. Export Blob
  const exportFormat = settings.exportFormat || 'image/png';
  const quality = Math.max(0.1, Math.min(1, (settings.exportQuality ?? 92) / 100));

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Export conversion failed'))),
      exportFormat,
      quality
    );
  });

  const url = URL.createObjectURL(blob);
  return { blob, url, width: canvas.width, height: canvas.height };
}

/**
 * Creates CSS-equivalent canvas gradients.
 */
function createGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: string
): CanvasGradient {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  switch (preset) {
    case 'sunset':
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(1, '#ec4899');
      break;
    case 'studio_blue':
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(1, '#0284c7');
      break;
    case 'mint':
      grad.addColorStop(0, '#0f766e');
      grad.addColorStop(1, '#10b981');
      break;
    case 'cyber':
      grad.addColorStop(0, '#581c87');
      grad.addColorStop(1, '#06b6d4');
      break;
    case 'warm_glow':
      grad.addColorStop(0, '#ffedd5');
      grad.addColorStop(1, '#fed7aa');
      break;
    default:
      // Neutral studio gradient
      grad.addColorStop(0, '#334155');
      grad.addColorStop(1, '#0f172a');
      break;
  }
  return grad;
}

/**
 * Renders built-in studio background environments.
 */
function renderStudioPresetBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: string
): void {
  switch (preset) {
    case 'luxury_marble': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      // Soft marble veins
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.3);
      ctx.bezierCurveTo(w * 0.4, h * 0.2, w * 0.6, h * 0.7, w, h * 0.6);
      ctx.stroke();
      break;
    }
    case 'product_podium': {
      // Dark studio backdrop with illuminated round podium
      ctx.fillStyle = '#0b1329';
      ctx.fillRect(0, 0, w, h);
      // Top spotlight
      const spot = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h * 0.4, w * 0.6);
      spot.addColorStop(0, 'rgba(37, 99, 235, 0.25)');
      spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);
      // Cylindrical podium base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.85, w * 0.35, h * 0.08, 0, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'modern_office': {
      // Soft blurred interior warmth
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(0.6, '#e2e8f0');
      grad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    default: {
      // Minimalist Clean Gray
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }
}

/**
 * Requests AI-generated background from server.
 */
export async function generateAiBackground(prompt: string): Promise<string> {
  const res = await fetch('/api/image/generate-bg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'AI Background generation service is currently unavailable.');
  }

  const data = await res.json();
  if (!data.imageUrl) {
    throw new Error('No image was returned by the AI generator.');
  }
  return data.imageUrl;
}

/**
 * Packages all batch results into a clean ZIP archive with a manifest.
 */
export async function exportBatchZip(
  items: BgImageItem[],
  settings: BgDesignSettings,
  onProgress?: (completed: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('MAISHAA-Background-Remover-Batch') || zip;
  const manifestItems: BatchManifestItem[] = [];

  let completed = 0;
  for (const item of items) {
    if (item.status === 'SUCCESS' && item.cutoutCanvas) {
      try {
        const { blob, width, height } = await compositeFinalImage(item, settings);
        const ext = settings.exportFormat === 'image/jpeg' ? 'jpg' : settings.exportFormat === 'image/webp' ? 'webp' : 'png';
        const exportName = generateSafeOutputFilename(item.name, 'bg_removed', ext);

        folder.file(exportName, blob);
        manifestItems.push({
          filename: item.name,
          originalSize: item.size,
          exportedFilename: exportName,
          status: 'SUCCESS',
          dimensions: `${width}x${height}`,
          provider: item.providerUsed || 'local',
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        manifestItems.push({
          filename: item.name,
          originalSize: item.size,
          exportedFilename: '',
          status: 'FAILED',
          dimensions: `${item.dimensions.width}x${item.dimensions.height}`,
          provider: item.providerUsed || 'local',
          timestamp: new Date().toISOString(),
          error: err.message,
        });
      }
    } else {
      manifestItems.push({
        filename: item.name,
        originalSize: item.size,
        exportedFilename: '',
        status: item.status,
        dimensions: `${item.dimensions.width}x${item.dimensions.height}`,
        provider: item.providerUsed || 'local',
        timestamp: new Date().toISOString(),
        error: item.errorMessage || 'Not processed',
      });
    }

    completed++;
    onProgress?.(completed, items.length);
  }

  folder.file('manifest.json', JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalImages: items.length,
    successCount: manifestItems.filter((m) => m.status === 'SUCCESS').length,
    items: manifestItems,
  }, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}
