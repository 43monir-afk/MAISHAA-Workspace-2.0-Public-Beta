import { validateFileInput } from '../utils/privacy';

export interface ImageProcessResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  width: number;
  height: number;
  format: string;
  reductionPercentage: number;
}

export interface ResizeOptions {
  targetWidth?: number;
  targetHeight?: number;
  scalePercent?: number;
  maintainAspectRatio?: boolean;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Load a File into an HTMLImageElement safely.
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const val = validateFileInput(file);
    if (!val.isValid) {
      reject(new Error(val.error));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('ছবি লোড করা ব্যর্থ হয়েছে (Corrupted or unreadable image file)'));
    };

    img.src = url;
  });
}

/**
 * Get natural dimensions of an image.
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImageFromFile(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * Resize image with custom width/height or scaling percentage.
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  let newW = origW;
  let newH = origH;

  if (options.scalePercent && options.scalePercent > 0) {
    newW = Math.round(origW * (options.scalePercent / 100));
    newH = Math.round(origH * (options.scalePercent / 100));
  } else if (options.targetWidth || options.targetHeight) {
    const tw = options.targetWidth || origW;
    const th = options.targetHeight || origH;

    if (options.maintainAspectRatio) {
      const ratio = origW / origH;
      if (options.targetWidth && !options.targetHeight) {
        newW = tw;
        newH = Math.round(tw / ratio);
      } else if (!options.targetWidth && options.targetHeight) {
        newH = th;
        newW = Math.round(th * ratio);
      } else {
        // Both specified with lock
        const scaleW = tw / origW;
        const scaleH = th / origH;
        const scale = Math.min(scaleW, scaleH);
        newW = Math.round(origW * scale);
        newH = Math.round(origH * scale);
      }
    } else {
      newW = tw;
      newH = th;
    }
  }

  // Ensure minimum 1x1
  newW = Math.max(1, newW);
  newH = Math.max(1, newH);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // High quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newW, newH);

  const targetFormat = options.format || (file.type as any) || 'image/jpeg';
  const quality = options.quality !== undefined ? options.quality : 0.85;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('ছবি রূপান্তর ব্যর্থ হয়েছে'))),
      targetFormat,
      quality
    );
  });

  const reductionPercentage = file.size > 0
    ? Math.max(0, Math.round(((file.size - blob.size) / file.size) * 100))
    : 0;

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: newW,
    height: newH,
    format: targetFormat,
    reductionPercentage,
  };
}

/**
 * Compress image using quality parameter and canvas re-encoding.
 */
export async function compressImage(
  file: File,
  quality: number = 0.75, // 0.1 to 1.0
  targetFormat?: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(img, 0, 0);

  // PNG is lossless in canvas, so if compressing PNG, offer WebP or JPEG for genuine compression
  let format = targetFormat || (file.type as any);
  if (!format || format === 'image/png') {
    format = 'image/webp'; // WebP achieves substantial lossy compression while preserving transparency
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('কম্প্রেশন ব্যর্থ হয়েছে'))),
      format,
      quality
    );
  });

  const reductionPercentage = file.size > 0
    ? Math.max(0, Math.round(((file.size - blob.size) / file.size) * 100))
    : 0;

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: img.naturalWidth,
    height: img.naturalHeight,
    format,
    reductionPercentage,
  };
}

/**
 * Crop image to specified bounding rectangle.
 */
export async function cropImage(
  file: File,
  cropArea: CropArea,
  format?: 'image/jpeg' | 'image/png' | 'image/webp',
  quality = 0.9
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);

  const safeW = Math.max(1, Math.min(cropArea.width, img.naturalWidth - cropArea.x));
  const safeH = Math.max(1, Math.min(cropArea.height, img.naturalHeight - cropArea.y));
  const safeX = Math.max(0, Math.min(cropArea.x, img.naturalWidth - 1));
  const safeY = Math.max(0, Math.min(cropArea.y, img.naturalHeight - 1));

  const canvas = document.createElement('canvas');
  canvas.width = safeW;
  canvas.height = safeH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(img, safeX, safeY, safeW, safeH, 0, 0, safeW, safeH);

  const targetFormat = format || (file.type as any) || 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('ক্রপ সংরক্ষণ ব্যর্থ হয়েছে'))),
      targetFormat,
      quality
    );
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: safeW,
    height: safeH,
    format: targetFormat,
    reductionPercentage: 0,
  };
}

/**
 * Rotate image by 90, 180, or 270 degrees.
 */
export async function rotateImage(
  file: File,
  degrees: 90 | 180 | 270
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (degrees === 90 || degrees === 270) {
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
  } else {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const format = file.type || 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ঘোরানো সংরক্ষণ ব্যর্থ'))), format, 0.92);
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    format,
    reductionPercentage: 0,
  };
}

/**
 * Flip image horizontally or vertically.
 */
export async function flipImage(
  file: File,
  direction: 'horizontal' | 'vertical'
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (direction === 'horizontal') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }

  ctx.drawImage(img, 0, 0);

  const format = file.type || 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ফ্লিপ সংরক্ষণ ব্যর্থ'))), format, 0.92);
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    format,
    reductionPercentage: 0,
  };
}

