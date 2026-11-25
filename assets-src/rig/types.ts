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
  /** `hat`: a crown-covering mask stamped over the head like `clip`, bounded by `HAT_MAX` (validateBody). */
  readonly headAcc: 'none' | 'horns' | 'fox_ears' | 'clip' | 'hat';
  readonly hairBack: 'short' | 'long';
  readonly hem: 'skirt' | 'shorts';
  /** `cloak`: a procedural panel behind the body (`Body.cloak`, required). */
  readonly back: 'none' | 'spade_tail' | 'fox_tail' | 'cloak';
  /**
   * `collar`: a mantle / collar mask on the neck-mask path (mask only, like `choker`; needs `masks.neckAcc`), never
   * stamped over arm px (the arms draw over a mantle).
   */
  readonly neckAcc: 'none' | 'bow' | 'choker' | 'scarf' | 'collar';
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

/**
 * Cloak (`back: 'cloak'`): a procedural panel behind the back hair from the shoulder line to a hem below the hip,
 * the same params in both views (q34: trailing from the back, leading edge behind the torso). Widths are half-widths
 * from the body axis in px; rows are whole frame rows. Tones are final (locked): `shade` fill, `litShade` on the lit
 * (screen-left) edge column, bands and dither as listed. Binary alpha; texture is fixed to cloak coordinates.
 */
export interface Cloak {
  readonly ramp: RampName;
  /** Fill shade (0..5). */
  readonly shade: number;
  /** Lit-edge shade (0..5) on the screen-left edge column; default `shade`. */
  readonly litShade?: number;
  /** Top row offset from the shoulder joints' row (0 = the shoulder line, negative = higher). */
  readonly top: number;
  /** Hem row offset from the hip joint (standing). */
  readonly hemRow: number;
  /** Half-widths at the top and the hem; `column` reaches the hem width within the first third, `bell` flares evenly. */
  readonly widths: { readonly top: number; readonly hem: number; readonly shape: 'bell' | 'column' };
  /** `square`: full width on the top row; `round`: the top row 1 px in each side. */
  readonly shoulder: 'square' | 'round';
  readonly hem: {
    /** Rounded lobes per side (0 = a straight hem); 1-row dips between lobes. */
    readonly lobes: number;
    /** Outer corners drop this many rows below the hem (pointed corners; default 0). */
    readonly cornerDrop?: number;
    /** Outer corners curl up this many rows in a stepped 1-px wisp, attached (default 0). */
    readonly curl?: number;
    /** Shade of the 1-px curl line above each lobe dip (default none). */
    readonly curlShade?: number;
    /**
     * Opt-in (MA-46): `count` regular tapered tongues per side hanging under the hem, evenly spaced over the outer
     * `span` px of each side (so they clear a hem / skirt in front), each `length` rows (≤ `CLOAK_MAX.wispLength`)
     * narrowing 1 px per row (3 → 2 → 1); `tipShade` on the last row.
     */
    readonly wisps?: {
      readonly count: number;
      readonly length: number;
      readonly span: number;
      readonly tipShade?: number;
    };
  };
  /**
   * Opt-in inner shadow: cloak px 4-touching a drawn hem / leg / torso px take this shade (0..5), a 1-px column where
   * the panel meets the body so a pale cloak never fuses with the skirt into one shape.
   */
  readonly innerShade?: number;
  /** Horizontal bands (rows above the hem row, 1 row each) with rounded ends (inset 2 px); may be empty. */
  readonly bands: readonly { readonly row: number; readonly shade: number }[];
  /** Ordered 2-tone dither on these rows above the hem, only on interior px (all 8 neighbours cloak). */
  readonly dither?: { readonly rows: readonly number[]; readonly shades: readonly [number, number] };
  /** Turned-back corner lining: a stepped triangle `corner` [w, h] px at each outer hem corner. */
  readonly lining?: { readonly ramp: RampName; readonly shade: number; readonly corner: readonly [number, number] };
  /** Extra lining rows shown on flare frames (hairLift, squash > 0); default 0. */
  readonly flareRows?: number;
  /** Max px the hem trails sideways (front: hip lag + hairDx; q34: behind the hip). Default `CLOAK_MAX_TRAIL` 2. */
  readonly maxTrail?: number;
}

