// M-ART D-19 MA-45 (ADR 011): the 16 shared animations re-posed on the adult layout — per-layout pose tables (legacy
// untouched), the adult walk (16-px stride, planted stance foot sliding at `WALK_TRAVEL.adult`, steady head, bob,
// female hip sway, far limbs darker), seated / sleep legs and knees, the headroom gate on every adult frame, adult
// arm variants (front + q34), q34 contour rules, knee creases, the female head and a hip prop on an adult body.
import { describe, expect, it } from 'vitest';
import { elbowOf, kneeOf, resolveJoints } from '../../../assets-src/rig/body.ts';
import { buildLegs } from '../../../assets-src/rig/chains.ts';
import { createRigRenderer } from '../../../assets-src/rig/compose.ts';
import {
  ADULT_FACE,
  ADULT_HEAD,
  ADULT_HEAD_FEMALE,
  ADULT_FEMALE,
  ADULT_MALE,
} from '../../../assets-src/rig/dummies-adult.ts';
import { DUMMY_A } from '../../../assets-src/rig/dummies.ts';
import { validateFace } from '../../../assets-src/rig/face.ts';
import { layoutOf } from '../../../assets-src/rig/layout.ts';
import { ARM_LABEL } from '../../../assets-src/rig/part-ids.ts';
import {
  ADULT_HIP_SWAY,
  ADULT_STRIDE_SLIDE,
  ANIMS_ADULT,
  ANIMS_ADULT_FEMALE,
  animsFor,
} from '../../../assets-src/rig/anims/adult.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { frame } from '../../../assets-src/rig/anims/kit.ts';
import type { ArmVariant, Body, RigAnim } from '../../../assets-src/rig/types.ts';
import type { Point } from '../../../assets-src/lib/chain.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';
import { WALK_TRAVEL } from '../../../src/content/stage.ts';

const ctx = renderContext(loadMasterPalette());
const BODIES = [ADULT_MALE, ADULT_FEMALE] as const;
const opaque = (img: RgbaImage, x: number, y: number): boolean => (img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0;
const rows = (img: RgbaImage): [number, number] => {
  let top = img.height;
  let bottom = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!opaque(img, x, y)) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return [top, bottom];
};
const animOf = (body: Body, name: string): RigAnim => {
  const a = animsFor(body).find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const bend = (a: Point, joint: Point, b: Point): number => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return Math.abs(dx * (a[1] - joint[1]) - dy * (a[0] - joint[0])) / Math.hypot(dx, dy);
};
const len = (a: Point, b: Point): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

describe('per-layout pose tables', () => {
  it('legacy bodies keep the legacy tables; adult builds get theirs', () => {
    expect(animsFor(DUMMY_A)).toBe(ANIMS);
    expect(animsFor(ADULT_MALE)).toBe(ANIMS_ADULT);
    expect(animsFor(ADULT_FEMALE)).toBe(ANIMS_ADULT_FEMALE);
  });
  it('keeps the 16 names, fps, loop, anchor and frame counts', () => {
    const shape = (list: readonly RigAnim[]) =>
      list.map((a) => [a.name, a.fps, a.loop, a.anchor ?? '', a.frames.length].join('/'));
    expect(shape(ANIMS_ADULT)).toEqual(shape(ANIMS));
    expect(shape(ANIMS_ADULT_FEMALE)).toEqual(shape(ANIMS));
    expect(ANIMS_ADULT).toHaveLength(16);
  });
  it('re-poses walk, sit_edge, sleep and drag on the adult layout (frames differ from legacy)', () => {
    for (const name of ['walk', 'sit_edge', 'sleep', 'drag']) {
      expect(animOf(ADULT_MALE, name).frames).not.toEqual(animOf(DUMMY_A, name).frames);
    }
  });
});

