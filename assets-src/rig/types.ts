// Shared rig contract (plan M-ART MA-23, docs/art/RIG.md). Coordinates are 48-px figure units with the feet on row 46
// of the 48-px figure box; the frame adds headroom rows on top (frame 48 × RIG_H, ADR 009). A body (per character)
// gives rest-joint tweaks, slot variants, ramps and authored masks; a pose (shared by every body) gives per-frame
// joint offsets, part variants, the face expression, squash and breath. Bodies never fork an animation.
import type { RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import type { Mask, Outfit } from '../lib/mask.ts';
import type { ExpressionId, FaceLibrary } from './face.ts';

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

export type DrawOrder = 'arms_front' | 'arm_l_back' | 'arm_r_back' | 'arms_back';

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
   * Maid apron (clothAlt ramp): `bib` is an authored mask on the bodice (`at` from the neck joint; torso part, so the
   * arm-over-torso pass and check treat it as torso; drawn under `neckAcc`); the front panel is `panelW` px wide on
   * the skirt from the waist band to 1 row above the hem, with a 1-px frill on its sides and bottom.
   */
  readonly apron?: { readonly bib: PlacedMask; readonly panelW: number };
  /** Outline ramp for px next to the horns (so ivory never reads as a pale ear). */
  readonly hornOutline?: RampName;
  /**
   * Per-body nudge of the shared `chin` hand (think), in px; `dx` points toward the body's centre line for both
   * sides. Default: none (the shared pose puts the fist under the chin of the standard head).
   */
  readonly chinHand?: Offset;
  /** Rest offsets per joint (proportions), never per-animation forks. */
  readonly tweaks?: Partial<Readonly<Record<Joint, Offset>>>;
}
