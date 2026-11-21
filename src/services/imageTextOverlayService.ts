/**
 * Text watermark / meme caption for images (inspired by iLoveIMG's Watermark and
 * Meme Generator tools; own implementation). Runs on a canvas in the browser and
 * supports Bengali text through the system fonts.
 */
import { loadImageFromFile, type ImageProcessResult } from './imageService';

export type TextPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface TextOverlayOptions {
  text: string;
  position: TextPosition;
  /** Font size as % of the image's shorter side (2-30) */
  sizePct: number;
  color: string;
  /** 5-100 */
  opacityPct: number;
  /** Meme style: UPPERCASE with a contrasting outline */
  outline: boolean;
  /** Repeat the text diagonally across the whole image (watermark pattern) */
  tile: boolean;
  /** Output mime, defaults to the source type (png for unknown) */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
}

export const TEXT_FONT_STACK =
  "'Noto Sans Bengali','Hind Siliguri','Kalpurush','Nirmala UI',system-ui,'Segoe UI',Arial,sans-serif";

export function clampOverlayOptions(o: TextOverlayOptions): TextOverlayOptions {
  return {
    ...o,
    sizePct: Math.min(30, Math.max(2, o.sizePct || 8)),
    opacityPct: Math.min(100, Math.max(5, o.opacityPct || 60)),
  };
}

/** Pure layout helper (unit-testable): top-left anchor of a text box inside the image. */
export function computeTextOrigin(
  position: TextPosition,
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { x: number; y: number } {
  const margin = Math.round(Math.min(imgW, imgH) * 0.03);
  const [v, h] = position === 'center' ? ['middle', 'center'] : (position.split('-') as [string, string]);
  const x = h === 'left' ? margin : h === 'right' ? imgW - boxW - margin : (imgW - boxW) / 2;
  const y = v === 'top' ? margin : v === 'bottom' ? imgH - boxH - margin : (imgH - boxH) / 2;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

export async function addTextToImage(file: File, raw: TextOverlayOptions): Promise<ImageProcessResult> {
  const opts = clampOverlayOptions(raw);
  const text = (opts.text || '').trim();
  if (!text) throw new Error('Type the text first. (লেখা দিন)');

  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0);

  const fontPx = Math.round((Math.min(canvas.width, canvas.height) * opts.sizePct) / 100);
  ctx.font = `800 ${fontPx}px ${TEXT_FONT_STACK}`;
  ctx.textBaseline = 'top';
  ctx.globalAlpha = opts.opacityPct / 100;
  ctx.lineJoin = 'round';

  const display = opts.outline ? text.toUpperCase() : text;
  const lines = display.split(/\r?\n/);
  const lineH = Math.round(fontPx * 1.2);
  const widths = lines.map((l) => ctx.measureText(l).width);
  const boxW = Math.max(...widths);
  const boxH = lineH * lines.length;

  const strokeColor = /^#?(0{6}|000)$/i.test(opts.color.replace('#', '')) ? '#ffffff' : '#000000';
  const drawBlock = (ox: number, oy: number) => {
    lines.forEach((line, i) => {
      const lx = ox + (boxW - widths[i]) / 2; // centre each line inside the block
      const ly = oy + i * lineH;
      if (opts.outline) {
        ctx.lineWidth = Math.max(2, fontPx / 7);
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(line, lx, ly);
      }
      ctx.fillStyle = opts.color;
      ctx.fillText(line, lx, ly);
    });
  };

  if (opts.tile) {
    const stepX = boxW + fontPx * 2;
    const stepY = boxH + fontPx * 2;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((-30 * Math.PI) / 180);
    const reach = Math.hypot(canvas.width, canvas.height);
    for (let y = -reach; y < reach; y += stepY) {
      for (let x = -reach; x < reach; x += stepX) drawBlock(x, y);
    }
    ctx.restore();
  } else {
    const { x, y } = computeTextOrigin(opts.position, canvas.width, canvas.height, boxW, boxH);
    drawBlock(x, y);
  }

  const format = opts.format || (file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not save the image.'))), format, 0.92);
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