describe('adult walk (MA-45)', () => {
  for (const body of BODIES) {
    describe(body.id, () => {
      const walk = animOf(body, 'walk');
      const r = createRigRenderer(body);
      const js = walk.frames.map((_, f) => r.joints(walk, f));
      const restY = layoutOf(body).restQ34.footL[1];
      const at = <T>(list: readonly T[], i: number): T => list[(i + list.length) % list.length] as T;

      it('is 8 q34 frames at the adult travel fps', () => {
        expect(walk.frames).toHaveLength(8);
        expect(walk.frames.every((f) => f.view === 'q34')).toBe(true);
        expect(walk.fps).toBe(WALK_TRAVEL.adult.fps);
        expect(WALK_TRAVEL.adult.pxPerSecond).toBe(WALK_TRAVEL.adult.pxPerFrame * walk.fps);
      });

      it('has a 14–16 px contact stride', () => {
        const stride = Math.abs((js[0]?.footL[0] ?? 0) - (js[0]?.footR[0] ?? 0));
        expect(stride).toBeGreaterThanOrEqual(14);
        expect(stride).toBeLessThanOrEqual(16);
      });

      it('plants the stance foot for 5 frames, sliding back evenly at WALK_TRAVEL.adult.pxPerFrame', () => {
        expect(ADULT_STRIDE_SLIDE).toBe(WALK_TRAVEL.adult.pxPerFrame);
        for (const [foot, start] of [
          ['footL', 0],
          ['footR', 4],
        ] as const) {
          for (let k = 0; k < 5; k++) expect(at(js, start + k)[foot][1], `${foot}/${String(k)}`).toBe(restY);
          for (let k = 0; k < 4; k++) {
            const step = at(js, start + k)[foot][0] - at(js, start + k + 1)[foot][0];
            expect(step, `${foot} slide ${String(k)}`).toBe(WALK_TRAVEL.adult.pxPerFrame);
          }
          // The swing foot lifts off the ground (2–3 px).
          const lift = Math.max(...[5, 6, 7].map((k) => restY - at(js, start + k)[foot][1]));
          expect(lift).toBeGreaterThanOrEqual(2);
          expect(lift).toBeLessThanOrEqual(3);
        }
      });

      it('keeps the root still sideways and bobs 1–2 px; the head never moves more than 1 px a frame', () => {
        expect(walk.frames.every((f) => f.root.dx === 0)).toBe(true);
        const hipY = js.map((j) => j.hip[1]);
        const range = Math.max(...hipY) - Math.min(...hipY);
        expect(range).toBeGreaterThanOrEqual(1);
        expect(range).toBeLessThanOrEqual(2);
        js.forEach((j, f) => {
          expect(Math.abs(j.head[1] - at(js, f - 1).head[1])).toBeLessThanOrEqual(1);
        });
      });

      if (body.build === 'male') {
        it('keeps head x − hip x constant and the hip on the axis', () => {
          for (const j of js) {
            expect(j.head[0] - j.hip[0]).toBe(-1);
            expect(j.hip[0]).toBe(28);
          }
        });
      } else {
        it('sways the hip 1 px under a steady upper body (head and chest x constant)', () => {
          expect(js.map((j) => j.hip[0] - 28)).toEqual([...ADULT_HIP_SWAY]);
          for (const j of js) {
            expect(j.head[0]).toBe(27);
            expect(j.chest[0]).toBe(28);
          }
        });
      }

      it('bends the swing knee forward more than the planted one', () => {
        const L = layoutOf(body);
        const fwd = (f: number, side: 'L' | 'R'): number => {
          const j = at(js, f);
          const knee = kneeOf(j, side, 'stand', 'q34', L) ?? [0, 0];
          const foot = j[side === 'L' ? 'footL' : 'footR'];
          return knee[0] - (j.hip[0] + foot[0]) / 2;
        };
        // Frame 6: L swings through (lifted), R is planted.
        expect(fwd(6, 'L')).toBeGreaterThan(fwd(6, 'R') + 2);
      });

      it('draws the far arm one ramp step darker than the near arm', () => {
        const { image, labels } = r.renderLabeled(walk, 3, ctx);
        const lum = (label: number): number[] => {
          const out: number[] = [];
          for (let i = 0; i < labels.data.length; i += 4) {
            if (labels.data[i] !== label || !image.data[i + 3]) continue;
            out.push((image.data[i] ?? 0) + (image.data[i + 1] ?? 0) + (image.data[i + 2] ?? 0));
          }
          return out.sort((a, b) => a - b);
        };
        const median = (xs: number[]): number => xs[Math.floor(xs.length / 2)] ?? 0;
        const far = lum(ARM_LABEL.sleeveR);
        const near = lum(ARM_LABEL.sleeveL);
        expect(far.length).toBeGreaterThan(0);
        expect(median(far)).toBeLessThan(median(near));
      });

      it('q34 contour: the head overhangs the torso front by ≤ its back overhang + 4 px; near arm in front', () => {
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
                lo = Math.min(lo, x);
                hi = Math.max(hi, x);
              }
            }
            return [lo, hi];
          };
          const head = ext(Math.round(j.head[1]) - 6, Math.round(j.head[1]) + 7, false);
          const torso = ext(Math.round(j.chest[1]), Math.round(j.hip[1]) - 1, true);
          expect(head[1] - torso[1], `walk/${String(f)}`).toBeLessThanOrEqual(torso[0] - head[0] + 4);
          // Near arm in front of the torso; the far hand peeks out past it on its forward swing.
          const near = labels.data[(Math.round(j.shoulderL[1] + 1) * image.width + Math.round(j.shoulderL[0])) * 4];
          expect([ARM_LABEL.sleeveL, ARM_LABEL.endL], `near shoulder ${String(f)}`).toContain(near);
        });
      });
    });
  }
});

