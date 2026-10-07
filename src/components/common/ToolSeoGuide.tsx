import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PUBLIC_ROUTES_SEO, PublicRouteSeo } from '../../config/seoConfig';
import {
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

interface ToolSeoGuideProps {
  routePath: string;
  className?: string;
}

export const ToolSeoGuide: React.FC<ToolSeoGuideProps> = ({ routePath, className = '' }) => {
  const { language, navigateTo } = useWorkspace();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const seoData: PublicRouteSeo | undefined = PUBLIC_ROUTES_SEO[routePath];

  if (!seoData) return null;

  const isBn = language === 'bn';

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <section
      className={`mt-8 border-t border-slate-200/90 dark:border-slate-800/80 pt-8 pb-12 text-slate-800 dark:text-slate-200 space-y-6 ${className}`}
      aria-label="Tool Guide and Documentation"
    >
      {/* 1. Main Heading & Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {isBn ? 'নির্দেশিকা ও প্রশ্নোত্তর' : 'Guide & FAQ'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              workspace.maishaa.bd{seoData.path}
            </span>
          </div>

          {/* Social / Copy Link Action */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-500" />
                <span>{isBn ? 'লিঙ্ক কপি হয়েছে' : 'Link Copied'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'শেয়ার করুন' : 'Share Tool'}</span>
              </>
            )}
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {isBn ? seoData.h1Bn : seoData.h1En}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
          {isBn ? seoData.summaryBn : seoData.summaryEn}
        </p>
      </div>

      {/* 2. Supported Formats & Real Limits Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-2xs space-y-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            {isBn ? 'সমর্থিত ফাইল ফরম্যাট' : 'Supported File Formats'}
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {seoData.supportedFormats.map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-2xs space-y-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            {isBn ? 'ফাইল প্রসেসিং ও সাইজ সীমা' : 'Processing & Size Limits'}
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 pt-1 leading-normal font-medium">
            {seoData.limits}
          </p>
        </div>
      </div>

      {/* 3. Step-by-Step Usage Instructions */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {isBn ? 'ব্যবহারের সহজ ৩-ধাপের নিয়মাবলী' : 'Step-by-Step Instructions'}
        </h3>
        <ol className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {(isBn ? seoData.instructionsBn : seoData.instructionsEn).map((step, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 4. Genuine Frequently Asked Questions (FAQ) */}
      {seoData.faqs.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            {isBn ? 'সাধারণ জিজ্ঞাসা ও প্রশ্নোত্তর (FAQ)' : 'Frequently Asked Questions (FAQ)'}
          </h3>
          <div className="space-y-2">
            {seoData.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span>{isBn ? faq.questionBn : faq.questionEn}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3.5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed bg-slate-50/50 dark:bg-slate-900/30">
                      {isBn ? faq.answerBn : faq.answerEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Related Tools Navigation Links (Real HTML Anchors) */}
      {seoData.relatedRoutes.length > 0 && (
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isBn ? 'সম্পর্কিত অন্যান্য প্রয়োজনীয় টুলসমূহ:' : 'Related Workspace Tools:'}
          </h4>
          <div className="flex flex-wrap gap-2">
            {seoData.relatedRoutes.map((relPath) => {
              const relSeo = PUBLIC_ROUTES_SEO[relPath];
              if (!relSeo) return null;
              return (
                <a
                  key={relPath}
                  href={relPath}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo(relPath);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xs transition-all"
                >
                  <span>{isBn ? relSeo.h1Bn : relSeo.h1En}</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
