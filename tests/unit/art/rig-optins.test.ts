// Behaviour of the rig's per-body opt-ins on the dummy bodies and small hand-built inputs (not through a character
// pack): each test fails when the opt-in's code is removed.
import { describe, expect, it } from 'vitest';
import { createIndexBuffer, type RampName } from '../../../assets-src/lib/buffer.ts';
import { LEGEND } from '../../../assets-src/lib/mask.ts';
import { MAT } from '../../../assets-src/lib/materials.ts';
import { outline } from '../../../assets-src/lib/passes.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { buildLegs, buildShorts, buildTorso, HEM_LIFT_MAX, leanLock } from '../../../assets-src/rig/chains.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_A, DUMMY_B, DUMMY_FACE, MAID_PREVIEW } from '../../../assets-src/rig/dummies.ts';
import { validateFace } from '../../../assets-src/rig/face.ts';
import { COLLAR_MAX, HAT_MAX } from '../../../assets-src/rig/validate.ts';
import { ARM_LABEL, PART_ID } from '../../../assets-src/rig/part-ids.ts';
import {
  farLegGap,
  greaveTones,
  napeIndent,
  silhouetteOutline,
  SPLIT_Q34_CONTACT_DX,
  squashSeparator,
  stampMask,
  type Locked,
} from '../../../assets-src/rig/passes.ts';
import { CLOAK_DANGLE_NARROW, CLOAK_SEAT_HEM, cloakGeometry } from '../../../assets-src/rig/cloak.ts';
import type { Body, Cloak, RigAnim } from '../../../assets-src/rig/types.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
/** A ramp name the master palette does not have (runtime validation input; the type only allows real names). */
const NOT_A_RAMP = 'not_a_ramp' as string as RampName;
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const idle = anim('idle_a');
const walk = anim('walk');
const same = (a: RgbaImage, b: RgbaImage): boolean => Buffer.from(a.data).equals(Buffer.from(b.data));
const rgb = (img: RgbaImage, x: number, y: number): number => {
  const i = (y * img.width + x) * 4;
  return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
};
/** Opaque px whose colour is on `ramp`. */
const pxOn = (img: RgbaImage, ramp: string): [number, number][] => {
  const tones = new Set(palette.ramps.get(ramp) ?? []);
  const out: [number, number][] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if ((img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0 && tones.has(rgb(img, x, y))) out.push([x, y]);
    }
  }
  return out;
};
const render = (body: Body, a: RigAnim = idle, f = 0): RgbaImage => createRigRenderer(body).render(a, f, ctx);
const q34Of = (body: Body) => {
  const q = body.views?.q34;
  if (!q) throw new Error(`${body.id}: no q34 view`);
  return q;
};

describe('rig opt-in: hairBackStretch', () => {
  it('shortens the back hair below the temples (lowest hair px moves up)', () => {
    const lowest = (b: Body): number => Math.max(...pxOn(render(b), b.ramps.hair).map(([, y]) => y));
    expect(lowest({ ...DUMMY_B, hairBackStretch: 0.5 })).toBeLessThan(lowest(DUMMY_B));
  });
});

describe('rig opt-in: sideLocks', () => {
  it('false drops the procedural lock chains (fewer hair px); true is the default', () => {
    const hair = (b: Body): number => pxOn(render(b), b.ramps.hair).length;
    expect(hair({ ...DUMMY_B, sideLocks: false })).toBeLessThan(hair(DUMMY_B));
    expect(same(render({ ...DUMMY_B, sideLocks: true }), render(DUMMY_B))).toBe(true);
  });
});

describe('rig opt-in: farLegShade', () => {
  it('gives far-leg px touching the near leg shade 0 (locked); far px away from it keep their tone', () => {
    const buf = createIndexBuffer(4, 1, palette);
    const ramp = DUMMY_B.ramps.legs;
    buf.set(0, 0, { ramp, shade: 3, material: MAT.fur, depth: 1, partId: PART_ID.legs });
    buf.set(1, 0, { ramp, shade: 3, material: MAT.fur, depth: 1, partId: PART_ID.farLeg });
    buf.set(2, 0, { ramp, shade: 3, material: MAT.fur, depth: 1, partId: PART_ID.farLeg });
    const locked: Locked = new Map();
    farLegGap(buf, locked);
    expect([buf.shade[0], buf.shade[1], buf.shade[2]]).toEqual([3, 0, 3]);
    expect([...locked.keys()]).toEqual([1]);
  });

  it('changes only q34 frames, and only when set', () => {
    const q = q34Of(DUMMY_B);
    const shaded: Body = { ...DUMMY_B, views: { q34: { ...q, farLegShade: 4 } } };
    expect(same(render(shaded, walk), render(DUMMY_B, walk))).toBe(false);
    expect(same(render(shaded, idle), render(DUMMY_B, idle))).toBe(true);
  });
});

describe('rig opt-in: tailored shorts', () => {
  const j = createRigRenderer(DUMMY_A).joints(idle, 0);
  const p = idle.frames[0];
  if (!p) throw new Error('idle f0');
  const rows = (b: Body, q = false): Map<number, number[]> => {
    const out = new Map<number, number[]>();
    for (const f of buildShorts(b, p, j.hip, q).shape.fragments) out.set(f.y, [...(out.get(f.y) ?? []), f.x]);
    return out;
  };
  const plain = rows(DUMMY_A);
  const tailored = rows({ ...DUMMY_A, shorts: { shade: 3, raise: 2 } });
  const bottom = (m: Map<number, number[]>): number => Math.max(...m.keys());

  it('raises the hem by `raise` rows', () => {
    expect(bottom(tailored)).toBe(bottom(plain) - 2);
  });
  it('notches the hem between the legs and flares each leg hem outward (front only)', () => {
    const hem = tailored.get(bottom(tailored)) ?? [];
    const gaps = (xs: readonly number[]): number => Math.max(...xs) - Math.min(...xs) + 1 - xs.length;
    expect(gaps(hem)).toBeGreaterThan(0);
    expect(gaps(plain.get(bottom(plain)) ?? [])).toBe(0);
    const width = (xs: readonly number[]): number => Math.max(...xs) - Math.min(...xs);
    const plainAtSameRow = plain.get(bottom(tailored)) ?? [];
    expect(width(hem)).toBeGreaterThan(width(plainAtSameRow));
    // q34: raised, but no notch/flare.
    const q = rows({ ...DUMMY_A, shorts: { shade: 3, raise: 2 } }, true);
    expect(width(q.get(bottom(q)) ?? [])).toBeLessThan(width(hem));
  });
});

describe('rig opt-in: shortsFlareQ34 false (MA-69, coder jeans seat)', () => {
  const passing = walk.frames[2];
  if (!passing) throw new Error('walk f2');
  const hip = createRigRenderer(DUMMY_A).joints(walk, 2).hip;
  /** Leftmost (trailing, back) seat px per row of the q34 shorts on the walk passing frame. */
  const backEdge = (b: Body): number[] => {
    const left = new Map<number, number>();
    for (const f of buildShorts(b, passing, hip, true).shape.fragments)
      left.set(f.y, Math.min(left.get(f.y) ?? f.x, f.x));
    return [...left.entries()].sort((a, c) => a[0] - c[0]).map(([, x]) => x);
  };

  it('default: the back edge flares out toward the hem on passing frames (skirt-like)', () => {
    const edge = backEdge(DUMMY_A);
    expect(Math.min(...edge)).toBeLessThan(edge[0] ?? 0);
  });
  it('false: the back edge runs straight down from the waist (never out past its top px)', () => {
    const edge = backEdge({ ...DUMMY_A, shortsFlareQ34: false });
    const top = edge[0] ?? 0;
    for (const x of edge) expect(x).toBeGreaterThanOrEqual(top);
    expect(Math.max(...edge) - Math.min(...edge)).toBeLessThanOrEqual(1);
  });
  it('front frames are untouched; needs hem shorts', () => {
    expect(same(render({ ...DUMMY_A, shortsFlareQ34: false }), render(DUMMY_A))).toBe(true);
    expect(() => createRigPack({ ...DUMMY_B, shortsFlareQ34: false }, ANIMS)).toThrow('shortsFlareQ34');
  });
});

describe('rig opt-in: shinWrap', () => {
  it('paints the row `row` above each foot in the legs-ramp `shade`; only on that row', () => {
    const wrapped: Body = { ...DUMMY_A, shinWrap: { row: 3, shade: 1 } };
    const r = createRigRenderer(wrapped);
    const j = r.joints(idle, 0);
    const img = r.render(idle, 0, ctx);
    const tone = palette.ramps.get(DUMMY_A.ramps.legs)?.[1];
    const plain = render(DUMMY_A);
    const count = (im: RgbaImage, foot: readonly [number, number], dy: number): number => {
      let n = 0;
      for (let x = Math.round(foot[0]) - 2; x <= Math.round(foot[0]) + 2; x++) {
        if (rgb(im, x, Math.round(foot[1]) - dy) === tone) n++;
      }
      return n;
    };
    for (const foot of [j.footL, j.footR]) {
      expect(count(img, foot, 3)).toBeGreaterThanOrEqual(2);
      expect(count(img, foot, 3)).toBeGreaterThan(count(plain, foot, 3));
      // Only that row: the rows next to it match the plain frame.
      expect(count(img, foot, 2)).toBe(count(plain, foot, 2));
    }
  });
});

