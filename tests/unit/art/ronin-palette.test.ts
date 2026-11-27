// M-ART MA-65 (D-20, docs/art/ronin.md §2): the lacquer ramps' numeric gates — `lacquer_black` warm near-neutral, far in
// hue from goth's plum black; `lacquer_red` vermilion (not goth's garnet wine, not the vampire's fx red, not the
// knight's rose). Steps are 0-based ramp indices.
import { readFileSync } from 'node:fs';
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

describe('master palette source', () => {
  it('has no duplicate ramp keys (JSON.parse would silently keep the last one)', () => {
    const raw = readFileSync(new URL('../../../assets-src/palettes/master.json', import.meta.url), 'utf8');
    const keys = [...raw.matchAll(/^\s*"([a-z_]+)": \[/gm)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });
});

/**
 * Base step = mask tone 2 (`base`, lib/mask.ts legend) on a T6 outfit = ramp index 2 — garnet (goth) and cloth_rose
 * (knight). lacquer_red's base is step 3 (ronin maps tone 2 → step 3).
 */
const BASE_STEP = 2;
const deltaE = (x: readonly [number, number, number], y: readonly [number, number, number]): number =>
  Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);

describe('lacquer_red (vermilion, art-director MA-65 round 1; gates revised by the coordinator 2026-11-25)', () => {
  it('has 7 steps, the base (step 3) at L ≤ 0.56 and h 30–36°', () => {
    expect(ramps.lacquer_red).toHaveLength(7);
    const base = lab('lacquer_red', 3);
    expect(base[0]).toBeLessThanOrEqual(0.56);
    expect(hueDeg(base)).toBeGreaterThanOrEqual(30);
    expect(hueDeg(base)).toBeLessThanOrEqual(36);
  });
  it.each(['gem_garnet', 'cloth_rose'])('base colour apart from %s base (OKLab ΔE ≥ 0.06)', (other) => {
    expect(deltaE(lab('lacquer_red', 3), lab(other, BASE_STEP))).toBeGreaterThanOrEqual(0.06);
  });
});
