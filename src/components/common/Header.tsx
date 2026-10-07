import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Logo } from './Logo';
import {
  Sparkles,
  Crown,
  Globe,
  Bell,
  Grid,
  User,
  Search,
  FileCheck2,
  ShieldCheck,
  History,
  HelpCircle,
  Scissors,
  Palette,
  BookOpen,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    setActiveModule,
    language,
    setLanguage,
    t,
    jobs,
    setIsJobDrawerOpen,
    setIsHistoryModalOpen,
    setIsHelpModalOpen,
    setIsAiDrawerOpen,
  } = useWorkspace();

  const activeJobsCount = jobs.filter((j) => j.status === 'PROCESSING' || j.status === 'WAITING').length;

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-xs">
      {/* Zone 1: Branding — Official MAISHAA Logo & Lockup */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <button
          onClick={() => setActiveModule('universal')}
          className="text-left group flex items-center gap-2.5 sm:gap-3 transition-opacity hover:opacity-95"
          aria-label="MAISHAA WORKSPACE Home"
        >
          <div className="relative shrink-0">
            <Logo
              variant="circular"
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
              size={40}
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-[#0a192f] leading-tight">
                MAISHAA{' '}
              </span>
              <span className="text-base sm:text-lg font-black tracking-tight text-[#2563eb] leading-tight">
                WORKSPACE
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline-block">
                2
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium leading-none hidden sm:block">
              {language === 'bn' ? t.banglaSubline : 'One Workspace. Every Office Task.'}
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: Central Universal Search Input */}
      <div className="hidden lg:flex items-center flex-1 max-w-xl mx-6">
        <div className="relative w-full">
          <input
            type="text"
            readOnly
            onClick={() => setActiveModule('universal')}
            placeholder={
              language === 'bn'
                ? 'টুল, টেমপ্লেট খুঁজুন অথবা মায়িশা এআই-কে জিজ্ঞেস করুন...'
                : 'Search tools, templates or ask MAISHAA AI...'
            }
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-xs sm:text-sm text-slate-700 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Zone 3: Actions - Ask AI, Pro Plan, Language, Notifications, Jobs, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Ask MAISHAA AI Button */}
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_2px_10px_rgba(147,51,234,0.3)] hover:shadow-[0_4px_14px_rgba(147,51,234,0.4)] transition-all active:translate-y-0.5"
          title={t.nav.aiAssistant}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
          <span className="hidden sm:inline">Ask MAISHAA AI ✦</span>
          <span className="sm:hidden">AI ✦</span>
        </button>

        {/* Pro Plan Badge */}
        <button
          onClick={() => setActiveModule('office_pack')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 text-xs font-bold transition-colors shadow-2xs"
        >
          <Crown className="w-3.5 h-3.5 text-amber-600" />
          <span>Pro Plan</span>
        </button>

        {/* BG Remover Quick Action */}
        <button
          onClick={() => setActiveModule('bg_remover')}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors shadow-2xs"
          title="BG Remove Studio"
        >
          <Scissors className="w-3.5 h-3.5 text-teal-600" />
          <span>BG Remover</span>
        </button>

        {/* Creative Suite Quick Action */}
        <button
          onClick={() => setActiveModule('creative')}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-colors shadow-2xs"
          title="Creative Design Studio"
        >
          <Palette className="w-3.5 h-3.5 text-indigo-600" />
          <span>Creative Studio</span>
        </button>

        {/* Jobs Queue */}
        <button
          onClick={() => setIsJobDrawerOpen(true)}
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
          title={t.nav.jobs}
        >
          <FileCheck2 className="w-4 h-4 text-teal-600" />
          {activeJobsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500 animate-ping" />
          )}
        </button>

        {/* Session History */}
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
          title={t.nav.recent}
        >
          <History className="w-4 h-4" />
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-sans">{language === 'bn' ? 'বাংলা' : 'English ▾'}</span>
        </button>

        {/* Help & Tutorials Guide */}
        <button
          onClick={() => setActiveModule('tutorials')}
          className="hidden sm:flex p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
          title={language === 'bn' ? 'ব্যবহার নির্দেশিকা ও টিউটোরিয়াল' : 'Tutorials & Guides'}
        >
          <BookOpen className="w-4 h-4 text-blue-600" />
        </button>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#0a192f] text-white flex items-center justify-center font-bold text-xs shadow-xs ml-1 cursor-pointer">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};