describe('rig opt-in: sash', () => {
  const j = createRigRenderer(DUMMY_A).joints(idle, 0);
  const bandRows = (b: Body): number => new Set(buildTorso(b, j, false, 0)[2]?.shape.fragments.map((f) => f.y)).size;

  it('makes the waist band `rows` rows high (default 1)', () => {
    const knot = { mask: ['tt'], at: [0, 0] as const };
    expect(bandRows(DUMMY_A)).toBe(1);
    expect(bandRows({ ...DUMMY_A, sash: { rows: 2, knot } })).toBe(2);
  });
  it('stamps the knot mask on the near hip', () => {
    const sashed: Body = { ...DUMMY_A, sash: { rows: 1, knot: { mask: ['TT', 'TT'], at: [-4, -3] } } };
    const img = render(sashed);
    const letter = LEGEND['T'];
    if (!letter) throw new Error('legend T');
    const tone = palette.ramps.get(DUMMY_A.outfit.trim.ramp)?.[DUMMY_A.outfit.trim.tones[letter[1]]];
    const [x, y] = [Math.round(j.hip[0] - 4), Math.round(j.hip[1] - 3)];
    expect(rgb(img, x, y)).toBe(tone);
    expect(rgb(render(DUMMY_A), x, y)).not.toBe(tone);
  });
});

describe('createRigPack part validation', () => {
  const bad = ['T?'];
  it.each([
    ['front sash knot', { ...DUMMY_A, sash: { rows: 1, knot: { mask: bad, at: [0, 0] } } }],
    ['q34 sash knot', { ...DUMMY_A, views: { q34: { ...q34Of(DUMMY_A), sashKnot: { mask: bad, at: [0, 0] } } } }],
    ['front bib', { ...DUMMY_A, apron: { bib: { mask: bad, at: [0, 0] }, panelW: 6 } }],
  ] as const)('rejects a bad %s mask', (_, body) => {
    expect(() => createRigPack(body, ANIMS)).toThrow();
  });
  it.each([
    ['shorts.shade', { ...DUMMY_A, shorts: { shade: 6, raise: 0 } }],
    ['shinWrap.shade', { ...DUMMY_A, shinWrap: { row: 2, shade: -1 } }],
    ['farLegShade', { ...DUMMY_A, views: { q34: { ...q34Of(DUMMY_A), farLegShade: 9 } } }],
  ] as const)('rejects %s outside 0..5', (name, body) => {
    expect(() => createRigPack(body, ANIMS)).toThrow(name);
  });
  const long = { ...DUMMY_B, sleeveOverHand: true as const };
  it.each([
    ['sleeve.shade', { ...DUMMY_A, sleeve: { shade: 6 } }, 'sleeve.shade'],
    ['an unknown sleeve.ramp', { ...DUMMY_A, sleeve: { ramp: NOT_A_RAMP } }, 'not in the master palette'],
    ['an unknown cuff.ramp', { ...long, cuff: { ramp: NOT_A_RAMP, shade: 3 } }, 'not in the master palette'],
    [
      'an unknown silhouetteOutline ramp',
      { ...DUMMY_A, silhouetteOutline: [{ ramp: NOT_A_RAMP, lit: 4, shade: 2 }] },
      'not in the master palette',
    ],
    [
      'a duplicate silhouetteOutline ramp',
      {
        ...DUMMY_A,
        silhouetteOutline: [
          { ramp: 'cloth_teal', lit: 4, shade: 2 },
          { ramp: 'cloth_teal', lit: 5, shade: 3 },
        ],
      },
      'more than once',
    ],
    ['a fractional sleeveRim', { ...DUMMY_B, sleeveRim: 4.5 }, 'whole shade'],
    ['a fractional cuff.shade', { ...long, cuff: { ramp: 'cloth_cream', shade: 2.5 } }, 'whole shade'],
    [
      'a fractional silhouetteOutline lit',
      { ...DUMMY_A, silhouetteOutline: [{ ramp: 'cloth_teal', lit: 4.5, shade: 2 }] },
      'whole shade',
    ],
    ['a dressShade the breath glow lifts past the ramp', { ...DUMMY_A, dressShade: 5 }, 'breath glow'],
  ] as const)('rejects %s', (_, body, message) => {
    expect(() => createRigPack(body, ANIMS)).toThrow(message);
  });
  it('accepts a fractional farLegShade (a tone between two steps)', () => {
    expect(() =>
      createRigPack({ ...DUMMY_A, views: { q34: { ...q34Of(DUMMY_A), farLegShade: 2.5 } } }, ANIMS),
    ).not.toThrow();
  });
});

describe('squashSeparator', () => {
  it('gives a sleeve px newly touching the torso the deep tone; other px stay', () => {
    // Row: sleeveL | torso | none | sleeveR (the last sleeve px touches no torso px).
    const img: RgbaImage = { width: 4, height: 1, data: new Uint8Array(16).fill(200) };
    const labels: RgbaImage = {
      width: 4,
      height: 1,
      data: Uint8Array.from([
        ...[ARM_LABEL.sleeveL, 0, 0, 255],
        ...[ARM_LABEL.torso, 0, 0, 255],
        ...[ARM_LABEL.none, 0, 0, 0],
        ...[ARM_LABEL.sleeveR, 0, 0, 255],
      ]),
    };
    const out = squashSeparator(img, labels, 0x102030);
    expect(rgb(out, 0, 0)).toBe(0x102030);
    expect([rgb(out, 1, 0), rgb(out, 2, 0), rgb(out, 3, 0)]).toEqual([0xc8c8c8, 0xc8c8c8, 0xc8c8c8]);
  });
});
// ---- MA-29 (goth) opt-ins: sleeveOverHand, silhouetteOutline, cuff, outfit.trim vs ramps.trim, dressShade ----

const LONG: Body = DUMMY_B;
/** Px of one arm-end label (red channel of the label map) whose colour is on `ramp`. */
const endPx = (body: Body, a: RigAnim, f: number, label: number, ramp: string): number => {
  const { image, labels } = createRigRenderer(body).renderLabeled(a, f, ctx);
  const tones = new Set(palette.ramps.get(ramp) ?? []);
  let n = 0;
  for (let i = 0; i < image.width * image.height; i++) {
    if ((labels.data[i * 4 + 3] ?? 0) === 0 || labels.data[i * 4] !== label) continue;
    if ((image.data[i * 4 + 3] ?? 0) > 0 && tones.has(rgb(image, i % image.width, Math.floor(i / image.width)))) n++;
  }
  return n;
};
/** First frame of `a` whose left arm is one of `arms`. */
const frameWith = (a: RigAnim, ...arms: readonly string[]): number => {
  const f = a.frames.findIndex((p) => arms.includes(p.parts.armL));
  if (f < 0) throw new Error(`${a.name}: no ${arms.join('/')} frame`);
  return f;
};
/** First frame of `a` whose right arm is `arm`. */
const frameWithR = (a: RigAnim, arm: string): number => {
  const f = a.frames.findIndex((p) => p.parts.armR === arm);
  if (f < 0) throw new Error(`${a.name}: no right ${arm} frame`);
  return f;
};

describe('rig opt-in: sleeveOverHand', () => {
  const over: Body = { ...LONG, sleeveOverHand: true };
  const skin = LONG.outfit.skin.ramp;

  it('needs long sleeves', () => {
    expect(() => createRigPack({ ...DUMMY_A, sleeveOverHand: true }, ANIMS)).toThrow('sleeveOverHand');
  });

  it('covers the hand with the bell cuff: 1–2 fingertip skin px below it on a down arm', () => {
    const f = frameWith(idle, 'down');
    const tips = endPx(over, idle, f, ARM_LABEL.endL, skin);
    expect(tips).toBeGreaterThanOrEqual(1);
    expect(tips).toBeLessThanOrEqual(2);
    expect(endPx(LONG, idle, f, ARM_LABEL.endL, skin)).toBeGreaterThan(tips);
    // The cuff itself is the rest of the arm end (≥ 2 px of lace).
    expect(endPx(over, idle, f, ARM_LABEL.endL, LONG.ramps.clothAlt)).toBeGreaterThanOrEqual(2);
  });

  it('slides back with the hand above the shoulder: 2–3 px of hand show', () => {
    const wave = anim('wave');
    const shown = endPx(over, wave, frameWithR(wave, 'wave_b'), ARM_LABEL.endR, skin);
    expect(shown).toBeGreaterThanOrEqual(2);
    expect(shown).toBeLessThanOrEqual(3);
  });

  it('makes the chin fist a paw: fewer skin px than a plain long sleeve, no procedural cuff under it', () => {
    const think = anim('think');
    const f = think.frames.findIndex((p) => p.parts.armR === 'chin' || p.parts.armL === 'chin');
    const p = think.frames[f];
    if (!p) throw new Error('think chin frame');
    const label = p.parts.armR === 'chin' ? ARM_LABEL.endR : ARM_LABEL.endL;
    const paw = endPx(over, think, f, label, skin);
    expect(paw).toBeGreaterThan(0);
    expect(paw).toBeLessThan(endPx(LONG, think, f, label, skin));
    // The procedural cuff takes `Body.cuff`; the paw mask's lace keeps the outfit apron slot.
    const cuff = 'gem_garnet';
    const marked: Body = { ...over, cuff: { ramp: cuff, shade: 3 } };
    expect(endPx(marked, idle, frameWith(idle, 'down'), ARM_LABEL.endL, cuff)).toBeGreaterThan(0);
    expect(endPx(marked, think, f, label, cuff)).toBe(0);
  });
});

