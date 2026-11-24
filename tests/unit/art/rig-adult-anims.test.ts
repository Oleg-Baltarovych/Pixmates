// M-ART D-19 MA-45 (ADR 011): the 16 shared animations re-posed on the adult layout — per-layout pose tables (legacy
// untouched), the adult walk (16-px stride, planted stance foot sliding at `WALK_TRAVEL.adult`, steady head, bob,
// female hip sway, far limbs darker), seated / sleep legs and knees, the headroom gate on every adult frame, adult
// arm variants (front + q34), q34 contour rules, knee creases, the female head and a hip prop on an adult body.
import { describe, expect, it } from 'vitest';
import { elbowOf, kneeOf, resolveJoints } from '../../../assets-src/rig/body.ts';
import { buildLegs } from '../../../assets-src/rig/chains.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import {
  ADULT_FACE,
  ADULT_HEAD,
  ADULT_HEAD_FEMALE,
  ADULT_FEMALE,
  ADULT_MALE,
  adultSword,
  adultSwordQ34,
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
import type { ArmVariant, Body, Prop, RigAnim } from '../../../assets-src/rig/types.ts';
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
  it('think: the chin fist on the side without the prop, forearm vertical, elbow on the folded forearm', () => {
    const think = animOf(ADULT_MALE, 'think');
    const j = createRigRenderer(ADULT_MALE).joints(think, 0);
    const L = layoutOf(ADULT_MALE);
    expect(think.frames.every((f) => f.parts.armL === 'chin' && f.parts.armR === 'fold')).toBe(true);
    // The prop hilt hangs on the right hip (its mask reaches right of the axis): the fist is on the left.
    const prop = ADULT_MALE.prop;
    expect((prop?.at[0] ?? 0) + (prop?.mask[0]?.length ?? 0)).toBeGreaterThan(0);
    const elbow = elbowOf(j, 'L', 'chin', 'front', L);
    expect(Math.abs(elbow[0] - j.handL[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(elbow[0] - j.handR[0])).toBeLessThanOrEqual(2);
    expect(Math.abs(elbow[1] - j.handR[1])).toBeLessThanOrEqual(2);
    expect(j.handL[1]).toBeLessThanOrEqual(22);
    expect(j.head[0]).toBe(27);
  });
});

