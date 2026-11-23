// Rig composer (plan M-ART MA-23, docs/art/RIG.md), generalized from the 48-soft spike (assets-src/spike/maid.ts).
// One renderer per body: every shared pose frame → joints (body.ts) → procedural parts in composite order (back →
// hair_back → legs → hem → torso → arms by `order`) → compose (light, texture, AO, dither) → authored masks stamped
// and locked (neck_acc, head_acc, head + band, face parts, spade, shoes) → outline on the whole composite (so part
// seams never show) → selective outline → AA → masks restored → rim → quantize → squash rows at the waist.
// Secondary motion (side locks, long hair hem, tails) comes from looped verlet chains per animation.
import type { RgbaImage } from '../../tools/lib/png.ts';
import { createIndexBuffer, quantize, type IndexBuffer, type RampName } from '../lib/buffer.ts';
import { simulateChain, type Point } from '../lib/chain.ts';
import { checkMask, LEGEND, maskSize, type Mask } from '../lib/mask.ts';
import { toOklab, type Palette } from '../lib/palette.ts';
import { cloth, flat, MAT } from '../lib/materials.ts';
import { compose, outline, selectiveOutline, type Material, type Part } from '../lib/passes.ts';
import { antiAlias, rimLight } from '../lib/polish.ts';
import { curveX, ellipse, poly, rect, stroke, type Shape, type StrokePoint } from '../lib/shapes.ts';
import type { AnimDef, PackDef, RenderContext } from '../lib/types.ts';
import { frame as poseFrame } from './anims/kit.ts';
import { elbowOf, FIGURE_H, resolveJoints, withBand } from './body.ts';
import { expressionParts, validateFace } from './face.ts';
import { SOFT as style } from './style.ts';
import type { ArmVariant, Body, JointMap, PoseFrame, RigAnim } from './types.ts';

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

