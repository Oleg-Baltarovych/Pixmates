// Rig part builders (docs/art/RIG.md): the looped verlet chains per animation (side locks, fox tail, scarf ends) and
// the procedural parts built from joints — back hair + locks, tails, legs, hem (skirt / shorts), torso, arms, scarf
// ends. Pure functions of the body, the pose frame and its joints; the composer (compose.ts) orders and composes them.
import type { RampName } from '../lib/buffer.ts';
import { simulateChain, type Point } from '../lib/chain.ts';
import { cloth, flat, MAT } from '../lib/materials.ts';
import type { Material, Part } from '../lib/passes.ts';
import { curveX, ellipse, poly, rect, stroke, type Shape, type StrokePoint } from '../lib/shapes.ts';
import { elbowOf } from './body.ts';
import { ARM_IDS_L, ARM_IDS_R, PART_ID } from './part-ids.ts';
import type { ArmVariant, Body, FoxTail, JointMap, PoseFrame, RigAnim, ScarfEnds, View } from './types.ts';

export const add = (p: Point, dx: number, dy: number): Point => [p[0] + dx, p[1] + dy];
const clamp1 = (n: number): number => Math.max(-1, Math.min(1, Math.round(n)));

export const part = (shape: Shape, material: Material, partId: number, depth: number): Part => ({
  shape,
  material,
  partId,
  depth,
});
const chainStroke = (points: readonly Point[], radii: readonly number[]): StrokePoint[] =>
  points.map(([x, y], i) => [x + 0.5, y + 0.5, radii[Math.min(i, radii.length - 1)] ?? 1]);
const hairMat = (body: Body, shade: number): Material => ({
  id: MAT.hair,
  base: () => ({ ramp: body.ramps.hair, shade }),
  texture: (f) => (f.x % 7 === 0 || f.x % 7 === 3 ? -1 : 0),
});
/** Lace: scallops on the last row. */
const lace = (body: Body, shape: Shape, shade: number): Material => {
  const bottom = Math.max(...shape.fragments.map((f) => f.y));
  const ramp = body.ramps.clothAlt;
  const folds = cloth(MAT.apron, ramp, shade, { folds: 0.7, cell: 3, seed: `${body.id}:lace` });
  return { ...folds, base: (f) => (f.y === bottom && (f.x & 1) === 1 ? null : { ramp, shade }) };
};

/** Points between a lock's root and tip on one straight line (same count; root and tip kept). */
export function leanLock(points: readonly Point[]): Point[] {
  const root = points[0];
  const tip = points[points.length - 1];
  if (!root || !tip || points.length < 3) return points.map((pt): Point => [pt[0], pt[1]]);
  const n = points.length - 1;
  return points.map((_, i): Point => [root[0] + ((tip[0] - root[0]) * i) / n, root[1] + ((tip[1] - root[1]) * i) / n]);
}

// ---- Back hair ----------------------------------------------------------------------------------------------------

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
/** `short` = shoulder length, `long` stretches it to the waist. */
const HAIR_BACK: readonly Point[] = [...HAIR_BACK_CROWN, ...HAIR_BACK_RIGHT, ...HAIR_BACK_LEFT];
/**
 * q34 back hair for a head with an authored far lock (`masks.hairFar`): the right side tucks inside the face above
 * the jaw, and under the chin only the nape behind the neck shows (no beard/neck-shadow block).
 */
const HAIR_BACK_Q34_TUCKED: readonly Point[] = [
  ...HAIR_BACK_CROWN,
  [9, 9],
  [3, 10.5],
  [-2, 11.5],
  [-3, 14.8],
  ...HAIR_BACK_LEFT,
];
const HAIR_STRETCH = { short: 1, long: 1.45 } as const;
/** Back-hair tip offset cap (px) when `hairTipLag` adds the previous frame's `hairDx` (`tipDx` of buildBackHair). */
export const HAIR_TIP_MAX = 2;

