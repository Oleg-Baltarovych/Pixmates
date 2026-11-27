// M-ART MA-68 (docs/art/vampire.md, owner pick 2026-11-27: variant A + C's fan collar + a widow's peak, D-23):
// `pixmates.vampire` — the chibi count. Pack build, headroom, the arm-over-torso gate, the costume materials on every
// frame, crimson only in the eyes, the paired fangs in neutral, the widow's peak and the open forehead, the collar
// bounds (R-V2), gold kept inside the costume (no edge trim), the normal face (blush only on happy and petted) and the
// q34 owner rules. Ramp gates: vampire-palette.test.ts.
import { describe, expect, it } from 'vitest';
import { createVampirePack, VAMPIRE } from '../../../assets-src/characters/vampire/body.ts';
import { COLLAR, HEAD, HEAD_Q34 } from '../../../assets-src/characters/vampire/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import type { Body, RigAnim } from '../../../assets-src/rig/types.ts';
import { COLLAR_MAX, validateBody } from '../../../assets-src/rig/validate.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const renderer = createRigRenderer(VAMPIRE);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const Q34 = VAMPIRE.views?.q34;
if (!Q34) throw new Error('vampire has no q34 view');
const Q34_VIEW = Q34;
const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i * 4] ?? 0) << 16) | ((data[i * 4 + 1] ?? 0) << 8) | (data[i * 4 + 2] ?? 0);
/** Per px of a frame: the ramp name and step (undefined = transparent). */
const pixels = (
  name: string,
  f: number,
): { w: number; h: number; at: (x: number, y: number) => readonly [string, number] | undefined } => {
  const { image } = renderer.renderLabeled(anim(name), f, ctx);
  const names = [...palette.ramps.keys()];
  return {
    w: image.width,
    h: image.height,
    at: (x, y) => {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) return undefined;
      const i = y * image.width + x;
      if (!image.data[i * 4 + 3]) return undefined;
      const rgb = rgbAt(image.data, i);
      for (const n of names) {
        const s = ramp(n).indexOf(rgb);
        if (s >= 0) return [n, s];
      }
      return ['?', -1];
    },
  };
};
const rampPx = (name: string, f: number, rampName: string): [number, number][] => {
  const p = pixels(name, f);
  const out: [number, number][] = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.at(x, y)?.[0] === rampName) out.push([x, y]);
  return out;
};
const allFrames = (): [string, number][] => ANIMS.flatMap((a) => a.frames.map((_, f): [string, number] => [a.name, f]));
const slotOf = (c: string): string | undefined => LEGEND[c]?.[0];

describe('pixmates.vampire pack (D-20 chibi, normal face)', () => {
  it('builds all 16 shared animations at 48 × 56 within 1024², walk facing right, deterministically', () => {
    const built = buildPack(createVampirePack(), ctx);
    const m = manifestSchema.parse(built.manifest);
    expect(m.frameSize).toEqual({ w: 48, h: 56 });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(buildPack(createVampirePack(), ctx).sha256).toBe(built.sha256);
  });
  it('keeps rows 0–1 clear in every frame, and ≥ 8 headroom rows over the slicked crown at rest', () => {
    const topRow = (name: string, f: number): number => {
      const { image } = renderer.renderLabeled(anim(name), f, ctx);
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++) if (image.data[(y * image.width + x) * 4 + 3]) return y;
      return image.height;
    };
    for (const [name, f] of allFrames()) expect(topRow(name, f), `${name}/${String(f)}`).toBeGreaterThanOrEqual(2);
    expect(topRow('idle_a', 0)).toBeGreaterThanOrEqual(8);
  });
  it('passes the arm-over-torso gate on every frame', () => {
    const deepest = deepestTones(palette);
    const problems = ANIMS.flatMap((a) =>
      a.frames.flatMap((_, f) => {
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
        const far = bodyViewOf(a, f) === 'q34' ? ('R' as const) : undefined;
        return armTorsoProblems(armTorsoContrast(image, labels, deepest), far ? { far } : undefined).map(
          (p) => `${a.name}/${String(f)}: ${p}`,
        );
      }),
    );
    expect(problems).toEqual([]);
  });
});

