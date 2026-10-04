import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ShieldCheck, Cloud, AlertCircle, X, ArrowRight } from 'lucide-react';

export const AiConsentModal: React.FC = () => {
  const {
    isAiConsentModalOpen,
    setIsAiConsentModalOpen,
    executePendingAiAction,
    t,
    language,
    activeDocumentName,
  } = useWorkspace();

  if (!isAiConsentModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {t.aiAssistant.consentTitle}
              </h3>
              <p className="text-xs text-sky-400 font-mono">
                Cloud AI Processing Disclosure
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiConsentModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 text-sky-200 leading-relaxed font-medium">
            {t.aiAssistant.consentMessage}
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-white block">
              {language === 'bn' ? 'কী পাঠানো হবে:' : 'What will be transmitted:'}
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400 text-xs pl-1">
              <li>
                {language === 'bn'
                  ? `নির্বাচিত ফাইলের শুধু প্রয়োজনীয় এক্সট্রাক্ট করা টেক্সট (${activeDocumentName || 'Document'})`
                  : `Only the extracted text content from "${activeDocumentName || 'Current Document'}"`}
              </li>
              <li>
                {language === 'bn'
                  ? 'কোনো মূল বাইনারি ফাইল বা ছবি সার্ভারে স্থায়ীভাবে জমা হবে না'
                  : 'No raw binary files or images will be stored permanently'}
              </li>
              <li>
                {language === 'bn'
                  ? 'গুগল জেমিনি এআই-এর মাধ্যমে নিরাপদ এনক্রিপ্টেড চ্যানেলে উত্তর প্রস্তুত হবে'
                  : 'Processed securely via Google Gemini encrypted server route'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiConsentModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
          >
            {t.aiAssistant.cancel}
          </button>
          <button
            type="button"
            onClick={executePendingAiAction}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
          >
            <span>{t.aiAssistant.continue}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