/**
 * Hair behind the head (+ lag below the temples) and the side-lock chains. `hairLift` (jump up-beat) floats the hair
 * below the temples and the locks 1 px up; q34 heads shift the mass 2 px to the trailing side and hide the far lock.
 * `tipDx` = the frame's `hairDx` (plus the previous frame's with `hairTipLag`, capped at HAIR_TIP_MAX).
 */
export function buildBackHair(
  body: Body,
  p: PoseFrame,
  j: JointMap,
  prev: JointMap,
  headView: View,
  tucked: boolean,
  locks: readonly (readonly Point[] | undefined)[],
  tipDx: number,
): Part[] {
  const parts: Part[] = [];
  const stretch = body.hairBackStretch ?? HAIR_STRETCH[body.variants.hairBack];
  const lag: Point = [prev.head[0] - j.head[0], p.hairLift === 1 ? -1 : prev.head[1] - j.head[1]];
  const hx = j.head[0] + (headView === 'q34' ? -2 : 0);
  const hairOutline = tucked ? HAIR_BACK_Q34_TUCKED : HAIR_BACK;
  const hair = hairOutline.map(([x, y]): [number, number] => {
    if (y <= 7) return [x + hx, y + j.head[1]];
    const t = (y - 7) / 9.6;
    return [x + hx + (lag[0] + tipDx) * t, 7 + (y - 7) * stretch + j.head[1] + lag[1] * t];
  });
  parts.push(part(ellipse(hx, j.head[1] + 0.5, 11.6, 10.4, 0.9), hairMat(body, 2), PART_ID.hair, 0));
  parts.push(part(curveX(poly(hair), hx, 11), hairMat(body, 1.6), PART_ID.hair, 0));
  // Side locks: below the root they trail the head by ≤ 1 px from the previous frame (walk, drag).
  const trail: Point = [clamp1(lag[0]), clamp1(lag[1])];
  const shown = body.sideLocks === false ? [] : headView === 'q34' ? [locks[0]] : locks;
  for (const lock of shown) {
    if (!lock) continue;
    const trailed = lock.map((pt, i): Point => (i === 0 ? pt : [pt[0] + trail[0], pt[1] + trail[1]]));
    const lagged = body.lockLean ? leanLock(trailed) : trailed;
    parts.push(part(stroke(chainStroke(lagged, [1.5, 1.25, 1.05, 0.8])), hairMat(body, 2), PART_ID.hair, 0.2));
  }
  return parts;
}

// ---- Tails --------------------------------------------------------------------------------------------------------

/** Rig default fox tail (dummy-b): front chain and q34 shape; bodies override per view (`Body.foxTail`). */
export const FOX_TAIL_FRONT: NonNullable<FoxTail['front']> = {
  radii: [1.6, 2.3, 2.6, 2.3, 1.5],
  tipRadii: [1.9, 1.3],
  length: 2.4,
  gravity: [0.07, -0.05],
  bend: [],
};
/** q34 centre line from the back joint (px): down-back to a tip past the hair, level with the skirt. */
export const FOX_TAIL_Q34: NonNullable<FoxTail['q34']> = {
  points: [
    [0, 0],
    [-4, -0.5],
    [-8, -1.2],
    [-12, -2.2],
    [-15, -3],
  ],
  radii: [1.5, 1.8, 1.8, 1.6, 1.3],
  tipRadii: [1.5, 1.1],
};
/** Default front chain root from the back joint (x toward the tail side). */
const FOX_TAIL_ROOT: Point = [1, 1];
/** Fox tail tones (tail / tailTip ramps): fur, front tip, q34 tip (one step under), shine. */
const FOX_TAIL_SHADE = { fur: 3, tipFront: 4, tipQ34: 3, shine: 5 } as const;
/** Shine stroke inside the fur's upper-left edge: offset per fur radius (x, y) and its radius. */
const FOX_TAIL_SHINE = { dx: 0.45, dy: 0.4, radius: 0.55 } as const;

