import { describe, it, expect } from 'vitest';
import { magma, viridis } from './colormaps';

describe('colormaps', () => {
  it('clamps t<=0 to first stop', () => {
    expect(magma(-0.5)).toEqual(magma(0));
    expect(viridis(0)).toEqual(viridis(-1));
  });

  it('clamps t>=1 to last stop', () => {
    expect(magma(2)).toEqual(magma(1));
    expect(viridis(1)).toEqual(viridis(99));
  });

  it('interpolates between stops', () => {
    const a = magma(0);
    const b = magma(1);
    const mid = magma(0.5);
    for (let i = 0; i < 3; i++) {
      const lo = Math.min(a[i], b[i]);
      const hi = Math.max(a[i], b[i]);
      expect(mid[i]).toBeGreaterThanOrEqual(lo - 1e-6);
      expect(mid[i]).toBeLessThanOrEqual(hi + 1e-6);
    }
  });

  it('returns three channels in [0,1]', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const rgb = viridis(t);
      expect(rgb).toHaveLength(3);
      for (const c of rgb) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});