describe('rig opt-in: cuff', () => {
  it('draws the bell cuff in its own ramp/shade; the hem lace keeps clothAlt', () => {
    const tone = palette.ramps.get('cloth_rose')?.[5] ?? -1;
    const body: Body = { ...LONG, cuff: { ramp: 'cloth_rose', shade: 5 } };
    const img = render(body);
    expect(pxOn(img, 'cloth_rose').filter(([x, y]) => rgb(img, x, y) === tone).length).toBeGreaterThanOrEqual(2);
    // The petticoat lace (lowest clothAlt row) is still on clothAlt.
    const laceRow = Math.max(...pxOn(render(LONG), LONG.ramps.clothAlt).map(([, y]) => y));
    expect(pxOn(img, LONG.ramps.clothAlt).some(([, y]) => y === laceRow)).toBe(true);
    expect(() => createRigPack({ ...LONG, cuff: { ramp: 'cloth_rose', shade: 7 } }, ANIMS)).toThrow('cuff.shade');
  });
});

describe('rig: outfit.trim (masks) and ramps.trim (waist band) are independent', () => {
  it('paints mask trim letters in outfit.trim and the waist band in ramps.trim', () => {
    const body: Body = {
      ...LONG,
      outfit: {
        ...LONG.outfit,
        trim: { ramp: 'gem_garnet', tones: [0, 1, 2, 3, 4, 5] },
      },
      ramps: { ...LONG.ramps, trim: 'cloth_indigo' },
    };
    const img = render(body);
    const j = createRigRenderer(body).joints(idle, 0);
    const band = Math.round(j.hip[1] - 10.1);
    const garnet = pxOn(img, 'gem_garnet');
    expect(garnet.length).toBeGreaterThan(0);
    // Garnet only on the collar mask, never on the waist band.
    expect(garnet.every(([, y]) => y < band - 2)).toBe(true);
    expect(pxOn(img, 'cloth_indigo').some(([, y]) => y === band)).toBe(true);
  });
});

describe('rig opt-in: dressShade', () => {
  it('sets the bodice/skirt base shade; the sleeve-on-bodice-ramp rule uses it', () => {
    expect(same(render({ ...DUMMY_A, dressShade: 4 }), render(DUMMY_A))).toBe(false);
    expect(same(render({ ...DUMMY_A, dressShade: 3 }), render(DUMMY_A))).toBe(true);
    const onCloth = { ramp: DUMMY_A.ramps.cloth, shade: 2 } as const;
    expect(() => createRigPack({ ...DUMMY_A, dressShade: 2, sleeve: onCloth }, ANIMS)).toThrow('arm-over-torso');
    expect(() => createRigPack({ ...DUMMY_A, dressShade: 9 }, ANIMS)).toThrow('dressShade');
  });
});

describe('rig opt-in: silhouetteOutline', () => {
  it('gives outer-outline px of the listed ramps shade `lit` on the top-left, `shade` elsewhere; others untouched', () => {
    const buf = createIndexBuffer(5, 5, palette);
    buf.set(2, 2, {
      ramp: 'cloth_indigo',
      shade: 3,
      material: MAT.cloth,
      depth: 1,
    });
    const map = outline(buf, ctx.rampSize, { drop: 2 });
    silhouetteOutline(buf, map, [{ ramp: 'cloth_indigo', lit: 5, shade: 3 }]);
    // Left / top neighbours face the light; right / bottom do not.
    expect([buf.shade[2 * 5 + 1], buf.shade[1 * 5 + 2]]).toEqual([5, 5]);
    expect([buf.shade[2 * 5 + 3], buf.shade[3 * 5 + 2]]).toEqual([3, 3]);
    const other = createIndexBuffer(5, 5, palette);
    other.set(2, 2, {
      ramp: 'cloth_teal',
      shade: 3,
      material: MAT.cloth,
      depth: 1,
    });
    const m2 = outline(other, ctx.rampSize, { drop: 2 });
    silhouetteOutline(other, m2, [{ ramp: 'cloth_indigo', lit: 5, shade: 3 }]);
    expect(other.shade[2 * 5 + 3]).toBe(1);
  });

  it('never leaves a shade-0 outer px of the ramp on the rendered silhouette, and validates shades', () => {
    const ramp = DUMMY_A.ramps.cloth;
    const body: Body = {
      ...DUMMY_A,
      silhouetteOutline: [{ ramp, lit: 5, shade: 3 }],
    };
    const img = render(body);
    expect(same(img, render(DUMMY_A))).toBe(false);
    const deep = palette.ramps.get(ramp)?.[0];
    const alpha = (x: number, y: number): number =>
      x < 0 || y < 0 || x >= img.width || y >= img.height ? 0 : (img.data[(y * img.width + x) * 4 + 3] ?? 0);
    const edgeDeep = pxOn(img, ramp).filter(
      ([x, y]) =>
        rgb(img, x, y) === deep && [alpha(x - 1, y), alpha(x + 1, y), alpha(x, y - 1), alpha(x, y + 1)].includes(0),
    );
    expect(edgeDeep).toEqual([]);
    expect(() => createRigPack({ ...DUMMY_A, silhouetteOutline: [{ ramp, lit: 8, shade: 3 }] }, ANIMS)).toThrow(
      'silhouetteOutline',
    );
  });
});

describe('rig opt-in: silhouetteOutline per ramp', () => {
  it('uses each ramp its own lit / other shade', () => {
    const buf = createIndexBuffer(5, 3, palette);
    buf.set(1, 1, { ramp: 'cloth_indigo', shade: 3, material: MAT.cloth, depth: 1 });
    buf.set(3, 1, { ramp: 'cloth_teal', shade: 3, material: MAT.cloth, depth: 1 });
    const map = outline(buf, ctx.rampSize, { drop: 2 });
    silhouetteOutline(buf, map, [
      { ramp: 'cloth_indigo', lit: 5, shade: 3 },
      { ramp: 'cloth_teal', lit: 4, shade: 2 },
    ]);
    expect([buf.shade[1 * 5 + 0], buf.shade[0 * 5 + 1], buf.shade[2 * 5 + 1]]).toEqual([5, 5, 3]);
    expect([buf.shade[0 * 5 + 3], buf.shade[1 * 5 + 4], buf.shade[2 * 5 + 3]]).toEqual([4, 2, 2]);
  });
});

describe('rig opt-in: silhouetteOutline head tones (MA-69)', () => {
  it('outer-outline px around head-mask px take the head tones; the rest of the ramp keeps its own', () => {
    const buf = createIndexBuffer(5, 5, palette);
    buf.set(1, 2, { ramp: 'cloth_indigo', shade: 3, material: MAT.cloth, depth: 1 });
    buf.set(3, 2, { ramp: 'cloth_indigo', shade: 3, material: MAT.cloth, depth: 1 });
    const map = outline(buf, ctx.rampSize, { drop: 2 });
    const head = new Set([2 * 5 + 3]);
    silhouetteOutline(buf, map, [{ ramp: 'cloth_indigo', lit: 5, shade: 3, head: { shade: 4 } }], head);
    // Head px (3, 2): shade side (right, bottom) 4, lit side (top) keeps 5; the other px keeps shade 3.
    expect([buf.shade[2 * 5 + 4], buf.shade[3 * 5 + 3], buf.shade[1 * 5 + 3]]).toEqual([4, 4, 5]);
    expect([buf.shade[2 * 5 + 0], buf.shade[3 * 5 + 1], buf.shade[1 * 5 + 1]]).toEqual([5, 3, 5]);
  });

  it('retones only head-outline px of the ramp on a rendered body, and validates shades', () => {
    const ramp = DUMMY_A.outfit.hair.ramp;
    const base: Body = { ...DUMMY_A, silhouetteOutline: [{ ramp, lit: 5, shade: 1 }] };
    const headed: Body = { ...DUMMY_A, silhouetteOutline: [{ ramp, lit: 5, shade: 1, head: { shade: 4 } }] };
    const a = render(base);
    const b = render(headed);
    expect(same(a, b)).toBe(false);
    const target = palette.ramps.get(ramp)?.[4];
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        if (rgb(a, x, y) !== rgb(b, x, y)) expect(rgb(b, x, y), `${String(x)},${String(y)}`).toBe(target);
      }
    }
    // The back-hair mass (not the head mask) keeps the ramp's own shade-side tone on its outline.
    expect(pxOn(b, ramp).length).toBe(pxOn(a, ramp).length);
    expect(() =>
      createRigPack({ ...DUMMY_A, silhouetteOutline: [{ ramp, lit: 5, shade: 1, head: { shade: 9 } }] }, ANIMS),
    ).toThrow('silhouetteOutline');
  });
});