/**
 * q34 fox tail points (frame px) for a back joint and a centre line (default: dummy-b's); the tip swings 1 px
 * against the back-hair trail `hairDx`.
 */
export function q34FoxTail(back: Point, hairDx = 0, line: readonly Point[] = FOX_TAIL_Q34.points): Point[] {
  return line.map(([x, y], i) => [back[0] + x - (hairDx * i) / Math.max(1, line.length - 1), back[1] + y]);
}

export interface TailLine {
  readonly points: readonly Point[];
  readonly radii: readonly number[];
  readonly tipRadii: readonly number[];
}

/** Front fox tail line of a frame: the simulated chain trailing against `hairDx`, plus the body's bend. */
export function frontTailLine(front: NonNullable<FoxTail['front']>, raw: readonly Point[], hairDx: number): TailLine {
  const bend = front.bend ?? [];
  const points = raw.map((pt, i): Point => [
    pt[0] - (hairDx * i) / Math.max(1, raw.length - 1) + (bend[i]?.[0] ?? 0),
    pt[1] + (bend[i]?.[1] ?? 0),
  ]);
  return { points, radii: front.radii, tipRadii: front.tipRadii };
}

/** Fox tail parts: fur stroke, pale tip (q34 one ramp step under the front tip), opt-in front shine. */
export function buildFoxTailParts(body: Body, line: TailLine, q: boolean, shine: boolean): Part[] {
  const tipN = line.tipRadii.length;
  const parts: Part[] = [
    part(
      stroke(chainStroke(line.points, line.radii)),
      flat(MAT.fur, body.ramps.tail, FOX_TAIL_SHADE.fur),
      PART_ID.tail,
      0.1,
    ),
    part(
      stroke(chainStroke(line.points.slice(-tipN), line.tipRadii)),
      flat(MAT.fur, body.ramps.tailTip, q ? FOX_TAIL_SHADE.tipQ34 : FOX_TAIL_SHADE.tipFront),
      PART_ID.tail,
      0.15,
    ),
  ];
  // Opt-in shine: a thin lit stroke inside the upper-left edge of the fur part (light from the top-left).
  if (!q && shine) {
    const fur = line.points.slice(1, -tipN);
    const points = fur.map(([x, y], i): StrokePoint => {
      const r = line.radii[i + 1] ?? 1;
      return [x + 0.5 - r * FOX_TAIL_SHINE.dx, y + 0.5 - r * FOX_TAIL_SHINE.dy, FOX_TAIL_SHINE.radius];
    });
    if (points.length >= 2) {
      parts.push(part(stroke(points), flat(MAT.fur, body.ramps.tail, FOX_TAIL_SHADE.shine), PART_ID.tail, 0.12));
    }
  }
  return parts;
}

/** Spade tail centre line from the back joint (px, radius). */
export const SPADE_TAIL: readonly StrokePoint[] = [
  [0, 0, 0.95],
  [3.5, 1.6, 0.9],
  [6.5, 2.4, 0.85],
  [8.5, 3.6, 0.8],
  [9.5, 5.2, 0.75],
];

/** Spade tail tube: follows the hip one frame late (the tip carries the full previous-frame hip offset, the root none). */
export function buildSpadeTail(body: Body, back: Point, trailSide: number, hipLag: Point, hairDx: number): Part {
  const tail = SPADE_TAIL.map(([x, y, r], i): StrokePoint => {
    const t = i / (SPADE_TAIL.length - 1);
    return [back[0] + trailSide * x + (hipLag[0] - hairDx) * t, back[1] + y + hipLag[1] * t, r];
  });
  return part(stroke(tail), flat(MAT.shoe, body.ramps.tail, 2.2), PART_ID.tail, 0.1);
}

// ---- Scarf ends ---------------------------------------------------------------------------------------------------

