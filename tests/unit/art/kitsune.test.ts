// M-ART MA-28: rig additions for `pixmates.kitsune` (scarf end chain, per-body fox tail) and the kitsune pack gates
// (docs/art/kitsune.md: ears in the headroom, tail width cap, fang on the mouth line, side mask placement, q34 face
// contour, no red on the mask, palette constraints).
import { describe, expect, it } from 'vitest';
import { createKitsunePack, KITSUNE } from '../../../assets-src/characters/kitsune/body.ts';
import { KITSUNE_FACE } from '../../../assets-src/characters/kitsune/face.ts';
import {
  EARS,
  EARS_Q34,
  HEAD,
  HEAD_Q34,
  SIDE_MASK,
  SIDE_MASK_AT,
  SIDE_MASK_Q34,
} from '../../../assets-src/characters/kitsune/masks.ts';
import { LEGEND } from '../../../assets-src/lib/mask.ts';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import {
  ARM_LABEL,
  bodyViewOf,
  createRigPack,
  createRigRenderer,
  q34FoxTail,
  RIG_H,
  SCARF_MAX_BELOW_CHEST,
} from '../../../assets-src/rig/compose.ts';
import { DUMMY_B } from '../../../assets-src/rig/dummies.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace } from '../../../assets-src/rig/face.ts';
import { headViewOf } from '../../../assets-src/rig/compose.ts';
import { deriveQ34Head } from '../../../assets-src/rig/q34.ts';
import type { Body, RigAnim } from '../../../assets-src/rig/types.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const same = (a: { data: Uint8Array }, b: { data: Uint8Array }): boolean =>
  Buffer.from(a.data).equals(Buffer.from(b.data));

describe('rig: scarf ends (neckAcc scarf, MA-28)', () => {
  const q34 = DUMMY_B.views?.q34;
  if (!q34) throw new Error('dummy-b has no q34 view');
  const SCARFED: Body = {
    ...DUMMY_B,
    variants: { ...DUMMY_B.variants, neckAcc: 'scarf' },
    scarf: { at: [3, 5], lengths: [4, 5] },
    views: { q34: { ...q34, scarf: { at: [-2, 3], lengths: [4, 5] } } },
  };

  it('needs scarf ends per used view', () => {
    const noFront: Body = { ...SCARFED };
    delete (noFront as { scarf?: unknown }).scarf;
    expect(() => createRigPack(noFront, ANIMS)).toThrow(/scarf/);
    const noQ34: Body = { ...SCARFED, views: { q34 } };
    expect(() => createRigPack(noQ34, ANIMS)).toThrow(/scarf/);
  });

  it('has two 2-segment ends that never reach below the chest row', () => {
    const r = createRigRenderer(SCARFED);
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const ends = r.scarfEnds(a, f);
        expect(ends, `${a.name}/${String(f)}`).toHaveLength(2);
        const chest = r.joints(a, f).chest[1];
        for (const end of ends) {
          expect(end).toHaveLength(3);
          for (const [, y] of end)
            expect(y, `${a.name}/${String(f)}`).toBeLessThanOrEqual(chest + SCARF_MAX_BELOW_CHEST);
        }
      });
    }
  });

  it('hangs down in front and trails behind the nape (≤ 6 px back) in q34', () => {
    const r = createRigRenderer(SCARFED);
    const idle = anim('idle_a');
    for (const end of r.scarfEnds(idle, 0)) {
      const [root, , tip] = end;
      if (!root || !tip) throw new Error('short end');
      expect(tip[1] - root[1]).toBeGreaterThanOrEqual(2);
    }
    const walk = anim('walk');
    walk.frames.forEach((_, f) => {
      for (const end of r.scarfEnds(walk, f)) {
        const [root, , tip] = end;
        if (!root || !tip) throw new Error('short end');
        expect(tip[0], `walk/${String(f)}`).toBeLessThan(root[0]);
        expect(root[0] - tip[0], `walk/${String(f)}`).toBeLessThanOrEqual(6);
      }
    });
  });

  it('draws the ends (the frame differs from one without them) and has none without a scarf', () => {
    const idle = anim('idle_a');
    const plain: Body = { ...SCARFED, scarf: { at: [3, 5], lengths: [0, 0] } };
    expect(same(createRigRenderer(SCARFED).render(idle, 0, ctx), createRigRenderer(plain).render(idle, 0, ctx))).toBe(
      false,
    );
    expect(createRigRenderer(DUMMY_B).scarfEnds(idle, 0)).toEqual([]);
  });
});