describe('rig opt-in: sleeveRim', () => {
  /** Labelled px of `label` and the colour count of `tone` among them. */
  const toneIn = (
    body: Body,
    label: number,
    tone: number,
  ): { px: number; hit: number; edge: number; edgeHit: number } => {
    const { image, labels } = createRigRenderer(body).renderLabeled(idle, 0, ctx);
    const lab = (x: number, y: number): number =>
      x < 0 || !labels.data[(y * image.width + x) * 4 + 3]
        ? ARM_LABEL.none
        : (labels.data[(y * image.width + x) * 4] ?? 0);
    const out = { px: 0, hit: 0, edge: 0, edgeHit: 0 };
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (lab(x, y) !== label || !image.data[(y * image.width + x) * 4 + 3]) continue;
        const hit = rgb(image, x, y) === tone ? 1 : 0;
        out.px++;
        out.hit += hit;
        if (lab(x - 1, y) === ARM_LABEL.none) {
          out.edge++;
          out.edgeHit += hit;
        }
      }
    }
    return out;
  };
  const ramp = LONG.sleeve?.ramp ?? LONG.ramps.cloth;
  const tone = palette.ramps.get(ramp)?.[5] ?? -1;
  const rimmed: Body = { ...LONG, sleeveRim: 5 };

  it('lights every outer (screen-left) edge px of the near sleeve in the rim shade; the far sleeve is untouched', () => {
    const near = toneIn(rimmed, ARM_LABEL.sleeveL, tone);
    expect(near.edge).toBeGreaterThan(0);
    expect(near.edgeHit).toBe(near.edge);
    expect(toneIn(LONG, ARM_LABEL.sleeveL, tone).edgeHit).toBeLessThan(near.edge);
    expect(toneIn(rimmed, ARM_LABEL.sleeveR, tone)).toEqual(toneIn(LONG, ARM_LABEL.sleeveR, tone));
    expect(() => createRigPack({ ...LONG, sleeveRim: 7 }, ANIMS)).toThrow('sleeveRim');
  });
});

describe('rig opt-in: views.q34.hairTipLag', () => {
  it('adds the previous frame hairDx to the back-hair tips on q34 frames (follow-through); front frames unchanged', () => {
    const q = q34Of(DUMMY_B);
    const lagged: Body = { ...DUMMY_B, views: { q34: { ...q, hairTipLag: true } } };
    const after = walk.frames.findIndex(
      (_, i) => (walk.frames[(i + walk.frames.length - 1) % walk.frames.length]?.hairDx ?? 0) !== 0,
    );
    expect(after).toBeGreaterThanOrEqual(0);
    expect(same(render(lagged, walk, after), render(DUMMY_B, walk, after))).toBe(false);
    const still = walk.frames.findIndex(
      (f, i) =>
        (f.hairDx ?? 0) === 0 && (walk.frames[(i + walk.frames.length - 1) % walk.frames.length]?.hairDx ?? 0) === 0,
    );
    if (still >= 0) expect(same(render(lagged, walk, still), render(DUMMY_B, walk, still))).toBe(true);
    expect(same(render(lagged), render(DUMMY_B))).toBe(true);
  });
});

describe('rig opt-in: lockLean', () => {
  it('leanLock keeps root and tip and puts the points between them on one straight line', () => {
    const out = leanLock([
      [0, 0],
      [2, 3],
      [0, 6],
      [1, 9],
    ]);
    expect(out[0]).toEqual([0, 0]);
    expect(out[3]).toEqual([1, 9]);
    expect(out[1]?.[0]).toBeCloseTo(1 / 3);
    expect(out[2]?.[1]).toBeCloseTo(6);
  });
  it('changes only bodies that opt in', () => {
    const think = anim('think');
    const leaned = { ...DUMMY_B, lockLean: true as const };
    const differs = think.frames.some((_, f) => !same(render(leaned, think, f), render(DUMMY_B, think, f)));
    expect(differs).toBe(true);
    // The default body has no lockLean, and the lean only moves side-lock points: without locks it is a no-op, so a
    // body that does not opt in renders unchanged.
    expect(DUMMY_B.lockLean).toBeUndefined();
    const noLocks: Body = { ...DUMMY_B, sideLocks: false };
    for (let f = 0; f < think.frames.length; f++) {
      expect(same(render({ ...noLocks, lockLean: true }, think, f), render(noLocks, think, f))).toBe(true);
    }
  });
});

describe('rig opt-in: masks.headAccRising (R-W3 follow-through)', () => {
  const RISING = ['.gt', 'gtr', '.r.'];
  const withRising: Body = { ...DUMMY_A, masks: { ...DUMMY_A.masks, headAccRising: RISING } };
  it('swaps in the alternate head-accessory mask exactly on frames whose head is higher than on the previous one', () => {
    const r = createRigRenderer(DUMMY_A);
    let rising = 0;
    let still = 0;
    for (const a of [anim('happy'), idle, anim('startle')]) {
      a.frames.forEach((_, f) => {
        const prev = a.loop ? (f + a.frames.length - 1) % a.frames.length : Math.max(0, f - 1);
        const rises = r.fxAnchor(a, f)[1] < r.fxAnchor(a, prev)[1];
        if (rises) rising++;
        else still++;
        expect(same(render(withRising, a, f), render(DUMMY_A, a, f)), `${a.name}/${String(f)}`).toBe(!rises);
      });
    }
    expect(rising).toBeGreaterThan(0);
    expect(still).toBeGreaterThan(0);
  });
  it('fails the build when it does not match the headAcc mask size', () => {
    const bad: Body = { ...DUMMY_A, masks: { ...DUMMY_A.masks, headAccRising: ['gt'] } };
    expect(() => createRigPack(bad, ANIMS)).toThrow(/headAccRising must be the size of headAcc/);
  });
});

describe("rig opt-in: headAcc 'hat' bounds", () => {
  /** A 20 × 6 hat placed from `acc` (figure row −1 at rest), the same in both views. */
  const HAT = Array.from({ length: 6 }, (_, i) =>
    i < 4 ? '.'.repeat(8 - 2 * i) + 'D'.repeat(4 + 4 * i) : 'D'.repeat(20),
  );
  const hatBody = (mask: readonly string[], at: [number, number]): Body => ({
    ...DUMMY_A,
    variants: { ...DUMMY_A.variants, headAcc: 'hat' },
    masks: { ...DUMMY_A.masks, headAcc: { mask, at } },
    views: { q34: { ...q34Of(DUMMY_A), masks: { ...q34Of(DUMMY_A).masks, headAcc: { mask, at } } } },
  });
  it('accepts a hat inside the bounds and stamps it over the crown', () => {
    const body = hatBody(HAT, [-10, -4]);
    expect(() => createRigPack(body, ANIMS)).not.toThrow();
    expect(pxOn(render(body), DUMMY_A.outfit.dress.ramp).length).toBeGreaterThan(
      pxOn(render(DUMMY_A), DUMMY_A.outfit.dress.ramp).length,
    );
  });
  it('rejects a hat that is too wide, too tall or reaches above figure row −1', () => {
    expect(() =>
      createRigPack(
        hatBody(
          HAT.map((r) => r + '.'.repeat(10)),
          [-10, -4],
        ),
        ANIMS,
      ),
    ).toThrow(/exceeds 28/);
    expect(() => createRigPack(hatBody([...HAT, ...HAT], [-10, -4]), ANIMS)).toThrow(/exceeds/);
    expect(() => createRigPack(hatBody(HAT, [-10, -5]), ANIMS)).toThrow(/top row -2 is above -1/);
  });
  it('needs a headAcc mask', () => {
    const body: Body = { ...hatBody(HAT, [-10, -4]), masks: { shoe: DUMMY_A.masks.shoe } };
    expect(() => createRigPack(body, ANIMS)).toThrow(/headAcc 'hat' needs a headAcc mask/);
  });
});

describe('rig opt-in: skirtRaise', () => {
  it('raises the skirt hem by whole rows (the lowest hem px moves up by exactly that many rows)', () => {
    const lowestHem = (body: Body): number => {
      const image = render(body);
      const dress = new Set(palette.ramps.get(body.ramps.cloth) ?? []);
      let low = -1;
      for (let y = 0; y < image.height; y++)
        for (let x = 0; x < image.width; x++)
          if (dress.has(rgb(image, x, y)) && image.data[(y * image.width + x) * 4 + 3]) low = y;
      return low;
    };
    expect(lowestHem({ ...MAID_PREVIEW, skirtRaise: 2 })).toBe(lowestHem(MAID_PREVIEW) - 2);
  });
  it('fails the build outside 0..3, fractional, or without a skirt', () => {
    expect(() => createRigPack({ ...MAID_PREVIEW, skirtRaise: 4 }, ANIMS)).toThrow(/skirtRaise 4/);
    expect(() => createRigPack({ ...MAID_PREVIEW, skirtRaise: 1.5 }, ANIMS)).toThrow(/skirtRaise 1.5/);
    expect(() => createRigPack({ ...DUMMY_A, skirtRaise: 1 }, ANIMS)).toThrow(/skirtRaise needs hem 'skirt'/);
  });
});