/** Back hair outline (head-joint units): `short` = shoulder length (the spike maid), `long` stretches it to the waist. */
const HAIR_BACK: readonly Point[] = [
  [-11.6, 0],
  [11.6, 0],
  [11.6, 7],
  [11.2, 12.6],
  [10.4, 16.2],
  [9.2, 14.6],
  [7.6, 16.6],
  [6, 14.4],
  [5.4, 14.8],
  [-5.4, 14.8],
  [-6, 14.4],
  [-7.6, 16.6],
  [-9.2, 14.6],
  [-10.4, 16.2],
  [-11.2, 12.6],
  [-11.6, 7],
];
const HAIR_STRETCH = { short: 1, long: 1.45 } as const;

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
  const headMask = withBand(body.head.mask, body.head.band);
  const jointCache = new Map<string, readonly JointMap[]>();
  const allJoints = (anim: RigAnim): readonly JointMap[] => {
    const hit = jointCache.get(anim.name);
    if (hit) return hit;
    const list = anim.frames.map((f) => resolveJoints(body, f, frameH));
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
              anchors((j) => add(j.back, 1, 1)),
              { segments: 4, length: 2.4, gravity: [0.07, -0.05], damping: 0.8, loop: anim.loop },
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

  const armParts = (j: JointMap, side: 'L' | 'R', arm: ArmVariant): { parts: Part[]; hand: Point } => {
    const shoulder = j[side === 'L' ? 'shoulderL' : 'shoulderR'];
    const elbow = elbowOf(j, side, arm);
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
    const handR = longSleeve ? 1.2 : 1.3;
    parts.push(part(ellipse(hand[0], handY, handR, handR + 0.05, 1), flat(MAT.skin, skin, 4.2), ids.end, 2.3));
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
    const back: Part[] = [];
    const behind: Part[] = [];
    const front: Part[] = [];

    // Back slot: tails.
    if (v.back === 'spade_tail') {
      const tail = SPADE_TAIL.map(([x, y, r], i): StrokePoint => {
        const t = i / (SPADE_TAIL.length - 1);
        const lagX = (prev.back[0] - j.back[0]) * t * 1.5;
        const lagY = (prev.back[1] - j.back[1]) * t;
        return [j.back[0] + x + lagX, j.back[1] + y + lagY, r];
      });
      back.push(part(stroke(tail), flat(MAT.shoe, body.ramps.tail, 2.2), 2, 0.1));
    } else if (v.back === 'fox_tail') {
      const pts = ch.tail[frame];
      if (pts) {
        back.push(part(stroke(chainStroke(pts, [1.6, 2.3, 2.6, 2.3, 1.5])), flat(MAT.fur, body.ramps.tail, 3), 2, 0.1));
        back.push(part(stroke(chainStroke(pts.slice(-2), [1.9, 1.3])), flat(MAT.fur, body.ramps.tailTip, 4), 2, 0.15));
      }
    }

    // Hair behind the head (+ lag below the temples), side locks.
    const stretch = HAIR_STRETCH[v.hairBack];
    const lag: Point = [prev.head[0] - j.head[0], prev.head[1] - j.head[1]];
    const hair = HAIR_BACK.map(([x, y]): [number, number] => {
      if (y <= 7) return [x + j.head[0], y + j.head[1]];
      const t = (y - 7) / 9.6;
      return [x + j.head[0] + lag[0] * t, 7 + (y - 7) * stretch + j.head[1] + lag[1] * t];
    });
    back.push(part(ellipse(j.head[0], j.head[1] + 0.5, 11.6, 10.4, 0.9), hairMat(2), 1, 0));
    back.push(part(curveX(poly(hair), j.head[0], 11), hairMat(1.6), 1, 0));
    // Side locks: below the root they trail the head by ≤ 1 px from the previous frame (walk, drag; art round 4).
    const trail: Point = [clamp1(lag[0]), clamp1(lag[1])];
    for (const lock of [ch.lockL[frame], ch.lockR[frame]]) {
      if (!lock) continue;
      const lagged = lock.map((pt, i): Point => (i === 0 ? pt : [pt[0] + trail[0], pt[1] + trail[1]]));
      back.push(part(stroke(chainStroke(lagged, [1.5, 1.25, 1.05, 0.8])), hairMat(2), 1, 0.2));
    }

    // Legs. Seated (`sit`): the thigh comes forward (a foreshortened knee just below the hem), the shin hangs from
    // the knee past the edge to the foot.
    const legMat = flat(MAT.fur, body.ramps.legs, 3.6);
    for (const [side, foot] of [
      [-1, j.footL],
      [1, j.footR],
    ] as const) {
      const top: StrokePoint = [j.hip[0] + side * 2.4, j.hip[1], 1.35];
      if (p.parts.legs === 'sit') {
        // Front view, thighs toward the viewer: the knee is a 1-px bump just under the (lifted) hem.
        const hemBottom = j.hip[1] + 1.1 - (p.parts.hem?.lift ?? 0);
        const knee: StrokePoint = [foot[0], hemBottom + 0.2, 1.3];
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
    if (v.hem === 'skirt') {
      const skirt = poly([
        [hip[0] - 5.6, hip[1] - 10.1],
        [hip[0] + 5.6, hip[1] - 10.1],
        [hip[0] + 10 + flare + hemDx, hip[1] + 0.1 - lift],
        [hip[0] - 10 - flare + hemDx, hip[1] + 0.1 - lift],
      ]);
      back.push(part(curveX(skirt, hip[0], 9), cloth3('skirt', 1), 4, 1));
      const pet = rect(
        Math.round(hip[0] - 9.4 - flare + hemDx),
        Math.round(hip[1] + 0.1 - lift),
        Math.round(18.8 + 2 * flare),
        2,
      );
      back.push(part(pet, lace(pet, 4), 4, 1.05));
    } else {
      const shorts = poly([
        [hip[0] - 5.4, hip[1] - 4.5],
        [hip[0] + 5.4, hip[1] - 4.5],
        [hip[0] + 6 + flare + hemDx, hip[1] + 1.2 - lift],
        [hip[0] + 0.6 + hemDx, hip[1] + 1.2 - lift],
        [hip[0] + hemDx, hip[1] + 0.2 - lift],
        [hip[0] - 0.6 + hemDx, hip[1] + 1.2 - lift],
        [hip[0] - 6 - flare + hemDx, hip[1] + 1.2 - lift],
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
    const bodice = poly([
      [chest[0] - 4.8, chest[1] - 2.6],
      [chest[0] + 4.8, chest[1] - 2.6],
      [hip[0] + half, hip[1] + waist],
      [hip[0] - half, hip[1] + waist],
    ]);
    behind.push(part(curveX(bodice, chest[0], 6), cloth3('bodice', 0.4, BODICE_SHADE + glow), 7, 1));
    const band = v.hem === 'skirt' ? -10.1 : -4.6;
    behind.push(
      part(
        rect(Math.round(hip[0] - 5.4), Math.round(hip[1] + band), 11, 1),
        flat(MAT.trim, body.ramps.trim, 2.4),
        8,
        1.6,
      ),
    );

    // Arms by draw order.
    const order = p.order ?? 'arms_front';
    const hands: Point[] = [];
    for (const side of ['L', 'R'] as const) {
      const { parts, hand } = armParts(j, side, side === 'L' ? p.parts.armL : p.parts.armR);
      hands.push(hand);
      const isBack = order === 'arms_back' || order === (side === 'L' ? 'arm_l_back' : 'arm_r_back');
      if (isBack) back.push(...parts);
      else front.push(...parts);
    }

    sleeveDir = toneOf(ctx, sleeveRamp, sleeveShade) > toneOf(ctx, body.ramps.cloth, BODICE_SHADE) ? 1 : -1;
    const buf = createIndexBuffer(RIG_W, frameH, ctx.palette);
    compose(buf, [...back, ...behind, ...front], ctx.rampSize, {
      light: { strength: style.light },
      occlusion: { radius: 1, strength: style.occlusion, cast: { length: 1, strength: 0.4 } },
      dither: { spread: style.dither, round: [body.ramps.hair] },
    });
    for (const [hx, hy] of hands) {
      const x = Math.round(hx + 0.6);
      const y = Math.round(hy + 0.5);
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
      stampMask(buf, body, mask, Math.round(x), Math.round(y), depth, fallback, locked, under, partId);
    };
    const neckAcc = body.masks.neckAcc;
    if (neckAcc) stamp(neckAcc.mask, j.neck[0] + neckAcc.at[0], j.neck[1] + neckAcc.at[1], 1.7, MAT.trim);
    const headAcc = body.masks.headAcc;
    const accFirst = v.headAcc === 'fox_ears';
    if (headAcc && accFirst) stamp(headAcc.mask, j.acc[0] + headAcc.at[0], j.acc[1] + headAcc.at[1], 3.4, MAT.hair);
    stamp(headMask, j.head[0] + body.head.at[0], j.head[1] + body.head.at[1], 3.5, MAT.skin);
    if (headAcc && !accFirst) stamp(headAcc.mask, j.acc[0] + headAcc.at[0], j.acc[1] + headAcc.at[1], 3.6, MAT.trim);
    for (const fp of expressionParts(body.face, p.face)) {
      stamp(fp.mask, j.face[0] + fp.at[0], j.face[1] + fp.at[1], 3.6, MAT.skin, MAT.hair);
    }
    // think: the chin fist is stamped over the head so it breaks the cheek outline by 1–2 px at the jaw corner.
    for (const [side, arm, hand] of [
      ['L', p.parts.armL, j.handL],
      ['R', p.parts.armR, j.handR],
    ] as const) {
      if (arm !== 'chin') continue;
      // Fist cols 10–13 / 34–37 at rest: over the jaw corner, breaking the cheek and side-lock edge, dark knuckle line on the face side.
      const mask = v.sleeves === 'long' ? [...FIST, FIST_CUFF] : FIST;
      const fist = side === 'L' ? mask : mask.map((r) => r.split('').reverse().join(''));
      const end = (side === 'L' ? ARM_IDS_L : ARM_IDS_R).end;
      stamp(fist, side === 'L' ? hand[0] - 4 : hand[0], hand[1] - 1.5, 3.7, MAT.skin, undefined, end);
    }
    if (v.back === 'spade_tail' && body.masks.spade) {
      const tipT = 1.5;
      const tip: Point = [j.back[0] + 9.5 + (prev.back[0] - j.back[0]) * tipT, j.back[1] + 5.2];
      const w = maskSize(body.masks.spade).w >> 1;
      stamp(body.masks.spade, Math.round(tip[0] - 0.5) - w, Math.round(tip[1] - 0.5), 0.15, MAT.shoe);
    }
    // Hanging feet (seated, dragged) point their toes down 1 px.
    const shoe = p.parts.legs === 'sit' || p.parts.legs === 'dangle' ? pointToe(body.masks.shoe) : body.masks.shoe;
    for (const foot of [j.footL, j.footR]) stamp(shoe, foot[0] - 2, foot[1] - 0.6, 0.9, MAT.shoe);

    const map = outline(buf, ctx.rampSize, { drop: style.drop, internal: true });
    if (body.hornOutline) recolorHornOutline(buf, map, body.hornOutline);
    selectiveOutline(buf, map, { lit: 'lighter' });
    if (style.aa) antiAlias(buf, map);
    for (const [i, [ramp, shade]] of locked) {
      buf.ramp[i] = ramp;
      buf.shade[i] = shade;
    }
    rimLight(buf, map, ctx.rampSize, { strength: style.rim });
    // Last tone pass: the arm-over-torso separator must survive AA and rim (RIG.md rule ii).
    armOverTorso(buf, ctx.palette, sleeveDir);
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
export const ARM_LABEL = { none: 0, sleeveL: 1, sleeveR: 2, endL: 3, endR: 4, torso: 5 } as const;
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
  8: ARM_LABEL.torso,
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
 * Fist + raised finger (screen-left hand; mirrored for the right): the `Z` column faces the cheek so the fist breaks
 * the jaw outline instead of melting into the face. Long sleeves add the bell-cuff row under it (rule iii).
 */
const FIST: Mask = ['..eZ', 'sSsZ', 'eSsZ', '.zz.'];
const FIST_CUFF = 'qaap';

/** Sleeve part ids (both sides; ends 11 / 21 are hand + cuff) and torso ids (bodice/neck 7, waist band 8). */
const SLEEVE_PARTS = new Set([9, 10, 19, 20]);
const TORSO_PARTS = new Set([7, 8]);

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

/** Shoe with a 1-px pointed toe: the sole row again under itself, minus its outer px. */
function pointToe(mask: Mask): Mask {
  const last = mask[mask.length - 1] ?? '';
  return [...mask, '.' + last.slice(1, -1) + '.'];
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
function stampMask(
  buf: IndexBuffer,
  body: Body,
  mask: Mask,
  x: number,
  y: number,
  depth: number,
  fallback: number,
  locked: Map<number, readonly [number, number]>,
  under?: number,
  partId?: number,
): void {
  mask.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const entry = LEGEND[row.charAt(c)];
      const px = x + c;
      const py = y + r;
      if (!entry || !buf.inBounds(px, py)) continue;
      if (under !== undefined && buf.get(px, py).material === under) continue;
      const swatch = body.outfit[entry[0]];
      buf.set(px, py, {
        ramp: swatch.ramp,
        shade: swatch.tones[entry[1]],
        depth,
        material: SLOT_MATERIAL[entry[0]] ?? fallback,
        ...(partId === undefined ? {} : { partId }),
      });
      const i = py * buf.width + px;
      locked.set(i, [buf.ramp[i] ?? -1, buf.shade[i] ?? 0]);
    }
  });
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
  for (const [name, mask] of masks) if (mask) checkMask(mask, `${body.id}/${name}`);
  const rest = resolveJoints(body, poseFrame({}), frameH);
  const headOrigin: Point = [rest.head[0] + body.head.at[0], rest.head[1] + body.head.at[1]];
  const faceAt: Point = [rest.face[0] - headOrigin[0], rest.face[1] - headOrigin[1]];
  const problems = validateFace(body.face, body.id, { mask: body.head.mask, faceAt });
  for (const a of anims) {
    a.frames.forEach((f, i) => {
      if (!(f.face in body.face.expressions)) {
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
