// M-ART MA-63 (D-20, ADR 012): the mouth-mask slot `Body.mask` (ART-BIBLE §11.10, RIG.md «D-20»): an authored mask
// over the lower face (part 16) that hides the mouth on mask-up frames, hangs at the neck (`down`) on
// `downExpressions`, sits inside the head ≥ 1 skin row under the iris, and makes talk read through the eyes.
import { describe, expect, it } from 'vitest';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_B, DUMMY_MASKED, MASK_DUMMY } from '../../../assets-src/rig/dummies.ts';
import type { ExpressionId } from '../../../assets-src/rig/face.ts';
import { PART_ID } from '../../../assets-src/rig/part-ids.ts';
import type { Body, MouthMask, RigAnim } from '../../../assets-src/rig/types.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const ctx = renderContext(loadMasterPalette());
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(`no ${name}`);
  return a;
};
/** First frame of `name` whose face is `face`. */
const frameWith = (name: string, face: ExpressionId): number => {
  const i = anim(name).frames.findIndex((f) => f.face === face);
  if (i < 0) throw new Error(`${name} has no ${face} frame`);
  return i;
};
const pixels = (body: Body, name: string, f: number): Buffer =>
  Buffer.from(createRigRenderer(body).renderLabeled(anim(name), f, ctx).image.data);
const withMouth = (body: Body, id: ExpressionId, mouth: string): Body => ({
  ...body,
  face: { ...body.face, expressions: { ...body.face.expressions, [id]: { ...body.face.expressions[id], mouth } } },
});
const withMask = (m: Partial<MouthMask>): Body => ({ ...DUMMY_MASKED, mask: { ...MASK_DUMMY, ...m } });
const build = (body: Body): void => {
  createRigPack(body, ANIMS);
};

describe('Body.mask (mouth mask slot)', () => {
  it('has part id 16', () => {
    expect(PART_ID.mask).toBe(16);
  });
  it('builds the masked dummy with every shared animation', () => {
    expect(() => {
      build(DUMMY_MASKED);
    }).not.toThrow();
  });
  it('hides the mouth on mask-up frames: changing the neutral mouth changes no px', () => {
    const f = frameWith('idle_a', 'neutral');
    expect(pixels(withMouth(DUMMY_MASKED, 'neutral', 'talk_c'), 'idle_a', f)).toEqual(
      pixels(DUMMY_MASKED, 'idle_a', f),
    );
    // Control: without the mask the same change shows.
    const bare = { ...DUMMY_B, face: DUMMY_MASKED.face };
    expect(pixels(withMouth(bare, 'neutral', 'talk_c'), 'idle_a', f)).not.toEqual(pixels(bare, 'idle_a', f));
  });
  it('lowers the mask on downExpressions: the happy mouth shows and the down mask differs from no mask', () => {
    const f = frameWith('happy', 'happy');
    expect(pixels(withMouth(DUMMY_MASKED, 'happy', 'talk_c'), 'happy', f)).not.toEqual(
      pixels(DUMMY_MASKED, 'happy', f),
    );
    const bare = { ...DUMMY_B, face: DUMMY_MASKED.face };
    expect(pixels(DUMMY_MASKED, 'happy', f)).not.toEqual(pixels(bare, 'happy', f));
  });
  it('leaves a body without the slot untouched (DUMMY_B renders as before)', () => {
    expect(pixels({ ...DUMMY_B }, 'idle_a', 0)).toEqual(pixels(DUMMY_B, 'idle_a', 0));
  });
});

describe('Body.mask validation', () => {
  it('fails when a mouth px of a mask-up expression is not covered', () => {
    expect(() => {
      build(withMask({ front: { mask: ['.tTTt.'], at: [7, 10] } }));
    }).toThrow(/mask.*mouth/);
  });
  it('fails when a mask px falls outside the head', () => {
    expect(() => {
      build(withMask({ front: { mask: ['tTTTTTTTTTTTTTTTTTTTTTTt', ...MASK_DUMMY.front.mask], at: [-2, 9] } }));
    }).toThrow(/mask.*head/);
  });
  it('needs ≥ 1 skin row between the iris and the mask', () => {
    expect(() => {
      build(withMask({ front: { mask: ['tTTTTTTt', ...MASK_DUMMY.front.mask], at: [6, 8] } }));
    }).toThrow(/mask.*iris/);
  });
  it('caps the down mask at 3 rows', () => {
    expect(() => {
      build(withMask({ down: { mask: ['tTTt', 'tTTt', 'tTTt', 'tTTt'], at: [-2, -1] } }));
    }).toThrow(/mask\.down.*3 rows/);
  });
  it('needs talk_a/b/c to differ in eyes or brows while the mask is up', () => {
    const e = DUMMY_MASKED.face.expressions;
    const same: Body = {
      ...DUMMY_MASKED,
      face: { ...DUMMY_MASKED.face, expressions: { ...e, talk_b: { ...e.talk_a, mouth: 'talk_b' } } },
    };
    expect(() => {
      build(same);
    }).toThrow(/talk_a.*talk_b.*eyes/);
  });
  it('needs the q34 mask when q34 poses use the head', () => {
    expect(() => {
      build({
        ...DUMMY_MASKED,
        mask: { front: MASK_DUMMY.front, down: MASK_DUMMY.down, downExpressions: MASK_DUMMY.downExpressions },
      });
    }).toThrow(/mask\.q34/);
  });
});