/**
 * A prop (e.g. a sheathed sword) on the hip joint at depth `behindTorso`: drawn over the cloak, tail, back hair and
 * empty px, under the torso, hem, legs and arms. `dangle` (e.g. a charm) is stamped after it, offset 1 px against the
 * hip lag + the frame's `hairDx` (clamped to ±1).
 */
export interface Prop extends PlacedMask {
  /** `overHem`: the dangle hangs in front of the skirt and legs (never over an arm), e.g. a charm over a hakama. */
  readonly dangle?: PlacedMask & { readonly overHem?: true };
  /**
   * Front projection (MA-45 round 2): a foreshortened hilt poking toward the viewer, offset from the prop's `at`,
   * stamped over the torso, hem and legs (never over an arm) while the main mask stays behind them.
   */
  readonly hilt?: PlacedMask;
  /**
   * Opt-in layering (MA-46): `'hilt'` stamps the hilt over the arms too (only the hands and cuffs stay on top);
   * `'all'` lays the main mask over the cloak, hem, legs and sleeves (a saya worn across the coat, front view; the
   * hilt stays under the arms),
   * validated with the other prop bounds.
   */
  readonly over?: 'hilt' | 'all';
}

/** Head-accessory masks shared by the front body and every view. */
export interface HeadAccMasks {
  readonly headAcc?: PlacedMask;
  /**
   * Opt-in follow-through: the head-accessory mask stamped instead of `headAcc` on frames whose head is higher
   * than on the previous frame (e.g. a hat tip drooping 1 px while the head rises); same size as `headAcc.mask`.
   */
  readonly headAccRising?: Mask;
}

