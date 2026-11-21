import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import path from 'node:path';
import {
  encryptPdfStandard,
  decryptPdfStandard,
  isPdfStandardEncrypted,
  setQpdfWasmLocation,
} from '../services/pdfStandardEncryptionService';

async function makePdf(pages = 2): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([300, 300]);
  return new File([(await doc.save()) as Uint8Array<ArrayBuffer>], 't.pdf', { type: 'application/pdf' });
}

describe('Standard AES-256 PDF protection (qpdf-wasm)', () => {
  beforeAll(() => {
    setQpdfWasmLocation(path.resolve('node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm'));
  });

  it('produces a real encrypted PDF that unlocks with the right password only', async () => {
    const file = await makePdf(2);
    const enc = await encryptPdfStandard(file, 's3cret!', { copying: false });
    expect(await isPdfStandardEncrypted(enc.blob)).toBe(true);
    expect(await isPdfStandardEncrypted(file)).toBe(false);

    // pdf-lib refuses to open it without ignoring encryption => proves it is genuinely encrypted.
    await expect(PDFDocument.load(await enc.blob.arrayBuffer())).rejects.toThrow(/encrypted/i);

    await expect(decryptPdfStandard(enc.blob, 'wrong')).rejects.toThrow(/ভুল পাসওয়ার্ড|Incorrect password/);

    const dec = await decryptPdfStandard(enc.blob, 's3cret!');
    const reopened = await PDFDocument.load(await dec.blob.arrayBuffer());
    expect(reopened.getPageCount()).toBe(2);
  }, 60000);
});
