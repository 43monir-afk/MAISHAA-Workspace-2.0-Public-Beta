/**
 * Local Privacy & Memory Management Utility
 * Ensures temporary object URLs and buffers are released to avoid memory leaks.
 */

const activeObjectUrls = new Set<string>();

export function createManagedObjectUrl(blob: Blob | File): string {
  const url = URL.createObjectURL(blob);
  activeObjectUrls.add(url);
  return url;
}

export function revokeManagedObjectUrl(url: string | undefined): void {
  if (url && activeObjectUrls.has(url)) {
    URL.revokeObjectURL(url);
    activeObjectUrls.delete(url);
  }
}

export function revokeAllManagedObjectUrls(): void {
  activeObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignore
    }
  });
  activeObjectUrls.clear();
}

export function getActiveObjectUrlsCount(): number {
  return activeObjectUrls.size;
}

export function validateFileInput(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'কোনো ফাইল নির্বাচন করা হয়নি (No file selected)' };
  }
  if (file.size === 0) {
    return { isValid: false, error: 'ফাইলটি খালি বা শূন্য বাইট (File is empty / zero bytes)' };
  }
  // 150MB warning threshold for client-side processing
  if (file.size > 150 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'ফাইলের আকার ১৫০MB এর বেশি, ব্রাউজারে মেমরি সীমাবদ্ধতার কারণে প্রসেস করা সম্ভব নাও হতে পারে।',
    };
  }
  return { isValid: true };
}

import { downloadFileOnce } from './downloadHelper';

export { downloadFileOnce };

export function downloadBlob(blob: Blob, filename: string): void {
  downloadFileOnce(blob, filename);
}

