// M-ART MA-67 (D-22, docs/art/knight.md): `pixmates.knight` — the chibi human knight in full silver plate (variant B:
// great bascinet with a pointed hounskull visor, mail camail, emerald sash). Pack build, headroom, the arm-over-torso
// gate, the costume materials on every frame, the visor rule per animation frame (lowered = no face px + slit glints,
// raised = the face), the visor shapes (no cross, no T-slit, glints on the slits), the normal face (blush only on happy
// and petted) and the q34 owner rules with the visor up and down. Ramp gates: knight-palette.test.ts.
import { describe, expect, it } from 'vitest';
import { createKnightPack, KNIGHT, VISOR_DOWN_IN } from '../../../assets-src/characters/knight/body.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import type { ExpressionId } from '../../../assets-src/rig/face.ts';
import type { PlacedMask, RigAnim, Visor } from '../../../assets-src/rig/types.ts';
import { visorIsDown } from '../../../assets-src/rig/views.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const renderer = createRigRenderer(KNIGHT);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const visorOf = (): Visor => {
  if (!KNIGHT.visor) throw new Error('knight has no visor');
  return KNIGHT.visor;
};
const VISOR = visorOf();
const Q34 = KNIGHT.views?.q34;
if (!Q34?.head) throw new Error('knight has no q34 head');
const HEAD_Q34 = Q34.head;
const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i * 4] ?? 0) << 16) | ((data[i * 4 + 1] ?? 0) << 8) | (data[i * 4 + 2] ?? 0);
/** Ramp step of every px of a frame (-1 = another ramp or empty). */
const steps = (
  name: string,
  f: number,
  rampName: string,
): { w: number; h: number; at: (x: number, y: number) => number } => {
  const r = ramp(rampName);
  const { image } = renderer.renderLabeled(anim(name), f, ctx);
  return {
    w: image.width,
    h: image.height,
    at: (x, y) => {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) return -1;
      const i = y * image.width + x;
      return image.data[i * 4 + 3] ? r.indexOf(rgbAt(image.data, i)) : -1;
    },
  };
};
const count = (name: string, f: number, rampName: string): number => {
  const s = steps(name, f, rampName);
  let n = 0;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.at(x, y) >= 0) n++;
  return n;
};
const allFrames = (): [string, number][] => ANIMS.flatMap((a) => a.frames.map((_, f): [string, number] => [a.name, f]));