describe('rig: per-body fox tail (MA-28)', () => {
  it('keeps the dummy-b default tail', () => {
    const r = createRigRenderer(DUMMY_B);
    const walk = anim('walk');
    const j = r.joints(walk, 0);
    expect(r.tail(walk, 0)?.points).toEqual(q34FoxTail(j.back, walk.frames[0]?.hairDx ?? 0));
    expect(r.tail(anim('idle_a'), 0)?.radii).toEqual([1.6, 2.3, 2.6, 2.3, 1.5]);
  });

  it('uses the body front radii, chain length and bend, and the q34 curve', () => {
    const points = [
      [0, 0],
      [-4, -2],
      [-8, -4],
    ] as const;
    const body: Body = {
      ...DUMMY_B,
      foxTail: {
        front: {
          radii: [1, 2, 3],
          tipRadii: [2, 1],
          length: 3,
          gravity: [0, -0.1],
          bend: [
            [0, 0],
            [1, 0],
          ],
        },
        q34: { points, radii: [1, 2, 1], tipRadii: [2, 1] },
      },
    };
    const r = createRigRenderer(body);
    const idle = anim('idle_a');
    const front = r.tail(idle, 0);
    expect(front?.radii).toEqual([1, 2, 3]);
    expect(front?.points).toHaveLength(3);
    const walk = anim('walk');
    const j = r.joints(walk, 0);
    expect(r.tail(walk, 0)?.points).toEqual(q34FoxTail(j.back, walk.frames[0]?.hairDx ?? 0, points));
    expect(same(r.render(idle, 0, ctx), createRigRenderer(DUMMY_B).render(idle, 0, ctx))).toBe(false);
  });
});

describe('palette ramps fur_ash + cloth_indigo (MA-28)', () => {
  const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
  it('fur_ash stays silver (mid chroma ≤ 0.03) and ≥ 0.08 L from cloth_indigo at every step; no #000', () => {
    const fur = ramp('fur_ash').map(toOklab);
    const indigo = ramp('cloth_indigo').map(toOklab);
    expect(fur).toHaveLength(7);
    expect(indigo).toHaveLength(7);
    const [, a = 1, b = 1] = fur[3] ?? [];
    // 0.03 in OKLCH; the hex rounding adds < 0.0005.
    expect(Math.hypot(a, b)).toBeLessThanOrEqual(0.0305);
    fur.forEach(([l], i) => {
      expect(Math.abs(l - (indigo[i]?.[0] ?? l)), `step ${String(i)}`).toBeGreaterThanOrEqual(0.08);
    });
    expect(ramp('fur_ash')).not.toContain(0);
    expect(ramp('cloth_indigo')).not.toContain(0);
  });
});

