// M-ART MA-29: the `pixmates.goth` pack gates — build, headroom, faces per view, arm-over-torso contrast — and the
// design-spec checks labelled "art gate (goth.md)": black ramps (R6), hair never over the face, broken angel ring,
// garnet as the only red, sleeve ends, q34 contour and near lock.
import { describe, expect, it } from 'vitest';
import { createGothPack, GOTH } from '../../../assets-src/characters/goth/body.ts';
import { GOTH_FACE } from '../../../assets-src/characters/goth/face.ts';
import { HEAD, HEAD_Q34 } from '../../../assets-src/characters/goth/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer, headViewOf, RIG_H } from '../../../assets-src/rig/compose.ts';
import { leanLock, simulateChains } from '../../../assets-src/rig/chains.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace } from '../../../assets-src/rig/face.ts';
import { deriveQ34Head } from '../../../assets-src/rig/q34.ts';
import type { RigAnim } from '../../../assets-src/rig/types.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const q34 = GOTH.views?.q34;
if (!q34) throw new Error('goth has no q34 view');
const built = buildPack(createGothPack(), ctx);
const renderer = createRigRenderer(GOTH);
const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i * 4] ?? 0) << 16) | ((data[i * 4 + 1] ?? 0) << 8) | (data[i * 4 + 2] ?? 0);
/** Every built frame with its animation. */
const allFrames = (): { a: RigAnim; f: number; img: { width: number; height: number; data: Uint8Array } }[] =>
  ANIMS.flatMap((a) => (built.frames.get(a.name) ?? []).map((img, f) => ({ a, f, img })));
/** Top-left of the head mask in a built frame (after the waist squash, which moves rows above the cut). */
const headOrigin = (a: RigAnim, f: number): [number, number] => {
  const j = renderer.joints(a, f);
  const squash = a.frames[f]?.squash ?? 0;
  return [Math.round(j.head[0] - 15), Math.round(j.head[1] - 14) + squash];
};
const LASH_ROW = 15;
const EYE_BOTTOM_ROW = 20;
const hue = (rgb: number): { c: number; h: number } => {
  const [, a, b] = toOklab(rgb);
  return { c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
};

describe('pixmates.goth pack', () => {
  const m = manifestSchema.parse(built.manifest);

  it('builds all shared animations at 48 × 56 within 1024², walk/turn facing right, deterministically', () => {
    expect(m.id).toBe('pixmates.goth');
    expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(facingOf(m.animations['turn'] ?? {})).toBe('right');
    expect(facingOf(m.animations['idle_a'] ?? {})).toBe('front');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(built.atlasSize.width).toBeLessThanOrEqual(1024);
    expect(built.atlasSize.height).toBeLessThanOrEqual(1024);
    expect(buildPack(createGothPack(), ctx).sha256).toBe(built.sha256);
  });

  it('has authored heads (not the derived q34 stand-in), 30 px wide', () => {
    expect(HEAD.every((r) => r.length === 30)).toBe(true);
    expect(HEAD_Q34.every((r) => r.length === 30)).toBe(true);
    expect(HEAD_Q34).not.toEqual(deriveQ34Head(HEAD));
  });

  it('passes the face validator per view: all front expressions, q34 neutral + blink', () => {
    expect(Object.keys(GOTH_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(GOTH_FACE, 'goth', { mask: HEAD, faceAt: [5, 12] })).toEqual([]);
    expect(Object.keys(q34.face.expressions).sort()).toEqual([...Q34_EXPRESSIONS].sort());
    expect(validateFace(q34.face, 'goth/q34', { mask: HEAD_Q34, faceAt: [7, 12] }, Q34_EXPRESSIONS)).toEqual([]);
  });

  it('keeps row 0 transparent on every frame (headroom)', () => {
    for (const { a, f, img } of allFrames()) {
      for (let x = 0; x < img.width; x++) expect(img.data[x * 4 + 3], `${a.name}/${String(f)}`).toBe(0);
    }
  });

  it('passes the arm-over-torso contrast gate on every frame (0 FAIL)', () => {
    const deepest = deepestTones(palette);
    const problems: string[] = [];
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
        const opts = bodyViewOf(a, f) === 'q34' ? { far: 'R' as const } : undefined;
        for (const p of armTorsoProblems(armTorsoContrast(image, labels, deepest), opts))
          problems.push(`${a.name}/${String(f)}: ${p}`);
      });
    }
    expect(problems).toEqual([]);
  });
});

