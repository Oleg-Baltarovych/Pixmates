// M-ART MA-66 (D-20, docs/art/coder.md): `pixmates.coder` — pack build, headroom with the cowlick, the costume layers
// on every frame (mustard hoodie, cream tee hem / lanyard, denim, indigo cord), the arm-over-torso gate, the q34 walk
// head rules. Faces and head masks: coder-face.test.ts; ramp gates: coder-palette.test.ts.
import { describe, expect, it } from 'vitest';
import { CODER, createCoderPack } from '../../../assets-src/characters/coder/body.ts';
import { CHEST, CHEST_Q34 } from '../../../assets-src/characters/coder/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import type { RigAnim } from '../../../assets-src/rig/types.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const renderer = createRigRenderer(CODER);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const tones = (ramp: string): Set<number> => new Set(palette.ramps.get(ramp) ?? []);
const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i * 4] ?? 0) << 16) | ((data[i * 4 + 1] ?? 0) << 8) | (data[i * 4 + 2] ?? 0);
const count = (name: string, f: number, ramp: string): number => {
  const set = tones(ramp);
  const { image } = renderer.renderLabeled(anim(name), f, ctx);
  let n = 0;
  for (let i = 0; i < image.width * image.height; i++) if (image.data[i * 4 + 3] && set.has(rgbAt(image.data, i))) n++;
  return n;
};

describe('pixmates.coder pack (D-20 chibi, stern)', () => {
  it('builds all 16 shared animations at 48 × 56 within 1024², walk facing right, deterministically', () => {
    const built = buildPack(createCoderPack(), ctx);
    const m = manifestSchema.parse(built.manifest);
    expect(m.frameSize).toEqual({ w: 48, h: 56 });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(buildPack(createCoderPack(), ctx).sha256).toBe(built.sha256);
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
  it('keeps row 0 clear in every frame (headroom with the cowlick)', () => {
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image } = renderer.renderLabeled(a, f, ctx);
        const row0 = Array.from({ length: image.width }, (_, x) => image.data[x * 4 + 3] ?? 0);
        expect(Math.max(...row0), `${a.name}/${String(f)}`).toBe(0);
      });
    }
  });
});

describe('costume (coder.md «D-20», ART-BIBLE §12)', () => {
  it.each([
    ['cloth_mustard', 'hoodie'],
    ['cloth_cream', 'tee hem, lanyard, sneakers'],
    ['cloth_indigo', 'jeans + cord'],
    ['hair_cocoa', 'hair'],
  ])('shows %s (%s) on every frame', (ramp) => {
    for (const a of ANIMS)
      a.frames.forEach((_, f) => {
        expect(count(a.name, f, ramp), `${a.name}/${String(f)}`).toBeGreaterThan(0);
      });
  });
  it('shows the steel zipper pull and the amber badge mark on the idle front', () => {
    expect(count('idle_a', 0, 'metal')).toBeGreaterThan(0);
    expect(count('idle_a', 0, 'cloth_ochre')).toBeGreaterThan(0);
  });
  it('never uses black, red or green cloth ramps (originality: no Mr. Robot / Kenma / Gon read)', () => {
    for (const ramp of ['cloth_black', 'hair_black', 'fx_red', 'gem_garnet', 'cloth_moss', 'jade']) {
      for (const a of ANIMS) expect(count(a.name, 0, ramp), `${ramp} ${a.name}`).toBe(0);
    }
  });
});

