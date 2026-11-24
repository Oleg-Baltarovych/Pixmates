// M-ART D-19 MA-42…MA-44 (ADR 011): the adult 56 × 72 rig layout on the adult dummies — rest proportions (heads,
// legs, shoulders vs head, hands at mid-thigh), headroom, two-segment arms and legs, the female waist, the q34 rest
// rules, mirror exactness, seams, determinism, the adult face rules and the legacy layout left untouched.
import { describe, expect, it } from 'vitest';
import { elbowOf, kneeOf, resolveJoints, REST, REST_Q34 } from '../../../assets-src/rig/body.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import {
  ADULT_FACE,
  ADULT_FACE_Q34,
  ADULT_FEMALE,
  ADULT_HEAD,
  ADULT_MALE,
} from '../../../assets-src/rig/dummies-adult.ts';
import { DUMMY_A, DUMMY_FACE } from '../../../assets-src/rig/dummies.ts';
import { Q34_EXPRESSIONS, validateFace, type FaceLibrary } from '../../../assets-src/rig/face.ts';
import { LAYOUT_ADULT, LAYOUT_LEGACY, layoutOf } from '../../../assets-src/rig/layout.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { frame } from '../../../assets-src/rig/anims/kit.ts';
import type { ArmVariant, Body, LegVariant, RigAnim } from '../../../assets-src/rig/types.ts';
import type { Point } from '../../../assets-src/lib/chain.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { buildPack, loadMasterPalette, mirrorFrame, renderContext } from '../../../tools/lib/sprites.ts';
import { manifestSchema } from '../../../src/shared/pack.ts';

const ctx = renderContext(loadMasterPalette());
/** A copy without one optional key (`exactOptionalPropertyTypes` forbids setting it to undefined). */
function omit<T extends object>(value: T, key: keyof T): T {
  // Object.fromEntries loses the record type; the copy has the same keys minus one optional key.
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== key)) as unknown as T;
}
const BODIES = [ADULT_MALE, ADULT_FEMALE] as const;
const GATED = ['idle_a', 'walk', 'happy'] as const;

const opaque = (img: RgbaImage, x: number, y: number): boolean => (img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0;
const rowSpan = (img: RgbaImage, y: number): number => {
  let lo = img.width;
  let hi = -1;
  for (let x = 0; x < img.width; x++) {
    if (opaque(img, x, y)) {
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return hi < lo ? 0 : hi - lo + 1;
};
const topRow = (img: RgbaImage): number => {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) return y;
  return img.height;
};
const bottomRow = (img: RgbaImage): number => {
  for (let y = img.height - 1; y >= 0; y--) for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) return y;
  return -1;
};
const still = (f = frame({})): RigAnim => ({ name: 'still', fps: 1, loop: true, frames: [f] });
const renderStill = (body: Body, f = frame({})): RgbaImage => createRigRenderer(body).render(still(f), 0, ctx);

/** Distance of the elbow (knee) from the straight shoulder → hand (hip → foot) line. */
const bend = (a: Point, joint: Point, b: Point): number => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return Math.abs(dx * (a[1] - joint[1]) - dy * (a[0] - joint[0])) / Math.hypot(dx, dy);
};
const len = (a: Point, b: Point): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Enclosed transparent regions (4-connected, not touching the border). */
function holes(img: RgbaImage): number[] {
  const seen = new Uint8Array(img.width * img.height);
  const sizes: number[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] === 1 || opaque(img, start % img.width, Math.floor(start / img.width))) continue;
    const stack = [start];
    seen[start] = 1;
    let size = 0;
    let border = false;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      const x = i % img.width;
      const y = Math.floor(i / img.width);
      size++;
      if (x === 0 || y === 0 || x === img.width - 1 || y === img.height - 1) border = true;
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const) {
        if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height) continue;
        const n = ny * img.width + nx;
        if (seen[n] === 1 || opaque(img, nx, ny)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (!border) sizes.push(size);
  }
  return sizes;
}

