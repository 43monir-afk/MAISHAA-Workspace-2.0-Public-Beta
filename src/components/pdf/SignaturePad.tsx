import { useEffect, useRef } from 'react';

interface SignaturePadProps {
  /** Called with PNG bytes after each stroke, or null when cleared. */
  onChange: (png: Uint8Array | null) => void;
  clearLabel: string;
  hint: string;
}

/** Minimal freehand signature pad (mouse, touch and pen) that exports a transparent PNG. */
export default function SignaturePad({ onChange, clearLabel, hint }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b1f6b';
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return;
      onChange(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  };

  const clear = () => {
    const c = canvasRef.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-28 rounded-xl bg-white border border-slate-600 touch-none cursor-crosshair"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{hint}</span>
        <button type="button" onClick={clear} className="text-[11px] text-teal-300 hover:underline">
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
