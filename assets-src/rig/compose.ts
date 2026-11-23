// Rig composer (plan M-ART MA-23, docs/art/RIG.md), generalized from the 48-soft spike (assets-src/spike/maid.ts).
// One renderer per body: every shared pose frame → joints (body.ts) → procedural parts in composite order (back →
// hair_back → legs → hem → torso → arms by `order`) → compose (light, texture, AO, dither) → authored masks stamped
// and locked (neck_acc, head_acc, head + band, face parts, spade, shoes) → outline on the whole composite (so part
// seams never show) → selective outline → AA → masks restored → rim → quantize → squash rows at the waist.
// Secondary motion (side locks, long hair hem, tails) comes from looped verlet chains per animation.
import type { RgbaImage } from '../../tools/lib/png.ts';
import { createIndexBuffer, quantize, type IndexBuffer, type RampName } from '../lib/buffer.ts';
import { simulateChain, type Point } from '../lib/chain.ts';
import { checkMask, LEGEND, maskSize, type Mask, type Swatch } from '../lib/mask.ts';
import { toOklab, type Palette } from '../lib/palette.ts';
import { cloth, flat, MAT } from '../lib/materials.ts';
import { compose, outline, selectiveOutline, type Material, type Part } from '../lib/passes.ts';
import { antiAlias, rimLight } from '../lib/polish.ts';
import { curveX, ellipse, poly, rect, stroke, type Shape, type StrokePoint } from '../lib/shapes.ts';
import type { AnimDef, Facing, PackDef, RenderContext } from '../lib/types.ts';
import { frame as poseFrame } from './anims/kit.ts';
import { elbowOf, FIGURE_H, REST_Q34, resolveJoints, withBand } from './body.ts';
import { darkerMask, tipToe } from './q34.ts';
import { expressionParts, Q34_EXPRESSIONS, validateFace, type ExpressionId } from './face.ts';
import { SOFT as style } from './style.ts';
import type { ArmVariant, Body, BodyView, JointMap, PoseFrame, RigAnim, View } from './types.ts';

/** Body view of a frame (the frame is the single source of truth; default front). */
export const bodyViewOf = (anim: RigAnim, frame: number): View => anim.frames[frame]?.view ?? 'front';
/**
 * Manifest facing of an animation (ADR 010): `right` when any frame's body is q34 (authored facing screen-right),
 * else `front`. A leading q34 head alone (no q34 body) stays front.
 */
export const animFacing = (anim: RigAnim): Facing =>
  anim.frames.some((_, i) => bodyViewOf(anim, i) === 'q34') ? 'right' : 'front';
/** Head view of a frame: a leading `headView`, else the body view. */
export const headViewOf = (anim: RigAnim, frame: number): View =>
  anim.frames[frame]?.headView ?? bodyViewOf(anim, frame);
/** Does any frame of these animations use the view (body or head)? */
export const usesView = (anims: readonly RigAnim[], view: View): boolean =>
  anims.some((a) => a.frames.some((_, i) => bodyViewOf(a, i) === view || headViewOf(a, i) === view));

export const RIG_W = 48;
/** Frame height: the smallest of 52/56/60 that keeps row 0 clear in every frame (measured by tests/unit/art/rig). */
export const RIG_H = 56;
/** Standing-figure height for sizing (manifest `scaleRef`, ADR 009): S/M/L stay ×3/×4/×5 at 1080p / 125 %. */
export const SCALE_REF = FIGURE_H;
export const FRAME_H_CHOICES = [52, 56, 60] as const;

/** Smallest frame height whose headroom keeps ≥ 1 clear row above `lowestTop` (top opaque row, figure units). */
export function chooseFrameH(lowestTop: number): number {
  for (const h of FRAME_H_CHOICES) if (lowestTop + (h - FIGURE_H) >= 1) return h;
  throw new Error(`no frame height fits a figure reaching row ${String(lowestTop)}`);
}

/**
 * Squash (n > 0) removes n whole rows just above `cut` and moves everything above down; stretch (n < 0) duplicates
 * the row above `cut` and moves everything above up. Rows from `cut` down never move. No resampling.
 */
export function squashRows(img: RgbaImage, cut: number, n: number): RgbaImage {
  if (n === 0) return img;
  const row = img.width * 4;
  const data = new Uint8Array(img.data.length);
  data.set(img.data.subarray(cut * row), cut * row);
  for (let y = 0; y < cut; y++) {
    const src = n > 0 ? y - n : Math.min(y - n, cut - 1);
    if (src >= 0) data.set(img.data.subarray(src * row, (src + 1) * row), y * row);
  }
  return { width: img.width, height: img.height, data };
}

/** Back hair outline (head-joint units), built from named segments: crown, right tips, left tips. */
const HAIR_BACK_CROWN: readonly Point[] = [
  [-11.6, 0],
  [11.6, 0],
  [11.6, 7],
];
const HAIR_BACK_RIGHT: readonly Point[] = [
  [11.2, 12.6],
  [10.4, 16.2],
  [9.2, 14.6],
  [7.6, 16.6],
  [6, 14.4],
  [5.4, 14.8],
];
const HAIR_BACK_LEFT: readonly Point[] = [
  [-5.4, 14.8],
  [-6, 14.4],
  [-7.6, 16.6],
  [-9.2, 14.6],
  [-10.4, 16.2],
  [-11.2, 12.6],
  [-11.6, 7],
];
/** `short` = shoulder length (the spike maid), `long` stretches it to the waist. */
const HAIR_BACK: readonly Point[] = [...HAIR_BACK_CROWN, ...HAIR_BACK_RIGHT, ...HAIR_BACK_LEFT];
/**
 * q34 back hair for a head with an authored far lock (`masks.hairFar`): the right side tucks inside the face above
 * the jaw, and under the chin only the nape behind the neck shows (art round MA-27d-1: no beard/neck-shadow block).
 */
const HAIR_BACK_Q34_TUCKED: readonly Point[] = [
  ...HAIR_BACK_CROWN,
  [9, 9],
  [3, 10.5],
  [-2, 11.5],
  [-3, 14.8],
  ...HAIR_BACK_LEFT,
];
/** Mask depths of the q34 additions (apron ties over the skirt, far lock behind the head). */
const DEPTH_TIES = 1.6;
const DEPTH_HAIR_FAR = 0.5;
/** Far shoulder clip (`BodyView.hideFarShoulder`): rows under the far shoulder joint the clip reaches. */
const FAR_SHOULDER_CLIP_ROWS = 2;
const HAIR_STRETCH = { short: 1, long: 1.45 } as const;

/** q34 fox tail centre line from the back joint (px): down-back to a tip past the hair, level with the skirt. */
const FOX_TAIL_Q34: readonly Point[] = [
  [0, 0],
  [-4, -0.5],
  [-8, -1.2],
  [-12, -2.2],
  [-15, -3],
];

/** q34 fox tail points (frame px) for a back joint; the tip swings 1 px against the back-hair trail `hairDx`. */
export function q34FoxTail(back: Point, hairDx = 0): Point[] {
  return FOX_TAIL_Q34.map(([x, y], i) => [back[0] + x - (hairDx * i) / (FOX_TAIL_Q34.length - 1), back[1] + y]);
}

/** Spade tail centre line from the back joint (px, radius). */
const SPADE_TAIL: readonly StrokePoint[] = [
  [0, 0, 0.95],
  [3.5, 1.6, 0.9],
  [6.5, 2.4, 0.85],
  [8.5, 3.6, 0.8],
  [9.5, 5.2, 0.75],
];

const SLOT_MATERIAL: Readonly<Partial<Record<string, number>>> = {
  hair: MAT.hair,
  horn: MAT.horn,
  shoe: MAT.shoe,
  trim: MAT.trim,
};