describe('rig opt-in: legRim', () => {
  it('paints the lit (screen-left) edge px of each leg in the rim shade (the leg continues to its right)', () => {
    const shade = 5;
    const tone = palette.ramps.get(DUMMY_A.ramps.legs)?.[shade] ?? -1;
    const base = render(DUMMY_A);
    const lit = render({ ...DUMMY_A, legRim: shade });
    expect(same(base, lit)).toBe(false);
    const changed: [number, number][] = [];
    for (let y = 0; y < lit.height; y++)
      for (let x = 0; x < lit.width; x++) if (rgb(lit, x, y) !== rgb(base, x, y)) changed.push([x, y]);
    const legs = new Set(palette.ramps.get(DUMMY_A.ramps.legs) ?? []);
    const rim = changed.filter(([x, y]) => rgb(lit, x, y) === tone);
    expect(rim.length).toBeGreaterThanOrEqual(2);
    // The leg continues to the right of every rim px (it is the leg's left edge, not a stray recolour).
    for (const [x, y] of rim) expect(legs.has(rgb(base, x + 1, y)), `(${String(x)}, ${String(y)})`).toBe(true);
  });
  it('fails the build on a shade outside the legs ramp or a fractional one', () => {
    expect(() => createRigPack({ ...DUMMY_A, legRim: 9 }, ANIMS)).toThrow(/legRim/);
    expect(() => createRigPack({ ...DUMMY_A, legRim: 2.5 }, ANIMS)).toThrow(/legRim/);
  });
});

describe('rig opt-in: views.q34.hairBackCuts', () => {
  const walk0 = (body: Body): RgbaImage => render(body, walk, 0);
  const withCuts = (rows: readonly number[], nape?: number): Body => ({
    ...DUMMY_B,
    views: { q34: { ...q34Of(DUMMY_B), hairBackCuts: { rows, ...(nape === undefined ? {} : { nape }) } } },
  });
  it('changes q34 frames only; front frames stay byte-identical', () => {
    const body = withCuts([4, 6]);
    expect(same(walk0(body), walk0(DUMMY_B))).toBe(false);
    expect(same(render(body), render(DUMMY_B))).toBe(true);
  });
  it('fails the build on rows outside 0..24, fractional rows or more than 4 cuts', () => {
    expect(() => createRigPack(withCuts([30]), ANIMS)).toThrow(/hairBackCuts/);
    expect(() => createRigPack(withCuts([1.5]), ANIMS)).toThrow(/hairBackCuts/);
    expect(() => createRigPack(withCuts([1, 2, 3, 4, 5]), ANIMS)).toThrow(/hairBackCuts/);
    expect(() => createRigPack(withCuts([4], 30), ANIMS)).toThrow(/hairBackCuts/);
  });
});
// ── MA-29b (ronin) slots: cloak, prop, collar, skirtSplit, skirtLace ─────────────────────────────────────────────────
const CLOAK_A: Cloak = {
  ramp: 'mist',
  shade: 4,
  litShade: 5,
  top: 0,
  hemRow: 2,
  widths: { top: 8, hem: 13, shape: 'bell' },
  shoulder: 'square',
  hem: { lobes: 3 },
  bands: [{ row: 4, shade: 5 }],
  maxTrail: 3,
};
const CLOAKED: Body = {
  ...DUMMY_A,
  variants: { ...DUMMY_A.variants, back: 'cloak' },
  cloak: CLOAK_A,
};
const geomOf = (cloak: Cloak, a: RigAnim, f: number, q = false) => {
  const j = createRigRenderer(CLOAKED).joints(a, f);
  const p = a.frames[f];
  if (!p) throw new Error('frame');
  return cloakGeometry(cloak, p, j, q, [0, 0], 0, 48);
};
const rowXs = (g: ReturnType<typeof geomOf>, y: number): number[] =>
  [...g.px.keys()].filter((i) => Math.floor(i / 48) === y).map((i) => i % 48);

describe("rig slot: back 'cloak' (R1)", () => {
  it('draws a mist panel behind the body only with the slot, wider than the legs at the hem', () => {
    expect(pxOn(render(DUMMY_A), 'mist')).toHaveLength(0);
    const mist = pxOn(render(CLOAKED), 'mist');
    expect(mist.length).toBeGreaterThan(20);
    const g = geomOf(CLOAK_A, idle, 0);
    const legs = pxOn(render(DUMMY_A), DUMMY_A.ramps.legs).map(([x]) => x);
    expect(Math.min(...rowXs(g, g.hemY - 1))).toBeLessThan(Math.min(...legs));
  });
  it('lobes cut 1-row dips into the hem; 0 lobes = a straight hem', () => {
    const straight = geomOf({ ...CLOAK_A, hem: { lobes: 0 } }, idle, 0);
    const lobed = geomOf(CLOAK_A, idle, 0);
    expect(rowXs(lobed, lobed.hemY).length).toBeLessThan(rowXs(straight, straight.hemY).length);
    expect(rowXs(lobed, lobed.hemY - 1)).toEqual(rowXs(straight, straight.hemY - 1));
  });
  it('paints band rows in the band shade (ends inset 2 px) and the lit left edge in litShade', () => {
    const g = geomOf(CLOAK_A, idle, 0);
    const y = g.hemY - 4;
    const xs = rowXs(g, y).sort((a, b) => a - b);
    const shadeAt = (x: number): number | undefined => g.px.get(y * 48 + x)?.shade;
    const [first = -1, last = -1] = [xs[0], xs[xs.length - 1]];
    expect(shadeAt(first)).toBe(5);
    expect(shadeAt(first + 1)).toBe(4);
    expect(shadeAt(first + 2)).toBe(5);
    expect(shadeAt(last)).toBe(4);
  });
  it('dithers only interior px of the listed rows', () => {
    const g = geomOf({ ...CLOAK_A, dither: { rows: [6], shades: [3, 4] } }, idle, 0);
    const y = g.hemY - 6;
    const shades = rowXs(g, y)
      .sort((a, b) => a - b)
      .map((x) => g.px.get(y * 48 + x)?.shade);
    expect(shades).toContain(3);
    expect(shades[0]).not.toBe(3);
    expect(shades[shades.length - 1]).not.toBe(3);
  });
  it('seated: the hem rises to the seat + 3 rows (feet show); dangling: 2 px narrower per side', () => {
    const sit = anim('sit_edge');
    const seat = createRigRenderer(CLOAKED).joints(sit, 0).seat;
    expect(geomOf(CLOAK_A, sit, 0).hemY).toBeLessThanOrEqual(Math.round(seat[1]) + CLOAK_SEAT_HEM);
    const drag = anim('drag');
    const straight = { ...CLOAK_A, hem: { lobes: 0 } };
    const idleG = geomOf(straight, idle, 0);
    const wide = rowXs(idleG, idleG.hemY).length;
    drag.frames.forEach((p, f) => {
      if (p.parts.legs !== 'dangle') return;
      const g = geomOf(straight, drag, f);
      expect(rowXs(g, g.hemY).length).toBe(wide - 2 * CLOAK_DANGLE_NARROW + 2 * Math.max(0, p.squash));
    });
  });
  it('corner curl adds an attached stepped wisp outside the hem; lining paints the corners in the lining ramp', () => {
    const curled = geomOf({ ...CLOAK_A, hem: { lobes: 0, curl: 2 } }, idle, 0);
    const plain = geomOf({ ...CLOAK_A, hem: { lobes: 0 } }, idle, 0);
    expect(curled.px.size).toBe(plain.px.size + 6);
    const lined = geomOf({ ...CLOAK_A, lining: { ramp: 'cloth_ochre', shade: 4, corner: [2, 3] } }, idle, 0);
    expect([...lined.px.values()].filter((t) => t.lining).length).toBeGreaterThan(0);
    expect([...geomOf(CLOAK_A, idle, 0).px.values()].some((t) => t.lining)).toBe(false);
  });
  it('lining inset: the whole corner triangle (2 + 2 + 1 px per side) sits `inset` px inside the side and hem edges', () => {
    const base = { ...CLOAK_A, hem: { lobes: 0 } };
    const liningXs = (inset: number | undefined): number[] => {
      const g = geomOf(
        { ...base, lining: { ramp: 'cloth_ochre', shade: 3, corner: [2, 3], ...(inset ? { inset } : {}) } },
        idle,
        0,
      );
      return [...g.px.entries()].filter(([, t]) => t.lining).map(([i]) => i % 48);
    };
    const liningRows = (inset: number): number[] => {
      const g = geomOf({ ...base, lining: { ramp: 'cloth_ochre', shade: 3, corner: [2, 3], inset } }, idle, 0);
      return [...g.px.entries()].filter(([, t]) => t.lining).map(([i]) => Math.floor(i / 48) - g.hemY);
    };
    expect(Math.max(...liningRows(0))).toBe(0);
    expect(Math.max(...liningRows(1))).toBe(-1);
    const edge = rowXs(geomOf(base, idle, 0), geomOf(base, idle, 0).hemY);
    const [lo, hi] = [Math.min(...edge), Math.max(...edge)];
    expect(liningXs(undefined)).toContain(lo);
    const inset = liningXs(1);
    expect(inset).toHaveLength(10);
    expect(inset).not.toContain(lo);
    expect(inset).not.toContain(hi);
    expect(Math.min(...inset)).toBe(lo + 1);
    expect(Math.max(...inset)).toBe(hi - 1);
  });
  it('lining inset must be a whole 0..2', () => {
    const bad: Body = {
      ...CLOAKED,
      cloak: { ...CLOAK_A, lining: { ramp: 'cloth_ochre', shade: 3, corner: [2, 3], inset: 3 } },
    };
    expect(() => createRigPack(bad, [idle])).toThrow(/cloak.lining.inset/);
  });
  it('q34: trails behind the hip (more px left of the axis than right)', () => {
    const xs = [...geomOf(CLOAK_A, walk, 0, true).px.keys()].map((i) => i % 48);
    expect(xs.filter((x) => x < 24).length).toBeGreaterThan(xs.filter((x) => x >= 24).length);
  });
  it('fails the build without Body.cloak, with a cloak but no slot, or out-of-range params', () => {
    const bare: Body = { ...DUMMY_A, variants: { ...DUMMY_A.variants, back: 'cloak' } };
    expect(() => createRigPack(bare, [idle])).toThrow(/back 'cloak' needs Body.cloak/);
    expect(() => createRigPack({ ...DUMMY_A, cloak: CLOAK_A }, [idle])).toThrow(/Body.cloak needs back 'cloak'/);
    expect(() => createRigPack({ ...CLOAKED, cloak: { ...CLOAK_A, hem: { lobes: 1.5 } } }, [idle])).toThrow(/lobes/);
    expect(() => createRigPack({ ...CLOAKED, cloak: { ...CLOAK_A, shade: 9 } }, [idle])).toThrow(/cloak.shade/);
  });
});

