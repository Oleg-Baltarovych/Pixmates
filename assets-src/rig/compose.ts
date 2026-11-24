// Rig composer (plan M-ART MA-23, docs/art/RIG.md), generalized from the 48-soft spike (assets-src/spike/maid.ts).
// One renderer per body: every shared pose frame → joints (body.ts) → procedural parts in composite order (far →
// back → behind → front; builders in chains.ts) → compose (light, texture, AO, dither) → authored masks stamped and
// locked (apron, neck_acc, sash knot, far lock, head_acc, head + band, face parts, fists, spade, shoes) → opt-in tone
// passes → outline on the whole composite (so part seams never show) → selective outline → AA → masks restored →
// rim → arm over torso → quantize → squash rows at the waist → seam closer (passes in passes.ts).
// Secondary motion (side locks, long hair hem, tails, scarf ends) comes from looped verlet chains per animation.
import type { RgbaImage } from '../../tools/lib/png.ts';
import { createIndexBuffer, quantize, type IndexBuffer, type RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import { checkMask, maskSize, type Mask } from '../lib/mask.ts';
import { toOklab } from '../lib/palette.ts';
import { MAT } from '../lib/materials.ts';
import { compose, outline, selectiveOutline, type Part } from '../lib/passes.ts';
import { antiAlias, rimLight } from '../lib/polish.ts';
import type { AnimDef, Facing, PackDef, RenderContext } from '../lib/types.ts';
import { frame as poseFrame } from './anims/kit.ts';
import { FIGURE_H, REST_Q34, resolveJoints, withBand } from './body.ts';
import {
  BODICE_SHADE,
  buildArm,
  buildBackHair,
  buildFoxTailParts,
  buildLegs,
  buildScarfParts,
  buildShorts,
  buildSkirt,
  buildSpadeTail,
  buildTorso,
  capScarfEnds,
  DEFAULT_SLEEVE_SHADE,
  FOX_TAIL_FRONT,
  FOX_TAIL_Q34,
  frontTailLine,
  q34FoxTail,
  simulateChains,
  type Chains,
} from './chains.ts';
import { darkerMask, tipToe } from './q34.ts';
import { expressionParts, Q34_EXPRESSIONS, validateFace, type ExpressionId } from './face.ts';
import { NOT_ARM, PART_ID, TORSO_PARTS, UNDER_HEM } from './part-ids.ts';
import {
  apronPanel,
  armOverTorso,
  clipFarShoulder,
  closeSeams,
  cutSpadeNotches,
  farLegGap,
  handLineOverTies,
  handShadows,
  kneeCreases,
  labelImage,
  pointToe,
  recolorHornOutline,
  shinWrap,
  sleeveHairLine,
  squashSeparator,
  stampChinFists,
  stampMask,
  tubeTones,
  WRAP_SHADE,
  type Locked,
  type Stamp,
} from './passes.ts';
import { SOFT as style } from './style.ts';
import type { Body, BodyView, JointMap, PoseFrame, RigAnim, ScarfEnds, View } from './types.ts';

export { ARM_LABEL } from './part-ids.ts';
export { SCARF_MAX_BELOW_CHEST, SCARF_MAX_TRAIL, q34FoxTail } from './chains.ts';
export { closeSeams, pointToe, stampMask, type StampOptions } from './passes.ts';

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

/** Mask depths: apron ties over the skirt, far lock behind the head, collar and sash knot. */
const DEPTH_TIES = 1.6;
const DEPTH_HAIR_FAR = 0.5;
const DEPTH_TRIM_MASK = 1.7;

export interface LabeledFrame {
  readonly image: RgbaImage;
  /** Red channel = `ARM_LABEL` value per px (alpha 255 where labelled). */
  readonly labels: RgbaImage;
}

export interface RigRenderer {
  readonly joints: (anim: RigAnim, frame: number) => JointMap;
  readonly render: (anim: RigAnim, frame: number, ctx: RenderContext) => RgbaImage;
  /** The frame plus a per-px part label map (`ARM_LABEL`, red channel) for the arm-over-torso check. */
  readonly renderLabeled: (anim: RigAnim, frame: number, ctx: RenderContext) => LabeledFrame;
  /** FX mark anchor (frame px) after squash. */
  readonly fxAnchor: (anim: RigAnim, frame: number) => Point;
  /** Fox tail centre line (frame px, before squash) and stroke radii; undefined without a drawn fox tail. */
  readonly tail: (
    anim: RigAnim,
    frame: number,
  ) =>
    | { readonly points: readonly Point[]; readonly radii: readonly number[]; readonly tipRadii: readonly number[] }
    | undefined;
  /** Scarf end centre lines (frame px, before squash); empty without a scarf. */
  readonly scarfEnds: (anim: RigAnim, frame: number) => readonly (readonly Point[])[];
}

/** Draw layers of one frame (composite order far → back → behind → front) plus points the passes need. */
interface Layers {
  readonly parts: readonly Part[];
  readonly hands: readonly Point[];
  readonly knees: readonly Point[];
}

export function createRigRenderer(body: Body, frameH: number = RIG_H): RigRenderer {
  const v = body.variants;
  const sleeve = { ramp: body.sleeve?.ramp ?? body.ramps.cloth, shade: body.sleeve?.shade ?? DEFAULT_SLEEVE_SHADE };
  if (sleeve.ramp === body.ramps.cloth && Math.abs(sleeve.shade - BODICE_SHADE) < 1) {
    throw new Error(
      `${body.id}: sleeves on the bodice ramp need >= 1 shade step from the bodice (arm-over-torso rule)`,
    );
  }
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
        sashKnot: body.sash?.knot,
        hairFar: undefined,
        sleeveHairLine: undefined,
        hideFarShoulder: false,
        farLegShade: undefined,
      };
    }
    if (!q34 || !headMasks.q34) throw new Error(`${body.id}: q34 poses need Body.views.q34 (ADR 010)`);
    return {
      head: q34.head,
      headMask: headMasks.q34,
      face: q34.face,
      masks: q34.masks,
      apron: q34.apron,
      sashKnot: q34.sashKnot,
      hairFar: q34.masks.hairFar,
      sleeveHairLine: q34.sleeveHairLine,
      hideFarShoulder: q34.hideFarShoulder === true,
      farLegShade: q34.farLegShade,
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

  const tailFront = body.foxTail?.front ?? FOX_TAIL_FRONT;
  const tailQ34 = body.foxTail?.q34 ?? FOX_TAIL_Q34;
  const scarfOf = (view: View): ScarfEnds => {
    const ends = view === 'q34' ? q34?.scarf : body.scarf;
    if (!ends) throw new Error(`${body.id}: neckAcc 'scarf' needs scarf ends in the ${view} view`);
    return ends;
  };
  const chainCache = new Map<string, Chains>();
  const chains = (anim: RigAnim): Chains => {
    const hit = chainCache.get(anim.name);
    if (hit) return hit;
    // q34 tails trail to screen-left (the facing is screen-right).
    const trailX = animFacing(anim) === 'right' ? -1 : 1;
    const result = simulateChains(body, anim, allJoints(anim), trailX, (f) => bodyViewOf(anim, f), scarfOf);
    chainCache.set(anim.name, result);
    return result;
  };

  /** Fox tail centre line of a frame: the front chain (+ bend) or the q34 curve; none when tucked. */
  const tail: RigRenderer['tail'] = (anim, frame) => {
    const p = anim.frames[frame];
    if (v.back !== 'fox_tail' || !p || p.tailTucked) return undefined;
    const hairDx = p.hairDx ?? 0;
    if (bodyViewOf(anim, frame) === 'q34') {
      return {
        points: q34FoxTail(joints(anim, frame).back, hairDx, tailQ34.points),
        radii: tailQ34.radii,
        tipRadii: tailQ34.tipRadii,
      };
    }
    const raw = chains(anim).tail[frame];
    return raw ? frontTailLine(tailFront, raw, hairDx) : undefined;
  };
  /** Scarf ends of a frame (capped per `ScarfEnds.maxBelowChest` / `maxTrail`, lifted 1 px on `hairLift`). */
  const scarfEnds: RigRenderer['scarfEnds'] = (anim, frame) => {
    const p = anim.frames[frame];
    if (v.neckAcc !== 'scarf' || !p) return [];
    const bv = bodyViewOf(anim, frame);
    const lift = p.hairLift === 1 ? 1 : 0;
    return capScarfEnds(chains(anim).scarf, frame, scarfOf(bv), joints(anim, frame).chest[1], bv === 'q34', lift);
  };

  /** Procedural parts of a frame in draw order (q34: far arm + far leg first, behind everything; ADR 010). */
  const layers = (anim: RigAnim, frame: number, p: PoseFrame): Layers => {
    const j = joints(anim, frame);
    // One-shot clips (land, startle) have no previous frame at frame 0: no lag there.
    const prevIndex = anim.loop ? (frame + anim.frames.length - 1) % anim.frames.length : Math.max(0, frame - 1);
    const prev = joints(anim, prevIndex);
    const ch = chains(anim);
    const bv = bodyViewOf(anim, frame);
    const hv = headViewOf(anim, frame);
    const q = bv === 'q34';
    /** Trailing side (q34 faces screen-right, so tails, hair mass and hem flare trail to screen-left). */
    const trailSide = q ? -1 : 1;
    const far: Part[] = [];
    const back: Part[] = [];
    const behind: Part[] = [];
    const front: Part[] = [];

    // Tails. Front: behind the hair; q34: rooted on the trailing side, the tip shows past the hair. Tucked (turn
    // f0): no tube (a spade tip is stamped under the hem later).
    const hipLag: Point = [prev.hip[0] - j.hip[0], prev.hip[1] - j.hip[1]];
    // Back-hair tips trail by `hairDx` (walk passing frames); the tail tip swings the other way.
    const hairDx = p.hairDx ?? 0;
    const tailParts: Part[] = [];
    if (!p.tailTucked && v.back === 'spade_tail') {
      tailParts.push(buildSpadeTail(body, j.back, trailSide, hipLag, hairDx));
    } else if (!p.tailTucked && v.back === 'fox_tail') {
      const line = tail(anim, frame);
      if (line) tailParts.push(...buildFoxTailParts(body, line, q, tailFront.shine === true));
    }
    if (!q) back.push(...tailParts);
    const headParts = viewParts(hv);
    back.push(
      ...buildBackHair(body, p, j, prev, hv, headParts.hairFar !== undefined, [ch.lockL[frame], ch.lockR[frame]]),
    );
    if (q) back.push(...tailParts);

    // Legs, hem, torso.
    const legs = buildLegs(body, p, j, q, q ? viewParts(bv).farLegShade : undefined);
    far.push(...legs.far);
    back.push(...legs.back);
    if (v.hem === 'skirt') back.push(...buildSkirt(body, p, j.hip, q));
    else back.push(buildShorts(body, p, j.hip, q));
    behind.push(...buildTorso(body, j, q, p.breath === 1 ? 0.4 : 0));

    // Arms by draw order (q34: far arm behind the torso — only the hand/cuff that clears it shows).
    const order = q ? 'q34' : (p.order ?? 'arms_front');
    const hands: Point[] = [];
    for (const side of ['L', 'R'] as const) {
      const { parts, hand } = buildArm(body, j, side, side === 'L' ? p.parts.armL : p.parts.armR, bv, sleeve);
      hands.push(hand);
      if (order === 'q34') (side === 'R' ? far : front).push(...parts);
      else if (order === 'arms_back' || order === (side === 'L' ? 'arm_l_back' : 'arm_r_back')) back.push(...parts);
      else front.push(...parts);
    }

    // Scarf ends: front = over the bodice under the knot, under the arms; q34 = trailing back from the nape over the
    // near shoulder (drawn last, so the near puff never hides them).
    (q ? front : behind).push(...buildScarfParts(body, scarfEnds(anim, frame), bv));
    return { parts: [...far, ...back, ...behind, ...front], hands, knees: legs.knees };
  };

  /** Authored masks (final tones, locked) in stamp order; returns what the post-outline passes need. */
  const stampAuthored = (
    buf: IndexBuffer,
    anim: RigAnim,
    frame: number,
    p: PoseFrame,
    locked: Locked,
  ): { tieAt: Point | undefined; hairFarPx: readonly number[] } => {
    const j = joints(anim, frame);
    const bv = bodyViewOf(anim, frame);
    const q = bv === 'q34';
    const bodyParts = viewParts(bv);
    const headParts = viewParts(headViewOf(anim, frame));
    const stamp: Stamp = (mask, x, y, depth, fallback, under, partId) => {
      stampMask(buf, body, mask, Math.round(x), Math.round(y), depth, fallback, locked, {
        ...(under === undefined ? {} : { under }),
        ...(partId === undefined ? {} : { partId }),
      });
    };
    let tieAt: Point | undefined;
    if (bodyParts.apron) {
      const ap = bodyParts.apron;
      apronPanel(buf, body, j.hip[0] + (ap.dx ?? 0), Math.round(j.hip[1] - 10.1) + 1, ap.panelW, locked);
      // Bib = torso, only over bodice px: never over a sleeve or hand in front of it.
      stampMask(
        buf,
        body,
        ap.bib.mask,
        Math.round(j.neck[0] + ap.bib.at[0]),
        Math.round(j.neck[1] + ap.bib.at[1]),
        1.65,
        MAT.apron,
        locked,
        { partId: PART_ID.torso, allow: (id) => TORSO_PARTS.has(id) },
      );
      // Ties: over the skirt, bodice and tail, never over an arm (the near arm swings in front of them).
      if (ap.ties) {
        const t = ap.ties;
        tieAt = [Math.round(j.hip[0] + t.at[0]), Math.round(j.hip[1] + t.at[1])];
        stampMask(buf, body, t.mask, tieAt[0], tieAt[1], DEPTH_TIES, MAT.apron, locked, { allow: NOT_ARM });
      }
    }
    const neckAcc = bodyParts.masks.neckAcc;
    // Collar accessory = torso trim: the arm-over-torso pass and check cover the shoulder seam against it.
    if (neckAcc) {
      const [x, y] = [j.neck[0] + neckAcc.at[0], j.neck[1] + neckAcc.at[1]];
      stamp(neckAcc.mask, x, y, DEPTH_TRIM_MASK, MAT.trim, undefined, PART_ID.trim);
    }
    // Sash knot on the near hip (trim, never over an arm).
    const knot = bodyParts.sashKnot;
    if (knot) {
      const [kx, ky] = [Math.round(j.hip[0] + knot.at[0]), Math.round(j.hip[1] + knot.at[1])];
      stampMask(buf, body, knot.mask, kx, ky, DEPTH_TRIM_MASK, MAT.trim, locked, {
        partId: PART_ID.trim,
        allow: NOT_ARM,
      });
    }
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
    stampChinFists(stamp, p.parts, j, v.sleeves === 'long');
    const spade = v.back === 'spade_tail' ? body.masks.spade : undefined;
    if (spade && p.tailTucked) {
      // Tucked: the spade hangs under the hem near the centre, behind the skirt, lace and shoes (only its tip shows).
      const sx = Math.round(j.hip[0] + 1) - (maskSize(spade).w >> 1);
      const sy = Math.round(j.hip[1] + 0.1);
      stampMask(buf, body, spade, sx, sy, 0.15, MAT.shoe, locked, { allow: UNDER_HEM });
    } else if (spade) {
      const trailSide = q ? -1 : 1;
      const prev = joints(
        anim,
        anim.loop ? (frame + anim.frames.length - 1) % anim.frames.length : Math.max(0, frame - 1),
      );
      const hipLag: Point = [prev.hip[0] - j.hip[0], prev.hip[1] - j.hip[1]];
      const tip: Point = [j.back[0] + trailSide * 9.5 + hipLag[0], j.back[1] + 5.2 + hipLag[1]];
      const sx = Math.round(tip[0] - 0.5) - (maskSize(spade).w >> 1);
      const sy = Math.round(tip[1] - 0.5);
      stamp(spade, sx, sy, 0.15, MAT.shoe);
      cutSpadeNotches(buf, spade, sx, sy, locked);
    }
    // Hanging feet (seated, dragged) point their toes down 1 px.
    const shoe =
      p.parts.legs === 'sit' || p.parts.legs === 'dangle' ? pointToe(bodyParts.masks.shoe) : bodyParts.masks.shoe;
    if (q) {
      // q34: far shoe (R) one ramp step darker, stamped first so the near shoe overlaps it; a foot lifted ≥ 2 px
      // (passing frames) tips its toe down 1 px.
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
    return { tieAt, hairFarPx };
  };

  const renderLabeled = (anim: RigAnim, frame: number, ctx: RenderContext): LabeledFrame => {
    const p: PoseFrame | undefined = anim.frames[frame];
    if (!p) throw new Error(`${body.id}/${anim.name}: no frame ${String(frame)}`);
    const j = joints(anim, frame);
    const q = bodyViewOf(anim, frame) === 'q34';
    const bodyParts = viewParts(bodyViewOf(anim, frame));
    // 1. Procedural parts → compose.
    const { parts, hands, knees } = layers(anim, frame, p);
    const sleeveDir = toneOf(ctx, sleeve.ramp, sleeve.shade) > toneOf(ctx, body.ramps.cloth, BODICE_SHADE) ? 1 : -1;
    const buf = createIndexBuffer(RIG_W, frameH, ctx.palette);
    compose(buf, parts, ctx.rampSize, {
      light: { strength: style.light },
      occlusion: { radius: 1, strength: style.occlusion, cast: { length: 1, strength: 0.4 } },
      dither: { spread: style.dither, round: [body.ramps.hair] },
    });
    // 2. Tone passes on the composed parts.
    if (v.back === 'spade_tail') tubeTones(buf);
    if (q && bodyParts.hideFarShoulder) clipFarShoulder(buf, j.shoulderR[1]);
    handShadows(buf, hands);
    // 3. Authored masks, then the opt-in locked tone passes over legs.
    const locked: Locked = new Map();
    const { tieAt, hairFarPx } = stampAuthored(buf, anim, frame, p, locked);
    if (body.shinWrap) {
      const legsRamp = ctx.palette.rampNames.indexOf(body.ramps.legs);
      const wrap = body.shinWrap;
      shinWrap(buf, [j.footL, j.footR], wrap.row, wrap.shade ?? WRAP_SHADE, legsRamp, locked);
    }
    if (q && bodyParts.farLegShade !== undefined) farLegGap(buf, locked);
    kneeCreases(buf, knees, locked);
    // 4. Outline, AA, locked tones restored, rim.
    const map = outline(buf, ctx.rampSize, { drop: style.drop, internal: true });
    if (body.hornOutline) recolorHornOutline(buf, map, body.hornOutline);
    selectiveOutline(buf, map, { lit: 'lighter' });
    if (style.aa) antiAlias(buf, map);
    for (const [i, [ramp, shade]] of locked) {
      buf.ramp[i] = ramp;
      buf.shade[i] = shade;
    }
    rimLight(buf, map, ctx.rampSize, { strength: style.rim });
    // The far lock keeps its authored hair-shadow tones: rim light would lift its outer edge into a forward tuft.
    // Only px still hair are restored (nothing drawn later over them is touched).
    for (const i of hairFarPx) {
      const tone = locked.get(i);
      if (tone && buf.material[i] === MAT.hair) [buf.ramp[i], buf.shade[i]] = tone;
    }
    // 5. Last tone passes: the arm-over-torso separator must survive AA and rim (RIG.md rule ii).
    armOverTorso(buf, ctx.palette, sleeveDir);
    if (bodyParts.sleeveHairLine) sleeveHairLine(buf, bodyParts.sleeveHairLine);
    const ties = bodyParts.apron?.ties;
    if (ties && tieAt) {
      const skinRamp = ctx.palette.rampNames.indexOf(body.outfit.skin.ramp);
      const apronRamp = ctx.palette.rampNames.indexOf(body.outfit.apron.ramp);
      handLineOverTies(buf, ties.mask, tieAt, body.outfit.skin, skinRamp, apronRamp);
    }
    // 6. Quantize, squash at the waist (labels too), squash separator, seam closer.
    const cut = waistRow(j);
    const labels = squashRows(labelImage(buf), cut, p.squash);
    const squashed = squashRows(quantize(buf, ctx.palette), cut, p.squash);
    const deep = ctx.palette.ramps.get(sleeve.ramp)?.[0];
    return {
      image: closeSeams(p.squash > 0 && deep !== undefined ? squashSeparator(squashed, labels, deep) : squashed),
      labels,
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

  return { joints, render, renderLabeled, fxAnchor, tail, scarfEnds };
}

/** The row squash cuts at: the waist, under the chest. */
const waistRow = (j: JointMap): number => Math.round(j.hip[1] - 10);

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

/** Highest index of a six-tone ramp / swatch (shade opt-ins are 0..MAX_SHADE). */
const MAX_SHADE = 5;

/**
 * All body-part validation before rendering: every authored mask (front, q34, apron, sash knot), shade opt-ins in
 * range, required per-view parts (q34 view, scarf ends, spade), faces and expressions. Throws with every problem.
 */
function validateBody(body: Body, anims: readonly RigAnim[], frameH: number): void {
  const q34 = body.views?.q34;
  const usesQ34 = usesView(anims, 'q34');
  if (usesQ34 && !q34) {
    throw new Error(`${body.id}: q34 poses (walk, turn) need Body.views.q34 (head, face, masks; ADR 010)`);
  }
  const masks: [string, Mask | undefined][] = [
    ['head', body.head.mask],
    ['shoe', body.masks.shoe],
    ['headAcc', body.masks.headAcc?.mask],
    ['neckAcc', body.masks.neckAcc?.mask],
    ['spade', body.masks.spade],
    ['bib', body.apron?.bib.mask],
    ['ties', body.apron?.ties?.mask],
    ['sashKnot', body.sash?.knot.mask],
  ];
  if (q34) {
    masks.push(
      ['q34/head', q34.head.mask],
      ['q34/shoe', q34.masks.shoe],
      ['q34/headAcc', q34.masks.headAcc?.mask],
      ['q34/neckAcc', q34.masks.neckAcc?.mask],
      ['q34/bib', q34.apron?.bib.mask],
      ['q34/ties', q34.apron?.ties?.mask],
      ['q34/hairFar', q34.masks.hairFar?.mask],
      ['q34/sashKnot', q34.sashKnot?.mask],
    );
  }
  for (const [name, mask] of masks) if (mask) checkMask(mask, `${body.id}/${name}`);
  const shades: [string, number | undefined][] = [
    ['shorts.shade', body.shorts?.shade],
    ['shinWrap.shade', body.shinWrap?.shade],
    ['views.q34.farLegShade', q34?.farLegShade],
  ];
  for (const [name, s] of shades) {
    if (s !== undefined && !(s >= 0 && s <= MAX_SHADE)) {
      throw new Error(`${body.id}: ${name} ${String(s)} is outside 0..${String(MAX_SHADE)}`);
    }
  }
  if (body.variants.neckAcc === 'scarf') {
    if (!body.scarf) throw new Error(`${body.id}: neckAcc 'scarf' needs Body.scarf (front ends)`);
    if (usesQ34 && !q34?.scarf) throw new Error(`${body.id}: neckAcc 'scarf' needs views.q34.scarf`);
  }
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
}

/** A pack for `pnpm sprites` from a body and the shared poses; throws on any mask, face or pose problem. */
export function createRigPack(body: Body, anims: readonly RigAnim[], frameH: number = RIG_H): PackDef {
  validateBody(body, anims, frameH);
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