interface Chains {
  readonly lockL: readonly (readonly Point[])[];
  readonly lockR: readonly (readonly Point[])[];
  readonly tail: readonly (readonly Point[])[];
}

const add = (p: Point, dx: number, dy: number): Point => [p[0] + dx, p[1] + dy];

export interface RigRenderer {
  readonly joints: (anim: RigAnim, frame: number) => JointMap;
  readonly render: (anim: RigAnim, frame: number, ctx: RenderContext) => RgbaImage;
  /** The frame plus a per-px part label map (`ARM_LABEL`, red channel) for the arm-over-torso check. */
  readonly renderLabeled: (anim: RigAnim, frame: number, ctx: RenderContext) => LabeledFrame;
  /** FX mark anchor (frame px) after squash. */
  readonly fxAnchor: (anim: RigAnim, frame: number) => Point;
}

export function createRigRenderer(body: Body, frameH: number = RIG_H): RigRenderer {
  const v = body.variants;
  const skin = body.outfit.skin.ramp;
  const sleeveRamp = body.sleeve?.ramp ?? body.ramps.cloth;
  const sleeveShade = body.sleeve?.shade ?? DEFAULT_SLEEVE_SHADE;
  if (sleeveRamp === body.ramps.cloth && Math.abs(sleeveShade - BODICE_SHADE) < 1) {
    throw new Error(
      `${body.id}: sleeves on the bodice ramp need >= 1 shade step from the bodice (arm-over-torso rule)`,
    );
  }
  /** Which way sleeve px step away from the bodice: lighter when the sleeve tone sits above it. */
  let sleeveDir: 1 | -1 = -1;
  const q34: BodyView | undefined = body.views?.q34;
  const headMasks = {
    front: withBand(body.head.mask, body.head.band),
    q34: q34 ? withBand(q34.head.mask, q34.head.band) : undefined,
  } as const;
  /** Authored parts of a view; q34 without `views.q34` throws (createRigPack reports it first, with the body id). */
  const viewParts = (view: View) => {
    if (view === 'front') {
      return {
        head: body.head,
        headMask: headMasks.front,
        face: body.face,
        masks: body.masks,
        apron: body.apron,
        hairFar: undefined,
        sleeveHairLine: undefined,
        hideFarShoulder: false,
      };
    }
    if (!q34 || !headMasks.q34) throw new Error(`${body.id}: q34 poses need Body.views.q34 (ADR 010)`);
    return {
      head: q34.head,
      headMask: headMasks.q34,
      face: q34.face,
      masks: q34.masks,
      apron: q34.apron,
      hairFar: q34.masks.hairFar,
      sleeveHairLine: q34.sleeveHairLine,
      hideFarShoulder: q34.hideFarShoulder === true,
    };
  };
  const jointCache = new Map<string, readonly JointMap[]>();
  const allJoints = (anim: RigAnim): readonly JointMap[] => {
    const hit = jointCache.get(anim.name);
    if (hit) return hit;
    const list = anim.frames.map((f, i) => resolveJoints(body, f, frameH, bodyViewOf(anim, i)));
    jointCache.set(anim.name, list);
    return list;
  };
  const joints = (anim: RigAnim, frame: number): JointMap => {
    const j = allJoints(anim)[frame];
    if (!j) throw new Error(`${body.id}/${anim.name}: no frame ${String(frame)}`);
    return j;
  };

  const chainCache = new Map<string, Chains>();
  const chains = (anim: RigAnim): Chains => {
    const hit = chainCache.get(anim.name);
    if (hit) return hit;
    const js = allJoints(anim);
    const kick = (f: number): Point => {
      const i = anim.frames[f]?.impulse;
      return i ? [i.x, i.y] : [0, 0];
    };
    const anchors = (fn: (j: JointMap) => Point): Point[] =>
      js.map((j, f) => {
        const p = fn(j);
        const k = kick(f);
        return [p[0] + k[0], p[1] + k[1]];
      });
    // q34 tails trail to screen-left (the facing is screen-right).
    const trailX = animFacing(anim) === 'right' ? -1 : 1;
    const lock = { segments: 3, length: 2.6, gravity: [0, 0.12] as Point, damping: 0.78, loop: anim.loop };
    const result: Chains = {
      lockL: simulateChain(
        anchors((j) => add(j.head, -10.6, 8)),
        lock,
      ).frames,
      lockR: simulateChain(
        anchors((j) => add(j.head, 10.6, 8)),
        lock,
      ).frames,
      tail:
        v.back === 'fox_tail'
          ? simulateChain(
              anchors((j) => add(j.back, trailX, 1)),
              { segments: 4, length: 2.4, gravity: [0.07 * trailX, -0.05], damping: 0.8, loop: anim.loop },
            ).frames
          : [],
    };
    chainCache.set(anim.name, result);
    return result;
  };

  const part = (shape: Shape, material: Material, partId: number, depth: number): Part => ({
    shape,
    material,
    partId,
    depth,
  });
  const hairMat = (shade: number): Material => ({
    id: MAT.hair,
    base: () => ({ ramp: body.ramps.hair, shade }),
    texture: (f) => (f.x % 7 === 0 || f.x % 7 === 3 ? -1 : 0),
  });
  /** Lace: scallops on the last row. */
  const lace = (shape: Shape, shade: number): Material => {
    const bottom = Math.max(...shape.fragments.map((f) => f.y));
    const ramp = body.ramps.clothAlt;
    const folds = cloth(MAT.apron, ramp, shade, { folds: 0.7, cell: 3, seed: `${body.id}:lace` });
    return { ...folds, base: (f) => (f.y === bottom && (f.x & 1) === 1 ? null : { ramp, shade }) };
  };
  const chainStroke = (points: readonly Point[], radii: readonly number[]): StrokePoint[] =>
    points.map(([x, y], i) => [x + 0.5, y + 0.5, radii[Math.min(i, radii.length - 1)] ?? 1]);

  const armParts = (j: JointMap, side: 'L' | 'R', arm: ArmVariant, view: View): { parts: Part[]; hand: Point } => {
    /**
     * q34 far hand (A4): mid skin tone (the outline pass gives its shadow edge), never the highlight; short sleeves
     * also shrink it 1 px (long-sleeve hands are already the small 1.2 radius; smaller hides them behind the torso).
     */
    const farHand = view === 'q34' && side === 'R';
    const shoulder = j[side === 'L' ? 'shoulderL' : 'shoulderR'];
    const elbow = elbowOf(j, side, arm, view);
    const hand = j[side === 'L' ? 'handL' : 'handR'];
    const longSleeve = v.sleeves === 'long';
    // Sleeves: own ramp/shade per body (default = the bodice ramp one step darker; never the bodice tone, so arms
    // read over the torso — RIG.md «arm over torso»). Ids per side so the contrast check can tell the arms apart.
    const sleeve = sleeveRamp;
    const SLEEVE_SHADE = sleeveShade;
    const ids = side === 'L' ? ARM_IDS_L : ARM_IDS_R;
    const parts: Part[] = [
      part(
        ellipse(shoulder[0] - (side === 'L' ? 0.1 : -0.1), shoulder[1] - 0.2, 2.6, 2.3, 0.9),
        cloth(MAT.cloth, sleeve, SLEEVE_SHADE + 0.2, { folds: 0.3, cell: 2 }),
        ids.upper,
        2,
      ),
      part(
        stroke([
          [...shoulder, 1.55],
          [...elbow, 1.3],
        ]),
        flat(MAT.cloth, sleeve, SLEEVE_SHADE),
        ids.upper,
        2,
      ),
      part(
        stroke([
          [...elbow, 1.2],
          [...hand, longSleeve ? 1.25 : 0.95],
        ]),
        longSleeve ? flat(MAT.cloth, sleeve, SLEEVE_SHADE) : flat(MAT.skin, skin, 4),
        ids.fore,
        2.1,
      ),
    ];
    // Arm end (rule iii): a cuff, then >= 2 px of hand skin past it. Long sleeves end in a bell cuff at the wrist
    // and never swallow the hand.
    const t = longSleeve ? 0.8 : 0.62;
    const cuff: Point = [elbow[0] + (hand[0] - elbow[0]) * t, elbow[1] + (hand[1] - elbow[1]) * t];
    const bell = longSleeve ? ellipse(cuff[0], cuff[1], 1.6, 0.75, 0.6) : ellipse(cuff[0], cuff[1], 1.3, 0.55, 0.6);
    parts.push(part(bell, flat(MAT.apron, body.ramps.clothAlt, 3), ids.end, 2.2));
    const handY = hand[1] + (hand[1] < shoulder[1] ? -0.4 : 0.4);
    const handR = farHand && !longSleeve ? 1.0 : longSleeve ? 1.2 : 1.3;
    const handShade = farHand ? 3 : 4.2;
    parts.push(part(ellipse(hand[0], handY, handR, handR + 0.05, 1), flat(MAT.skin, skin, handShade), ids.end, 2.3));
    return { parts, hand: [hand[0], handY] };
  };

  const renderLabeled = (anim: RigAnim, frame: number, ctx: RenderContext): LabeledFrame => {
    const p: PoseFrame | undefined = anim.frames[frame];
    if (!p) throw new Error(`${body.id}/${anim.name}: no frame ${String(frame)}`);
    const j = joints(anim, frame);
    // One-shot clips (land, startle) have no previous frame at frame 0: no lag there.
    const prevIndex = anim.loop ? (frame + anim.frames.length - 1) % anim.frames.length : Math.max(0, frame - 1);
    const prev = joints(anim, prevIndex);
    const ch = chains(anim);
    const hem = p.parts.hem ?? {};
    const flare = (hem.flare ?? 0) + Math.max(0, p.squash);
    const hemDx = hem.dx ?? 0;
    const lift = hem.lift ?? 0;
    const glow = p.breath === 1 ? 0.4 : 0;
    const bv = bodyViewOf(anim, frame);
    const hv = headViewOf(anim, frame);
    const q = bv === 'q34';
    /** Trailing side (q34 faces screen-right, so tails, hair mass and hem flare trail to screen-left). */
    const trailSide = q ? -1 : 1;
    const bodyParts = viewParts(bv);
    const headParts = viewParts(hv);
    /** q34 depth order: far arm + far leg first, behind everything else (ADR 010). */
    const far: Part[] = [];
    const back: Part[] = [];
    const behind: Part[] = [];
    const front: Part[] = [];

    // Back slot: tails. The spade tail follows the hip one frame late (the tip carries the full previous-frame hip
    // offset, the root none); its tube tones are set after compose (`tubeTones`).
    const hipLag: Point = [prev.hip[0] - j.hip[0], prev.hip[1] - j.hip[1]];
    // Back-hair tips trail by `hairDx` (walk passing frames, A5); the tail tip swings the other way (A6).
    const hairDx = p.hairDx ?? 0;
    const tailParts: Part[] = [];
    if (p.tailTucked) {
      // Tucked (turn f0): no tail tube; a spade tip is stamped under the hem below.
    } else if (v.back === 'spade_tail') {
      const tail = SPADE_TAIL.map(([x, y, r], i): StrokePoint => {
        const t = i / (SPADE_TAIL.length - 1);
        return [j.back[0] + trailSide * x + (hipLag[0] - hairDx) * t, j.back[1] + y + hipLag[1] * t, r];
      });
      tailParts.push(part(stroke(tail), flat(MAT.shoe, body.ramps.tail, 2.2), TAIL_ID, 0.1));
    } else if (v.back === 'fox_tail' && q) {
      // q34 (art round MA-27c-2): the tail hangs down and back from the trailing hip, a slim shaft leading to a tip
      // past the hair and skirt (never beside the near hand); the tip one ramp step under the front tip tone.
      const pts = q34FoxTail(j.back, hairDx);
      tailParts.push(
        part(stroke(chainStroke(pts, [1.5, 1.8, 1.8, 1.6, 1.3])), flat(MAT.fur, body.ramps.tail, 3), 2, 0.1),
        part(stroke(chainStroke(pts.slice(-2), [1.5, 1.1])), flat(MAT.fur, body.ramps.tailTip, 3), 2, 0.15),
      );
    } else if (v.back === 'fox_tail') {
      const raw = ch.tail[frame];
      const pts = raw?.map((pt, i): Point => [pt[0] - (hairDx * i) / Math.max(1, raw.length - 1), pt[1]]);
      if (pts) {
        tailParts.push(
          part(stroke(chainStroke(pts, [1.6, 2.3, 2.6, 2.3, 1.5])), flat(MAT.fur, body.ramps.tail, 3), 2, 0.1),
          part(stroke(chainStroke(pts.slice(-2), [1.9, 1.3])), flat(MAT.fur, body.ramps.tailTip, 4), 2, 0.15),
        );
      }
    }
    // Front: the tail hangs behind the hair. q34: it roots on the trailing side and its tip shows past the hair (A6).
    // Tucked (turn f0): no tube is built at all.
    if (!q) back.push(...tailParts);

    // Hair behind the head (+ lag below the temples), side locks.
    const stretch = HAIR_STRETCH[v.hairBack];
    // hairLift (jump up-beat): the hair below the temples and the side locks float 1 px up.
    const lag: Point = [prev.head[0] - j.head[0], p.hairLift === 1 ? -1 : prev.head[1] - j.head[1]];
    // q34 head: the back hair mass sits 2 px to the trailing side (2 px of it show behind the nape).
    const hx = j.head[0] + (hv === 'q34' ? -2 : 0);
    const hairOutline = headParts.hairFar ? HAIR_BACK_Q34_TUCKED : HAIR_BACK;
    const hair = hairOutline.map(([x, y]): [number, number] => {
      if (y <= 7) return [x + hx, y + j.head[1]];
      const t = (y - 7) / 9.6;
      return [x + hx + (lag[0] + hairDx) * t, 7 + (y - 7) * stretch + j.head[1] + lag[1] * t];
    });
    back.push(part(ellipse(hx, j.head[1] + 0.5, 11.6, 10.4, 0.9), hairMat(2), 1, 0));
    back.push(part(curveX(poly(hair), hx, 11), hairMat(1.6), 1, 0));
    // Side locks: below the root they trail the head by ≤ 1 px from the previous frame (walk, drag; art round 4).
    const trail: Point = [clamp1(lag[0]), clamp1(lag[1])];
    // q34 head: the far (screen-right) lock hides behind the cheek.
    for (const lock of hv === 'q34' ? [ch.lockL[frame]] : [ch.lockL[frame], ch.lockR[frame]]) {
      if (!lock) continue;
      const lagged = lock.map((pt, i): Point => (i === 0 ? pt : [pt[0] + trail[0], pt[1] + trail[1]]));
      back.push(part(stroke(chainStroke(lagged, [1.5, 1.25, 1.05, 0.8])), hairMat(2), 1, 0.2));
    }
    if (q) back.push(...tailParts);

    // Legs. Seated (`sit`): the thigh comes forward (a foreshortened knee just below the hem), the shin hangs from
    // the knee past the edge to the foot.
    const legMat = flat(MAT.fur, body.ramps.legs, 3.6);
    // q34: the far leg (R) is one ramp step darker (depth) and drawn behind everything.
    const farLegMat = flat(MAT.fur, body.ramps.legs, 2.6);
    const knees: Point[] = [];
    for (const [side, foot] of [
      [-1, j.footL],
      [1, j.footR],
    ] as const) {
      const top: StrokePoint = [j.hip[0] + side * (q ? 1.4 : 2.4), j.hip[1], 1.35];
      if (q) {
        (side === 1 ? far : back).push(
          part(stroke([top, [foot[0], foot[1], 1.15]]), side === 1 ? farLegMat : legMat, 3, side === 1 ? 0.7 : 0.8),
        );
        continue;
      }
      if (p.parts.legs === 'sit') {
        // Front view, thighs toward the viewer: the knee is a 1-px bump just under the (lifted) hem.
        const hemBottom = j.hip[1] + 1.1 - (p.parts.hem?.lift ?? 0);
        const knee: StrokePoint = [foot[0], hemBottom + 0.2, 1.3];
        knees.push([knee[0], knee[1]]);
        back.push(part(stroke([top, knee]), legMat, 3, 0.85));
        back.push(part(ellipse(knee[0], knee[1], 1.4, 1.1, 0.9), flat(MAT.fur, body.ramps.legs, 4), 3, 0.9));
        back.push(
          part(
            stroke([
              [knee[0], knee[1] + 0.8, 1.25],
              [foot[0], foot[1], 1.1],
            ]),
            legMat,
            3,
            0.8,
          ),
        );
      } else {
        back.push(part(stroke([top, [foot[0], foot[1], 1.15]]), legMat, 3, 0.8));
      }
    }

    // Hem slot: skirt (+ lace) or shorts; torso; neck; waist band.
    const cloth3 = (seed: string, folds: number, shade = 3): Material =>
      cloth(MAT.cloth, body.ramps.cloth, shade, { folds, cell: 3, seed: `${body.id}:${seed}` });
    const hip = j.hip;
    // q34 widths: the near (trailing, screen-left) side keeps the front half-width, the far side is foreshortened;
    // the hem flares 1 px more on the trailing side.
    const farW = q ? 0.78 : 1;
    const trailFlare = q ? 1 : 0;
    if (v.hem === 'skirt') {
      const skirt = poly([
        [hip[0] - 5.6, hip[1] - 10.1],
        [hip[0] + 5.6 * farW, hip[1] - 10.1],
        [hip[0] + 10 * farW + flare + hemDx, hip[1] + 0.1 - lift],
        [hip[0] - 10 - flare - trailFlare + hemDx, hip[1] + 0.1 - lift],
      ]);
      back.push(part(curveX(skirt, hip[0] + (q ? 1 : 0), 9), cloth3('skirt', 1), 4, 1));
      // Seated: the lace is clipped to 1 row so it ends above the knee bumps.
      const pet = rect(
        Math.round(hip[0] - 9.4 - flare - trailFlare + hemDx),
        Math.round(hip[1] + 0.1 - lift),
        Math.round(9.4 + 9.4 * farW + 2 * flare + trailFlare),
        p.parts.legs === 'sit' ? 1 : 2,
      );
      back.push(part(pet, lace(pet, 4), 4, 1.05));
    } else {
      const shorts = poly([
        [hip[0] - 5.4, hip[1] - 4.5],
        [hip[0] + 5.4 * farW, hip[1] - 4.5],
        [hip[0] + 6 * farW + flare + hemDx, hip[1] + 1.2 - lift],
        [hip[0] + 0.6 + hemDx, hip[1] + 1.2 - lift],
        [hip[0] + hemDx, hip[1] + 0.2 - lift],
        [hip[0] - 0.6 + hemDx, hip[1] + 1.2 - lift],
        [hip[0] - 6 - flare - trailFlare + hemDx, hip[1] + 1.2 - lift],
      ]);
      back.push(
        part(
          curveX(shorts, hip[0], 6),
          cloth(MAT.apron, body.ramps.clothAlt, 3, { folds: 0.6, cell: 3, seed: `${body.id}:shorts` }),
          4,
          1,
        ),
      );
    }
    const chest = j.chest;
    const waist = v.hem === 'skirt' ? -9.6 : -3.6;
    const half = v.hem === 'skirt' ? 5.6 : 6.2;
    behind.push(
      part(rect(Math.round(j.neck[0] - 1.8), Math.round(j.neck[1] - 1.4), 4, 3), flat(MAT.skin, skin, 2.2), 7, 0.9),
    );
    // q34 bodice: half-width near 4.8 / far 3.6, lit centre 1 px toward the facing.
    const bodice = poly([
      [chest[0] - 4.8, chest[1] - 2.6],
      [chest[0] + (q ? 3.6 : 4.8), chest[1] - 2.6],
      [hip[0] + half * farW, hip[1] + waist],
      [hip[0] - half, hip[1] + waist],
    ]);
    behind.push(part(curveX(bodice, chest[0] + (q ? 1 : 0), 6), cloth3('bodice', 0.4, BODICE_SHADE + glow), 7, 1));
    const band = v.hem === 'skirt' ? -10.1 : -4.6;
    behind.push(
      part(
        rect(Math.round(hip[0] - 5.4), Math.round(hip[1] + band), q ? 10 : 11, 1),
        flat(MAT.trim, body.ramps.trim, 2.4),
        8,
        1.6,
      ),
    );

    // Arms by draw order.
    const order = q ? 'q34' : (p.order ?? 'arms_front');
    const hands: Point[] = [];
    for (const side of ['L', 'R'] as const) {
      const { parts, hand } = armParts(j, side, side === 'L' ? p.parts.armL : p.parts.armR, bv);
      hands.push(hand);
      if (order === 'q34') {
        // Far arm (R) behind the torso: only the hand/cuff that clears it shows (swing_fwd).
        (side === 'R' ? far : front).push(...parts);
        continue;
      }
      const isBack = order === 'arms_back' || order === (side === 'L' ? 'arm_l_back' : 'arm_r_back');
      if (isBack) back.push(...parts);
      else front.push(...parts);
    }

    sleeveDir = toneOf(ctx, sleeveRamp, sleeveShade) > toneOf(ctx, body.ramps.cloth, BODICE_SHADE) ? 1 : -1;
    const buf = createIndexBuffer(RIG_W, frameH, ctx.palette);
    compose(buf, [...far, ...back, ...behind, ...front], ctx.rampSize, {
      light: { strength: style.light },
      occlusion: { radius: 1, strength: style.occlusion, cast: { length: 1, strength: 0.4 } },
      dither: { spread: style.dither, round: [body.ramps.hair] },
    });
    if (v.back === 'spade_tail') tubeTones(buf);
    // Opt-in arm clip (`BodyView.hideFarShoulder`): the far shoulder puff sits behind the neck and collar.
    if (q && bodyParts.hideFarShoulder) {
      const top = Math.round(j.shoulderR[1] + FAR_SHOULDER_CLIP_ROWS);
      for (let y = 0; y <= top && y < buf.height; y++) {
        for (let x = 0; x < RIG_W; x++) if (buf.partId[y * RIG_W + x] === ARM_IDS_R.upper) buf.clear(x, y);
      }
    }
    for (const [handX, handY] of hands) {
      const x = Math.round(handX + 0.6);
      const y = Math.round(handY + 0.5);
      if (buf.inBounds(x, y) && buf.get(x, y).material === MAT.skin) buf.shade[y * RIG_W + x] = 2;
    }

    const locked = new Map<number, readonly [number, number]>();
    const stamp = (
      mask: Mask,
      x: number,
      y: number,
      depth: number,
      fallback: number,
      under?: number,
      partId?: number,
    ): void => {
      stampMask(buf, body, mask, Math.round(x), Math.round(y), depth, fallback, locked, {
        ...(under === undefined ? {} : { under }),
        ...(partId === undefined ? {} : { partId }),
      });
    };
    let tieAt: Point | undefined;
    if (bodyParts.apron) {
      const ap = bodyParts.apron;
      apronPanel(buf, body, j.hip[0] + (ap.dx ?? 0), Math.round(j.hip[1] - 10.1) + 1, ap.panelW, locked);
      // Bib = torso (part 7), only over bodice px: never over a sleeve or hand in front of it.
      stampMask(
        buf,
        body,
        ap.bib.mask,
        Math.round(j.neck[0] + ap.bib.at[0]),
        Math.round(j.neck[1] + ap.bib.at[1]),
        1.65,
        MAT.apron,
        locked,
        { partId: 7, allow: (id) => TORSO_PARTS.has(id) },
      );
      // Ties: over the skirt, bodice and tail, never over an arm (the near arm swings in front of them).
      if (ap.ties) {
        const t = ap.ties;
        tieAt = [Math.round(j.hip[0] + t.at[0]), Math.round(j.hip[1] + t.at[1])];
        stampMask(buf, body, t.mask, tieAt[0], tieAt[1], DEPTH_TIES, MAT.apron, locked, { allow: NOT_ARM });
      }
    }
    const neckAcc = bodyParts.masks.neckAcc;
    // Collar accessory = torso trim (part 8): the arm-over-torso pass and check cover the shoulder seam against it.
    if (neckAcc) stamp(neckAcc.mask, j.neck[0] + neckAcc.at[0], j.neck[1] + neckAcc.at[1], 1.7, MAT.trim, undefined, 8);
    const hairFar = headParts.hairFar;
    const hairFarPx = hairFar
      ? stampMask(
          buf,
          body,
          hairFar.mask,
          Math.round(j.head[0] + hairFar.at[0]),
          Math.round(j.head[1] + hairFar.at[1]),
          DEPTH_HAIR_FAR,
          MAT.hair,
          locked,
        )
      : [];
    const headAcc = headParts.masks.headAcc;
    const accFirst = v.headAcc === 'fox_ears';
    if (headAcc && accFirst) stamp(headAcc.mask, j.acc[0] + headAcc.at[0], j.acc[1] + headAcc.at[1], 3.4, MAT.hair);
    stamp(headParts.headMask, j.head[0] + headParts.head.at[0], j.head[1] + headParts.head.at[1], 3.5, MAT.skin);
    if (headAcc && !accFirst) stamp(headAcc.mask, j.acc[0] + headAcc.at[0], j.acc[1] + headAcc.at[1], 3.6, MAT.trim);
    const armsUp = p.parts.armL === 'up' && p.parts.armR === 'up';
    for (const fp of expressionParts(headParts.face, p.face, armsUp, p.irisDx === 1)) {
      stamp(fp.mask, j.face[0] + fp.at[0], j.face[1] + fp.at[1], 3.6, MAT.skin, MAT.hair);
    }
    // think: the fist is stamped over the bow/bib under the chin (after the head), its top row in shadow where it
    // meets the jaw, the cuff between the fist and the forearm so the hand never melts into the face.
    for (const [side, arm, hand] of [
      ['L', p.parts.armL, j.handL],
      ['R', p.parts.armR, j.handR],
    ] as const) {
      if (arm !== 'chin') continue;
      const mask = v.sleeves === 'long' ? FIST_LONG : FIST;
      const flip = (m: Mask): Mask => (side === 'R' ? m : m.map((r) => r.split('').reverse().join('')));
      const end = (side === 'L' ? ARM_IDS_L : ARM_IDS_R).end;
      const w = maskSize(mask).w;
      const fx = side === 'R' ? Math.round(hand[0]) - 2 : Math.round(hand[0]) + 2 - (w - 1);
      stamp(flip(mask), fx, Math.round(hand[1]) - 1, 3.7, MAT.skin, undefined, end);
      // The break between fist and jaw: not an arm px (it is the jaw's shadow line).
      stamp(flip(FIST_BREAK), fx, Math.round(hand[1]) - 2, 3.7, MAT.skin, undefined, 0);
    }
    if (v.back === 'spade_tail' && body.masks.spade && p.tailTucked) {
      // Tucked: the spade hangs under the hem near the centre, behind the skirt, lace and shoes (only its tip shows).
      const sx = Math.round(j.hip[0] + 1) - (maskSize(body.masks.spade).w >> 1);
      const sy = Math.round(j.hip[1] + 0.1);
      stampMask(buf, body, body.masks.spade, sx, sy, 0.15, MAT.shoe, locked, { allow: UNDER_HEM });
    } else if (v.back === 'spade_tail' && body.masks.spade) {
      const tip: Point = [j.back[0] + trailSide * 9.5 + hipLag[0], j.back[1] + 5.2 + hipLag[1]];
      const w = maskSize(body.masks.spade).w >> 1;
      const sx = Math.round(tip[0] - 0.5) - w;
      const sy = Math.round(tip[1] - 0.5);
      stamp(body.masks.spade, sx, sy, 0.15, MAT.shoe);
      // Below its first (shaft) row the spade's '.' px are cut out and stay transparent through outline and AA, so the
      // barbs and the base notch never fill in with the tail tube or its outline.
      body.masks.spade.forEach((row, r) => {
        if (r === 0) return;
        for (let c = 0; c < row.length; c++) {
          if (row.charAt(c) !== '.' || !buf.inBounds(sx + c, sy + r)) continue;
          buf.clear(sx + c, sy + r);
          locked.set((sy + r) * RIG_W + sx + c, [-1, 0]);
        }
      });
    }
    // Hanging feet (seated, dragged) point their toes down 1 px.
    const shoe =
      p.parts.legs === 'sit' || p.parts.legs === 'dangle' ? pointToe(bodyParts.masks.shoe) : bodyParts.masks.shoe;
    if (q) {
      // q34: far shoe (R) one ramp step darker (A2), stamped first so the near shoe overlaps it; a foot lifted ≥ 2 px
      // (passing frames) tips its toe down 1 px (A1).
      const ground = REST_Q34.footL[1] + frameH - FIGURE_H;
      for (const [foot, far] of [
        [j.footR, true],
        [j.footL, false],
      ] as const) {
        const lifted = ground - foot[1] >= 2 ? tipToe(shoe) : shoe;
        stamp(far ? darkerMask(lifted) : lifted, foot[0] - 2, foot[1] - 0.6, 0.9, MAT.shoe);
      }
    } else {
      for (const foot of [j.footL, j.footR]) stamp(shoe, foot[0] - 2, foot[1] - 0.6, 0.9, MAT.shoe);
    }
    // Seated: a 1-px darker crease under each knee bump, where the shin folds behind it.
    for (const [kx, ky] of knees) {
      const y = Math.round(ky + 1.1);
      for (let x = Math.round(kx) - 1; x <= Math.round(kx) + 1; x++) {
        if (!buf.inBounds(x, y) || buf.get(x, y).material !== MAT.fur) continue;
        const i = y * RIG_W + x;
        buf.shade[i] = 1;
        locked.set(i, [buf.ramp[i] ?? -1, 1]);
      }
    }

    const map = outline(buf, ctx.rampSize, { drop: style.drop, internal: true });
    if (body.hornOutline) recolorHornOutline(buf, map, body.hornOutline);
    selectiveOutline(buf, map, { lit: 'lighter' });
    if (style.aa) antiAlias(buf, map);
    for (const [i, [ramp, shade]] of locked) {
      buf.ramp[i] = ramp;
      buf.shade[i] = shade;
    }
    rimLight(buf, map, ctx.rampSize, { strength: style.rim });
    // The far lock keeps its authored hair-shadow tones: rim light would lift its outer edge into a forward tuft
    // (art round MA-27d-2). Only px still hair are restored (nothing drawn later over them is touched).
    for (const i of hairFarPx) {
      const tone = locked.get(i);
      if (tone && buf.material[i] === MAT.hair) [buf.ramp[i], buf.shade[i]] = tone;
    }
    // Last tone pass: the arm-over-torso separator must survive AA and rim (RIG.md rule ii).
    armOverTorso(buf, ctx.palette, sleeveDir);
    // Opt-in (`BodyView.sleeveHairLine`): a 1-px line where the near sleeve meets hair.
    if (bodyParts.sleeveHairLine) sleeveHairLine(buf, bodyParts.sleeveHairLine);
    // Apron ties: the hand crossing them gets a 1-px skin-dark edge; the ties keep their cream tones (MA-27d-2).
    const ties = bodyParts.apron?.ties;
    if (ties && tieAt)
      handLineOverTies(
        buf,
        ties.mask,
        tieAt,
        body.outfit.skin,
        ctx.palette.rampNames.indexOf(body.outfit.skin.ramp),
        ctx.palette.rampNames.indexOf(body.outfit.apron.ramp),
      );
    const cut = waistRow(j);
    return {
      image: closeSeams(squashRows(quantize(buf, ctx.palette), cut, p.squash)),
      labels: squashRows(labelImage(buf), cut, p.squash),
    };
  };
  const render = (anim: RigAnim, frame: number, ctx: RenderContext): RgbaImage => renderLabeled(anim, frame, ctx).image;
  const toneOf = (ctx: RenderContext, ramp: RampName, shade: number): number => {
    const c = ctx.palette.ramps.get(ramp)?.[shade];
    return c === undefined ? 0 : toOklab(c)[0];
  };

  const fxAnchor = (anim: RigAnim, frame: number): Point => {
    const j = joints(anim, frame);
    const squash = anim.frames[frame]?.squash ?? 0;
    return [Math.round(j.fx[0]), Math.round(j.fx[1]) + (j.fx[1] < waistRow(j) ? squash : 0)];
  };

  return { joints, render, renderLabeled, fxAnchor };
}

