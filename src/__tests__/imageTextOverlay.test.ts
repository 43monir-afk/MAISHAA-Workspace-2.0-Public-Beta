import { describe, it, expect } from 'vitest';
import { computeTextOrigin, clampOverlayOptions } from '../services/imageTextOverlayService';

describe('image text overlay layout', () => {
  it('places text in corners and centre with a margin', () => {
    const m = Math.round(Math.min(1000, 500) * 0.03); // 15
    expect(computeTextOrigin('top-left', 1000, 500, 200, 50)).toEqual({ x: m, y: m });
    expect(computeTextOrigin('bottom-right', 1000, 500, 200, 50)).toEqual({ x: 1000 - 200 - m, y: 500 - 50 - m });
    expect(computeTextOrigin('center', 1000, 500, 200, 50)).toEqual({ x: 400, y: 225 });
    expect(computeTextOrigin('top-center', 1000, 500, 200, 50)).toEqual({ x: 400, y: m });
  });
  it('never returns negative coordinates for oversized text', () => {
    const o = computeTextOrigin('bottom-right', 100, 100, 400, 400);
    expect(o.x).toBeGreaterThanOrEqual(0);
    expect(o.y).toBeGreaterThanOrEqual(0);
  });
  it('clamps size and opacity', () => {
    const c = clampOverlayOptions({ text: 'x', position: 'center', sizePct: 99, color: '#fff', opacityPct: 1, outline: false, tile: false });
    expect(c.sizePct).toBe(30);
    expect(c.opacityPct).toBe(5);
  });
});