describe('pixmates.kitsune pack (MA-28)', () => {
  const built = buildPack(createKitsunePack(), ctx);
  const m = manifestSchema.parse(built.manifest);
  const q34 = KITSUNE.views?.q34;
  if (!q34) throw new Error('kitsune has no q34 view');
  const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];

  it('builds all shared animations at 48 × 56 within 1024², walk/turn facing right, deterministically', () => {
    expect(m.id).toBe('pixmates.kitsune');
    expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(facingOf(m.animations['turn'] ?? {})).toBe('right');
    expect(facingOf(m.animations['idle_a'] ?? {})).toBe('front');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(built.atlasSize.width).toBeLessThanOrEqual(1024);
    expect(built.atlasSize.height).toBeLessThanOrEqual(1024);
    expect(buildPack(createKitsunePack(), ctx).sha256).toBe(built.sha256);
  });

  it('has authored heads (not the derived q34 stand-in), 30 px wide', () => {
    expect(HEAD.every((r) => r.length === 30)).toBe(true);
    expect(q34.head.mask.every((r) => r.length === 30)).toBe(true);
    expect(q34.head.mask).not.toEqual(deriveQ34Head(HEAD));
  });

  it('passes the face validator per view: all front expressions, q34 neutral + blink', () => {
    expect(Object.keys(KITSUNE_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(KITSUNE_FACE, 'kitsune', { mask: HEAD, faceAt: [5, 12] })).toEqual([]);
    expect(Object.keys(q34.face.expressions).sort()).toEqual([...Q34_EXPRESSIONS].sort());
    expect(validateFace(q34.face, 'kitsune/q34', { mask: q34.head.mask, faceAt: [7, 12] }, Q34_EXPRESSIONS)).toEqual(
      [],
    );
  });

  it('keeps the ears inside the headroom: rows 0 and 1 clear on every frame, the happy apex included', () => {
    for (const [name, frames] of built.frames) {
      frames.forEach((img, f) => {
        for (let x = 0; x < img.width * 2; x++) expect(img.data[x * 4 + 3], `${name}/${String(f)}`).toBe(0);
      });
    }
    expect(anim('happy').frames.some((f) => f.hairLift === 1)).toBe(true);
  });

  it('never draws the tail wider than 7 px or the head, outer x ≤ 44 in front', () => {
    const headW = Math.max(...HEAD.map((r) => r.replace(/^\.+|\.+$/g, '').length));
    const r = createRigRenderer(KITSUNE);
    let drawn = 0;
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const t = r.tail(a, f);
        if (!t) return;
        drawn++;
        const widest = 2 * Math.max(...t.radii, ...t.tipRadii);
        expect(widest).toBeLessThanOrEqual(7);
        expect(widest).toBeLessThan(headW);
        if (bodyViewOf(a, f) === 'front') {
          t.points.forEach(([x], i) => {
            expect(x + 0.5 + (t.radii[i] ?? 0), `${a.name}/${String(f)}`).toBeLessThanOrEqual(44);
          });
        }
      });
    }
    expect(drawn).toBeGreaterThan(90);
  });

  it('keeps the scarf ends above the chest row limit on every frame', () => {
    const r = createRigRenderer(KITSUNE);
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const ends = r.scarfEnds(a, f);
        expect(ends).toHaveLength(2);
        const chest = r.joints(a, f).chest[1];
        for (const end of ends) for (const [, y] of end) expect(y).toBeLessThanOrEqual(chest + SCARF_MAX_BELOW_CHEST);
      });
    }
  });

  it('puts every fang (cream) px directly against the mouth line', () => {
    let fangs = 0;
    for (const lib of [KITSUNE_FACE, q34.face]) {
      for (const [id, p] of Object.entries(lib.mouths)) {
        if (id === 'gritted') continue;
        p.mask.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            if (slotOf(row.charAt(x)) !== 'apron') continue;
            fangs++;
            const touching = [
              [x - 1, y],
              [x + 1, y],
              [x, y - 1],
            ].some(([u = -1, v = -1]) => slotOf(p.mask[v]?.charAt(u) ?? '.') === 'ink');
            expect(touching, `${id} fang at ${String(x)},${String(y)}`).toBe(true);
          }
        });
      }
    }
    expect(fangs).toBeGreaterThanOrEqual(5);
    const neutral = KITSUNE_FACE.mouths[KITSUNE_FACE.expressions.neutral.mouth]?.mask ?? [];
    expect(neutral.join('')).toMatch(/P/);
  });

  describe.each([
    ['front', HEAD, EARS, SIDE_MASK, SIDE_MASK_AT.front],
    ['q34', HEAD_Q34, EARS_Q34, SIDE_MASK_Q34, SIDE_MASK_AT.q34],
  ] as const)('%s side mask', (_, head, ears, mask, at) => {
    /** Lash row: face anchor row 12 + the open eye's y 3 (both views). */
    const LASH_ROW = 15;
    const px = mask.flatMap((row, y) =>
      row.split('').flatMap((c, x) => (c === '.' ? [] : [[at[0] + x, at[1] + y, c] as const])),
    );
    it('is stamped into the head mask with horn/trim/ink letters only and ends above the lash row', () => {
      expect(px.length).toBeGreaterThan(20);
      for (const [x, y, c] of px) {
        expect(head[y]?.charAt(x)).toBe(c);
        expect(['horn', 'trim', 'ink']).toContain(slotOf(c));
        expect(y).toBeLessThan(LASH_ROW - 1);
      }
    });
    it('keeps ≥ 1 px clear of the ear (no ear px in its 8-neighbourhood)', () => {
      // Ears sit at acc + (−11, −4) = head-mask (4, −1).
      const ear = new Set<string>();
      ears.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row.charAt(x) !== '.') ear.add(`${String(x + 4)},${String(y - 1)}`);
      });
      for (const [x, y] of px)
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) expect(ear.has(`${String(x + dx)},${String(y + dy)}`)).toBe(false);
    });
  });

  it('renders no red-ramp px on the side mask', () => {
    const red = new Set(['cloth_rose', 'fx_red', 'fur_fox', 'hair_copper'].flatMap((n) => palette.ramps.get(n) ?? []));
    const r = createRigRenderer(KITSUNE);
    for (const [name, f, mask, at, head] of [
      ['idle_a', 0, SIDE_MASK, SIDE_MASK_AT.front, KITSUNE.head],
      ['walk', 0, SIDE_MASK_Q34, SIDE_MASK_AT.q34, q34.head],
    ] as const) {
      const a = anim(name);
      const img = r.render(a, f, ctx);
      const j = r.joints(a, f);
      const x0 = Math.round(j.head[0] + head.at[0]) + at[0];
      const y0 = Math.round(j.head[1] + head.at[1]) + at[1];
      let seen = 0;
      mask.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row.charAt(x) === '.') continue;
          const i = ((y0 + y) * img.width + x0 + x) * 4;
          if (!img.data[i + 3]) continue;
          const rgb = ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
          expect(red.has(rgb), `${name} mask px ${String(x)},${String(y)}`).toBe(false);
          seen++;
        }
      });
      expect(seen).toBeGreaterThan(20);
    }
  });

  describe('q34 face contour (RIG.md «Views»)', () => {
    const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));
    it('keeps the facing edge vertical eye → mouth, then rounds the chin (steps 1, 1, 1, 2) to a 1-px point', () => {
      // Art round MA-28-1: no 45° stair; only the last step (to the chin point) may be 2 px.
      const rights = q34.head.mask.slice(15).map((r) => Math.max(...skinCols(r)));
      const mouthRow = 22 - 15;
      for (let k = 1; k < rights.length; k++) {
        const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
        expect(step, `row ${String(15 + k)}`).toBeGreaterThanOrEqual(0);
        if (k <= mouthRow) expect(step, `row ${String(15 + k)} (eye → mouth)`).toBe(0);
        else expect(step, `row ${String(15 + k)}`).toBeLessThanOrEqual(k === rights.length - 1 ? 2 : 1);
      }
      expect(rights.at(-1)).toBe(20);
      expect(skinCols(q34.head.mask.at(-1) ?? '')).toHaveLength(1);
    });
    it('has no facing-side px outside the face edge (+ far lock + outline) between the eye and mouth rows', () => {
      const r = createRigRenderer(KITSUNE);
      for (const name of ['walk', 'turn']) {
        const a = anim(name);
        a.frames.forEach((_, f) => {
          if (headViewOf(a, f) !== 'q34') return;
          const img = r.render(a, f, ctx);
          const j = r.joints(a, f);
          const x0 = Math.round(j.head[0] + q34.head.at[0]);
          const y0 = Math.round(j.head[1] + q34.head.at[1]);
          // Face edge col 25, far lock col 26, its outline col 27.
          for (let y = y0 + 15; y <= y0 + 22; y++)
            for (let x = x0 + 28; x < img.width; x++)
              expect(img.data[(y * img.width + x) * 4 + 3], `${name}/${String(f)} at ${String(x)},${String(y)}`).toBe(
                0,
              );
        });
      }
    });
    it('keeps the q34 skin no wider than the front skin', () => {
      const width = (mask: readonly string[]): number =>
        Math.max(
          ...mask
            .map(skinCols)
            .filter((c) => c.length > 0)
            .map((c) => Math.max(...c) - Math.min(...c) + 1),
        );
      expect(width(q34.head.mask)).toBeLessThanOrEqual(width(HEAD));
    });
    it('overhangs the torso front by no more than the back overhang + 4 px on walk', () => {
      // Torso = bodice, sash and shorts (indigo/teal px; arms, tail and shins excluded).
      const cloth = new Set(['cloth_indigo', 'cloth_teal'].flatMap((n) => palette.ramps.get(n) ?? []));
      const walk = anim('walk');
      const r = createRigRenderer(KITSUNE);
      walk.frames.forEach((_, f) => {
        const j = r.joints(walk, f);
        const { image, labels } = r.renderLabeled(walk, f, ctx);
        const ext = (y0: number, y1: number, noArms: boolean): [number, number] => {
          let lo = Infinity;
          let hi = -Infinity;
          for (let y = y0; y <= y1; y++) {
            for (let x = 0; x < image.width; x++) {
              const i = (y * image.width + x) * 4;
              if (!image.data[i + 3]) continue;
              const l = labels.data[i];
              if (noArms && l !== ARM_LABEL.none && l !== ARM_LABEL.torso && l !== ARM_LABEL.trim) continue;
              const rgb = ((image.data[i] ?? 0) << 16) | ((image.data[i + 1] ?? 0) << 8) | (image.data[i + 2] ?? 0);
              if (noArms && !cloth.has(rgb)) continue;
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
  });

  it('passes the arm-over-torso contrast gate on every frame (0 FAIL)', () => {
    const deepest = deepestTones(palette);
    const r = createRigRenderer(KITSUNE);
    const problems: string[] = [];
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image, labels } = r.renderLabeled(a, f, ctx);
        const opts = bodyViewOf(a, f) === 'q34' ? { far: 'R' as const } : undefined;
        for (const p of armTorsoProblems(armTorsoContrast(image, labels, deepest), opts))
          problems.push(`${a.name}/${String(f)}: ${p}`);
      });
    }
    expect(problems).toEqual([]);
  });

  it('moves the 1-px pupil with the iris on glance; lash and highlights stay', () => {
    const open = KITSUNE_FACE.eyes['open'];
    const side = KITSUNE_FACE.eyes['side'];
    if (!open || !side) throw new Error('eyes');
    expect(side.mask).not.toEqual(open.mask);
    expect(side.mask.slice(0, 3)).toEqual(open.mask.slice(0, 3));
    open.mask.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if ('Pp'.includes(row.charAt(x))) expect(side.mask[y]?.charAt(x)).toBe(row.charAt(x));
      }
    });
  });
});