describe('adult layout (MA-42 rest, frame, scaleRef)', () => {
  const built = BODIES.map((b) => ({ body: b, pack: buildPack(createRigPack(b, ANIMS), ctx) }));

  it('emits a 56 × 72 manifest with scaleRef 66; legacy bodies keep 48 × 56 / 48', () => {
    for (const { pack } of built) {
      const m = manifestSchema.parse(pack.manifest);
      expect(m.frameSize).toEqual({ w: 56, h: 72 });
      expect(m.scaleRef).toBe(66);
    }
    expect(layoutOf(DUMMY_A)).toBe(LAYOUT_LEGACY);
    expect(LAYOUT_LEGACY.rest).toBe(REST);
    expect(LAYOUT_LEGACY.restQ34).toBe(REST_Q34);
    expect([LAYOUT_LEGACY.w, LAYOUT_LEGACY.frameH, LAYOUT_LEGACY.scaleRef]).toEqual([48, 56, 48]);
  });

  it('keeps row 0 clear in every idle_a / walk / happy frame (top margin ≥ 2 rows at the happy apex)', () => {
    for (const { body, pack } of built) {
      for (const name of GATED) {
        (pack.frames.get(name) ?? []).forEach((img, f) => {
          expect(topRow(img), `${body.id}/${name}/${String(f)}`).toBeGreaterThanOrEqual(2);
        });
      }
    }
  });

  for (const body of BODIES) {
    describe(body.id, () => {
      const L = layoutOf(body);
      const img = renderStill(body);
      const j = resolveJoints(body, frame({}), L.frameH);
      const top = topRow(img);
      const sole = bottomRow(img);
      const height = sole - top + 1;
      const headRows = ADULT_HEAD.length;

      it('stands ≈ 4.4 heads tall (4.2–4.6), soles on row 70', () => {
        expect(sole).toBe(70);
        expect(height / headRows).toBeGreaterThanOrEqual(4.2);
        expect(height / headRows).toBeLessThanOrEqual(4.6);
      });

      it('has legs ≥ 40 % of the height (hip joint → sole)', () => {
        expect((sole + 1 - j.hip[1]) / height).toBeGreaterThanOrEqual(0.4);
      });

      it('has shoulders wider than the head (male ≥ 1.4×, female ≥ 1.15×)', () => {
        const headW = Math.max(...Array.from({ length: headRows - 2 }, (_, r) => rowSpan(img, top + r)));
        const shoulderW = rowSpan(img, Math.round(j.shoulderL[1]));
        expect(shoulderW / headW).toBeGreaterThanOrEqual(body.build === 'male' ? 1.4 : 1.15);
      });

      it('rests the hands at mid-thigh (below the hip + 3, above the knee)', () => {
        const knee = kneeOf(j, 'L', 'stand', 'front', L);
        expect(knee).toBeDefined();
        for (const hand of [j.handL, j.handR]) {
          expect(hand[1]).toBeGreaterThanOrEqual(j.hip[1] + 3);
          expect(hand[1]).toBeLessThan(knee?.[1] ?? 0);
        }
      });

      it('is mirror-exact: the front rest is symmetric about x = w / 2 and the mirror is an involution', () => {
        expect(j.hip[0]).toBe(L.w / 2);
        expect(j.shoulderL[0] + j.shoulderR[0]).toBe(L.w);
        expect(j.footL[0] + j.footR[0]).toBe(L.w);
        expect(j.handL[0] + j.handR[0]).toBeCloseTo(L.w, 9);
        expect(mirrorFrame(mirrorFrame(img))).toEqual(img);
      });

      it('leaves no 1–2 px seam holes in idle_a / walk / happy', () => {
        const pack = built.find((b) => b.body === body)?.pack;
        for (const name of GATED) {
          (pack?.frames.get(name) ?? []).forEach((f, i) => {
            expect(
              holes(f).filter((s) => s <= 2),
              `${name}/${String(i)}`,
            ).toEqual([]);
          });
        }
      });
    });
  }

  it('is deterministic (same atlas bytes on a second build)', () => {
    for (const { body, pack } of built) {
      const again = buildPack(createRigPack(body, ANIMS), ctx);
      expect(again.sha256).toBe(pack.sha256);
    }
  });
});