describe('rig slot: Body.prop (R2)', () => {
  const BAR = ['X'.repeat(24), 'X'.repeat(24)];
  const withProp: Body = { ...DUMMY_A, prop: { mask: BAR, at: [-12, -6] } };
  it('draws behind the torso, hem and arms: prop px show only outside the body', () => {
    const base = render(DUMMY_A);
    const img = render(withProp);
    expect(pxOn(img, 'ink').length).toBeGreaterThan(pxOn(base, 'ink').length);
    // The bar crosses the whole body: its middle px stay hidden (the body px there are unchanged).
    const j = createRigRenderer(DUMMY_A).joints(idle, 0);
    const y = Math.round(j.hip[1] - 6);
    expect(rgb(img, 24, y)).toBe(rgb(base, 24, y));
  });
  it('swings the dangle 1 px with the stride (hip lag + hairDx, clamped)', () => {
    const q = q34Of(DUMMY_A);
    const prop = { mask: ['X'], at: [-20, 4] as const, dangle: { mask: ['XX'], at: [0, 2] as const } };
    const body: Body = { ...DUMMY_A, prop, views: { q34: { ...q, prop } } };
    const r = createRigRenderer(body);
    const passing = walk.frames.findIndex((p) => (p.hairDx ?? 0) !== 0);
    const still = walk.frames.findIndex((p, f) => (p.hairDx ?? 0) === 0 && (walk.frames[f - 1]?.hairDx ?? 0) === 0);
    const inkXs = (f: number): number[] => pxOn(r.render(walk, f, ctx), 'ink').map(([x]) => x);
    expect(passing).toBeGreaterThanOrEqual(0);
    expect(Math.min(...inkXs(passing))).not.toBe(Math.min(...inkXs(still)));
  });
  it('fails the build when a q34 pose is built without views.q34.prop', () => {
    expect(() => createRigPack(withProp, [walk])).toThrow(/views.q34.prop/);
  });
});

describe("rig slot: neckAcc 'collar' (R3)", () => {
  const COLLARED: Body = {
    ...DUMMY_A,
    variants: { ...DUMMY_A.variants, neckAcc: 'collar' },
    masks: {
      ...DUMMY_A.masks,
      neckAcc: { mask: ['O'.repeat(24), 'O'.repeat(24)], at: [-12, 3] },
    },
  };
  const armPx = (b: Body): number => {
    const { labels } = createRigRenderer(b).renderLabeled(anim('wave'), 2, ctx);
    let n = 0;
    for (let i = 0; i < labels.data.length; i += 4) {
      const v = labels.data[i];
      if (v === ARM_LABEL.sleeveL || v === ARM_LABEL.sleeveR || v === ARM_LABEL.endL || v === ARM_LABEL.endR) n++;
    }
    return n;
  };
  it('never stamps over arm px (arms draw over a mantle); a choker mask does', () => {
    expect(armPx(COLLARED)).toBeGreaterThan(
      armPx({
        ...COLLARED,
        variants: { ...COLLARED.variants, neckAcc: 'choker' },
      }),
    );
  });
  it('needs a neckAcc mask', () => {
    expect(() => createRigPack({ ...COLLARED, masks: { shoe: DUMMY_A.masks.shoe } }, [idle])).toThrow(
      /collar' needs masks.neckAcc/,
    );
  });
  describe('R-V2 collar bounds (vampire.md §7: tips clear of raised hands, never at eye level)', () => {
    const withCollar = (mask: string[], at: readonly [number, number]): Body => ({
      ...COLLARED,
      masks: { ...COLLARED.masks, neckAcc: { mask, at } },
    });
    it('builds a collar inside x 11–37, ≤ 27 × 9 px, its top under the eyes on every frame', () => {
      expect(() => createRigPack(COLLARED, [idle, anim('wave'), anim('happy')])).not.toThrow();
      expect(COLLAR_MAX).toEqual({ w: 27, h: 9, x0: 11, x1: 37, eyeGap: 1 });
    });
    it('fails when a tip reaches the raised-hand zone (x ≤ 10 or ≥ 38) on any frame', () => {
      expect(() => createRigPack(withCollar(['O'.repeat(26)], [-11, 3]), [idle])).toThrow(
        /collar cols 13\.\.38 leave x 11\.\.37/,
      );
      expect(() => createRigPack(withCollar(['O'.repeat(27)], [-14, 3]), [idle])).toThrow(
        /collar cols 10\.\.36 leave x 11\.\.37/,
      );
    });
    it('fails over 27 × 9 px', () => {
      expect(() => createRigPack(withCollar(Array<string>(10).fill('O'.repeat(20)), [-10, 0]), [idle])).toThrow(
        /collar 20 × 10 exceeds 27 × 9/,
      );
    });
    it('fails when the collar top rises to the eye rows', () => {
      expect(() => createRigPack(withCollar(['O'.repeat(20), 'O'.repeat(20)], [-10, -12]), [idle])).toThrow(
        /collar top row \d+ is not under the eyes/,
      );
    });
  });
});

describe('rig opt-ins: skirtSplit, skirtLace (R4)', () => {
  const clothPx = (img: RgbaImage): [number, number][] => pxOn(img, MAID_PREVIEW.ramps.cloth);
  it('skirtLace false: no lace row (fewer clothAlt px); the cloth hem keeps the lace length', () => {
    const plain = { ...MAID_PREVIEW, skirtLace: false };
    expect(pxOn(render(plain), MAID_PREVIEW.ramps.clothAlt).length).toBeLessThan(
      pxOn(render(MAID_PREVIEW), MAID_PREVIEW.ramps.clothAlt).length,
    );
    const bottom = (b: Body): number => Math.max(...clothPx(render(b)).map(([, y]) => y));
    expect(bottom(plain)).toBeGreaterThan(bottom(MAID_PREVIEW));
  });
  it('skirtSplit paints a 1-px line in the split shade; notch opens a gap at the hem centre; front only', () => {
    const split: Body = {
      ...MAID_PREVIEW,
      skirtLace: false,
      skirtSplit: { rows: 4, shade: 0, notch: 2 },
    };
    const img = render(split);
    const deep = palette.ramps.get(MAID_PREVIEW.ramps.cloth)?.[0];
    expect(clothPx(img).some(([x, y]) => x === 23 && rgb(img, x, y) === deep)).toBe(true);
    const noNotch = render({ ...split, skirtSplit: { rows: 4, shade: 0 } });
    expect(clothPx(img).length).toBeLessThan(clothPx(noNotch).length);
    const unsplit: Body = { ...MAID_PREVIEW, skirtLace: false };
    expect(same(render(split, walk, 0), render(unsplit, walk, 0))).toBe(true);
  });
  it('fails the build on a bad split (rows, notch > rows, no skirt)', () => {
    expect(() => createRigPack({ ...MAID_PREVIEW, skirtSplit: { rows: 0, shade: 1 } }, [idle])).toThrow(
      /skirtSplit.rows/,
    );
    expect(() => createRigPack({ ...MAID_PREVIEW, skirtSplit: { rows: 2, shade: 1, notch: 3 } }, [idle])).toThrow(
      /notch/,
    );
    expect(() => createRigPack({ ...DUMMY_A, skirtSplit: { rows: 2, shade: 1 } }, [idle])).toThrow(/needs hem 'skirt'/);
  });
});