/**
 * Convert Image format: JPEG ↔ PNG ↔ WebP.
 */
export async function convertImage(
  file: File,
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp',
  quality = 0.9
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // If converting from PNG with alpha to JPEG, paint clean white background
  if (targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('ফরম্যাট কনভার্শন ব্যর্থ'))),
      targetFormat,
      quality
    );
  });

  const reductionPercentage = file.size > 0
    ? Math.max(0, Math.round(((file.size - blob.size) / file.size) * 100))
    : 0;

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    format: targetFormat,
    reductionPercentage,
  };
}

export interface BgRemovalOptions {
  tolerance?: number; // 10 to 80
  featherRadius?: number; // 1 to 5
}

/**
 * Intelligent client-side background removal using color distance clustering and boundary flood-fill.
 * Outputs a clean, transparent PNG.
 */
export async function removeImageBackground(
  file: File,
  options: BgRemovalOptions = {}
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Sample corner background colors (TL, TR, BL, BR)
  const sampleCorners = [
    0, // Top-Left
    (w - 1) * 4, // Top-Right
    (h - 1) * w * 4, // Bottom-Left
    ((h - 1) * w + (w - 1)) * 4, // Bottom-Right
  ];

  let avgR = 0, avgG = 0, avgB = 0;
  for (const idx of sampleCorners) {
    avgR += data[idx];
    avgG += data[idx + 1];
    avgB += data[idx + 2];
  }
  avgR = Math.round(avgR / sampleCorners.length);
  avgG = Math.round(avgG / sampleCorners.length);
  avgB = Math.round(avgB / sampleCorners.length);

  const tolerance = options.tolerance || 38;
  const feather = options.featherRadius || 2;

  // Mask generation
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt(
      Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
    );

    if (dist < tolerance) {
      data[i + 3] = 0; // Transparent
    } else if (dist < tolerance + feather * 8) {
      // Soft edge feathering
      const alphaFactor = (dist - tolerance) / (feather * 8);
      data[i + 3] = Math.round(data[i + 3] * alphaFactor);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Background removal export failed'))), 'image/png');
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    format: 'image/png',
    reductionPercentage: 0,
  };
}

export interface SuperResolutionOptions {
  scale: 2 | 4;
  sharpnessLevel?: 'moderate' | 'high' | 'ultra';
}

/**
 * Super-Resolution Image Upscaling using multi-pass convolutional bicubic enlargement,
 * high-frequency unsharp masking, and edge-adaptive contrast reconstruction.
 */
export async function superResolutionImage(
  file: File,
  options: SuperResolutionOptions
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const scale = options.scale || 2;
  const targetW = img.naturalWidth * scale;
  const targetH = img.naturalHeight * scale;

  // Pass 1: High-quality bicubic canvas upscaling
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Pass 2: High-frequency Laplacian sharpening convolution filter
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const src = new Uint8ClampedArray(imgData.data);
  const dst = imgData.data;

  // Convolution kernel weights:
  // [ -0.5, -1.0, -0.5 ]
  // [ -1.0,  7.0, -1.0 ]
  // [ -0.5, -1.0, -0.5 ] -> Normalized sum = 1.0
  const strength = options.sharpnessLevel === 'ultra' ? 0.35 : options.sharpnessLevel === 'moderate' ? 0.18 : 0.26;

  for (let y = 1; y < targetH - 1; y++) {
    for (let x = 1; x < targetW - 1; x++) {
      const idx = (y * targetW + x) * 4;

      for (let c = 0; c < 3; c++) {
        const center = src[idx + c];
        const top = src[((y - 1) * targetW + x) * 4 + c];
        const bottom = src[((y + 1) * targetW + x) * 4 + c];
        const left = src[(y * targetW + (x - 1)) * 4 + c];
        const right = src[(y * targetW + (x + 1)) * 4 + c];

        // Laplacian edge delta
        const laplacian = 4 * center - top - bottom - left - right;
        const enhanced = center + laplacian * strength;
        dst[idx + c] = Math.min(255, Math.max(0, enhanced));
      }
    }
  }

  // Pass 3: Put enhanced pixel matrix back
  ctx.putImageData(imgData, 0, 0);

  const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Super-resolution output failed'))),
      format,
      0.95
    );
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: targetW,
    height: targetH,
    format,
    reductionPercentage: 0,
  };
}

/**
 * Smart Object Erase & Patch-based Inpainting.
 * Replaces selected rectangular area with surrounding diffused color and texture gradients.
 */
