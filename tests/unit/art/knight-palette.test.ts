// M-ART MA-67 (D-22, docs/art/knight.md §2): `metal_silver`, the knight's full-plate ramp — polished silver that reads
// bright at 1× (a wide value range for hard specular steps, a near-white spec), cool-neutral in hue, and apart from
// kitsune's silver-grey hair (`fur_ash`) and maid's cream (`cloth_cream`). Steps are 0-based ramp indices.
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
const L = (name: string, step: number): number => lab(name, step)[0];
const SILVER = 'metal_silver';

describe('metal_silver (shared ramp rules, ART-BIBLE §4)', () => {
  it('has 7 steps, OKLab L strictly rising, darkest never #000', () => {
    const ls = ramp(SILVER).map((_, s) => L(SILVER, s));
    expect(ls).toHaveLength(7);
    ls.slice(1).forEach((l, i) => {
      expect(l).toBeGreaterThan(ls[i] ?? 1);
    });
    expect(ramp(SILVER)[0]).not.toBe('#000000');
  });
  it('drifts in hue by ≥ 15° from the darkest to the lightest step', () => {
    expect(hueGap(hueDeg(lab(SILVER, 0)), hueDeg(lab(SILVER, 6)))).toBeGreaterThanOrEqual(15);
  });
});

describe('metal_silver (polished plate)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('step %i: C ≤ 0.03 (neutral silver, never a blue or cyan toy metal)', (s) => {
    expect(chroma(lab(SILVER, s))).toBeLessThanOrEqual(0.03);
  });
  it.each([1, 2, 3, 4, 5])('step %i: hue 220–260° (cool-neutral body)', (s) => {
    const h = hueDeg(lab(SILVER, s));
    expect(h).toBeGreaterThanOrEqual(220);
    expect(h).toBeLessThanOrEqual(260);
  });
  it('has a near-white spec (L ≥ 0.97) and a wide value range for hard steps (spec − step 2 ≥ 0.45 L)', () => {
    expect(L(SILVER, 6)).toBeGreaterThanOrEqual(0.97);
    expect(L(SILVER, 6) - L(SILVER, 2)).toBeGreaterThanOrEqual(0.45);
  });
  it('keeps a dark anchor for the outline on white windows (step 0 L ≤ 0.24)', () => {
    expect(L(SILVER, 0)).toBeLessThanOrEqual(0.24);
  });
});

describe('metal_silver vs the cast (D-21 uniqueness)', () => {
  // kitsune's hair is a silver-grey too: the plate is brighter in the lights and bluer (not violet) in the shadows.
  it.each([4, 5, 6])('step %i sits ≥ 0.04 L above kitsune fur_ash (brighter polish)', (s) => {
    expect(L(SILVER, s) - L('fur_ash', s)).toBeGreaterThanOrEqual(0.04);
  });
  it.each([0, 1, 2])('shadow step %i is ≥ 25° bluer than kitsune fur_ash (violet shadows)', (s) => {
    expect(hueGap(hueDeg(lab(SILVER, s)), hueDeg(lab('fur_ash', s)))).toBeGreaterThanOrEqual(25);
  });
  it.each([1, 2, 3, 4])('step %i is ≥ 120° in hue from maid cloth_cream (warm cream)', (s) => {
    expect(hueGap(hueDeg(lab(SILVER, s)), hueDeg(lab('cloth_cream', s)))).toBeGreaterThanOrEqual(120);
  });
});

// Variant B (owner pick 2026-11-27): `cloth_emerald`, the sash / tabard panel / eye ramp — the free emerald gap of the
// cast (knight.md §4), well apart from witch's `cloth_moss` (a duller, yellower green) and never a Link-tunic flat green.
const EMERALD = 'cloth_emerald';

describe('cloth_emerald (shared ramp rules, ART-BIBLE §4)', () => {
  it('has 7 steps, OKLab L strictly rising, darkest never #000, hue drift ≥ 15°', () => {
    const ls = ramp(EMERALD).map((_, s) => L(EMERALD, s));
    expect(ls).toHaveLength(7);
    ls.slice(1).forEach((l, i) => {
      expect(l).toBeGreaterThan(ls[i] ?? 1);
    });
    expect(ramp(EMERALD)[0]).not.toBe('#000000');
    expect(hueGap(hueDeg(lab(EMERALD, 0)), hueDeg(lab(EMERALD, 6)))).toBeGreaterThanOrEqual(15);
  });
  it.each([2, 3, 4, 5])('step %i: hue 145–165° (emerald, not teal or olive)', (s) => {
    const h = hueDeg(lab(EMERALD, s));
    expect(h).toBeGreaterThanOrEqual(145);
    expect(h).toBeLessThanOrEqual(165);
  });
});

describe('cloth_emerald vs the cast (D-21 uniqueness)', () => {
  it.each([3, 4, 5])('step %i is ≥ 20° in hue from witch cloth_moss (bluer green)', (s) => {
    expect(hueGap(hueDeg(lab(EMERALD, s)), hueDeg(lab('cloth_moss', s)))).toBeGreaterThanOrEqual(20);
  });
  it.each([3, 4])('step %i carries ≥ 1.6 × the chroma of witch cloth_moss (a jewel green, not a muted moss)', (s) => {
    expect(chroma(lab(EMERALD, s))).toBeGreaterThanOrEqual(1.6 * chroma(lab('cloth_moss', s)));
  });
});