/** Scarf ends (`neckAcc: 'scarf'`): 2 segments each, ~2 px wide. */
const SCARF_SEGMENTS = 2;
const SCARF_RADIUS = 0.95;
/** Default `ScarfEnds.maxBelowChest`: end points never go below the chest row + this many rows. */
export const SCARF_MAX_BELOW_CHEST = 5;
/** Default `ScarfEnds.maxTrail`: q34 end points trail at most this many px behind their nape root. */
export const SCARF_MAX_TRAIL = 6;
/** Root offset of the second end (front: side by side under the knot; q34: one row lower at the nape). */
const SCARF_SECOND: readonly [Point, Point] = [
  [2, 0],
  [0, 1],
];
/** Chain gravity per end: front = down, splayed 1 px apart; q34 = trailing back (−x), slightly down. */
const SCARF_GRAVITY = {
  front: [
    [-0.025, 0.12],
    [0.03, 0.12],
  ],
  q34: [
    [-0.12, 0.035],
    [-0.12, 0.06],
  ],
} as const satisfies Record<View, readonly [Point, Point]>;
const DEPTH_SCARF = { front: 1.65, q34: 2.4 } as const;

/**
 * Scarf end points of a frame: each simulated end capped at chest + `maxBelowChest`, in q34 ≤ `maxTrail` px behind
 * its root, lifted 1 px on `hairLift`.
 */
export function capScarfEnds(
  sims: readonly (readonly (readonly Point[])[])[],
  frame: number,
  ends: ScarfEnds,
  chestY: number,
  q: boolean,
  lift: number,
): Point[][] {
  const maxY = Math.floor(chestY) + (ends.maxBelowChest ?? SCARF_MAX_BELOW_CHEST);
  const maxTrail = ends.maxTrail ?? SCARF_MAX_TRAIL;
  return sims.flatMap((perFrame) => {
    const pts = perFrame[frame];
    const root = pts?.[0];
    if (!pts || !root) return [];
    return [
      pts.map((pt, i): Point => {
        if (i === 0) return pt;
        const x = q ? Math.max(root[0] - maxTrail, pt[0]) : pt[0];
        return [x, Math.min(maxY, pt[1] - lift)];
      }),
    ];
  });
}

/** Scarf end strokes (trim ramp); degenerate ends (all points equal) are skipped. */
export function buildScarfParts(body: Body, ends: readonly (readonly Point[])[], view: View): Part[] {
  const parts: Part[] = [];
  for (const end of ends) {
    if (end.length < 2 || (end[0]?.[0] === end.at(-1)?.[0] && end[0]?.[1] === end.at(-1)?.[1])) continue;
    parts.push(
      part(
        stroke(chainStroke(end, [SCARF_RADIUS])),
        flat(MAT.trim, body.ramps.trim, 3),
        PART_ID.scarf,
        DEPTH_SCARF[view],
      ),
    );
  }
  return parts;
}

// ---- Chains per animation -----------------------------------------------------------------------------------------

export interface Chains {
  readonly lockL: readonly (readonly Point[])[];
  readonly lockR: readonly (readonly Point[])[];
  readonly tail: readonly (readonly Point[])[];
  /** Per scarf end: per frame points (root + 2). */
  readonly scarf: readonly (readonly (readonly Point[])[])[];
}

