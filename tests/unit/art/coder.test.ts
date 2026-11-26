// M-ART MA-66 (D-20, docs/art/coder.md): `pixmates.coder` — pack build, headroom with the cowlick, the costume layers
// on every frame (mustard hoodie, cream tee hem / lanyard, denim, indigo print), the arm-over-torso gate, the q34 walk
// head rules. Faces and head masks: coder-face.test.ts; ramp gates: coder-palette.test.ts.
import { describe, expect, it } from 'vitest';
import { CODER, createCoderPack } from '../../../assets-src/characters/coder/body.ts';
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
    ['cloth_indigo', 'jeans + print'],
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