describe('adult q34 rest (ADR 010 rules on the adult layout)', () => {
  for (const build of ['male', 'female'] as const) {
    it(`${build}: steady head 1 px behind the hip, face +1, shoulders −1 / −2 +1, tail −2, feet on one row`, () => {
      const { rest, restQ34: q } = LAYOUT_ADULT[build];
      expect(q.head[0] - q.hip[0]).toBe(-1);
      expect(q.face[0] - rest.face[0]).toBe(1);
      for (const k of ['root', 'hip', 'chest', 'neck', 'seat'] as const) expect(q[k]).toEqual(rest[k]);
      expect(q.shoulderL[0]).toBe(rest.shoulderL[0] - 1);
      expect(q.shoulderR[0]).toBe(rest.shoulderR[0] - 2);
      expect(q.shoulderR[1]).toBe(rest.shoulderR[1] + 1);
      expect(q.footL[1]).toBe(q.footR[1]);
      expect(q.back[0]).toBe(rest.hip[0] - 2);
    });
  }
  it('keeps the head x − hip x constant in every walk frame', () => {
    const walk = ANIMS.find((a) => a.name === 'walk');
    const r = createRigRenderer(ADULT_MALE);
    walk?.frames.forEach((_, f) => {
      const j = r.joints(walk, f);
      expect(j.head[0] - j.hip[0]).toBe(-1);
      expect(j.hip[0]).toBe(28);
    });
  });
});

describe('two-segment limbs (MA-43)', () => {
  const FRONT_BENT: readonly ArmVariant[] = [
    'down',
    'swing_fwd',
    'swing_back',
    'fold',
    'chest',
    'wave_a',
    'wave_b',
    'hang',
  ];
  for (const body of BODIES) {
    const L = layoutOf(body);
    it(`${body.id}: the elbow bends (≥ 0.5 px off the line) with upper arm ≤ 10.5, forearm ≤ 11`, () => {
      const cases: [ArmVariant, 'front' | 'q34'][] = [
        ...FRONT_BENT.map((a): [ArmVariant, 'front'] => [a, 'front']),
        ...(['down', 'swing_fwd', 'swing_back'] as const).map((a): [ArmVariant, 'q34'] => [a, 'q34']),
      ];
      for (const [arm, view] of cases) {
        const j = resolveJoints(body, frame({ arms: arm, view }), L.frameH, view);
        for (const side of ['L', 'R'] as const) {
          const s = j[side === 'L' ? 'shoulderL' : 'shoulderR'];
          const h = j[side === 'L' ? 'handL' : 'handR'];
          const e = elbowOf(j, side, arm, view, L);
          expect(bend(s, e, h), `${arm}/${view}/${side}`).toBeGreaterThanOrEqual(0.5);
          expect(len(s, e), `${arm} upper`).toBeLessThanOrEqual(10.5);
          expect(len(e, h), `${arm} fore`).toBeLessThanOrEqual(11);
        }
      }
    });
    it(`${body.id}: the knee bends in the seated / hanging / curled legs and the q34 stance`, () => {
      const cases: [LegVariant, 'front' | 'q34'][] = [
        ['sit', 'front'],
        ['dangle', 'front'],
        ['curl', 'front'],
        ['sit', 'q34'],
        ['stand', 'q34'],
      ];
      for (const [legs, view] of cases) {
        const j = resolveJoints(body, frame({ legs, view }), L.frameH, view);
        for (const side of ['L', 'R'] as const) {
          const sx = side === 'L' ? -1 : 1;
          const top: Point = [j.hip[0] + sx * (view === 'q34' ? L.torso.leg.dxQ : L.torso.leg.dx), j.hip[1]];
          const knee = kneeOf(j, side, legs, view, L);
          expect(knee).toBeDefined();
          if (knee)
            expect(bend(top, knee, j[side === 'L' ? 'footL' : 'footR']), `${legs}/${view}`).toBeGreaterThanOrEqual(0.5);
        }
      }
    });
  }
  it('legacy layouts have no knees (their legs are one stroke)', () => {
    const j = resolveJoints(DUMMY_A, frame({}), LAYOUT_LEGACY.frameH);
    expect(kneeOf(j, 'L', 'stand', 'front', LAYOUT_LEGACY)).toBeUndefined();
  });
});