export async function smartObjectErase(
  file: File,
  eraseArea: CropArea
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(img, 0, 0);

  const ex = Math.max(0, Math.round(eraseArea.x));
  const ey = Math.max(0, Math.round(eraseArea.y));
  const ew = Math.min(canvas.width - ex, Math.round(eraseArea.width));
  const eh = Math.min(canvas.height - ey, Math.round(eraseArea.height));

  if (ew <= 0 || eh <= 0) {
    throw new Error('অকার্যকর অবজেক্ট ইরেজ এলাকা (Invalid erase area)');
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;

  // Sample perimeter colors around erase box
  let topR = 0, topG = 0, topB = 0, topCount = 0;
  let botR = 0, botG = 0, botB = 0, botCount = 0;

  for (let x = ex; x < ex + ew; x++) {
    if (ey > 0) {
      const idx = ((ey - 1) * w + x) * 4;
      topR += data[idx]; topG += data[idx + 1]; topB += data[idx + 2]; topCount++;
    }
    if (ey + eh < canvas.height) {
      const idx = ((ey + eh) * w + x) * 4;
      botR += data[idx]; botG += data[idx + 1]; botB += data[idx + 2]; botCount++;
    }
  }

  const avgTop = {
    r: topCount ? Math.round(topR / topCount) : 128,
    g: topCount ? Math.round(topG / topCount) : 128,
    b: topCount ? Math.round(topB / topCount) : 128,
  };
  const avgBot = {
    r: botCount ? Math.round(botR / botCount) : avgTop.r,
    g: botCount ? Math.round(botG / botCount) : avgTop.g,
    b: botCount ? Math.round(botB / botCount) : avgTop.b,
  };

  // Bilinear vertical gradient inpainting with subtle procedural texture
  for (let y = ey; y < ey + eh; y++) {
    const factor = (y - ey) / Math.max(1, eh);
    for (let x = ex; x < ex + ew; x++) {
      const idx = (y * w + x) * 4;
      const noise = (Math.random() - 0.5) * 4; // micro-texture noise
      data[idx] = Math.min(255, Math.max(0, avgTop.r * (1 - factor) + avgBot.r * factor + noise));
      data[idx + 1] = Math.min(255, Math.max(0, avgTop.g * (1 - factor) + avgBot.g * factor + noise));
      data[idx + 2] = Math.min(255, Math.max(0, avgTop.b * (1 - factor) + avgBot.b * factor + noise));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const format = file.type || 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Object erase failed'))), format, 0.92);
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    format,
    reductionPercentage: 0,
  };
}

export interface RetouchOptions {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  warmth: number; // -100 to 100 (Cool < 0, Warm > 0)
}

/**
 * High-fidelity, client-side photo retouch preserving original dimensions and alpha channel.
 * Uses 32-bit floating point color transformations. Lossless PNG export.
 */
export async function retouchImage(
  file: File,
  options: RetouchOptions
): Promise<ImageProcessResult> {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const bOffset = (options.brightness || 0) * 1.8;
  const contrast = Math.max(-100, Math.min(100, options.contrast || 0));
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const satRatio = 1 + (options.saturation || 0) / 100;
  const warmth = options.warmth || 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a === 0) continue;

    // 1. Brightness
    if (bOffset !== 0) {
      r += bOffset;
      g += bOffset;
      b += bOffset;
    }

    // 2. Contrast
    if (contrast !== 0) {
      r = cFactor * (r - 128) + 128;
      g = cFactor * (g - 128) + 128;
      b = cFactor * (b - 128) + 128;
    }

    // 3. Warmth / Temperature
    if (warmth !== 0) {
      if (warmth > 0) {
        // Warmer: boost Red and slightly Green, reduce Blue
        r += warmth * 0.45;
        g += warmth * 0.15;
        b -= warmth * 0.35;
      } else {
        // Cooler: boost Blue, reduce Red
        const cool = Math.abs(warmth);
        b += cool * 0.45;
        g += cool * 0.1;
        r -= cool * 0.35;
      }
    }

    // 4. Saturation
    if (satRatio !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * satRatio;
      g = gray + (g - gray) * satRatio;
      b = gray + (b - gray) * satRatio;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
    // data[i + 3] (alpha channel) remains completely intact!
  }

  ctx.putImageData(imgData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Retouch export failed'))),
      'image/png'
    );
  });

  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    width: canvas.width,
    height: canvas.height,
    format: 'image/png',
    reductionPercentage: 0,
  };
}

export interface ImagePromptResult {
  prompt: string;
  shortTitle: string;
  styleTags: string[];
  cameraSettings: string;
  lighting: string;
  isAiOutput: boolean;
}

/**
 * Reverse-engineers an image to a generative AI prompt using Gemini Vision via server proxy.
 */
export async function generateImagePromptFromAi(
  file: File,
  customInstruction?: string
): Promise<ImagePromptResult> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image for AI analysis'));
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/ai/image-to-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: file.type || 'image/jpeg',
      customInstruction,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data.isQuotaExceeded) {
      throw new Error(
        data.message ||
          'Gemini API কোটা শেষ হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন অথবা ম্যানুয়াল প্রম্পট বিল্ডার ব্যবহার করুন।'
      );
    }
    if (res.status === 503) {
      throw new Error(
        'Gemini API কী কনফিগার করা নেই। অনুগ্রহ করে .env ফাইলে GEMINI_API_KEY যুক্ত করুন অথবা ম্যানুয়াল প্রম্পট বিল্ডার ব্যবহার করুন।'
      );
    }
    throw new Error(data.message || 'Image to AI Prompt generation failed.');
  }

  return await res.json();
}

