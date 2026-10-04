import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  X,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const FuturePhaseModal: React.FC = () => {
  const { futureModalData, closeFutureModal, language, setActiveModule } = useWorkspace();

  if (!futureModalData || !futureModalData.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">
                  {futureModalData.title}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {language === 'bn' ? 'পরবর্তী সংস্করণ' : 'Phase 2 Preview'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'সততা নীতি: অপ্রস্তুত ফিচার ভুয়াভাবে দেখানো নিষিদ্ধ'
                  : 'Zero Fake Feature Policy'}
              </p>
            </div>
          </div>
          <button
            onClick={closeFutureModal}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/30 text-amber-200 text-xs sm:text-sm leading-relaxed">
            {futureModalData.desc}
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              {language === 'bn'
                ? 'ফেজ ২ রোডম্যাপে যা অন্তর্ভুক্ত থাকবে:'
                : 'Included in Phase 2 Architecture:'}
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400 pl-1">
              <li>
                {language === 'bn'
                  ? 'গুগল জেমিনি এআই ভিত্তিক ডকুমেন্ট ও রসিদ ওসিআর (OCR)'
                  : 'Google Gemini AI powered OCR for receipts & docs'}
              </li>
              <li>
                {language === 'bn'
                  ? 'হাই-ফিডেলিটি DOCX/XLSX/PPTX থেকে নিখুঁত পিডিএফ রূপান্তর'
                  : 'High-fidelity DOCX/XLSX/PPTX serverless conversion'}
              </li>
              <li>
                {language === 'bn'
                  ? 'স্মার্ট ব্যাকগ্রাউন্ড রিমুভাল ও ইমেজ সুপার-রেজোলিউশন'
                  : 'Intelligent Background Removal & Upscaling'}
              </li>
              <li>
                {language === 'bn'
                  ? 'দ্বিভাষিক (বাংলা ও ইংরেজি) স্বয়ংক্রিয় সারাংশ ও অনুবাদ'
                  : 'Bilingual Bengali/English document summarization & translation'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={() => {
              closeFutureModal();
              setActiveModule('universal');
            }}
            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            {language === 'bn' ? 'হোম ওয়ার্কস্পেসে ফিরুন' : 'Back to Workspace'}
          </button>
          <button
            onClick={closeFutureModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            {language === 'bn' ? 'বুঝেছি' : 'Understood'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