describe('costume materials (vampire.md §1–3, ART-BIBLE §12)', () => {
  it.each([
    ['cloth_midnight', 'cloak, waistcoat, sleeves, trousers, shoes'],
    ['cloth_ochre', 'old gold: collar face, buttons, cloak corners, buckle'],
    ['cloth_cream', 'shirt, ascot, moonstone, cuffs'],
    ['hair_black', 'slicked hair'],
    ['skin', 'face and hands'],
  ])('shows %s (%s) on every frame', (rampName) => {
    for (const [name, f] of allFrames())
      expect(rampPx(name, f, rampName).length, `${name}/${String(f)}`).toBeGreaterThan(0);
  });
  it('never uses goth’s plum-black or garnet, ronin’s vermilion, coder’s mustard or onyx (cast uniqueness)', () => {
    for (const r of ['cloth_black', 'gem_garnet', 'lacquer_red', 'cloth_mustard', 'cloth_onyx']) {
      for (const [name, f] of allFrames()) expect(rampPx(name, f, r), `${r} ${name}/${String(f)}`).toEqual([]);
    }
  });
});

describe('crimson eyes and fangs (vampire.md §4, owner Q2 / Q3)', () => {
  it('puts crimson (fx_red) only inside the eye band of the face, on every frame, and shows it on open eyes', () => {
    for (const [name, f] of allFrames()) {
      const [fx, fy] = renderer.joints(anim(name), f).face;
      for (const [x, y] of rampPx(name, f, 'fx_red')) {
        expect(x - Math.round(fx), `${name}/${String(f)} x ${String(x)}`).toBeGreaterThanOrEqual(0);
        expect(x - Math.round(fx), `${name}/${String(f)} x ${String(x)}`).toBeLessThan(20);
        expect(y - Math.round(fy), `${name}/${String(f)} y ${String(y)}`).toBeGreaterThanOrEqual(2);
        // Eye rows 4–8 under the face joint; the land squash stamps the face 2 rows lower (10).
        expect(y - Math.round(fy), `${name}/${String(f)} y ${String(y)}`).toBeLessThanOrEqual(10);
      }
    }
    expect(rampPx('idle_a', 0, 'fx_red').length).toBeGreaterThanOrEqual(16);
    expect(rampPx('walk', 1, 'fx_red').length).toBeGreaterThanOrEqual(8);
  });
  it('neutral: a closed ink mouth line with a symmetric pair of 1-px cream fangs under it, skin between them', () => {
    expect(VAMPIRE.face.expressions.neutral.mouth).toBe('fangs');
    const p = pixels('idle_a', 0);
    const [fx, fy] = renderer.joints(anim('idle_a'), 0).face;
    const y = Math.round(fy) + 11;
    const x = Math.round(fx) + 8;
    expect(p.at(x, y)?.[0]).toBe('cloth_cream');
    expect(p.at(x + 3, y)?.[0]).toBe('cloth_cream');
    expect(p.at(x + 1, y)?.[0]).toBe('skin');
    expect(p.at(x + 2, y)?.[0]).toBe('skin');
    expect(p.at(x, y + 1)?.[0], 'fangs are 1 px long').toBe('skin');
    for (let k = 0; k < 4; k++) expect(p.at(x + k, y - 1)?.[0], `mouth px ${String(k)}`).toBe('ink');
    // The axis sits between the fangs (frame centre 24 at rest).
    expect(x + 1.5).toBe(23.5);
  });
});

