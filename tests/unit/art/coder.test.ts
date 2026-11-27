// M-ART MA-66 (D-20, docs/art/coder.md; owner redesign 2026-11-27): `pixmates.coder` — pack build, headroom under the
// hood, the costume layers on every frame (black hoodie, mustard accent, cream tee hem / badge / sneakers, denim), the
// arm-over-torso gate, the q34 walk head rules and the chest reads (drawstrings, chain + badge, pocket line). Faces,
// glasses, hood and head masks: coder-face.test.ts; ramp gates: coder-palette.test.ts.
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
  it('keeps row 0 clear in every frame (headroom over the hood)', () => {
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
    ['cloth_onyx', 'hoodie + hood'],
    ['cloth_mustard', 'hood edge, drawstrings'],
    ['cloth_cream', 'tee hem, badge, sneakers'],
    ['cloth_indigo', 'jeans'],
    ['metal', 'glasses, zipper pull, chain'],
    ['hair_cocoa', 'fringe'],
  ])('shows %s (%s) on every frame', (ramp) => {
    for (const a of ANIMS)
      a.frames.forEach((_, f) => {
        expect(count(a.name, f, ramp), `${a.name}/${String(f)}`).toBeGreaterThan(0);
      });
  });
  it('never uses the cast’s tinted blacks, red or green (originality: no goth / ronin / Kenma / Gon read)', () => {
    for (const ramp of ['cloth_black', 'hair_black', 'lacquer_black', 'fx_red', 'gem_garnet', 'cloth_moss', 'jade']) {
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

describe('chest reads (owner 2026-11-27: drawstrings, chain + badge, pocket line on the black hoodie)', () => {
  const slotAt = (m: Mask, x: number, y: number): readonly [string, number] | undefined =>
    LEGEND[m[y]?.charAt(x) ?? '.'];
  const shadeAt = (m: Mask, x: number, y: number): [string, number] | undefined => {
    const e = slotAt(m, x, y);
    if (!e) return undefined;
    const sw = CODER.outfit[e[0] as keyof typeof CODER.outfit];
    return [sw.ramp, sw.tones[e[1]] ?? -1];
  };
  const px = (m: Mask, f: (s: [string, number]) => boolean): [number, number][] =>
    m.flatMap((r, y) =>
      r.split('').flatMap((_, x) => {
        const s = shadeAt(m, x, y);
        return s && f(s) ? [[x, y] as [number, number]] : [];
      }),
    );
  const VIEWS = [
    ['front', CHEST],
    ['q34', CHEST_Q34],
  ] as const;
  /** The 2-px zipper pull: the steel px of the collar rows (0–2). */
  const pullOf = (m: Mask): [number, number][] => px(m, ([r]) => r === 'metal').filter(([, y]) => y <= 2);

  it.each(VIEWS)('%s: a 2-px steel zipper pull hangs on one column from the collar', (_, m) => {
    const pull = pullOf(m);
    expect(pull).toHaveLength(2);
    expect(new Set(pull.map(([x]) => x)).size).toBe(1);
  });
  it.each(VIEWS)(
    '%s: two mustard drawstrings, 1 px wide, either side of the pull, ≥ 3 px long, unequal, each with a lit tip',
    (_, m) => {
      const pullX = pullOf(m)[0]?.[0] ?? -1;
      const strings = px(m, ([r]) => r === 'cloth_mustard').filter(([, y]) => y <= 5);
      const cols = [...new Set(strings.map(([x]) => x))].sort((a, b) => a - b);
      expect(cols).toHaveLength(2);
      const [l = -1, r = -1] = cols;
      expect(l < pullX && pullX < r, 'pull between the strings').toBe(true);
      const lens = cols.map((c) => {
        const ys = strings.filter(([x]) => x === c).map(([, y]) => y);
        // Contiguous from the collar row 1 down.
        expect(Math.min(...ys)).toBe(1);
        expect(Math.max(...ys) - Math.min(...ys) + 1).toBe(ys.length);
        // The tip is the lightest px of the string.
        const tones = ys.map((y) => shadeAt(m, c, y)?.[1] ?? -1);
        expect(shadeAt(m, c, Math.max(...ys))?.[1]).toBe(Math.max(...tones));
        return ys.length;
      });
      expect(Math.min(...lens)).toBeGreaterThanOrEqual(3);
      expect(lens[0]).not.toBe(lens[1]);
    },
  );
  it.each(VIEWS)(
    '%s: a steel chain (8-connected, below the collar) ends in a steel-5 clip right over the cream badge with a mustard-2 `>_`',
    (_, m) => {
      const chain = px(m, ([r]) => r === 'metal').filter(([, y]) => y >= 3);
      expect(chain.length).toBeGreaterThanOrEqual(3);
      chain.slice(1).forEach(([x, y], k) => {
        const [px0 = 0, py0 = 0] = chain[k] ?? [];
        expect(Math.abs(x - px0) <= 1 && y - py0 === 1, `link ${String(x)},${String(y)}`).toBe(true);
      });
      const [cx = 0, cy = 0] = chain.at(-1) ?? [];
      expect(shadeAt(m, cx, cy)).toEqual(['metal', 5]);
      expect(shadeAt(m, cx, cy + 1)?.[0]).toBe('cloth_cream');
      // The badge: the 3 × 3 under the clip is cream except a 2-px mustard-2 mark, nothing else.
      const badge = [-1, 0, 1].flatMap((dx) => [1, 2, 3].map((dy) => shadeAt(m, cx + dx, cy + dy)));
      expect(badge.filter((s) => s?.[0] === 'cloth_mustard' && s[1] === 2)).toHaveLength(2);
      expect(badge.filter((s) => s?.[0] === 'cloth_cream')).toHaveLength(7);
    },
  );
  it.each(VIEWS)('%s: one continuous onyx-0 pocket line of 5–10 px under the badge clip row', (_, m) => {
    const runs = m.map((r, y) => {
      let best = 0;
      let run = 0;
      for (let x = 0; x < r.length; x++) {
        const s = shadeAt(m, x, y);
        run = s?.[0] === 'cloth_onyx' && s[1] === 0 ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return best;
    });
    const edge = Math.max(...runs.slice(3, 9));
    expect(edge).toBeGreaterThanOrEqual(m === CHEST ? 8 : 5);
    expect(edge).toBeLessThanOrEqual(10);
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
