import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  mergePdfs,
  splitPdf,
  extractPages,
  deletePages,
  rotatePages,
  imagesToPdf,
  optimizePdf,
  getPdfMetadata,
  PdfMetadata,
} from '../../services/pdfService';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';
import { AdSlot } from '../common/AdSlot';
import {
  FileText,
  Upload,
  Split,
  Combine,
  Scissors,
  Trash2,
  RotateCw,
  Image as ImageIcon,
  Minimize2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

type PdfSubTab =
  | 'merge'
  | 'split'
  | 'extract'
  | 'delete'
  | 'rotate'
  | 'imagesToPdf'
  | 'compress'
  | 'metadata';

export const PdfStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
  } = useWorkspace();

  const [activeSubTab, setActiveSubTab] = useState<PdfSubTab>('merge');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Operation specific parameters
  const [pageRange, setPageRange] = useState<string>('1-2');
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [rotateScope, setRotateScope] = useState<'all' | 'custom'>('all');
  const [rotatePagesInput, setRotatePagesInput] = useState<string>('1');

  // Metadata inspect state
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  // Result state
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    blob: Blob;
    downloadUrl: string;
    filename: string;
    originalSize: number;
    newSize: number;
    reductionPercentage?: number;
    meaningfulReduction?: boolean;
    pageCount: number;
  } | null>(null);


  // Initialize with staged files if available
  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      if (activeSubTab === 'imagesToPdf') {
        const images = stagedFiles.filter((f) => f.type.startsWith('image/'));
        if (images.length > 0) setSelectedFiles(images);
      } else {
        const pdfs = stagedFiles.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
        if (pdfs.length > 0) setSelectedFiles(pdfs);
      }
    }
  }, [stagedFiles, activeSubTab]);

  // Handle metadata inspection when file is selected in metadata subtab
  useEffect(() => {
    if (activeSubTab === 'metadata' && selectedFiles.length > 0 && selectedFiles[0].name.toLowerCase().endsWith('.pdf')) {
      loadMetadata(selectedFiles[0]);
    }
  }, [activeSubTab, selectedFiles]);

  const loadMetadata = async (file: File) => {
    setIsLoadingMetadata(true);
    setProcessingError(null);
    try {
      const data = await getPdfMetadata(file);
      setMetadata(data);
    } catch (err: any) {
      setProcessingError(err.message || 'Failed to read PDF metadata');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (activeSubTab === 'merge' || activeSubTab === 'imagesToPdf') {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    } else {
      setSelectedFiles(newFiles.slice(0, 1));
    }
    setLastResult(null);
    setProcessingError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFileOrder = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= selectedFiles.length) return;
    const updated = [...selectedFiles];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setSelectedFiles(updated);
  };

  const executePdfAction = async () => {
    if (selectedFiles.length === 0) {
      setProcessingError(
        language === 'bn'
          ? 'অনুগ্রহ করে ফাইল নির্বাচন করুন'
          : 'Please select a file first'
      );
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setLastResult(null);

    const totalOriginalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const filenames = selectedFiles.map((f) => f.name);

    // Register job in tracker
    const jobId = addJob({
      toolType: `PDF: ${activeSubTab.toUpperCase()}`,
      fileNames: filenames,
      originalSize: totalOriginalSize,
      status: 'PROCESSING',
    });

    try {
      let result;
      let outName = '';

      switch (activeSubTab) {
        case 'merge': {
          result = await mergePdfs(selectedFiles);
          outName = generateSafeOutputFilename('merged', 'merged_document', 'pdf');
          break;
        }

        case 'split': {
          result = await splitPdf(selectedFiles[0], pageRange);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `split_pages_${pageRange.replace(/[^0-9-]/g, '_')}`,
            'pdf'
          );
          break;
        }

        case 'extract': {
          const pages = pageRange
            .split(/[,;\s]+/)
            .map((p) => parseInt(p, 10))
            .filter((p) => !isNaN(p));
          result = await extractPages(selectedFiles[0], pages);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `extracted_p${pages.join('_')}`,
            'pdf'
          );
          break;
        }

        case 'delete': {
          const pagesToDelete = pageRange
            .split(/[,;\s]+/)
            .map((p) => parseInt(p, 10))
            .filter((p) => !isNaN(p));
          result = await deletePages(selectedFiles[0], pagesToDelete);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'pages_removed',
            'pdf'
          );
          break;
        }

        case 'rotate': {
          const pages =
            rotateScope === 'custom'
              ? rotatePagesInput
                  .split(/[,;\s]+/)
                  .map((p) => parseInt(p, 10))
                  .filter((p) => !isNaN(p))
              : undefined;

          result = await rotatePages(selectedFiles[0], rotateAngle, pages);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            `rotated_${rotateAngle}deg`,
            'pdf'
          );
          break;
        }

        case 'imagesToPdf': {
          result = await imagesToPdf(selectedFiles);
          outName = generateSafeOutputFilename(
            'images',
            'compiled_presentation',
            'pdf'
          );
          break;
        }

        case 'compress': {
          result = await optimizePdf(selectedFiles[0]);
          outName = generateSafeOutputFilename(
            selectedFiles[0].name,
            'optimized',
            'pdf'
          );
          break;
        }

        default:
          throw new Error('Unsupported action');
      }

      const downloadUrl = createManagedObjectUrl(result.blob);

      setLastResult({
        blob: result.blob,
        downloadUrl,
        filename: outName,
        originalSize: result.originalSize,
        newSize: result.newSize,
        reductionPercentage: result.reductionPercentage,
        meaningfulReduction: result.meaningfulReduction,
        pageCount: result.pageCount,
      });


      // Update job tracker
      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: result.newSize,
        outputUrl: downloadUrl,
        outputFilename: outName,
        reductionPercentage: result.reductionPercentage,
        notes:
          activeSubTab === 'compress' && !result.meaningfulReduction
            ? language === 'bn'
              ? t.pdf.noReductionNote
              : 'File was already optimal. Output kept pristine.'
            : undefined,
      });

      showNotification(
        language === 'bn'
          ? 'পিডিএফ প্রসেসিং সফলভাবে সম্পন্ন হয়েছে!'
          : 'PDF processed successfully!'
      );
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Operation failed';
      setProcessingError(errMsg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: errMsg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const navTabs = [
    { id: 'merge', label: t.pdf.merge, icon: Combine },
    { id: 'split', label: t.pdf.split, icon: Split },
    { id: 'extract', label: t.pdf.extract, icon: Scissors },
    { id: 'delete', label: t.pdf.deletePages, icon: Trash2 },
    { id: 'rotate', label: t.pdf.rotate, icon: RotateCw },
    { id: 'imagesToPdf', label: t.pdf.imagesToPdf, icon: ImageIcon },
    { id: 'compress', label: t.pdf.compress, icon: Minimize2 },
    { id: 'metadata', label: t.pdf.metadata, icon: Info },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Studio Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <FileText className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold text-rose-400 font-mono">
            PDF STUDIO (CLIENT-SIDE)
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          {t.pdf.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {t.pdf.subtitle}
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 no-scrollbar">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as PdfSubTab);
                setProcessingError(null);
                setLastResult(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Staging & Configuration */}
        <div className="lg:col-span-7 space-y-5">
          {/* File Picker / Drop Zone */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                {activeSubTab === 'imagesToPdf'
                  ? language === 'bn'
                    ? 'ছবি ফাইলসমূহ'
                    : 'Selected Images'
                  : language === 'bn'
                  ? 'পিডিএফ ফাইলসমূহ'
                  : 'Selected PDF File(s)'}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {selectedFiles.length}{' '}
                {language === 'bn' ? 'টি নির্বাচিত' : 'selected'}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              id="pdfStudioFileInput"
              type="file"
              multiple={activeSubTab === 'merge' || activeSubTab === 'imagesToPdf'}
              accept={activeSubTab === 'imagesToPdf' ? '.png,.jpg,.jpeg,.webp' : '.pdf'}
              className="hidden"
              onChange={handleFileSelect}
            />

            {selectedFiles.length === 0 ? (
              <label
                htmlFor="pdfStudioFileInput"
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-teal-400/80 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {activeSubTab === 'imagesToPdf'
                    ? language === 'bn'
                      ? 'ছবি নির্বাচন করতে ক্লিক করুন'
                      : 'Click to select image files'
                    : language === 'bn'
                    ? 'পিডিএফ নির্বাচন করতে ক্লিক করুন'
                    : 'Click to select PDF document'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'বা ফাইল ড্র্যাগ করে ছেড়ে দিন'
                    : 'or drag and drop here'}
                </span>
              </label>
            ) : (
              <div className="space-y-2">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}_${idx}`}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-800/50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 font-mono flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Order buttons if multiple */}
                        {(activeSubTab === 'merge' || activeSubTab === 'imagesToPdf') && (
                          <div className="flex items-center mr-2">
                            <button
                              onClick={() => moveFileOrder(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveFileOrder(idx, idx + 1)}
                              disabled={idx === selectedFiles.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more files button */}
                {(activeSubTab === 'merge' || activeSubTab === 'imagesToPdf') && (
                  <label
                    htmlFor="pdfStudioFileInput"
                    className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer pt-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.pdf.addFiles}</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Operation Specific Controls */}
          {selectedFiles.length > 0 && activeSubTab !== 'metadata' && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                {language === 'bn' ? 'অ্যাকশন কনফিগারেশন' : 'Action Settings'}
              </h3>

              {/* Split / Extract / Delete Page Range Input */}
              {(activeSubTab === 'split' ||
                activeSubTab === 'extract' ||
                activeSubTab === 'delete') && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    {t.pdf.pageRange}
                  </label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    {activeSubTab === 'split' &&
                      (language === 'bn'
                        ? 'রেঞ্জ অনুযায়ী ফাইলটি নতুন পিডিএফে পৃথক হবে।'
                        : 'Specified pages will form the new output PDF.')}
                    {activeSubTab === 'extract' &&
                      (language === 'bn'
                        ? 'শুধু উল্লেখিত পৃষ্ঠাগুলো রেখে নতুন পিডিএফ তৈরি হবে।'
                        : 'Only specified pages will be extracted.')}
                    {activeSubTab === 'delete' &&
                      (language === 'bn'
                        ? 'উল্লেখিত পৃষ্ঠাগুলো বাদ দিয়ে নতুন পিডিএফ তৈরি হবে।'
                        : 'Specified pages will be removed from the document.')}
                  </p>
                </div>
              )}

              {/* Rotation Options */}
              {activeSubTab === 'rotate' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {t.pdf.rotateAngle}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([90, 180, 270] as const).map((angle) => (
                        <button
                          key={angle}
                          type="button"
                          onClick={() => setRotateAngle(angle)}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                            rotateAngle === angle
                              ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          +{angle}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      {language === 'bn' ? 'ঘোরানোর পরিধি' : 'Scope'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRotateScope('all')}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          rotateScope === 'all'
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {language === 'bn' ? 'সব পৃষ্ঠা' : 'All Pages'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotateScope('custom')}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          rotateScope === 'custom'
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {language === 'bn' ? 'নির্দিষ্ট পৃষ্ঠা' : 'Specific Pages'}
                      </button>
                    </div>

                    {rotateScope === 'custom' && (
                      <input
                        type="text"
                        value={rotatePagesInput}
                        onChange={(e) => setRotatePagesInput(e.target.value)}
                        placeholder="e.g. 1, 3"
                        className="mt-2 w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:border-teal-400"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Compression Note */}
              {activeSubTab === 'compress' && (
                <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-xs text-teal-300 space-y-1">
                  <span className="font-semibold block text-teal-200">
                    {language === 'bn'
                      ? 'সততা নিশ্চয়তা (Honest Compression)'
                      : 'Compression Honesty Guarantee'}
                  </span>
                  <p className="text-teal-300/80 leading-relaxed">
                    {language === 'bn'
                      ? 'অপ্রয়োজনীয় অবজেক্ট স্ট্রিম অপ্টিমাইজেশন করা হবে। যদি কোনো ফাইল আগে থেকেই অপ্টিমাইজ করা থাকে, তবে কৃত্রিম কম্প্রেশন ভান না করে তা সরাসরি জানিয়ে দেওয়া হবে।'
                      : 'Object stream compression strips redundant metadata. If the file is already optimal, we report real figures instead of pretending reduction.'}
                  </p>
                </div>
              )}

              {/* Error display */}
              {processingError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{processingError}</span>
                </div>
              )}

              {/* Execute Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={executePdfAction}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.pdf.processing}</span>
                  </>
                ) : (
                  <>
                    <span>{t.pdf.processBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Results & Metadata Inspector */}
        <div className="lg:col-span-5 space-y-5">
          {/* Metadata Display Tab */}
          {activeSubTab === 'metadata' && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-400" />
                {t.pdf.metadata}
              </h3>

              {isLoadingMetadata && (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-400 mb-2" />
                  <span>Loading metadata...</span>
                </div>
              )}

              {!isLoadingMetadata && metadata && (
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'মোট পৃষ্ঠা:' : 'Page Count:'}
                    </span>
                    <span className="text-teal-300 font-bold font-sans">
                      {metadata.pageCount}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'ফাইলের আকার:' : 'File Size:'}
                    </span>
                    <span className="text-white">
                      {formatFileSize(metadata.fileSize)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'শিরোনাম (Title):' : 'Title:'}
                    </span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {metadata.title || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'লেখক (Author):' : 'Author:'}
                    </span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {metadata.author || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'প্রডিউসার (Producer):' : 'Producer:'}
                    </span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {metadata.producer || '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 flex justify-between">
                    <span className="text-slate-400 font-sans">
                      {language === 'bn' ? 'তৈরির তারিখ:' : 'Created:'}
                    </span>
                    <span className="text-slate-300">
                      {metadata.creationDate
                        ? metadata.creationDate.toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              )}

              {!isLoadingMetadata && !metadata && selectedFiles.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">
                  {language === 'bn'
                    ? 'মেটাডাটা দেখতে বামপাশে একটি পিডিএফ নির্বাচন করুন'
                    : 'Select a PDF on the left to view its properties'}
                </p>
              )}
            </div>
          )}

          {/* Results Card */}
          {lastResult && (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn'
                      ? 'ফলাফল প্রস্তুত!'
                      : 'Output Document Ready!'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-teal-400">
                  {lastResult.pageCount}{' '}
                  {language === 'bn' ? 'পৃষ্ঠা' : 'pages'}
                </span>
              </div>

              {/* Size metrics */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>{t.pdf.originalSize}:</span>
                  <span>{formatFileSize(lastResult.originalSize)}</span>
                </div>
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-800 pt-1.5">
                  <span>{t.pdf.newSize}:</span>
                  <span>{formatFileSize(lastResult.newSize)}</span>
                </div>

                {lastResult.reductionPercentage !== undefined && (
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-400">{t.pdf.reduction}:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        lastResult.reductionPercentage > 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {lastResult.reductionPercentage > 0
                        ? `-${lastResult.reductionPercentage}%`
                        : '0%'}
                    </span>
                  </div>
                )}
              </div>

              {/* Compression honesty note */}
              {activeSubTab === 'compress' && !lastResult.meaningfulReduction && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  {t.pdf.noReductionNote}
                </div>
              )}

              {/* Download Action */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  if (isDownloading || !lastResult) return;
                  setIsDownloading(true);
                  try {
                    await downloadFileOnce(lastResult.blob, lastResult.filename);
                    showNotification(
                      language === 'bn' ? 'পিডিএফ ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded successfully'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.common.download} ({lastResult.filename})</span>
              </button>

            </div>
          )}

          {/* Zero-Fake Policy Banner */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              {language === 'bn' ? 'সততা ও গোপনীয়তা প্রতিশ্রুতি' : 'Integrity & Privacy Guarantee'}
            </span>
            <p className="leading-relaxed">
              {t.pdf.noFakeOcrNote}
            </p>
          </div>

          {/* Tool Result Bottom Ad Slot (After Result Section) */}
          <AdSlot placement="tool-result-bottom" />
        </div>
      </div>
    </div>
  );
};
