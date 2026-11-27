// M-ART MA-67 (D-20, docs/art/knight.md §2): the knight ramps' numeric gates — `metal_steel` (pewter armour: low
// chroma, blue mids, warm-ivory spec; darker than kitsune's silver `fur_ash` hair at equal steps) and `fur_cream`
// ("biscuit" fur: mauve shadows, buttery lights, never ginger; chromatically apart from human `skin`, or the face
// reads as a boy in a helmet). Steps are 0-based ramp indices.
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
const deltaAb = (x: Lab, y: Lab): number => Math.hypot(x[1] - y[1], x[2] - y[2]);
const steps = (name: string): number[] => ramp(name).map((_, i) => i);

describe.each(['metal_steel', 'fur_cream'])('%s (shared ramp rules, ART-BIBLE §4)', (name) => {
  it('has 7 steps, OKLab L strictly rising, darkest never #000', () => {
    const L = steps(name).map((s) => lab(name, s)[0]);
    expect(L).toHaveLength(7);
    L.slice(1).forEach((l, i) => {
      expect(l).toBeGreaterThan(L[i] ?? 1);
    });
    expect(ramp(name)[0]).not.toBe('#000000');
  });
  it('drifts in hue by ≥ 15° from the darkest to the lightest step', () => {
    expect(hueGap(hueDeg(lab(name, 0)), hueDeg(lab(name, 6)))).toBeGreaterThanOrEqual(15);
  });
});

describe('metal_steel (pewter armour)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('step %i: C ≤ 0.036 (low-chroma pewter, never a cyan or blue toy steel)', (s) => {
    expect(chroma(lab('metal_steel', s))).toBeLessThanOrEqual(0.036);
  });
  it.each([2, 3, 4])('mid step %i: hue 225–260° (cool steel body)', (s) => {
    const h = hueDeg(lab('metal_steel', s));
    expect(h).toBeGreaterThanOrEqual(225);
    expect(h).toBeLessThanOrEqual(260);
  });
  it.each([5, 6])('spec step %i: warm ivory, hue 60–110° (warm-light rule, not cyan metal)', (s) => {
    const h = hueDeg(lab('metal_steel', s));
    expect(h).toBeGreaterThanOrEqual(60);
    expect(h).toBeLessThanOrEqual(110);
  });
  // The ramps sit close in hue (both cool greys), so the split from kitsune's silver hair is value: the helmet body
  // reads a pewter mid-dark, the hair a light silver.
  it.each([0, 1, 2, 3])('step %i sits ≥ 0.07 L under kitsune fur_ash at the same step', (s) => {
    expect(lab('fur_ash', s)[0] - lab('metal_steel', s)[0]).toBeGreaterThanOrEqual(0.07);
  });
});

describe('fur_cream (biscuit fur)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('step %i: C ≤ 0.04 (cream, never ginger or orange)', (s) => {
    expect(chroma(lab('fur_cream', s))).toBeLessThanOrEqual(0.04);
  });
  it.each([0, 1])('shadow step %i: hue 300–350° (mauve shadows)', (s) => {
    const h = hueDeg(lab('fur_cream', s));
    expect(h).toBeGreaterThanOrEqual(300);
    expect(h).toBeLessThanOrEqual(350);
  });
  // The face's fill tones: a value or hue step alone cannot hold at every index (the lights converge on ivory), so
  // the gate is chromatic distance — human skin is about twice as saturated as the fur at equal steps.
  it.each([0, 1, 2, 3, 4])('step %i: Oklab Δab ≥ 0.035 from human skin at the same step', (s) => {
    expect(deltaAb(lab('fur_cream', s), lab('skin', s))).toBeGreaterThanOrEqual(0.035);
  });
});
