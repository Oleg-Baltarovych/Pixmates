// M-ART MA-67 (D-22): the movable visor `Body.visor` (ART-BIBLE §11.11, RIG.md «Body opt-ins») — lowered per animation
// frame (`downIn`), it hides every face part and covers the face skin, a per-expression eye slit carries the emotion;
// raised, the face shows under it. Plus `Body.gauntlets` (hands on a metal ramp). Built on dummy B (front + q34).
import { describe, expect, it } from 'vitest';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_B, MASK_DUMMY } from '../../../assets-src/rig/dummies.ts';
import type { ExpressionId } from '../../../assets-src/rig/face.ts';
import type { Body, RigAnim, Visor } from '../../../assets-src/rig/types.ts';
import { visorIsDown } from '../../../assets-src/rig/views.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(`no ${name}`);
  return a;
};
const q34 = DUMMY_B.views?.q34;
if (!q34) throw new Error('dummy B has no q34 view');

/** A plate over every skin px of a head mask (hair letter `H`), so the lowered visor closes the whole face. */
const plateOver = (head: Mask): Mask =>
  head.map((row) =>
    row
      .split('')
      .map((ch) => (LEGEND[ch]?.[0] === 'skin' ? 'H' : '.'))
      .join(''),
  );
/** First skin px (x, y) of a head mask, for a 2-px slit glint inside the lowered plate. */
const firstSkin = (head: Mask): [number, number] => {
  for (let y = 0; y < head.length; y++) {
    const row = head[y] ?? '';
    for (let x = 0; x < row.length - 1; x++) {
      if (LEGEND[row.charAt(x)]?.[0] === 'skin' && LEGEND[row.charAt(x + 1)]?.[0] === 'skin') return [x, y];
    }
  }
  throw new Error('no skin');
};
const at = DUMMY_B.head.at;
const [sx, sy] = firstSkin(DUMMY_B.head.mask);
const [qx, qy] = firstSkin(q34.head.mask);
const VISOR: Visor = {
  // Raised: a 4-px band on the crown (head-mask row 1), clear of every face part.
  up: { mask: ['YYYY'], at: [at[0] + 13, at[1] + 1] },
  upQ34: { mask: ['YYYY'], at: [at[0] + 13, at[1] + 1] },
  down: { mask: plateOver(DUMMY_B.head.mask), at },
  downQ34: { mask: plateOver(q34.head.mask), at },
  slit: { startle: { mask: ['CC'], at: [at[0] + sx, at[1] + sy] } },
  slitQ34: { neutral: { mask: ['CC'], at: [at[0] + qx, at[1] + qy] } },
  downIn: { walk: 'all', startle: [1, 2] },
};
const VISORED: Body = { ...DUMMY_B, id: 'rig-dummy-visor', visor: VISOR };
const withVisor = (v: Partial<Visor>): Body => ({ ...VISORED, visor: { ...VISOR, ...v } });
const pixels = (body: Body, name: string, f: number): Buffer =>
  Buffer.from(createRigRenderer(body).render(anim(name), f, ctx).data);
/** The same body with expression `id` looking like `like` (eyes, brows, mouth, cheeks). */
const withFace = (body: Body, id: ExpressionId, like: ExpressionId): Body => ({
  ...body,
  face: { ...body.face, expressions: { ...body.face.expressions, [id]: body.face.expressions[like] } },
});
const build = (body: Body): void => {
  createRigPack(body, ANIMS);
};

