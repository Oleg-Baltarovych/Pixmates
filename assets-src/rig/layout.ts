// Rig layout (plan M-ART D-19 MA-42…MA-44, D-20 ADR 012): frame size, rest skeletons, limb shapes, torso / hem
// geometry, hair scale. One layout since D-20: `LAYOUT`, the chibi 48 × 56 rig (the pre-D-19 module constants, so the
// packs stay byte-identical). `layoutOf` is kept as the single accessor.
import type { Point } from '../lib/chain.ts';
import type { ArmVariant, JointMap, LegVariant } from './types.ts';

export interface ArmShape {
  /** Elbow and hand of the left arm from its shoulder (front: −x = outward; q34: +x = forward). */
  readonly elbow: Point;
  readonly hand: Point;
}

/** Torso, hem and limb-stroke geometry (offsets from the joints, px). */
export interface TorsoGeometry {
  /** Neck block: top-left from the neck joint, size. */
  readonly neck: { readonly dx: number; readonly dy: number; readonly w: number; readonly h: number };
  /** Bodice top row from the chest joint and its half-widths (near / q34 far). */
  readonly chestTop: number;
  readonly chestHalf: number;
  readonly chestHalfFar: number;
  /** Bodice bottom row from the hip joint and its half-width there, per hem. */
  readonly bodiceEnd: { readonly skirt: number; readonly shorts: number };
  readonly bodiceHalf: { readonly skirt: number; readonly shorts: number };
  /** Waist band (trim): row from the hip per hem, left x from the hip, width (front / q34). */
  readonly band: {
    readonly skirt: number;
    readonly shorts: number;
    readonly dx: number;
    readonly w: number;
    readonly wQ: number;
  };
  readonly skirt: {
    readonly top: number;
    readonly topHalf: number;
    /** Hem row from the hip joint. */
    readonly hemDy: number;
    readonly hemHalf: number;
    readonly petHalf: number;
    readonly curve: number;
  };
  readonly shorts: {
    readonly top: number;
    readonly topHalf: number;
    readonly hemDy: number;
    readonly hemHalf: number;
    readonly curve: number;
  };
  /** Leg stroke: top x from the hip axis (front / q34), radii at the hip and ankle. */
  readonly leg: {
    readonly dx: number;
    readonly dxQ: number;
    readonly hipR: number;
    readonly footR: number;
  };
  /** Arm strokes: shoulder puff radii, upper-arm radii (shoulder, elbow), forearm radius at the elbow. */
  readonly arm: {
    readonly puff: readonly [number, number];
    readonly upper: readonly [number, number];
    readonly fore: number;
  };
  /** Squash cut row from the hip joint (the waist). */
  readonly waistRow: number;
}

export interface RigLayout {
  /** Frame (and figure) width; the body axis x = w / 2. */
  readonly w: number;
  /** Figure box height (rest coordinates); the frame adds `frameH − figureH` headroom rows on top. */
  readonly figureH: number;
  readonly frameH: number;
  /** Frame heights the headroom gate may pick from (smallest that keeps row 0 clear). */
  readonly frameHChoices: readonly number[];
  /** Manifest `scaleRef` (standing figure height for sizing, ADR 009). */
  readonly scaleRef: number;
  readonly rest: JointMap;
  readonly restQ34: JointMap;
  readonly arms: Readonly<Record<ArmVariant, ArmShape>>;
  readonly armsQ34: Readonly<Partial<Record<ArmVariant, ArmShape>>>;
  /** Foot of the left leg from the hip for the hanging variants. */
  readonly legs: Readonly<Record<Exclude<LegVariant, 'stand'>, Point>>;
  readonly torso: TorsoGeometry;
  /** Back-hair outline and side-lock anchors scale (1 = the 30-px legacy head). */
  readonly hairScale: number;
  /** `Body.cloak.hemRow` upper bound. */
  readonly cloakHemMax: number;
  /** Glance: the eye-mask column splitting the two eyes (`irisShift`). */
  readonly irisHalf: number;
}

// ---- Chibi 48 × 56 (pre-D-19 numbers, unchanged) ----------------------------------------------------------------------

const REST: JointMap = {
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

/** See body.ts `REST_Q34` (ADR 010 rules). */
const REST_Q34: JointMap = {
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

const ARMS: Readonly<Record<ArmVariant, ArmShape>> = {
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

const ARMS_Q34: Readonly<Partial<Record<ArmVariant, ArmShape>>> = {
  down: { elbow: [0.2, 3.3], hand: [0.3, 6.4] },
  swing_fwd: { elbow: [1.2, 3.1], hand: [3.2, 5.6] },
  swing_back: { elbow: [-1.3, 3.1], hand: [-3.2, 5.5] },
};

export const LAYOUT: RigLayout = {
  w: 48,
  figureH: 48,
  frameH: 56,
  frameHChoices: [52, 56, 60],
  scaleRef: 48,
  rest: REST,
  restQ34: REST_Q34,
  arms: ARMS,
  armsQ34: ARMS_Q34,
  legs: {
    dangle: [REST.footL[0] - REST.hip[0], REST.footL[1] - REST.hip[1]],
    // Knees forward (hip bend), shins hanging past the edge: the foot sits under the knee (compose draws the knee).
    sit: [-2.8, 5.4],
    curl: [-4.8, 0.6],
  },
  torso: {
    neck: { dx: -1.8, dy: -1.4, w: 4, h: 3 },
    chestTop: -2.6,
    chestHalf: 4.8,
    chestHalfFar: 3.6,
    bodiceEnd: { skirt: -9.6, shorts: -3.6 },
    bodiceHalf: { skirt: 5.6, shorts: 6.2 },
    band: { skirt: -10.1, shorts: -4.6, dx: -5.4, w: 11, wQ: 10 },
    skirt: { top: -10.1, topHalf: 5.6, hemDy: 0.1, hemHalf: 10, petHalf: 9.4, curve: 9 },
    shorts: { top: -4.5, topHalf: 5.4, hemDy: 1.2, hemHalf: 6, curve: 6 },
    leg: { dx: 2.4, dxQ: 1.4, hipR: 1.35, footR: 1.15 },
    arm: { puff: [2.6, 2.3], upper: [1.55, 1.3], fore: 1.2 },
    waistRow: -10,
  },
  hairScale: 1,
  cloakHemMax: 6,
  irisHalf: 10,
};

/** The rig layout (one since D-20). */
export const layoutOf = (): RigLayout => LAYOUT;