describe('q34 walk owner rules (coder.md §6.8, RIG.md)', () => {
  it('walk: the head never sits ahead of the torso (front overhang ≤ back overhang + 4 px) and stays steady', () => {
    const walk = anim('walk');
    const headDx = new Set<number>();
    walk.frames.forEach((_, f) => {
      const j = renderer.joints(walk, f);
      headDx.add(Math.round(j.head[0] - j.hip[0]));
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
    // Steady head: no sideways rocking against the hip over the cycle.
    expect(headDx.size).toBe(1);
  });
});

describe('chest reads (art-director MA-66 round 1: cord V, badge, pocket line)', () => {
  const slotAt = (m: Mask, x: number, y: number): readonly [string, number] | undefined =>
    LEGEND[m[y]?.charAt(x) ?? '.'];
  const shadeAt = (m: Mask, x: number, y: number): [string, number] | undefined => {
    const e = slotAt(m, x, y);
    if (!e) return undefined;
    const sw = CODER.outfit[e[0] as keyof typeof CODER.outfit];
    return [sw.ramp, sw.tones[e[1]] ?? -1];
  };
  const clipOf = (m: Mask): [number, number] => {
    for (let y = 3; y < m.length; y++) {
      const x = (m[y] ?? '').split('').findIndex((_, c) => slotAt(m, c, y)?.[0] === 'horn');
      if (x >= 0) return [x, y];
    }
    throw new Error('no badge clip');
  };
  it.each([
    ['front', CHEST],
    ['q34', CHEST_Q34],
  ])('%s: an indigo-2 cord V from the collar to a 1-px steel-5 clip, the badge hung below it', (_, m) => {
    const [cx, cy] = clipOf(m);
    expect(shadeAt(m, cx, cy)).toEqual(['metal', 5]);
    for (const dx of [-1, 1]) expect(shadeAt(m, cx + dx, cy - 1), `arm ${String(dx)}`).toEqual(['cloth_indigo', 2]);
    for (const dx of [-2, 2]) expect(shadeAt(m, cx + dx, cy - 2), `arm ${String(dx)}`).toEqual(['cloth_indigo', 2]);
    // The blank cream badge starts right under the clip, with an amber `>_` (2 px) and a mustard-1 bottom edge.
    const badge = m.slice(cy + 1).flatMap((r, y) => r.split('').map((_, x) => shadeAt(m, x, cy + 1 + y)));
    expect(shadeAt(m, cx, cy + 1)?.[0]).toBe('cloth_cream');
    expect(badge.filter((s) => s?.[0] === 'cloth_ochre')).toHaveLength(2);
    expect(cy, 'hung 1–2 rows lower than round 0 (clip on row 5)').toBeGreaterThanOrEqual(5);
  });
  it.each([
    ['front', CHEST],
    ['q34', CHEST_Q34],
  ])('%s: a continuous mustard-2 pocket edge of 8–10 px, no `{ }` print left on the chest', (_, m) => {
    const runs = m.map((r, y) => {
      let best = 0;
      let run = 0;
      for (let x = 0; x < r.length; x++) {
        const s = shadeAt(m, x, y);
        run = s?.[0] === 'cloth_mustard' && s[1] === 2 ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return best;
    });
    const edge = Math.max(...runs.slice(3));
    expect(edge).toBeGreaterThanOrEqual(m === CHEST ? 8 : 5);
    expect(edge).toBeLessThanOrEqual(10);
    const [cx, cy] = clipOf(m);
    const indigo = m.flatMap((r, y) =>
      r.split('').flatMap((_, x) => (shadeAt(m, x, y)?.[0] === 'cloth_indigo' ? [[x, y] as const] : [])),
    );
    // Indigo only on the cord (the 2 rows above the clip).
    for (const [x, y] of indigo)
      expect(y >= cy - 2 && y < cy && Math.abs(x - cx) <= 2, `${String(x)},${String(y)}`).toBe(true);
  });
  it('front: the tee hem is 2–3 broken cream px on the lit-left side only', () => {
    const last = CHEST.length - 1;
    const cream = (CHEST[last] ?? '')
      .split('')
      .flatMap((_, x) => (shadeAt(CHEST, x, last)?.[0] === 'cloth_cream' ? [x] : []));
    expect(cream.length).toBeGreaterThanOrEqual(2);
    expect(cream.length).toBeLessThanOrEqual(3);
    expect(Math.max(...cream)).toBeLessThan(6);
    expect(
      cream.some((x, k) => k > 0 && x - (cream[k - 1] ?? x) > 1),
      'broken',
    ).toBe(true);
  });
});