describe('widow’s peak and open forehead (owner D-23)', () => {
  /** Row of the first skin px from the top per column (Infinity = no skin). */
  const firstSkin = (m: Mask, c: number): number => {
    const r = m.findIndex((row) => slotOf(row.charAt(c)) === 'skin');
    return r < 0 ? Infinity : r;
  };
  it.each([
    ['front', HEAD, 14, 7, 22],
    ['q34', HEAD_Q34, 16, 7, 24],
  ] as const)(
    '%s: the hairline dips to a 2-px V on the face axis, rising monotonically to both temples',
    (_, m, tip, lo, hi) => {
      const t = (c: number): number => firstSkin(m, c);
      expect(t(tip)).toBe(t(tip + 1));
      expect(slotOf(m[t(tip) - 1]?.charAt(tip) ?? '')).toBe('hair');
      for (let c = lo; c < tip; c++) expect(t(c), `col ${String(c)}`).toBeLessThanOrEqual(t(c + 1));
      for (let c = tip + 1; c < hi; c++) expect(t(c), `col ${String(c)}`).toBeGreaterThanOrEqual(t(c + 1));
      expect(t(tip) - t(lo + 1), 'V depth (left)').toBeGreaterThanOrEqual(3);
      expect(t(tip + 1) - t(hi - 1), 'V depth (right)').toBeGreaterThanOrEqual(3);
    },
  );
  it('front: ≥ 3 skin rows of open forehead at each temple above the brows; no forelock px below the V tip', () => {
    const faceRow = 12;
    expect(faceRow - firstSkin(HEAD, 8)).toBeGreaterThanOrEqual(3);
    expect(faceRow - firstSkin(HEAD, 21)).toBeGreaterThanOrEqual(3);
    const tip = firstSkin(HEAD, 14);
    for (let r = tip; r < faceRow + 3; r++) {
      const row = HEAD[r] ?? '';
      const hair = row.split('').flatMap((ch, x) => (slotOf(ch) === 'hair' && x >= 6 && x <= 23 ? [x] : []));
      expect(hair, `row ${String(r)}`).toEqual([]);
    }
  });
  it('the rendered rest frame keeps the V: hair on the axis over forehead skin, skin at both temples', () => {
    const p = pixels('idle_a', 0);
    const [hx, hy] = renderer.joints(anim('idle_a'), 0).head;
    const ox = Math.round(hx) - 15;
    const oy = Math.round(hy) - 14;
    const tip = firstSkin(HEAD, 14);
    for (const c of [14, 15]) {
      expect(p.at(ox + c, oy + tip - 1)?.[0], `tip col ${String(c)}`).toBe('hair_black');
      expect(p.at(ox + c, oy + tip)?.[0], `forehead col ${String(c)}`).toBe('skin');
    }
    expect(p.at(ox + 8, oy + firstSkin(HEAD, 8))?.[0]).toBe('skin');
    expect(p.at(ox + 21, oy + firstSkin(HEAD, 21))?.[0]).toBe('skin');
  });
});

describe('fan collar bounds (R-V2, vampire.md §7)', () => {
  it('fits COLLAR_MAX and the whole pack validates (tips inside x 11–37 and under the eyes on every frame)', () => {
    expect(COLLAR.length).toBeLessThanOrEqual(COLLAR_MAX.h);
    expect(Math.max(...COLLAR.map((r) => r.length))).toBeLessThanOrEqual(COLLAR_MAX.w);
    expect(() => {
      validateBody(VAMPIRE, ANIMS, 56);
    }).not.toThrow();
  });
  it('fails R-V2 when the tips move 1 row up or 1 px out (the collar sits at the limit the owner asked for)', () => {
    const neck = VAMPIRE.masks.neckAcc;
    if (!neck) throw new Error('no collar');
    const moved = (dx: number, dy: number, w: number): Body => ({
      ...VAMPIRE,
      masks: {
        ...VAMPIRE.masks,
        neckAcc: { mask: neck.mask.map((r) => r.padEnd(w, '.')), at: [neck.at[0] + dx, neck.at[1] + dy] },
      },
    });
    expect(() => {
      validateBody(moved(0, -1, 25), ANIMS, 56);
    }).toThrow(/not under the eyes/);
    expect(() => {
      validateBody(moved(-1, 0, 27), ANIMS, 56);
    }).toThrow(/leave x 11\.\.37/);
  });
  it('shows the 2-px gold inner face on both front wings at rest', () => {
    const gold = rampPx('idle_a', 0, 'cloth_ochre').filter(([, y]) => y <= 36);
    expect(gold.filter(([x]) => x < 24).length).toBeGreaterThanOrEqual(6);
    expect(gold.filter(([x]) => x > 24).length).toBeGreaterThanOrEqual(6);
  });
});