describe('art gate (goth.md): black ramps (R6)', () => {
  const lch = (name: string) => ramp(name).map((c) => ({ l: toOklab(c)[0], ...hue(c) }));

  it.each(['hair_black', 'cloth_black', 'gem_garnet'])('%s: no #000, L rises monotonically, hue drifts ≥ 15°', (n) => {
    const steps = lch(n);
    expect(steps.length).toBeGreaterThanOrEqual(6);
    expect(ramp(n)).not.toContain(0);
    for (let i = 1; i < steps.length; i++) expect(steps[i]?.l).toBeGreaterThan(steps[i - 1]?.l ?? 1);
    const first = steps[0]?.h ?? 0;
    const last = steps[steps.length - 1]?.h ?? 0;
    const drift = Math.min(Math.abs(first - last), 360 - Math.abs(first - last));
    expect(drift).toBeGreaterThanOrEqual(15);
  });

  it('splits the hair mid mass (step 2) from the sleeve tone by ≥ 30° hue and ≥ 0.05 L', () => {
    const hair = ramp('hair_black')[2] ?? 0;
    const sleeve = ramp(GOTH.sleeve?.ramp ?? 'cloth_black')[GOTH.sleeve?.shade ?? 3] ?? 0;
    const d = Math.abs(hue(hair).h - hue(sleeve).h);
    expect(Math.min(d, 360 - d)).toBeGreaterThanOrEqual(30);
    expect(Math.abs(toOklab(hair)[0] - toOklab(sleeve)[0])).toBeGreaterThanOrEqual(0.05);
  });

  it('never renders #000 on any frame', () => {
    for (const { a, f, img } of allFrames()) {
      for (let i = 0; i < img.width * img.height; i++) {
        if (img.data[i * 4 + 3]) expect(rgbAt(img.data, i), `${a.name}/${String(f)}`).not.toBe(0);
      }
    }
  });
});

describe('art gate (goth.md): hair, ring, garnet, sleeves', () => {
  it('never puts a hair px on the face (lash row → chin, face skin of the head mask), sleep included', () => {
    const hair = new Set(ramp(GOTH.ramps.hair));
    for (const { a, f, img } of allFrames()) {
      const mask = headViewOf(a, f) === 'q34' ? HEAD_Q34 : HEAD;
      const [x0, y0] = headOrigin(a, f);
      for (let r = LASH_ROW; r < mask.length; r++) {
        const row = mask[r] ?? '';
        for (let c = 0; c < row.length; c++) {
          if (slotOf(row.charAt(c)) !== 'skin') continue;
          const i = (y0 + r) * img.width + x0 + c;
          expect(hair.has(rgbAt(img.data, i)), `${a.name}/${String(f)} mask (${String(c)}, ${String(r)})`).toBe(false);
        }
      }
    }
  });

  it.each([
    ['front', HEAD],
    ['q34', HEAD_Q34],
  ] as const)('breaks the %s angel ring into ≥ 4 segments on ≥ 2 rows, never one continuous band', (_, mask) => {
    const ringRows = mask.map((row) => row.split('').map((ch) => ch === 'y' || ch === 'Y'));
    const runs = ringRows.flatMap((row) => {
      const out: number[] = [];
      let n = 0;
      for (const on of [...row, false]) {
        if (on) n++;
        else if (n > 0) {
          out.push(n);
          n = 0;
        }
      }
      return out;
    });
    expect(ringRows.filter((row) => row.some(Boolean)).length).toBeGreaterThanOrEqual(2);
    expect(runs.length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...runs)).toBeLessThanOrEqual(4);
  });

  it('keeps garnet the only red-hue px (blush aside): ≥ 8 rows below the eyes at rest, ≥ 7 on lag/bow frames', () => {
    const garnet = new Set(ramp('gem_garnet'));
    const blush = new Set(ramp(GOTH.outfit.blush.ramp));
    let shown = 0;
    for (const { a, f, img } of allFrames()) {
      const [, y0] = headOrigin(a, f);
      let top = Infinity;
      for (let i = 0; i < img.width * img.height; i++) {
        if (!img.data[i * 4 + 3]) continue;
        const rgb = rgbAt(img.data, i);
        const y = Math.floor(i / img.width);
        if (garnet.has(rgb)) {
          top = Math.min(top, y);
          continue;
        }
        const { c, h } = hue(rgb);
        const red = c >= 0.1 && (h >= 345 || h <= 30);
        if (red) expect(blush.has(rgb), `${a.name}/${String(f)} red px at row ${String(y)}`).toBe(true);
      }
      // A squash frame may cut the drop's rows, or an arm may cover it (land/0): then no garnet shows at all.
      if (top === Infinity) continue;
      shown++;
      const gap = top - (y0 + EYE_BOTTOM_ROW);
      // The rest pose holds the spec's 8 rows; the 1-frame head lag (walk recoil, happy) and the sleep bow bring the
      // eyes 1 row closer.
      const min = a.name.startsWith('idle') && f === 0 ? 8 : 7;
      expect(gap, `${a.name}/${String(f)}`).toBeGreaterThanOrEqual(min);
    }
    expect(shown).toBeGreaterThan(100);
  });

  it('ends every visible sleeve in ≥ 2 px of cuff lace or skin (sleeves past the hands)', () => {
    const ends = new Set([...ramp(GOTH.cuff?.ramp ?? 'cloth_cream'), ...ramp(GOTH.outfit.skin.ramp)]);
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
        for (const label of [ARM_LABEL.endL, ARM_LABEL.endR]) {
          let shown = 0;
          let good = 0;
          for (let i = 0; i < image.width * image.height; i++) {
            if (!labels.data[i * 4 + 3] || labels.data[i * 4] !== label || !image.data[i * 4 + 3]) continue;
            shown++;
            if (ends.has(rgbAt(image.data, i))) good++;
          }
          // A q34 far hand fully behind the torso shows nothing; any arm end that shows has ≥ 2 lace/skin px.
          if (shown > 0) expect(good, `${a.name}/${String(f)} label ${String(label)}`).toBeGreaterThanOrEqual(2);
        }
      });
    }
  });
});

