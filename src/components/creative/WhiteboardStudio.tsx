/**
 * MAISHAA WORKSPACE — Whiteboard Studio
 * Expandable infinite canvas with Sticky Notes, Mind Maps, Connectors, Shapes, and Structured Export.
 */

import React, { useState, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { downloadFileOnce } from '../../utils/downloadHelper';
import {
  PenTool,
  Plus,
  StickyNote,
  Square,
  Circle,
  ArrowRight,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Sparkles,
  Move,
} from 'lucide-react';

interface BoardItem {
  id: string;
  type: 'note' | 'rect' | 'circle' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  textColor?: string;
}

export const WhiteboardStudio: React.FC = () => {
  const { language, showNotification } = useWorkspace();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const [items, setItems] = useState<BoardItem[]>([
    {
      id: 'note_1',
      type: 'note',
      x: 100,
      y: 100,
      width: 220,
      height: 180,
      text: 'মায়িশা ওয়ার্কস্পেস স্ট্র্যাটেজি ২০২৬\n• পিডিএফ অপটিমাইজেশন\n• ইউনিকোড বাংলা যুক্তাক্ষর সুরক্ষা\n• ক্যানভা-স্টাইল ডিজাইন স্টুডিও',
      color: '#FEF08A', // soft yellow sticky
      textColor: '#854D0E',
    },
    {
      id: 'note_2',
      type: 'note',
      x: 380,
      y: 100,
      width: 220,
      height: 180,
      text: 'অফিস প্রডাক্টিভিটি লক্ষ্যমাত্রা:\n১. শতভাগ ক্লায়েন্ট-সাইড এক্সপোর্ট\n২. বাল্ক সার্টিফিকেট ও আইডি কার্ড\n৩. নিরাপদ এআই অ্যাসিস্ট্যান্ট',
      color: '#BFDBFE', // soft blue sticky
      textColor: '#1E40AF',
    },
    {
      id: 'circle_1',
      type: 'circle',
      x: 250,
      y: 340,
      width: 200,
      height: 200,
      text: 'MAISHAA\nCENTRAL HUB',
      color: '#0B192C',
      textColor: '#38BDF8',
    },
  ]);

  const addStickyNote = (color = '#FEF08A', textColor = '#854D0E') => {
    const newItem: BoardItem = {
      id: `item_${Date.now()}`,
      type: 'note',
      x: Math.round(150 - pan.x / zoom + Math.random() * 40),
      y: Math.round(150 - pan.y / zoom + Math.random() * 40),
      width: 200,
      height: 160,
      text: language === 'bn' ? 'নতুন নোট লিখুন...' : 'New sticky note...',
      color,
      textColor,
    };
    setItems((prev) => [...prev, newItem]);
    setActiveItemId(newItem.id);
  };

  const addShape = (type: 'rect' | 'circle') => {
    const newItem: BoardItem = {
      id: `shape_${Date.now()}`,
      type,
      x: Math.round(200 - pan.x / zoom),
      y: Math.round(200 - pan.y / zoom),
      width: 160,
      height: type === 'circle' ? 160 : 100,
      text: type === 'circle' ? 'Mind Node' : 'Process Step',
      color: '#2563EB',
      textColor: '#FFFFFF',
    };
    setItems((prev) => [...prev, newItem]);
    setActiveItemId(newItem.id);
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (activeItemId === id) setActiveItemId(null);
  };

  const handleExportJson = () => {
    const data = JSON.stringify({ version: '1.0', items }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    downloadFileOnce(blob, 'MAISHAA-Whiteboard-Project.json');
    showNotification(language === 'bn' ? 'হোয়াইটবোর্ড প্রজেক্ট ডাউনলোড হয়েছে' : 'Whiteboard project exported');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#081021] text-slate-100 select-none overflow-hidden relative font-sans">
      {/* Top Floating Whiteboard Bar */}
      <header className="h-14 border-b border-slate-800/90 bg-[#0a1428]/90 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{language === 'bn' ? 'মায়িশা ইনফিনিট হোয়াইটবোর্ড' : 'MAISHAA Infinite Whiteboard'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                COLLAB READY
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? 'আইডিয়া ব্রেনস্টর্মিং, মাইন্ড ম্যাপ, স্টিকি নোটস ও ভিজ্যুয়াল ফ্রেমওয়ার্ক'
                : 'Brainstorming, mind maps, sticky notes & flow diagramming'}
            </p>
          </div>
        </div>

        {/* Toolbar Tools */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => addStickyNote('#FEF08A', '#854D0E')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Yellow Note</span>
          </button>
          <button
            onClick={() => addStickyNote('#BBF7D0', '#166534')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Green Note</span>
          </button>
          <button
            onClick={() => addShape('circle')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
          >
            <Circle className="w-3.5 h-3.5" />
            <span>Node</span>
          </button>
          <button
            onClick={() => addShape('rect')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Step</span>
          </button>
        </div>

        {/* Zoom & Export Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
              className="p-1 hover:text-white text-slate-400"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 font-bold">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
              className="p-1 hover:text-white text-slate-400"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 hover:text-white text-slate-400 ml-1"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Board</span>
          </button>
        </div>
      </header>

      {/* Infinite Canvas Viewport */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            setActiveItemId(null);
          }
        }}
        onMouseMove={(e) => {
          if (isPanning) {
            setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
          }
        }}
        onMouseUp={() => setIsPanning(false)}
      >
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {items.map((item) => {
            const isSelected = activeItemId === item.id;
            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveItemId(item.id);
                }}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.width}px`,
                  height: `${item.height}px`,
                  backgroundColor: item.color,
                  color: item.textColor || '#000000',
                  borderRadius: item.type === 'circle' ? '9999px' : '12px',
                }}
                className={`absolute p-4 shadow-xl flex flex-col justify-between transition-all select-text cursor-pointer ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#081021]' : ''
                }`}
              >
                <textarea
                  value={item.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setItems((prev) =>
                      prev.map((it) => (it.id === item.id ? { ...it, text: newText } : it))
                    );
                  }}
                  className="w-full h-full bg-transparent resize-none border-none outline-none text-xs font-medium leading-relaxed"
                />

                <div className="flex justify-end pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    className="p-1 hover:text-red-500 text-slate-500 rounded opacity-60 hover:opacity-100 transition-opacity"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