describe('kitsune art round MA-28-2', () => {
  const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
  it('ends the q34 near lock at the eye-bottom row + 1 (row 21), tapering to a 1-px tip', () => {
    const rows = HEAD_Q34.flatMap((row, y) =>
      row
        .slice(0, 7)
        .split('')
        .some((c) => slotOf(c) === 'hair')
        ? [y]
        : [],
    );
    expect(Math.max(...rows)).toBe(21);
    const width = (y: number): number =>
      (HEAD_Q34[y] ?? '')
        .slice(0, 7)
        .split('')
        .filter((c) => slotOf(c) === 'hair').length;
    expect([width(19), width(20), width(21)]).toEqual([4, 3, 1]);
    // 1 px of cheek skin between the lock and the face on the eye rows.
    for (let y = 15; y <= 20; y++) expect(slotOf(HEAD_Q34[y]?.charAt(6) ?? '.')).toBe('skin');
  });
  it('keeps only the slits and the teal tip as dark px under the mask brows', () => {
    for (const m of [SIDE_MASK, SIDE_MASK_Q34])
      for (const row of m.slice(3))
        for (const c of row)
          expect(['ink', 'trim', undefined]).toContain(
            c === 'n' ? 'dark-outline' : slotOf(c) === 'horn' ? undefined : slotOf(c),
          );
  });
  it('arches the neutral lid over a full 4 × 4 iris with the darkest tone on top (still unlike think)', () => {
    const open = KITSUNE_FACE.eyes['open']?.mask ?? [];
    expect(open[0]?.slice(0, 10)).toBe('.X..XX....');
    expect(open[2]?.slice(3, 7)).toBe('PCCC');
    expect(KITSUNE_FACE.eyes['think']?.mask).not.toEqual(open);
  });
});