describe('art gate (goth.md): q34 contour and near lock (RIG.md owner rules)', () => {
  const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));

  it('tapers the facing-side contour monotonically from the eye row: never out, in ≤ 1 px per row, to a chin point', () => {
    const rights = HEAD_Q34.slice(LASH_ROW).map((r) => Math.max(...skinCols(r)));
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeLessThanOrEqual(1);
    }
    const last = skinCols(HEAD_Q34[HEAD_Q34.length - 1] ?? '');
    expect(last).toHaveLength(1);
    expect(last[0]).toBeGreaterThan(17);
  });

  it('keeps the q34 skin no wider than the front skin', () => {
    const width = (mask: Mask): number =>
      Math.max(
        ...mask
          .map(skinCols)
          .filter((c) => c.length > 0)
          .map((c) => Math.max(...c) - Math.min(...c) + 1),
      );
    expect(width(HEAD_Q34)).toBeLessThanOrEqual(width(HEAD));
  });

  it('q34 walk: the head overhangs the torso front by no more than its back overhang + 4 px', () => {
    const walk = anim('walk');
    walk.frames.forEach((_, f) => {
      const j = renderer.joints(walk, f);
      const { image, labels } = renderer.renderLabeled(walk, f, ctx);
      const ext = (y0: number, y1: number, noArms: boolean): [number, number] => {
        let lo = Infinity;
        let hi = -Infinity;
        for (let y = y0; y <= y1; y++) {
          for (let x = 0; x < image.width; x++) {
            const i = (y * image.width + x) * 4;
            if (!image.data[i + 3]) continue;
            const l = labels.data[i];
            if (noArms && l !== ARM_LABEL.none && l !== ARM_LABEL.torso && l !== ARM_LABEL.trim) continue;
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
          }
        }
        return [lo, hi];
      };
      const head = ext(Math.round(j.head[1]) - 6, Math.round(j.head[1]) + 10, false);
      const torso = ext(Math.round(j.hip[1]) - 9, Math.round(j.hip[1]) - 1, true);
      expect(head[1] - torso[1], `walk/${String(f)}`).toBeLessThanOrEqual(torso[0] - head[0] + 4);
    });
  });

  it('runs the near lock ≤ 3 px wide from the temple down, never widening (no bulge at ear height)', () => {
    // From the face anchor row (12): hair px left of the first skin px of the row.
    const widths = HEAD_Q34.slice(12).flatMap((row) => {
      const first = skinCols(row)[0];
      if (first === undefined) return [];
      return [
        row
          .slice(0, first)
          .split('')
          .filter((ch) => slotOf(ch) === 'hair').length,
      ];
    });
    expect(Math.max(...widths)).toBeLessThanOrEqual(3);
    for (let k = 1; k < widths.length; k++) expect(widths[k]).toBeLessThanOrEqual(widths[k - 1] ?? 0);
  });
});