/**
 * Fills enclosed transparent gaps of ≤ 3 px (pinholes where outlines of neighbouring parts meet, e.g. between the
 * feet) with the darkest 4-neighbour colour. Larger enclosed spaces are intentional negative space and stay.
 */
export function closeSeams(img: RgbaImage): RgbaImage {
  const { width: w, height: h } = img;
  const data = new Uint8Array(img.data);
  const opaque = (i: number): boolean => (data[i * 4 + 3] ?? 0) > 0;
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start] === 1 || opaque(start)) continue;
    const stack = [start];
    const region: number[] = [];
    let border = false;
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      region.push(i);
      const x = i % w;
      const y = (i - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (n < 0 || seen[n] === 1 || opaque(n)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (border || region.length > 3) continue;
    for (const i of region) {
      const x = i % w;
      let best = -1;
      let lum = Infinity;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n < 0 || n >= w * h || !opaque(n)) continue;
        const l = (data[n * 4] ?? 0) * 3 + (data[n * 4 + 1] ?? 0) * 6 + (data[n * 4 + 2] ?? 0);
        if (l < lum) {
          lum = l;
          best = n;
        }
      }
      if (best >= 0) data.set(data.subarray(best * 4, best * 4 + 4), i * 4);
    }
  }
  return { width: w, height: h, data };
}

