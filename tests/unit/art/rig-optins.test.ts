// Behaviour of the rig's per-body opt-ins on the dummy bodies and small hand-built inputs (not through a character
// pack): each test fails when the opt-in's code is removed.
import { describe, expect, it } from 'vitest';
import { createIndexBuffer, type RampName } from '../../../assets-src/lib/buffer.ts';
import { LEGEND } from '../../../assets-src/lib/mask.ts';
import { MAT } from '../../../assets-src/lib/materials.ts';
import { outline } from '../../../assets-src/lib/passes.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { buildShorts, buildTorso, leanLock } from '../../../assets-src/rig/chains.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_A, DUMMY_B, MAID_PREVIEW } from '../../../assets-src/rig/dummies.ts';
import { ARM_LABEL, PART_ID } from '../../../assets-src/rig/part-ids.ts';
import { farLegGap, silhouetteOutline, squashSeparator, type Locked } from '../../../assets-src/rig/passes.ts';
import type { Body, RigAnim } from '../../../assets-src/rig/types.ts';
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
