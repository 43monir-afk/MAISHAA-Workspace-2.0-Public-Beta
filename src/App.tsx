/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { UniversalWorkspace } from './components/universal/UniversalWorkspace';
import { PdfStudio } from './components/pdf/PdfStudio';
import { ImageStudio } from './components/image/ImageStudio';
import { BatchStudio } from './components/batch/BatchStudio';
import { ConvertStudio } from './components/convert/ConvertStudio';
import { ScanOcrStudio } from './components/ocr/ScanOcrStudio';
import { DocumentIntelStudio } from './components/docintel/DocumentIntelStudio';
import { SpreadsheetIntelStudio } from './components/sheetintel/SpreadsheetIntelStudio';
import { PresentationIntelStudio } from './components/slidesintel/PresentationIntelStudio';
import { BangladeshFormsHub } from './components/forms/BangladeshFormsHub';
import { OneClickOfficePack } from './components/officepack/OneClickOfficePack';
import { AiCommandCenter } from './components/ai/AiCommandCenter';
import { AiCloudStudio } from './components/future/AiCloudStudio';

import { JobManagerDrawer } from './components/common/JobManagerDrawer';
import { SessionHistoryModal } from './components/common/SessionHistoryModal';
import { PrivacyModal } from './components/common/PrivacyModal';
import { HelpModal } from './components/common/HelpModal';
import { FuturePhaseModal } from './components/common/FuturePhaseModal';
import { AiConsentModal } from './components/common/AiConsentModal';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';

import {
  FolderRoot,
  FileText,
  Image as ImageIcon,
  Layers,
  ArrowRightLeft,
  FileSearch,
  FileCode,
  Table,
  Presentation,
  Package,
  Sparkles,
} from 'lucide-react';

const WorkspaceShell: React.FC = () => {
  const { activeModule, setActiveModule, t, notification, setIsAiDrawerOpen } = useWorkspace();

  const mobileNavItems = [
    { id: 'universal', label: t.nav.home, icon: FolderRoot },
    { id: 'pdf', label: t.nav.pdfStudio, icon: FileText },
    { id: 'image', label: t.nav.imageStudio, icon: ImageIcon },
    { id: 'ocr', label: t.nav.ocrStudio, icon: FileSearch },
    { id: 'doc_intel', label: t.nav.docIntel, icon: FileCode },
    { id: 'sheet_intel', label: t.nav.sheetIntel, icon: Table },
    { id: 'slides_intel', label: t.nav.slidesIntel, icon: Presentation },
    { id: 'forms', label: t.nav.formsHub, icon: FileText },
    { id: 'office_pack', label: t.nav.officePack, icon: Package },
    { id: 'ai_command', label: t.nav.aiCommandCenter, icon: Sparkles },
    { id: 'batch', label: t.nav.batchStudio, icon: Layers },
    { id: 'convert', label: t.nav.convertStudio, icon: ArrowRightLeft },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b1329] text-slate-100 overflow-hidden font-sans selection:bg-teal-500/30 selection:text-white">
      {/* Strict 3-zone Header */}
      <Header />

      {/* Mobile / Tablet Sub Navigation Bar */}
      <div className="xl:hidden border-b border-slate-800 bg-[#0d1733] px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 hover:bg-sky-500/30 transition-all ml-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{t.nav.aiAssistant}</span>
        </button>
      </div>

      {/* Main Layout Area: Desktop Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Deep Navy Desktop Sidebar */}
        <Sidebar />

        {/* Main Studio Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-radial-[at_top_right] from-slate-900/60 via-[#070e1e] to-[#040914]">
          {activeModule === 'universal' && <UniversalWorkspace />}
          {activeModule === 'pdf' && <PdfStudio />}
          {activeModule === 'image' && <ImageStudio />}
          {activeModule === 'ocr' && <ScanOcrStudio />}
          {activeModule === 'doc_intel' && <DocumentIntelStudio />}
          {activeModule === 'sheet_intel' && <SpreadsheetIntelStudio />}
          {activeModule === 'slides_intel' && <PresentationIntelStudio />}
          {activeModule === 'forms' && <BangladeshFormsHub />}
          {activeModule === 'office_pack' && <OneClickOfficePack />}
          {activeModule === 'ai_command' && <AiCommandCenter />}
          {activeModule === 'batch' && <BatchStudio />}
          {activeModule === 'convert' && <ConvertStudio />}
          {activeModule === 'ai_future' && <AiCloudStudio />}

          {/* Transient notification toast */}
          {notification && (
            <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold shadow-xl border border-teal-400/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                <span>{notification}</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Interactive Overlays */}
      <JobManagerDrawer />
      <SessionHistoryModal />
      <PrivacyModal />
      <HelpModal />
      <FuturePhaseModal />
      <AiConsentModal />
      <AiAssistantDrawer />
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
