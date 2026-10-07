/**
 * MAISHAA WORKSPACE — Creative Design Studio
 * Full Canva-style vector canvas, layers, typography, templates, brand kit, and bulk data create.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  DesignProject,
  DesignPage,
  CanvasElement,
  ElementType,
  DesignTemplate,
} from '../../types/creativeSuite';
import { CREATIVE_TEMPLATES, MAISHAA_BRAND_KIT } from '../../services/creativeTemplates';
import {
  renderPageToCanvas,
  exportProjectToPdf,
  executeBulkCreate,
} from '../../services/creativeEngineService';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  Palette,
  Layers,
  Type,
  Square,
  Circle,
  Download,
  Upload,
  Plus,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Move,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Printer,
  Share2,
} from 'lucide-react';

export const CreativeStudio: React.FC = () => {
  const { language, showNotification } = useWorkspace();

  const [activeTab, setActiveTab] = useState<
    'editor' | 'templates' | 'elements' | 'text' | 'brand_kit' | 'bulk_create'
  >('editor');

  // Active Project State (initialized with academic honor certificate)
  const [project, setProject] = useState<DesignProject>({
    id: `proj_${Date.now()}`,
    title: 'New Design Project',
    version: 1,
    createdTime: Date.now(),
    updatedTime: Date.now(),
    unit: 'px',
    category: 'certificate',
    pages: JSON.parse(JSON.stringify(CREATIVE_TEMPLATES[0].pages)),
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Undo/Redo Stacks
  const [history, setHistory] = useState<DesignPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Bulk Create State
  const [bulkCsvText, setBulkCsvText] = useState(
    'Name,Course,Date\nফারজানা ইসলাম দিনা,তথ্যপ্রযুক্তি ও ডিজিটাল অফিস ম্যানেজমেন্ট,১৬ ফেব্রুয়ারি ২০২৬\nতানভীর আহমেদ,প্রফেশনাল গ্রাফিক ডিজাইন ও ব্র্যান্ডিং,১৬ ফেব্রুয়ারি ২০২৬\nরাবেয়া সুলতানা,বিজনেস অ্যানালিটিক্স ও এক্সেল স্প্রেডশিট,১৬ ফেব্রুয়ারি ২০২৬'
  );
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const currentPage = project.pages[currentPageIndex] || project.pages[0];
  const selectedElement = currentPage?.elements.find((el) => el.id === selectedElementId);

  // Record history snapshot
  const pushHistorySnapshot = (newPages: DesignPage[]) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(newPages))]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevPages = history[historyIndex - 1];
      setProject((p) => ({ ...p, pages: JSON.parse(JSON.stringify(prevPages)) }));
      setHistoryIndex((i) => i - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextPages = history[historyIndex + 1];
      setProject((p) => ({ ...p, pages: JSON.parse(JSON.stringify(nextPages)) }));
      setHistoryIndex((i) => i + 1);
    }
  };

  // Add Element
  const addTextElement = (text = 'নতুন শিরোনাম', fontSize = 24, fontWeight: 'normal' | 'bold' = 'bold') => {
    const newEl: CanvasElement = {
      id: `el_${Date.now()}`,
      type: 'text',
      text,
      fontSize,
      fontWeight,
      color: '#0B192C',
      x: 100,
      y: 100,
      width: 300,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: currentPage.elements.length + 1,
      textAlign: 'left',
    };
    const updatedPages = project.pages.map((p, idx) =>
      idx === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p
    );
    setProject((p) => ({ ...p, pages: updatedPages }));
    pushHistorySnapshot(updatedPages);
    setSelectedElementId(newEl.id);
  };

  const addShapeElement = (shapeType: 'rect' | 'circle', fill = '#2563EB') => {
    const newEl: CanvasElement = {
      id: `shape_${Date.now()}`,
      type: 'shape',
      shapeType,
      fill,
      x: 120,
      y: 120,
      width: 140,
      height: shapeType === 'circle' ? 140 : 90,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: currentPage.elements.length + 1,
      borderRadius: shapeType === 'rect' ? 8 : 0,
    };
    const updatedPages = project.pages.map((p, idx) =>
      idx === currentPageIndex ? { ...p, elements: [...p.elements, newEl] } : p
    );
    setProject((p) => ({ ...p, pages: updatedPages }));
    pushHistorySnapshot(updatedPages);
    setSelectedElementId(newEl.id);
  };

  // Update selected element
  const updateSelectedElement = (updates: Partial<CanvasElement>) => {
    if (!selectedElementId) return;
    const updatedPages = project.pages.map((p, idx) => {
      if (idx !== currentPageIndex) return p;
      return {
        ...p,
        elements: p.elements.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el)),
      };
    });
    setProject((p) => ({ ...p, pages: updatedPages }));
  };

  // Delete element
  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    const updatedPages = project.pages.map((p, idx) => {
      if (idx !== currentPageIndex) return p;
      return {
        ...p,
        elements: p.elements.filter((el) => el.id !== selectedElementId),
      };
    });
    setProject((p) => ({ ...p, pages: updatedPages }));
    pushHistorySnapshot(updatedPages);
    setSelectedElementId(null);
  };

  // Load Template
  const loadTemplate = (tmpl: DesignTemplate) => {
    const newPages = JSON.parse(JSON.stringify(tmpl.pages));
    setProject((p) => ({
      ...p,
      title: tmpl.nameEn,
      category: tmpl.category as any,
      pages: newPages,
    }));
    setCurrentPageIndex(0);
    setSelectedElementId(null);
    pushHistorySnapshot(newPages);
    setActiveTab('editor');
    showNotification(language === 'bn' ? 'টেমপ্লেট সফলভাবে লোড হয়েছে' : 'Template loaded successfully');
  };

  // Apply Brand Kit Colors
  const applyBrandKit = () => {
    const updatedPages = project.pages.map((p, idx) => {
      if (idx !== currentPageIndex) return p;
      return {
        ...p,
        elements: p.elements.map((el) => {
          if (el.type === 'text' && el.fontWeight === 'bold') {
            return { ...el, color: MAISHAA_BRAND_KIT.palette.primary };
          }
          if (el.type === 'shape' && el.fill && el.fill !== 'transparent') {
            return { ...el, fill: MAISHAA_BRAND_KIT.palette.secondary };
          }
          return el;
        }),
      };
    });
    setProject((p) => ({ ...p, pages: updatedPages }));
    pushHistorySnapshot(updatedPages);
    showNotification(language === 'bn' ? 'মায়িশা ব্র্যান্ড কিট কালার প্রয়োগ করা হয়েছে' : 'Brand Kit applied');
  };

  // Export PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await exportProjectToPdf(project);
      downloadFileOnce(blob, `${project.title.replace(/\s+/g, '_')}.pdf`);
      showNotification(language === 'bn' ? 'পিডিএফ এক্সপোর্ট সম্পন্ন হয়েছে' : 'Exported vector PDF successfully');
    } catch (err: any) {
      showNotification(err?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Export PNG
  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderPageToCanvas(currentPage, 2);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadFileOnce(blob, `${project.title.replace(/\s+/g, '_')}_p${currentPageIndex + 1}.png`);
          showNotification(language === 'bn' ? 'পিএনজি ছবি ডাউনলোড হয়েছে' : 'Exported high-res PNG');
        }
      }, 'image/png');
    } catch (err: any) {
      showNotification(err?.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Execute Bulk Create
  const handleBulkCreate = async () => {
    setIsBulkProcessing(true);
    setBulkProgress(10);
    try {
      const lines = bulkCsvText.trim().split('\n');
      if (lines.length < 2) throw new Error('অন্তত একটি হেডার ও একটি ডেটা সারি প্রদান করুন');

      const headers = lines[0].split(',').map((h) => h.trim());
      const rows: Array<Record<string, string>> = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        rows.push(rowObj);
      }

      setBulkProgress(50);
      const res = await executeBulkCreate(currentPage, rows, {
        filenamePrefix: project.title.replace(/\s+/g, '_'),
      });
      setBulkProgress(100);

      downloadFileOnce(res.zipBlob, `MAISHAA-Bulk-Create-${rows.length}-Items.zip`);
      showNotification(
        language === 'bn'
          ? `সফলভাবে ${res.totalGenerated}টি ফাইল তৈরি ও জিপ ডাউনলোড হয়েছে`
          : `Generated ${res.totalGenerated} personalized items in ZIP`
      );
    } catch (err: any) {
      showNotification(err?.message || 'Bulk create failed');
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070e1e] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-slate-800 bg-[#091326] px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={project.title}
                onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
                className="bg-transparent border-none text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                CANVA-STYLE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">
              {currentPage.width} × {currentPage.height} px • Page {currentPageIndex + 1} of {project.pages.length}
            </p>
          </div>
        </div>

        {/* Center Canvas Tools */}
        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 hover:text-white text-slate-400 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 hover:text-white text-slate-400 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
            className="p-1.5 hover:text-white text-slate-400"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 font-bold">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-1.5 hover:text-white text-slate-400"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 hover:text-white text-slate-400 ml-1"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Vector PDF</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Sub-Navigation Tabs */}
        <aside className="w-16 bg-[#091326] border-r border-slate-800 flex flex-col items-center py-3 gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold w-12 transition-all ${
              activeTab === 'editor'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Layers</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold w-12 transition-all ${
              activeTab === 'templates'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold w-12 transition-all ${
              activeTab === 'text'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Text</span>
          </button>

          <button
            onClick={() => setActiveTab('elements')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold w-12 transition-all ${
              activeTab === 'elements'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Square className="w-4 h-4" />
            <span>Elements</span>
          </button>

          <button
            onClick={() => setActiveTab('brand_kit')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold w-12 transition-all ${
              activeTab === 'brand_kit'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Brand Kit</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk_create')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-bold w-12 transition-all ${
              activeTab === 'bulk_create'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>Bulk CSV</span>
          </button>
        </aside>

        {/* Side Drawer for Tool Details */}
        <div className="w-72 bg-[#0a152d] border-r border-slate-800 flex flex-col p-4 overflow-y-auto no-scrollbar shrink-0">
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? 'রেডিমেড টেমপ্লেট ক্যাটালগ' : 'Design Templates'}
              </h2>
              <div className="space-y-3">
                {CREATIVE_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => loadTemplate(tmpl)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-blue-500/50 cursor-pointer transition-all group"
                  >
                    <div
                      className="h-24 rounded-lg mb-2 flex items-center justify-center text-xs font-bold text-white shadow-inner"
                      style={{ backgroundColor: tmpl.thumbnailColor }}
                    >
                      {tmpl.nameEn}
                    </div>
                    <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                      {language === 'bn' ? tmpl.nameBn : tmpl.nameEn}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {tmpl.width} × {tmpl.height} px
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? 'টাইপোগ্রাফি ও টেক্সট যুক্ত করুন' : 'Add Text'}
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => addTextElement('মূল শিরোনাম (Main Heading)', 32, 'bold')}
                  className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-lg font-bold text-white transition-colors"
                >
                  Add a Heading (শিরোনাম)
                </button>
                <button
                  onClick={() => addTextElement('উপ-শিরোনাম (Subheading)', 20, 'bold')}
                  className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-slate-200 transition-colors"
                >
                  Add a Subheading (উপ-শিরোনাম)
                </button>
                <button
                  onClick={() => addTextElement('বর্ণনামূলক প্যারাগ্রাফ বা বডি টেক্সট...', 14, 'normal')}
                  className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
                >
                  Add Body Text (প্যারাগ্রাফ টেক্সট)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'elements' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? 'শেপ ও উপাদান' : 'Shapes & Elements'}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addShapeElement('rect', '#2563EB')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex flex-col items-center gap-2 text-xs"
                >
                  <Square className="w-6 h-6 text-blue-500" />
                  <span>Rectangle</span>
                </button>
                <button
                  onClick={() => addShapeElement('circle', '#0D9488')}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex flex-col items-center gap-2 text-xs"
                >
                  <Circle className="w-6 h-6 text-teal-500" />
                  <span>Circle</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'brand_kit' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? 'অফিসিয়াল মায়িশা ব্র্যান্ড কিট' : 'Official Brand Kit'}
              </h2>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <p className="text-[11px] text-slate-300">
                  {language === 'bn'
                    ? 'মায়িশার অফিসিয়াল নেভি ব্লু, রয়্যাল ব্লু, টিল ও গোল্ড কালার প্যালেট।'
                    : 'Standard approved corporate palette with authentic SolaimanLipi typography.'}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 rounded-lg bg-[#0B192C] border border-slate-700" title="Deep Navy" />
                  <div className="h-8 rounded-lg bg-[#2563EB]" title="Royal Blue" />
                  <div className="h-8 rounded-lg bg-[#0D9488]" title="Teal" />
                  <div className="h-8 rounded-lg bg-[#F59E0B]" title="Gold Accent" />
                </div>
                <button
                  onClick={applyBrandKit}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md"
                >
                  {language === 'bn' ? 'ব্র্যান্ড কিট প্রয়োগ করুন' : 'Apply Brand Kit to Current Page'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'bulk_create' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4" />
                <span>{language === 'bn' ? 'বাল্ক ক্রিয়েট (CSV ডেটা)' : 'Bulk Create Engine'}</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {language === 'bn'
                  ? 'এক ক্লিকে শত শত মানুষের সার্টিফিকেট, আইডি কার্ড বা পোস্টার জেনারেট করুন।'
                  : 'Bind CSV row columns to {{Name}}, {{Course}}, or {{Date}} template variables.'}
              </p>
              <textarea
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                rows={6}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={handleBulkCreate}
                disabled={isBulkProcessing}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isBulkProcessing ? (
                  <span>Generating Batch ({bulkProgress}%)...</span>
                ) : (
                  <span>Generate All & Download ZIP</span>
                )}
              </button>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'bn' ? 'লেয়ার ও উপাদান তালিকা' : 'Page Layers'}
              </h2>
              <div className="space-y-1.5">
                {currentPage.elements.map((el) => {
                  const isSel = el.id === selectedElementId;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSel
                          ? 'bg-blue-600/30 border border-blue-500 text-white'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {el.type === 'text' ? <Type className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5 text-teal-400" />}
                        <span className="truncate">{el.text || `${el.type} (${el.id})`}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSelectedElement({ visible: !el.visible });
                          }}
                          className="p-1 hover:text-white text-slate-400"
                        >
                          {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Element Inspector if an item is selected */}
          {selectedElement && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center justify-between">
                <span>Inspector: {selectedElement.type}</span>
                <button
                  onClick={deleteSelectedElement}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Delete element"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </h3>

              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Text Content</label>
                    <textarea
                      value={selectedElement.text || ''}
                      onChange={(e) => updateSelectedElement({ text: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Font Size</label>
                      <input
                        type="number"
                        value={selectedElement.fontSize || 16}
                        onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value, 10) || 12 })}
                        className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Color</label>
                      <input
                        type="color"
                        value={selectedElement.color || '#000000'}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className="w-full h-8 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedElement.type === 'shape' && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Fill Color</label>
                  <input
                    type="color"
                    value={selectedElement.fill || '#2563EB'}
                    onChange={(e) => updateSelectedElement({ fill: e.target.value })}
                    className="w-full h-8 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Central Visual Artboard Canvas */}
        <div
          ref={canvasRef}
          onClick={() => setSelectedElementId(null)}
          className="flex-1 bg-[#050b18] overflow-auto flex items-center justify-center p-8 relative"
        >
          <div
            style={{
              width: `${currentPage.width * zoom}px`,
              height: `${currentPage.height * zoom}px`,
            }}
            className="relative shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] transition-all bg-white"
          >
            {/* Visual Design Elements Rendering */}
            {currentPage.elements.map((el) => {
              const isSelected = el.id === selectedElementId;
              const scale = zoom;

              return (
                <div
                  key={el.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${el.x * scale}px`,
                    top: `${el.y * scale}px`,
                    width: `${el.width * scale}px`,
                    height: `${el.height * scale}px`,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    opacity: el.opacity ?? 1,
                    zIndex: el.zIndex,
                    cursor: el.locked ? 'default' : 'pointer',
                  }}
                  className={`select-none ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                >
                  {el.type === 'shape' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: el.fill || 'transparent',
                        borderColor: el.stroke || 'transparent',
                        borderWidth: el.strokeWidth ? `${el.strokeWidth * scale}px` : 0,
                        borderRadius:
                          el.shapeType === 'circle'
                            ? '9999px'
                            : el.borderRadius
                            ? `${el.borderRadius * scale}px`
                            : 0,
                      }}
                    />
                  )}

                  {el.type === 'text' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${(el.fontSize || 16) * scale}px`,
                        fontWeight: el.fontWeight || 'normal',
                        color: el.color || '#000000',
                        textAlign: el.textAlign || 'left',
                        fontFamily: el.fontFamily || 'SolaimanLipi, "Noto Sans Bengali", sans-serif',
                        lineHeight: el.lineHeight || 1.3,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {el.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
