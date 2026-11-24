// Rest skeleton + joint resolution (plan M-ART MA-23, docs/art/RIG.md). REST is the spike `maid` 48 geometry
// (assets-src/spike/maid.ts) as joints in figure units; `resolveJoints` turns a pose frame into absolute frame px:
// every joint moves with its parent chain (root → hip → chest → neck → head → face …) plus its own offset, arm
// variants place the hands, and the legs variant decides whether the feet stay planted or hang from the hip.
import type { Point } from '../lib/chain.ts';
import type { Mask } from '../lib/mask.ts';
import {
  JOINT_PARENT,
  JOINTS,
  type ArmVariant,
  type Body,
  type Joint,
  type JointMap,
  type LegVariant,
  type PoseFrame,
  type View,
} from './types.ts';

/** Figure box height (feet on row 46, row 47 free for the outline); the frame adds headroom on top. */
export const FIGURE_H = 48;

export const REST: JointMap = {
  root: [24, 46],
  hip: [24, 39.5],
  seat: [24, 40.5],
  chest: [24, 26],
  back: [28.5, 34],
  neck: [24, 23],
  head: [24, 14],
  face: [14, 12],
  acc: [24, 3],
  fx: [33, 5],
  shoulderL: [18.8, 25.2],
  shoulderR: [29.2, 25.2],
  handL: [17.3, 31.6],
  handR: [30.7, 31.6],
  footL: [21.3, 44.6],
  footR: [26.7, 44.6],
};

/**
 * Three-quarter rest (ADR 010, RIG.md «Views»), authored facing screen-right: the head joint sits 1 px BEHIND the hip
 * axis (owner, MA-27d: the back-of-head hair overhangs behind, the face never juts past the chest; constant, never
 * animated), the face anchor 1 px toward the facing (+2 inside the head), chest/hip axis unchanged; the near
 * (screen-left) shoulder 1 px out, the far one 2 px in and 1 row lower; the tail roots 2 px to the trailing side;
 * both feet on the ground row (y ± 0), 1 px either side of the axis (the stride runs fore/aft along x).
 */
export const REST_Q34: JointMap = {
  ...REST,
  head: [23, 14],
  face: [15, 12],
  acc: [23, 3],
  fx: [32, 5],
  back: [22, 34],
  shoulderL: [17.8, 25.2],
  shoulderR: [27.2, 26.2],
  handL: [18.1, 31.6],
  handR: [27.5, 32.6],
  footL: [23, 44.6],
  footR: [25, 44.6],
};

export const restOf = (view: View): JointMap => (view === 'q34' ? REST_Q34 : REST);

/** Joints that follow the head view when it leads the body (turn f0). */
const HEAD_JOINTS: ReadonlySet<Joint> = new Set(['head', 'face', 'acc', 'fx']);

/**
 * q34 arms (facing screen-right): elbow + hand from the shoulder with x = forward, the same for both arms (no mirror).
 * Only the walk/turn variants exist in q34; others throw.
 */
export const ARMS_Q34: Readonly<Partial<Record<ArmVariant, { readonly elbow: Point; readonly hand: Point }>>> = {
  down: { elbow: [0.2, 3.3], hand: [0.3, 6.4] },
  swing_fwd: { elbow: [1.2, 3.1], hand: [3.2, 5.6] },
  swing_back: { elbow: [-1.3, 3.1], hand: [-3.2, 5.5] },
};

const armOf = (view: View, arm: ArmVariant, side: 1 | -1): { elbow: Point; hand: Point } => {
  if (view === 'front') {
    const a = ARMS[arm];
    return { elbow: [side * a.elbow[0], a.elbow[1]], hand: [side * a.hand[0], a.hand[1]] };
  }
  const a = ARMS_Q34[arm];
  if (!a) throw new Error(`arm "${arm}" has no q34 shape`);
  return a;
};

/** Elbow and hand of the left arm relative to its shoulder; the right arm mirrors x. */
export const ARMS: Readonly<Record<ArmVariant, { readonly elbow: Point; readonly hand: Point }>> = {
  down: { elbow: [-1.2, 3.2], hand: [-1.5, 6.4] },
  // Walk swing stays beside the torso (never across the bodice): loose, a little out and back.
  swing_fwd: { elbow: [-0.9, 3.3], hand: [-1.1, 6.3] },
  swing_back: { elbow: [-2.0, 3.0], hand: [-3.6, 5.3] },
  /** Drag: hanging straight down from raised shoulders, the hand splayed 1 px out (never at the collar). */
  hang: { elbow: [-1.0, 3.6], hand: [-2.0, 7.2] },
  /** Sleep: limp, the hand resting on the thigh. */
  limp: { elbow: [-0.9, 3.5], hand: [-0.2, 6.9] },
  /** Think: forearm across the waist, propping the other (chin) elbow. */
  fold: { elbow: [-1.2, 4.4], hand: [10.4, 4.8] },
  // Raised hands stay outside the head mask (x ≤ 10 / ≥ 38): masks are stamped over the procedural parts.
  up: { elbow: [-4.6, -1.6], hand: [-9.4, -5.0] },
  wave_a: { elbow: [-5.0, -1.0], hand: [-9.2, -4.4] },
  wave_b: { elbow: [-5.0, -1.4], hand: [-8.4, -7.0] },
  hug: { elbow: [-0.8, 3.4], hand: [2.6, 4.6] },
  flail: { elbow: [-5.0, -0.6], hand: [-9.6, -2.2] },
  out: { elbow: [-3.4, 1.4], hand: [-6.4, 2.4] },
  // Thinking fist UNDER the chin, below the mouth (fist centre = hand joint, frame x ≈ 25 / 23, the row under the jaw):
  // stamped after the head (compose) with its cuff on the forearm side; the forearm runs from the elbow up across the
  // bow/bib. A body whose head or neck differs nudges the hand with `Body.chinHand` (never per-animation forks).
  // LATER: the fist sits 1 px toward its own arm (4.2 → 3.2), off the jaw line.
  chin: { elbow: [-1.8, 4.6], hand: [3.2, 1.85] },
  chest: { elbow: [-1.0, 3.4], hand: [2.0, 4.2] },
  knees: { elbow: [-1.4, 3.4], hand: [-0.6, 6.8] },
  talk: { elbow: [-2.4, 2.6], hand: [-3.4, 3.6] },
  edge: { elbow: [-1.8, 3.6], hand: [-3.0, 7.8] },
};

