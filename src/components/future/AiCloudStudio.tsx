import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  Sparkles,
  Cpu,
  FileSearch,
  Languages,
  FileCheck2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Server,
  Code2,
} from 'lucide-react';

export const AiCloudStudio: React.FC = () => {
  const { t, language, setActiveModule, openFutureModal } = useWorkspace();

  const phase2Features = [
    {
      id: 'ocr',
      titleBn: 'জেমিনি এআই চালিত ওসিআর (OCR)',
      titleEn: 'Gemini AI Vision OCR',
      descBn: 'বাংলা ও ইংরেজি ডকুমেন্ট, চালানের রসিদ বা হস্তলিখিত নোট থেকে ৯৯.৮% নির্ভুলভাবে টেক্সট উদ্ধার।',
      descEn: 'Ultra-accurate Bangla & English text extraction from scanned receipts, invoices, and contracts.',
      icon: FileSearch,
      status: 'Active in OCR Studio',
      targetModule: 'ocr' as const,
    },
    {
      id: 'summarizer',
      titleBn: 'দ্বিভাষিক ডকুমেন্ট সামারাইজার',
      titleEn: 'Bilingual Document Summarizer',
      descBn: '৫০+ পৃষ্ঠার দীর্ঘ অডিট রিপোর্ট বা লিগ্যাল পেপার থেকে ৩ মিনিটে বাংলা বুলেট পয়েন্ট সারসংক্ষেপ।',
      descEn: 'Instant bullet-point executive summaries for 50+ page legal papers and audits.',
      icon: Sparkles,
      status: 'Active in AI Command Center',
      targetModule: 'ai_command' as const,
    },
    {
      id: 'translator',
      titleBn: 'অফিস ডকুমেন্ট অনুবাদক (বাংলা ↔ ইংরেজি)',
      titleEn: 'Official Document Translator',
      descBn: 'ফরম্যাটিং এবং টেবিল অক্ষুণ্ণ রেখে অফিসিয়াল পরিভাষা অনুযায়ী সরকারি ও বেসরকারি ডকুমেন্ট অনুবাদ।',
      descEn: 'Format-preserving bilingual translation for corporate memos and legal tenders.',
      icon: Languages,
      status: 'Active in AI Command Center',
      targetModule: 'ai_command' as const,
    },
    {
      id: 'pdf_word',
      titleBn: 'হাই-ফিডেলিটি PDF → Word কনভার্টার',
      titleEn: 'High-Fidelity PDF to Word Converter',
      descBn: 'জটিল কলাম, টেবিল ও গ্রাফিক্স নষ্ট না করে সম্পাদনাযোগ্য DOCX ফাইলে রূপান্তর।',
      descEn: 'Lossless layout preservation converting locked PDFs into editable Word docs.',
      icon: FileCheck2,
      status: 'Active in Convert Studio',
      targetModule: 'convert' as const,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <span className="text-xs font-semibold text-amber-400 font-mono">
            PHASE 2 ARCHITECTURAL PREVIEW
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          {t.futureModules.aiAssistant} & Cloud Intelligence Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          {language === 'bn'
            ? 'মায়িশা ওয়ার্কস্পেসের ভবিষ্যৎ ক্লাউড ও এআই সুবিধার রোডম্যাপ। ফেজ ১ সম্পূর্ণ ব্রাউজার-নির্ভর ও ব্যক্তিগত; ফেজ ২-এ ঐচ্ছিক ক্লাউড এআই সক্ষমতা যুক্ত হবে।'
            : 'Roadmap and technical preview of MAISHAA WORKSPACE Phase 2 cloud and AI intelligence.'}
        </p>
      </div>

      {/* Honest Privacy & Consent Architecture Box */}
      <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-950/20 space-y-3">
        <div className="flex items-center gap-2.5 text-teal-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <span>
            {language === 'bn'
              ? 'জিরো-ফেক ও ট্রান্সপারেন্ট এআই আর্কিটেকচার'
              : 'Zero-Fake & Transparent AI Architecture'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-teal-200/90 leading-relaxed">
          {t.futureModules.aiDisclosure}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="font-semibold text-white block mb-0.5">
              1. 100% Client-Side in Phase 1
            </span>
            {language === 'bn'
              ? 'আপনার ফাইল আপনার ডিভাইসেই থাকে। কোনো ফাইল ইন্টারনেটে আপলোড হয় না।'
              : 'Files never leave your browser sandbox.'}
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="font-semibold text-white block mb-0.5">
              2. Explicit Opt-in for Phase 2 AI
            </span>
            {language === 'bn'
              ? 'ক্লাউড এআই ব্যবহার করার পূর্বে ব্যবহারকারীর সম্মতি গ্রহণ করা বাধ্যতামূলক।'
              : 'User confirmation is required before any cloud API call.'}
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="font-semibold text-white block mb-0.5">
              3. Sovereign Bangla Language Engine
            </span>
            {language === 'bn'
              ? 'বাংলাদেশের অফিসিয়াল পরিভাষার সাথে সামঞ্জস্য রেখে বিশেষায়িত মডেল।'
              : 'Custom fine-tuned for official Bangladesh administrative terminology.'}
          </div>
        </div>
      </div>

      {/* Phase 2 Modules Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          {language === 'bn' ? 'আসন্ন ক্লাউড ও এআই মডিউলসমূহ' : 'Upcoming Cloud & AI Modules'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phase2Features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                onClick={() =>
                  openFutureModal(
                    language === 'bn' ? feat.titleBn : feat.titleEn,
                    language === 'bn' ? feat.descBn : feat.descEn,
                    feat.id
                  )
                }
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-amber-500/40 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                      {feat.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {language === 'bn' ? feat.titleBn : feat.titleEn}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {language === 'bn' ? feat.descBn : feat.descEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-medium">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModule(feat.targetModule);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>{language === 'bn' ? 'স্টুডিও চালু করুন' : 'Launch Studio'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-amber-400 text-[11px] group-hover:underline">
                    {language === 'bn' ? 'আর্কিটেকচার বিবরণ' : 'Architecture'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Return to workspace */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setActiveModule('universal')}
          className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-colors flex items-center gap-2"
        >
          <span>{language === 'bn' ? 'ইউনিভার্সাল ওয়ার্কস্পেসে ফিরে যান' : 'Return to Universal Workspace'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
