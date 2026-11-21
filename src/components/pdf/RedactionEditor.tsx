import { useEffect, useRef, useState } from 'react';
import { convertPdfToImages } from '../../services/pdfToImageService';
import type { RedactRect } from '../../services/pdfRedactService';

interface RedactionEditorProps {
  file: File;
  rects: RedactRect[];
  onChange: (rects: RedactRect[]) => void;
  language: 'bn' | 'en';
}

/** Shows one page at a time and lets the user drag boxes over the areas to hide. */
export default function RedactionEditor({ file, rects, onChange, language }: RedactionEditorProps) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const bn = language === 'bn';

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setLoading(true);
    setError(null);
    convertPdfToImages(file, { format: 'image/jpeg', quality: 0.8, scale: 1.2, pageNumbers: [page] })
      .then((res) => {
        if (cancelled) return;
        setTotalPages(res.totalPages);
        url = URL.createObjectURL(res.images[0].blob);
        setPageUrl(url);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, page]);

  const point = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const down = (e: React.PointerEvent) => {
    boxRef.current?.setPointerCapture(e.pointerId);
    startRef.current = point(e);
    setDraft({ ...startRef.current, w: 0, h: 0 });
  };
  const move = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const p = point(e);
    const s = startRef.current;
    setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => {
    if (draft && draft.w > 0.01 && draft.h > 0.005) {
      onChange([...rects, { page, ...draft }]);
    }
    startRef.current = null;
    setDraft(null);
  };

  const pageRects = rects.filter((r) => r.page === page);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
        >
          ‹
        </button>
        <span>
          {bn ? `পৃষ্ঠা ${page} / ${totalPages}` : `Page ${page} / ${totalPages}`} · {bn ? 'মোট বাক্স' : 'Boxes'}: {rects.length}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40"
        >
          ›
        </button>
      </div>

      {loading && <p className="text-[11px] text-slate-400">{bn ? 'পৃষ্ঠা লোড হচ্ছে...' : 'Loading page...'}</p>}
      {error && <p className="text-[11px] text-red-300">{error}</p>}

      {pageUrl && (
        <div
          ref={boxRef}
          className="relative w-full select-none touch-none cursor-crosshair border border-slate-600"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
        >
          <img src={pageUrl} alt="" draggable={false} className="w-full block" />
          {pageRects.map((r, i) => (
            <div
              key={i}
              className="absolute bg-black/85 border border-red-400"
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
            />
          ))}
          {draft && (
            <div
              className="absolute bg-black/50 border border-red-300"
              style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {bn ? 'মাউস বা আঙুল টেনে যে অংশ লুকাতে চান তার ওপর বাক্স আঁকুন' : 'Drag to draw boxes over what you want to hide'}
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={pageRects.length === 0}
            onClick={() => {
              const idx = rects.map((r) => r.page).lastIndexOf(page);
              if (idx >= 0) onChange(rects.filter((_, i) => i !== idx));
            }}
            className="text-[11px] text-teal-300 hover:underline disabled:opacity-40"
          >
            {bn ? 'শেষ বাক্স বাতিল' : 'Undo box'}
          </button>
          <button
            type="button"
            disabled={rects.length === 0}
            onClick={() => onChange([])}
            className="text-[11px] text-red-300 hover:underline disabled:opacity-40"
          >
            {bn ? 'সব মুছুন' : 'Clear all'}
          </button>
        </div>
      </div>
    </div>
  );
}