describe('adult seated legs (sit_edge, sleep)', () => {
  for (const body of BODIES) {
    for (const name of ['sit_edge', 'sleep']) {
      it(`${body.id}/${name}: knees on the seat row, feet hanging a shin below, everything inside the frame`, () => {
        const a = animOf(body, name);
        const r = createRigRenderer(body);
        const L = layoutOf(body);
        a.frames.forEach((p, f) => {
          const j = r.joints(a, f);
          for (const side of ['L', 'R'] as const) {
            const knee = kneeOf(j, side, 'sit', 'front', L) ?? [0, 0];
            const foot = j[side === 'L' ? 'footL' : 'footR'];
            expect(Math.abs(knee[1] - j.seat[1]), `${name}/${String(f)} knee row`).toBeLessThanOrEqual(1);
            expect(foot[1] - knee[1], `${name}/${String(f)} shin`).toBeGreaterThanOrEqual(12);
            expect(knee[0]).toBeGreaterThan(0);
            expect(knee[0]).toBeLessThan(L.w);
          }
          expect(p.parts.legs).toBe('sit');
          const [top, bottom] = rows(r.render(a, f, ctx));
          expect(top).toBeGreaterThanOrEqual(2);
          expect(bottom).toBeLessThanOrEqual(L.frameH - 2);
        });
      });
    }
  }
  it('sleep is a seated doze (no curled legs anywhere in the adult tables)', () => {
    for (const list of [ANIMS_ADULT, ANIMS_ADULT_FEMALE]) {
      expect(list.flatMap((a) => a.frames).some((p) => p.parts.legs === 'curl')).toBe(false);
    }
  });
  it('creases the folded adult knees (front: both, q34: the near one); standing knees get none', () => {
    const knees = (legs: 'sit' | 'stand', q: boolean): number => {
      const p = frame({ legs, view: q ? 'q34' : 'front' });
      return buildLegs(ADULT_MALE, p, resolveJoints(ADULT_MALE, p, 72), q, undefined).knees.length;
    };
    expect([knees('sit', false), knees('sit', true), knees('stand', false), knees('stand', true)]).toEqual([
      2, 1, 0, 0,
    ]);
  });
});

describe('adult headroom gate (every frame of every anim)', () => {
  for (const body of BODIES) {
    it(`${body.id}: row 0 and row 1 clear, the soles inside the frame`, () => {
      const r = createRigRenderer(body);
      for (const a of animsFor(body)) {
        a.frames.forEach((_, f) => {
          const [top, bottom] = rows(r.render(a, f, ctx));
          expect(top, `${a.name}/${String(f)}`).toBeGreaterThanOrEqual(2);
          expect(bottom, `${a.name}/${String(f)}`).toBeLessThanOrEqual(71);
        });
      }
    });
  }
});