/** Bodice tone on the cloth ramp; the default sleeve tone sits one step under it. */
const BODICE_SHADE = 3;
const DEFAULT_SLEEVE_SHADE = 2;

export interface LabeledFrame {
  readonly image: RgbaImage;
  /** Red channel = `ARM_LABEL` value per px (alpha 255 where labelled). */
  readonly labels: RgbaImage;
}

/** Part labels exported for the arm-over-torso check (`assets-src/rig/checks.ts`). */
export const ARM_LABEL = { none: 0, sleeveL: 1, sleeveR: 2, endL: 3, endR: 4, torso: 5, trim: 6 } as const;
/** Part ids per arm: shoulder + upper arm, forearm, end (cuff + hand + chin fist). */
const ARM_IDS_L = { upper: 9, fore: 10, end: 11 } as const;
const ARM_IDS_R = { upper: 19, fore: 20, end: 21 } as const;
const LABEL_OF: Readonly<Partial<Record<number, number>>> = {
  9: ARM_LABEL.sleeveL,
  10: ARM_LABEL.sleeveL,
  11: ARM_LABEL.endL,
  19: ARM_LABEL.sleeveR,
  20: ARM_LABEL.sleeveR,
  21: ARM_LABEL.endR,
  7: ARM_LABEL.torso,
  8: ARM_LABEL.trim,
};