describe('rig: hemLiftOf (seated knee follows skirtRaise)', () => {
  const sit = anim('sit_edge');
  const f = sit.frames.findIndex((p) => p.parts.legs === 'sit');
  const knees = (b: Body): number[] => {
    const p = sit.frames[f];
    if (!p) throw new Error('no sit frame');
    return buildLegs(b, p, createRigRenderer(b).joints(sit, f), false, undefined).knees.map(([, y]) => y);
  };
  it('moves the seated knee bump up with the raised skirt hem (it stays just under the hem)', () => {
    expect(f).toBeGreaterThanOrEqual(0);
    const raised = knees({ ...MAID_PREVIEW, skirtRaise: 2 });
    knees(MAID_PREVIEW).forEach((y, i) => {
      expect(raised[i]).toBe(y - 2);
    });
  });
  it('fails the build when pose hem.lift + skirtRaise passes HEM_LIFT_MAX', () => {
    const lifted: RigAnim = {
      ...sit,
      frames: sit.frames.map((p) => ({ ...p, parts: { ...p.parts, hem: { lift: HEM_LIFT_MAX } } })),
    };
    expect(() => createRigPack({ ...MAID_PREVIEW, skirtRaise: 1 }, [lifted])).toThrow(/hem\.lift \+ raise reaches/);
  });
});

// ── MA-29b art round 1 (ronin) opt-ins: q34 hairBack mask, sash.dy, skirtSplit detail, cloak innerShade, overHem ──
describe('rig opt-in: BodyView.masks.hairBack (authored back hair)', () => {
  const q = q34Of(MAID_PREVIEW);
  const MASK = ['HH', 'HH', 'HH'];
  const authored: Body = {
    ...MAID_PREVIEW,
    views: { q34: { ...q, masks: { ...q.masks, hairBack: { mask: MASK, at: [-16, 2] } } } },
  };
  const hairPx = (b: Body, a: RigAnim, f: number): number => pxOn(render(b, a, f), MAID_PREVIEW.ramps.hair).length;
  it('replaces the procedural mass on q34-head frames (fewer hair px; the mask px are hair); front frames unchanged', () => {
    expect(hairPx(authored, walk, 0)).toBeLessThan(hairPx(MAID_PREVIEW, walk, 0));
    const img = render(authored, walk, 0);
    const j = createRigRenderer(authored).joints(walk, 0);
    const hair = new Set(palette.ramps.get(MAID_PREVIEW.ramps.hair) ?? []);
    expect(hair.has(rgb(img, Math.round(j.head[0] - 15), Math.round(j.head[1] + 3)))).toBe(true);
    expect(same(render(authored), render(MAID_PREVIEW))).toBe(true);
  });
  it('fails the build on a mask with an unknown letter', () => {
    const bad: Body = {
      ...MAID_PREVIEW,
      views: { q34: { ...q, masks: { ...q.masks, hairBack: { mask: ['H?'], at: [0, 0] } } } },
    };
    expect(() => createRigPack(bad, [walk])).toThrow(/hairBack/);
  });
});

describe('rig opt-in: sash.dy', () => {
  const trimY = (b: Body): number => {
    const j = createRigRenderer(b).joints(idle, 0);
    const band = buildTorso(b, j, false, 0).find((p) => p.partId === PART_ID.trim);
    if (!band) throw new Error('no waist band');
    return band.shape.y;
  };
  const sash = { rows: 2, knot: { mask: [], at: [0, 0] as const } };
  it('moves the waist band down by dy whole rows', () => {
    expect(trimY({ ...MAID_PREVIEW, sash: { ...sash, dy: 2 } })).toBe(trimY({ ...MAID_PREVIEW, sash }) + 2);
  });
  it('fails the build outside 0..3 or fractional', () => {
    expect(() => createRigPack({ ...MAID_PREVIEW, sash: { ...sash, dy: 4 } }, [idle])).toThrow(/sash.dy/);
    expect(() => createRigPack({ ...MAID_PREVIEW, sash: { ...sash, dy: 0.5 } }, [idle])).toThrow(/sash.dy/);
  });
});

describe('rig opt-ins: skirtSplit notchShade, hemHalf, pleats, rim', () => {
  const base: Body = { ...MAID_PREVIEW, skirtLace: false, skirtSplit: { rows: 8, shade: 0, notch: 3 } };
  const cloth = (s: number): number | undefined => palette.ramps.get(MAID_PREVIEW.ramps.cloth)?.[s];
  const count = (img: RgbaImage, s: number): number =>
    pxOn(img, MAID_PREVIEW.ramps.cloth).filter(([x, y]) => rgb(img, x, y) === cloth(s)).length;
  const spanAt = (img: RgbaImage, y: number): number => {
    const xs = pxOn(img, MAID_PREVIEW.ramps.cloth)
      .filter(([, py]) => py === y)
      .map(([x]) => x);
    return Math.max(...xs) - Math.min(...xs);
  };
  const lowest = (img: RgbaImage): number => Math.max(...pxOn(img, MAID_PREVIEW.ramps.cloth).map(([, y]) => y));
  it('hemHalf narrows the hem (a trapezoid, not the default bell)', () => {
    const narrow = render({ ...base, skirtSplit: { ...base.skirtSplit, rows: 8, shade: 0, hemHalf: 7 } });
    const wide = render(base);
    expect(spanAt(narrow, lowest(narrow) - 2)).toBeLessThan(spanAt(wide, lowest(wide) - 2));
  });
  it('notchShade fills the notch with the inner shadow; pleats add mirrored lines in their shade with a lit px', () => {
    const plain = render(base);
    const shaded = render({ ...base, skirtSplit: { rows: 8, shade: 0, notch: 3, notchShade: 1 } });
    expect(count(shaded, 1)).toBeGreaterThan(count(plain, 1));
    const pleated = render({
      ...base,
      skirtSplit: { rows: 8, shade: 0, notch: 3, pleats: { offsets: [3], shade: 2, lit: 5 } },
    });
    const y = lowest(pleated) - 3;
    // Split column 23: pleats at 23 − 3 and 23 + 1 + 3, lit px at 23 − 4.
    expect(rgb(pleated, 20, y)).toBe(cloth(2));
    expect(rgb(pleated, 27, y)).toBe(cloth(2));
    expect(rgb(pleated, 19, y)).toBe(cloth(5));
    expect(rgb(plain, 20, y)).not.toBe(cloth(2));
  });
  it('rim paints the leftmost skirt px of each hem row in the rim shades', () => {
    const rimmed = render({ ...base, skirtSplit: { rows: 8, shade: 0, rim: { shade: 4, lit: 5 } } });
    const y = lowest(rimmed) - 2;
    const left = Math.min(
      ...pxOn(rimmed, MAID_PREVIEW.ramps.cloth)
        .filter(([, py]) => py === y)
        .map(([x]) => x),
    );
    expect([cloth(4), cloth(5)]).toContain(rgb(rimmed, left, y));
  });
  it('fails the build on a hemHalf outside 6..10 or a bad pleat offset', () => {
    expect(() => createRigPack({ ...base, skirtSplit: { rows: 8, shade: 0, hemHalf: 11 } }, [idle])).toThrow(/hemHalf/);
    expect(() =>
      createRigPack({ ...base, skirtSplit: { rows: 8, shade: 0, pleats: { offsets: [0], shade: 2 } } }, [idle]),
    ).toThrow(/pleats/);
  });
});

describe('rig opt-in: cloak innerShade', () => {
  it('paints cloak px touching the skirt / legs in the inner shade; none without it', () => {
    const inner = (b: Body): number => {
      const img = render(b);
      const mist2 = palette.ramps.get('mist')?.[2];
      return [...geomOf(CLOAK_A, idle, 0).px.keys()].filter((i) => {
        const [x, y] = [i % 48, Math.floor(i / 48)];
        return (img.data[i * 4 + 3] ?? 0) > 0 && rgb(img, x, y) === mist2;
      }).length;
    };
    expect(inner(CLOAKED)).toBe(0);
    expect(inner({ ...CLOAKED, cloak: { ...CLOAK_A, innerShade: 2 } })).toBeGreaterThan(4);
  });
});

describe('rig opt-in: Prop dangle overHem', () => {
  it('hangs the dangle in front of the skirt / legs (hidden behind them without it)', () => {
    const prop = { mask: ['X'], at: [-20, 0] as const, dangle: { mask: ['XX', 'XX'], at: [20, -4] as const } };
    const behind = render({ ...DUMMY_A, prop });
    const front = render({ ...DUMMY_A, prop: { ...prop, dangle: { ...prop.dangle, overHem: true as const } } });
    expect(pxOn(front, 'ink').length).toBeGreaterThan(pxOn(behind, 'ink').length);
  });
});

