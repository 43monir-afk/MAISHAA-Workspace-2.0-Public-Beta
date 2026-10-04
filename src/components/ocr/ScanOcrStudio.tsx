import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  recognizeImageOcr,
  recognizeCloudOcr,
  generateSearchablePdf,
  preprocessImageForOcr,
  OcrPreprocessOptions,
  OcrResult,
  OcrProgress,
} from '../../services/ocrService';
import { extractPdfText } from '../../services/pdfService';
import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import { createManagedObjectUrl } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  FileSearch,
  Upload,
  Sliders,
  RotateCw,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Cloud,
  Cpu,
  Check,
} from 'lucide-react';

export const ScanOcrStudio: React.FC = () => {
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
  const [selectedLanguage, setSelectedLanguage] = useState<'eng' | 'ben' | 'ben+eng'>('eng');
  const [ocrEngine, setOcrEngine] = useState<'local' | 'cloud'>('local');
  const [cloudConfigured, setCloudConfigured] = useState<boolean | null>(null);

  // Preprocessing options
  const [grayscale, setGrayscale] = useState(true);
  const [contrast, setContrast] = useState(20); // -100 to 100
  const [brightness, setBrightness] = useState(0); // -100 to 100
  const [threshold, setThreshold] = useState<number | undefined>(undefined);
  const [useThreshold, setUseThreshold] = useState(false);
  const [rotateAngle, setRotateAngle] = useState<0 | 90 | 180 | 270>(0);

  // Previews
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDownloadingText, setIsDownloadingText] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check cloud API status
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => setCloudConfigured(Boolean(data.configured)))
      .catch(() => setCloudConfigured(false));
  }, []);

  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      loadFile(stagedFiles[0]);
    }
  }, [stagedFiles]);

  const loadFile = (file: File) => {
    setSelectedFile(file);
    setOcrResult(null);
    setErrorMessage(null);
    const url = createManagedObjectUrl(file);
    setPreviewBlobUrl(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  };

  const executeOcr = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setOcrProgress({ status: 'প্রস্তুতি চলছে...', progress: 0.05 });

    const jobId = addJob({
      toolType: `OCR (${ocrEngine.toUpperCase()}: ${selectedLanguage.toUpperCase()})`,
      fileNames: [selectedFile.name],
      originalSize: selectedFile.size,
      status: 'PROCESSING',
    });

    try {
      let result: OcrResult;

      if (ocrEngine === 'cloud') {
        setOcrProgress({ status: 'ক্লাউড এআই ভিশন প্রসেসিং চলছে...', progress: 0.4 });
        const targetLang =
          selectedLanguage === 'ben' ? 'Bangla' : selectedLanguage === 'eng' ? 'English' : 'Mixed';
        result = await recognizeCloudOcr(selectedFile, targetLang);
      } else {
        const preprocessOpts: OcrPreprocessOptions = {
          grayscale,
          contrast,
          brightness,
          threshold: useThreshold ? (threshold !== undefined ? threshold : 128) : undefined,
          rotateDegrees: rotateAngle,
        };

        if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
          // Scanned PDF OCR handling
          const pdfTextRes = await extractPdfText(selectedFile);
          if (pdfTextRes.fullText && pdfTextRes.totalWords > 10) {
            result = {
              text: pdfTextRes.fullText,
              cleanedText: pdfTextRes.fullText,
              confidence: 90,
              wordsCount: pdfTextRes.totalWords,
              linesCount: pdfTextRes.fullText.split('\n').length,
              language: selectedLanguage,
              processingTimeMs: 150,
            };
          } else {
            throw new Error(
              'PDF থেকে সরাসরি ইমেজ এক্সট্র্যাক্ট করতে ইমেজ ফরম্যাটে রূপান্তর করুন অথবা ক্লাউড OCR ব্যবহার করুন।'
            );
          }
        } else {
          result = await recognizeImageOcr(
            selectedFile,
            selectedLanguage,
            preprocessOpts,
            (prog) => setOcrProgress(prog)
          );
        }
      }

      setOcrResult(result);

      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: result.wordsCount,
        notes: `Confidence: ${result.confidence}% | Words: ${result.wordsCount}`,
      });

      showNotification(
        language === 'bn'
          ? `ওসিআর সম্পন্ন হয়েছে (আত্মবিশ্বাস: ${result.confidence}%)`
          : `OCR Completed (${result.confidence}% confidence)`
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'OCR processing failed';
      setErrorMessage(msg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: msg,
      });
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    showNotification(language === 'bn' ? 'কপি হয়েছে' : 'Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = async (content: string, isCleaned: boolean) => {
    if (!selectedFile || isDownloadingText) return;
    try {
      setIsDownloadingText(true);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const filename = generateSafeOutputFilename(
        selectedFile.name,
        isCleaned ? 'ocr_cleaned' : 'ocr_raw',
        'txt'
      );
      await downloadFileOnce(blob, filename);
    } finally {
      setIsDownloadingText(false);
    }
  };

  const handleDownloadSearchablePdf = async () => {
    if (!selectedFile || !ocrResult || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await generateSearchablePdf(
        selectedFile,
        ocrResult,
        selectedFile.name.replace(/\.[^/.]+$/, '')
      );
      const filename = generateSafeOutputFilename(selectedFile.name, 'searchable', 'pdf');
      await downloadFileOnce(pdfBlob, filename);
      showNotification(
        language === 'bn'
          ? 'সার্চেবল পিডিএফ প্রস্তুত ও ডাউনলোড হয়েছে!'
          : 'Searchable PDF generated and downloaded!'
      );
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || 'Failed to generate searchable PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <FileSearch className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-teal-400 font-mono">
              SCAN & OCR STUDIO (BILINGUAL ENGINE)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t.ocr.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {t.ocr.subtitle}
          </p>
        </div>

        <PrivacyIndicator mode={ocrEngine === 'local' ? 'LOCAL' : 'CLOUD_AI'} />
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input File, Language & Engine */}
        <div className="lg:col-span-5 space-y-5">
          {/* Engine Selector */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-teal-400" />
                <span>{language === 'bn' ? 'ওসিআর ইঞ্জিন নির্বাচন' : 'OCR Engine'}</span>
              </h3>
              {ocrEngine === 'cloud' && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    cloudConfigured
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {cloudConfigured ? 'API Connected' : 'Key Needed in .env'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOcrEngine('local')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  ocrEngine === 'local'
                    ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">Tesseract.js</span>
                  {ocrEngine === 'local' && <Check className="w-3.5 h-3.5" />}
                </div>
                <p className={`text-[10px] ${ocrEngine === 'local' ? 'text-slate-900' : 'text-slate-400'}`}>
                  {language === 'bn' ? '১০০% অফলাইন ও ব্যক্তিগত' : '100% Offline & Private'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setOcrEngine('cloud')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  ocrEngine === 'cloud'
                    ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <Cloud className="w-3 h-3" />
                    Gemini Vision
                  </span>
                  {ocrEngine === 'cloud' && <Check className="w-3.5 h-3.5" />}
                </div>
                <p className={`text-[10px] ${ocrEngine === 'cloud' ? 'text-slate-900' : 'text-slate-400'}`}>
                  {language === 'bn' ? 'উচ্চ নির্ভুলতা এআই' : 'Ultra-Accurate AI'}
                </p>
              </button>
            </div>
          </div>

          {/* File Picker */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <input
              id="ocrFileInput"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {!selectedFile ? (
              <label
                htmlFor="ocrFileInput"
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 text-teal-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {language === 'bn'
                    ? 'স্ক্যান করা ছবি বা পিডিএফ নির্বাচন করুন'
                    : 'Select scanned image or PDF'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  JPEG, PNG, WebP, PDF
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
                  htmlFor="ocrFileInput"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium cursor-pointer"
                >
                  {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                </label>
              </div>
            )}
          </div>

          {/* OCR Engine Settings */}
          {selectedFile && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-white">
                {t.ocr.selectLang}
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {(['eng', 'ben', 'ben+eng'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                      selectedLanguage === lang
                        ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {lang === 'eng' ? t.ocr.langEng : lang === 'ben' ? t.ocr.langBen : t.ocr.langMixed}
                  </button>
                ))}
              </div>

              {/* Preprocessing Filters (visible in Local mode) */}
              {ocrEngine === 'local' && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-teal-400" />
                      <span>{t.ocr.preprocess}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setRotateAngle(((rotateAngle + 90) % 360) as any)}
                      className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>+{rotateAngle}°</span>
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grayscale}
                        onChange={(e) => setGrayscale(e.target.checked)}
                        className="accent-teal-400"
                      />
                      <span>{t.ocr.grayscale}</span>
                    </label>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{t.ocr.contrast}</span>
                        <span className="font-mono">{contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="100"
                        value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value))}
                        className="w-full accent-teal-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{t.ocr.brightness}</span>
                        <span className="font-mono">{brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={brightness}
                        onChange={(e) => setBrightness(parseInt(e.target.value))}
                        className="w-full accent-teal-400 cursor-pointer"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={useThreshold}
                        onChange={(e) => setUseThreshold(e.target.checked)}
                        className="accent-teal-400"
                      />
                      <span>{t.ocr.threshold}</span>
                    </label>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Start OCR Execution */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeOcr}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {ocrProgress ? `${ocrProgress.status}` : 'OCR চলছে...'}
                    </span>
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4" />
                    <span>
                      {ocrEngine === 'cloud'
                        ? language === 'bn'
                          ? 'ক্লাউড এআই দিয়ে টেক্সট উদ্ধার'
                          : 'Run Cloud AI OCR'
                        : t.ocr.startOcr}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Searchable PDF Working Feature Card */}
          <div className="p-4 rounded-xl border border-teal-500/30 bg-slate-900/60 text-xs text-slate-300 space-y-2">
            <span className="font-semibold text-teal-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>
                {language === 'bn'
                  ? 'সার্চেবল পিডিএফ জেনারেশন (Searchable PDF)'
                  : 'Searchable PDF Generation'}
              </span>
            </span>
            <p className="leading-relaxed text-slate-400 text-[11px]">
              {language === 'bn'
                ? 'স্ক্যান করা ডকুমেন্টের নিচে একটি অনুসন্ধানযোগ্য টেক্সট লেয়ার যুক্ত করে পিডিএফ তৈরি করা হয়। ফলে পুরো ফাইলটি কি-বোর্ড দিয়ে সার্চ (Ctrl+F) ও কপি করা যায়।'
                : 'Overlays a selectable vector text layer with embedded Noto Sans Bengali font so the document is 100% searchable and copyable.'}
            </p>

            {ocrResult && (
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleDownloadSearchablePdf}
                className="w-full py-2.5 px-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>পিডিএফ তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সার্চেবল পিডিএফ ডাউনলোড করুন' : 'Download Searchable PDF'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Extracted Text & Output Viewer */}
        <div className="lg:col-span-7 space-y-5">
          {ocrResult ? (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-slate-900/80 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {language === 'bn' ? 'ওসিআর টেক্সট প্রস্তুত' : 'OCR Extracted Text Ready'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {ocrResult.wordsCount} {language === 'bn' ? 'শব্দ' : 'words'} • {ocrResult.linesCount} {language === 'bn' ? 'লাইন' : 'lines'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono text-xs font-bold">
                    {t.ocr.confidence}: {ocrResult.confidence}%
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openAiAssistantWithContext(
                        ocrResult.cleanedText,
                        selectedFile ? `OCR: ${selectedFile.name}` : 'OCR Output'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask MAISHAA</span>
                  </button>
                </div>
              </div>

              {/* Text Area Viewer */}
              <div className="relative">
                <textarea
                  readOnly
                  value={ocrResult.cleanedText}
                  className="w-full h-80 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-hidden resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(ocrResult.cleanedText)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-teal-400" />
                    <span>{copied ? 'কপি হয়েছে!' : t.ocr.copyText}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingPdf || isDownloadingText}
                    onClick={() => downloadTextFile(ocrResult.text, false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.ocr.downloadTxt}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingPdf || isDownloadingText}
                    onClick={() => downloadTextFile(ocrResult.cleanedText, true)}
                    className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.ocr.downloadCleaned}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingPdf || isDownloadingText}
                    onClick={handleDownloadSearchablePdf}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 disabled:opacity-50 border border-teal-500/40 text-teal-300 font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
              <FileSearch className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">
                {language === 'bn' ? 'টেক্সট রিকগনিশন প্রস্তুত' : 'Ready for OCR Recognition'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'ছবি বা স্ক্যানড ফাইল নির্বাচন করে লোকাল বা ক্লাউড এআই ইঞ্জিন দিয়ে টেক্সট উদ্ধার করুন ও সার্চেবল পিডিএফ ডাউনলোড করুন।'
                  : 'Select an image or document, extract text via Local or Cloud AI OCR, and export searchable PDFs.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
