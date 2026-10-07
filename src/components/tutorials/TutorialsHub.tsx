import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PUBLIC_ROUTES_SEO } from '../../config/seoConfig';
import { AdSlot } from '../common/AdSlot';
import {
  BookOpen,
  Search,
  ArrowRight,
  Share2,
  Check,
  MessageSquare,
  HelpCircle,
  FileText,
  Scissors,
  FileSearch,
  Sparkles,
  Send,
  X,
} from 'lucide-react';

export const TutorialsHub: React.FC = () => {
  const { language, navigateTo, showNotification } = useWorkspace();
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'suggestion' | 'other'>('bug');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const isBn = language === 'bn';

  const guides = [
    {
      id: 'pdf-merge',
      route: '/pdf-studio/merge',
      icon: FileText,
      titleBn: 'PDF Merge করার সম্পূর্ণ গাইড',
      titleEn: 'Complete Guide to Merging PDF Files',
      categoryBn: 'পিডিএফ টুলস',
      categoryEn: 'PDF Tools',
      readTime: '3 min',
      excerptBn: 'একাধিক পিডিএফ ফাইল একসঙ্গে যুক্ত করা, পৃষ্ঠা ক্রম সাজানো এবং কোয়ালিটি ঠিক রেখে একক ফাইলে রূপান্তরের নিয়ম।',
      excerptEn: 'Learn how to combine multiple PDF documents into a single organized file while preserving layout quality.',
      contentBn: [
        '১. পিডিএফ স্টুডিওর মার্জ সেকশনে যান এবং ‘সিলেক্ট ফাইল’ বাটনে ক্লিক করুন।',
        '২. ফাইলগুলোর থাম্বনেইল ড্র্যাগ অ্যান্ড ড্রপ করে প্রয়োজনীয় ক্রমানুসারে সাজান।',
        '৩. ‘Merge PDF Files’ বাটনে ক্লিক করুন। শতভাগ লোকাল ব্রাউজারে সেকেন্ডের মধ্যে মার্জ হয়ে যাবে।',
      ],
      contentEn: [
        '1. Open the PDF Merge Studio and upload your input PDF documents.',
        '2. Arrange the page thumbnails into your desired sequence using drag-and-drop.',
        '3. Click Merge PDF Files to combine and save your finalized document.',
      ],
    },
    {
      id: 'bg-remove',
      route: '/image-studio/background-remover',
      icon: Scissors,
      titleBn: 'ছবির ব্যাকগ্রাউন্ড রিমুভ ও পরিবর্তন গাইড',
      titleEn: 'How to Remove & Change Image Backgrounds',
      categoryBn: 'ইমেজ স্টুডিও',
      categoryEn: 'Image Studio',
      readTime: '2 min',
      excerptBn: 'পাসপোর্ট ছবি, ই-কমার্স প্রোডাক্ট ও পোর্ট্রেটের ব্যাকগ্রাউন্ড এক ক্লিকে মুছে স্বচ্ছ বা সাদা ব্যাকগ্রাউন্ড দেওয়ার পদ্ধতি।',
      excerptEn: 'Step-by-step guide on automatic background segmentation, manual brush refinements, and export options.',
      contentBn: [
        '১. ব্যাকগ্রাউন্ড রিমুভার স্টুডিওতে আপনার ছবি আপলোড করুন।',
        '২. স্বয়ংক্রিয় সেগমেন্টেশনের পর প্রিভিউ দেখে প্রয়োজনীয় ব্যাকগ্রাউন্ড (স্বচ্ছ/সাদা/কালার) নির্বাচন করুন।',
        '৩. HD কোয়ালিটির Transparent PNG ফাইল ডাউনলোড করুন।',
      ],
      contentEn: [
        '1. Upload your portrait or product photo into BG Remove Studio.',
        '2. Review the automated edge detection or touch up with the erase/restore brushes.',
        '3. Choose a solid color or export an instant transparent PNG.',
      ],
    },
    {
      id: 'bangla-ocr',
      route: '/scan-ocr',
      icon: FileSearch,
      titleBn: 'ছবি ও স্ক্যান থেকে বাংলা লেখা বের করার নিয়ম',
      titleEn: 'Extracting Bengali Text via Optical Recognition',
      categoryBn: 'বাংলা ওসিআর',
      categoryEn: 'Bangla OCR',
      readTime: '4 min',
      excerptBn: 'বইয়ের পাতা বা নোটিশের স্পষ্ট ছবি থেকে বাংলা ইউনিকোড টেক্সট উদ্ধারের নির্ভুল নিয়ম ও যুক্তাক্ষর হ্যান্ডলিং।',
      excerptEn: 'Extract editable Bengali Unicode text from scans and photographs with full conjunct fidelity.',
      contentBn: [
        '১. বাংলা ডকুমেন্টের স্পষ্ট ও সোজা ছবি বা স্ক্যান আপলোড করুন।',
        '২. ভাষা ‘বাংলা + ইংরেজি’ নির্বাচন করুন এবং টেক্সট নিষ্কাশন শুরু করুন।',
        '৩. প্রাপ্ত টেক্সট এডিট করে কপি করুন অথবা সরাসরি ওয়ার্ড/পিডিএফ ফাইলে এক্সপোর্ট করুন।',
      ],
      contentEn: [
        '1. Upload a well-lit and non-skewed scan of your document.',
        '2. Select Bengali + English recognition mode and run extraction.',
        '3. Inspect extracted text, apply quick fixes, and export to DOCX or TXT.',
      ],
    },
    {
      id: 'pdf-compress',
      route: '/pdf-studio/compress',
      icon: Sparkles,
      titleBn: 'পিডিএফ ফাইলের সাইজ কমানোর সঠিক উপায়',
      titleEn: 'How to Compress PDF Without Losing Quality',
      categoryBn: 'পিডিএফ টুলস',
      categoryEn: 'PDF Tools',
      readTime: '3 min',
      excerptBn: 'চাকরির আবেদন ও ইমেইলের জন্য পিডিএফ ফাইলের সাইজ ২৫০ কেবি বা ৫০০ কেবির নিচে নামিয়ে আনার সহজ কৌশল।',
      excerptEn: 'Reduce bloated PDF files to meet strict job portal submission limits while preserving text sharpness.',
      contentBn: [
        '১. কম্প্রেস টুল ওপেন করে আপনার বড় পিডিএফ ফাইলটি নির্বাচন করুন।',
        '২. কম্প্রেশন লেভেল বেছে নিন (রেকমেন্ডেড ব্যালান্সড অপশন সবচেয়ে উপযুক্ত)।',
        '৩. সাইজ রিডাকশন রিপোর্ট দেখে অপটিমাইজড ফাইল ডাউনলোড করুন।',
      ],
      contentEn: [
        '1. Upload your heavy PDF file to the PDF Compression Studio.',
        '2. Choose between Recommended, Extreme, or Custom optimization presets.',
        '3. Inspect the exact percentage reduced and save your slim PDF.',
      ],
    },
    {
      id: 'forms-builder',
      route: '/forms-hub',
      icon: FileText,
      titleBn: 'চাকরি ও ছুটির আবেদন ফরম ফিলআপ করার গাইড',
      titleEn: 'Filling Official Bangladeshi Application Forms',
      categoryBn: 'ফরম হাব',
      categoryEn: 'Forms Hub',
      readTime: '3 min',
      excerptBn: 'সরকারি আবেদন, ছুটির দরখাস্ত ও প্রত্যয়নপত্র তৈরির প্রমিত নিয়ম ও এক ক্লিকে রেডি-টু-প্রিন্ট পিডিএফ তৈরি।',
      excerptEn: 'Generate print-ready administrative documents, leave requests, and formal job letters conforming to official standards.',
      contentBn: [
        '১. ফরম হাব থেকে প্রয়োজনীয় ফরম্যাট (যেমন ছুটির আবেদন) সিলেক্ট করুন।',
        '২. প্রয়োজনীয় নাম, পদবী, তারিখ ও কারণ পূরণ করুন।',
        '৩. ‘Generate Official PDF’ বাটনে চাপলে প্রমিত মার্জিনসহ ১-ক্লিকে প্রিন্ট রেডি কপি প্রস্তুত হবে।',
      ],
      contentEn: [
        '1. Pick your required template from the official forms catalog.',
        '2. Enter applicant details and body variables in the form fields.',
        '3. Click Generate PDF to receive a perfectly formatted, 1-inch margin document.',
      ],
    },
  ];

  const filteredGuides = guides.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.titleBn.toLowerCase().includes(q) ||
      g.titleEn.toLowerCase().includes(q) ||
      g.excerptBn.toLowerCase().includes(q) ||
      g.excerptEn.toLowerCase().includes(q)
    );
  });

  const handleShare = (guide: typeof guides[0]) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}${guide.route}`;
      navigator.clipboard.writeText(url);
      setCopiedId(guide.id);
      showNotification(isBn ? 'গাইড লিঙ্ক কপি হয়েছে!' : 'Guide URL copied!');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    // Store in localStorage for owner inspection
    try {
      const existing = JSON.parse(localStorage.getItem('maishaa_user_feedback') || '[]');
      existing.push({
        id: Date.now(),
        category: feedbackCategory,
        text: feedbackText.trim(),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('maishaa_user_feedback', JSON.stringify(existing));
    } catch (_) {}

    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackOpen(false);
      setFeedbackText('');
      showNotification(isBn ? 'আপনার মতামতের জন্য ধন্যবাদ!' : 'Thank you for your feedback!');
    }, 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 max-w-6xl mx-auto space-y-8">
      {/* 1. Header Banner */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
          <BookOpen className="w-4 h-4" />
          <span>{isBn ? 'টিউটোরিয়াল ও নির্দেশিকা হাব' : 'Help & Tutorial Documentation'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {isBn
            ? 'মায়িশা ওয়ার্কস্পেস ব্যবহার নির্দেশিকা ও টিউটোরিয়াল'
            : 'MAISHAA WORKSPACE Official User Guides'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {isBn
            ? 'সহজ ভাষায় ধাপে ধাপে শিখুন কীভাবে বিনামূল্যে পিডিএফ মার্জ, সাইজ কমানো, ব্যাকগ্রাউন্ড রিমুভ ও বাংলা ওসিআর ব্যবহার করবেন।'
            : 'Step-by-step verified tutorials and workflows for PDF organizing, background matting, Bangla OCR, and administrative documents.'}
        </p>

        {/* Search Bar */}
        <div className="pt-2 max-w-md relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? 'টিউটোরিয়াল খুঁজুন...' : 'Search guides and topics...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 2. Grid of Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGuides.map((guide) => {
          const Icon = guide.icon;
          const isSelected = selectedTopic === guide.id;
          return (
            <article
              key={guide.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-2xs hover:shadow-md transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <span>{guide.readTime}</span>
                    <button
                      onClick={() => handleShare(guide)}
                      title="Share link"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copiedId === guide.id ? (
                        <Check className="w-3.5 h-3.5 text-teal-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {isBn ? guide.titleBn : guide.titleEn}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isBn ? guide.excerptBn : guide.excerptEn}
                </p>

                {/* Step Preview */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  {(isBn ? guide.contentBn : guide.contentEn).map((step, idx) => (
                    <div key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="font-bold text-blue-600">•</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button: Jump to Tool */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={guide.route}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(guide.route);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all"
                >
                  <span>{isBn ? 'টুলটি ব্যবহার করুন' : 'Launch Tool'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {/* 3. Feedback / Problem Reporting Section */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-slate-900 dark:to-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'কোনো সমস্যা বা পরামর্শ আছে?' : 'Have feedback or found an issue?'}</span>
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isBn
              ? 'আমরা প্রতিনিয়ত মায়িশা ওয়ার্কস্পেসকে উন্নত করছি। আপনার মতামত আমাদের জানান।'
              : 'Help us improve MAISHAA WORKSPACE with your honest suggestions and bug reports.'}
          </p>
        </div>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
        >
          {isBn ? 'মতামত জানান' : 'Send Feedback'}
        </button>
      </div>

      {/* 4. Help Page Bottom Ad Placement */}
      <AdSlot placement="tutorial-bottom" />

      {/* Feedback Modal Dialog */}
      {feedbackOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'মতামত ও সমস্যা রিপোর্ট' : 'Report Problem or Feedback'}
              </h3>
              <button
                onClick={() => setFeedbackOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <Check className="w-8 h-8 text-teal-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {isBn ? 'ধন্যবাদ! মতামত গৃহীত হয়েছে।' : 'Thank you! Your feedback was recorded.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isBn ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="bug">{isBn ? 'বাগ বা প্রযুক্তিগত সমস্যা' : 'Bug or Technical Issue'}</option>
                    <option value="suggestion">{isBn ? 'নতুন ফিচারের পরামর্শ' : 'Feature Suggestion'}</option>
                    <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isBn ? 'বিস্তারিত বর্ণনা' : 'Description'}
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      isBn
                        ? 'আপনার সমস্যার বিবরণ বা পরামর্শ লিখুন...'
                        : 'Describe what happened or how we can improve...'
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isBn ? 'জমা দিন' : 'Submit'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
