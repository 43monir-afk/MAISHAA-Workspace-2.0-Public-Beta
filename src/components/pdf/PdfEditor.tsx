import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MousePointer2,
  Type,
  Image as ImageIcon,
  Eraser,
  Highlighter,
  Underline,
  Strikethrough,
  Pencil,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  PenLine,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Search,
  LayoutGrid,
  Download,
  Upload,
  RotateCw,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  FilePlus,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import SignaturePad from './SignaturePad';
import {
  applyEdits,
  buildReplaceOps,
  countMatches,
  createBlankPdf,
  deletePageBytes,
  extractPageTextItems,
  FIRST_BASELINE,
  LINE_HEIGHT,
  loadPdfJsDocument,
  movePageBytes,
  newOpId,
  readPageInfos,
  renderPdfPage,
  replaceInText,
  rotatePageBytes,
  type EditOp,
  type FontFamilyKey,
  type PageTextItem,
  type PdfPageInfo,
} from '../../services/pdfEditorService';
import { validateFileInput } from '../../utils/privacy';
import { downloadFileOnce } from '../../utils/downloadHelper';

type Tool =
  | 'select'
  | 'text'
  | 'image'
  | 'whiteout'
  | 'highlight'
  | 'underline'
  | 'strike'
  | 'draw'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow';

interface Snapshot {
  bytes: Uint8Array;
  ops: EditOp[];
}

interface PendingImage {
  bytes: Uint8Array;
  mime: 'image/png' | 'image/jpeg';
  /** width / height */
  aspect: number;
  /** default width as a fraction of the page width */
  defaultW: number;
}

interface PdfEditorProps {
  language: 'bn' | 'en';
  initialFile?: File | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const FONT_CSS: Record<FontFamilyKey, string> = {
  sans: 'Helvetica, Arial, "Noto Sans Bengali", sans-serif',
  serif: '"Times New Roman", Times, "Noto Serif Bengali", serif',
  mono: '"Courier New", Courier, monospace',
};
const TOOL_DEFAULT_COLOR: Partial<Record<Tool, string>> = {
  text: '#000000',
  highlight: '#ffe600',
  underline: '#e11d48',
  strike: '#e11d48',
  draw: '#e11d48',
  rect: '#e11d48',
  ellipse: '#e11d48',
  line: '#e11d48',
  arrow: '#e11d48',
};

/** Read any browser-decodable image and return PNG/JPEG bytes that pdf-lib can embed. */
async function readImageFile(file: File): Promise<{ bytes: Uint8Array; mime: 'image/png' | 'image/jpeg'; aspect: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This image could not be read.'));
      el.src = url;
    });
    const aspect = img.naturalWidth / img.naturalHeight;
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      return { bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type as 'image/png' | 'image/jpeg', aspect };
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')?.drawImage(img, 0, 0);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('This image could not be converted.');
    return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/png', aspect };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ───────────────────────── Small pieces ─────────────────────────

function OpImage({ bytes, mime, style, onPointerDown }: { bytes: Uint8Array; mime: string; style: React.CSSProperties; onPointerDown?: (e: React.PointerEvent) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bytes, mime]);
  if (!url) return null;
  return <img src={url} alt="" draggable={false} style={style} onPointerDown={onPointerDown} />;
}

/** A textarea that takes focus shortly after it appears (the browser's own mousedown would otherwise steal it back). */
function FocusTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);
  return <textarea ref={ref} {...props} />;
}

function PageThumb({ pdfDoc, pageNo, rotation }: { pdfDoc: any; pageNo: number; rotation: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !pdfDoc) return;
    const h = renderPdfPage(pdfDoc, pageNo, ref.current, 0.22, 1);
    h.promise.catch(() => undefined);
    return () => h.cancel();
  }, [pdfDoc, pageNo]);
  return <canvas ref={ref} className="max-h-28 max-w-full bg-white rounded shadow" data-rotation={rotation} />;
}

interface PageViewProps {
  pageNo: number;
  info: PdfPageInfo;
  scale: number;
  pdfDoc: any;
  tool: Tool;
  color: string;
  size: number;
  strokeWidth: number;
  ops: EditOp[];
  items: PageTextItem[] | undefined;
  selectedId: string | null;
  editingId: string | null;
  pendingImage: PendingImage | null;
  lockedMsg: string;
  onNeedItems: (page: number) => void;
  onAddOp: (op: EditOp) => void;
  onUpdateOp: (id: string, patch: Partial<EditOp>) => void;
  onBeginChange: () => void;
  onRemoveOp: (id: string, silent?: boolean) => void;
  onSelect: (id: string | null) => void;
  onEditing: (id: string | null) => void;
  onImagePlaced: () => void;
}