// ── MA-29a code-review follow-ups: nape indent, q34 rising, hat bounds, brow hair letters, rising edge cases ────────
describe('rig opt-ins (witch review follow-ups)', () => {
  const RISING = ['.gt', 'gtr', '.r.'];
  // Rendered, the indent is invisible on every dummy and on witch (AO already takes those px to shade 0; witch frames
  // are byte-identical without `nape`), so the pass is checked on a buffer.
  it('napeIndent darkens hair px whose same-row neighbour is torso to shade 0; other hair px keep their tone', () => {
    const buf = createIndexBuffer(6, 3, palette);
    for (let x = 0; x < 6; x++)
      buf.set(x, 1, { ramp: 'hair_umber', shade: 3, partId: x < 3 ? PART_ID.hair : PART_ID.torso });
    buf.set(1, 0, { ramp: 'hair_umber', shade: 3, partId: PART_ID.hair });
    napeIndent(buf, 1);
    expect(buf.get(2, 1).shade).toBe(0);
    expect(buf.get(1, 1).shade).toBe(3);
    expect(buf.get(1, 0).shade).toBe(3);
    expect(buf.get(3, 1).shade).toBe(3);
  });
  it('q34 headAccRising swaps on q34 frames whose head rises (same head view); others match the plain body', () => {
    const q = q34Of(DUMMY_A);
    const rising: Body = { ...DUMMY_A, views: { q34: { ...q, masks: { ...q.masks, headAccRising: RISING } } } };
    const r = createRigRenderer(DUMMY_A);
    let swapped = 0;
    walk.frames.forEach((_, f) => {
      const prev = (f + walk.frames.length - 1) % walk.frames.length;
      const rises = r.fxAnchor(walk, f)[1] < r.fxAnchor(walk, prev)[1];
      if (rises) swapped++;
      expect(same(render(rising, walk, f), render(DUMMY_A, walk, f)), `walk/${String(f)}`).toBe(!rises);
    });
    expect(swapped).toBeGreaterThan(0);
  });
  it('rising edge cases: a loop compares f0 with its last frame; a one-shot f0 and a head-view switch never swap', () => {
    const withRising: Body = { ...DUMMY_A, masks: { ...DUMMY_A.masks, headAccRising: RISING } };
    const r = createRigRenderer(DUMMY_A);
    // A loop rotated so a rising frame is f0: its previous frame is the last one.
    const happy = anim('happy');
    const k = happy.frames.findIndex((_, f) => f > 0 && r.fxAnchor(happy, f)[1] < r.fxAnchor(happy, f - 1)[1]);
    expect(happy.loop && k > 0).toBe(true);
    const loop: RigAnim = { ...happy, frames: [...happy.frames.slice(k), ...happy.frames.slice(0, k)] };
    expect(same(render(withRising, loop, 0), render(DUMMY_A, loop, 0))).toBe(false);
    const startle = anim('startle');
    expect(startle.loop).toBeFalsy();
    expect(same(render(withRising, startle, 0), render(DUMMY_A, startle, 0))).toBe(true);
    // A view switch (as on turn f0 → f1) is never a "rise", even when the joints put the head higher: a 2-frame
    // one-shot whose f1 is happy's rising frame drawn in q34.
    const q = q34Of(DUMMY_A);
    const both: Body = { ...withRising, views: { q34: { ...q, masks: { ...q.masks, headAccRising: RISING } } } };
    const prevFrame = happy.frames[k - 1];
    const riseFrame = happy.frames[k];
    const stride = walk.frames[0]?.parts;
    if (!prevFrame || !riseFrame || !stride) throw new Error('happy / walk frames');
    const switched: RigAnim = {
      ...happy,
      loop: false,
      frames: [
        prevFrame,
        {
          ...riseFrame,
          view: 'q34',
          face: 'neutral',
          parts: { ...riseFrame.parts, armL: stride.armL, armR: stride.armR },
        },
      ],
    };
    expect(r.fxAnchor(switched, 1)[1]).toBeLessThan(r.fxAnchor(switched, 0)[1]);
    expect(same(render(both, switched, 1), render(DUMMY_A, switched, 1))).toBe(true);
  });
  it('hat bounds: a hat leaving the frame sideways throws; a too-tall hat names HAT_MAX.h', () => {
    const HAT = Array.from({ length: 6 }, () => 'D'.repeat(20));
    const hatBody = (mask: readonly string[], at: [number, number]): Body => ({
      ...DUMMY_A,
      variants: { ...DUMMY_A.variants, headAcc: 'hat' },
      masks: { ...DUMMY_A.masks, headAcc: { mask, at } },
      views: { q34: { ...q34Of(DUMMY_A), masks: { ...q34Of(DUMMY_A).masks, headAcc: { mask, at } } } },
    });
    expect(() => createRigPack(hatBody(HAT, [-28, -4]), ANIMS)).toThrow(/leave the frame/);
    expect(() => createRigPack(hatBody(HAT, [12, -4]), ANIMS)).toThrow(/leave the frame/);
    const tall = Array.from({ length: HAT_MAX.h + 1 }, () => 'D'.repeat(20));
    expect(() => createRigPack(hatBody(tall, [-10, -4]), ANIMS)).toThrow(
      new RegExp(`20 × ${String(HAT_MAX.h + 1)} exceeds ${String(HAT_MAX.w)} × ${String(HAT_MAX.h)}`),
    );
  });
  it('brows may use hair letters over a non-hair head px, never over a hair px', () => {
    const head = { mask: ['SSSS', 'HHHH'], faceAt: [0, 0] as const };
    const browProblems = (y: number): string[] =>
      validateFace({ ...DUMMY_FACE, brows: { b: { mask: ['hh'], at: [1, y] } } }, 'dummy', head).filter((p) =>
        p.includes('brows.b'),
      );
    expect(browProblems(0)).toEqual([]);
    expect(browProblems(1).join()).toMatch(/covers hair/);
  });
});

describe('rig opt-in: skirtSplit.q34 (two leg panels)', () => {
  const base: Body = { ...MAID_PREVIEW, skirtLace: false, skirtSplit: { rows: 6, shade: 0, notch: 3 } };
  const split: Body = {
    ...base,
    skirtSplit: { rows: 6, shade: 0, notch: 3, q34: { rows: 5, notch: 3, passNotch: 2, pleat: 2 } },
  };
  const deep = palette.ramps.get(MAID_PREVIEW.ramps.cloth)?.[0];
  const deepPx = (b: Body, f: number): number => {
    const img = render(b, walk, f);
    return pxOn(img, MAID_PREVIEW.ramps.cloth).filter(([x, y]) => rgb(img, x, y) === deep).length;
  };
  const r = createRigRenderer(base);
  const apart = (f: number): number => {
    const j = r.joints(walk, f);
    return Math.abs(j.footL[0] - j.footR[0]);
  };
  const contact = walk.frames.findIndex((_, f) => apart(f) >= SPLIT_Q34_CONTACT_DX);
  const passing = walk.frames.findIndex((_, f) => apart(f) < SPLIT_Q34_CONTACT_DX);
  it('adds the split line + notch on contact frames and a shorter notch on passing frames; front unchanged', () => {
    expect(contact).toBeGreaterThanOrEqual(0);
    expect(passing).toBeGreaterThanOrEqual(0);
    const gained = (f: number): number => deepPx(split, f) - deepPx(base, f);
    expect(gained(passing)).toBeGreaterThan(0);
    expect(gained(contact)).toBeGreaterThan(gained(passing));
    expect(same(render(split), render(base))).toBe(true);
  });
  it('breaks the contact-frame hem into panels: the hem rows reach 1 px further on both sides', () => {
    const span = (b: Body): number => {
      const px = pxOn(render(b, walk, contact), MAID_PREVIEW.ramps.cloth);
      const low = Math.max(...px.map(([, y]) => y));
      const xs = px.filter(([, y]) => y === low - 1).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(span(split)).toBeGreaterThan(span(base));
  });
  it('fails the build on bad q34 rows / notches', () => {
    const bad = (q34: { rows: number; notch: number; passNotch: number }): Body => ({
      ...base,
      skirtSplit: { rows: 6, shade: 0, q34 },
    });
    expect(() => createRigPack(bad({ rows: 9, notch: 2, passNotch: 1 }), [walk])).toThrow(/skirtSplit.q34/);
    expect(() => createRigPack(bad({ rows: 4, notch: 2, passNotch: 3 }), [walk])).toThrow(/skirtSplit.q34/);
  });
});

describe('opt-in: HeadPlacement.hemTones (stamp toneRows)', () => {
  it('repaints only the slot px of the last rows with the override tones', () => {
    const buf = createIndexBuffer(4, 3, palette);
    const tones = [0, 1, 3, 4, 5, 6] as const;
    stampMask(buf, DUMMY_A, ['jj', 'jj', 'jj'], 0, 0, 1, MAT.hair, new Map(), {
      toneRows: { from: 2, slot: 'hair', tones },
    });
    const own = DUMMY_A.outfit.hair.tones[1];
    expect(buf.shade[0]).toBe(own);
    expect(buf.shade[4]).toBe(own);
    expect(buf.shade[8]).toBe(1);
    expect(own).not.toBe(1);
  });
});

describe('opt-in: Body.greaves (greaveTones)', () => {
  it('keeps each leg row contour, runs the inner px lit → mid → shade, one spec px per leg', () => {
    const buf = createIndexBuffer(12, 4, palette);
    const legs = palette.rampNames.indexOf('metal_silver');
    for (let y = 0; y < 4; y++)
      for (const x0 of [0, 6])
        for (let x = x0; x < x0 + 5; x++)
          buf.set(x, y, { ramp: 'metal_silver', shade: 2, material: MAT.fur, partId: PART_ID.legs });
    greaveTones(buf, legs, { lit: 5, mid: 4, shade: 3, spec: 6 });
    const row = (y: number, x0: number): number[] => [0, 1, 2, 3, 4].map((d) => buf.shade[y * 12 + x0 + d] ?? -1);
    expect(row(0, 0)).toEqual([2, 6, 4, 3, 2]);
    expect(row(0, 6)).toEqual([2, 6, 4, 3, 2]);
    for (let y = 1; y < 4; y++) expect(row(y, 0)).toEqual([2, 5, 4, 3, 2]);
  });
});