describe('art gate (goth.md): calm lashes (art round 1: no frown read)', () => {
  /** Ink px (X / x) of the screen-left eye (cols 0–9) in the lash rows (0–2). */
  const lashEnds = (mask: Mask): { outer: number; inner: number } => {
    const px: [number, number][] = [];
    mask.slice(0, 3).forEach((row, y) => {
      for (let x = 0; x < 10; x++) if ('Xx'.includes(row.charAt(x))) px.push([x, y]);
    });
    const outerX = Math.min(...px.map(([x]) => x));
    const innerX = Math.max(...px.map(([x]) => x));
    const topAt = (cx: number): number => Math.min(...px.filter(([x]) => x === cx).map(([, y]) => y));
    return { outer: topAt(outerX), inner: topAt(innerX) };
  };
  const eye = (id: string): Mask => GOTH_FACE.eyes[id]?.mask ?? [];

  it.each(['open', 'think', 'startle', 'closed', 'half'])(
    '%s: the lash outer end is not higher than its inner end',
    (id) => {
      const { outer, inner } = lashEnds(eye(id));
      expect(outer).toBeGreaterThanOrEqual(inner);
    },
  );

  it('worried lifts the inner ends ≥ 1 px above the outer end', () => {
    const { outer, inner } = lashEnds(eye('low'));
    expect(outer - inner).toBeGreaterThanOrEqual(1);
  });
});

describe('art gate (goth.md): art round 2 — think paw, lock lean, mouth corner', () => {
  it('think: nothing cream on the mouth row or the row above it; the paw lace is one row ≤ 3 px under the knuckles', () => {
    const cream = new Set(ramp(GOTH.cuff?.ramp ?? 'cloth_cream'));
    const think = anim('think');
    (built.frames.get('think') ?? []).forEach((img, f) => {
      const [, y0] = headOrigin(think, f);
      const mouth = y0 + 23;
      for (const y of [mouth - 1, mouth]) {
        for (let x = 0; x < img.width; x++) {
          const i = y * img.width + x;
          if (img.data[i * 4 + 3])
            expect(cream.has(rgbAt(img.data, i)), `think/${String(f)} (${String(x)}, ${String(y)})`).toBe(false);
        }
      }
      // Below the mouth and above the choker (rows mouth+1 … mouth+4): the paw's lace is a single row of ≤ 3 px.
      const rows = new Map<number, number>();
      for (let y = mouth + 1; y <= mouth + 4; y++) {
        for (let x = 24; x < img.width; x++) {
          const i = y * img.width + x;
          if (img.data[i * 4 + 3] && cream.has(rgbAt(img.data, i))) rows.set(y, (rows.get(y) ?? 0) + 1);
        }
      }
      const laceRows = [...rows.entries()].filter(([y]) => y < y0 + 28);
      expect(laceRows.length, `think/${String(f)}`).toBeLessThanOrEqual(1);
      for (const [, n] of laceRows) expect(n).toBeLessThanOrEqual(3);
    });
  });

  it('leans each side lock in one continuous line root → tip (no local outward step) on every frame', () => {
    expect(GOTH.lockLean).toBe(true);
    const r = createRigRenderer(GOTH);
    for (const a of ANIMS) {
      const js = a.frames.map((_, f) => r.joints(a, f));
      const ch = simulateChains(
        GOTH,
        a,
        js,
        1,
        (f) => bodyViewOf(a, f),
        () => ({ at: [0, 0], lengths: [1, 1] }),
      );
      for (const lock of [...ch.lockL, ...ch.lockR]) {
        const xs = leanLock(lock).map(([x]) => x);
        const steps = xs.slice(1).map((x, k) => Math.sign(Math.round((x - (xs[k] ?? x)) * 1000)));
        expect(new Set(steps.filter((d) => d !== 0)).size, a.name).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each([
    ['front', GOTH_FACE],
    ['q34', GOTH.views?.q34?.face],
  ] as const)(
    '%s neutral: XX ink 1 px right of the axis, the raised corner a lip tone ≥ 0.15 ΔL darker than the cheek',
    (_, lib) => {
      const mouth = lib?.mouths[lib.expressions.neutral?.mouth ?? '']?.mask ?? [];
      const corner = (mouth[0] ?? '').replace(/\./g, '');
      expect(corner).toHaveLength(1);
      const [slot, tone] = LEGEND[corner] ?? ['ink', 0];
      expect(slot).not.toBe('ink');
      const swatch = GOTH.outfit[slot];
      const lip = ramp(swatch.ramp)[swatch.tones[tone]] ?? 0;
      const cheek = ramp(GOTH.outfit.skin.ramp)[GOTH.outfit.skin.tones[3]] ?? 0;
      expect(toOklab(cheek)[0] - toOklab(lip)[0]).toBeGreaterThanOrEqual(0.15);
      expect((mouth[1] ?? '').replace(/\./g, '')).toBe('XX');
    },
  );
});
