// Rest skeleton + joint resolution (plan M-ART MA-23, docs/art/RIG.md). REST is the maid 48 rest geometry as
// joints in figure units; `resolveJoints` turns a pose frame into absolute frame px:
// every joint moves with its parent chain (root → hip → chest → neck → head → face …) plus its own offset, arm
// variants place the hands, and the legs variant decides whether the feet stay planted or hang from the hip.
import type { Point } from '../lib/chain.ts';
import type { Mask } from '../lib/mask.ts';
import { LAYOUT, layoutOf, type ArmShape, type RigLayout } from './layout.ts';
import {
  JOINT_PARENT,
  JOINTS,
  type ArmVariant,
  type Body,
  type Joint,
  type JointMap,
  type PoseFrame,
  type View,
} from './types.ts';

/** Legacy figure box height (feet on row 46, row 47 free for the outline); the frame adds headroom on top. */
export const FIGURE_H = LAYOUT.figureH;
/** Legacy frame (and figure) width; the body axis x = 24 sits on a px boundary. */
export const RIG_W = LAYOUT.w;

/** Rest skeleton (the maid 48 rest geometry). */
export const REST: JointMap = LAYOUT.rest;

/**
 * Legacy three-quarter rest (ADR 010, RIG.md «Views»), authored facing screen-right: the head joint sits 1 px BEHIND
 * the hip axis (owner, MA-27d: the back-of-head hair overhangs behind, the face never juts past the chest; constant,
 * never animated), the face anchor 1 px toward the facing (+2 inside the head), chest/hip axis unchanged; the near
 * (screen-left) shoulder 1 px out, the far one 2 px in and 1 row lower; the tail roots 2 px to the trailing side;
 * both feet on the ground row (y ± 0), 1 px either side of the axis (the stride runs fore/aft along x).
 */
export const REST_Q34: JointMap = LAYOUT.restQ34;

export const restOf = (view: View, layout: RigLayout = LAYOUT): JointMap =>
  view === 'q34' ? layout.restQ34 : layout.rest;

/** Joints that follow the head view when it leads the body (turn f0). */
const HEAD_JOINTS: ReadonlySet<Joint> = new Set(['head', 'face', 'acc', 'fx']);

/** Legacy q34 arms (elbow + hand from the shoulder, x = forward, no mirror); only walk/turn variants exist in q34. */
export const ARMS_Q34 = LAYOUT.armsQ34;
/** Legacy front arms: elbow and hand of the left arm relative to its shoulder; the right arm mirrors x. */
export const ARMS = LAYOUT.arms;

const armOf = (layout: RigLayout, view: View, arm: ArmVariant, side: 1 | -1): ArmShape => {
  if (view === 'front') {
    const a = layout.arms[arm];
    return { elbow: [side * a.elbow[0], a.elbow[1]], hand: [side * a.hand[0], a.hand[1]] };
  }
  const a = layout.armsQ34[arm];
  if (!a) throw new Error(`arm "${arm}" has no q34 shape`);
  return a;
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
  const layout = layoutOf();
  const oy = frameH - layout.figureH;
  const rest = restOf(view, layout);
  const headRest = restOf(pose.headView ?? view, layout);
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
    const shape = armOf(layout, view, arm, side);
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
      out[foot] = [hip[0] + side * layout.legs[legs][0] + own.dx, hip[1] + layout.legs[legs][1] + own.dy];
    }
  }
  return out;
}

/** Elbow of an arm (frame px). */
export function elbowOf(
  joints: JointMap,
  side: 'L' | 'R',
  arm: ArmVariant,
  view: View = 'front',
  layout: RigLayout = LAYOUT,
): Point {
  const s = joints[side === 'L' ? 'shoulderL' : 'shoulderR'];
  const e = armOf(layout, view, arm, side === 'L' ? 1 : -1).elbow;
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