/** Looped verlet chains of one animation from its joints (`trailX`: −1 when the clip faces screen-right). */
export function simulateChains(
  body: Body,
  anim: RigAnim,
  js: readonly JointMap[],
  trailX: 1 | -1,
  viewOf: (frame: number) => View,
  scarfOf: (view: View) => ScarfEnds,
): Chains {
  const v = body.variants;
  const tailFront = body.foxTail?.front ?? FOX_TAIL_FRONT;
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
  const root = tailFront.root ?? FOX_TAIL_ROOT;
  return {
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
            anchors((j) => add(j.back, trailX * root[0], root[1])),
            {
              segments: tailFront.radii.length - 1,
              length: tailFront.length,
              gravity: [tailFront.gravity[0] * trailX, tailFront.gravity[1]],
              damping: 0.8,
              loop: anim.loop,
            },
          ).frames
        : [],
    scarf:
      v.neckAcc === 'scarf'
        ? ([0, 1] as const).map((k) => {
            const view: View = trailX === -1 ? 'q34' : 'front';
            return simulateChain(
              js.map((j, f) => {
                const ends = scarfOf(viewOf(f));
                const second = k === 1 ? SCARF_SECOND[viewOf(f) === 'q34' ? 1 : 0] : ([0, 0] as Point);
                const kk = kick(f);
                return [j.neck[0] + ends.at[0] + second[0] + kk[0], j.neck[1] + ends.at[1] + second[1] + kk[1]];
              }),
              {
                segments: SCARF_SEGMENTS,
                // The 2-px stroke adds ~1 px of cap: the drawn end is `length` px long.
                length: Math.max(0.01, (scarfOf(view).lengths[k] - 1) / SCARF_SEGMENTS),
                gravity: SCARF_GRAVITY[view][k],
                damping: 0.75,
                loop: anim.loop,
              },
            ).frames;
          })
        : [],
  };
}

// ---- Legs, hem, torso, arms ---------------------------------------------------------------------------------------

/** Legs. q34: the far leg (R) is drawn behind everything, one ramp step darker unless `farLegShade` is set. */
export function buildLegs(
  body: Body,
  p: PoseFrame,
  j: JointMap,
  q: boolean,
  farLegShade: number | undefined,
): { far: Part[]; back: Part[]; knees: Point[] } {
  const far: Part[] = [];
  const back: Part[] = [];
  const knees: Point[] = [];
  const legMat = flat(MAT.fur, body.ramps.legs, 3.6);
  const farLegMat = flat(MAT.fur, body.ramps.legs, farLegShade ?? 2.6);
  const farLegId = farLegShade === undefined ? PART_ID.legs : PART_ID.farLeg;
  for (const [side, foot] of [
    [-1, j.footL],
    [1, j.footR],
  ] as const) {
    const top: StrokePoint = [j.hip[0] + side * (q ? 1.4 : 2.4), j.hip[1], 1.35];
    if (q) {
      (side === 1 ? far : back).push(
        part(
          stroke([top, [foot[0], foot[1], 1.15]]),
          side === 1 ? farLegMat : legMat,
          side === 1 ? farLegId : PART_ID.legs,
          side === 1 ? 0.7 : 0.8,
        ),
      );
      continue;
    }
    if (p.parts.legs === 'sit') {
      // Seated, thighs toward the viewer: the knee is a 1-px bump just under the (lifted) hem, the shin hangs past it.
      const hemBottom = j.hip[1] + 1.1 - (p.parts.hem?.lift ?? 0);
      const knee: StrokePoint = [foot[0], hemBottom + 0.2, 1.3];
      knees.push([knee[0], knee[1]]);
      back.push(part(stroke([top, knee]), legMat, PART_ID.legs, 0.85));
      back.push(part(ellipse(knee[0], knee[1], 1.4, 1.1, 0.9), flat(MAT.fur, body.ramps.legs, 4), PART_ID.legs, 0.9));
      back.push(
        part(
          stroke([
            [knee[0], knee[1] + 0.8, 1.25],
            [foot[0], foot[1], 1.1],
          ]),
          legMat,
          PART_ID.legs,
          0.8,
        ),
      );
    } else {
      back.push(part(stroke([top, [foot[0], foot[1], 1.15]]), legMat, PART_ID.legs, 0.8));
    }
  }
  return { far, back, knees };
}

/** Hem geometry shared by skirt and shorts: flare (+ squash), sideways lag, lift; q34 far-side width + trailing flare. */
interface HemShape {
  readonly flare: number;
  readonly hemDx: number;
  readonly lift: number;
  readonly farW: number;
  readonly trailFlare: number;
}

