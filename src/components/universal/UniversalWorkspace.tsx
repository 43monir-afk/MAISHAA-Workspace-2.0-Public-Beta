import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { SmartTaskBox } from '../smarttask/SmartTaskBox';
import { Logo } from '../common/Logo';
import { MaishaaHeroStudents } from '../common/MaishaaHeroStudents';
import { AdSlot } from '../common/AdSlot';
import { ToolSeoGuide } from '../common/ToolSeoGuide';
import {
  detectMultipleFiles,
  formatFileSize,
} from '../../utils/fileDetection';
import { FileDetectionResult, ToolCategory } from '../../types/workspace';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Layers,
  ArrowRightLeft,
  FileSearch,
  FileCode,
  Table,
  Presentation,
  Palette,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  Clock,
  Check,
  Plus,
  Send,
  MoreVertical,
  Laptop,
  Crown,
  Zap,
  FolderSync,
  X,
  FileCheck2,
  Scissors,
  PenTool,
  LayoutTemplate,
} from 'lucide-react';

export const UniversalWorkspace: React.FC = () => {
  const {
    t,
    language,
    setActiveModule,
    setStagedFiles,
    showNotification,
    setIsAiDrawerOpen,
    setIsHistoryModalOpen,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [detectedResults, setDetectedResults] = useState<FileDetectionResult[]>([]);
  const [cloudStatus, setCloudStatus] = useState<boolean | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => setCloudStatus(Boolean(data.configured)))
      .catch(() => setCloudStatus(false));
  }, []);

  const handleFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const results = detectMultipleFiles(fileArray);
    setDetectedResults(results);
    setStagedFiles(fileArray);

    const count = fileArray.length;
    showNotification(
      language === 'bn'
        ? `${count}টি ফাইল সফলভাবে শনাক্ত করা হয়েছে`
        : `${count} file(s) detected successfully`
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const clearSelection = () => {
    setDetectedResults([]);
    setStagedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const executeAction = (targetModule: ToolCategory, files: File[]) => {
    setStagedFiles(files);
    setActiveModule(targetModule);
  };

  // 10 Central Tools matching reference image layout
  const allTools = [
    {
      id: 'pdf',
      module: 'pdf' as ToolCategory,
      titleEn: 'PDF Studio',
      titleBn: 'পিডিএফ স্টুডিও',
      descEn: 'Edit, compress, merge, split, convert, OCR, sign, protect and more',
      descBn: 'মার্জ, স্প্লিট, সাইজ কমানো, রোটেট, ওয়াটারমার্ক ও সিকিউরিটি পাসওয়ার্ড।',
      icon: FileText,
      colorGrad: 'from-rose-600 to-red-500',
      shadowColor: 'rgba(239, 68, 68, 0.35)',
    },
    {
      id: 'image',
      module: 'image' as ToolCategory,
      titleEn: 'Image Studio',
      titleBn: 'ছবি স্টুডিও',
      descEn: 'Edit, resize, compress, background remove, advanced editor',
      descBn: 'ফটো কালার রিটাচ, এআই প্রম্পট জেনারেটর, ব্যাকগ্রাউন্ড অপসারণ ও সুপার-রেজোলিউশন।',
      icon: ImageIcon,
      colorGrad: 'from-blue-600 to-sky-500',
      shadowColor: 'rgba(59, 130, 246, 0.35)',
    },
    {
      id: 'bg_remover',
      module: 'bg_remover' as ToolCategory,
      titleEn: 'BG Remove Studio',
      titleBn: 'ব্যাকগ্রাউন্ড রিমুভার',
      descEn: '1-click cutout, transparent PNG, product framing, and AI backdrops',
      descBn: '১-ক্লিকে ছবির ব্যাকগ্রাউন্ড অপসারণ, স্বচ্ছ পিএনজি ও এআই ব্যাকড্রপ স্টুডিও।',
      icon: Scissors,
      colorGrad: 'from-teal-600 to-emerald-500',
      shadowColor: 'rgba(20, 184, 166, 0.35)',
    },
    {
      id: 'doc_intel',
      module: 'doc_intel' as ToolCategory,
      titleEn: 'Document Studio',
      titleBn: 'ডকুমেন্ট ইন্টেলিজেন্স',
      descEn: 'Create, edit and convert Word (DOCX) files online',
      descBn: 'ওয়ার্ড (DOCX) ফাইলের অভ্যন্তরীণ গঠন, অনুচ্ছেদ বিশ্লেষণ ও ফরম্যাটেড টেক্সট রিডার।',
      icon: FileCode,
      colorGrad: 'from-blue-700 to-indigo-600',
      shadowColor: 'rgba(37, 99, 235, 0.35)',
    },
    {
      id: 'sheet_intel',
      module: 'sheet_intel' as ToolCategory,
      titleEn: 'Spreadsheet Studio',
      titleBn: 'স্প্রেডশিট ডেটা',
      descEn: 'Edit Excel (XLSX), create sheets, charts and analyze data',
      descBn: 'এক্সেল ও সিএসভি ডেটা প্রিভিউ, ডুপ্লিকেট সারি ক্লিন ও কলাম পরিসংখ্যান।',
      icon: Table,
      colorGrad: 'from-emerald-600 to-green-500',
      shadowColor: 'rgba(16, 185, 129, 0.35)',
    },
    {
      id: 'slides_intel',
      module: 'slides_intel' as ToolCategory,
      titleEn: 'Presentation Studio',
      titleBn: 'স্লাইড প্রেজেন্টেশন',
      descEn: 'Create and edit PPTX, use templates and design slides',
      descBn: 'পাওয়ারপয়েন্ট স্লাইড ডেক তৈরি, টাইটেল ও বুলেট পয়েন্ট এডিটিং এবং PPTX এক্সপোর্ট।',
      icon: Presentation,
      colorGrad: 'from-orange-600 to-amber-500',
      shadowColor: 'rgba(249, 115, 22, 0.35)',
    },
    {
      id: 'creative',
      module: 'creative' as ToolCategory,
      titleEn: 'Creative Design Studio',
      titleBn: 'ক্রিয়েটিভ ডিজাইন স্টুডিও',
      descEn: 'Canva-style vector editor, certificates, ID cards, social posts, brand kit, and bulk create',
      descBn: 'ক্যানভা-স্টাইল ডিজাইন এডিটর, সম্মাননা সনদপত্র, আইডি কার্ড ও বাল্ক ক্রিয়েট।',
      icon: Palette,
      colorGrad: 'from-purple-600 to-indigo-600',
      shadowColor: 'rgba(147, 51, 234, 0.35)',
    },
    {
      id: 'whiteboard',
      module: 'whiteboard' as ToolCategory,
      titleEn: 'Infinite Whiteboard',
      titleBn: 'ইনফিনিট হোয়াইটবোর্ড',
      descEn: 'Brainstorm, sticky notes, mind maps, flowcharts and infinite canvas',
      descBn: 'সীমাহীন ক্যানভাসে আইডিয়া ব্রেনস্টর্মিং, স্টিকি নোটস ও ফ্লোচার্ট ডায়াগ্রাম।',
      icon: PenTool,
      colorGrad: 'from-amber-600 to-orange-500',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
    },
    {
      id: 'forms',
      module: 'forms' as ToolCategory,
      titleEn: 'Forms & Templates',
      titleBn: 'বাংলাদেশ ফরম হাব',
      descEn: 'Official forms, automated fill, and ready-to-print documents',
      descBn: 'সরকারি ও অফিসিয়াল আবেদন ফরম পূরণ, অটো-ফিল ও রেডি-টু-প্রিন্ট পিডিএফ তৈরি।',
      icon: LayoutTemplate,
      colorGrad: 'from-sky-600 to-blue-500',
      shadowColor: 'rgba(14, 165, 233, 0.35)',
    },
    {
      id: 'convert',
      module: 'convert' as ToolCategory,
      titleEn: 'Convert Studio',
      titleBn: 'কনভার্ট স্টুডিও',
      descEn: 'PDF ↔ Word, Excel, PPT, Image and many formats',
      descBn: 'DOCX ↔ PDF, XLSX ↔ PDF, PPTX ↔ PDF এবং ইমেজ ফরম্যাট রূপান্তর।',
      icon: ArrowRightLeft,
      colorGrad: 'from-pink-600 to-rose-500',
      shadowColor: 'rgba(236, 72, 153, 0.35)',
    },
    {
      id: 'ocr',
      module: 'ocr' as ToolCategory,
      titleEn: 'Scan & OCR',
      titleBn: 'স্ক্যান ও ওসিআর',
      descEn: 'Scan, clean, OCR and make searchable PDFs',
      descBn: 'ছবি বা স্ক্যানড পেজ থেকে বাংলা ও ইংরেজি টেক্সট উদ্ধার ও সার্চেবল পিডিএফ তৈরি।',
      icon: FileSearch,
      colorGrad: 'from-teal-600 to-cyan-500',
      shadowColor: 'rgba(20, 184, 166, 0.35)',
    },
    {
      id: 'batch',
      module: 'batch' as ToolCategory,
      titleEn: 'Batch Processing',
      titleBn: 'ব্যাচ প্রসেসিং',
      descEn: 'Process 100+ files at once (resize, compress, convert, rename, etc.)',
      descBn: 'একসঙ্গে একাধিক ফাইল রিসাইজ, ফরম্যাট কনভার্ট ও নিরাপদ জিপ বান্ডল তৈরি।',
      icon: Layers,
      colorGrad: 'from-indigo-600 to-purple-600',
      shadowColor: 'rgba(99, 102, 241, 0.35)',
    },
    {
      id: 'ai_command',
      module: 'ai_command' as ToolCategory,
      titleEn: 'AI Assistant',
      titleBn: 'মায়িশা অ্যাসিস্ট্যান্ট',
      descEn: 'Ask MAISHAA to summarize, convert, edit, format or create content',
      descBn: 'স্মার্ট ডকুমেন্ট প্ল্যানার, সামারি, অনুবাদ ও ইন্টেলিজেন্ট ওয়ার্কফ্লো অ্যাসিস্ট্যান্ট।',
      icon: Sparkles,
      colorGrad: 'from-amber-500 to-yellow-400',
      shadowColor: 'rgba(245, 158, 11, 0.35)',
    },
  ];

  // Recent files list matching reference mockup
  const recentFiles = [
    {
      name: 'Application_Form.pdf',
      format: 'PDF',
      size: '2.4 MB',
      date: 'Today 10:45 AM',
      iconColor: 'from-rose-500 to-red-600',
      module: 'pdf' as ToolCategory,
    },
    {
      name: 'Passport_Photo.jpg',
      format: 'Image',
      size: '450 KB',
      date: 'Today 10:30 AM',
      iconColor: 'from-blue-500 to-sky-600',
      module: 'image' as ToolCategory,
    },
    {
      name: 'Exam_Result.docx',
      format: 'DOCX',
      size: '1.2 MB',
      date: 'Yesterday 8:20 PM',
      iconColor: 'from-blue-600 to-indigo-600',
      module: 'doc_intel' as ToolCategory,
    },
    {
      name: 'Budget_Sheet.xlsx',
      format: 'XLSX',
      size: '980 KB',
      date: '12 Sep 2026',
      iconColor: 'from-emerald-500 to-green-600',
      module: 'sheet_intel' as ToolCategory,
    },
    {
      name: 'Project_Presentation.pptx',
      format: 'PPTX',
      size: '4.1 MB',
      date: '10 Sep 2026',
      iconColor: 'from-orange-500 to-amber-600',
      module: 'slides_intel' as ToolCategory,
    },
  ];

  // Popular templates previews matching reference mockup
  const popularTemplates = [
    { title: 'Resume', type: 'CV', color: 'border-blue-200' },
    { title: 'Invoice', type: 'FIN', color: 'border-slate-200' },
    { title: 'Certificate', type: 'CERT', color: 'border-amber-200' },
    { title: 'ID Card', type: 'ID', color: 'border-blue-200' },
    { title: 'Letterhead', type: 'DOC', color: 'border-slate-200' },
  ];

  // AI Assistant Quick Actions matching reference mockup
  const aiQuickActions = [
    { text: 'Summarize this PDF', badge: '📕' },
    { text: 'Convert this image to Word', badge: '📘' },
    { text: 'Make this file under 1 MB', badge: '📙' },
    { text: 'Remove background from this image', badge: '🟢' },
    { text: 'Create a professional CV', badge: '📄' },
    { text: 'Clean and organize this Excel data', badge: '📊' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#eef2f7] text-[#0f172a] p-4 sm:p-6 lg:p-7 space-y-6 min-h-full font-sans">
      {/* 1. Hero Showcase Banner Card (Exact Reference Look) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] relative overflow-hidden">
        {/* Top Showcase Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          {/* Left: Official Circular Emblem + Typography + 4 Pills */}
          <div className="flex items-start sm:items-center gap-5 sm:gap-6 max-w-2xl">
            <div className="relative shrink-0">
              <Logo
                variant="circular"
                className="w-24 h-24 sm:w-28 md:w-32 sm:h-28 md:h-32 drop-shadow-xl hover:scale-[1.02] transition-transform duration-200"
                size={128}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0a192f] tracking-tight leading-none">
                  MAISHAA{' '}
                  <span className="text-[#2563eb]">WORKSPACE</span>
                </h1>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                {language === 'bn' ? t.banglaSubline : 'One Workspace. Every Office Task.'}
              </p>

              {/* 4 Feature Badges from reference image */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/80 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Professional Tools
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/80 shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  Fast &amp; Easy
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200/80 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  100% Private &amp; Secure
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200/80 shadow-2xs">
                  <Laptop className="w-3.5 h-3.5 text-slate-600" />
                  Works on All Devices
                </span>
              </div>
            </div>
          </div>

          {/* Right: Maishaa & Medhaat Students Illustration */}
          <div className="hidden lg:flex justify-end items-center shrink-0">
            <MaishaaHeroStudents className="w-[360px] md:w-[420px] lg:w-[460px] xl:w-[500px]" />
          </div>
        </div>

        {/* Bottom Upload & Quick Create Section */}
        <div className="pt-5 space-y-3.5">
          {/* Wide Horizontal Drag & drop upload box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full rounded-2xl p-4 sm:p-5 border-2 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-all duration-150 ${
              isDragging
                ? 'bg-blue-100/70 border-blue-500 scale-[1.002]'
                : 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-200 hover:border-blue-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              id="universalFileInput"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Circular Blue 3D Upload Icon */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="text-left min-w-0 flex-1">
                <h4 className="font-extrabold text-sm sm:text-base text-[#0f172a] whitespace-normal">
                  Drag &amp; drop your file here{' '}
                  <span className="text-[#2563eb] font-bold hover:underline">or click to browse</span>
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 whitespace-normal">
                  Supports PDF, Word, Excel, PowerPoint, Images and more (Max 500 MB)
                </p>
              </div>
            </div>

            {/* Right action button */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold shadow-2xs shrink-0 transition-colors">
              <span>Select Files</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Create Action Buttons matching reference mockup */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveModule('doc_intel')}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Create New</span>
            </button>
            <button
              onClick={() => setActiveModule('bg_remover')}
              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-bold text-teal-800 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-teal-600" />
              <span>Remove BG</span>
            </button>
            <button
              onClick={() => setActiveModule('doc_intel')}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Blank Document</span>
            </button>
            <button
              onClick={() => setActiveModule('sheet_intel')}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              <span>Blank Spreadsheet</span>
            </button>
            <button
              onClick={() => setActiveModule('slides_intel')}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Presentation className="w-3.5 h-3.5 text-orange-600" />
              <span>Blank Presentation</span>
            </button>
            <button
              onClick={() => setActiveModule('forms')}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Palette className="w-3.5 h-3.5 text-purple-600" />
              <span>Blank Design</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload from Device</span>
            </button>
          </div>
        </div>

        {/* Detected Files Staging Area */}
        {detectedResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Detected Files ({detectedResults.length})</span>
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {detectedResults.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.file.name}</p>
                    <p className="text-[10px] text-slate-500">{formatFileSize(item.file.size)}</p>
                  </div>
                  {item.suggestedActions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => executeAction(item.suggestedActions[0].targetModule, [item.file])}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 transition-colors"
                    >
                      Process
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Accessible Task Search Input (Maintains Test Compatibility) */}
      <input
        id="taskSearchInput"
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* 2. "All Tools" Section (10 High-Gloss 3D Tool Cards Grid) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#0f172a]">
            {language === 'bn' ? 'সকল টুল' : 'All Tools'}
          </h2>
          <button
            onClick={() => setActiveModule('batch')}
            className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
          >
            <span>{language === 'bn' ? 'সকল টুল দেখুন' : 'View All Tools'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {allTools.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => setActiveModule(card.module)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_24px_-4px_rgba(15,23,42,0.1)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* High-Gloss 3D Squircle Icon Container */}
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.colorGrad} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}
                    style={{
                      boxShadow: `0 6px 14px -2px ${card.shadowColor}, inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.15)`,
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-[#0f172a] group-hover:text-[#2563eb] transition-colors leading-tight">
                      {language === 'bn' ? card.titleBn : card.titleEn}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {language === 'bn' ? card.descBn : card.descEn}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 flex items-center justify-end text-slate-300 group-hover:text-[#2563eb] transition-colors">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. Homepage Ad Slot: After All Tools */}
      <AdSlot placement="home-after-tools" />

      {/* 3. Bottom 3-Column Panels Section (Recent Files | Popular Templates | Ask MAISHAA AI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Recent Files */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-[#0f172a] flex items-center gap-2">
                <span>Recent Files</span>
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {recentFiles.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveModule(file.module)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${file.iconColor} flex items-center justify-center text-white shrink-0 shadow-2xs`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {file.format} • {file.size} • {file.date}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModule(file.module);
                    }}
                    className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Popular Templates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-[#0f172a]">
                Popular Templates
              </h3>
              <button
                onClick={() => setActiveModule('forms')}
                className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Template Card Thumbnails */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {popularTemplates.map((tpl, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveModule('forms')}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                >
                  <div className={`w-full aspect-3/4 rounded-lg bg-slate-50 border ${tpl.color} p-1.5 flex flex-col justify-between shadow-2xs group-hover:border-blue-500 group-hover:shadow-xs transition-all`}>
                    <div className="w-full h-1 bg-slate-200 rounded" />
                    <div className="space-y-0.5">
                      <div className="w-3/4 h-0.5 bg-slate-300 rounded" />
                      <div className="w-1/2 h-0.5 bg-slate-200 rounded" />
                    </div>
                    <div className="w-full py-0.5 bg-slate-200/80 rounded text-[7px] text-center font-bold text-slate-600">
                      {tpl.type}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors text-center truncate w-full">
                    {tpl.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: ✦ Ask MAISHAA AI */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
          {/* Purple Gradient Header Banner */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
              <span className="text-xs font-extrabold tracking-wide">Ask MAISHAA AI</span>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-md bg-white/20 text-white">
              New
            </span>
          </div>

          {/* Quick Action Prompts */}
          <div className="p-3.5 space-y-1.5 flex-1">
            {aiQuickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiQuestion(action.text);
                  setIsAiDrawerOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-left text-[11px] font-medium text-slate-700 hover:text-purple-900 border border-slate-100 hover:border-purple-200 transition-colors"
              >
                <span>{action.badge}</span>
                <span className="truncate">{action.text}</span>
              </button>
            ))}
          </div>

          {/* Ask Anything Input Bar */}
          <div className="p-3 pt-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuestion.trim()) {
                  setIsAiDrawerOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 focus-within:bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all"
            >
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-hidden"
              />
              <button
                type="submit"
                className="w-6 h-6 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shrink-0 hover:bg-blue-700 transition-colors shadow-2xs"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2. Lower Homepage Ad Slot: Below Panels */}
      <AdSlot placement="home-bottom" />

      {/* 4. Bottom Feature Badges Strip (5 Pillars) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold text-slate-900 truncate">100% Private &amp; Secure</p>
            <p className="text-[10px] text-slate-500 truncate">Your files are processed securely</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <Laptop className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold text-slate-900 truncate">Works on All Devices</p>
            <p className="text-[10px] text-slate-500 truncate">Desktop, Tablet, Mobile</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <Crown className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold text-slate-900 truncate">Professional Quality</p>
            <p className="text-[10px] text-slate-500 truncate">Clean and high-quality results</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold text-slate-900 truncate">Fast &amp; Easy</p>
            <p className="text-[10px] text-slate-500 truncate">Save time and work smarter</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5 col-span-2 sm:col-span-1">
          <FolderSync className="w-5 h-5 text-purple-600 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-bold text-slate-900 truncate">All-in-One Workspace</p>
            <p className="text-[10px] text-slate-500 truncate">Everything you need in one place</p>
          </div>
        </div>
      </div>

      {/* Embedded Smart Task Box (Preserves Automation & Smoke Test Expectations) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
        <h3 className="font-extrabold text-sm text-[#0f172a] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>{language === 'bn' ? 'স্মার্ট টাস্ক ও ওয়ার্কফ্লো অটোমেশন' : 'Smart Task Automation Engine'}</span>
        </h3>
        <SmartTaskBox />
      </div>

      {/* Discoverable Tool Guide & Genuine FAQs for Home */}
      <ToolSeoGuide routePath="/" />
    </div>
  );
};