describe('adult arm variants (front + q34)', () => {
  const FRONT = Object.keys(layoutOf(ADULT_MALE).arms) as ArmVariant[];
  const Q34 = Object.keys(layoutOf(ADULT_MALE).armsQ34) as ArmVariant[];
  it('provides the q34 seated / think variants (edge, limp, chin)', () => {
    expect(Q34).toEqual(expect.arrayContaining(['down', 'swing_fwd', 'swing_back', 'edge', 'limp', 'chin']));
  });
  for (const body of BODIES) {
    it(`${body.id}: every variant bends at the elbow, keeps segment lengths and stays inside the frame`, () => {
      const L = layoutOf(body);
      const cases = [...FRONT.map((a) => [a, 'front'] as const), ...Q34.map((a) => [a, 'q34'] as const)];
      for (const [arm, view] of cases) {
        const j = resolveJoints(body, frame({ arms: arm, view }), L.frameH, view);
        for (const side of view === 'q34' ? (['L'] as const) : (['L', 'R'] as const)) {
          const s = j[side === 'L' ? 'shoulderL' : 'shoulderR'];
          const h = j[side === 'L' ? 'handL' : 'handR'];
          const e = elbowOf(j, side, arm, view, L);
          const tag = `${arm}/${view}/${side}`;
          expect(bend(s, e, h), tag).toBeGreaterThanOrEqual(0.5);
          expect(len(s, e), tag).toBeLessThanOrEqual(10.5);
          expect(len(e, h), tag).toBeLessThanOrEqual(11);
          for (const [x, y] of [e, h]) {
            expect(x, tag).toBeGreaterThanOrEqual(2);
            expect(x, tag).toBeLessThanOrEqual(L.w - 2);
            expect(y, tag).toBeGreaterThanOrEqual(2);
            expect(y, tag).toBeLessThanOrEqual(L.frameH - 2);
          }
        }
      }
    });
  }
  it('think: the chin elbow rests on the folded forearm and the fist sits under the chin', () => {
    const think = animOf(ADULT_MALE, 'think');
    const j = createRigRenderer(ADULT_MALE).joints(think, 0);
    const L = layoutOf(ADULT_MALE);
    const elbow = elbowOf(j, 'R', 'chin', 'front', L);
    expect(Math.abs(elbow[0] - j.handL[0])).toBeLessThanOrEqual(3);
    expect(Math.abs(elbow[1] - j.handL[1])).toBeLessThanOrEqual(2);
    expect(j.handR[1]).toBeGreaterThan(j.head[1] + 7);
    expect(Math.abs(j.handR[0] - j.head[0])).toBeLessThanOrEqual(4);
  });
});

describe('adult body variety (MA-45)', () => {
  it('gives the female its own head with a narrower jaw that passes the adult face rules', () => {
    expect(ADULT_FEMALE.head.mask).toBe(ADULT_HEAD_FEMALE);
    const skin = (row: string): number => row.replace(/[^sSeEz]/g, '').length;
    for (let y = 10; y < ADULT_HEAD.length; y++) {
      expect(skin(ADULT_HEAD_FEMALE[y] ?? ''), `row ${String(y)}`).toBeLessThan(skin(ADULT_HEAD[y] ?? ''));
    }
    expect(ADULT_HEAD_FEMALE.slice(0, 10)).toEqual(ADULT_HEAD.slice(0, 10));
    const rules = layoutOf(ADULT_FEMALE).face;
    expect(validateFace(ADULT_FACE, 'f', { mask: ADULT_HEAD_FEMALE, faceAt: [2, 4] }, undefined, rules)).toEqual([]);
  });
  it('draws a hip prop on the adult male (front and q34)', () => {
    const q34 = ADULT_MALE.views?.q34;
    if (!q34) throw new Error('q34 view');
    const strip = <T extends object>(v: T): T =>
      // Object.fromEntries loses the record type; the copy has the same keys minus the optional `prop`.
      Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'prop')) as unknown as T;
    const bare: Body = { ...strip(ADULT_MALE), views: { q34: strip(q34) } };
    for (const name of ['idle_a', 'walk']) {
      const a = animOf(ADULT_MALE, name);
      const withProp = createRigRenderer(ADULT_MALE).render(a, 0, ctx);
      const without = createRigRenderer(bare).render(a, 0, ctx);
      expect(Buffer.from(withProp.data).equals(Buffer.from(without.data)), name).toBe(false);
    }
  });
});
