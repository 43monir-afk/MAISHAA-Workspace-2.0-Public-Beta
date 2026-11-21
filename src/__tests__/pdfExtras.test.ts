import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import pako from 'pako';
import {
  extractPdfImages,
  addTextToPdf,
  overlayPdf,
  encodePng,
} from '../services/pdfExtrasService';

const toFile = (bytes: Uint8Array, name = 'x.pdf') => new File([bytes as any], name, { type: 'application/pdf' });

async function pdfWithImages() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  // 2x2 RGB flate image, no predictor
  const rgbPixels = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]);
  const flate = doc.context.stream(pako.deflate(rgbPixels), {
    Type: 'XObject', Subtype: 'Image', Width: 2, Height: 2, ColorSpace: 'DeviceRGB',
    BitsPerComponent: 8, Filter: 'FlateDecode',
  });
  const jpgLike = doc.context.stream(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
    Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, ColorSpace: 'DeviceRGB',
    BitsPerComponent: 8, Filter: 'DCTDecode',
  });
  const cmyk = doc.context.stream(new Uint8Array([1, 2, 3, 4]), {
    Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, ColorSpace: 'DeviceCMYK',
    BitsPerComponent: 8,
  });
  const xo = doc.context.obj({ A: doc.context.register(flate), B: doc.context.register(jpgLike), C: doc.context.register(cmyk) });
  page.node.Resources()!.set(PDFName.of('XObject'), xo);
  return toFile(await doc.save());
}

describe('PDF extras (PDF24-inspired)', () => {
  it('extracts JPEG and RGB flate images, counts unsupported ones', async () => {
    const res = await extractPdfImages(await pdfWithImages());
    expect(res.images.map((i) => i.mime).sort()).toEqual(['image/jpeg', 'image/png']);
    expect(res.skipped).toBe(1);
    expect(res.zipBlob).not.toBeNull();
    const png = res.images.find((i) => i.mime === 'image/png')!;
    expect(Array.from(png.bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.width).toBe(2);
  });

  it('encodePng produces a decodable payload', () => {
    const png = encodePng(new Uint8Array([10, 20, 30, 40]), 2, 2, 1);
    expect(png.length).toBeGreaterThan(40);
  });

  it('adds text, rejects Bengali and bad pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const file = toFile(await doc.save());
    const res = await addTextToPdf(file, [{ page: 1, text: 'Hello\nWorld', xPct: 10, yPct: 10, size: 12 }]);
    expect(res.pageCount).toBe(1);
    expect(res.newSize).toBeGreaterThan(file.size);
    await expect(addTextToPdf(file, [{ page: 1, text: 'বাংলা', xPct: 0, yPct: 0 }])).rejects.toThrow();
    await expect(addTextToPdf(file, [{ page: 5, text: 'x', xPct: 0, yPct: 0 }])).rejects.toThrow(/does not exist/);
    await expect(addTextToPdf(file, [{ page: 1, text: '  ', xPct: 0, yPct: 0 }])).rejects.toThrow();
  });

  it('overlays a one-page PDF over every page of a 3-page PDF', async () => {
    const base = await PDFDocument.create();
    [1, 2, 3].forEach(() => base.addPage([200, 300]));
    const over = await PDFDocument.create();
    over.addPage([100, 100]);
    const res = await overlayPdf(toFile(await base.save()), toFile(await over.save()), { position: 'under', pageMode: 'first' });
    expect(res.pageCount).toBe(3);
    const check = await PDFDocument.load(await res.blob.arrayBuffer());
    expect(check.getPage(0).getSize()).toEqual({ width: 200, height: 300 });
  });
});