describe('kitsune art round MA-28-1', () => {
  const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
  const q34 = KITSUNE.views?.q34;
  if (!q34) throw new Error('q34');

  it.each([
    ['front', SIDE_MASK],
    ['q34', SIDE_MASK_Q34],
  ] as const)('%s side mask reads as a fox face: diagonal 2-px eyes, no ink blocks or nose, teal 1-px tip', (_, m) => {
    const at = (x: number, y: number): string => m[y]?.charAt(x) ?? '.';
    const ink: [number, number][] = [];
    m.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (slotOf(row.charAt(x)) === 'ink') ink.push([x, y]);
    });
    expect(ink).toHaveLength(4);
    for (const [x, y] of ink) {
      // Each eye px has exactly one diagonal ink partner and no orthogonal ink neighbour (no 2×2 blocks).
      expect([at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((c) => slotOf(c) === 'ink')).toBe(false);
      expect(
        [at(x + 1, y + 1), at(x - 1, y + 1), at(x + 1, y - 1), at(x - 1, y - 1)].filter((c) => slotOf(c) === 'ink'),
      ).toHaveLength(1);
    }
    // Slant up and out: each eye's upper px is the outer one.
    const [l1, l2] = ink.filter(([x]) => x < 3).sort((a, b) => a[1] - b[1]);
    expect((l1?.[0] ?? 9) < (l2?.[0] ?? 0)).toBe(true);
    const last = (m.at(-1) ?? '').split('').filter((c) => c !== '.' && slotOf(c) !== 'horn');
    expect(last).toEqual(['t']);
    expect(m[0]?.replace(/\./g, '')).toBe('oo');
    // Outline = horn shade 2 (tone 1, 'n') at the top; no tan ring all round.
    // Round 2: below the brows the outline lightens to horn shade 4 (O); the top stays n.
    expect(m.slice(0, 3).join('')).not.toMatch(/O/);
  });

  it('front tail: cream only on the last 2 points, root 2 px out from the back joint, a lit shine stroke', () => {
    const r = createRigRenderer(KITSUNE);
    const idle = anim('idle_a');
    const t = r.tail(idle, 0);
    expect(t?.tipRadii).toHaveLength(2);
    expect((t?.points[0]?.[0] ?? 0) - r.joints(idle, 0).back[0]).toBeGreaterThanOrEqual(1.5);
    const front = KITSUNE.foxTail?.front;
    if (!front) throw new Error('front tail');
    const { shine, ...noShine } = front;
    expect(shine).toBe(true);
    const plain: Body = { ...KITSUNE, foxTail: { ...KITSUNE.foxTail, front: noShine } };
    expect(same(r.render(idle, 0, ctx), createRigRenderer(plain).render(idle, 0, ctx))).toBe(false);
  });

  it('shows ≥ 4 cream shin rows above the tabi, with one darker wrap row, under darker tailored shorts', () => {
    const r = createRigRenderer(KITSUNE);
    const idle = anim('idle_a');
    const img = r.render(idle, 0, ctx);
    const j = r.joints(idle, 0);
    const cream = palette.ramps.get('cloth_cream') ?? [];
    const rgb = (x: number, y: number): number => {
      const i = (y * img.width + x) * 4;
      return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
    };
    const x = Math.round(j.footL[0]);
    const rows: number[] = [];
    for (let y = Math.round(j.hip[1]) - 2; y < Math.round(j.footL[1]); y++)
      if (cream.includes(rgb(x, y))) rows.push(rgb(x, y));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows).toContain(cream[4]);
    const shade = KITSUNE.shorts?.shade ?? 3;
    expect(shade).toBeLessThanOrEqual(2);
    expect(KITSUNE.sash?.rows).toBe(2);
  });

  it('neutral face: 1 light blush px per cheek, fang under the high smirk corner, inner lid lifted', () => {
    for (const lib of [KITSUNE_FACE, q34.face]) {
      const n = lib.expressions.neutral;
      if (!n) throw new Error('neutral');
      const cheeks = lib.cheeks[n.cheeks]?.mask ?? [];
      expect(cheeks.join('').replace(/\./g, '').length).toBeLessThanOrEqual(2);
      const mouth = lib.mouths[n.mouth]?.mask ?? [];
      const top = mouth[0] ?? '';
      const corner = top.search(/[Xx]/);
      expect(corner).toBeGreaterThanOrEqual(0);
      expect(mouth[1]?.charAt(corner)).toBe('P');
      const eyes = lib.eyes[n.eyes]?.mask ?? [];
      // The lid line is one row (row 1) across each eye; row 2 holds no lash ink.
      expect((eyes[2] ?? '').match(/X/g) ?? []).toHaveLength(0);
    }
    expect(KITSUNE_FACE.expressions.petted.cheeks).toBe('strong');
  });
});