export function hemShape(p: PoseFrame, q: boolean): HemShape {
  const hem = p.parts.hem ?? {};
  // q34 widths: the near (trailing, screen-left) side keeps the front half-width, the far side is foreshortened;
  // the hem flares 1 px more on the trailing side.
  return {
    flare: (hem.flare ?? 0) + Math.max(0, p.squash),
    hemDx: hem.dx ?? 0,
    lift: hem.lift ?? 0,
    farW: q ? 0.78 : 1,
    trailFlare: q ? 1 : 0,
  };
}

const cloth3 = (body: Body, seed: string, folds: number, shade = 3): Material =>
  cloth(MAT.cloth, body.ramps.cloth, shade, { folds, cell: 3, seed: `${body.id}:${seed}` });

/** Skirt + petticoat lace (seated: the lace is clipped to 1 row so it ends above the knee bumps). */
export function buildSkirt(body: Body, p: PoseFrame, hip: Point, q: boolean): Part[] {
  const { flare, hemDx, lift, farW, trailFlare } = hemShape(p, q);
  const skirt = poly([
    [hip[0] - 5.6, hip[1] - 10.1],
    [hip[0] + 5.6 * farW, hip[1] - 10.1],
    [hip[0] + 10 * farW + flare + hemDx, hip[1] + 0.1 - lift],
    [hip[0] - 10 - flare - trailFlare + hemDx, hip[1] + 0.1 - lift],
  ]);
  const pet = rect(
    Math.round(hip[0] - 9.4 - flare - trailFlare + hemDx),
    Math.round(hip[1] + 0.1 - lift),
    Math.round(9.4 + 9.4 * farW + 2 * flare + trailFlare),
    p.parts.legs === 'sit' ? 1 : 2,
  );
  return [
    part(curveX(skirt, hip[0] + (q ? 1 : 0), 9), cloth3(body, 'skirt', 1, dressShadeOf(body)), PART_ID.hem, 1),
    part(pet, lace(body, pet, 4), PART_ID.hem, 1.05),
  ];
}

/** Tailored shorts: notch rows between the legs, leg-hem flare px. */
const SHORTS_NOTCH = 1;
const SHORTS_LEG_FLARE = 1;
const SHORTS_DEFAULT_SHADE = 3;

/** Shorts; tailored (`Body.shorts`): raised hem, front 1-px notch between the legs and a 1-px leg-hem flare. */
export function buildShorts(body: Body, p: PoseFrame, hip: Point, q: boolean): Part {
  const { flare, hemDx, lift, farW, trailFlare } = hemShape(p, q);
  const tailored = body.shorts;
  const hemY = hip[1] + 1.2 - lift - (tailored?.raise ?? 0);
  const legOut = tailored && !q ? SHORTS_LEG_FLARE : 0;
  const notch: Point[] =
    tailored && !q
      ? [
          [hip[0] + 0.5 + hemDx, hemY],
          [hip[0] + 0.5 + hemDx, hemY - SHORTS_NOTCH],
          [hip[0] - 0.5 + hemDx, hemY - SHORTS_NOTCH],
          [hip[0] - 0.5 + hemDx, hemY],
        ]
      : [
          [hip[0] + 0.6 + hemDx, hemY],
          [hip[0] + hemDx, hemY - 1],
          [hip[0] - 0.6 + hemDx, hemY],
        ];
  const shorts = poly([
    [hip[0] - 5.4, hip[1] - 4.5],
    [hip[0] + 5.4 * farW, hip[1] - 4.5],
    [hip[0] + 6 * farW + flare + hemDx + legOut, hemY],
    ...notch,
    [hip[0] - 6 - flare - trailFlare + hemDx - legOut, hemY],
  ]);
  return part(
    curveX(shorts, hip[0], 6),
    cloth(MAT.apron, body.ramps.clothAlt, tailored?.shade ?? SHORTS_DEFAULT_SHADE, {
      folds: 0.6,
      cell: 3,
      seed: `${body.id}:shorts`,
    }),
    PART_ID.hem,
    1,
  );
}

