// Per-body rig layout (plan M-ART D-19 MA-42…MA-44, ADR 011): frame size, rest skeletons, limb shapes, torso / hem
// geometry, hair scale and face rules. `LAYOUT_LEGACY` is the 48 × 56 rig of the chibi packs (its numbers are the
// pre-D-19 module constants, so those packs stay byte-identical until each is redrawn); `LAYOUT_ADULT` is the adult
// 56 × 72 rig (frame C+, ≈ 4.4 heads, reports/sprites/style-spike) with two-segment arms and legs and the `male` /
// `female` build presets. A body picks one with `Body.layout` (+ `Body.build` for adult).
import type { Point } from '../lib/chain.ts';
import type { ExpressionId } from './face.ts';
import type { ArmVariant, Body, BodyBuild, JointMap, LegVariant } from './types.ts';

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
  /**
   * Optional waist pinch on a full-length (shorts) bodice: `inset` px per side at fraction `t` of the bodice height
   * (female build). With a skirt the bodice ends at the waist (`bodiceHalf.skirt`) and the skirt flares to the hip.
   */
  readonly waist?: { readonly t: number; readonly inset: number };
  /** Waist band (trim): row from the hip per hem, left x from the hip, width (front / q34). */
  readonly band: {
    readonly skirt: number;
    readonly shorts: number;
    readonly dx: number;
    readonly w: number;
    readonly wQ: number;
    /** Span override with a skirt (the band sits on the waist, not the hip). */
    readonly skirtSpan?: { readonly dx: number; readonly w: number; readonly wQ: number };
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
  /** Leg stroke: top x from the hip axis (front / q34), radii at the hip, knee (two-segment only) and ankle. */
  readonly leg: {
    readonly dx: number;
    readonly dxQ: number;
    readonly hipR: number;
    readonly kneeR: number;
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

/** Two-segment legs (adult): knee on the hip → foot line at `thigh`, plus a bend per leg variant. */
export interface KneeRig {
  /** Fraction of hip-top → foot where the knee sits. */
  readonly thigh: number;
  /** Knee offset per variant (front: −x = outward for the left leg; q34: +x = forward). */
  readonly bend: Readonly<Record<LegVariant, Point>>;
  readonly bendQ34: Readonly<Record<LegVariant, Point>>;
}

/** Adult face rules for `validateFace` (ADR 011, ART-BIBLE §11.0). */
export interface FaceRules {
  /** Face height (hairline → chin, rows): open eyes are ¼–⅕ of it. */
  readonly faceH: number;
  /** Eye mask rows allowed (open eyes min…max; closed eyes may be 1 row). */
  readonly eyeRows: readonly [number, number];
  /** Every expression except these has brows. */
  readonly browless: readonly ExpressionId[];
  /** A nose shadow (1–3 skin px) is required. */
  readonly nose: boolean;
  /** Expressions whose cheeks may use blush px. */
  readonly blushOnly: readonly ExpressionId[];
  /** Chin row of the head mask at least this many skin px narrower than its widest skin row (the jaw). */
  readonly jawTaper: number;
}

export type LayoutId = 'legacy' | 'adult';

export interface RigLayout {
  readonly id: LayoutId;
  readonly build?: BodyBuild;
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
  readonly knee?: KneeRig;
  readonly torso: TorsoGeometry;
  /** Back-hair outline and side-lock anchors scale (1 = the 30-px legacy head). */
  readonly hairScale: number;
  /** `Body.cloak.hemRow` upper bound. */
  readonly cloakHemMax: number;
  /** Glance: the eye-mask column splitting the two eyes (`irisShift`). */
  readonly irisHalf: number;
  readonly face?: FaceRules;
  /**
   * q34 far (R) arm one ramp step darker than the near one (sleeve and bare forearm; adult). The far leg already
   * takes `farLegShade` or one step under the near leg.
   */
  readonly farArmStep?: number;
  /**
   * Rest row of the long back-hair tips (`hairBack: 'long'` without `Body.hairBackStretch`): the outline below the
   * head is stretched to reach it, so `hairScale` only narrows long hair (adult: mid-back, rows 38–44).
   */
  readonly longHairTipRow?: number;
}

// ---- Legacy 48 × 56 (pre-D-19 numbers, unchanged) -------------------------------------------------------------------

const REST_LEGACY: JointMap = {
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
const REST_Q34_LEGACY: JointMap = {
  ...REST_LEGACY,
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

const ARMS_LEGACY: Readonly<Record<ArmVariant, ArmShape>> = {
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
  // Adult-only variants (no legacy table uses them); legacy copies keep the record total.
  pump: { elbow: [-4.6, -1.6], hand: [-9.4, -5.0] },
  neck: { elbow: [-3.4, 1.4], hand: [-6.4, 2.4] },
  hip: { elbow: [-1.4, 3.4], hand: [-0.6, 6.8] },
};

const ARMS_Q34_LEGACY: Readonly<Partial<Record<ArmVariant, ArmShape>>> = {
  down: { elbow: [0.2, 3.3], hand: [0.3, 6.4] },
  swing_fwd: { elbow: [1.2, 3.1], hand: [3.2, 5.6] },
  swing_back: { elbow: [-1.3, 3.1], hand: [-3.2, 5.5] },
};

export const LAYOUT_LEGACY: RigLayout = {
  id: 'legacy',
  w: 48,
  figureH: 48,
  frameH: 56,
  frameHChoices: [52, 56, 60],
  scaleRef: 48,
  rest: REST_LEGACY,
  restQ34: REST_Q34_LEGACY,
  arms: ARMS_LEGACY,
  armsQ34: ARMS_Q34_LEGACY,
  legs: {
    dangle: [REST_LEGACY.footL[0] - REST_LEGACY.hip[0], REST_LEGACY.footL[1] - REST_LEGACY.hip[1]],
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
    leg: { dx: 2.4, dxQ: 1.4, hipR: 1.35, kneeR: 1.35, footR: 1.15 },
    arm: { puff: [2.6, 2.3], upper: [1.55, 1.3], fore: 1.2 },
    waistRow: -10,
  },
  hairScale: 1,
  cloakHemMax: 6,
  irisHalf: 10,
};

// ---- Adult 56 × 72 (frame C+, ADR 011) -------------------------------------------------------------------------------

/** Build preset numbers (spike C+: shoulders 21 / 17, neck 5 / 3, stance 13 / 9, hip 1 row higher on the female). */
export interface BuildPreset {
  /** Shoulder joint x from the axis (the puff adds ≈ 2.5 px outside it). */
  readonly shoulderDx: number;
  readonly neckW: number;
  /** Foot joint x from the axis. */
  readonly footDx: number;
  /** Hip joint row. */
  readonly hipY: number;
  readonly chestHalf: number;
  readonly chestHalfFar: number;
  readonly bodiceHalf: { readonly skirt: number; readonly shorts: number };
  readonly waist?: { readonly t: number; readonly inset: number };
  readonly legDx: number;
  readonly hipR: number;
}

export const BUILDS: Readonly<Record<BodyBuild, BuildPreset>> = {
  male: {
    shoulderDx: 9,
    neckW: 5,
    footDx: 6.5,
    hipY: 40,
    chestHalf: 7.4,
    chestHalfFar: 5.6,
    bodiceHalf: { skirt: 5.8, shorts: 6.4 },
    legDx: 3.4,
    hipR: 2.1,
  },
  female: {
    shoulderDx: 7,
    neckW: 3,
    footDx: 4.5,
    hipY: 39,
    chestHalf: 6,
    chestHalfFar: 4.6,
    // Skirt: the bodice ends at the pinched waist (chest 6 → 4.2), the skirt flares over the hip.
    bodiceHalf: { skirt: 4.2, shorts: 7 },
    // Pinched 2 px per side at ≈ 60 % of the torso (spike).
    waist: { t: 0.6, inset: 2 },
    legDx: 3.2,
    hipR: 2.2,
  },
};

const ADULT_W = 56;
const ADULT_H = 72;
const AXIS = ADULT_W / 2;
/** Shoulder line row (shoulder → hip 17 rows on the male). */
const SHOULDER_Y = 23.2;
/** Ankle joint row (the shoe's sole on row 70 after the outline, row 71 free). */
const FOOT_Y = 67.6;

/** Two-segment adult arms: upper ≈ 10, forearm ≈ 9 + half the 3-px fist; the elbow always bends a little. */
const ARMS_ADULT: Readonly<Record<ArmVariant, ArmShape>> = {
  // Elbow 1 px off the torso, hand 1 px off the thigh (negative space; shows the female waist).
  down: { elbow: [-2.4, 9.9], hand: [-2.6, 20.4] },
  swing_fwd: { elbow: [-0.6, 9.9], hand: [0.4, 20.2] },
  swing_back: { elbow: [-1.6, 9.8], hand: [-4.6, 19.6] },
  hang: { elbow: [-1.1, 10], hand: [-3.6, 20.4] },
  // Sleep (seated, slumped): the hand rests on the foreshortened thigh, just above the knee row.
  limp: { elbow: [-1.2, 9.8], hand: [2.2, 17] },
  // Think: forearm across the waist, the fist under the other (chin) elbow.
  fold: { elbow: [0.8, 9.7], hand: [11.5, 10.5] },
  // Raised hands stay outside the head and below row 2 at the happy apex (root −4).
  up: { elbow: [-7, -6.5], hand: [-11.5, -14] },
  wave_a: { elbow: [-7.5, -4], hand: [-10, -13] },
  wave_b: { elbow: [-7.5, -4.6], hand: [-8, -14] },
  hug: { elbow: [-1.2, 9.8], hand: [5, 14] },
  flail: { elbow: [-7.5, -3], hand: [-15, -8] },
  out: { elbow: [-7.4, 6.6], hand: [-12.5, 13.5] },
  // Forearm vertical, the elbow propped on the folded forearm, the fist raised to the jaw corner (two 10-px segments
  // put the elbow on row ≈ 32, not lower).
  chin: { elbow: [5.5, 8.8], hand: [6.5, -2] },
  chest: { elbow: [-1.4, 9.6], hand: [4.5, 7.5] },
  knees: { elbow: [-1.6, 9.8], hand: [-0.4, 19] },
  talk: { elbow: [-1.6, 9.6], hand: [-6, 15] },
  // Fist pump (happy): elbow out on the shoulder row, the fist up at row ≈ 14 beside the head.
  pump: { elbow: [-6, 0], hand: [-5, -9.2] },
  // Hand to the back of the neck (behind the head mask), elbow out at row ≈ 18.
  neck: { elbow: [-5, -5.2], hand: [4, -6.2] },
  // Hand on the hip, elbow out.
  hip: { elbow: [-4, 8], hand: [1.5, 15.5] },
  // Hands on the edge beside the hips (the seat row, hip + 1…2).
  edge: { elbow: [-1.2, 9.7], hand: [-3.6, 18.6] },
};

/** q34 adult arms (x = forward): the elbow bends forward only. */
const ARMS_Q34_ADULT: Readonly<Partial<Record<ArmVariant, ArmShape>>> = {
  down: { elbow: [-0.3, 9.9], hand: [0.9, 20.3] },
  swing_fwd: { elbow: [2.2, 9.6], hand: [6.4, 18.8] },
  swing_back: { elbow: [-3, 9.5], hand: [-4.6, 19.6] },
  // Seated in q34 (reserved for adult signature poses): hands on the edge, limp on the thigh, the fist under the chin
  // (near arm; the elbow forward and down).
  edge: { elbow: [-0.5, 9.8], hand: [1.5, 18.5] },
  limp: { elbow: [-0.3, 9.9], hand: [2.5, 18] },
  chin: { elbow: [6.5, 7.5], hand: [12.5, -1.5] },
};

function adultLayout(build: BodyBuild): RigLayout {
  const b = BUILDS[build];
  const hip = b.hipY;
  const rest: JointMap = {
    root: [AXIS, 70],
    hip: [AXIS, hip],
    seat: [AXIS, hip + 1],
    chest: [AXIS, 24],
    back: [AXIS + 2, 33],
    neck: [AXIS, 21],
    head: [AXIS, 13],
    face: [AXIS - 6, 10],
    acc: [AXIS, 6],
    fx: [AXIS + 8, 7],
    shoulderL: [AXIS - b.shoulderDx, SHOULDER_Y],
    shoulderR: [AXIS + b.shoulderDx, SHOULDER_Y],
    handL: [AXIS - b.shoulderDx - 1.6, SHOULDER_Y + 20.4],
    handR: [AXIS + b.shoulderDx + 1.6, SHOULDER_Y + 20.4],
    footL: [AXIS - b.footDx, FOOT_Y],
    footR: [AXIS + b.footDx, FOOT_Y],
  };
  // ADR 010 rules: head joint 1 px behind the hip axis (steady head), face anchor 1 px toward the facing, near
  // shoulder 1 px out, tail root 2 px trailing. Adult note (MA-45): the far shoulder sits at the far chest half − 1
  // (male +5, female +4; 1 row lower) so the bodice covers it, and the feet stand near −3 / far +3, far 1 row higher.
  const farShoulderX = AXIS + Math.round(b.chestHalfFar) - 1;
  const restQ34: JointMap = {
    ...rest,
    head: [AXIS - 1, 13],
    face: [AXIS - 5, 10],
    acc: [AXIS - 1, 6],
    fx: [AXIS + 7, 7],
    back: [AXIS - 2, 33],
    shoulderL: [AXIS - b.shoulderDx - 1, SHOULDER_Y],
    shoulderR: [farShoulderX, SHOULDER_Y + 1],
    handL: [AXIS - b.shoulderDx - 0.1, SHOULDER_Y + 20.3],
    handR: [farShoulderX + 0.9, SHOULDER_Y + 21.3],
    footL: [AXIS - 3, FOOT_Y],
    footR: [AXIS + 3, FOOT_Y - 1],
  };
  return {
    id: 'adult',
    build,
    w: ADULT_W,
    figureH: ADULT_H,
    frameH: ADULT_H,
    frameHChoices: [ADULT_H],
    // Standing figure ≈ 64 rows + the headroom the S/M/L presets were tuned on (spike C+).
    scaleRef: 66,
    rest,
    restQ34,
    arms: ARMS_ADULT,
    armsQ34: ARMS_Q34_ADULT,
    legs: {
      dangle: [rest.footL[0] - rest.hip[0], rest.footL[1] - rest.hip[1]],
      // Seated on an edge: thighs toward the viewer (foreshortened), shins hanging past it.
      // The long shins hang a full shin (≈ 14 px) under the knee, which sits on the seat row.
      sit: [-4, 16],
      curl: [-7, 4],
    },
    knee: {
      thigh: 0.5,
      bend: { stand: [0, 0], dangle: [-0.6, -0.6], sit: [-1.2, -6.5], curl: [-2.5, -5] },
      bendQ34: { stand: [0.6, 0], dangle: [1.2, -0.4], sit: [4, -6], curl: [4, -4] },
    },
    torso: {
      neck: { dx: -b.neckW / 2, dy: -1.4, w: b.neckW, h: 4 },
      chestTop: -1.6,
      chestHalf: b.chestHalf,
      chestHalfFar: b.chestHalfFar,
      bodiceEnd: { skirt: -6.6, shorts: -4.1 },
      bodiceHalf: b.bodiceHalf,
      ...(b.waist ? { waist: b.waist } : {}),
      band: {
        skirt: -7.1,
        shorts: -5,
        dx: -b.bodiceHalf.shorts,
        w: Math.round(2 * b.bodiceHalf.shorts) + 1,
        wQ: Math.round(1.8 * b.bodiceHalf.shorts),
        skirtSpan: {
          dx: -b.bodiceHalf.skirt,
          w: Math.round(2 * b.bodiceHalf.skirt) + 1,
          wQ: Math.round(1.8 * b.bodiceHalf.skirt),
        },
      },
      skirt: { top: -7.1, topHalf: b.bodiceHalf.skirt, hemDy: 9, hemHalf: 9.5, petHalf: 9, curve: 9 },
      shorts: { top: -5, topHalf: b.bodiceHalf.shorts, hemDy: 6, hemHalf: 7.2, curve: 6 },
      leg: { dx: b.legDx, dxQ: 1.6, hipR: b.hipR, kneeR: 1.5, footR: 1.15 },
      arm: { puff: [2.9, 2.4], upper: [1.7, 1.45], fore: 1.35 },
      waistRow: -7,
    },
    hairScale: 0.62,
    cloakHemMax: 12,
    irisHalf: 6,
    farArmStep: 1,
    longHairTipRow: 41,
    face: {
      faceH: 12,
      eyeRows: [2, 3],
      browless: ['blink', 'sleep', 'happy', 'petted'],
      nose: true,
      blushOnly: ['petted'],
      jawTaper: 6,
    },
  };
}

export const LAYOUT_ADULT: Readonly<Record<BodyBuild, RigLayout>> = {
  male: adultLayout('male'),
  female: adultLayout('female'),
};

/** The layout of a body (default legacy). */
export function layoutOf(body: Pick<Body, 'layout' | 'build'>): RigLayout {
  if (body.layout !== 'adult') return LAYOUT_LEGACY;
  return LAYOUT_ADULT[body.build ?? 'male'];
}