/** Foot of the left leg relative to the hip for hanging variants; the right leg mirrors x. */
const LEGS: Readonly<Record<Exclude<LegVariant, 'stand'>, Point>> = {
  dangle: [REST.footL[0] - REST.hip[0], REST.footL[1] - REST.hip[1]],
  // Knees forward (hip bend), shins hanging past the edge: the foot sits under the knee (compose draws the knee).
  sit: [-2.8, 5.4],
  curl: [-4.8, 0.6],
};

const ZERO = { dx: 0, dy: 0 } as const;

/**
 * Absolute joint positions (frame px) of one pose frame on a body, for a frame `frameH` tall. The view comes from the
 * frame (`view`, default front); a leading `headView` moves the head joints by the difference of the two rests.
 */
export function resolveJoints(
  body: Body,
  pose: PoseFrame,
  frameH: number,
  view: View = pose.view ?? 'front',
): JointMap {
  const oy = frameH - FIGURE_H;
  const rest = restOf(view);
  const headRest = restOf(pose.headView ?? view);
  const tweaks = view === 'front' ? body.tweaks : (body.views?.[view]?.tweaks ?? body.tweaks);
  const delta = new Map<Joint, Point>();
  const out = {} as Record<Joint, Point>;
  for (const j of JOINTS) {
    const parent = JOINT_PARENT[j];
    const own = pose.joints?.[j] ?? ZERO;
    const tweak = tweaks?.[j] ?? ZERO;
    const base = parent === null ? [pose.root.dx, pose.root.dy] : (delta.get(parent) ?? [0, 0]);
    const d: Point = [base[0] + own.dx + tweak.dx, base[1] + own.dy + tweak.dy];
    delta.set(j, d);
    const r = HEAD_JOINTS.has(j) ? headRest : rest;
    out[j] = [r[j][0] + d[0], r[j][1] + d[1] + oy];
  }
  for (const [hand, shoulder, arm, side] of [
    ['handL', 'shoulderL', pose.parts.armL, 1],
    ['handR', 'shoulderR', pose.parts.armR, -1],
  ] as const) {
    const own = pose.joints?.[hand] ?? ZERO;
    const s = out[shoulder];
    const bt = arm === 'chin' ? (body.chinHand ?? ZERO) : ZERO;
    const shape = armOf(view, arm, side);
    out[hand] = [s[0] + shape.hand[0] + side * bt.dx + own.dx, s[1] + shape.hand[1] + bt.dy + own.dy];
  }
  for (const [foot, side] of [
    ['footL', 1],
    ['footR', -1],
  ] as const) {
    const own = pose.joints?.[foot] ?? ZERO;
    const tweak = tweaks?.[foot] ?? ZERO;
    const legs = pose.parts.legs;
    if (legs === 'stand') {
      out[foot] = [rest[foot][0] + own.dx + tweak.dx, rest[foot][1] + own.dy + tweak.dy + oy];
    } else {
      const hip = out.hip;
      out[foot] = [hip[0] + side * LEGS[legs][0] + own.dx, hip[1] + LEGS[legs][1] + own.dy];
    }
  }
  return out;
}

/** Elbow of an arm (frame px). */
export function elbowOf(joints: JointMap, side: 'L' | 'R', arm: ArmVariant, view: View = 'front'): Point {
  const s = joints[side === 'L' ? 'shoulderL' : 'shoulderR'];
  const e = armOf(view, arm, side === 'L' ? 1 : -1).elbow;
  return [s[0] + e[0], s[1] + e[1]];
}

const HAIR_CHARS = new Set(['j', 'J', 'h', 'H', 'y', 'Y']);
const SKIN_CHARS = new Set(['s', 'S', 'e', 'E']);

/**
 * Forehead hair-shadow band (ART-BIBLE §11.3): in every column, the first skin px under the fringe (row ≤ `last`)
 * becomes `z`, plus a 1-px AA step: the skin px under a band px whose neighbour column's band sits one row lower (a
 * staircase corner) becomes `s`.
 */
export function withBand(mask: Mask, last: number): Mask {
  const rows = mask.map((r) => r.split(''));
  const width = Math.max(0, ...rows.map((r) => r.length));
  const bandRow: number[] = [];
  for (let x = 0; x < width; x++) {
    bandRow[x] = -1;
    let hair = false;
    for (let y = 0; y <= Math.min(last, rows.length - 1); y++) {
      const row = rows[y];
      const ch = row?.[x] ?? '.';
      if (HAIR_CHARS.has(ch)) hair = true;
      else if (row && hair && SKIN_CHARS.has(ch)) {
        row[x] = 'z';
        bandRow[x] = y;
        break;
      }
    }
  }
  for (let x = 0; x < width; x++) {
    const y = bandRow[x] ?? -1;
    if (y < 0) continue;
    const step = [x - 1, x + 1].some((n) => (bandRow[n] ?? -1) === y + 1);
    const below = rows[y + 1];
    if (step && below && SKIN_CHARS.has(below[x] ?? '.')) below[x] = 's';
  }
  return rows.map((r) => r.join(''));
}