describe('build presets (MA-43)', () => {
  const up = frame({ arms: 'up' });
  // Silhouette widths without the parts that hang behind the torso (long back hair, cloak).
  const FEMALE_BARE: Body = {
    ...ADULT_FEMALE,
    variants: { ...ADULT_FEMALE.variants, hairBack: 'short' },
    hairBackStretch: 0.3,
  };
  const MALE_BARE: Body = omit({ ...ADULT_MALE, variants: { ...ADULT_MALE.variants, back: 'none' } }, 'cloak');
  const span = (body: Body, dy: number): number => {
    const j = resolveJoints(body, up, 72);
    return rowSpan(renderStill(body, up), Math.round(j.hip[1] + dy));
  };
  it('pinches the female waist ≥ 3 px under the chest and the hip', () => {
    const L = layoutOf(ADULT_FEMALE);
    const chest = span(FEMALE_BARE, L.rest.chest[1] - L.rest.hip[1]);
    const waist = span(FEMALE_BARE, L.torso.bodiceEnd.skirt);
    const hip = span(FEMALE_BARE, 0);
    expect(waist).toBeLessThanOrEqual(chest - 3);
    expect(waist).toBeLessThanOrEqual(hip - 3);
  });
  it('gives the male a V taper (chest wider than the waist) and wider shoulders, neck and stance than the female', () => {
    const L = layoutOf(ADULT_MALE);
    expect(span(MALE_BARE, L.rest.chest[1] - L.rest.hip[1])).toBeGreaterThan(span(MALE_BARE, -6));
    const [m, f] = [LAYOUT_ADULT.male, LAYOUT_ADULT.female];
    expect(m.rest.shoulderR[0] - m.rest.shoulderL[0]).toBeGreaterThan(f.rest.shoulderR[0] - f.rest.shoulderL[0]);
    expect(m.torso.neck.w).toBeGreaterThan(f.torso.neck.w);
    expect(m.rest.footR[0] - m.rest.footL[0]).toBeGreaterThan(f.rest.footR[0] - f.rest.footL[0]);
    expect(f.rest.hip[1]).toBeLessThan(m.rest.hip[1]);
  });
  it('rejects an adult body without a build and a legacy body with one', () => {
    expect(() => createRigPack(omit(ADULT_MALE, 'build'), ANIMS)).toThrow(/needs Body.build/);
    expect(() => createRigPack({ ...DUMMY_A, build: 'male' }, ANIMS)).toThrow(/needs layout 'adult'/);
  });
});

describe('adult face library (MA-44)', () => {
  const rules = LAYOUT_ADULT.male.face;
  const head = { mask: ADULT_HEAD, faceAt: [2, 4] as Point };
  it('passes the adult rules front (all expressions) and q34 (neutral + blink)', () => {
    expect(validateFace(ADULT_FACE, 'adult', head, undefined, rules)).toEqual([]);
    expect(validateFace(ADULT_FACE_Q34, 'adult/q34', undefined, Q34_EXPRESSIONS, rules)).toEqual([]);
  });
  const fails = (lib: FaceLibrary, re: RegExp): void => {
    expect(validateFace(lib, 'x', head, undefined, rules).join('\n')).toMatch(re);
  };
  it('fails 4-row eyes, a missing nose, blush outside petted, missing brows and a jawless head', () => {
    const tall = ['.xXXX..XXXx.', '.pKcX..XcKp.', '.pKcX..XcKp.', '..ic....ci..'];
    fails({ ...ADULT_FACE, eyes: { ...ADULT_FACE.eyes, open: { mask: tall, at: [0, 3] } } }, /adult eyes are ≤ 3/);
    fails(omit(ADULT_FACE, 'nose'), /nose/);
    fails(
      {
        ...ADULT_FACE,
        expressions: {
          ...ADULT_FACE.expressions,
          neutral: { eyes: 'open', brows: 'flat', mouth: 'smile', cheeks: 'blush' },
        },
      },
      /blush only on petted/,
    );
    fails(
      {
        ...ADULT_FACE,
        expressions: { ...ADULT_FACE.expressions, neutral: { eyes: 'open', mouth: 'smile', cheeks: 'none' } },
      },
      /need brows/,
    );
    const square = ADULT_HEAD.map((r, y) => (y === ADULT_HEAD.length - 1 ? '.eeeeeeeeeeeeee.' : r));
    expect(validateFace(ADULT_FACE, 'x', { mask: square, faceAt: [2, 4] }, undefined, rules).join()).toMatch(/jaw/);
  });
  it('a legacy chibi face fails the adult rules (eyes, nose, brows)', () => {
    expect(validateFace(DUMMY_FACE, 'chibi', undefined, undefined, rules).join('\n')).toMatch(/adult eyes|nose|brows/);
  });
});
