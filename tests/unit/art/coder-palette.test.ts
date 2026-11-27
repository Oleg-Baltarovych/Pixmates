// M-ART MA-66 (D-20, docs/art/coder.md §2): the coder ramps' numeric gates — `cloth_onyx` (the black hood-up hoodie,
// owner 2026-11-27: a neutral true black, apart from the cast's tinted blacks), `cloth_mustard` (the accent: hood edge,
// drawstrings, badge mark; apart from the witch's ochre tights, never lemon) and `hair_cocoa` (cool cocoa with mauve
// shadows, apart from ronin's umber, never red or copper). Steps are 0-based ramp indices.
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
/** Oklab chromatic distance (a, b only): the hue/chroma split that a value step cannot fake. */
const deltaAb = (x: Lab, y: Lab): number => Math.hypot(x[1] - y[1], x[2] - y[2]);
const steps = (name: string): number[] => ramp(name).map((_, i) => i);

describe.each(['cloth_onyx', 'cloth_mustard', 'hair_cocoa'])('%s (shared ramp rules, ART-BIBLE §4)', (name) => {
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

describe('cloth_mustard (accent)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('step %i: C ≤ 0.115 and h ≤ 100° (mustard, never lemon)', (s) => {
    const c = lab('cloth_mustard', s);
    expect(chroma(c)).toBeLessThanOrEqual(0.115);
    expect(hueDeg(c)).toBeLessThanOrEqual(100);
  });
  // Compared with the ochre step nearest in L (the ramps have 7 vs 6 steps, so equal indices sit 0.06 L apart and
  // would compare a light with a mid): what the eye matches in the lineup is equal value, different hue.
  it.each([2, 3, 4])('step %i: Oklab Δab ≥ 0.04 from the nearest-L witch tights tone (cloth_ochre)', (s) => {
    const m = lab('cloth_mustard', s);
    const nearest = steps('cloth_ochre')
      .map((o) => lab('cloth_ochre', o))
      .reduce((best, o) => (Math.abs(o[0] - m[0]) < Math.abs(best[0] - m[0]) ? o : best));
    expect(deltaAb(m, nearest)).toBeGreaterThanOrEqual(0.04);
  });
});

describe('hair_cocoa (bedhead)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('step %i: C ≤ 0.045 (cocoa, never red or copper)', (s) => {
    expect(chroma(lab('hair_cocoa', s))).toBeLessThanOrEqual(0.045);
  });
  // coder.md §2 fallback: with C ≤ 0.045 a Δab of 0.04 from umber needs a ~60° hue gap (purple, not cocoa), so the
  // mids are pushed toward h 10–15 instead and the gate is the hue gap (≥ 30°) plus a smaller Δab floor.
  it.each([1, 2, 3, 4])('step %i: ≥ 30° in hue and Oklab Δab ≥ 0.02 from ronin hair_umber', (s) => {
    const c = lab('hair_cocoa', s);
    const u = lab('hair_umber', s);
    expect(hueGap(hueDeg(c), hueDeg(u))).toBeGreaterThanOrEqual(30);
    expect(deltaAb(c, u)).toBeGreaterThanOrEqual(0.02);
  });
  it.each([2, 3])('mid step %i: hue in 5–20° (cool cocoa, mauve side)', (s) => {
    const h = hueDeg(lab('hair_cocoa', s));
    expect(h).toBeGreaterThanOrEqual(5);
    expect(h).toBeLessThanOrEqual(20);
  });
  it('hair mid (step 3) sits ≥ 0.15 L under the mustard hood edge that frames the fringe (mustard step 3)', () => {
    expect(lab('cloth_mustard', 3)[0] - lab('hair_cocoa', 3)[0]).toBeGreaterThanOrEqual(0.15);
  });
});

// `cloth_onyx` is the coder's own black: it reads as black at 1×, yet apart from goth's purple-black (`cloth_black`,
// `hair_black`), ronin's warm lacquer and his ash charcoal.
const nearestL = (name: string, L: number): Lab =>
  steps(name)
    .map((o) => lab(name, o))
    .reduce((best, o) => (Math.abs(o[0] - L) < Math.abs(best[0] - L) ? o : best));

describe('cloth_onyx (black hoodie)', () => {
  it('reads true black: the hoodie body (step 2) has L ≤ 0.18 and every step C ≤ 0.006 (neutral, no green or grey cast)', () => {
    expect(lab('cloth_onyx', 2)[0]).toBeLessThanOrEqual(0.18);
    steps('cloth_onyx').forEach((s) => {
      expect(chroma(lab('cloth_onyx', s))).toBeLessThanOrEqual(0.006);
    });
  });
  // Owner 2026-11-27 ("make the hoodie black") outranks the earlier Δab ≥ 0.02 gate: a neutral black sits only 0.014–0.033 Δab
  // from the other blacks. The split is chroma instead — goth's purple-black, goth's blue-black hair and ronin's warm
  // lacquer are visibly tinted, the coder's black is not — plus silhouette (hood dome vs long hair / armour + cloak).
  it.each(['cloth_black', 'hair_black', 'lacquer_black'])(
    'steps 1–4: %s carries ≥ 2.5× the chroma of the nearest-L onyx tone (tinted vs neutral black)',
    (other) => {
      [1, 2, 3, 4].forEach((s) => {
        const t = lab(other, s);
        expect(chroma(t)).toBeGreaterThanOrEqual(2.5 * chroma(nearestL('cloth_onyx', t[0])));
      });
    },
  );
  it('the hoodie body (step 2) sits ≥ 0.12 L under ronin cloth_ash step 2', () => {
    expect(lab('cloth_ash', 2)[0] - lab('cloth_onyx', 2)[0]).toBeGreaterThanOrEqual(0.12);
  });
  it('the mustard accent tones on the hood edge and drawstrings (steps 3, 4) sit ≥ 0.4 L over the hoodie body', () => {
    for (const s of [3, 4]) expect(lab('cloth_mustard', s)[0] - lab('cloth_onyx', 2)[0]).toBeGreaterThanOrEqual(0.4);
  });
});