describe('Body.visor (movable face cover, per-animation state)', () => {
  it('builds the visored dummy with every shared animation', () => {
    expect(() => {
      build(VISORED);
    }).not.toThrow();
  });
  it('visorIsDown: every frame on "all", only the listed frames otherwise, never on other animations', () => {
    expect([0, 7].map((f) => visorIsDown(VISOR, 'walk', f))).toEqual([true, true]);
    expect([0, 1, 2, 3].map((f) => visorIsDown(VISOR, 'startle', f))).toEqual([false, true, true, false]);
    expect(visorIsDown(VISOR, 'idle_a', 0)).toBe(false);
  });
  it('lowered: no face part is stamped (changing the startle face changes no px on startle frame 1)', () => {
    expect(pixels(withFace(VISORED, 'startle', 'happy'), 'startle', 1)).toEqual(pixels(VISORED, 'startle', 1));
  });
  it('raised: the face shows (the same change on startle frame 0 changes px)', () => {
    expect(pixels(withFace(VISORED, 'startle', 'happy'), 'startle', 0)).not.toEqual(pixels(VISORED, 'startle', 0));
  });
  it('lowered q34 walk hides the face too (a q34 neutral that looks like blink renders the same)', () => {
    const f = anim('walk').frames.findIndex((x) => x.face === 'neutral');
    const blinkQ34 = (body: Body): Body => {
      const v = body.views?.q34;
      if (!v) throw new Error('no q34');
      const e = v.face.expressions;
      if (!e.blink) throw new Error('no q34 blink');
      const face = { ...v.face, expressions: { ...e, neutral: e.blink } };
      return { ...body, views: { q34: { ...v, face } } };
    };
    expect(pixels(blinkQ34(VISORED), 'walk', f)).toEqual(pixels(VISORED, 'walk', f));
    // Control: without the visor the walk face shows.
    expect(pixels(blinkQ34(DUMMY_B), 'walk', f)).not.toEqual(pixels(DUMMY_B, 'walk', f));
  });
  it('the eye slit is stamped per expression on lowered frames only', () => {
    const noSlit = withVisor({ slit: {} });
    expect(pixels(VISORED, 'startle', 1)).not.toEqual(pixels(noSlit, 'startle', 1));
    expect(pixels(VISORED, 'startle', 0)).toEqual(pixels(noSlit, 'startle', 0));
  });
  it('the raised visor is stamped on raised frames', () => {
    expect(pixels(VISORED, 'idle_a', 0)).not.toEqual(pixels(DUMMY_B, 'idle_a', 0));
  });
  it('leaves a body without the slot untouched', () => {
    expect(pixels({ ...DUMMY_B }, 'idle_a', 0)).toEqual(pixels(DUMMY_B, 'idle_a', 0));
  });
});

describe('Body.visor validation', () => {
  it('fails on an animation the pack does not have', () => {
    expect(() => {
      build(withVisor({ downIn: { run_fast: 'all' } }));
    }).toThrow(/visor\.downIn.*run_fast/);
  });
  it('fails on a frame outside the animation', () => {
    expect(() => {
      build(withVisor({ downIn: { startle: [5] } }));
    }).toThrow(/visor\.downIn\.startle/);
  });
  it('fails when the lowered visor leaves face skin uncovered', () => {
    expect(() => {
      build(withVisor({ down: { mask: ['HHHH'], at } }));
    }).toThrow(/visor down leaves face skin/);
  });
  it('fails when the raised visor covers a face part', () => {
    expect(() => {
      build(withVisor({ up: VISOR.down }));
    }).toThrow(/visor up covers face part/);
  });
  it('fails when a slit glint is off the lowered visor', () => {
    expect(() => {
      build(withVisor({ slit: { startle: { mask: ['CC'], at: [at[0], at[1]] } } }));
    }).toThrow(/slit\.startle/);
  });
  it('needs the q34 masks when q34 poses show the head', () => {
    const front: Visor = { up: VISOR.up, down: VISOR.down, downIn: VISOR.downIn };
    expect(() => {
      build({ ...VISORED, visor: front });
    }).toThrow(/visor\.upQ34/);
  });
  it('never sits with a mouth mask', () => {
    expect(() => {
      build({ ...VISORED, mask: MASK_DUMMY });
    }).toThrow(/visor and mask/);
  });
});

describe('Body.gauntlets', () => {
  const on = (img: RgbaImage, ramp: string): number => {
    const tones = new Set(palette.ramps.get(ramp) ?? []);
    let n = 0;
    for (let i = 0; i < img.width * img.height; i++) {
      const c = ((img.data[i * 4] ?? 0) << 16) | ((img.data[i * 4 + 1] ?? 0) << 8) | (img.data[i * 4 + 2] ?? 0);
      if ((img.data[i * 4 + 3] ?? 0) > 0 && tones.has(c)) n++;
    }
    return n;
  };
  const GAUNTLETED: Body = { ...DUMMY_B, gauntlets: { ramp: 'metal_silver' } };
  const draw = (body: Body, name: string, f: number): RgbaImage => createRigRenderer(body).render(anim(name), f, ctx);
  it.each([
    ['idle_a', 0],
    ['think', 2],
  ] as const)('%s:%i — the hands move from skin to the gauntlet ramp', (name, f) => {
    expect(on(draw(DUMMY_B, name, f), 'metal_silver')).toBe(0);
    expect(on(draw(GAUNTLETED, name, f), 'metal_silver')).toBeGreaterThan(0);
    expect(on(draw(GAUNTLETED, name, f), 'skin')).toBeLessThan(on(draw(DUMMY_B, name, f), 'skin'));
  });
  it('fails on a ramp the master palette does not have', () => {
    expect(() => {
      build({ ...DUMMY_B, gauntlets: { ramp: 'not_a_ramp' as string as 'metal_silver' } });
    }).toThrow(/gauntlets ramp/);
  });
});