describe('art-director round 1 poses (MA-45)', () => {
  const js = (body: Body, name: string) => {
    const a = animOf(body, name);
    const r = createRigRenderer(body);
    return a.frames.map((_, f) => r.joints(a, f));
  };
  const kneeAt = (body: Body, name: string, f: number, side: 'L' | 'R'): Point => {
    const a = animOf(body, name);
    const p = a.frames[f] ?? frame({});
    const j = createRigRenderer(body).joints(a, f);
    return kneeOf(j, side, p.parts.legs, p.view ?? 'front', layoutOf(body), p.knees?.[side]) ?? [0, 0];
  };
  it('sit_edge / sleep: male knees ±5, feet ±7, near foot lower; female knees ±6, ankles meeting', () => {
    for (const name of ['sit_edge', 'sleep']) {
      const m = js(ADULT_MALE, name)[0];
      expect(Math.round(kneeAt(ADULT_MALE, name, 0, 'L')[0])).toBe(23);
      expect(Math.round(kneeAt(ADULT_MALE, name, 0, 'R')[0])).toBe(33);
      expect([m?.footL[0], m?.footR[0]]).toEqual([21, 35]);
      const f = js(ADULT_FEMALE, name)[0];
      expect(Math.round(kneeAt(ADULT_FEMALE, name, 0, 'L')[0])).toBe(22);
      expect(Math.round(kneeAt(ADULT_FEMALE, name, 0, 'R')[0])).toBe(34);
      expect([f?.footL[0], f?.footR[0]]).toEqual([27.5, 28.5]);
      expect((f?.footL[1] ?? 0) - (f?.footR[1] ?? 0)).toBeGreaterThanOrEqual(1);
    }
    expect(js(ADULT_MALE, 'sleep').every((j) => j.footL[1] - j.footR[1] === 2)).toBe(true);
  });
  it('sleep: the head bowed o(2, 3) onto the collar, the far hand slid 2 px toward the edge', () => {
    const f = animOf(ADULT_MALE, 'sleep').frames[0];
    expect(f?.joints?.head).toEqual({ dx: 2, dy: 3 });
    expect(f?.joints?.handR).toEqual({ dx: 2, dy: 0 });
  });
  it('happy: a fist pump with no jump (root ≥ −1, feet planted, never both arms up)', () => {
    for (const body of BODIES) {
      const a = animOf(body, 'happy');
      expect(a.frames.every((f) => f.root.dy >= -1 && f.parts.legs === 'stand')).toBe(true);
      expect(a.frames.some((f) => f.parts.armL === 'up' || f.parts.armR === 'up')).toBe(false);
      const pump = js(body, 'happy')[1];
      expect(pump?.handL[1]).toBeGreaterThanOrEqual(12);
      expect(pump?.handL[1]).toBeLessThanOrEqual(16);
      expect(28 - (pump?.handL[0] ?? 0)).toBeGreaterThanOrEqual(11);
      // The crouch bends the knees outward instead of only shortening the legs.
      expect(kneeAt(body, 'happy', 0, 'L')[0]).toBeLessThan(kneeAt(body, 'turn', 0, 'L')[0] - 0.5);
    }
  });
  it('land: hip +3 → +2 → +1 → rest, knees out 2 on impact, arms out low', () => {
    for (const body of BODIES) {
      const hips = js(body, 'land').map((j) => j.hip[1] - layoutOf(body).rest.hip[1]);
      expect(hips).toEqual([3, 2, 1, 0]);
      expect(animOf(body, 'land').frames[0]?.knees).toEqual({ L: { dx: -2, dy: 0 }, R: { dx: 2, dy: 0 } });
      expect(js(body, 'land')[0]?.handL[1]).toBeGreaterThanOrEqual(37);
      expect(js(body, 'land')[0]?.handL[1]).toBeLessThanOrEqual(41);
    }
  });
  it('drag: shoulders −3, head +1, feet 1 row apart with one knee up', () => {
    for (const p of animOf(ADULT_MALE, 'drag').frames) {
      expect(p.joints?.shoulderL?.dy).toBe(-3);
      expect(p.joints?.head?.dy).toBe(1);
      expect(p.knees?.L?.dy).toBe(-2);
    }
    for (const j of js(ADULT_MALE, 'drag')) expect(j.footR[1] - j.footL[1]).toBe(1);
  });
  it('idle_a contrapposto: hip +1, head on the axis, weight foot +5, free foot −8; idle_b shifts over 2 frames', () => {
    for (const body of BODIES) {
      for (const j of js(body, 'idle_a')) {
        expect([j.hip[0], j.head[0], j.footR[0], j.footL[0]]).toEqual([29, 28, 33, 20]);
        expect(j.shoulderL[1]).toBe(j.shoulderR[1] + 1);
      }
      const hips = js(body, 'idle_b').map((j) => j.hip[0] - 28);
      expect(hips.slice(0, 4)).toEqual([1, 1, 0, -1]);
      expect(hips.slice(3).every((h) => h === -1)).toBe(true);
      expect(js(body, 'idle_b').every((j) => j.head[0] === 28)).toBe(true);
    }
  });
  it('walk passing frames: swing foot 2 px behind the planted ankle, lifted 3, its knee ≈ 2 px ahead', () => {
    for (const body of BODIES) {
      const restY = layoutOf(body).restQ34.footL[1];
      const f2 = js(body, 'walk')[2];
      // Frame 2: L planted, R swinging 3 rows above the ground (contact) row.
      expect((f2?.footL[0] ?? 0) - (f2?.footR[0] ?? 0)).toBe(2);
      expect(restY - (f2?.footR[1] ?? 0)).toBe(3);
      const ahead = kneeAt(body, 'walk', 2, 'R')[0] - kneeAt(body, 'walk', 2, 'L')[0];
      expect(ahead).toBeGreaterThanOrEqual(1.5);
      expect(ahead).toBeLessThanOrEqual(2.5);
    }
  });
  it('worried: a hand to the back of the neck (elbow out ≈ ±14, row ≈ 18) and a hand on the hip', () => {
    for (const body of BODIES) {
      const a = animOf(body, 'worried');
      expect(a.frames.every((f) => f.parts.armL === 'neck' && f.parts.armR === 'hip')).toBe(true);
      const j = js(body, 'worried')[0];
      if (!j) throw new Error('frame');
      const e = elbowOf(j, 'L', 'neck', 'front', layoutOf(body));
      expect(Math.abs(e[0] - 28)).toBeGreaterThanOrEqual(12);
      expect(Math.abs(e[1] - 18)).toBeLessThanOrEqual(2);
      expect(Math.abs(j.handR[1] - j.hip[1])).toBeLessThanOrEqual(2);
    }
  });
  it('petted: both arms down, shoulders up 1, head 1 px toward the near side, eyes closed (not worried)', () => {
    for (const body of BODIES) {
      const a = animOf(body, 'petted');
      const r = createRigRenderer(body);
      const rest = r.joints(animOf(body, 'talk'), 0);
      a.frames.forEach((f, i) => {
        expect(f.parts.armL === 'down' && f.parts.armR === 'down' && f.face === 'petted').toBe(true);
        const j = r.joints(a, i);
        expect(j.shoulderL[1] - j.chest[1]).toBeLessThan(rest.shoulderL[1] - rest.chest[1]);
        expect(j.head[0] - j.hip[0]).toBeLessThan(rest.head[0] - rest.hip[0]);
      });
      expect(ADULT_FACE.expressions.petted.eyes).toBe('happy');
      expect(animOf(body, 'worried').frames[0]?.parts.armL).not.toBe(a.frames[0]?.parts.armL);
    }
  });
  it('sit_edge female: two shins with a 1–2 px gap under the hem (no one-legged stub at 1×)', () => {
    const img = createRigRenderer(ADULT_FEMALE).render(animOf(ADULT_FEMALE, 'sit_edge'), 0, ctx);
    const runs = (y: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let x = 0; x < img.width; x++) {
        if (!opaque(img, x, y)) continue;
        const last = out.at(-1);
        if (last && last[1] === x - 1) last[1] = x;
        else out.push([x, x]);
      }
      return out;
    };
    const span = (y: number): number => (runs(y).at(-1)?.[1] ?? 99) - (runs(y)[0]?.[0] ?? 0);
    let y = layoutOf(ADULT_FEMALE).rest.hip[1];
    while (y < img.height && span(y) > 12) y++;
    const legs = runs(y);
    expect(legs, `row ${String(y)}`).toHaveLength(2);
    const [l, r] = legs as [[number, number], [number, number]];
    expect(r[0] - l[1] - 1).toBeGreaterThanOrEqual(1);
    expect(r[0] - l[1] - 1).toBeLessThanOrEqual(2);
    expect(l[1] - l[0]).toBeGreaterThanOrEqual(2);
  });
  it('long hair reaches mid-back (rows 38–44) on the adult female', () => {
    const idle = animOf(ADULT_FEMALE, 'idle_a');
    const img = createRigRenderer(ADULT_FEMALE).render(idle, 0, ctx);
    const short: Body = { ...ADULT_FEMALE, variants: { ...ADULT_FEMALE.variants, hairBack: 'short' } };
    const bob = createRigRenderer(short).render(idle, 0, ctx);
    const differs = (y: number): boolean => {
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (img.data[i] !== bob.data[i] || img.data[i + 3] !== bob.data[i + 3]) return true;
      }
      return false;
    };
    expect([36, 38, 40].some(differs)).toBe(true);
    expect(differs(48)).toBe(false);
  });
});