/** Bodice tone on the cloth ramp; the default sleeve tone sits one step under it. */
export const BODICE_SHADE = 3;
export const DEFAULT_SLEEVE_SHADE = 2;
/** Bodice + skirt base shade of a body (`Body.dressShade`, default `BODICE_SHADE`). */
export const dressShadeOf = (body: Body): number => body.dressShade ?? BODICE_SHADE;
/** Default bell-cuff shade on the clothAlt ramp. */
export const DEFAULT_CUFF_SHADE = 3;
/** Cuff position along elbow → hand of a long sleeve (and of a raised sleeve-over-hand, slid back to it). */
const LONG_CUFF_T = 0.8;
/** Cuff position along elbow → hand of a short sleeve. */
const SHORT_CUFF_T = 0.62;
/**
 * `Body.sleeveOverHand`: cuff position along elbow → hand (1 = on the hand; `LONG_CUFF_T` slid back with the hand
 * above the shoulder), bell radii, and the radius of the small hand under it (1–2 fingertip px show).
 */
const OVER_HAND = { t: 1.0, raisedT: LONG_CUFF_T, bell: [1.8, 0.9], handR: 0.8 } as const;
/** Arm-end depths: the plain bell cuff, the bigger over-hand bell (over its own hand), the hand. */
const DEPTH_CUFF = 2.2;
const DEPTH_CUFF_OVER_HAND = 2.35;
const DEPTH_HAND = 2.3;

/** Neck, bodice (q34: half-width near 4.8 / far 3.6, lit centre 1 px toward the facing) and waist band / sash. */
export function buildTorso(body: Body, j: JointMap, q: boolean, glow: number): Part[] {
  const v = body.variants;
  const skin = body.outfit.skin.ramp;
  const { chest, hip } = j;
  const farW = q ? 0.78 : 1;
  const waist = v.hem === 'skirt' ? -9.6 : -3.6;
  const half = v.hem === 'skirt' ? 5.6 : 6.2;
  const bodice = poly([
    [chest[0] - 4.8, chest[1] - 2.6],
    [chest[0] + (q ? 3.6 : 4.8), chest[1] - 2.6],
    [hip[0] + half * farW, hip[1] + waist],
    [hip[0] - half, hip[1] + waist],
  ]);
  const band = v.hem === 'skirt' ? -10.1 : -4.6;
  return [
    part(
      rect(Math.round(j.neck[0] - 1.8), Math.round(j.neck[1] - 1.4), 4, 3),
      flat(MAT.skin, skin, 2.2),
      PART_ID.torso,
      0.9,
    ),
    part(
      curveX(bodice, chest[0] + (q ? 1 : 0), 6),
      cloth3(body, 'bodice', 0.4, dressShadeOf(body) + glow),
      PART_ID.torso,
      1,
    ),
    part(
      rect(Math.round(hip[0] - 5.4), Math.round(hip[1] + band), q ? 10 : 11, body.sash?.rows ?? 1),
      flat(MAT.trim, body.ramps.trim, 2.4),
      PART_ID.trim,
      1.6,
    ),
  ];
}

/**
 * One arm: shoulder puff + upper arm, forearm (sleeve or skin), cuff, hand. Sleeves use their own ramp/shade per body
 * (never the bodice tone, so arms read over the torso — RIG.md «arm over torso»); ids per side for the contrast check.
 */
