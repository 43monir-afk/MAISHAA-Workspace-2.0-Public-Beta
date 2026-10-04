import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  parsePresentation,
  createOrExportPresentation,
  PresentationAnalysisResult,
  SlideAnalysis,
} from '../../services/slidesIntelService';

import { PrivacyIndicator } from '../common/PrivacyIndicator';
import { formatFileSize, generateSafeOutputFilename } from '../../utils/fileDetection';
import {
  Presentation,
  Upload,
  Download,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Copy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FilePlus2,
  Save,
  Check,
} from 'lucide-react';

export const PresentationIntelStudio: React.FC = () => {
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
  const [analysis, setAnalysis] = useState<PresentationAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [deckThemeColor, setDeckThemeColor] = useState('0d9488');

  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      const ppt = stagedFiles.find(
        (f) =>
          f.name.endsWith('.pptx') ||
          f.type.includes('presentation')
      );
      if (ppt) loadPresentation(ppt);
    }
  }, [stagedFiles]);

  const loadPresentation = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setAnalysis(null);
    setActiveSlideIndex(0);

    const jobId = addJob({
      toolType: 'PPTX INTEL',
      fileNames: [file.name],
      originalSize: file.size,
      status: 'PROCESSING',
    });

    try {
      const res = await parsePresentation(file);
      setAnalysis(res);

      updateJob(jobId, {
        status: 'COMPLETED',
        outputSize: res.totalWordCount,
        notes: `Slides: ${res.slideCount} | Words: ${res.totalWordCount}`,
      });

      showNotification(
        language === 'bn'
          ? `প্রেজেন্টেশন লোড সম্পন্ন: ${res.slideCount}টি স্লাইড`
          : `Presentation loaded: ${res.slideCount} slides`
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Failed to read presentation';
      setErrorMessage(msg);
      updateJob(jobId, {
        status: 'FAILED',
        errorState: msg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createBlankDeck = () => {
    const blankSlides: SlideAnalysis[] = [
      {
        slideNumber: 1,
        title: language === 'bn' ? 'প্রকল্প পরিচিতি ও উদ্দেশ্য' : 'Project Overview & Objectives',
        texts: [
          language === 'bn' ? 'প্রধান লক্ষ্য ও সারসংক্ষেপ' : 'Key goals and executive summary',
          language === 'bn' ? 'অংশীজন ও দলের ভূমিকা' : 'Stakeholders and team roles',
          language === 'bn' ? 'প্রত্যাশিত সময়সীমা ও ডেলিভারেবল' : 'Project timeline and deliverables',
        ],
        wordCount: 15,
      },
      {
        slideNumber: 2,
        title: language === 'bn' ? 'কার্যপরিকল্পনা ও পদ্ধতি' : 'Methodology & Action Plan',
        texts: [
          language === 'bn' ? 'প্রথম ধাপ: গবেষণা ও তথ্য সংগ্রহ' : 'Phase 1: Research and data collection',
          language === 'bn' ? 'দ্বিতীয় ধাপ: বাস্তবায়ন ও পরীক্ষা' : 'Phase 2: Implementation and testing',
          language === 'bn' ? 'তৃতীয় ধাপ: চূড়ান্ত মূল্যায়ন' : 'Phase 3: Final evaluation and handoff',
        ],
        wordCount: 18,
      },
      {
        slideNumber: 3,
        title: language === 'bn' ? 'বাজেট ও চূড়ান্ত সিদ্ধান্ত' : 'Budget & Next Steps',
        texts: [
          language === 'bn' ? 'সম্পদ বরাদ্দ ও খরচ বাজেট' : 'Resource allocation and financial budget',
          language === 'bn' ? 'ঝুঁকি ব্যবস্থাপনা কৌশল' : 'Risk mitigation strategy',
          language === 'bn' ? 'পরবর্তী পর্যালোচনা সভা' : 'Next review and signoff meeting',
        ],
        wordCount: 16,
      },
    ];

    setAnalysis({
      fileName: 'workspace_presentation.pptx',
      fileSize: 45000,
      slideCount: blankSlides.length,
      totalWordCount: 49,
      slides: blankSlides,
      extractedTextGrouped: blankSlides.map((s) => `--- ${s.title} ---\n${s.texts.join('\n')}`).join('\n\n'),
    });
    setActiveSlideIndex(0);
    showNotification(
      language === 'bn'
        ? 'নতুন প্রেজেন্টেশন তৈরি হয়েছে! আপনি এখন যেকোনো টেক্সট এডিট করতে পারেন।'
        : 'New presentation deck created! You can now edit all slides.'
    );
  };

  const updateActiveSlide = (newTitle: string, newTexts: string[]) => {
    if (!analysis) return;
    const updated = [...analysis.slides];
    const words = (newTitle + ' ' + newTexts.join(' ')).trim().split(/\s+/).filter(Boolean).length;
    updated[activeSlideIndex] = {
      ...updated[activeSlideIndex],
      title: newTitle,
      texts: newTexts,
      wordCount: words,
    };

    setAnalysis({
      ...analysis,
      slides: updated,
      totalWordCount: updated.reduce((acc, s) => acc + s.wordCount, 0),
    });
  };

  const addSlide = () => {
    if (!analysis) return;
    const newNum = analysis.slides.length + 1;
    const newSlide: SlideAnalysis = {
      slideNumber: newNum,
      title: language === 'bn' ? `নতুন স্লাইড ${newNum}` : `New Slide ${newNum}`,
      texts: [language === 'bn' ? 'মূল বক্তব্য এখানে লিখুন' : 'Key bullet point here'],
      wordCount: 5,
    };
    const updated = [...analysis.slides, newSlide];
    setAnalysis({
      ...analysis,
      slideCount: updated.length,
      slides: updated,
    });
    setActiveSlideIndex(updated.length - 1);
  };

  const removeActiveSlide = () => {
    if (!analysis || analysis.slides.length <= 1) {
      showNotification(
        language === 'bn'
          ? 'অন্তত একটি স্লাইড থাকা আবশ্যক'
          : 'At least one slide is required'
      );
      return;
    }
    const updated = analysis.slides
      .filter((_, idx) => idx !== activeSlideIndex)
      .map((s, idx) => ({ ...s, slideNumber: idx + 1 }));

    setAnalysis({
      ...analysis,
      slideCount: updated.length,
      slides: updated,
    });
    setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
  };

  const moveSlide = (direction: 'up' | 'down') => {
    if (!analysis) return;
    const targetIdx = direction === 'up' ? activeSlideIndex - 1 : activeSlideIndex + 1;
    if (targetIdx < 0 || targetIdx >= analysis.slides.length) return;

    const updated = [...analysis.slides];
    const temp = updated[activeSlideIndex];
    updated[activeSlideIndex] = updated[targetIdx];
    updated[targetIdx] = temp;

    // renumber
    const renumbered = updated.map((s, idx) => ({ ...s, slideNumber: idx + 1 }));
    setAnalysis({
      ...analysis,
      slides: renumbered,
    });
    setActiveSlideIndex(targetIdx);
  };

  const handleExportPptx = async () => {
    if (!analysis || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await createOrExportPresentation(analysis.slides, deckThemeColor);
      const filename = generateSafeOutputFilename(analysis.fileName || 'presentation', 'edited', 'pptx');
      await downloadFileOnce(blob, filename);
      showNotification(
        language === 'bn'
          ? 'পাওয়ারপয়েন্ট ফাইল সফলভাবে ডাউনলোড হয়েছে!'
          : 'PowerPoint PPTX presentation downloaded successfully!'
      );
    } catch (err: any) {
      showNotification(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const copySlideText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    showNotification(language === 'bn' ? 'কপি হয়েছে' : 'Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAllText = async () => {
    if (!analysis || isExporting) return;
    setIsExporting(true);
    try {
      const fullText = analysis.slides
        .map((s) => `[Slide ${s.slideNumber}: ${s.title}]\n${s.texts.join('\n')}`)
        .join('\n\n');
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const filename = generateSafeOutputFilename(analysis.fileName, 'slides_text', 'txt');
      await downloadFileOnce(blob, filename);
    } finally {
      setIsExporting(false);
    }
  };


  const activeSlide = analysis && analysis.slides[activeSlideIndex];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Presentation className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-teal-400 font-mono">
              PRESENTATION INTELLIGENCE & SLIDE EDITOR (PPTX)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {language === 'bn' ? 'প্রেজেন্টেশন এডিটর ও স্লাইড ডেক' : 'Presentation Editor & Slide Studio'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {language === 'bn'
              ? 'পাওয়ারপয়েন্ট (PPTX) ফাইল বিশ্লেষণ, স্লাইড টেক্সট সম্পাদনা, নতুন স্লাইড সংযোজন এবং সরাসরি PPTX ডেক ডাউনলোড করুন।'
              : 'Full PowerPoint editor: inspect decks, edit slide bullet points, reorder slides, and export clean OpenXML PPTX presentations.'}
          </p>
        </div>

        <PrivacyIndicator mode="LOCAL" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: File Loader & Slide List */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <input
              id="presentationFileInput"
              type="file"
              accept=".pptx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  loadPresentation(e.target.files[0]);
                }
              }}
            />

            {!selectedFile && !analysis ? (
              <div className="space-y-3">
                <label
                  htmlFor="presentationFileInput"
                  className="flex flex-col items-center justify-center p-7 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/20 hover:bg-slate-800/40 cursor-pointer transition-all"
                >
                  <Upload className="w-7 h-7 text-teal-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-200 text-center">
                    {language === 'bn'
                      ? 'পাওয়ারপয়েন্ট ফাইল আপলোড করুন (PPTX)'
                      : 'Upload PowerPoint Presentation (PPTX)'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    OpenXML Presentation format
                  </span>
                </label>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-2 text-[10px] uppercase font-mono text-slate-500">
                    {language === 'bn' ? 'অথবা' : 'OR'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={createBlankDeck}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <FilePlus2 className="w-4 h-4 text-teal-400" />
                  <span>
                    {language === 'bn'
                      ? 'নতুন স্লাইড ডেক তৈরি করুন'
                      : 'Create Blank Presentation Deck'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/50">
                <div className="min-w-0">
                  <p className="font-semibold text-white text-xs truncate max-w-[180px]">
                    {analysis?.fileName || selectedFile?.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {analysis ? `${analysis.slideCount} slides` : formatFileSize(selectedFile?.size || 0)}
                  </p>
                </div>
                <label
                  htmlFor="presentationFileInput"
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium cursor-pointer"
                >
                  {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                </label>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                <span>{language === 'bn' ? 'স্লাইড টেক্সট পার্স হচ্ছে...' : 'Extracting slide content...'}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Slide List & Management */}
          {analysis && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {language === 'bn' ? 'স্লাইড তালিকা' : 'Deck Slides'}: {analysis.slideCount}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={addSlide}
                    title="Add Slide"
                    className="p-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[11px] pr-1">{language === 'bn' ? 'যোগ' : 'Add'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openAiAssistantWithContext(
                        analysis.slides.map((s) => `${s.title}: ${s.texts.join(' ')}`).join('\n\n'),
                        analysis.fileName
                      )
                    }
                    className="px-2 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[11px]">AI</span>
                  </button>
                </div>
              </div>

              {/* Slide Navigator */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {analysis.slides.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                      activeSlideIndex === idx
                        ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate max-w-[200px]">
                      {s.slideNumber}. {s.title || 'Untitled'}
                    </span>
                    <span className={`text-[10px] font-mono ${activeSlideIndex === idx ? 'text-slate-900' : 'text-slate-400'}`}>
                      {s.wordCount} words
                    </span>
                  </button>
                ))}
              </div>

              {/* Theme color picker */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-[11px] text-slate-400 font-medium block">
                  {language === 'bn' ? 'স্লাইড থিম কালার' : 'Slide Theme Color'}
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { color: '0d9488', name: 'Teal' },
                    { color: '0284c7', name: 'Sky Blue' },
                    { color: '4f46e5', name: 'Indigo' },
                    { color: 'e11d48', name: 'Crimson' },
                    { color: '1e293b', name: 'Slate' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setDeckThemeColor(c.color)}
                      style={{ backgroundColor: `#${c.color}` }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        deckThemeColor === c.color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Export actions */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportPptx}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {language === 'bn' ? 'পাওয়ারপয়েন্ট ডাউনলোড (PPTX)' : 'Download PPTX Presentation'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={exportAllText}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.slidesIntel.downloadTxt}</span>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Right Column: Slide Editor & Preview */}
        <div className="lg:col-span-8 space-y-5">
          {activeSlide ? (
            <div className="p-5 rounded-2xl border border-teal-500/30 bg-slate-900/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Slide {activeSlide.slideNumber}: {activeSlide.title}
                    </h3>
                    <p className="text-[11px] text-teal-400 font-mono">
                      {activeSlide.wordCount} {language === 'bn' ? 'শব্দ' : 'words'} • OpenXML Editable
                    </p>
                  </div>
                </div>

                {/* Slide Controls: Move up, down, delete, copy */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => moveSlide('up')}
                    disabled={activeSlideIndex === 0}
                    title="Move Slide Up"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSlide('down')}
                    disabled={!analysis || activeSlideIndex === analysis.slides.length - 1}
                    title="Move Slide Down"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={removeActiveSlide}
                    title="Delete Slide"
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => copySlideText(activeSlide.texts.join('\n'))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5 text-teal-400" />
                    <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
                  </button>
                </div>
              </div>

              {/* Title Editor */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium block">
                  {language === 'bn' ? 'স্লাইড শিরোনাম (Title)' : 'Slide Title'}
                </label>
                <input
                  type="text"
                  value={activeSlide.title || ''}
                  onChange={(e) => updateActiveSlide(e.target.value, activeSlide.texts)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-hidden focus:border-teal-400"
                  placeholder="Enter slide title..."
                />
              </div>

              {/* Bullets & Body Editor */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-medium">
                    {language === 'bn' ? 'স্লাইড বিবরণ ও পয়েন্টসমূহ (প্রতি লাইনে একটি পয়েন্ট)' : 'Slide Bullet Points (One per line)'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {activeSlide.texts.length} lines
                  </span>
                </div>
                <textarea
                  value={activeSlide.texts.join('\n')}
                  onChange={(e) =>
                    updateActiveSlide(
                      activeSlide.title || '',
                      e.target.value.split('\n')
                    )
                  }
                  rows={9}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:outline-hidden focus:border-teal-400 resize-y"
                  placeholder="Enter bullet points, one per line..."
                />
              </div>

              {/* Live Slide Preview Box (16:9 Aspect Ratio) */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium block">
                  {language === 'bn' ? 'স্লাইড প্রিভিউ (16:9 লেআউট)' : 'Slide Visual Preview (16:9 Layout)'}
                </span>
                <div
                  className="w-full rounded-xl overflow-hidden shadow-lg border border-slate-800 bg-white text-slate-900 aspect-video flex flex-col justify-between"
                  style={{ maxHeight: '280px' }}
                >
                  {/* Top Bar with selected theme color */}
                  <div
                    className="px-5 py-3 text-white flex items-center justify-between"
                    style={{ backgroundColor: `#${deckThemeColor}` }}
                  >
                    <h4 className="font-bold text-sm tracking-tight truncate">
                      {activeSlide.title || 'Untitled Slide'}
                    </h4>
                    <span className="text-[10px] opacity-80 font-mono">
                      #{activeSlide.slideNumber}
                    </span>
                  </div>

                  {/* Body bullets */}
                  <div className="p-4 flex-1 overflow-y-auto space-y-1.5 text-xs text-slate-700 font-sans">
                    {activeSlide.texts.filter(Boolean).length > 0 ? (
                      activeSlide.texts.filter(Boolean).map((line, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: `#${deckThemeColor}` }}
                          />
                          <p className="leading-snug">{line}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">[No content on this slide]</p>
                    )}
                  </div>

                  {/* Slide footer */}
                  <div className="px-5 py-1.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>MAISHAA WORKSPACE 2</span>
                    <span>Slide {activeSlide.slideNumber} of {analysis.slides.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
              <Presentation className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">
                {language === 'bn' ? 'প্রেজেন্টেশন লোড করুন বা তৈরি করুন' : 'Load or Create Presentation'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'বিদ্যমান PPTX ফাইল আপলোড করে এডিট করুন অথবা বাঁদিকের বোতাম দিয়ে সরাসরি নতুন স্লাইড ডেক তৈরি করুন।'
                  : 'Upload an existing PPTX file to edit or create a brand new slide deck directly.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
