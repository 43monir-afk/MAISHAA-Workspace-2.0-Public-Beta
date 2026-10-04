import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  X,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

export const HelpModal: React.FC = () => {
  const { isHelpModalOpen, setIsHelpModalOpen, t, language } = useWorkspace();

  if (!isHelpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {t.nav.help}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'মায়িশা ওয়ার্কস্পেস ফেজ ১ ব্যবহার নির্দেশিকা ও সীমা'
                  : 'MAISHAA WORKSPACE Phase 1 Guide & Capabilities'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-300">
          <section className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-teal-400" />
              {t.nav.pdfStudio}
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              {language === 'bn'
                ? 'পিডিএফ একত্রীকরণ (Merge), নির্দিষ্ট পেজ ভাগ করা (Split), নির্দিষ্ট পৃষ্ঠা এক্সট্রাক্ট ও ডিলিট, পেজ ৯০/১৮০/২৭০ ডিগ্রি ঘোরানো, এবং ছবি থেকে পিডিএফ তৈরি পুরোপুরি ব্রাউজারে হয়। কম্প্রেশনের ক্ষেত্রে সততা বজায় রেখে আসল সাইজ ও হ্রাসপ্রাপ্ত হার দেখানো হয়।'
                : 'Merge, split, extract, delete, rotate pages, and build PDFs from images fully client-side. Honest compression displays real byte changes and alerts when already optimized.'}
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
              <ImageIcon className="w-4 h-4 text-teal-400" />
              {t.nav.imageStudio}
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              {language === 'bn'
                ? 'ছবি রিসাইজ, কোয়ালিটি নিয়ন্ত্রণ, ক্রপ, রোটেট, ফ্লিপ এবং JPEG, PNG, WebP ফরম্যাটে রূপান্তর। ক্যানভাস ইঞ্জিন ব্যবহার করে সর্বোচ্চ পারফরম্যান্স নিশ্চিত করা হয়।'
                : 'Resize, compress, crop, rotate, flip, and convert between JPEG, PNG, and WebP using browser HTML5 canvas.'}
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-teal-400" />
              {t.nav.batchStudio}
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              {language === 'bn'
                ? 'একসাথে একাধিক ছবির আকার পরিবর্তন বা কম্প্রেশন করুন অথবা একাধিক ছবি ও পিডিএফ একত্রিত করুন। কোনো একটি ফাইল ব্যর্থ হলে সম্পূর্ণ ব্যাচ নষ্ট হয় না।'
                : 'Batch process images or combine documents. Failure isolation guarantees that one faulty file will not abort the entire queue.'}
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
              <ArrowRightLeft className="w-4 h-4 text-teal-400" />
              {t.nav.convertStudio}
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              {language === 'bn'
                ? 'শুধুমাত্র ফেজ ১-এর নির্ভরযোগ্য কনভার্সন চালু রাখা হয়েছে। অপ্রস্তুত জটিল অফিস ডক কনভার্সন (যেমন DOCX ↔ PDF, PDF ↔ Word) ফেজ ২-এর জন্য সততার সাথে সংরক্ষিত।'
                : 'Only reliable browser conversions are enabled in Phase 1. Heavy Office format conversions (DOCX ↔ PDF, PDF ↔ Word) are honestly scheduled for Phase 2.'}
            </p>
          </section>

          <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-teal-300 text-xs">
            <span className="font-semibold flex items-center gap-1.5 mb-1 text-teal-200">
              <CheckCircle2 className="w-4 h-4" />
              {language === 'bn' ? 'ফাইল সাইজ ও নিরাপত্তা' : 'Safety Safeguard'}
            </span>
            {language === 'bn'
              ? 'ব্রাউজার মেমরি সুরক্ষিত রাখতে একবারে সর্বোচ্চ ১০০ মেগাবাইট পর্যন্ত ফাইল প্রক্রিয়াজাতকরণের সুপারিশ করা হয়। কাজ শেষ হলে মেমরি স্বয়ংক্রিয়ভাবে মুক্ত হয়।'
              : 'Files up to 100MB are supported client-side to maintain browser responsiveness and eliminate crashes.'}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            {t.privacyModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