function labelImage(buf: IndexBuffer): RgbaImage {
  const data = new Uint8Array(buf.width * buf.height * 4);
  for (let i = 0; i < buf.width * buf.height; i++) {
    if ((buf.ramp[i] ?? -1) < 0) continue;
    const part = buf.partId[i] ?? 0;
    const bare = SLEEVE_PARTS.has(part) && buf.material[i] !== MAT.cloth;
    const label = bare ? (part < 19 ? ARM_LABEL.endL : ARM_LABEL.endR) : (LABEL_OF[part] ?? 0);
    if (label === 0) continue;
    data[i * 4] = label;
    data[i * 4 + 3] = 255;
  }
  return { width: buf.width, height: buf.height, data };
}
const clamp1 = (n: number): number => Math.max(-1, Math.min(1, Math.round(n)));

/**
 * Thinking fist under the chin (screen-right hand; mirrored for the left): a rounded 3 × 3 fist with a warm skin-dark
 * outline (skin shade, never near-black), its top row in shadow tone where it meets the jaw, lit from the top-left,
 * and a 1-px dress cuff on the forearm side so the hand separates from the face. Long sleeves end in the cream bell
 * cuff instead (rule iii).
 */
// LATER (art round MA-27-3): a 2-px darker outline break (`ZZ`) on the top row where the fist meets the jaw, and a
// 1-px knuckle highlight (`E`) on the lit knuckle.
// Round 2: the break is 2 px of the darker outline tone directly above the fist (`FIST_BREAK`, stamped without an arm
// part id), the knuckle highlight sits on the fist's top-left in the top skin tone, and the bottom-left corner is the
// skin mid tone so the procedural cuff under it never shows through as a stray dot.
const FIST: Mask = ['.Ezz..', 'ZSSsZd', 'ZSssZd', 'sZZZ..'];
const FIST_LONG: Mask = ['.Ezz..', 'ZSSsZa', 'ZSssZa', 'sZZZq.'];
const FIST_BREAK: Mask = ['.ZZ...'];

