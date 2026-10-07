/**
 * MAISHAA WORKSPACE — Creative Canvas Rendering, Export, & Bulk Create Engine
 * Renders layered vector designs to HTML5 Canvas, generates high-res PNG/PDF, and binds CSV rows.
 */

import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { DesignProject, DesignPage, CanvasElement } from '../types/creativeSuite';
import { generateSafeOutputFilename } from '../utils/fileDetection';

/**
 * Renders a DesignPage to an HTMLCanvasElement with high-DPI scaling.
 */
export async function renderPageToCanvas(
  page: DesignPage,
  scale = 1
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D Canvas Context unavailable');

  ctx.scale(scale, scale);

  // 1. Draw Page Background
  if (page.background.type === 'solid') {
    ctx.fillStyle = page.background.color || '#FFFFFF';
    ctx.fillRect(0, 0, page.width, page.height);
  } else if (page.background.type === 'gradient' && page.background.gradient) {
    const grad = ctx.createLinearGradient(0, 0, page.width, page.height);
    grad.addColorStop(0, '#0B192C');
    grad.addColorStop(1, '#2563EB');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, page.width, page.height);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, page.width, page.height);
  }

  // 2. Sort elements by zIndex
  const sorted = [...page.elements]
    .filter((el) => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    // Apply translation & rotation if needed
    if (el.rotation) {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (el.type === 'shape') {
      ctx.fillStyle = el.fill || 'transparent';
      ctx.strokeStyle = el.stroke || 'transparent';
      ctx.lineWidth = el.strokeWidth || 0;

      if (el.shapeType === 'circle') {
        const radius = Math.min(el.width, el.height) / 2;
        ctx.beginPath();
        ctx.arc(el.x + el.width / 2, el.y + el.height / 2, radius, 0, Math.PI * 2);
        if (el.fill && el.fill !== 'transparent') ctx.fill();
        if (el.stroke && el.strokeWidth) ctx.stroke();
      } else {
        // Rectangle
        ctx.beginPath();
        if (el.borderRadius) {
          ctx.roundRect(el.x, el.y, el.width, el.height, el.borderRadius);
        } else {
          ctx.rect(el.x, el.y, el.width, el.height);
        }
        if (el.fill && el.fill !== 'transparent') ctx.fill();
        if (el.stroke && el.strokeWidth) ctx.stroke();
      }
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 16;
      const fontWeight = el.fontWeight || 'normal';
      const fontFamily = el.fontFamily || 'SolaimanLipi, "Noto Sans Bengali", sans-serif';

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = el.color || '#000000';
      ctx.textAlign = (el.textAlign as any) || 'left';
      ctx.textBaseline = 'top';

      if (el.shadowColor) {
        ctx.shadowColor = el.shadowColor;
        ctx.shadowBlur = el.shadowBlur || 4;
        ctx.shadowOffsetX = el.shadowOffsetX || 2;
        ctx.shadowOffsetY = el.shadowOffsetY || 2;
      }

      const lines = (el.text || '').split('\n');
      const lineHeight = fontSize * (el.lineHeight || 1.3);

      lines.forEach((line, lIdx) => {
        let drawX = el.x;
        if (el.textAlign === 'center') drawX = el.x + el.width / 2;
        else if (el.textAlign === 'right') drawX = el.x + el.width;

        ctx.fillText(line, drawX, el.y + lIdx * lineHeight);
      });
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Exports all pages of a design project into a multi-page PDF document.
 */
export async function exportProjectToPdf(project: DesignProject): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const page of project.pages) {
    const canvas = await renderPageToCanvas(page, 2); // 2x high resolution
    const dataUrl = canvas.toDataURL('image/png');
    const pngImageBytes = await (await fetch(dataUrl)).arrayBuffer();
    const pngImage = await pdfDoc.embedPng(pngImageBytes);

    const pdfPage = pdfDoc.addPage([page.width, page.height]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Bulk Create Engine: Binds CSV/Excel rows to template variable fields (e.g. {{Name}}, {{ID}}),
 * generating personalized graphics and packing them into a clean ZIP archive with a manifest.
 */
export async function executeBulkCreate(
  templatePage: DesignPage,
  rows: Array<Record<string, string>>,
  options: { outputFormat?: 'png' | 'pdf'; filenamePrefix?: string } = {}
): Promise<{
  zipBlob: Blob;
  totalGenerated: number;
  manifest: { total: number; files: string[]; generatedAt: string };
}> {
  if (!rows || rows.length === 0) {
    throw new Error('কোনো ডেটা রো (Row) পাওয়া যায়নি (No data rows found for Bulk Create)');
  }

  const zip = new JSZip();
  const folder = zip.folder('MAISHAA-Bulk-Create-Output');
  const generatedFilenames: string[] = [];
  const prefix = options.filenamePrefix || 'Personalized_Card';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Deep clone page elements
    const pageClone: DesignPage = {
      ...templatePage,
      id: `${templatePage.id}_${i}`,
      elements: templatePage.elements.map((el) => {
        const elClone = { ...el };
        // Check for bindKey or variable mustache tags {{Key}}
        if (elClone.bindKey && row[elClone.bindKey] !== undefined) {
          elClone.text = row[elClone.bindKey];
        } else if (elClone.text && elClone.text.includes('{{')) {
          let replaced = elClone.text;
          for (const [colName, val] of Object.entries(row)) {
            replaced = replaced.replace(new RegExp(`\\{\\{${colName}\\}\\}`, 'g'), val);
          }
          elClone.text = replaced;
        }
        return elClone;
      }),
    };

    const canvas = await renderPageToCanvas(pageClone, 2);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob([])), 'image/png');
    });

    // Generate safe, unique filename using person's name or row index
    const namePart = row['Name'] || row['name'] || `Item_${i + 1}`;
    const safeName = `${prefix}_${String(namePart).replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_')}_${i + 1}.png`;

    folder?.file(safeName, blob);
    generatedFilenames.push(safeName);
  }

  const manifest = {
    total: rows.length,
    files: generatedFilenames,
    generatedAt: new Date().toISOString(),
  };

  folder?.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return {
    zipBlob,
    totalGenerated: rows.length,
    manifest,
  };
}