describe('adult hip prop per view (MA-45 rounds 1–2)', () => {
  const sword = adultSword();
  const pack = (b: Body) => () => createRigPack(b, animsFor(b));
  const q34 = ADULT_MALE.views?.q34;
  if (!q34) throw new Error('q34 view');
  const withQ34Prop = (prop: Prop): Body => ({ ...ADULT_MALE, views: { q34: { ...q34, prop } } });
  it('q34 keeps the 35-px 25° trailing sword at hilt row 36', () => {
    expect(q34.prop).toEqual({ mask: adultSwordQ34(), at: [-23, -4] });
    expect(pack(withQ34Prop({ mask: adultSwordQ34(48), at: [-23, -4] }))).toThrow(/q34 prop spans/);
    expect(pack(withQ34Prop({ mask: adultSwordQ34(), at: [-23, -12] }))).toThrow(/q34 prop top row 28/);
    expect(pack(ADULT_MALE)).not.toThrow();
  });
  it('front: rejects the q34 diagonal, a missing hilt, crossing the axis, > 3 px past the outline, a low tip', () => {
    expect(pack({ ...ADULT_MALE, prop: { ...sword.front, mask: adultSwordQ34() } })).toThrow(/scabbard at 28°/);
    expect(pack({ ...ADULT_MALE, prop: { mask: sword.front.mask, at: sword.front.at } })).toThrow(/projected hilt/);
    expect(pack({ ...ADULT_MALE, prop: { ...sword.front, at: [-3, -1] } })).toThrow(/crosses the axis/);
    expect(pack({ ...ADULT_MALE, prop: { ...sword.front, at: [9, -1] } })).toThrow(/past the outline/);
    expect(pack({ ...ADULT_MALE, prop: { ...sword.front, at: [5, 2] } })).toThrow(/tip row 59/);
  });

  const strip = <T extends object>(v: T): T =>
    // Object.fromEntries loses the record type; the copy has the same keys minus the optional `prop`.
    Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'prop')) as unknown as T;
  const bare: Body = { ...strip(ADULT_MALE), views: { q34: strip(q34) } };
  const same = (w: RgbaImage, b: RgbaImage, i: number): boolean =>
    [0, 1, 2, 3].every((k) => w.data[i + k] === b.data[i + k]);
  it('front frames: no prop px across the axis, at most 3 px past the body silhouette', () => {
    let frames = 0;
    for (const a of ANIMS_ADULT) {
      a.frames.forEach((p, f) => {
        if ((p.view ?? 'front') !== 'front') return;
        frames++;
        const w = createRigRenderer(ADULT_MALE).render(a, f, ctx);
        const b = createRigRenderer(bare).render(a, f, ctx);
        const axis = 28 + Math.round(p.root.dx);
        const at = `${a.name}/${String(f)}`;
        let seen = 0;
        for (let y = 0; y < w.height; y++) {
          let edge = -1;
          for (let x = axis; x < w.width; x++) if (opaque(b, x, y)) edge = x;
          for (let x = 0; x < w.width; x++) {
            if (same(w, b, (y * w.width + x) * 4)) continue;
            seen++;
            expect(x, `${at}: px (${String(x)}, ${String(y)}) across the axis`).toBeGreaterThanOrEqual(axis);
            if (!opaque(b, x, y))
              expect(x - edge, `${at}: (${String(x)}, ${String(y)}) outside`).toBeLessThanOrEqual(3);
          }
        }
        expect(seen, `${at}: prop visible`).toBeGreaterThan(0);
      });
    }
    expect(frames).toBeGreaterThan(40);
  });
  it('turn: the hilt stays on the screen-right hip in both frames (the prop never jumps sides)', () => {
    const turn = animOf(ADULT_MALE, 'turn');
    for (const f of [0, 1]) {
      const w = createRigRenderer(ADULT_MALE).render(turn, f, ctx);
      const b = createRigRenderer(bare).render(turn, f, ctx);
      let top: [number, number] | undefined;
      for (let i = 0; i < w.data.length && !top; i += 4) {
        if (!same(w, b, i)) top = [(i / 4) % w.width, Math.floor(i / 4 / w.width)];
      }
      expect(top?.[0] ?? 0, `turn f${String(f)}`).toBeGreaterThan(28);
      expect(top?.[1] ?? 0).toBeGreaterThanOrEqual(35);
    }
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
