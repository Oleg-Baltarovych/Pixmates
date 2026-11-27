// M-ART MA-68 (docs/art/vampire.md §2): `cloth_midnight`, the vampire's cloak / coat / trousers ramp — a midnight
// slate-blue that is never true black (Castlevania), never plum (goth's `cloth_black`), never kitsune's saturated
// `cloth_indigo`, and a value step above the blue-black hair (`hair_black`). Steps are 0-based ramp indices.
import { describe, expect, it } from 'vitest';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import MASTER from '../../../assets-src/palettes/master.json' with { type: 'json' };

type Lab = readonly [number, number, number];
const ramps: Readonly<Record<string, readonly string[] | undefined>> = MASTER.ramps;
const ramp = (name: string): readonly string[] => {
  const r = ramps[name];
  if (!r) throw new Error(`${name} missing`);
  return r;
};
const lab = (name: string, step: number): Lab => {
  const hex = ramp(name)[step];
  if (!hex) throw new Error(`${name}[${String(step)}] missing`);
  return toOklab(parseInt(hex.slice(1), 16));
};
const chroma = ([, a, b]: Lab): number => Math.hypot(a, b);
const hueDeg = ([, a, b]: Lab): number => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
const hueGap = (x: number, y: number): number => {
  const d = Math.abs(x - y) % 360;
  return Math.min(d, 360 - d);
};
const deltaAb = (x: Lab, y: Lab): number => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
const L = (name: string, step: number): number => lab(name, step)[0];
const MID = 'cloth_midnight';

describe('cloth_midnight (shared ramp rules, ART-BIBLE §4)', () => {
  it('has 7 steps, OKLab L strictly rising, darkest never #000', () => {
    const ls = ramp(MID).map((_, s) => L(MID, s));
    expect(ls).toHaveLength(7);
    ls.slice(1).forEach((l, i) => {
      expect(l).toBeGreaterThan(ls[i] ?? 1);
    });
    expect(ramp(MID)[0]).not.toBe('#000000');
  });
  it('drifts in hue by ≥ 15° from the darkest to the lightest step', () => {
    expect(hueGap(hueDeg(lab(MID, 0)), hueDeg(lab(MID, 6)))).toBeGreaterThanOrEqual(15);
  });
  it.each([1, 2, 3, 4, 5])('step %i: hue 220–280° (slate-blue, never plum or teal)', (s) => {
    const h = hueDeg(lab(MID, s));
    expect(h).toBeGreaterThanOrEqual(220);
    expect(h).toBeLessThanOrEqual(280);
  });
  it.each([2, 3, 4])('step %i is visibly tinted (C ≥ 0.025: midnight blue, never true black)', (s) => {
    expect(chroma(lab(MID, s))).toBeGreaterThanOrEqual(0.025);
  });
});

describe('cloth_midnight vs the cast (D-21 uniqueness)', () => {
  it.each([2, 3, 4])('step %i: ≥ 30° in hue and Δab ≥ 0.04 from goth cloth_black (no plum read)', (s) => {
    expect(hueGap(hueDeg(lab(MID, s)), hueDeg(lab('cloth_black', s)))).toBeGreaterThanOrEqual(30);
    expect(deltaAb(lab(MID, s), lab('cloth_black', s))).toBeGreaterThanOrEqual(0.04);
  });
  it.each([2, 3, 4])('step %i: C ≤ 0.055 and Δab ≥ 0.04 from kitsune cloth_indigo (muted, not royal blue)', (s) => {
    expect(chroma(lab(MID, s))).toBeLessThanOrEqual(0.055);
    expect(chroma(lab('cloth_indigo', s))).toBeGreaterThanOrEqual(0.09);
    expect(deltaAb(lab(MID, s), lab('cloth_indigo', s))).toBeGreaterThanOrEqual(0.04);
  });
  it('base step 3 sits ≥ 0.08 L above the hair_black mass (step 3), so hair and cloak never melt', () => {
    expect(L(MID, 3) - L('hair_black', 3)).toBeGreaterThanOrEqual(0.08);
  });
  it.each([1, 2, 3, 4])('step %i is ≥ 0.02 C more tinted than coder cloth_onyx (not a second black)', (s) => {
    expect(chroma(lab(MID, s)) - chroma(lab('cloth_onyx', s))).toBeGreaterThanOrEqual(0.02);
  });
});
