// Shared rig contract (plan M-ART MA-23, docs/art/RIG.md). Coordinates are 48-px figure units with the feet on row 46
// of the 48-px figure box; the frame adds headroom rows on top (frame 48 × RIG_H, ADR 009). A body (per character)
// gives rest-joint tweaks, slot variants, ramps and authored masks; a pose (shared by every body) gives per-frame
// joint offsets, part variants, the face expression, squash and breath. Bodies never fork an animation.
import type { RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import type { Mask, Outfit } from '../lib/mask.ts';
import type { ExpressionId, FaceLibrary, ViewFaceLibrary } from './face.ts';

/** Rig views (ADR 010): `front` and three-quarter `q34`, authored facing screen-right (left = runtime mirror). */
export const VIEWS = ['front', 'q34'] as const;
export type View = (typeof VIEWS)[number];

/** In parent-first order. */
export const JOINTS = [
  'root',
  'hip',
  'seat',
  'chest',
  'back',
  'neck',
  'head',
  'face',
  'acc',
  'fx',
  'shoulderL',
  'shoulderR',
  'handL',
  'handR',
  'footL',
  'footR',
] as const;
export type Joint = (typeof JOINTS)[number];

export const JOINT_PARENT: Readonly<Record<Joint, Joint | null>> = {
  root: null,
  hip: 'root',
  seat: 'hip',
  chest: 'hip',
  back: 'chest',
  neck: 'chest',
  head: 'neck',
  face: 'head',
  acc: 'head',
  fx: 'head',
  shoulderL: 'chest',
  shoulderR: 'chest',
  handL: 'shoulderL',
  handR: 'shoulderR',
  footL: 'hip',
  footR: 'hip',
};

export interface Offset {
  readonly dx: number;
  readonly dy: number;
}

export type JointMap = Readonly<Record<Joint, Point>>;

/** Arm shapes (elbow + hand from the shoulder, left arm; the right arm mirrors). */
export type ArmVariant =
  | 'down'
  | 'swing_fwd'
  | 'swing_back'
  | 'up'
  | 'wave_a'
  | 'wave_b'
  | 'hug'
  | 'flail'
  | 'out'
  | 'chin'
  | 'chest'
  | 'knees'
  | 'talk'
  | 'edge'
  | 'hang'
  | 'limp'
  | 'fold';

/** `stand` = feet planted on the ground row (root motion does not move them); the rest hang from the hip. */
export type LegVariant = 'stand' | 'dangle' | 'sit' | 'curl';

/**
 * `q34` (implied by a q34 body view): far arm + far leg (screen-right, R) → back hair/tail → near leg → hem → torso →
 * near arm (L); the front orders apply to front-view frames only.
 */
export type DrawOrder = 'arms_front' | 'arm_l_back' | 'arm_r_back' | 'arms_back' | 'q34';

/** Hem (skirt / shorts bottom) offsets: sideways lag, widening, lift (fall). */
export interface HemPose {
  readonly dx?: number;
  readonly flare?: number;
  readonly lift?: number;
}

export type Squash = -2 | -1 | 0 | 1 | 2;

export interface PoseFrame {
  readonly root: Offset;
  readonly joints?: Partial<Readonly<Record<Joint, Offset>>>;
  readonly parts: {
    readonly armL: ArmVariant;
    readonly armR: ArmVariant;
    readonly legs: LegVariant;
    readonly hem?: HemPose;
  };
  readonly face: ExpressionId;
  /** Whole rows removed (+) or duplicated (−) at the waist, no resampling. */
  readonly squash: Squash;
  /** Sub-pixel chest colour shift (inhale). */
  readonly breath: 0 | 1;
  readonly order?: DrawOrder;
  /** Chain kick (px) added to secondary-motion anchors in this frame. */
  readonly impulse?: { readonly x: number; readonly y: number };
  /** Back hair below the temples and the side locks float 1 px up (the up-beat of a jump). */
  readonly hairLift?: 1;
  /** Body view of this frame (default `front`); any q34 body frame makes the animation `facing: 'right'`. */
  readonly view?: View;
  /** Head view when it leads the body (turn f0: front body, q34 head and eyes); default = the body view. */
  readonly headView?: View;
  /** Back-hair tips (below the temples) offset in px, full at the tips; the tail tip swings the other way. */
  readonly hairDx?: -1 | 0 | 1;
  /** Eyes lead: the irises move 1 px toward screen-right on this frame (turn f0), lashes and shine stay. */
  readonly irisDx?: 1;
  /**
   * The tail is tucked behind the skirt on this frame (turn f0): no tube; a spade tip shows under
   * the hem near the centre, a fox tail is hidden. Avoids the tail jumping sides between the front and q34 frames.
   */
  readonly tailTucked?: true;
}

export interface RigAnim {
  readonly name: string;
  readonly fps: number;
  readonly loop: boolean;
  readonly frames: readonly PoseFrame[];
  /** Pivot joint other than the feet (emitted as the manifest per-animation `anchor`). */
  readonly anchor?: 'seat';
}

export interface PlacedMask {
  readonly mask: Mask;
  /** Top-left relative to the joint the slot hangs on. */
  readonly at: Point;
}

export interface BodyVariants {
  readonly headAcc: 'none' | 'horns' | 'fox_ears' | 'clip';
  readonly hairBack: 'short' | 'long';
  readonly hem: 'skirt' | 'shorts';
  readonly back: 'none' | 'spade_tail' | 'fox_tail';
  readonly neckAcc: 'none' | 'bow' | 'choker' | 'scarf';
  readonly sleeves: 'short' | 'long';
}

/** Apron: bib mask on the bodice + front panel; `dx` shifts the panel off the hip centre (q34: toward facing). */
export interface Apron {
  readonly bib: PlacedMask;
  readonly panelW: number;
  readonly dx?: number;
  /** Apron ties / waist bow (q34: at the small of the back, trailing), top-left from the hip joint; under the arms. */
  readonly ties?: PlacedMask;
}

/**
 * Per-body fox tail (`back: 'fox_tail'`). Unset views keep the rig defaults (dummy-b's tail). Radii are per
 * centre-line point, root first; the pale tip is a second stroke over the last `tipRadii.length` points.
 */
export interface FoxTail {
  /** Front: a verlet chain from the back joint, `radii.length − 1` segments of `length` px. */
  readonly front?: {
    readonly radii: readonly number[];
    readonly tipRadii: readonly number[];
    readonly length: number;
    /** Chain gravity per substep (x toward screen-right), sets the rest direction of the tube. */
    readonly gravity: Point;
    /** Px added to each simulated point (the brush S-curve, the tip curling back toward the body). */
    readonly bend?: readonly Point[];
    /** Chain root from the back joint, x toward the tail side (default [1, 1]). */
    readonly root?: Point;
    /** A thin lit shine stroke (tail ramp shade 5) along the upper-left edge of the fur part. */
    readonly shine?: true;
  };
  /** q34: a fixed centre line from the back joint (trailing = −x); the tip swings against `hairDx`. */
  readonly q34?: {
    readonly points: readonly Point[];
    readonly radii: readonly number[];
    readonly tipRadii: readonly number[];
  };
}

/**
 * Scarf ends (`neckAcc: 'scarf'`): two 2-segment chains (2 px wide) hung from `at` (from the neck joint;
 * front: under the knot; q34: at the nape, trailing). The knot and band are the authored neck_acc mask.
 */
export interface ScarfEnds {
  readonly at: Point;
  /** Length (px) of each end. */
  readonly lengths: readonly [number, number];
  /** End points never go below the chest row + this many rows (default `SCARF_MAX_BELOW_CHEST`, 5). */
  readonly maxBelowChest?: number;
  /** q34: end points trail at most this many px behind their nape root (default `SCARF_MAX_TRAIL`, 6). */
  readonly maxTrail?: number;
}

/** Per-view authored parts (ADR 010): a body supplies them for every non-front view its poses use. */
export interface BodyView {
  readonly head: PlacedMask & { readonly band: number };
  /** Only the expressions the view's poses reference are required (q34: neutral, blink). */
  readonly face: ViewFaceLibrary;
  readonly masks: {
    /** Side shoe, toe forward (screen-right); top-left = foot − (2, 0.6). */
    readonly shoe: Mask;
    readonly headAcc?: PlacedMask;
    readonly neckAcc?: PlacedMask;
    /**
     * q34 far back hair (from the head joint): an authored sliver beyond the far jaw line. When set, the procedural
     * back hair keeps clear of the facing side under the jaw (only the nape behind the neck shows).
     */
    readonly hairFar?: PlacedMask;
  };
  readonly apron?: Apron;
  /**
   * Opt-in: hair px touching the near (L) sleeve take this ramp's shade 1, a 1-px line so a sleeve puff never melts
   * into a near lock of a similar value (e.g. a plum sleeve against lilac hair).
   */
  readonly sleeveHairLine?: RampName;
  /**
   * Opt-in arm-clip rule: the far (R) shoulder puff sits behind the neck and collar, so far upper-arm px down to
   * `FAR_SHOULDER_CLIP_ROWS` under the shoulder joint are not drawn (RIG.md: the far arm shows only where it clears
   * the torso). Needed when no back-hair mass covers that area (e.g. with `masks.hairFar`).
   */
  readonly hideFarShoulder?: true;
  /**
   * Opt-in: the far leg in this legs-ramp shade (0..5, part id `FAR_LEG_ID`), with shade-0 px where it touches the
   * near leg, so two pale shins never merge into one patch on the walk contact frames.
   */
  readonly farLegShade?: number;
  /** Sash knot in this view (from the hip joint); default none. */
  readonly sashKnot?: PlacedMask;
  /** Scarf ends in this view (required with `neckAcc: 'scarf'`). */
  readonly scarf?: ScarfEnds;
  /**
   * Opt-in follow-through: the back-hair tips add the previous frame's `hairDx` to their own (≤ 2 px), so long hair
   * lags the stride by a frame instead of moving as one slab.
   */
  readonly hairTipLag?: true;
  /** Rest offsets in this view (default: the body's front `tweaks`). */
  readonly tweaks?: Partial<Readonly<Record<Joint, Offset>>>;
}

/** One ramp's outer-outline tones (`Body.silhouetteOutline`). */
export interface SilhouetteOutline {
  readonly ramp: RampName;
  readonly lit: number;
  readonly shade: number;
}

export interface Body {
  /** Pack id (`pixmates.<id>` for built-ins, `rig-dummy-*` for test bodies). */
  readonly id: string;
  readonly name: string;
  /** Mask slot → ramp + six shades (authored masks and face library). */
  readonly outfit: Outfit;
  readonly ramps: {
    readonly hair: RampName;
    readonly cloth: RampName;
    readonly clothAlt: RampName;
    readonly trim: RampName;
    readonly legs: RampName;
    readonly tail: RampName;
    readonly tailTip: RampName;
  };
  readonly variants: BodyVariants;
  /**
   * Sleeve ramp and tone, independent of the bodice (RIG.md «arm over torso»). Default: the cloth ramp at shade 2,
   * one step under the bodice (3); on the cloth ramp the shade must differ from the bodice by >= 1 (build throws).
   */
  readonly sleeve?: { readonly ramp?: RampName; readonly shade?: number };
  /** Base shade (0..5) of the bodice and skirt on the cloth ramp (default `BODICE_SHADE`, 3). */
  readonly dressShade?: number;
  /**
   * Opt-in (long sleeves only): the bell cuff sits over the hand so only 1–2 fingertip px show below it; with the
   * hand above the shoulder the sleeve slides back (2–3 px of hand). The chin fist becomes a lace-wrapped paw.
   */
  readonly sleeveOverHand?: true;
  /** Bell-cuff ramp and shade (0..5); default the clothAlt ramp at shade 3 (the hem lace keeps clothAlt). */
  readonly cuff?: { readonly ramp: RampName; readonly shade: number };
  /**
   * Opt-in outer silhouette outline for dark ramps: outer-outline px taken from each listed ramp get its shade `lit`
   * on the lit (top-left) side and `shade` elsewhere (0..5), so a near-black figure never melts into a dark backdrop.
   */
  readonly silhouetteOutline?: readonly SilhouetteOutline[];
  /**
   * Opt-in: the near (screen-left) sleeve's outer edge px (left neighbour not arm or torso) take this sleeve-ramp shade
   * (0..5), a 1-px lit rim from shoulder to cuff so a dark sleeve reads against dark hair; the far sleeve keeps its tone.
   */
  readonly sleeveRim?: number;
  /** Authored head (skin, fringe, crown; horns when `headAcc` is `horns`); `at` from the head joint. */
  readonly head: PlacedMask & { readonly band: number };
  readonly face: FaceLibrary;
  readonly masks: {
    /** One shoe, top-left = foot − (2, 0.6). */
    readonly shoe: Mask;
    readonly headAcc?: PlacedMask;
    readonly neckAcc?: PlacedMask;
    /** Spade tip of `spade_tail`, hung by its top-centre px. */
    readonly spade?: Mask;
  };
  /**
   * Apron (clothAlt ramp): `bib` is an authored mask on the bodice (`at` from the neck joint; torso part, so the
   * arm-over-torso pass and check treat it as torso; drawn under `neckAcc`); the front panel is `panelW` px wide on
   * the skirt from the waist band to 1 row above the hem, with a 1-px frill on its sides and bottom.
   */
  readonly apron?: Apron;
  /** Outline ramp for px next to the horns (so ivory never reads as a pale ear). */
  readonly hornOutline?: RampName;
  /**
   * Per-body nudge of the shared `chin` hand (think), in px; `dx` points toward the body's centre line for both
   * sides. Default: none (the shared pose puts the fist under the chin of the standard head).
   */
  readonly chinHand?: Offset;
  /**
   * Back-hair length below the temples as a stretch factor (default: `hairBack` short 1 / long 1.45); a small
   * factor (e.g. 0.2) gives a short mop ending at the nape.
   */
  readonly hairBackStretch?: number;
  /** Procedural side-lock chains (default true); false = the head mask's own (short) locks only. */
  readonly sideLocks?: boolean;
  /**
   * Opt-in: each drawn side lock is one straight lean from its root to its simulated tip (`leanLock`), so a lagging
   * chain never steps out locally (no headphone bulge at cheek height); the tip keeps its secondary motion.
   */
  readonly lockLean?: true;
  /**
   * Tailored shorts (`hem: 'shorts'`): `shade` of the clothAlt ramp (0..5, default 3), hem raised `raise` rows;
   * the front view adds a 1-px notch between the legs and a 1-px outward flare at each leg hem.
   */
  readonly shorts?: { readonly shade: number; readonly raise: number };
  /**
   * Shin wraps: a darker legs-ramp row `row` rows above each foot joint, in `shade` (0..5, default 3); only leg px
   * (near and far) are painted.
   */
  readonly shinWrap?: { readonly row: number; readonly shade?: number };
  /** Waist sash: band height in rows (default 1) and a knot mask on the near hip (from the hip joint). */
  readonly sash?: { readonly rows: number; readonly knot: PlacedMask };
  /** Fox tail shape per view (default: the rig's dummy-b tail). */
  readonly foxTail?: FoxTail;
  /** Front scarf ends (required with `neckAcc: 'scarf'`). */
  readonly scarf?: ScarfEnds;
  /** Rest offsets per joint (proportions), never per-animation forks. */
  readonly tweaks?: Partial<Readonly<Record<Joint, Offset>>>;
  /** Authored parts per non-front view; a body without `q34` fails the build when any pose uses q34. */
  readonly views?: { readonly q34?: BodyView };
}
