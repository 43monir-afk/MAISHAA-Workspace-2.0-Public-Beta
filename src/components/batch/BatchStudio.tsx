import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  batchResizeImages,
  batchCompressImages,
  batchConvertImages,
  createBatchZip,
  BatchItemResult,
  BatchProcessProgress,
} from '../../services/batchService';
import { imagesToPdf, mergePdfs } from '../../services/pdfService';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  Layers,
  Upload,
  Minimize2,
  Maximize2,
  ArrowRightLeft,
  FileText,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileArchive,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';

type BatchMode =
  | 'batch_resize'
  | 'batch_compress'
  | 'batch_convert'
  | 'images_to_pdf'
  | 'pdfs_to_pdf';

export const BatchStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
  } = useWorkspace();

  const [mode, setMode] = useState<BatchMode>('batch_compress');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProcessProgress | null>(null);
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [consolidatedPdfUrl, setConsolidatedPdfUrl] = useState<{
    blob: Blob;
    url: string;
    filename: string;
    size: number;
  } | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);


  // Configuration states
  const [resizePercent, setResizePercent] = useState<number>(50);
  const [compressQuality, setCompressQuality] = useState<number>(75);
  const [targetImageFormat, setTargetImageFormat] = useState<
    'image/webp' | 'image/png' | 'image/jpeg'
  >('image/webp');

  // Stage files if incoming from universal workspace
  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      setFiles(stagedFiles);
    }
  }, [stagedFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      setResults([]);
      setZipUrl(null);
      setConsolidatedPdfUrl(null);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearQueue = () => {
    setFiles([]);
    setResults([]);
    setProgress(null);
    setZipUrl(null);
    setConsolidatedPdfUrl(null);
  };

  const executeBatch = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setResults([]);
    setZipUrl(null);
    setConsolidatedPdfUrl(null);

    const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);
    const jobId = addJob({
      toolType: `BATCH: ${mode.toUpperCase()}`,
      fileNames: files.map((f) => f.name),
      originalSize: totalOriginalSize,
      status: 'PROCESSING',
    });

    try {
      if (mode === 'images_to_pdf') {
        const res = await imagesToPdf(files);
        const outName = generateSafeOutputFilename('batch_images', 'combined', 'pdf');
        const url = createManagedObjectUrl(res.blob);
        setConsolidatedPdfUrl({
          blob: res.blob,
          url,
          filename: outName,
          size: res.newSize,
        });

        updateJob(jobId, {
          status: 'COMPLETED',
          outputSize: res.newSize,
          outputUrl: url,
          outputFilename: outName,
        });

        showNotification(
          language === 'bn'
            ? 'সব ছবি সফলভাবে পিডিএফে সংযুক্ত হয়েছে!'
            : 'Images consolidated to PDF successfully!'
        );
      } else if (mode === 'pdfs_to_pdf') {
        const res = await mergePdfs(files);
        const outName = generateSafeOutputFilename('batch_pdfs', 'merged', 'pdf');
        const url = createManagedObjectUrl(res.blob);
        setConsolidatedPdfUrl({
          blob: res.blob,
          url,
          filename: outName,
          size: res.newSize,
        });


        updateJob(jobId, {
          status: 'COMPLETED',
          outputSize: res.newSize,
          outputUrl: url,
          outputFilename: outName,
        });

        showNotification(
          language === 'bn'
            ? 'সব পিডিএফ সফলভাবে একত্রিত হয়েছে!'
            : 'PDFs merged successfully!'
        );
      } else {
        // Individual item batches (Resize, Compress, Convert)
        let itemResults: BatchItemResult[] = [];

        if (mode === 'batch_resize') {
          itemResults = await batchResizeImages(
            files,
            { scalePercent: resizePercent, maintainAspectRatio: true },
            setProgress
          );
        } else if (mode === 'batch_compress') {
          itemResults = await batchCompressImages(
            files,
            compressQuality / 100,
            setProgress
          );
        } else if (mode === 'batch_convert') {
          itemResults = await batchConvertImages(
            files,
            targetImageFormat,
            setProgress
          );
        }

        setResults(itemResults);

        // Build ZIP automatically for quick download
        const completedCount = itemResults.filter((r) => r.status === 'COMPLETED').length;
        if (completedCount > 0) {
          const zipBlob = await createBatchZip(itemResults);
          const downloadZipUrl = createManagedObjectUrl(zipBlob);
          setZipBlob(zipBlob);
          setZipUrl(downloadZipUrl);


          updateJob(jobId, {
            status: 'COMPLETED',
            outputSize: zipBlob.size,
            outputUrl: downloadZipUrl,
            outputFilename: 'maishaa_workspace_batch.zip',
            notes: `${completedCount}/${itemResults.length} files successfully packaged.`,
          });
        } else {
          updateJob(jobId, {
            status: 'FAILED',
            errorState: 'All items failed in batch.',
          });
        }

        showNotification(
          language === 'bn'
            ? `ব্যাচ সম্পন্ন: ${completedCount}টি সফল`
            : `Batch completed: ${completedCount} succeeded`
        );
      }
    } catch (err: any) {
      console.error(err);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: err.message || 'Batch failed',
      });
      showNotification(`Batch error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAcceptTypes = () => {
    if (mode === 'pdfs_to_pdf') return '.pdf';
    return '.png,.jpg,.jpeg,.webp';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Layers className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold text-indigo-400 font-mono">
            BATCH STUDIO (FAILURE-ISOLATED)
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          {t.batch.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {t.batch.subtitle}
        </p>
      </div>

      {/* Mode Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 no-scrollbar">
        <button
          onClick={() => {
            setMode('batch_compress');
            setResults([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            mode === 'batch_compress'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Minimize2 className="w-4 h-4" />
          <span>{t.batch.compressBatch}</span>
        </button>

        <button
          onClick={() => {
            setMode('batch_resize');
            setResults([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            mode === 'batch_resize'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Maximize2 className="w-4 h-4" />
          <span>{t.batch.resizeBatch}</span>
        </button>

        <button
          onClick={() => {
            setMode('batch_convert');
            setResults([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            mode === 'batch_convert'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{t.batch.convertBatch}</span>
        </button>

        <button
          onClick={() => {
            setMode('images_to_pdf');
            setResults([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            mode === 'images_to_pdf'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t.batch.imagesToSinglePdf}</span>
        </button>

        <button
          onClick={() => {
            setMode('pdfs_to_pdf');
            setResults([]);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            mode === 'pdfs_to_pdf'
              ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t.batch.pdfsToSinglePdf}</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Batch Settings & File Upload */}
        <div className="lg:col-span-5 space-y-5">
          {/* File Picker */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <input
              id="batchFileInput"
              type="file"
              multiple
              accept={getAcceptTypes()}
              className="hidden"
              onChange={handleFileInput}
            />

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                {t.batch.queueStatus}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {files.length} {language === 'bn' ? 'ফাইল' : 'files'}
              </span>
            </div>

            <label
              htmlFor="batchFileInput"
              className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
            >
              <Upload className="w-7 h-7 text-teal-400 mb-1.5" />
              <span className="text-xs font-semibold text-slate-200">
                {language === 'bn' ? 'একাধিক ফাইল যোগ করুন' : 'Add Multiple Files'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                {getAcceptTypes()}
              </span>
            </label>
          </div>

          {/* Mode Configuration Controls */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {language === 'bn' ? 'ব্যাচ কনফিগারেশন' : 'Batch Parameters'}
            </h3>

            {mode === 'batch_resize' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{language === 'bn' ? 'আকার হ্রাস/বৃদ্ধি' : 'Scale'}</span>
                  <span className="font-mono font-bold text-teal-300">{resizePercent}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setResizePercent(pct)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                        resizePercent === pct
                          ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'batch_compress' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{t.image.quality}</span>
                  <span className="font-mono font-bold text-teal-300">{compressQuality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={compressQuality}
                  onChange={(e) => setCompressQuality(parseInt(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>
            )}

            {mode === 'batch_convert' && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-medium block">
                  {language === 'bn' ? 'টার্গেট ফরম্যাট' : 'Target Format'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['image/webp', 'image/png', 'image/jpeg'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetImageFormat(fmt)}
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                        targetImageFormat === fmt
                          ? 'bg-teal-500 text-slate-950 border-teal-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {fmt.replace('image/', '').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(mode === 'images_to_pdf' || mode === 'pdfs_to_pdf') && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'bn'
                  ? 'সবগুলো ফাইল ক্রমানুসারে একটিমাত্র স্ট্যান্ডার্ড পিডিএফ ডকুমেন্টে একত্রিত হবে।'
                  : 'Files will be merged in order into one single consolidated PDF document.'}
              </p>
            )}

            {/* Execute Button */}
            <button
              type="button"
              disabled={isProcessing || files.length === 0}
              onClick={executeBatch}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {progress
                      ? `${progress.completed}/${progress.total} ${language === 'bn' ? 'প্রসেস হচ্ছে' : 'processed'}`
                      : language === 'bn'
                      ? 'প্রসেসিং চলছে...'
                      : 'Processing...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {language === 'bn'
                      ? `${files.length}টি ফাইলে ব্যাচ চালান`
                      : `Execute Batch on ${files.length} Files`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Failure Isolation Policy Notice */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              {language === 'bn' ? 'ব্যর্থতা বিচ্ছিন্নতা নিশ্চয়তা' : 'Failure Isolation Policy'}
            </span>
            <p className="leading-relaxed">
              {t.batch.isolationNotice}
            </p>
          </div>
        </div>

        {/* Right Column: File Queue & Results */}
        <div className="lg:col-span-7 space-y-5">
          {/* Consolidated Single PDF Result */}
          {consolidatedPdfUrl && (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'একত্রিত পিডিএফ প্রস্তুত!' : 'Merged PDF Ready!'}
                  </h4>
                  <p className="text-xs font-mono text-slate-300 mt-0.5">
                    {consolidatedPdfUrl.filename} • {formatFileSize(consolidatedPdfUrl.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  if (isDownloading || !consolidatedPdfUrl) return;
                  setIsDownloading(true);
                  try {
                    await downloadFileOnce(consolidatedPdfUrl.blob, consolidatedPdfUrl.filename);
                    showNotification(
                      language === 'bn' ? 'একত্রিত পিডিএফ ডাউনলোড সম্পন্ন হয়েছে' : 'Merged PDF downloaded successfully'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.common.download}</span>
              </button>
            </div>
          )}

          {/* Download All as ZIP Button if items were processed */}
          {zipUrl && (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300">
                  <FileArchive className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'ব্যাচ প্যাকেজ প্রস্তুত!' : 'Batch Package Ready!'}
                  </h4>
                  <p className="text-xs text-teal-200 mt-0.5">
                    {language === 'bn'
                      ? 'সকল সফল ফাইল একটি জিপে সংকলিত হয়েছে'
                      : 'All processed files packaged in a single ZIP'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  if (isDownloading || (!zipBlob && !zipUrl)) return;
                  setIsDownloading(true);
                  try {
                    await downloadFileOnce(zipBlob || zipUrl!, 'maishaa_workspace_batch.zip');
                    showNotification(
                      language === 'bn' ? 'ব্যাচ জিপ ডাউনলোড সম্পন্ন হয়েছে' : 'Batch ZIP downloaded successfully'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.batch.downloadAllZip}</span>
              </button>
            </div>
          )}


          {/* Queue & Status List */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {language === 'bn' ? 'ফাইলের সারি' : 'Files in Queue'}
              </h3>
              {files.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.batch.clearQueue}</span>
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {language === 'bn'
                  ? 'কোনো ফাইল যুক্ত করা হয়নি। বামপাশ থেকে ফাইল নির্বাচন করুন।'
                  : 'Queue is empty. Select files from the left to start.'}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {files.map((file, idx) => {
                  const itemResult = results.find((r) => r.originalFile === file);

                  return (
                    <div
                      key={`${file.name}_${idx}`}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 mr-3">
                        <p className="font-medium text-white truncate max-w-[220px] sm:max-w-xs">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {itemResult && (
                          <>
                            {itemResult.status === 'COMPLETED' ? (
                              <span className="flex items-center gap-1 text-[11px] text-teal-400 font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                {formatFileSize(itemResult.outputSize || 0)}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                {language === 'bn' ? 'ব্যর্থ' : 'Failed'}
                              </span>
                            )}

                            {itemResult.outputBlob && (
                              <button
                                type="button"
                                onClick={() => downloadFileOnce(itemResult.outputBlob!, itemResult.outputFilename || 'batch_output')}
                                className="p-1.5 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded cursor-pointer"
                                title="Download"
                              >

                                <Download className="w-4 h-4" />
                              </button>
                            )}

                          </>
                        )}

                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