function PageView(p: PageViewProps) {
  const { pageNo, info, scale, pdfDoc, tool, ops, items } = p;
  const W = info.width * scale;
  const H = info.height * scale;
  const locked = info.rotation !== 0;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<{ kind: Tool; x0: number; y0: number; x1: number; y1: number; points: { x: number; y: number }[] } | null>(null);
  const [newText, setNewText] = useState<{ x: number; y: number; value: string } | null>(null);
  const moveRef = useRef<{ id: string; mode: 'move' | 'resize'; px: number; py: number; orig: any; pushed: boolean } | null>(null);

  // lazy render
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !canvasRef.current || !pdfDoc) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const h = renderPdfPage(pdfDoc, pageNo, canvasRef.current, scale, dpr);
    h.promise.catch(() => undefined);
    return () => h.cancel();
  }, [visible, pdfDoc, pageNo, scale]);

  useEffect(() => {
    if (visible && tool === 'select' && !locked && !items) p.onNeedItems(pageNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tool, locked, items, pageNo]);

  const pt = (e: React.PointerEvent) => {
    const r = layerRef.current!.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  // ── creating things on the empty page ──
  const onLayerDown = (e: React.PointerEvent) => {
    if (locked) return;
    const q = pt(e);
    if (tool === 'select') {
      p.onSelect(null);
      return;
    }
    if (tool === 'text') {
      if (newText) return;
      setNewText({ x: q.x, y: q.y, value: '' });
      p.onSelect(null);
      return;
    }
    if (tool === 'image') {
      if (!p.pendingImage) return;
      const img = p.pendingImage;
      const w = img.defaultW;
      const hPt = (w * info.width) / img.aspect;
      const h = hPt / info.height;
      p.onAddOp({
        id: newOpId(), kind: 'image', page: pageNo,
        x: Math.min(Math.max(0, q.x - w / 2), 1 - w), y: Math.min(Math.max(0, q.y - h / 2), Math.max(0, 1 - h)),
        w, h, bytes: img.bytes, mime: img.mime,
      });
      p.onImagePlaced();
      return;
    }
    layerRef.current?.setPointerCapture(e.pointerId);
    setDraft({ kind: tool, x0: q.x, y0: q.y, x1: q.x, y1: q.y, points: [q] });
  };

  const onLayerMove = (e: React.PointerEvent) => {
    if (moveRef.current) {
      onOpMove(e);
      return;
    }
    if (!draft) return;
    const q = pt(e);
    setDraft({ ...draft, x1: q.x, y1: q.y, points: draft.kind === 'draw' ? [...draft.points, q] : draft.points });
  };

  const onLayerUp = () => {
    if (moveRef.current) {
      moveRef.current = null;
      return;
    }
    if (!draft) return;
    const d = draft;
    setDraft(null);
    const x = Math.min(d.x0, d.x1);
    const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0);
    const h = Math.abs(d.y1 - d.y0);
    const sw = Math.max(0.5, p.strokeWidth);
    if (d.kind === 'draw') {
      if (d.points.length > 1) p.onAddOp({ id: newOpId(), kind: 'draw', page: pageNo, points: d.points, color: p.color, width: sw });
      return;
    }
    if (d.kind === 'line' || d.kind === 'arrow') {
      if (Math.hypot((d.x1 - d.x0) * info.width, (d.y1 - d.y0) * info.height) < 4) return;
      p.onAddOp({ id: newOpId(), kind: 'shape', shape: d.kind, page: pageNo, x: d.x0, y: d.y0, w: d.x1 - d.x0, h: d.y1 - d.y0, color: p.color, width: sw });
      return;
    }
    if (w * info.width < 3 || h * info.height < 3) return;
    if (d.kind === 'whiteout') p.onAddOp({ id: newOpId(), kind: 'whiteout', page: pageNo, x, y, w, h });
    else if (d.kind === 'highlight' || d.kind === 'underline' || d.kind === 'strike')
      p.onAddOp({ id: newOpId(), kind: 'markup', style: d.kind, page: pageNo, x, y, w, h, color: p.color });
    else if (d.kind === 'rect' || d.kind === 'ellipse')
      p.onAddOp({ id: newOpId(), kind: 'shape', shape: d.kind, page: pageNo, x, y, w, h, color: p.color, width: sw });
  };

  // ── moving / resizing existing things ──
  const startOpDrag = (e: React.PointerEvent, op: EditOp, mode: 'move' | 'resize' = 'move') => {
    if (tool !== 'select' || locked) return;
    e.stopPropagation();
    p.onSelect(op.id);
    if (p.editingId === op.id) return;
    layerRef.current?.setPointerCapture(e.pointerId);
    const q = pt(e);
    moveRef.current = { id: op.id, mode, px: q.x, py: q.y, orig: JSON.parse(JSON.stringify({ ...op, bytes: undefined })), pushed: false };
  };

  const onOpMove = (e: React.PointerEvent) => {
    const m = moveRef.current;
    if (!m) return;
    const q = pt(e);
    const dx = q.x - m.px;
    const dy = q.y - m.py;
    if (!m.pushed && (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002)) {
      m.pushed = true;
      p.onBeginChange();
    }
    const o = m.orig;
    if (m.mode === 'resize') {
      const ratio = (o.h * H) / (o.w * W);
      const nw = Math.max(0.03, Math.min(1 - o.x, o.w + dx));
      p.onUpdateOp(m.id, { w: nw, h: (nw * W * ratio) / H } as Partial<EditOp>);
      return;
    }
    if (o.kind === 'draw') {
      const pts = (o.points as { x: number; y: number }[]).map((pp) => ({ x: pp.x + dx, y: pp.y + dy }));
      p.onUpdateOp(m.id, { points: pts } as Partial<EditOp>);
    } else if (o.kind === 'shape' && (o.shape === 'line' || o.shape === 'arrow')) {
      p.onUpdateOp(m.id, { x: o.x + dx, y: o.y + dy } as Partial<EditOp>);
    } else if (o.kind === 'textEdit') {
      const cdy = Math.max(-o.y, dy);
      p.onUpdateOp(m.id, { x: Math.max(0, o.x + dx), y: o.y + cdy, baseline: o.baseline + cdy } as Partial<EditOp>);
    } else {
      p.onUpdateOp(m.id, { x: Math.max(0, o.x + dx), y: Math.max(0, o.y + dy) } as Partial<EditOp>);
    }
  };

  const commitNewText = () => {
    if (newText && newText.value.trim()) {
      p.onAddOp({ id: newOpId(), kind: 'text', page: pageNo, x: newText.x, y: newText.y, text: newText.value, size: p.size, color: p.color });
    }
    setNewText(null);
  };

  const selStyle = (id: string): React.CSSProperties =>
    p.selectedId === id ? { outline: '2px solid #14b8a6', outlineOffset: 1 } : {};
  const ptr = tool === 'select' ? 'auto' : 'none';

  const textareaFor = (op: Extract<EditOp, { kind: 'text' | 'textEdit' }>, left: number, top: number, minW: number) => {
    const lines = op.text.split('\n');
    const fs = op.size * scale;
    return (
      <FocusTextarea
        value={op.text}
        onChange={(e) => p.onUpdateOp(op.id, { text: e.target.value } as Partial<EditOp>)}
        onBlur={() => {
          if (!op.text.trim() && op.kind === 'text') p.onRemoveOp(op.id, true);
          if (op.kind === 'textEdit') {
            const src = items?.find((it) => it.id === op.srcId);
            if (src && src.str === op.text && Math.abs(src.x - op.x) < 1e-6 && Math.abs(src.baseline - op.baseline) < 1e-6) {
              p.onRemoveOp(op.id, true);
            }
          }
          p.onEditing(null);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        rows={lines.length}
        spellCheck={false}
        style={{
          position: 'absolute', left, top, minWidth: minW,
          width: Math.max(minW, Math.max(...lines.map((l) => l.length), 2) * fs * 0.6 + 12),
          fontSize: fs, lineHeight: LINE_HEIGHT, color: op.color, fontFamily: FONT_CSS[op.kind === 'textEdit' ? op.family : op.family ?? 'sans'],
          background: '#fff', border: '1px solid #14b8a6', outline: 'none', resize: 'none', padding: 0, margin: 0, overflow: 'hidden', whiteSpace: 'pre', zIndex: 5,
        }}
      />
    );
  };

  const svgOps = ops.filter((o) => o.kind === 'draw' || o.kind === 'shape');

  return (
    <div id={`pdfed-page-${pageNo}`} ref={wrapRef} className="relative mx-auto mb-4 bg-white shadow-lg shadow-black/30" style={{ width: W, height: H }}>
      <canvas ref={canvasRef} style={{ width: W, height: H, display: 'block' }} />
      <div
        ref={layerRef}
        className="absolute inset-0 select-none touch-none"
        style={{ cursor: locked ? 'not-allowed' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair' }}
        onPointerDown={onLayerDown}
        onPointerMove={onLayerMove}
        onPointerUp={onLayerUp}
      >
        {locked && (
          <div className="absolute top-1 left-1 right-1 text-[11px] text-amber-900 bg-amber-100/95 rounded px-2 py-1 pointer-events-none">{p.lockedMsg}</div>
        )}

        {/* existing text: click to edit */}
        {tool === 'select' && !locked && items?.map((it) => {
          const taken = ops.some((o) => o.kind === 'textEdit' && o.srcId === it.id);
          if (taken) return null;
          return (
            <div
              key={it.id}
              title={it.str}
              onPointerDown={(e) => {
                e.stopPropagation();
                const op: EditOp = {
                  id: newOpId(), kind: 'textEdit', srcId: it.id, page: pageNo, x: it.x, y: it.y, w: it.w, h: it.h,
                  baseline: it.baseline, text: it.str, size: it.size, color: '#000000', family: it.family,
                };
                p.onAddOp(op);
                p.onEditing(op.id);
                p.onSelect(op.id);
              }}
              className="absolute hover:bg-teal-400/15 hover:outline hover:outline-1 hover:outline-teal-400 cursor-text"
              style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, width: `${it.w * 100}%`, height: `${it.h * 100}%` }}
            />
          );
        })}

        {/* box-like things */}
        {ops.map((op) => {
          if (op.kind === 'whiteout') {
            return (
              <div key={op.id} onPointerDown={(e) => startOpDrag(e, op)}
                style={{ position: 'absolute', left: `${op.x * 100}%`, top: `${op.y * 100}%`, width: `${op.w * 100}%`, height: `${op.h * 100}%`, background: '#fff', cursor: tool === 'select' ? 'move' : undefined, pointerEvents: ptr, ...selStyle(op.id) }} />
            );
          }
          if (op.kind === 'markup') {
            const common: React.CSSProperties = { position: 'absolute', left: `${op.x * 100}%`, top: `${op.y * 100}%`, width: `${op.w * 100}%`, height: `${op.h * 100}%`, cursor: tool === 'select' ? 'move' : undefined, pointerEvents: ptr, ...selStyle(op.id) };
            if (op.style === 'highlight') return <div key={op.id} onPointerDown={(e) => startOpDrag(e, op)} style={{ ...common, background: op.color, opacity: 0.35, mixBlendMode: 'multiply' }} />;
            return (
              <div key={op.id} onPointerDown={(e) => startOpDrag(e, op)} style={common}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: op.style === 'strike' ? '50%' : '92%', borderTop: `${Math.max(1, op.h * H * 0.07)}px solid ${op.color}` }} />
              </div>
            );
          }
          if (op.kind === 'image') {
            return (
              <div key={op.id} style={{ position: 'absolute', left: `${op.x * 100}%`, top: `${op.y * 100}%`, width: `${op.w * 100}%`, height: `${op.h * 100}%`, pointerEvents: ptr, cursor: tool === 'select' ? 'move' : undefined, ...selStyle(op.id) }}
                onPointerDown={(e) => startOpDrag(e, op)}>
                <OpImage bytes={op.bytes} mime={op.mime} style={{ width: '100%', height: '100%', display: 'block' }} />
                {p.selectedId === op.id && tool === 'select' && (
                  <div onPointerDown={(e) => startOpDrag(e, op, 'resize')} style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, background: '#14b8a6', borderRadius: 2, cursor: 'nwse-resize' }} />
                )}
              </div>
            );
          }
          if (op.kind === 'textEdit') {
            const fs = op.size * scale;
            const tx = op.x * W;
            const ty = op.baseline * H - fs * FIRST_BASELINE;
            return (
              <React.Fragment key={op.id}>
                <div onPointerDown={(e) => startOpDrag(e, op)} onDoubleClick={() => p.onEditing(op.id)}
                  style={{ position: 'absolute', left: op.x * W - 1, top: op.y * H - 1, width: op.w * W + 2, height: op.h * H + 2, background: '#fff', cursor: tool === 'select' ? 'move' : undefined, pointerEvents: ptr, ...selStyle(op.id) }} />
                {p.editingId === op.id ? textareaFor(op, tx, ty, op.w * W + 12) : (
                  <div style={{ position: 'absolute', left: tx, top: ty, fontSize: fs, lineHeight: LINE_HEIGHT, color: op.color, fontFamily: FONT_CSS[op.family], whiteSpace: 'pre', pointerEvents: 'none' }}>{op.text}</div>
                )}
              </React.Fragment>
            );
          }
          if (op.kind === 'text') {
            const fs = op.size * scale;
            if (p.editingId === op.id) return <React.Fragment key={op.id}>{textareaFor(op, op.x * W, op.y * H, 40)}</React.Fragment>;
            return (
              <div key={op.id} onPointerDown={(e) => startOpDrag(e, op)} onDoubleClick={() => p.onEditing(op.id)}
                style={{ position: 'absolute', left: `${op.x * 100}%`, top: `${op.y * 100}%`, fontSize: fs, lineHeight: LINE_HEIGHT, color: op.color, fontFamily: FONT_CSS[op.family ?? 'sans'], fontWeight: op.bold ? 700 : 400, whiteSpace: 'pre', cursor: tool === 'select' ? 'move' : undefined, pointerEvents: ptr, ...selStyle(op.id) }}>
                {op.text}
              </div>
            );
          }
          return null;
        })}

        {/* vector things */}
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}>
          {svgOps.map((op) => {
            const sel = p.selectedId === op.id;
            const hit = tool === 'select' ? 'stroke' : 'none';
            if (op.kind === 'draw') {
              const d = op.points.map((q, i) => `${i ? 'L' : 'M'}${q.x * W},${q.y * H}`).join(' ');
              return (
                <g key={op.id} onPointerDown={(e) => startOpDrag(e as unknown as React.PointerEvent, op)}>
                  <path d={d} fill="none" stroke={sel ? '#14b8a6' : 'transparent'} strokeWidth={op.width * scale + 6} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: hit as any, opacity: 0.35 }} />
                  <path d={d} fill="none" stroke={op.color} strokeWidth={op.width * scale} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            }
            if (op.kind !== 'shape') return null;
            if (op.shape === 'rect' || op.shape === 'ellipse') {
              const x = op.x * W, y = op.y * H, w = op.w * W, h = op.h * H;
              const common = { fill: 'none', stroke: op.color, strokeWidth: op.width * scale, style: { pointerEvents: hit as any }, onPointerDown: (e: React.PointerEvent<SVGElement>) => startOpDrag(e as unknown as React.PointerEvent, op) };
              return (
                <g key={op.id}>
                  {op.shape === 'rect' ? <rect x={x} y={y} width={w} height={h} {...common} /> : <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />}
                  {sel && <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke="#14b8a6" strokeDasharray="4 3" />}
                </g>
              );
            }
            const x1 = op.x * W, y1 = op.y * H, x2 = (op.x + op.w) * W, y2 = (op.y + op.h) * H;
            const ang = Math.atan2(y2 - y1, x2 - x1);
            const len = Math.max(8, op.width * 4) * scale;
            return (
              <g key={op.id} onPointerDown={(e) => startOpDrag(e as unknown as React.PointerEvent, op)}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={sel ? '#14b8a6' : 'transparent'} strokeWidth={op.width * scale + 8} style={{ pointerEvents: hit as any, opacity: 0.35 }} />
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={op.color} strokeWidth={op.width * scale} strokeLinecap="round" />
                {op.shape === 'arrow' && [-1, 1].map((s) => (
                  <line key={s} x1={x2} y1={y2} x2={x2 - len * Math.cos(ang + s * 0.45)} y2={y2 - len * Math.sin(ang + s * 0.45)} stroke={op.color} strokeWidth={op.width * scale} strokeLinecap="round" />
                ))}
              </g>
            );
          })}

          {/* live preview while dragging */}
          {draft && (() => {
            const x = Math.min(draft.x0, draft.x1) * W, y = Math.min(draft.y0, draft.y1) * H;
            const w = Math.abs(draft.x1 - draft.x0) * W, h = Math.abs(draft.y1 - draft.y0) * H;
            if (draft.kind === 'draw') return <path d={draft.points.map((q, i) => `${i ? 'L' : 'M'}${q.x * W},${q.y * H}`).join(' ')} fill="none" stroke={p.color} strokeWidth={p.strokeWidth * scale} strokeLinecap="round" />;
            if (draft.kind === 'line' || draft.kind === 'arrow') return <line x1={draft.x0 * W} y1={draft.y0 * H} x2={draft.x1 * W} y2={draft.y1 * H} stroke={p.color} strokeWidth={p.strokeWidth * scale} />;
            if (draft.kind === 'ellipse') return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={p.color} strokeWidth={p.strokeWidth * scale} />;
            const fill = draft.kind === 'whiteout' ? '#ffffff' : draft.kind === 'highlight' ? p.color : 'none';
            return <rect x={x} y={y} width={w} height={h} fill={fill} fillOpacity={draft.kind === 'highlight' ? 0.35 : 1} stroke={draft.kind === 'whiteout' ? '#94a3b8' : p.color} strokeWidth={1} strokeDasharray={draft.kind === 'whiteout' ? '4 3' : undefined} />;
          })()}
        </svg>

        {/* new text being typed */}
        {newText && (
          <FocusTextarea
            value={newText.value}
            onChange={(e) => setNewText({ ...newText, value: e.target.value })}
            onBlur={commitNewText}
            onPointerDown={(e) => e.stopPropagation()}
            rows={Math.max(1, newText.value.split('\n').length)}
            placeholder="…"
            spellCheck={false}
            style={{
              position: 'absolute', left: newText.x * W, top: newText.y * H,
              width: Math.max(80, Math.max(...newText.value.split('\n').map((l) => l.length), 2) * p.size * scale * 0.6 + 12),
              fontSize: p.size * scale, lineHeight: LINE_HEIGHT, color: p.color, fontFamily: FONT_CSS.sans,
              background: 'rgba(255,255,255,.9)', border: '1px dashed #14b8a6', outline: 'none', resize: 'none', padding: 0, margin: 0, overflow: 'hidden', whiteSpace: 'pre', zIndex: 6,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ───────────────────────── The editor ─────────────────────────

export default function PdfEditor({ language, initialFile }: PdfEditorProps) {
  const bn = language === 'bn';
  const tr = (b: string, e: string) => (bn ? b : e);

  const [fileName, setFileName] = useState('document.pdf');
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [ops, setOps] = useState<EditOp[]>([]);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(14);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [scale, setScale] = useState(1.2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [panel, setPanel] = useState<'none' | 'find' | 'pages' | 'sign'>('none');
  const [signPng, setSignPng] = useState<Uint8Array | null>(null);

  const [textItems, setTextItems] = useState<Record<number, PageTextItem[]>>({});
  const loadingItems = useRef<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [found, setFound] = useState<{ page: number; count: number }[] | null>(null);

  const imageInput = useRef<HTMLInputElement>(null);
  const lastStyleEdit = useRef(0);
  const pushStyleHistory = () => {
    const now = Date.now();
    if (now - lastStyleEdit.current > 1000) pushHistory();
    lastStyleEdit.current = now;
  };
  const docRef = useRef<any>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fitOnLoad = useRef(true);
  const openedFile = useRef<File | null>(null);

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  // ── opening a file ──
  const openBytes = useCallback((b: Uint8Array, name: string) => {
    setFileName(name);
    setBytes(b);
    setOps([]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(null);
    setEditingId(null);
    setFound(null);
    setError(null);
    setNotice(null);
    fitOnLoad.current = true;
  }, []);

  const openFile = useCallback(async (file: File) => {
    const v = validateFileInput(file);
    if (!v.isValid) {
      setError(v.error || 'Invalid file');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError(tr('শুধু PDF ফাইল খোলা যায়।', 'Only PDF files can be opened.'));
      return;
    }
    try {
      openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
    } catch (e) {
      fail(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBytes]);

  useEffect(() => {
    if (initialFile && openedFile.current !== initialFile) {
      openedFile.current = initialFile;
      void openFile(initialFile);
    }
  }, [initialFile, openFile]);

  // ── PDF.js document for the current bytes ──
  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    (async () => {
      try {
        const doc = await loadPdfJsDocument(bytes);
        const infos = await readPageInfos(doc);
        if (cancelled) {
          void doc.destroy?.();
          return;
        }
        const prev = docRef.current;
        docRef.current = doc;
        setPdfDoc(doc);
        setPages(infos);
        setTextItems({});
        loadingItems.current = new Set();
        if (prev && prev !== doc) void prev.destroy?.();
        if (fitOnLoad.current && infos.length) {
          fitOnLoad.current = false;
          const w = scrollerRef.current?.clientWidth || 800;
          setScale(Math.min(1.5, Math.max(0.4, (w - 32) / infos[0].width)));
        }
      } catch (e) {
        if (!cancelled) fail(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes]);

  // ── history ──
  const pushHistory = useCallback(() => {
    if (!bytes) return;
    setUndoStack((u) => [...u.slice(-49), { bytes, ops }]);
    setRedoStack([]);
  }, [bytes, ops]);

  const undo = useCallback(() => {
    if (!bytes || busy || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack((r) => [...r, { bytes, ops }]);
    setBytes(prev.bytes);
    setOps(prev.ops);
    setSelectedId(null);
    setEditingId(null);
  }, [bytes, ops, undoStack, busy]);

  const redo = useCallback(() => {
    if (!bytes || busy || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack((u) => [...u, { bytes, ops }]);
    setBytes(next.bytes);
    setOps(next.ops);
    setSelectedId(null);
    setEditingId(null);
  }, [bytes, ops, redoStack, busy]);

  const addOp = useCallback((op: EditOp) => {
    pushHistory();
    setOps((o) => [...o, op]);
    setSelectedId(op.id);
  }, [pushHistory]);

  const updateOp = useCallback((id: string, patch: Partial<EditOp>) => {
    setOps((o) => o.map((x) => (x.id === id ? ({ ...x, ...patch } as EditOp) : x)));
  }, []);

  const removeOp = useCallback((id: string, silent?: boolean) => {
    if (!silent) pushHistory();
    setOps((o) => o.filter((x) => x.id !== id));
    setSelectedId((s) => (s === id ? null : s));
    setEditingId((s) => (s === id ? null : s));
  }, [pushHistory]);

  const selected = ops.find((o) => o.id === selectedId) || null;

  // keyboard: delete / undo / redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removeOp(selectedId);
      } else if (e.key === 'Escape') {
        setEditingId(null);
        setSelectedId(null);
        if (tool !== 'select') setTool('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, removeOp, selectedId, tool]);

  // ── tool / style ──
  const chooseTool = (t: Tool) => {
    setTool(t);
    setEditingId(null);
    const c = TOOL_DEFAULT_COLOR[t];
    if (c) setColor(c);
    if (t === 'image' && !pendingImage) imageInput.current?.click();
    if (t !== 'image') setPendingImage(null);
  };

  const changeColor = (c: string) => {
    setColor(c);
    if (selected && 'color' in selected) {
      pushStyleHistory();
      updateOp(selected.id, { color: c } as Partial<EditOp>);
    }
  };
  const changeSize = (n: number) => {
    const v = Math.min(200, Math.max(4, n || 4));
    setSize(v);
    if (selected && (selected.kind === 'text' || selected.kind === 'textEdit')) {
      pushStyleHistory();
      updateOp(selected.id, { size: v } as Partial<EditOp>);
    }
  };
  const changeStroke = (n: number) => {
    const v = Math.min(30, Math.max(0.5, n || 1));
    setStrokeWidth(v);
    if (selected && (selected.kind === 'draw' || selected.kind === 'shape')) {
      pushStyleHistory();
      updateOp(selected.id, { width: v } as Partial<EditOp>);
    }
  };

  // ── images / signature ──
  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(tr('ছবি ১০ MB-এর বেশি হতে পারবে না।', 'The image must be 10 MB or smaller.'));
      return;
    }
    try {
      const img = await readImageFile(file);
      setPendingImage({ ...img, defaultW: 0.3 });
      setTool('image');
      setNotice(tr('পেজে যেখানে ছবি চান সেখানে ক্লিক করুন।', 'Click on the page where the image should go.'));
    } catch (e) {
      fail(e);
    }
  };

  const useSignature = async () => {
    if (!signPng) return;
    try {
      const blob = new Blob([signPng as Uint8Array<ArrayBuffer>], { type: 'image/png' });
      const f = new File([blob], 'signature.png', { type: 'image/png' });
      const img = await readImageFile(f);
      setPendingImage({ ...img, defaultW: 0.22 });
      setTool('image');
      setPanel('none');
      setNotice(tr('পেজে যেখানে সই বসাতে চান সেখানে ক্লিক করুন।', 'Click on the page where the signature should go.'));
    } catch (e) {
      fail(e);
    }
  };

  // ── text items for "click to edit" and find ──
  const loadItems = useCallback(async (page: number): Promise<PageTextItem[]> => {
    const doc = docRef.current;
    if (!doc) return [];
    const items = await extractPageTextItems(doc, page);
    if (docRef.current === doc) setTextItems((m) => ({ ...m, [page]: items }));
    return items;
  }, []);

  const needItems = useCallback((page: number) => {
    if (loadingItems.current.has(page)) return;
    loadingItems.current.add(page);
    void loadItems(page).catch(() => undefined);
  }, [loadItems]);

  const loadAllItems = async (): Promise<PageTextItem[]> => {
    const all: PageTextItem[] = [];
    for (let p = 1; p <= pages.length; p++) {
      all.push(...(textItems[p] ?? (await loadItems(p))));
    }
    return all;
  };

  const effectiveText = (it: PageTextItem) => {
    const op = ops.find((o) => o.kind === 'textEdit' && o.srcId === it.id);
    return op && op.kind === 'textEdit' ? op.text : it.str;
  };

  const runFind = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const all = await loadAllItems();
      const perPage = new Map<number, number>();
      for (const it of all) {
        const c = countMatches(effectiveText(it), query, matchCase);
        if (c) perPage.set(it.page, (perPage.get(it.page) || 0) + c);
      }
      setFound([...perPage.entries()].map(([page, count]) => ({ page, count })));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const runReplaceAll = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const all = await loadAllItems();
      const fresh: EditOp[] = [];
      const patches = new Map<string, string>();
      for (const it of all) {
        const existing = ops.find((o) => o.kind === 'textEdit' && o.srcId === it.id);
        if (existing && existing.kind === 'textEdit') {
          const next = replaceInText(existing.text, query, replacement, matchCase);
          if (next !== null) patches.set(existing.id, next);
        } else {
          fresh.push(...buildReplaceOps([it], query, replacement, matchCase));
        }
      }
      const total = fresh.length + patches.size;
      if (total === 0) {
        setFound([]);
        setNotice(tr('কোনো মিল পাওয়া যায়নি।', 'No matches found.'));
        return;
      }
      pushHistory();
      setOps((o) => [...o.map((x) => (patches.has(x.id) ? ({ ...x, text: patches.get(x.id)! } as EditOp) : x)), ...fresh]);
      setFound(null);
      setNotice(tr(`${total}টি লেখা বদলানো হয়েছে। নতুন লেখা সাধারণ ফন্টে বসে, পুরোনো লেখা সাদা বাক্সে ঢাকা থাকে।`, `${total} text piece(s) replaced. New text uses a standard font; the old text is covered with a white box.`));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  // ── page operations ──
  const runPageOp = async (fn: (b: Uint8Array) => Promise<Uint8Array>) => {
    if (!bytes || busy) return;
    setBusy(true);
    setError(null);
    try {
      const baked = await applyEdits(bytes, ops);
      const next = await fn(baked);
      setUndoStack((u) => [...u.slice(-49), { bytes, ops }]);
      setRedoStack([]);
      setBytes(next);
      setOps([]);
      setSelectedId(null);
      setEditingId(null);
      setFound(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const goToPage = (n: number) => document.getElementById(`pdfed-page-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── download ──
  const download = async () => {
    if (!bytes || busy) return;
    setBusy(true);
    setError(null);
    try {
      const out = await applyEdits(bytes, ops);
      const blob = new Blob([out as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
      await downloadFileOnce(blob, `${fileName.replace(/\.pdf$/i, '') || 'document'}-edited.pdf`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const startBlank = async () => {
    try {
      openBytes(await createBlankPdf(), 'blank.pdf');
    } catch (e) {
      fail(e);
    }
  };

  // ───────────── render ─────────────
  const toolBtn = (t: Tool, Icon: React.ComponentType<{ className?: string }>, label: string) => (
    <button
      key={t}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={tool === t}
      onClick={() => chooseTool(t)}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] leading-tight border transition-colors ${
        tool === t ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
  const iconBtn = (onClick: () => void, Icon: React.ComponentType<{ className?: string }>, label: string, disabled = false) => (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick}
      className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40">
      <Icon className="w-4 h-4" />
    </button>
  );

  const lockedMsg = tr('এই পৃষ্ঠা ঘোরানো, তাই এতে এডিট করা যায় না। আগে এডিট করে তারপর ঘোরান।', 'This page is rotated, so it cannot be edited. Edit first, then rotate.');

  if (!bytes) {
    return (
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-semibold text-white">{tr('PDF এডিটর', 'PDF Editor')}</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          {tr(
            'লেখা বসান বা বদলান, ছবি ও সই যোগ করুন, হাইলাইট করুন, আঁকুন, তথ্য ঢাকুন, পৃষ্ঠা ঘোরান বা মুছুন। সব কাজ আপনার ব্রাউজারেই হয়, ফাইল কোথাও আপলোড হয় না।',
            'Add or change text, add images and a signature, highlight, draw, cover content, rotate or delete pages. Everything runs in your browser; the file is not uploaded.'
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold cursor-pointer hover:bg-teal-400">
            <Upload className="w-4 h-4" />
            {tr('PDF খুলুন', 'Open a PDF')}
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = ''; }} />
          </label>
          <button type="button" onClick={startBlank} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700">
            <FilePlus className="w-4 h-4" />
            {tr('ফাঁকা পৃষ্ঠা দিয়ে শুরু', 'Start with a blank page')}
          </button>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  const styleRow = (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
      <label className="flex items-center gap-1.5">
        {tr('রং', 'Color')}
        <input type="color" value={color} onChange={(e) => changeColor(e.target.value)} className="w-7 h-7 rounded border border-slate-700 bg-transparent" />
      </label>
      <label className="flex items-center gap-1.5">
        {tr('লেখার মাপ', 'Text size')}
        <input type="number" min={4} max={200} value={size} onChange={(e) => changeSize(Number(e.target.value))} className="w-14 px-1.5 py-1 rounded bg-slate-900 border border-slate-700" />
      </label>
      <label className="flex items-center gap-1.5">
        {tr('রেখার মোটা', 'Line width')}
        <input type="number" min={0.5} max={30} step={0.5} value={strokeWidth} onChange={(e) => changeStroke(Number(e.target.value))} className="w-14 px-1.5 py-1 rounded bg-slate-900 border border-slate-700" />
      </label>
      {selected && (
        <button type="button" onClick={() => removeOp(selected.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25">
          <Trash2 className="w-3.5 h-3.5" /> {tr('নির্বাচিত মুছুন', 'Delete selected')}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ''; }} />

      {/* toolbar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {toolBtn('select', MousePointer2, tr('নির্বাচন/লেখা এডিট', 'Select / Edit'))}
          {toolBtn('text', Type, tr('লেখা', 'Text'))}
          {toolBtn('image', ImageIcon, tr('ছবি', 'Image'))}
          <button type="button" onClick={() => setPanel(panel === 'sign' ? 'none' : 'sign')} aria-pressed={panel === 'sign'}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] leading-tight border ${panel === 'sign' ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}`}>
            <PenLine className="w-4 h-4" /><span>{tr('সই', 'Sign')}</span>
          </button>
          {toolBtn('whiteout', Eraser, tr('সাদা বাক্স', 'Whiteout'))}
          {toolBtn('highlight', Highlighter, tr('হাইলাইট', 'Highlight'))}
          {toolBtn('underline', Underline, tr('আন্ডারলাইন', 'Underline'))}
          {toolBtn('strike', Strikethrough, tr('কাটা দাগ', 'Strike'))}
          {toolBtn('draw', Pencil, tr('আঁকুন', 'Draw'))}
          {toolBtn('rect', Square, tr('বাক্স', 'Rectangle'))}
          {toolBtn('ellipse', Circle, tr('বৃত্ত', 'Ellipse'))}
          {toolBtn('line', Minus, tr('রেখা', 'Line'))}
          {toolBtn('arrow', MoveUpRight, tr('তীর', 'Arrow'))}
          <span className="w-px h-8 bg-slate-800 mx-1" />
          {iconBtn(undo, Undo2, tr('আগের অবস্থায়', 'Undo'), busy || undoStack.length === 0)}
          {iconBtn(redo, Redo2, tr('আবার করুন', 'Redo'), busy || redoStack.length === 0)}
          {iconBtn(() => setScale((s) => Math.max(0.4, +(s - 0.2).toFixed(2))), ZoomOut, tr('ছোট করুন', 'Zoom out'))}
          <span className="text-[11px] text-slate-400 w-10 text-center">{Math.round(scale * 100)}%</span>
          {iconBtn(() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2))), ZoomIn, tr('বড় করুন', 'Zoom in'))}
          <button type="button" onClick={() => setPanel(panel === 'find' ? 'none' : 'find')} aria-pressed={panel === 'find'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] border ${panel === 'find' ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}`}>
            <Search className="w-4 h-4" /> {tr('খুঁজুন ও বদলান', 'Find & Replace')}
          </button>
          <button type="button" onClick={() => setPanel(panel === 'pages' ? 'none' : 'pages')} aria-pressed={panel === 'pages'}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] border ${panel === 'pages' ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}`}>
            <LayoutGrid className="w-4 h-4" /> {tr('পৃষ্ঠাসমূহ', 'Pages')}
          </button>
          <span className="flex-1" />
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-[11px] cursor-pointer hover:bg-slate-800">
            <Upload className="w-4 h-4" /> {tr('অন্য PDF', 'Open another')}
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = ''; }} />
          </label>
          <button type="button" onClick={download} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {tr('প্রয়োগ করে ডাউনলোড', 'Apply & Download')}
          </button>
        </div>
        {styleRow}
      </div>

      {(error || notice) && (
        <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${error ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-teal-500/30 bg-teal-500/10 text-teal-100'}`} role={error ? 'alert' : 'status'}>
          {error && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="flex-1">{error || notice}</span>
          <button type="button" aria-label="close" onClick={() => { setError(null); setNotice(null); }}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 items-start">
        {panel !== 'none' && (
          <aside className="w-full lg:w-72 shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
            {panel === 'find' && (
              <div className="space-y-2 text-xs text-slate-300">
                <h4 className="font-semibold text-white">{tr('খুঁজুন ও বদলান', 'Find & Replace')}</h4>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('যা খুঁজবেন', 'Find')} className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700" />
                <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={tr('যা দিয়ে বদলাবেন', 'Replace with')} className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700" />
                <label className="flex items-center gap-2"><input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> {tr('বড়/ছোট হাতের অক্ষর মেলান', 'Match case')}</label>
                <div className="flex gap-2">
                  <button type="button" onClick={runFind} disabled={busy || !query.trim()} className="flex-1 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40">{tr('খুঁজুন', 'Find')}</button>
                  <button type="button" onClick={runReplaceAll} disabled={busy || !query.trim()} className="flex-1 px-2 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 disabled:opacity-40">{tr('সব বদলান', 'Replace all')}</button>
                </div>
                {found && (
                  found.length === 0
                    ? <p className="text-slate-400">{tr('কোনো মিল নেই।', 'No matches.')}</p>
                    : <ul className="space-y-1">{found.map((f) => (
                        <li key={f.page}><button type="button" onClick={() => goToPage(f.page)} className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">{tr(`পৃষ্ঠা ${f.page}: ${f.count}টি`, `Page ${f.page}: ${f.count}`)}</button></li>
                      ))}</ul>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {tr('এক লাইনের ভেতরের লেখাই খোঁজা যায়। স্ক্যান করা (ছবির) PDF-এ লেখা খোঁজা বা বদলানো যায় না।', 'Only text inside a single line is found. Scanned (image-only) PDFs have no text to find.')}
                </p>
              </div>
            )}

            {panel === 'sign' && (
              <div className="space-y-2 text-xs text-slate-300">
                <h4 className="font-semibold text-white">{tr('সই আঁকুন', 'Draw your signature')}</h4>
                <SignaturePad onChange={setSignPng} clearLabel={tr('মুছুন', 'Clear')} hint={tr('মাউস বা আঙুল দিয়ে সই করুন', 'Sign with mouse or finger')} />
                <button type="button" disabled={!signPng} onClick={useSignature} className="w-full px-2 py-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold disabled:opacity-40">{tr('পেজে বসান', 'Place on page')}</button>
              </div>
            )}

            {panel === 'pages' && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-white">{tr('পৃষ্ঠাসমূহ', 'Pages')} ({pages.length})</h4>
                <p className="text-[11px] text-slate-500">{tr('পৃষ্ঠা বদলানোর আগে বাকি এডিট নিজে থেকেই প্রয়োগ হয়ে যায়।', 'Pending edits are applied automatically before a page change.')}</p>
                {pages.map((pg, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <button type="button" onClick={() => goToPage(i + 1)} className="shrink-0" aria-label={`${tr('পৃষ্ঠা', 'Page')} ${i + 1}`}>
                      <PageThumb pdfDoc={pdfDoc} pageNo={i + 1} rotation={pg.rotation} />
                    </button>
                    <div className="flex flex-col gap-1 text-slate-300">
                      <span className="text-[11px]">{i + 1}</span>
                      <div className="flex gap-1">
                        {iconBtn(() => runPageOp((b) => rotatePageBytes(b, i, -90)), RotateCcw, tr('বাঁয়ে ঘোরান', 'Rotate left'), busy)}
                        {iconBtn(() => runPageOp((b) => rotatePageBytes(b, i, 90)), RotateCw, tr('ডানে ঘোরান', 'Rotate right'), busy)}
                      </div>
                      <div className="flex gap-1">
                        {iconBtn(() => runPageOp((b) => movePageBytes(b, i, i - 1)), ArrowUp, tr('উপরে', 'Move up'), busy || i === 0)}
                        {iconBtn(() => runPageOp((b) => movePageBytes(b, i, i + 1)), ArrowDown, tr('নীচে', 'Move down'), busy || i === pages.length - 1)}
                        {iconBtn(() => runPageOp((b) => deletePageBytes(b, i)), Trash2, tr('মুছুন', 'Delete page'), busy || pages.length <= 1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        <div ref={scrollerRef} className="flex-1 min-w-0 w-full overflow-auto rounded-2xl bg-slate-800/60 p-3 sm:p-4 max-h-[80vh]">
          {pages.length === 0 && !error && (
            <p className="text-xs text-slate-400 flex items-center gap-2 p-6"><Loader2 className="w-4 h-4 animate-spin" /> {tr('লোড হচ্ছে…', 'Loading…')}</p>
          )}
          {pages.map((info, i) => (
            <PageView
              key={i}
              pageNo={i + 1}
              info={info}
              scale={scale}
              pdfDoc={pdfDoc}
              tool={tool}
              color={color}
              size={size}
              strokeWidth={strokeWidth}
              ops={ops.filter((o) => o.page === i + 1)}
              items={textItems[i + 1]}
              selectedId={selectedId}
              editingId={editingId}
              pendingImage={pendingImage}
              lockedMsg={lockedMsg}
              onNeedItems={needItems}
              onAddOp={addOp}
              onUpdateOp={updateOp}
              onBeginChange={pushHistory}
              onRemoveOp={removeOp}
              onSelect={setSelectedId}
              onEditing={setEditingId}
              onImagePlaced={() => { setPendingImage(null); setTool('select'); setNotice(null); }}
            />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/80" />
        <span>
          {tr(
            'লেখা এডিট, বদলানো ও সাদা বাক্স পুরোনো লেখা শুধু ঢেকে দেয়, ফাইলের ভেতর থেকে মোছে না (কপি করলে পাওয়া যেতে পারে)। স্থায়ীভাবে লুকাতে "তথ্য লুকান (Redact)" ব্যবহার করুন। ঘোরানো পৃষ্ঠায় এডিট করা যায় না।',
            'Edit text, Replace and Whiteout only cover the old content; they do not remove it from the file (it may still be copyable). To hide something permanently use Redact PDF. Rotated pages cannot be edited.'
          )}
        </span>
      </p>
    </div>
  );
}