describe('pixmates.knight pack (D-22 chibi, normal face)', () => {
  it('builds all 16 shared animations at 48 × 56 within 1024², walk facing right, deterministically', () => {
    const built = buildPack(createKnightPack(), ctx);
    const m = manifestSchema.parse(built.manifest);
    expect(m.frameSize).toEqual({ w: 48, h: 56 });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(buildPack(createKnightPack(), ctx).sha256).toBe(built.sha256);
  });
  it('keeps rows 0–1 clear in every frame (headroom over the bascinet point)', () => {
    for (const [name, f] of allFrames()) {
      const { image } = renderer.renderLabeled(anim(name), f, ctx);
      const top = Array.from({ length: image.width * 2 }, (_, x) => image.data[x * 4 + 3] ?? 0);
      expect(Math.max(...top), `${name}/${String(f)}`).toBe(0);
    }
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
  it('uses the normal chibi face (no stern option)', () => {
    expect(KNIGHT.face.style).toBeUndefined();
  });
});

describe('costume materials (knight.md §3, ART-BIBLE §12)', () => {
  it.each([
    ['metal_silver', 'plate'],
    ['hair_umber', 'leather: belt, sword grip, scabbard'],
    ['cloth_emerald', 'sash'],
  ])('shows %s (%s) on every frame', (rampName) => {
    for (const [name, f] of allFrames()) expect(count(name, f, rampName), `${name}/${String(f)}`).toBeGreaterThan(0);
  });
  it('shows mail texture (silver 2/3 checker blocks) on every frame', () => {
    for (const [name, f] of allFrames()) {
      const s = steps(name, f, 'metal_silver');
      let blocks = 0;
      for (let y = 0; y < s.h - 1; y++)
        for (let x = 0; x < s.w - 1; x++) {
          const a = s.at(x, y);
          const b = s.at(x + 1, y);
          if (
            (a === 2 || a === 3) &&
            (b === 2 || b === 3) &&
            a !== b &&
            s.at(x + 1, y + 1) === a &&
            s.at(x, y + 1) === b
          )
            blocks++;
        }
      expect(blocks, `${name}/${String(f)}`).toBeGreaterThanOrEqual(6);
    }
  });
  it('never uses the witch’s moss, ronin’s jade or a gold (originality: no witch, no Link cap, no coder mustard)', () => {
    for (const r of ['cloth_moss', 'jade', 'cloth_mustard']) {
      for (const a of ANIMS) expect(count(a.name, 0, r), `${r} ${a.name}`).toBe(0);
    }
  });
});

describe('visor rule (owner 2026-11-27, knight.md §1)', () => {
  it('matches the approved table', () => {
    expect(VISOR_DOWN_IN).toEqual({
      walk: 'all',
      turn: 'all',
      startle: [1, 2, 3, 4],
      fall: 'all',
      drag: 'all',
      land: [0, 1],
    });
    expect(VISOR.downIn).toBe(VISOR_DOWN_IN);
  });
  it('lowered: no face px (skin, ink, blush) on any lowered frame; raised: the face shows', () => {
    for (const [name, f] of allFrames()) {
      const skin = count(name, f, 'skin') + count(name, f, 'ink') + count(name, f, 'cloth_rose');
      if (visorIsDown(VISOR, name, f)) expect(skin, `${name}/${String(f)} down`).toBe(0);
      else expect(skin, `${name}/${String(f)} up`).toBeGreaterThan(40);
    }
  });
  it('lowered: cream slit glints on every frame except a blink; raised: no glint px outside the face', () => {
    for (const a of ANIMS)
      a.frames.forEach((p, f) => {
        if (!visorIsDown(VISOR, a.name, f)) return;
        const n = count(a.name, f, 'cloth_cream');
        if (p.face === 'blink') expect(n, `${a.name}/${String(f)}`).toBe(0);
        else expect(n, `${a.name}/${String(f)}`).toBeGreaterThan(0);
      });
  });
  it('glints are cream only (never an emissive colour) and sit on a slit px of the lowered visor', () => {
    const check = (down: PlacedMask | undefined, slits: Visor['slit']): void => {
      if (!down) throw new Error('no down mask');
      for (const [e, s] of Object.entries(slits ?? {})) {
        s.mask.forEach((row, y) => {
          row.split('').forEach((ch, x) => {
            if (ch === '.') return;
            expect(LEGEND[ch]?.[0], `${e} ${ch}`).toBe('apron');
            const dx = s.at[0] - down.at[0] + x;
            const dy = s.at[1] - down.at[1] + y;
            expect(down.mask[dy]?.charAt(dx), `${e} glint ${String(dx)},${String(dy)}`).toBe('J');
          });
        });
      }
    };
    check(VISOR.down, VISOR.slit);
    check(VISOR.downQ34, VISOR.slitQ34);
    expect(Object.keys(VISOR.slit ?? {}).sort()).toEqual(['neutral', 'startle', 'wince', 'worried']);
  });
});

describe('visor shape (knight.md §5: no cross, no T-slit, not an onion)', () => {
  /** Interior `J` px (not the row's first or last px): the slits and the breaths. */
  const interiorDark = (m: Mask): [number, number][] =>
    m.flatMap((row, y) => {
      const xs = row.split('').flatMap((c, x) => (c === '.' ? [] : [x]));
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      return row
        .split('')
        .flatMap((c, x): [number, number][] => (c === 'J' && x > lo + 1 && x < hi - 1 ? [[x, y]] : []));
    });
  /** Rows holding a horizontal dark run of ≥ 3 px (an eye slit). */
  const slitRows = (m: Mask): number[] =>
    m.flatMap((row, y) => {
      const dark = new Set(interiorDark([row]).map(([x]) => x));
      return [...dark].some((x) => dark.has(x + 1) && dark.has(x + 2)) ? [y] : [];
    });
  /** A ridge px: tone 5 (`y`) lit-left against tone 3 (`h`) on its right — a value split, not a line. */
  const isRidge = (m: Mask, x: number, y: number): boolean => {
    const row = m[y] ?? '';
    return row.charAt(x) === 'y' && row.charAt(x + 1) === 'h';
  };
  /** The ridge: value-split px stacked vertically (a lone one is an edge highlight). */
  const ridge = (m: Mask): [number, number][] =>
    m.flatMap((row, y) =>
      row
        .split('')
        .flatMap((_, x): [number, number][] =>
          isRidge(m, x, y) && (isRidge(m, x, y - 1) || isRidge(m, x, y + 1)) ? [[x, y]] : [],
        ),
    );

  it.each([
    ['front', VISOR.down.mask],
    ['q34', VISOR.downQ34?.mask ?? []],
  ])('%s: two slits, the lit ridge ≥ 2 rows below them (never near a slit row: no T, no cross)', (_, m) => {
    const rows = slitRows(m);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const r = ridge(m);
    expect(r.length).toBeGreaterThanOrEqual(4);
    for (const [x, y] of r) {
      for (const sy of rows)
        expect(Math.abs(y - sy), `ridge ${String(x)},${String(y)} near slit row ${String(sy)}`).toBeGreaterThan(2);
    }
    expect(Math.min(...r.map(([, y]) => y)), 'ridge starts below the slits').toBeGreaterThan(Math.max(...rows));
    // Two slits: the dark slit px of the slit rows fall in two clusters split by the ridge column.
    const ridgeX = r[0]?.[0] ?? -1;
    const dark = interiorDark(m).filter(([, y]) => rows.includes(y));
    expect(dark.some(([x]) => x < ridgeX) && dark.some(([x]) => x > ridgeX)).toBe(true);
    expect(dark.some(([x]) => x === ridgeX)).toBe(false);
  });
  it.each([
    ['front', VISOR.down.mask],
    ['q34', VISOR.downQ34?.mask ?? []],
  ])('%s: no vertical dark run (no T-slit): breaths are single holes', (_, m) => {
    const dark = new Set(interiorDark(m).map(([x, y]) => `${String(x)},${String(y)}`));
    for (const k of dark) {
      const [x = 0, y = 0] = k.split(',').map(Number);
      expect(dark.has(`${String(x)},${String(y + 1)}`), k).toBe(false);
    }
  });
  it('the lowered snout tapers to a point (≤ 6 px at the tip), the skull to a pointed top (not an onion bulb)', () => {
    const widths = (m: Mask): number[] =>
      m.flatMap((r) => {
        const xs = r.split('').flatMap((c, x) => (c === '.' ? [] : [x]));
        return xs.length ? [Math.max(...xs) - Math.min(...xs) + 1] : [];
      });
    expect(widths(VISOR.down.mask).at(-1)).toBeLessThanOrEqual(6);
    // Ogive: the skull widens monotonically from the tip down to its widest row — no pinched neck under a bulb.
    const skull = widths(KNIGHT.head.mask);
    const widest = skull.indexOf(Math.max(...skull));
    for (let k = 1; k <= widest; k++) expect(skull[k] ?? 0).toBeGreaterThanOrEqual(skull[k - 1] ?? 0);
  });
});

describe('face (normal chibi, ART-BIBLE §11.2–11.3)', () => {
  it('blushes only on happy and petted', () => {
    for (const [id, e] of Object.entries(KNIGHT.face.expressions)) {
      expect(e.cheeks !== 'none', id).toBe(id === 'happy' || id === 'petted');
    }
    for (const [id, e] of Object.entries(Q34.face.expressions)) expect(e.cheeks, `q34 ${id}`).toBe('none');
  });
  it.each(['happy', 'worried', 'startle', 'think', 'petted', 'wince'] as ExpressionId[])(
    'raised: %s changes both the eyes and the mouth from neutral (emotion reads with the visor up)',
    (id) => {
      const e = KNIGHT.face.expressions[id];
      const n = KNIGHT.face.expressions.neutral;
      expect(e.eyes).not.toBe(n.eyes);
      expect(e.mouth).not.toBe(n.mouth);
    },
  );
});

describe('q34 owner rules (RIG.md: monotonic contour, no cheek bump, head never ahead, steady head)', () => {
  /** The head mask with a visor mask stamped over it (visor px win), in head-mask coordinates. */
  const composite = (head: PlacedMask, visor: PlacedMask | undefined): Mask => {
    if (!visor) throw new Error('no q34 visor');
    const dx = visor.at[0] - head.at[0];
    const dy = visor.at[1] - head.at[1];
    return head.mask.map((row, y) =>
      row
        .split('')
        .map((c, x) => {
          const v = visor.mask[y - dy]?.charAt(x - dx) ?? '';
          return v && v !== '.' ? v : c;
        })
        .join(''),
    );
  };
  const firstFaceRow = HEAD_Q34.mask.findIndex((r) => r.split('').some((c) => LEGEND[c]?.[0] === 'skin'));

  it.each([
    ['raised', composite(HEAD_Q34, VISOR.upQ34)],
    ['lowered', composite(HEAD_Q34, VISOR.downQ34)],
  ])('visor %s: the facing contour from the face down never steps out and steps in ≤ 1 px per row', (_, m) => {
    const rights = m.slice(firstFaceRow).flatMap((r) => {
      const xs = r.split('').flatMap((c, x) => (c === '.' ? [] : [x]));
      return xs.length ? [Math.max(...xs)] : [];
    });
    expect(rights.length).toBeGreaterThan(10);
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(firstFaceRow + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(firstFaceRow + k)}`).toBeLessThanOrEqual(1);
    }
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
    // Walk and the q34 turn frame share one head offset.
    const dx = (name: string, f: number): number => {
      const j = renderer.joints(anim(name), f);
      return Math.round(j.head[0] - j.hip[0]);
    };
    expect(dx('turn', 1)).toBe(dx('walk', 0));
  });
});