describe('gold stays inside the costume (vampire.md §6 p. 5: no edge trim, no chains)', () => {
  it('no gold px on the silhouette edge, no straight gold run over 4 px, gold ≤ 8 % of the figure', () => {
    for (const [name, f] of allFrames()) {
      const p = pixels(name, f);
      const isGold = (x: number, y: number): boolean => p.at(x, y)?.[0] === 'cloth_ochre';
      let figure = 0;
      let gold = 0;
      for (let y = 0; y < p.h; y++) {
        for (let x = 0; x < p.w; x++) {
          if (!p.at(x, y)) continue;
          figure++;
          if (!isGold(x, y)) continue;
          gold++;
          const edge = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => !p.at(x + (dx ?? 0), y + (dy ?? 0)));
          expect(edge, `${name}/${String(f)} gold edge px (${String(x)}, ${String(y)})`).toBe(false);
          let run = 1;
          while (isGold(x + run, y)) run++;
          expect(run, `${name}/${String(f)} row run at (${String(x)}, ${String(y)})`).toBeLessThanOrEqual(4);
          run = 1;
          while (isGold(x, y + run)) run++;
          expect(run, `${name}/${String(f)} column run at (${String(x)}, ${String(y)})`).toBeLessThanOrEqual(4);
        }
      }
      expect(gold / figure, `${name}/${String(f)}`).toBeLessThanOrEqual(0.08);
    }
  });
});

describe('face (normal chibi, ART-BIBLE §11.2–11.3)', () => {
  it('uses the normal face and blushes only on happy and petted', () => {
    expect(VAMPIRE.face.style).toBeUndefined();
    for (const [id, e] of Object.entries(VAMPIRE.face.expressions)) {
      expect(e.cheeks !== 'none', id).toBe(id === 'happy' || id === 'petted');
    }
    for (const [id, e] of Object.entries(Q34_VIEW.face.expressions)) expect(e.cheeks, `q34 ${id}`).toBe('none');
  });
  it('neutral raises one brow (the screen-right one sits 1 row higher)', () => {
    const id = VAMPIRE.face.expressions.neutral.brows ?? '';
    const brows = VAMPIRE.face.brows?.[id];
    if (!brows) throw new Error('no neutral brows');
    const topOf = (lo: number, hi: number): number =>
      brows.mask.findIndex((row) => row.slice(lo, hi).includes('x') || row.slice(lo, hi).includes('X'));
    expect(topOf(0, 10)).toBe(topOf(10, 20) + 1);
  });
});

describe('q34 owner rules (RIG.md: monotonic contour, no cheek bump, head never ahead, steady head)', () => {
  const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));
  /** q34 face anchor row 12 + the open-eye part offset (its first row is the lash). */
  const LASH_ROW = 12 + (Q34_VIEW.face.eyes.open?.at[1] ?? 0);

  it('tapers the facing-side contour monotonically from the lash row: never out, in ≤ 1 px per row, to a chin point', () => {
    const rights = HEAD_Q34.slice(LASH_ROW).map((r) => Math.max(...skinCols(r)));
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeLessThanOrEqual(1);
    }
    const last = skinCols(HEAD_Q34[HEAD_Q34.length - 1] ?? '');
    expect(last).toHaveLength(1);
    // The chin point sits on the facing side: right of the q34 face centre (anchor col 7 + half the 20-px eye band).
    expect(last[0]).toBeGreaterThan(7 + 10);
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
  it('q34 frames (walk, turn): the head never sits ahead of the torso and stays steady against the hip', () => {
    for (const name of ['walk', 'turn']) {
      const a = anim(name);
      const headDx = new Set<number>();
      a.frames.forEach((_, f) => {
        if (bodyViewOf(a, f) !== 'q34') return;
        const j = renderer.joints(a, f);
        headDx.add(Math.round(j.head[0] - j.hip[0]));
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
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
        expect(head[1] - torso[1], `${name}/${String(f)}`).toBeLessThanOrEqual(torso[0] - head[0] + 4);
      });
      expect(headDx.size, name).toBeLessThanOrEqual(1);
    }
    const dx = (name: string, f: number): number => {
      const j = renderer.joints(anim(name), f);
      return Math.round(j.head[0] - j.hip[0]);
    };
    expect(dx('turn', 1)).toBe(dx('walk', 0));
  });
});