/** Per-view authored parts (ADR 010): a body supplies them for every non-front view its poses use. */
export interface BodyView {
  readonly head: PlacedMask & { readonly band: number };
  /** Only the expressions the view's poses reference are required (q34: neutral, blink). */
  readonly face: ViewFaceLibrary;
  readonly masks: HeadAccMasks & {
    /** Side shoe, toe forward (screen-right); top-left = foot − (2, 0.6). */
    readonly shoe: Mask;
    readonly neckAcc?: PlacedMask;
    /**
     * q34 far back hair (from the head joint): an authored sliver beyond the far jaw line. When set, the procedural
     * back hair keeps clear of the facing side under the jaw (only the nape behind the neck shows).
     */
    readonly hairFar?: PlacedMask;
    /**
     * Opt-in authored back hair (from the head joint, final tones, behind the head / neck / torso, over the cloak):
     * replaces the procedural back-hair mass on frames whose head uses this view (e.g. a short q34 nape that hugs the
     * skull instead of a bob); the side-lock chains are unaffected.
     */
    readonly hairBack?: PlacedMask;
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
  /** Prop in this view (from the hip joint); required when the body has `Body.prop`. */
  readonly prop?: Prop;
  /** Sash knot in this view (from the hip joint); default none. */
  readonly sashKnot?: PlacedMask;
  /** Scarf ends in this view (required with `neckAcc: 'scarf'`). */
  readonly scarf?: ScarfEnds;
  /**
   * Opt-in follow-through: the back-hair tips add the previous frame's `hairDx` to their own (≤ 2 px), so long hair
   * lags the stride by a frame instead of moving as one slab.
   */
  readonly hairTipLag?: true;
  /**
   * Opt-in clump tips on the trailing edge of the back hair: on each listed row (frame rows from the head joint) the
   * outermost back-hair px is cleared (the edge steps in 1 px) and the px outside the edge on the row above becomes
   * hair (a 1-px outward flick); `nape` (rows from the neck joint) darkens the back-hair px touching the neck or
   * collar on that row to hair shade 0 (a nape indent).
   */
  readonly hairBackCuts?: { readonly rows: readonly number[]; readonly nape?: number };
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
   * Opt-in (MA-46): a forearm guard on one arm (rig side; front `L` = the character's right): that arm's cuff px
   * take `ramp` / whole `shade`, `stud.count` of them spread evenly (row-major) the stud tone (e.g. 2 brass px).
   */
  readonly kote?: {
    readonly side: 'L' | 'R';
    /** Guard height in rows (default 1 = the cuff only); extra rows climb the forearm, lighter and 1 px narrower. */
    readonly rows?: number;
    readonly ramp: RampName;
    readonly shade: number;
    readonly stud: { readonly ramp: RampName; readonly shade: number; readonly count: number };
  };
  /**
   * Opt-in outer silhouette outline for dark ramps: outer-outline px taken from each listed ramp get its shade `lit`
   * on the lit (top-left) side and `shade` elsewhere (0..5), so a near-black figure never melts into a dark backdrop.
   */
  readonly silhouetteOutline?: readonly SilhouetteOutline[];
  /**
   * Opt-in: only the near (L, screen-left) sleeve's outer edge px (left neighbour not arm or torso) take this whole
   * sleeve-ramp shade (0..5), a 1-px lit rim from shoulder to cuff so a dark sleeve reads against dark hair; the far
   * (R) sleeve is never lit, in front and q34 views alike.
   */
  readonly sleeveRim?: number;
  /** Authored head (skin, fringe, crown; horns when `headAcc` is `horns`); `at` from the head joint. */
  readonly head: PlacedMask & { readonly band: number };
  readonly face: FaceLibrary;
  readonly masks: HeadAccMasks & {
    /** One shoe, top-left = foot − (2, 0.6). */
    readonly shoe: Mask;
    readonly neckAcc?: PlacedMask;
    /** Spade tip of `spade_tail`, hung by its top-centre px. */
    readonly spade?: Mask;
    /**
     * Opt-in authored front back hair (MA-46; same contract as `BodyView.masks.hairBack`): replaces the procedural
     * back-hair mass on front-head frames, e.g. short hair that must not show as a bob beside a narrow face.
     */
    readonly hairBack?: PlacedMask;
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
   * Opt-in (MA-46 F3, long sleeves): haori tamoto — every sleeve cloth px flat at `shade` (no lit stroke streaks), a
   * 1-px `lineShade` seam row under each shoulder joint, 2 short diagonal folds from the elbow and a shadow row 2 rows
   * above the hand (all in the sleeve ramp, locked).
   */
  readonly tamoto?: { readonly shade: number; readonly lineShade: number };
  /**
   * Opt-in (MA-46): the last pass gives every px of this ramp that has no 4-neighbour of the same ramp the most
   * common opaque 4-neighbour colour (ties → the darker), so a pale cloth (e.g. ronin's mist haori sleeves) never
   * leaves a 1-px speck at a cuff, hand or lapel (a floating pale dot reads as a hitodama).
   */
  readonly despeckle?: RampName;
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
  /** Opt-out of the petticoat lace (default true); false = plain cloth to the same hem length, e.g. a hakama. */
  readonly skirtLace?: boolean;
  /** Skirt hem raised this many whole rows (`hem: 'skirt'`, 0..`SKIRT_RAISE_MAX`), so more legwear shows. */
  readonly skirtRaise?: number;
  /**
   * Opt-in: leg px on each leg's lit (screen-left) outer edge — left neighbour not a leg px — take this whole
   * legs-ramp shade (0..5), a 1-px lit side on pale legwear; shin wraps paint over it.
   */
  readonly legRim?: number;
  /**
   * Waist sash: band height in rows (default 1), a knot mask on the near hip (from the hip joint) and `dy` whole rows
   * lower than the default waist band (0..`SASH_DY_MAX`, default 0; the torso shows between a collar and the sash).
   */
  readonly sash?: { readonly rows: number; readonly knot: PlacedMask; readonly dy?: number };
  /** Cloak panel (required with `back: 'cloak'`). */
  readonly cloak?: Cloak;
  /** Front prop on the hip joint (`Prop`); a q34 pose needs `views.q34.prop` too. */
  readonly prop?: Prop;
  /**
   * Front only: a 1-px centre line `rows` high from the skirt hem in cloth `shade` (0..5, whole), e.g. a hakama split;
   * `notch` cuts a 2-px gap that many rows up from the hem between the legs (default 0).
   */
  /**
   * Opt-in hakama (MA-46): the skirt (and every `skirtSplit` tone) in its own `ramp` / whole `shade` instead of the
   * cloth ramp + `dressShade`, and `drop` extra hem rows on every leg pose (≤ `HAKAMA_DROP_MAX`) so the trapezoid
   * reaches the ankles over the split legs (standing, dangling, seated and curled alike; never bare legs).
   */
  readonly hakama?: { readonly ramp: RampName; readonly shade: number; readonly drop: number };
  readonly skirtSplit?: {
    readonly rows: number;
    readonly shade: number;
    readonly notch?: number;
    /** Opt-in: the notch px (legs or the cloak behind) take this cloth shade (0..5): an inner leg shadow. */
    readonly notchShade?: number;
    /** Opt-in (MA-46): notch half-width in px from the hip axis (default 1 = the 2-px gap; ≤ 3), legs read apart. */
    readonly notchHalf?: number;
    /** Opt-in: skirt hem half-width in px (default 10; a straight trapezoid, e.g. hakama legs, not a bell). */
    readonly hemHalf?: number;
    /**
     * Opt-in pleats (front): 1-px vertical lines in cloth `shade` at each listed px offset from the split, mirrored to
     * both legs, from the split top to the hem; `lit` (optional) paints the px left of the screen-left leg's lines.
     */
    readonly pleats?: { readonly offsets: readonly number[]; readonly shade: number; readonly lit?: number };
    /**
     * Opt-in 2-step rim on the skirt's screen-left edge (front): the outermost hem px take cloth `shade`, the stepped
     * (lit) px whose up-left neighbour is not skirt take `lit`.
     */
    readonly rim?: { readonly shade: number; readonly lit: number };
    /**
     * Opt-in q34 split (the skirt breaks into two leg panels): on contact frames (feet ≥ `SPLIT_Q34_CONTACT_DX` px
     * apart) a 1-px `shade` line `rows` up from the hem along the leg gap (hip → mid-feet), a 2-px `notch` (notchShade
     * or shade) and the bottom 2 hem rows of the front panel 1 px forward / the back panel 1 px back; passing frames
     * get the 2-px `passNotch` only. `pleat` (cloth shade) = 1 line on the near (L) leg.
     */
    readonly q34?: {
      readonly rows: number;
      readonly notch: number;
      readonly passNotch: number;
      readonly pleat?: number;
      /** Opt-in (MA-46): the notch px are cut out (see-through leg gap) instead of painted. */
      readonly clear?: true;
    };
  };
  /** Fox tail shape per view (default: the rig's dummy-b tail). */
  readonly foxTail?: FoxTail;
  /** Front scarf ends (required with `neckAcc: 'scarf'`). */
  readonly scarf?: ScarfEnds;
  /** Rest offsets per joint (proportions), never per-animation forks. */
  readonly tweaks?: Partial<Readonly<Record<Joint, Offset>>>;
  /** Authored parts per non-front view; a body without `q34` fails the build when any pose uses q34. */
  readonly views?: { readonly q34?: BodyView };
}
