import JSZip from 'jszip';
import { resizeImage, compressImage, convertImage, ResizeOptions } from './imageService';
import { imagesToPdf, mergePdfs } from './pdfService';
import { generateSafeOutputFilename } from '../utils/fileDetection';

export interface BatchItemResult {
  id: string;
  originalFile: File;
  status: 'COMPLETED' | 'FAILED';
  outputBlob?: Blob;
  outputFilename?: string;
  originalSize: number;
  outputSize?: number;
  errorMessage?: string;
}

export interface BatchProcessProgress {
  total: number;
  completed: number;
  failed: number;
  currentFilename?: string;
}

/**
 * Batch Image Resizing with failure isolation.
 */
export async function batchResizeImages(
  files: File[],
  options: ResizeOptions,
  onProgress?: (progress: BatchProcessProgress) => void
): Promise<BatchItemResult[]> {
  const results: BatchItemResult[] = [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ total: files.length, completed, failed, currentFilename: file.name });

    try {
      const res = await resizeImage(file, options);
      const outputFilename = generateSafeOutputFilename(file.name, 'resized');
      results.push({
        id: `batch_${i}_${Date.now()}`,
        originalFile: file,
        status: 'COMPLETED',
        outputBlob: res.blob,
        outputFilename,
        originalSize: file.size,
        outputSize: res.blob.size,
      });
      completed++;
    } catch (err: any) {
      results.push({
        id: `batch_${i}_${Date.now()}`,
        originalFile: file,
        status: 'FAILED',
        originalSize: file.size,
        errorMessage: err.message || 'Processing failed',
      });
      failed++;
    }
  }

  onProgress?.({ total: files.length, completed, failed });
  return results;
}

/**
 * Batch Image Compression with failure isolation.
 */
export async function batchCompressImages(
  files: File[],
  quality: number,
  onProgress?: (progress: BatchProcessProgress) => void
): Promise<BatchItemResult[]> {
  const results: BatchItemResult[] = [];
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ total: files.length, completed, failed, currentFilename: file.name });

    try {
      const res = await compressImage(file, quality);
      const outputFilename = generateSafeOutputFilename(file.name, 'compressed', res.format === 'image/webp' ? 'webp' : undefined);
      results.push({
        id: `batch_${i}_${Date.now()}`,
        originalFile: file,
        status: 'COMPLETED',
        outputBlob: res.blob,
        outputFilename,
        originalSize: file.size,
        outputSize: res.blob.size,
      });
      completed++;
    } catch (err: any) {
      results.push({
        id: `batch_${i}_${Date.now()}`,
        originalFile: file,
        status: 'FAILED',
        originalSize: file.size,
        errorMessage: err.message || 'Compression failed',
      });
      failed++;
    }
  }

  onProgress?.({ total: files.length, completed, failed });
  return results;
}

/**
 * Batch Format Conversion with failure isolation.
 */
export async function batchConvertImages(
  files: File[],
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp',
  onProgress?: (progress: BatchProcessProgress) => void
): Promise<BatchItemResult[]> {
  const results: BatchItemResult[] = [];
  let completed = 0;
  let failed = 0;

  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ total: files.length, completed, failed, currentFilename: file.name });

    try {
      const res = await convertImage(file, targetFormat);
      const outputFilename = generateSafeOutputFilename(file.name, 'converted', extMap[targetFormat]);
      results.push({
        id: `batch_${i}_${Date.now()}`,
        originalFile: file,
        status: 'COMPLETED',
        outputBlob: res.blob,
        outputFilename,
        originalSize: file.size,
        outputSize: res.blob.size,
      });
      completed++;
    } catch (err: any) {
      results.push({
        id: `batch_${i}_${Date.now()}`,
        originalFile: file,
        status: 'FAILED',
        originalSize: file.size,
        errorMessage: err.message || 'Conversion failed',
      });
      failed++;
    }
  }

  onProgress?.({ total: files.length, completed, failed });
  return results;
}

/**
 * Package successful batch results into a single downloadable ZIP archive.
 */
export async function createBatchZip(
  batchResults: BatchItemResult[],
  zipFilename = 'maishaa-workspace-batch.zip'
): Promise<Blob> {
  const zip = new JSZip();
  const successfulItems = batchResults.filter((r) => r.status === 'COMPLETED' && r.outputBlob);

  if (successfulItems.length === 0) {
    throw new Error('কোনো সফল ফাইল জিপ করার জন্য পাওয়া যায়নি (No successful files to zip)');
  }

  successfulItems.forEach((item, index) => {
    const filename = item.outputFilename || `file_${index + 1}`;
    zip.file(filename, item.outputBlob as Blob);
  });

  return await zip.generateAsync({ type: 'blob' });
}
