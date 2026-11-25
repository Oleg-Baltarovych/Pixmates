// M-ART MA-65 (D-20, docs/art/ronin.md §2): the lacquer ramps' numeric gates — `lacquer_black` warm near-neutral, far in
// hue from goth's plum black; `lacquer_red` vermilion (not goth's garnet wine, not the vampire's fx red, not the
// knight's rose). Steps are 0-based ramp indices.
import { describe, expect, it } from 'vitest';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import MASTER from '../../../assets-src/palettes/master.json' with { type: 'json' };

const ramps: Readonly<Record<string, readonly string[]>> = MASTER.ramps;
const lab = (ramp: string, step: number): readonly [number, number, number] => {
  const hex = ramps[ramp]?.[step];
  if (!hex) throw new Error(`${ramp}[${String(step)}] missing`);
  return toOklab(parseInt(hex.slice(1), 16));
};
const chroma = ([, a, b]: readonly [number, number, number]): number => Math.hypot(a, b);
const hueDeg = ([, a, b]: readonly [number, number, number]): number =>
  ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
const hueGap = (x: number, y: number): number => {
  const d = Math.abs(x - y) % 360;
  return Math.min(d, 360 - d);
};

describe('lacquer_black (ronin armour, urushi)', () => {
  it('has 7 steps, dark → light', () => {
    const L = [0, 1, 2, 3, 4, 5, 6].map((s) => lab('lacquer_black', s)[0]);
    expect(L).toHaveLength(7);
    L.slice(1).forEach((l, i) => {
      expect(l).toBeGreaterThan(L[i] ?? 1);
    });
  });
  it.each([1, 2, 3, 4])('step %i: warm near-neutral (C ≤ 0.02), ≥ 90° in hue from goth cloth_black', (s) => {
    const c = lab('lacquer_black', s);
    expect(chroma(c)).toBeLessThanOrEqual(0.02);
    expect(hueGap(hueDeg(c), hueDeg(lab('cloth_black', s)))).toBeGreaterThanOrEqual(90);
  });
});

describe('lacquer_red (ronin lacing, menpō: shu vermilion)', () => {
  it.each([2, 3, 4])('step %i: vermilion, not garnet wine (Δh ≥ 12°, ΔL ≥ +0.04)', (s) => {
    const r = lab('lacquer_red', s);
    const g = lab('gem_garnet', s);
    expect(hueGap(hueDeg(r), hueDeg(g))).toBeGreaterThanOrEqual(12);
    expect(r[0] - g[0]).toBeGreaterThanOrEqual(0.04);
  });
  it.each([2, 3, 4])('step %i: apart from fx_red at the same step (Δab ≥ 0.05)', (s) => {
    const r = lab('lacquer_red', s);
    const f = lab('fx_red', s);
    expect(Math.hypot(r[1] - f[1], r[2] - f[2])).toBeGreaterThanOrEqual(0.05);
  });
  it.each([2, 3, 4])('step %i: not the knight rose (Δh ≥ 20°, C ≥ rose + 0.05)', (s) => {
    const r = lab('lacquer_red', s);
    const k = lab('cloth_rose', s);
    expect(hueGap(hueDeg(r), hueDeg(k))).toBeGreaterThanOrEqual(20);
    expect(chroma(r) - chroma(k)).toBeGreaterThanOrEqual(0.05);
  });
});
