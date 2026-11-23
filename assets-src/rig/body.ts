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
  // Fist at the jaw corner (frame x ≈ 34 / 14): stamped after the head so it breaks the cheek outline (compose).
  chin: { elbow: [-1.8, 4.6], hand: [-4.8, -4.2] },
  chest: { elbow: [-1.0, 3.4], hand: [2.0, 4.2] },
  knees: { elbow: [-1.4, 3.4], hand: [-0.6, 6.8] },
  talk: { elbow: [-2.4, 2.6], hand: [-3.4, 3.6] },
  edge: { elbow: [-1.8, 3.6], hand: [-3.0, 7.8] },
};

/** Foot of the left leg relative to the hip for hanging variants; the right leg mirrors x. */
const LEGS: Readonly<Record<Exclude<LegVariant, 'stand'>, Point>> = {
  dangle: [REST.footL[0] - REST.hip[0], REST.footL[1] - REST.hip[1]],
  // Knees forward (hip bend), shins hanging past the edge: the foot sits under the knee (compose draws the knee).
  sit: [-2.8, 6.4],
  curl: [-4.8, 0.6],
};

const ZERO = { dx: 0, dy: 0 } as const;

/** Absolute joint positions (frame px) of one pose frame on a body, for a frame `frameH` tall. */
export function resolveJoints(body: Body, pose: PoseFrame, frameH: number): JointMap {
  const oy = frameH - FIGURE_H;
  const delta = new Map<Joint, Point>();
  const out = {} as Record<Joint, Point>;
  for (const j of JOINTS) {
    const parent = JOINT_PARENT[j];
    const own = pose.joints?.[j] ?? ZERO;
    const tweak = body.tweaks?.[j] ?? ZERO;
    const base = parent === null ? [pose.root.dx, pose.root.dy] : (delta.get(parent) ?? [0, 0]);
    const d: Point = [base[0] + own.dx + tweak.dx, base[1] + own.dy + tweak.dy];
    delta.set(j, d);
    out[j] = [REST[j][0] + d[0], REST[j][1] + d[1] + oy];
  }
  for (const [hand, shoulder, arm, side] of [
    ['handL', 'shoulderL', pose.parts.armL, 1],
    ['handR', 'shoulderR', pose.parts.armR, -1],
  ] as const) {
    const own = pose.joints?.[hand] ?? ZERO;
    const s = out[shoulder];
    out[hand] = [s[0] + side * ARMS[arm].hand[0] + own.dx, s[1] + ARMS[arm].hand[1] + own.dy];
  }
  for (const [foot, side] of [
    ['footL', 1],
    ['footR', -1],
  ] as const) {
    const own = pose.joints?.[foot] ?? ZERO;
    const tweak = body.tweaks?.[foot] ?? ZERO;
    const legs = pose.parts.legs;
    if (legs === 'stand') {
      out[foot] = [REST[foot][0] + own.dx + tweak.dx, REST[foot][1] + own.dy + tweak.dy + oy];
    } else {
      const hip = out.hip;
      out[foot] = [hip[0] + side * LEGS[legs][0] + own.dx, hip[1] + LEGS[legs][1] + own.dy];
    }
  }
  return out;
}

/** Elbow of an arm (frame px). */
export function elbowOf(joints: JointMap, side: 'L' | 'R', arm: ArmVariant): Point {
  const s = joints[side === 'L' ? 'shoulderL' : 'shoulderR'];
  const k = side === 'L' ? 1 : -1;
  return [s[0] + k * ARMS[arm].elbow[0], s[1] + ARMS[arm].elbow[1]];
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
