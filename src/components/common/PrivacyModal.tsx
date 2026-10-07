import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  X,
  ShieldCheck,
  HardDrive,
  Lock,
  Cpu,
  EyeOff,
} from 'lucide-react';

export const PrivacyModal: React.FC = () => {
  const { isPrivacyModalOpen, setIsPrivacyModalOpen, t, language } = useWorkspace();

  if (!isPrivacyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {t.privacyModal.title}
              </h3>
              <p className="text-xs text-teal-400 font-medium">
                MAISHAA WORKSPACE Client-Side Privacy Guarantee
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPrivacyModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">
          <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-800/40 text-teal-200 leading-relaxed font-medium">
            {t.privacyModal.assurance}
          </div>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-teal-400 shrink-0 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                {t.privacyModal.bullet1}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-teal-400 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                {t.privacyModal.bullet2}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-teal-400 shrink-0 mt-0.5">
                <EyeOff className="w-4 h-4" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                {t.privacyModal.bullet3}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-teal-400 shrink-0 mt-0.5">
                <HardDrive className="w-4 h-4" />
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                {t.privacyModal.bullet4}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-800/60 rounded-xl text-xs text-slate-300 border border-slate-700/60 space-y-2">
            <div className="font-bold text-teal-300 flex items-center gap-1.5">
              <span>{language === 'bn' ? 'বিজ্ঞাপন ও ডেটা নিরাপত্তা স্বচ্ছতা' : 'Advertising & Data Security Transparency'}</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              {language === 'bn'
                ? 'মায়িশা ওয়ার্কস্পেসের সকল টুল বিনামূল্যে বজায় রাখতে নন-ইনট্রুসিভ ডিসপ্লে বিজ্ঞাপন (Adsterra/AdSense) প্রদর্শিত হয়। বিজ্ঞাপন স্লটগুলো বিচ্ছিন্ন স্যান্ডবক্সে পরিচালিত হয় এবং আপনার কোনো ফাইল বা ডকুমেন্টের বিষয়বস্তু দেখার ক্ষমতা এদের নেই। আমরা কোনো থার্ড-পার্টি ট্র্যাকিং কুকি ব্যবহার করি না।'
                : 'To keep MAISHAA WORKSPACE 100% free, non-intrusive display ads (Adsterra/AdSense) are served. All ad units operate in isolated sandboxes and have zero access to your files or documents. MAISHAA sets no third-party tracking cookies.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={() => setIsPrivacyModalOpen(false)}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
          >
            {t.privacyModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
