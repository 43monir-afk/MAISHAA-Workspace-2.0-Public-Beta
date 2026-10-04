import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  parseDocxDocument,
  analyzePlainText,
  createTextDocxBlob,
  DocumentAnalysisResult,
} from '../../services/docIntelService';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import {
  FileText,
  Upload,
  Sparkles,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Hash,
  List,
  Check,
} from 'lucide-react';

import { downloadFileOnce } from '../../utils/downloadHelper';

export const DocumentIntelStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
    openAiAssistantWithContext,
  } = useWorkspace();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      const doc = stagedFiles.find(
        (f) =>
          f.name.endsWith('.docx') ||
          f.name.endsWith('.txt') ||
          f.type.includes('word') ||
          f.type.includes('text')
      );
      if (doc) loadDocument(doc);
    }
  }, [stagedFiles]);

  const loadDocument = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setAnalysis(null);

    const jobId = addJob({
      toolType: 'DOC INTEL',
      fileNames: [file.name],
      originalSize: file.size,
      status: 'PROCESSING',
    });

    try {
      let res: DocumentAnalysisResult;
      if (file.name.toLowerCase().endsWith('.docx')) {
        res = await parseDocxDocument(file);
      } else {
        const text = await file.text();
        res = analyzePlainText(text, file.name, file.size);
      }

      setAnalysis(res);
      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: res.charCount,
        notes: `Words: ${res.wordCount} | Reading time: ~${res.readingTimeMinutes} min`,
      });

      showNotification(
        language === 'bn'
          ? `ডকুমেন্ট বিশ্লেষণ সম্পন্ন: ${res.wordCount}টি শব্দ`
          : `Document analyzed: ${res.wordCount} words`
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to read document';
      setErrorMessage(msg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    showNotification(language === 'bn' ? 'টেক্সট কপি হয়েছে' : 'Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const exportTxt = async () => {
    if (!analysis || isDownloading) return;
    try {
      setIsDownloading(true);
      const blob = new Blob([analysis.extractedText], { type: 'text/plain;charset=utf-8' });
      const filename = generateSafeOutputFilename(analysis.fileName, 'extracted', 'txt');
      await downloadFileOnce(blob, filename);
    } finally {
      setIsDownloading(false);
    }
  };

  const exportBasicDocx = async () => {
    if (!analysis || isDownloading) return;
    try {
      setIsDownloading(true);
      const blob = await createTextDocxBlob(analysis.extractedText, analysis.fileName);
      const filename = generateSafeOutputFilename(analysis.fileName, 'text_only', 'docx');
      await downloadFileOnce(blob, filename);
      showNotification(language === 'bn' ? 'বেসিক DOCX ডাউনলোড সম্পন্ন' : 'Basic DOCX downloaded');
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <FileText className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-teal-400 font-mono">
              DOCUMENT INTELLIGENCE STUDIO (DOCX / TXT)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t.docIntel.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {t.docIntel.subtitle}
          </p>
        </div>

        <PrivacyIndicator mode="LOCAL" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Loader & Metrics */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <input
              id="docIntelFileInput"
              type="file"
              accept=".docx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  loadDocument(e.target.files[0]);
                }
              }}
            />

            {!selectedFile ? (
              <label
                htmlFor="docIntelFileInput"
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-teal-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {language === 'bn'
                    ? 'ওয়ার্ড বা টেক্সট ফাইল নির্বাচন করুন (DOCX, TXT)'
                    : 'Select Word or Text Document (DOCX, TXT)'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Client-safe OpenXML parser
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/50">
                <div className="min-w-0">
                  <p className="font-semibold text-white text-xs truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <label
                  htmlFor="docIntelFileInput"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium cursor-pointer"
                >
                  {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                </label>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                <span>{language === 'bn' ? 'ডকুমেন্ট পার্সিং হচ্ছে...' : 'Parsing document structure...'}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Metrics & Statistics */}
          {analysis && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {t.docIntel.metrics}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    openAiAssistantWithContext(
                      analysis.extractedText,
                      analysis.fileName
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask MAISHAA</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">{t.docIntel.words}</span>
                  <span className="text-base font-bold text-teal-300 font-mono">
                    {analysis.wordCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">{t.docIntel.chars}</span>
                  <span className="text-base font-bold text-white font-mono">
                    {analysis.charCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">মোট লাইন / প্যারা</span>
                  <span className="text-base font-bold text-slate-300 font-mono">
                    {analysis.lineCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">{t.docIntel.readingTime}</span>
                  <span className="text-base font-bold text-amber-300 font-mono">
                    ~{analysis.readingTimeMinutes} min
                  </span>
                </div>
              </div>

              {/* Document Outline / Headings */}
              {analysis.outline && analysis.outline.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {t.docIntel.outline}
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-xs">
                    {analysis.outline.map((item, idx) => (
                      <div
                        key={idx}
                        className={`truncate py-1 px-2 rounded hover:bg-slate-800 text-slate-300 ${
                          item.level === 1 ? 'font-bold text-teal-300' : 'pl-4 text-slate-400'
                        }`}
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exports */}
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={exportTxt}
                  disabled={isDownloading}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.docIntel.downloadTxt}</span>
                </button>

                <button
                  type="button"
                  onClick={exportBasicDocx}
                  disabled={isDownloading}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.docIntel.exportDocx}</span>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Right Column: Full Text Viewer */}
        <div className="lg:col-span-7 space-y-5">
          {analysis ? (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-slate-900/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'আহরিত টেক্সট ভিউ' : 'Extracted Text View'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(analysis.extractedText)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-teal-400" />
                  <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
                </button>
              </div>

              <textarea
                readOnly
                value={analysis.extractedText}
                className="w-full h-96 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-hidden resize-y"
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">
                {language === 'bn' ? 'ডকুমেন্ট লোড করুন' : 'Load Document'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'ওয়ার্ড বা টেক্সট ফাইল লোড করলে স্বয়ংক্রিয়ভাবে তার শব্দসংখ্যা, রূপরেখা ও অনুচ্ছেদ টেক্সট প্রদর্শিত হবে।'
                  : 'Word or TXT documents will be parsed client-side with full outline and metrics.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
