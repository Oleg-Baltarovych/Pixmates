// M-ART MA-27: the built-in `pixmates.maid` pack (assets-src/characters/maid/) — manifest, gates and the art-director
// LATER items that code can check (D-mouth on arms-up frames, hair lift, shoulder seam vs trim, tail lag).
import { describe, expect, it } from 'vitest';
import { createMaidPack, MAID, MAID_EMOTIONS } from '../../../assets-src/characters/maid/body.ts';
import { MAID_FACE } from '../../../assets-src/characters/maid/face.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, createRigRenderer, RIG_H } from '../../../assets-src/rig/compose.ts';
import { EXPRESSIONS, expressionParts, validateFace } from '../../../assets-src/rig/face.ts';
import type { PoseFrame, RigAnim } from '../../../assets-src/rig/types.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';
import { checkStrips, manifestSchema } from '../../../src/shared/pack.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const same = (a: RgbaImage, b: RgbaImage): boolean => Buffer.from(a.data).equals(Buffer.from(b.data));

describe('pixmates.maid pack (MA-27)', () => {
  const built = buildPack(createMaidPack(), ctx);

  it('builds all 16 shared animations at 48 × 56 with scaleRef 48 and a valid manifest within 1024²', () => {
    const m = manifestSchema.parse(built.manifest);
    expect(m.id).toBe('pixmates.maid');
    expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
    expect(m.scaleRef).toBe(48);
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(built.atlasSize.width).toBeLessThanOrEqual(1024);
    expect(built.atlasSize.height).toBeLessThanOrEqual(1024);
  });

  it('lists the plan emotions, each an animation of the pack', () => {
    expect(built.manifest['emotions']).toEqual(['happy', 'think', 'worried', 'startle']);
    for (const e of MAID_EMOTIONS) expect(Object.keys(built.manifest['animations'] as object)).toContain(e);
  });

  it('is deterministic', () => {
    expect(buildPack(createMaidPack(), ctx).sha256).toBe(built.sha256);
  });

  it('has all 14 expressions and no face px on hair or outside the head', () => {
    expect(Object.keys(MAID_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(MAID_FACE, 'maid', { mask: MAID.head.mask, faceAt: [5, 12] })).toEqual([]);
  });

  it('happy opens the D-mouth only on arms-up frames', () => {
    const open = MAID_FACE.mouths['open_d']?.mask;
    expect(expressionParts(MAID_FACE, 'happy', true).map((p) => p.mask)).toContain(open);
    expect(expressionParts(MAID_FACE, 'happy', false).map((p) => p.mask)).not.toContain(open);
    expect(anim('happy').frames.some((f) => f.parts.armL === 'up' && f.face === 'happy')).toBe(true);
  });

  it('an unknown raised mouth fails the face validator', () => {
    const lib = {
      ...MAID_FACE,
      expressions: { ...MAID_FACE.expressions, happy: { ...MAID_FACE.expressions.happy, raisedMouth: 'nope' } },
    };
    expect(validateFace(lib, 'x').join(' ')).toMatch(/unknown raised mouth/);
  });

  it('hair lift changes the happy apex frame', () => {
    const happy = anim('happy');
    const apex = happy.frames.findIndex((f) => f.hairLift === 1);
    expect(apex).toBeGreaterThan(0);
    const r = createRigRenderer(MAID);
    const noLift = {
      ...happy,
      name: 'happy-nolift',
      frames: happy.frames.map((f): PoseFrame => {
        const rest = { ...f };
        delete rest.hairLift;
        return rest;
      }),
    };
    expect(same(r.render(happy, apex, ctx), r.render(noLift, apex, ctx))).toBe(false);
  });

  it('shoulder seam: pink sleeves next to rose trim keep the ΔL step, and the check is not vacuous', () => {
    const deepest = deepestTones(palette);
    const r = createRigRenderer(MAID);
    let trimFrames = 0;
    let probe: { a: RigAnim; f: number } | undefined;
    const problems: string[] = [];
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image, labels } = r.renderLabeled(a, f, ctx);
        const rep = armTorsoContrast(image, labels, deepest);
        if (rep.trimSamples > 0) {
          trimFrames++;
          probe ??= { a, f };
        }
        for (const p of armTorsoProblems(rep)) problems.push(`${a.name}/${String(f)}: ${p}`);
      });
    }
    expect(problems).toEqual([]);
    expect(trimFrames).toBeGreaterThanOrEqual(4);
    if (!probe) throw new Error('no frame with a sleeve next to trim');
    const { image, labels } = r.renderLabeled(probe.a, probe.f, ctx);
    let trim = -1;
    for (let i = 0; i < labels.data.length / 4; i++) if (labels.data[i * 4] === ARM_LABEL.trim) trim = i;
    expect(trim).toBeGreaterThanOrEqual(0);
    const data = new Uint8Array(image.data);
    for (let i = 0; i < labels.data.length / 4; i++) {
      const l = labels.data[i * 4];
      if (l === ARM_LABEL.sleeveL || l === ARM_LABEL.sleeveR) data.set(data.subarray(trim * 4, trim * 4 + 4), i * 4);
    }
    expect(armTorsoProblems(armTorsoContrast({ ...image, data }, labels, deepest)).join(' ')).toMatch(/shoulder/);
  });

  it('the spade tail lags the hip by one frame', () => {
    const walk = anim('walk');
    const r = createRigRenderer(MAID);
    const pose = walk.frames[2];
    if (!pose) throw new Error('walk/2');
    // The same pose as a one-frame clip has no previous frame, so no lag.
    const single: RigAnim = { ...walk, name: 'walk-single', loop: false, frames: [pose] };
    expect(same(r.render(walk, 2, ctx), r.render(single, 0, ctx))).toBe(false);
  });
});
