import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  Home,
  FileText,
  Image as ImageIcon,
  Layers,
  ArrowRightLeft,
  FileSearch,
  FileCode,
  Table,
  Presentation,
  Palette,
  LayoutTemplate,
  Sparkles,
  Folder,
  Clock,
  Star,
  Cloud,
  ChevronRight,
  Crown,
} from 'lucide-react';
import { ToolCategory } from '../../types/workspace';
import { AdSlot } from './AdSlot';

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    t,
    language,
    setIsAiDrawerOpen,
    setIsHistoryModalOpen,
  } = useWorkspace();

  const studioItems: {
    id: ToolCategory;
    labelEn: string;
    labelBn: string;
    icon: React.ElementType;
    colorGrad: string;
    shadowColor: string;
  }[] = [
    {
      id: 'pdf',
      labelEn: 'PDF Studio',
      labelBn: t.nav.pdfStudio,
      icon: FileText,
      colorGrad: 'from-red-600 to-rose-500',
      shadowColor: 'rgba(239, 68, 68, 0.4)',
    },
    {
      id: 'image',
      labelEn: 'Image Studio',
      labelBn: t.nav.imageStudio,
      icon: ImageIcon,
      colorGrad: 'from-blue-600 to-sky-500',
      shadowColor: 'rgba(59, 130, 246, 0.4)',
    },
    {
      id: 'doc_intel',
      labelEn: 'Document Studio',
      labelBn: t.nav.docIntel,
      icon: FileCode,
      colorGrad: 'from-blue-700 to-indigo-600',
      shadowColor: 'rgba(37, 99, 235, 0.4)',
    },
    {
      id: 'sheet_intel',
      labelEn: 'Spreadsheet Studio',
      labelBn: t.nav.sheetIntel,
      icon: Table,
      colorGrad: 'from-emerald-600 to-green-500',
      shadowColor: 'rgba(16, 185, 129, 0.4)',
    },
    {
      id: 'slides_intel',
      labelEn: 'Presentation Studio',
      labelBn: t.nav.slidesIntel,
      icon: Presentation,
      colorGrad: 'from-orange-600 to-amber-500',
      shadowColor: 'rgba(249, 115, 22, 0.4)',
    },
    {
      id: 'forms',
      labelEn: 'Design Studio',
      labelBn: 'ডিজাইন ও ফরম হাব',
      icon: Palette,
      colorGrad: 'from-purple-600 to-violet-500',
      shadowColor: 'rgba(147, 51, 234, 0.4)',
    },
    {
      id: 'convert',
      labelEn: 'Convert Studio',
      labelBn: t.nav.convertStudio,
      icon: ArrowRightLeft,
      colorGrad: 'from-pink-600 to-rose-500',
      shadowColor: 'rgba(236, 72, 153, 0.4)',
    },
    {
      id: 'ocr',
      labelEn: 'Scan & OCR',
      labelBn: t.nav.ocrStudio,
      icon: FileSearch,
      colorGrad: 'from-teal-600 to-cyan-500',
      shadowColor: 'rgba(20, 184, 166, 0.4)',
    },
    {
      id: 'batch',
      labelEn: 'Batch Processing',
      labelBn: t.nav.batchStudio,
      icon: Layers,
      colorGrad: 'from-indigo-600 to-purple-600',
      shadowColor: 'rgba(99, 102, 241, 0.4)',
    },
    {
      id: 'office_pack',
      labelEn: 'Templates',
      labelBn: t.nav.officePack,
      icon: LayoutTemplate,
      colorGrad: 'from-amber-600 to-yellow-500',
      shadowColor: 'rgba(245, 158, 11, 0.4)',
    },
    {
      id: 'ai_command',
      labelEn: 'AI Assistant',
      labelBn: t.nav.aiAssistant,
      icon: Sparkles,
      colorGrad: 'from-purple-600 to-indigo-600',
      shadowColor: 'rgba(168, 85, 247, 0.4)',
    },
  ];

  return (
    <aside
      className="hidden xl:flex flex-col w-64 bg-[#091326] border-r border-slate-800 shrink-0 select-none z-20 justify-between overflow-hidden shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)]"
      aria-label="Workspace Sidebar"
    >
      {/* Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 no-scrollbar">
        {/* Active Home Button */}
        <button
          onClick={() => setActiveModule('universal')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 mb-2 ${
            activeModule === 'universal'
              ? 'bg-[#2563eb] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{language === 'bn' ? t.nav.home : 'Home'}</span>
        </button>

        {/* Studios List with Colorful 3D Squircle Containers */}
        {studioItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {/* 3D Glossy Squircle Icon Container */}
              <div
                className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${item.colorGrad} flex items-center justify-center shrink-0 shadow-xs transition-transform duration-150 group-hover:scale-105`}
                style={{
                  boxShadow: `0 3px 8px ${item.shadowColor}, inset 0 1px 1px rgba(255,255,255,0.6)`,
                }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="truncate">{language === 'bn' ? item.labelBn : item.labelEn}</span>
            </button>
          );
        })}

        {/* Section Divider */}
        <div className="pt-3 pb-1 border-t border-slate-800/80 my-2" />

        {/* Lower File Storage Links */}
        <div className="space-y-0.5 text-xs text-slate-400">
          <button
            onClick={() => setActiveModule('universal')}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          >
            <Folder className="w-4 h-4 text-slate-400" />
            <span>{language === 'bn' ? 'আমার ফাইল' : 'My Files'}</span>
          </button>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{language === 'bn' ? 'সাম্প্রতিক ফাইল' : 'Recent Files'}</span>
          </button>
          <button
            onClick={() => setActiveModule('universal')}
            className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          >
            <Star className="w-4 h-4 text-slate-400" />
            <span>{language === 'bn' ? 'প্রিয় ফাইল' : 'Favorites'}</span>
          </button>
          <button
            onClick={() => setActiveModule('universal')}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ক্লাউড স্টোরেজ' : 'Cloud Storage'}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Bottom: "Upgrade to Pro Plan" Card */}
      <div className="p-3.5 border-t border-slate-800 bg-[#070e1c]">
        <div className="rounded-2xl bg-gradient-to-b from-[#0e1e38] to-[#0a1528] border border-amber-500/30 p-3.5 space-y-2 shadow-lg">
          <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs">
            <Crown className="w-4 h-4" />
            <span>Upgrade to Pro Plan</span>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1 font-medium">
            <li className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">+</span> More AI credits
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">+</span> Larger file size
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">+</span> Advanced tools
            </li>
          </ul>
          <button
            onClick={() => setActiveModule('office_pack')}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-[0_4px_12px_rgba(245,158,11,0.3)] transition-all active:translate-y-0.5"
          >
            Upgrade Now
          </button>
        </div>

        {/* 3. Desktop Sidebar Ad Slot (Hidden on Tablet/Mobile) */}
        <AdSlot placement="sidebar-bottom" className="mt-2" />
      </div>
    </aside>
  );
};
