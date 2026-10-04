import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { convertImage } from '../../services/imageService';
import { imagesToPdf } from '../../services/pdfService';
import {
  convertDocxToPdf,
  convertPdfToDocx,
  convertXlsxToPdf,
  convertPdfToXlsx,
  convertPptxToPdf,
} from '../../services/conversionService';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  ArrowRightLeft,
  Upload,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react';

export const ConvertStudio: React.FC = () => {
  const {
    t,
    language,
    stagedFiles,
    addJob,
    updateJob,
    showNotification,
  } = useWorkspace();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeConversion, setActiveConversion] = useState<string>('docx_to_pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    filename: string;
    originalSize: number;
    newSize: number;
    desc?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Normalization options for TXT
  const [normalizeWhitespace, setNormalizeWhitespace] = useState(true);
  const [normalizeLinebreaks, setNormalizeLinebreaks] = useState(true);

  const officeTools = [
    {
      id: 'docx_to_pdf',
      name: 'DOCX → PDF',
      inputType: 'docx',
      accept: '.docx,.doc',
      desc: language === 'bn' ? 'মাইক্রোসফট ওয়ার্ড থেকে ইউনিকোড বাংলা পিডিএফ' : 'Word to PDF with embedded Bengali font',
      icon: FileText,
    },
    {
      id: 'pdf_to_docx',
      name: 'PDF → Word (DOCX)',
      inputType: 'pdf',
      accept: '.pdf',
      desc: language === 'bn' ? 'পিডিএফ থেকে এডিটেবল ডকএক্স ফাইল' : 'PDF to editable Word (OpenXML DOCX)',
      icon: FileText,
    },
    {
      id: 'xlsx_to_pdf',
      name: 'XLSX → PDF',
      inputType: 'xlsx',
      accept: '.xlsx,.xls',
      desc: language === 'bn' ? 'এক্সেল স্প্রেডশিট থেকে ল্যান্ডস্কেপ পিডিএফ রিপোর্ট' : 'Excel spreadsheet to formatted vector PDF',
      icon: FileSpreadsheet,
    },
    {
      id: 'pdf_to_xlsx',
      name: 'PDF → Excel',
      inputType: 'pdf',
      accept: '.pdf',
      desc: language === 'bn' ? 'পিডিএফ টেবিল ডেটা থেকে এক্সেল স্প্রেডশিট' : 'Tabular PDF data to Excel XLSX sheet',
      icon: FileSpreadsheet,
    },
    {
      id: 'pptx_to_pdf',
      name: 'PPTX → PDF',
      inputType: 'pptx',
      accept: '.pptx,.ppt',
      desc: language === 'bn' ? 'পাওয়ারপয়েন্ট স্লাইড ডেক থেকে পিডিএফ স্লাইডস' : 'PowerPoint presentation to PDF slides',
      icon: Presentation,
    },
  ];

  const imageTools = [
    { id: 'jpg_to_png', name: 'JPEG → PNG', inputType: 'image', targetFormat: 'image/png', accept: '.jpg,.jpeg' },
    { id: 'jpg_to_webp', name: 'JPEG → WebP', inputType: 'image', targetFormat: 'image/webp', accept: '.jpg,.jpeg' },
    { id: 'png_to_jpg', name: 'PNG → JPEG', inputType: 'image', targetFormat: 'image/jpeg', accept: '.png' },
    { id: 'png_to_webp', name: 'PNG → WebP', inputType: 'image', targetFormat: 'image/webp', accept: '.png' },
    { id: 'webp_to_jpg', name: 'WebP → JPEG', inputType: 'image', targetFormat: 'image/jpeg', accept: '.webp' },
    { id: 'webp_to_png', name: 'WebP → PNG', inputType: 'image', targetFormat: 'image/png', accept: '.webp' },
    { id: 'images_to_pdf', name: 'Images → PDF', inputType: 'image', targetFormat: 'pdf', accept: '.png,.jpg,.jpeg,.webp' },
    { id: 'txt_cleanup', name: 'TXT Cleanup', inputType: 'text', targetFormat: 'txt', accept: '.txt' },
  ];

  const allTools = [...officeTools, ...imageTools];

  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      const file = stagedFiles[0];
      setSelectedFile(file);
      // Auto select matching tool
      if (file.name.endsWith('.docx')) setActiveConversion('docx_to_pdf');
      else if (file.name.endsWith('.pdf')) setActiveConversion('pdf_to_docx');
      else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) setActiveConversion('xlsx_to_pdf');
      else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) setActiveConversion('pptx_to_pdf');
      else if (file.type.startsWith('image/')) setActiveConversion('images_to_pdf');
    }
  }, [stagedFiles]);

  const activeConfig = allTools.find((t) => t.id === activeConversion) || allTools[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
    }
  };

  const executeConversion = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);

    const jobId = addJob({
      toolType: `CONVERT: ${activeConfig.name}`,
      fileNames: [selectedFile.name],
      originalSize: selectedFile.size,
      status: 'PROCESSING',
    });

    try {
      let outBlob: Blob;
      let outName = '';
      let desc = '';

      if (activeConversion === 'docx_to_pdf') {
        const res = await convertDocxToPdf(selectedFile);
        outBlob = res.blob;
        outName = res.outputFilename;
        desc = res.formatDescription;
      } else if (activeConversion === 'pdf_to_docx') {
        const res = await convertPdfToDocx(selectedFile);
        outBlob = res.blob;
        outName = res.outputFilename;
        desc = res.formatDescription;
      } else if (activeConversion === 'xlsx_to_pdf') {
        const res = await convertXlsxToPdf(selectedFile);
        outBlob = res.blob;
        outName = res.outputFilename;
        desc = res.formatDescription;
      } else if (activeConversion === 'pdf_to_xlsx') {
        const res = await convertPdfToXlsx(selectedFile);
        outBlob = res.blob;
        outName = res.outputFilename;
        desc = res.formatDescription;
      } else if (activeConversion === 'pptx_to_pdf') {
        const res = await convertPptxToPdf(selectedFile);
        outBlob = res.blob;
        outName = res.outputFilename;
        desc = res.formatDescription;
      } else if (activeConversion === 'txt_cleanup') {
        const rawText = await selectedFile.text();
        let cleaned = rawText;
        if (cleaned.charCodeAt(0) === 0xfeff) cleaned = cleaned.slice(1);
        if (normalizeLinebreaks) cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (normalizeWhitespace) {
          cleaned = cleaned
            .split('\n')
            .map((line) => line.trimEnd())
            .join('\n');
        }
        outBlob = new Blob([cleaned], { type: 'text/plain;charset=utf-8' });
        outName = generateSafeOutputFilename(selectedFile.name, 'cleaned', 'txt');
        desc = 'Normalized Text File';
      } else if (activeConversion === 'images_to_pdf') {
        const res = await imagesToPdf([selectedFile]);
        outBlob = res.blob;
        outName = generateSafeOutputFilename(selectedFile.name, 'document', 'pdf');
        desc = 'Images to PDF Document';
      } else {
        const targetFormat = (activeConfig as any)?.targetFormat as 'image/jpeg' | 'image/png' | 'image/webp';
        const res = await convertImage(selectedFile, targetFormat || 'image/png', 0.92);
        outBlob = res.blob;
        const ext = targetFormat === 'image/webp' ? 'webp' : targetFormat === 'image/png' ? 'png' : 'jpg';
        outName = generateSafeOutputFilename(selectedFile.name, 'converted', ext);
        desc = `Converted ${ext.toUpperCase()} Image`;
      }

      const downloadUrl = createManagedObjectUrl(outBlob);
      setResult({
        blob: outBlob,
        url: downloadUrl,
        filename: outName,
        originalSize: selectedFile.size,
        newSize: outBlob.size,
        desc,
      });


      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: outBlob.size,
        outputUrl: downloadUrl,
        outputFilename: outName,
        notes: desc,
      });

      showNotification(
        language === 'bn'
          ? 'কনভার্সন সফলভাবে সম্পন্ন হয়েছে!'
          : 'File converted successfully!'
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Conversion failed';
      setErrorMsg(msg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ArrowRightLeft className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            CONVERT STUDIO (REAL CLIENT-SIDE ENGINE)
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          {t.convert.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {language === 'bn'
            ? 'মাইক্রোসফট অফিস (Word, Excel, PowerPoint), পিডিএফ এবং ইমেজ ফরম্যাট ১০০% ব্রাউজার-নির্ভর ও বিশ্বস্তভাবে রূপান্তর করুন।'
            : 'Convert Microsoft Office (DOCX, XLSX, PPTX), PDF, and image formats reliably and privately in your browser.'}
        </p>
      </div>

      {/* Section 1: Office & Document Conversions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>{language === 'bn' ? 'অফিস ও ডকুমেন্ট কনভার্সন' : 'Office & Document Conversions'}</span>
          </h3>
          <span className="text-xs text-teal-400 font-mono px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
            Active & Working
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {officeTools.map((tool) => {
            const isSelected = activeConversion === tool.id;
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveConversion(tool.id);
                  setResult(null);
                  setErrorMsg(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md shadow-teal-500/10'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-teal-400'}`} />
                    <span className="text-xs font-mono font-bold tracking-tight">
                      {tool.name}
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-950" />}
                </div>
                <span
                  className={`text-[10px] leading-tight line-clamp-2 ${
                    isSelected ? 'text-slate-900 font-medium' : 'text-slate-400'
                  }`}
                >
                  {tool.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Image & Text Conversions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{language === 'bn' ? 'ছবি ও টেক্সট ফরম্যাট রূপান্তর' : 'Image & Text Formats'}</span>
          </h3>
          <span className="text-xs text-emerald-400 font-mono">Instant Canvas Engine</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {imageTools.map((tool) => {
            const isSelected = activeConversion === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveConversion(tool.id);
                  setResult(null);
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                    : 'bg-slate-900/40 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-mono font-medium">
                  {tool.name}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-950" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Converter Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File selection & controls */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <input
              id="convertFileInput"
              type="file"
              accept={activeConfig.accept || '*/*'}
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-300">
                {language === 'bn' ? 'রূপান্তরের ফাইল নির্বাচন' : 'File Selection'}
              </h4>
              <span className="text-xs text-teal-400 font-mono font-semibold">
                {activeConfig.name}
              </span>
            </div>

            {!selectedFile ? (
              <label
                htmlFor="convertFileInput"
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-teal-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200 text-center">
                  {language === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Click to select file'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supported: {activeConfig.accept || '*.*'}
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
                  htmlFor="convertFileInput"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium cursor-pointer"
                >
                  {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                </label>
              </div>
            )}

            {/* Normalization Toggles for TXT */}
            {activeConversion === 'txt_cleanup' && selectedFile && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizeWhitespace}
                    onChange={(e) => setNormalizeWhitespace(e.target.checked)}
                    className="accent-teal-400"
                  />
                  <span>
                    {language === 'bn'
                      ? 'অতিরিক্ত স্পেস ও ট্রেইলিং স্পেস পরিচ্ছন্ন করুন'
                      : 'Trim trailing whitespace'}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={normalizeLinebreaks}
                    onChange={(e) => setNormalizeLinebreaks(e.target.checked)}
                    className="accent-teal-400"
                  />
                  <span>
                    {language === 'bn'
                      ? 'লাইন এন্ডিং স্ট্যান্ডার্ডাইজ (LF) করুন'
                      : 'Standardize line endings (CRLF → LF)'}
                  </span>
                </label>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isProcessing || !selectedFile}
              onClick={executeConversion}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'রূপান্তর হচ্ছে...' : 'Converting...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {language === 'bn' ? 'এখনই কনভার্ট করুন' : 'Convert File Now'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output Card */}
        <div className="lg:col-span-6 space-y-4">
          {result ? (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'কনভার্সন সম্পন্ন হয়েছে!' : 'File Ready for Download!'}
                  </h4>
                  {result.desc && (
                    <p className="text-[11px] text-teal-300 font-mono mt-0.5">{result.desc}</p>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>{language === 'bn' ? 'আসল সাইজ:' : 'Original Size:'}</span>
                  <span>{formatFileSize(result.originalSize)}</span>
                </div>
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-800 pt-1.5">
                  <span>{language === 'bn' ? 'নতুন সাইজ:' : 'New Size:'}</span>
                  <span>{formatFileSize(result.newSize)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isDownloading}
                onClick={async () => {
                  if (isDownloading || !result) return;
                  setIsDownloading(true);
                  try {
                    await downloadFileOnce(result.blob, result.filename);
                    showNotification(
                      language === 'bn' ? 'ফাইল ডাউনলোড সম্পন্ন হয়েছে' : 'File downloaded successfully'
                    );
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.common.download} ({result.filename})</span>
              </button>

            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                {language === 'bn' ? 'শতভাগ বিশ্বস্ত রূপান্তর' : 'Honest Conversion Standard'}
              </span>
              <p className="leading-relaxed">
                {language === 'bn'
                  ? 'সব রূপান্তর ১০০% ব্রাউজার মেমোরির ভেতরে সম্পন্ন হয়। কোনো ফাইল বাইরের সার্ভারে পাঠানো হয় না। ইউনিকোড বাংলা ফন্ট স্বয়ংক্রিয়ভাবে এম্বেড করা হয়।'
                  : 'All conversions run client-side inside memory without uploading files. Unicode Bengali typography is fully preserved.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