/** Sleeve part ids (both sides; ends 11 / 21 are hand + cuff) and torso ids (bodice/neck 7, waist band 8). */
const SLEEVE_PARTS = new Set([9, 10, 19, 20]);
const TORSO_PARTS = new Set([7, 8]);
const ARM_PARTS: ReadonlySet<number> = new Set([...Object.values(ARM_IDS_L), ...Object.values(ARM_IDS_R)]);
/** Part filter for masks that sit behind both arms. */
const NOT_ARM = (id: number): boolean => !ARM_PARTS.has(id);
/** Parts a tucked spade may cover: legs and empty px, never the skirt/lace or the torso. */
const UNDER_HEM = (id: number): boolean => id !== SKIRT_ID && !TORSO_PARTS.has(id);
/**
 * Hand px (arm-end parts, skin) 4-adjacent to a tie px (stamped apron px of `mask` at `at`) take the skin ramp's
 * shade-1 tone: a 1-px dark edge on the hand's back, so a swinging hand never melts into the cream bow; the ties
 * keep their cream tones (art round MA-27d-2).
 */
function handLineOverTies(
  buf: IndexBuffer,
  mask: Mask,
  at: Point,
  skin: Swatch,
  skinRamp: number,
  apronRamp: number,
): void {
  const w = buf.width;
  const tie = new Set<number>();
  mask.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const x = at[0] + c;
      const y = at[1] + r;
      if (row.charAt(c) !== '.' && buf.inBounds(x, y) && buf.material[y * w + x] === MAT.apron) tie.add(y * w + x);
    }
  });
  const hits: number[] = [];
  for (let i = 0; i < buf.partId.length; i++) {
    const id = buf.partId[i] ?? 0;
    if (id !== ARM_IDS_L.end && id !== ARM_IDS_R.end) continue;
    // A tie px (or a tie-outline px in the apron ramp) the outline pass handed to the hand is the hand's line itself.
    if (tie.has(i) || buf.ramp[i] === apronRamp) {
      hits.push(i);
      continue;
    }
    if (buf.material[i] !== MAT.skin) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    const touches = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].some(([u = 0, v = 0]) => buf.inBounds(u, v) && tie.has(v * w + u));
    if (touches) hits.push(i);
  }
  // Ramp too: an outlined hand edge px may sit on the outline ramp.
  for (const i of hits) [buf.ramp[i], buf.shade[i]] = [skinRamp, skin.tones[1]];
}