export function buildArm(
  body: Body,
  j: JointMap,
  side: 'L' | 'R',
  arm: ArmVariant,
  view: View,
  sleeve: { readonly ramp: RampName; readonly shade: number },
): { parts: Part[]; hand: Point } {
  const skin = body.outfit.skin.ramp;
  /**
   * q34 far hand: mid skin tone (the outline pass gives its shadow edge), never the highlight; short sleeves also
   * shrink it 1 px (long-sleeve hands are already the small 1.2 radius; smaller hides them behind the torso).
   */
  const farHand = view === 'q34' && side === 'R';
  const shoulder = j[side === 'L' ? 'shoulderL' : 'shoulderR'];
  const elbow = elbowOf(j, side, arm, view);
  const hand = j[side === 'L' ? 'handL' : 'handR'];
  const longSleeve = body.variants.sleeves === 'long';
  const ids = side === 'L' ? ARM_IDS_L : ARM_IDS_R;
  // Sleeve over the hand (opt-in): the bell sits on the hand, over it (only fingertips show); raised, it slides back.
  const over = longSleeve && body.sleeveOverHand === true;
  const raised = hand[1] < shoulder[1];
  const t = over ? (raised ? OVER_HAND.raisedT : OVER_HAND.t) : longSleeve ? LONG_CUFF_T : SHORT_CUFF_T;
  const cuff: Point = [elbow[0] + (hand[0] - elbow[0]) * t, elbow[1] + (hand[1] - elbow[1]) * t];
  // Over the hand the sleeve ends inside the bell (no sleeve px past the cuff).
  const foreEnd: StrokePoint = over ? [...cuff, OVER_HAND.bell[1]] : [...hand, longSleeve ? 1.25 : 0.95];
  const parts: Part[] = [
    part(
      ellipse(shoulder[0] - (side === 'L' ? 0.1 : -0.1), shoulder[1] - 0.2, 2.6, 2.3, 0.9),
      cloth(MAT.cloth, sleeve.ramp, sleeve.shade + 0.2, { folds: 0.3, cell: 2 }),
      ids.upper,
      2,
    ),
    part(
      stroke([
        [...shoulder, 1.55],
        [...elbow, 1.3],
      ]),
      flat(MAT.cloth, sleeve.ramp, sleeve.shade),
      ids.upper,
      2,
    ),
    part(
      stroke([[...elbow, 1.2], foreEnd]),
      longSleeve ? flat(MAT.cloth, sleeve.ramp, sleeve.shade) : flat(MAT.skin, skin, 4),
      ids.fore,
      2.1,
    ),
  ];
  // Arm end (rule iii): a cuff, then >= 2 px of hand skin past it. Long sleeves end in a bell cuff at the wrist
  // and never swallow the hand.
  // A chin paw (sleeve over hand, think) is the authored FIST_PAW mask alone: no procedural cuff or hand under it.
  // It returns the un-adjusted joint hand (no ±0.4 drop, which centres a drawn hand ellipse): no hand is drawn, and
  // `handShadows` only shades a skin px it finds there (the paw mask is stamped later, over it).
  if (over && arm === 'chin') return { parts, hand };
  const bell = over
    ? ellipse(cuff[0], cuff[1], OVER_HAND.bell[0], OVER_HAND.bell[1], 0.6)
    : longSleeve
      ? ellipse(cuff[0], cuff[1], 1.6, 0.75, 0.6)
      : ellipse(cuff[0], cuff[1], 1.3, 0.55, 0.6);
  const cuffTone = body.cuff ?? { ramp: body.ramps.clothAlt, shade: DEFAULT_CUFF_SHADE };
  const cuffDepth = over ? DEPTH_CUFF_OVER_HAND : DEPTH_CUFF;
  parts.push(part(bell, flat(MAT.apron, cuffTone.ramp, cuffTone.shade), ids.end, cuffDepth));
  const handY = hand[1] + (raised ? -0.4 : 0.4);
  const handR = over ? OVER_HAND.handR : farHand && !longSleeve ? 1.0 : longSleeve ? 1.2 : 1.3;
  const handShade = farHand ? 3 : 4.2;
  const handPart = part(
    ellipse(hand[0], handY, handR, handR + 0.05, 1),
    flat(MAT.skin, skin, handShade),
    ids.end,
    DEPTH_HAND,
  );
  parts.push(handPart);
  return { parts, hand: [hand[0], handY] };
}