/** Near (L) sleeve part ids. */
const NEAR_SLEEVE: ReadonlySet<number> = new Set([ARM_IDS_L.upper, ARM_IDS_L.fore]);

/** Hair px 4-adjacent to a near-sleeve px take the plum ramp's shade-1 tone (a 1-px line on the hair side). */
function sleeveHairLine(buf: IndexBuffer, plum: RampName): void {
  const w = buf.width;
  const hits: [number, number][] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < w; x++) {
      if (buf.material[y * w + x] !== MAT.hair || (buf.ramp[y * w + x] ?? -1) < 0) continue;
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([u = 0, v = 0]) => buf.inBounds(u, v) && NEAR_SLEEVE.has(buf.partId[v * w + u] ?? 0));
      if (near) hits.push([x, y]);
    }
  }
  for (const [x, y] of hits) buf.set(x, y, { ramp: plum, shade: 1, material: MAT.hair, depth: 3 });
}

/** OKLab L step the composer keeps between sleeve fill and the bodice next to it (the test floor is 0.05). */
const SLEEVE_STEP_L = 0.06;

/**
 * Arm over torso (RIG.md rule i + ii), the last tone pass. (i) Value step: sleeve fill px within 2 px of a torso px
 * step away from the bodice tone (in the sleeve's direction: darker when the sleeve sits under the bodice) until
 * their OKLab L differs by ≥ SLEEVE_STEP_L, so lighting, AO and dither never merge them. (ii) Separator: the sleeve
 * px touching a torso px (in front or behind) takes the deepest tone (shade 0) of its ramp. Hands and cuffs are the
 * contrasting arm end (rule iii) and keep their tones; the outline pass already lines the bodice behind them.
 */
function armOverTorso(buf: IndexBuffer, palette: Palette, dir: 1 | -1): void {
  const w = buf.width;
  const lum = (ramp: string | null, shade: number): number => {
    const c = ramp === null ? undefined : palette.ramps.get(ramp)?.[Math.round(shade)];
    return c === undefined ? 0 : toOklab(c)[0];
  };
  const torsoAt = (x: number, y: number): boolean =>
    buf.inBounds(x, y) && (buf.ramp[y * w + x] ?? -1) >= 0 && TORSO_PARTS.has(buf.partId[y * w + x] ?? 0);
  const sleeveAt = (x: number, y: number): boolean =>
    buf.inBounds(x, y) &&
    (buf.ramp[y * w + x] ?? -1) >= 0 &&
    SLEEVE_PARTS.has(buf.partId[y * w + x] ?? 0) &&
    buf.material[y * w + x] === MAT.cloth;
  const edge: number[] = [];
  const steps: [number, number][] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < w; x++) {
      if (!sleeveAt(x, y)) continue;
      if (N4.some(([dx, dy]) => torsoAt(x + dx, y + dy))) {
        edge.push(y * w + x);
        continue;
      }
      // The bodice px across the separator: two steps away in a 4-direction, past a sleeve px that touches it.
      const near: number[] = [];
      for (const [dx, dy] of N4) {
        if (!sleeveAt(x + dx, y + dy) || !torsoAt(x + 2 * dx, y + 2 * dy)) continue;
        const q = buf.get(x + 2 * dx, y + 2 * dy);
        near.push(lum(q.ramp, Math.floor(q.shade)), lum(q.ramp, Math.ceil(q.shade)));
      }
      if (near.length === 0) continue;
      const self = buf.get(x, y);
      const size = palette.ramps.get(self.ramp ?? '')?.length ?? 1;
      const from = Math.round(self.shade);
      const ok = (s: number): boolean => near.every((l) => Math.abs(lum(self.ramp, s) - l) >= SLEEVE_STEP_L);
      // Smallest move, the sleeve's own direction first; shade 0 stays reserved for the separator.
      let shade = -1;
      for (let k = 0; k < size && shade < 0; k++) {
        for (const s of [from + dir * k, from - dir * k]) {
          if (shade < 0 && s >= 1 && s <= size - 1 && ok(s)) shade = s;
        }
      }
      if (shade >= 0) steps.push([y * w + x, shade]);
    }
  }
  for (const [i, shade] of steps) buf.shade[i] = shade;
  for (const i of edge) buf.shade[i] = 0;
}

/** Part id of the spade tail tube. */
const TAIL_ID = 2;

/**
 * Spade tail as a smooth 2-tone tube one ramp step under the spade (so the spade pops): the top px of every tail
 * column takes the rim tone (it also reads on dark wallpapers), the rest the shade tone; no lighting or dither noise.
 */
function tubeTones(buf: IndexBuffer): void {
  const w = buf.width;
  const isTail = (x: number, y: number): boolean =>
    buf.inBounds(x, y) && buf.partId[y * w + x] === TAIL_ID && buf.material[y * w + x] === MAT.shoe;
  const tone: [number, number][] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < w; x++) if (isTail(x, y)) tone.push([y * w + x, isTail(x, y - 1) ? 1 : 3]);
  }
  for (const [i, shade] of tone) buf.shade[i] = shade;
}

/** Skirt part id (skirt + petticoat lace). */
const SKIRT_ID = 4;

/**
 * Apron front panel (Body.apron): `w` px centred on the hip from `top` down to 1 row above the skirt's last row
 * (flat bottom, follows hem lift and flare), painted only over skirt cloth px (arms and hands in front stay). Lit left edge,
 * shaded right edge; the 1-px frill is a scallop (every other px) on the bottom row and a light/base ruffle on the
 * sides. Final tones, locked.
 */
function apronPanel(
  buf: IndexBuffer,
  body: Body,
  cx: number,
  top: number,
  w: number,
  locked: Map<number, readonly [number, number]>,
): void {
  const W = buf.width;
  const isSkirt = (x: number, y: number): boolean =>
    buf.inBounds(x, y) && buf.partId[y * W + x] === SKIRT_ID && buf.material[y * W + x] === MAT.cloth;
  const x0 = Math.round(cx - w / 2);
  const x1 = x0 + w - 1;
  // Hem = the lowest skirt cloth row under the panel (arms or hands in front only hide rows, never add them).
  let hem = -1;
  for (let x = x0; x <= x1; x++) for (let y = top; y < buf.height; y++) if (isSkirt(x, y)) hem = Math.max(hem, y);
  const bottom = hem - 1;
  const { ramp, tones } = body.outfit.apron;
  for (let y = top; y <= bottom; y++) {
    // A-line: the top row sits 1 px in on each side.
    const inset = y === top ? 1 : 0;
    for (let x = x0 + inset; x <= x1 - inset; x++) {
      if (!isSkirt(x, y)) continue;
      const side = x === x0 + inset || x === x1 - inset;
      let tone: number;
      if (y === bottom) {
        if (((x - x0) & 1) === 1) continue;
        tone = 5;
      } else if (side) tone = ((y - top) & 1) === 0 ? 5 : x === x0 ? 4 : 3;
      else tone = x === x0 + 1 ? 5 : x === x1 - 1 ? 3 : 4;
      const shade = tones[tone as 0 | 1 | 2 | 3 | 4 | 5];
      buf.set(x, y, { ramp, shade, material: MAT.apron, depth: 1.2, partId: SKIRT_ID });
      const i = y * W + x;
      locked.set(i, [buf.ramp[i] ?? -1, shade]);
    }
  }
}

/**
 * Shoe with a 1-px pointed toe: the sole row again under itself, minus its outer px; its first px takes the shoe's
 * light tone (`l`), a 1-px toe highlight that reads on dark wallpapers (LATER, art round MA-27-3).
 */
export function pointToe(mask: Mask): Mask {
  const last = mask[mask.length - 1] ?? '';
  const toe = last.slice(1, -1);
  return [...mask, '.' + (toe.length > 0 ? 'l' + toe.slice(1) : '') + '.'];
}

/** The row squash cuts at: the waist, under the chest. */
const waistRow = (j: JointMap): number => Math.round(j.hip[1] - 10);

const N4: readonly Point[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function recolorHornOutline(buf: IndexBuffer, map: ReturnType<typeof outline>, ramp: RampName): void {
  for (let i = 0; i < map.kind.length; i++) {
    if ((map.kind[i] ?? 0) !== 1) continue;
    const x = i % buf.width;
    const y = Math.floor(i / buf.width);
    const nextToHorn = N4.some(
      ([dx, dy]) => buf.inBounds(x + dx, y + dy) && buf.get(x + dx, y + dy).material === MAT.horn,
    );
    if (nextToHorn) {
      buf.set(x, y, { ramp, shade: 1, material: MAT.horn, depth: 3.5 });
      map.source[i] = 2;
    }
  }
}

/** Paints an authored mask with final tones and locks its px; with `under`, px of that material are left alone. */
/** stampMask options: skip px of material `under`, write `partId`, and paint only px whose part `allow` accepts. */
export interface StampOptions {
  readonly under?: number;
  readonly partId?: number;
  readonly allow?: (partId: number) => boolean;
}

/** Stamps an authored mask (tones locked); returns the px indices it wrote. */
export function stampMask(
  buf: IndexBuffer,
  body: Body,
  mask: Mask,
  x: number,
  y: number,
  depth: number,
  fallback: number,
  locked: Map<number, readonly [number, number]>,
  opts: StampOptions = {},
): number[] {
  const written: number[] = [];
  mask.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const entry = LEGEND[row.charAt(c)];
      const px = x + c;
      const py = y + r;
      if (!entry || !buf.inBounds(px, py)) continue;
      const i = py * buf.width + px;
      if (opts.under !== undefined && buf.get(px, py).material === opts.under) continue;
      if (opts.allow && !opts.allow(buf.partId[i] ?? 0)) continue;
      const swatch = body.outfit[entry[0]];
      buf.set(px, py, {
        ramp: swatch.ramp,
        shade: swatch.tones[entry[1]],
        depth,
        material: SLOT_MATERIAL[entry[0]] ?? fallback,
        ...(opts.partId === undefined ? {} : { partId: opts.partId }),
      });
      locked.set(i, [buf.ramp[i] ?? -1, buf.shade[i] ?? 0]);
      written.push(i);
    }
  });
  return written;
}

const FALLBACKS = {
  idle: 'idle_a',
  run: 'walk',
  climb: 'walk',
  hang: 'drag',
  peek: 'idle_a',
  'react:*': 'idle_a',
  'activity:*': 'idle_a',
  '*': 'idle_a',
} as const;

/** A pack for `pnpm sprites` from a body and the shared poses; throws on any mask, face or pose problem. */
export function createRigPack(body: Body, anims: readonly RigAnim[], frameH: number = RIG_H): PackDef {
  const masks: [string, Mask | undefined][] = [
    ['head', body.head.mask],
    ['shoe', body.masks.shoe],
    ['headAcc', body.masks.headAcc?.mask],
    ['neckAcc', body.masks.neckAcc?.mask],
    ['spade', body.masks.spade],
  ];
  const q34 = body.views?.q34;
  if (usesView(anims, 'q34') && !q34) {
    throw new Error(`${body.id}: q34 poses (walk, turn) need Body.views.q34 (head, face, masks; ADR 010)`);
  }
  if (q34) {
    masks.push(
      ['q34/head', q34.head.mask],
      ['q34/shoe', q34.masks.shoe],
      ['q34/headAcc', q34.masks.headAcc?.mask],
      ['q34/neckAcc', q34.masks.neckAcc?.mask],
      ['q34/bib', q34.apron?.bib.mask],
      ['q34/ties', q34.apron?.ties?.mask],
      ['q34/hairFar', q34.masks.hairFar?.mask],
    );
  }
  for (const [name, mask] of masks) if (mask) checkMask(mask, `${body.id}/${name}`);
  const faceAtOf = (view: View, head: Body['head']): Point => {
    const rest = resolveJoints(body, poseFrame({}), frameH, view);
    return [rest.face[0] - (rest.head[0] + head.at[0]), rest.face[1] - (rest.head[1] + head.at[1])];
  };
  const problems = validateFace(body.face, body.id, { mask: body.head.mask, faceAt: faceAtOf('front', body.head) });
  // Per view, only the expressions its frames reference are required (q34: neutral + blink).
  const usedBy = (view: View): ExpressionId[] => [
    ...new Set(anims.flatMap((a) => a.frames.filter((_, i) => headViewOf(a, i) === view).map((f) => f.face))),
  ];
  if (q34) {
    problems.push(
      ...validateFace(q34.face, `${body.id}/q34`, { mask: q34.head.mask, faceAt: faceAtOf('q34', q34.head) }, [
        ...new Set([...Q34_EXPRESSIONS, ...usedBy('q34')]),
      ]),
    );
  }
  for (const a of anims) {
    a.frames.forEach((f, i) => {
      const lib = headViewOf(a, i) === 'q34' ? q34?.face : body.face;
      if (lib && !(f.face in lib.expressions)) {
        problems.push(`${body.id}/${a.name}/${String(i).padStart(2, '0')}: expression "${f.face}" is missing`);
      }
    });
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));
  if (body.variants.back === 'spade_tail' && !body.masks.spade) throw new Error(`${body.id}: spade_tail needs a spade`);

  const renderer = createRigRenderer(body, frameH);
  const byName = new Map(anims.map((a) => [a.name, a]));
  const get = (name: string): RigAnim => {
    const a = byName.get(name);
    if (!a) throw new Error(`${body.id}: unknown animation "${name}"`);
    return a;
  };
  const animations: Record<string, AnimDef> = {};
  for (const a of anims) {
    const seat = a.anchor === 'seat' ? renderer.joints(a, 0).seat : undefined;
    animations[a.name] = {
      frames: a.frames.length,
      fps: a.fps,
      loop: a.loop,
      ...(seat ? { anchor: { x: round4(seat[0] / RIG_W), y: round4(seat[1] / frameH) } } : {}),
      // q34 is authored facing screen-right (ADR 010); the runtime mirrors it for walking left.
      ...(animFacing(a) === 'front' ? {} : { facing: animFacing(a) }),
    };
  }
  return {
    id: body.id,
    name: body.name,
    version: '0.1.0',
    author: 'Pixmates (generated by code)',
    frameSize: { w: RIG_W, h: frameH },
    anchor: { x: 0.5, y: 1 },
    scaleRef: SCALE_REF,
    layout: 'shelf',
    headroom: true,
    animations,
    fallbacks: FALLBACKS,
    render: (name, frame, ctx) => renderer.render(get(name), frame, ctx),
    fxAnchor: (name, frame) => renderer.fxAnchor(get(name), frame),
  };
}

const round4 = (n: number): number => Math.round(n * 10000) / 10000;
