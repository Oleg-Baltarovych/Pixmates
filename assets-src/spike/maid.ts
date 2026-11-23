// M-ART art spike (plan MA-07, Amendment D-13): the `maid` — an original horned demoness housekeeper in pixel-anime
// style (ADR 005: own design — chibi proportions, lilac hair in pointed clumps with an angel-ring shine, thin ivory
// hook horns shading to plum, teal dress, cream apron, rose bow, plum stockings and a thin spade-tipped tail). One
// generator renders both sizes: the rig (48 or 64 px, authored per size in maid-48/maid-64) gives geometry and
// masks; the one preset is anime soft (ADR 009, `rig/style.ts`). Pipeline per frame: procedural parts (hair back,
// locks, cloth, limbs) → compose (light, material texture, occlusion, dither; hair never dithered) → authored masks
// (head, face layer per emotion, bow, shoes, spade) → coloured outline + internal lines (horns outlined in plum) →
// selective outline → AA → masks restored → rim light → quantize. Outline and rim run on the composite.
// Phase 2 generalizes this into assets-src/rig/ (MA-23); the spike stays until MA-31.
import type { RgbaImage } from '../../tools/lib/png.ts';
import { createIndexBuffer, quantize, type IndexBuffer } from '../lib/buffer.ts';
import { simulateChain, type Point } from '../lib/chain.ts';
import { checkMask, LEGEND, maskSize, type Mask, type Outfit } from '../lib/mask.ts';
import { cloth, flat, MAT } from '../lib/materials.ts';
import { compose, outline, selectiveOutline, type Material, type Part } from '../lib/passes.ts';
import { antiAlias, rimLight } from '../lib/polish.ts';
import { withBand } from '../rig/body.ts';
import { SOFT as style } from '../rig/style.ts';
import { curveX, ellipse, poly, rect, stroke, type Shape, type StrokePoint } from '../lib/shapes.ts';
import type { AnimDef, PackDef, RenderContext } from '../lib/types.ts';

// ── rig (authored per frame size) ──────────────────────────────────────────────────────────────────────────────

export interface FaceLayers {
  /** Top-left of the face masks at rest (px of this size); moves with the head. */
  readonly at: Point;
  readonly neutral: Mask;
  readonly blink: Mask;
  readonly happy: Mask;
  /** Blush (AA / dithered edges), stamped under every emotion layer. */
  readonly cheeks: Mask;
}

export interface MaidRig {
  readonly size: 48 | 64;
  /** Geometry tables are authored in 48-px units; `k` maps them to this size (1 or 4/3). Motion is scaled too. */
  readonly k: number;
  /** Authored head (skin, fringe clumps, crown highlight, horns), top-left at rest; moves with the head. */
  readonly head: { readonly mask: Mask; readonly at: Point };
  /** Last head-mask row the forehead hair-shadow band may take (keeps it off the lash line); see `withBand`. */
  readonly band: number;
  readonly face: FaceLayers;
  readonly bow: { readonly mask: Mask; readonly at: Point };
  /** Pointed spade (tip down), hung from the tail end by its top-centre px. */
  readonly spade: Mask;
  /** Mary Jane (strap row on the stocking, top-left shine), top-left per foot at rest. */
  readonly shoe: { readonly mask: Mask; readonly left: Point; readonly right: Point };
  /** Side ribbon radius (start, end) in 48-units. */
  readonly ribbon: readonly [number, number];
  /** Apron eyelet row above the scallops (64 only: at 48 the px go to eyes and horns). */
  readonly eyelets: boolean;
}

// ── outfit (ADR 005: original colour scheme) ───────────────────────────────────────────────────────────────────

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: [1, 2, 3, 4, 5, 6] },
  hair: { ramp: 'hair_lilac', tones: [1, 2, 3, 4, 5, 6] },
  horn: { ramp: 'horn', tones: [1, 2, 3, 4, 5, 6] },
  dress: { ramp: 'cloth_teal', tones: [0, 1, 2, 3, 4, 5] },
  apron: { ramp: 'cloth_cream', tones: [0, 1, 2, 3, 4, 5] },
  trim: { ramp: 'cloth_rose', tones: [0, 1, 2, 3, 4, 5] },
  shoe: { ramp: 'hair_plum', tones: [0, 1, 2, 3, 4, 5] },
  eye: { ramp: 'cloth_ochre', tones: [0, 1, 2, 3, 4, 5] },
  // F (index 3) = rose 3, clearly visible on skin at real size; f (index 2) = rose 4, the lighter soft edge.
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

// ── poses (authored once in px; shared by both sizes) ─────────────────────────────────────────────────────────

type Face = 'neutral' | 'blink' | 'happy';

interface Pose {
  /** Whole upper body + skirt, px down. */
  readonly body: number;
  /** Extra head offset (follow-through), px down. */
  readonly head: number;
  /** Inhale: shoulders, bib and head rise by this. */
  readonly breath: number;
  /** Upper body sideways (weight shift), px right. */
  readonly sway: number;
  /** Foot lift (px up) left / right. */
  readonly lift: readonly [number, number];
  /** Hand offsets [dx, dy] left / right. */
  readonly hands: readonly [Point, Point];
  readonly armsUp: boolean;
  /** Landing squash: hem widens, px. */
  readonly squash: number;
  /** Sub-pixel chest glow (shade steps before dither): breathing as a colour shift. */
  readonly glow: number;
  readonly face: Face;
  /** Tail anchor wag, px right. */
  readonly wag: number;
  /** Skirt hem offset, px right (swings opposite to the sway on the passing frames). */
  readonly hem: number;
}

const REST: Pose = {
  body: 0,
  head: 0,
  breath: 0,
  sway: 0,
  lift: [0, 0],
  hands: [
    [0, 0],
    [0, 0],
  ],
  armsUp: false,
  squash: 0,
  glow: 0,
  face: 'neutral',
  wag: 0,
  hem: 0,
};

const pose = (p: Partial<Pose>): Pose => ({ ...REST, ...p });

export const ANIMS: Readonly<Record<'idle_a' | 'walk' | 'happy', AnimDef>> = {
  idle_a: { frames: 8, fps: 6, loop: true },
  walk: { frames: 8, fps: 10, loop: true },
  happy: { frames: 6, fps: 8, loop: true },
};

const IDLE: readonly Pose[] = [
  pose({}),
  pose({ glow: 0.4, wag: 1 }),
  pose({
    breath: 1,
    wag: 1,
    hands: [
      [0, -1],
      [0, -1],
    ],
  }),
  pose({
    breath: 1,
    head: -0,
    glow: 0.4,
    wag: 1,
    hands: [
      [0, -1],
      [0, -1],
    ],
  }),
  pose({ breath: 1, wag: 0, glow: 0.4 }),
  pose({ glow: 0.4, wag: -1 }),
  pose({ face: 'blink', wag: -1 }),
  pose({ wag: -1 }),
];

// Body, lift, hands and squash are authored in 48-px px and scaled by k (rounded) at 64. The contact foot stays
// planted; the hem swings 1 px against the sway on the passing frames (f2, f6); hands swing ±2.
const WALK: readonly Pose[] = [
  pose({ body: 1 }),
  pose({
    head: 1,
    lift: [1, 0],
    sway: 1,
    wag: -1,
    hands: [
      [-1, 0],
      [0, -1],
    ],
  }),
  pose({
    lift: [2, 0],
    sway: 1,
    hem: -1,
    wag: -1,
    hands: [
      [-1, 1],
      [1, -2],
    ],
  }),
  pose({
    lift: [1, 0],
    sway: 1,
    hands: [
      [0, 1],
      [0, -1],
    ],
  }),
  pose({ body: 1, wag: 1 }),
  pose({
    head: 1,
    lift: [0, 1],
    sway: -1,
    wag: 1,
    hands: [
      [0, -1],
      [1, 0],
    ],
  }),
  pose({
    lift: [0, 2],
    sway: -1,
    hem: 1,
    wag: 1,
    hands: [
      [-1, -2],
      [1, 1],
    ],
  }),
  pose({
    lift: [0, 1],
    sway: -1,
    hands: [
      [0, -1],
      [0, 1],
    ],
  }),
];

// Happy: anticipation squash (2 rows at both sizes), 1-row stretch on take-off, peak −3 (48) / −4 (64), landing.
const HAPPY: readonly Pose[] = [
  pose({
    body: 1.5,
    squash: 1,
    face: 'happy',
    hands: [
      [0, 1],
      [0, 1],
    ],
  }),
  pose({ body: -1, breath: 1, lift: [1, 1], armsUp: true, face: 'happy', wag: 1 }),
  pose({ body: -3, head: 2, lift: [2, 2], armsUp: true, face: 'happy', glow: 0.4, wag: 2 }),
  pose({ body: -1, head: -1, lift: [1, 1], armsUp: true, face: 'happy', wag: 1 }),
  pose({
    body: 1,
    head: 1,
    squash: 1,
    face: 'happy',
    hands: [
      [0, 1],
      [0, 1],
    ],
    wag: -1,
  }),
  pose({ face: 'happy', wag: -1 }),
];

const POSES: Readonly<Record<keyof typeof ANIMS, readonly Pose[]>> = { idle_a: IDLE, walk: WALK, happy: HAPPY };

// ── generator ──────────────────────────────────────────────────────────────────────────────────────────────────

const AXIS = 24; // body axis in 48-units (a px boundary, so left/right mirror exactly)
const mirror = (x: number): number => 2 * AXIS - x;

/** Tail centre line in 48-units (behind the skirt, out to the right, down to knee height); radius per point. */
const TAIL: readonly StrokePoint[] = [
  [28.5, 34, 0.95],
  [32, 35.6, 0.9],
  [35, 36.4, 0.85],
  [37, 37.6, 0.8],
  [38, 39.2, 0.75],
];

/** Hair behind the head: 3–4-px clumps split by one dark line, never dithered, no random lit strands. */
const hairClumps = (shade: number): Material => ({
  id: MAT.hair,
  base: () => ({ ramp: 'hair_lilac', shade }),
  texture: (f) => (f.x % 7 === 0 || f.x % 7 === 3 ? -1 : 0),
});

interface Chains {
  readonly ribbonL: readonly (readonly Point[])[];
  readonly ribbonR: readonly (readonly Point[])[];
  readonly lockL: readonly (readonly Point[])[];
  readonly lockR: readonly (readonly Point[])[];
}

/** Material id a mask slot is stamped with (internal lines and the horn outline key on it). */
const SLOT_MATERIAL: Readonly<Partial<Record<string, number>>> = {
  hair: MAT.hair,
  horn: MAT.horn,
  shoe: MAT.shoe,
  trim: MAT.trim,
};

export function createMaidPack(rig: MaidRig): PackDef {
  for (const [name, mask] of [
    ['head', rig.head.mask],
    ['face.neutral', rig.face.neutral],
    ['face.blink', rig.face.blink],
    ['face.happy', rig.face.happy],
    ['face.cheeks', rig.face.cheeks],
    ['bow', rig.bow.mask],
    ['spade', rig.spade],
    ['shoe', rig.shoe.mask],
  ] as const) {
    checkMask(mask, `maid-${String(rig.size)}/${name}`);
  }
  const { k, size } = rig;
  const headMask = withBand(rig.head.mask, rig.band);
  const S = (v: number): number => v * k;
  /** Motion in 48-px px → this size, whole px (rounded away from 0, so −1.5 mirrors 1.5). */
  const M = (v: number): number => Math.sign(v) * Math.round(Math.abs(v) * k);
  const pts = (list: readonly Point[], dx: number, dy: number): [number, number][] =>
    list.map(([x, y]) => [S(x) + dx, S(y) + dy]);
  const sp = (list: readonly StrokePoint[], dx: number, dy: number): StrokePoint[] =>
    list.map(([x, y, r]) => [S(x) + dx, S(y) + dy, S(r)]);
  /** The pose with its body / lift / hands / squash scaled to this size. */
  const scaled = (p: Pose): Pose => ({
    ...p,
    body: M(p.body),
    lift: [M(p.lift[0]), M(p.lift[1])],
    hands: [
      [M(p.hands[0][0]), M(p.hands[0][1])],
      [M(p.hands[1][0]), M(p.hands[1][1])],
    ],
    squash: M(p.squash),
  });

  const chainCache = new Map<string, Chains>();
  const chains = (anim: keyof typeof ANIMS): Chains => {
    const hit = chainCache.get(anim);
    if (hit) return hit;
    const poses = POSES[anim].map(scaled);
    const at = (fn: (p: Pose) => Point): Point[] => poses.map(fn);
    const ground = size === 64 ? 1 : 0;
    const headY = (p: Pose): number => p.body + p.head - p.breath + ground;
    const unit = S(1);
    const result: Chains = {
      ribbonL: simulateChain(
        at((p) => [S(18.6) + p.sway, S(30.6) + p.body + ground]),
        {
          segments: 3,
          length: 2.2 * unit,
          gravity: [-0.015, 0.12],
          damping: 0.8,
        },
      ).frames,
      ribbonR: simulateChain(
        at((p) => [S(mirror(18.6)) + p.sway, S(30.6) + p.body + ground]),
        {
          segments: 3,
          length: 2.2 * unit,
          gravity: [0.015, 0.12],
          damping: 0.8,
        },
      ).frames,
      lockL: simulateChain(
        at((p) => [S(13.4) + p.sway, S(22) + headY(p)]),
        { segments: 3, length: 2.6 * unit, gravity: [0, 0.12], damping: 0.78 },
      ).frames,
      lockR: simulateChain(
        at((p) => [S(mirror(13.4)) + p.sway, S(22) + headY(p)]),
        { segments: 3, length: 2.6 * unit, gravity: [0, 0.12], damping: 0.78 },
      ).frames,
    };
    chainCache.set(anim, result);
    return result;
  };

  const chainStroke = (points: readonly Point[], r0: number, r1: number): StrokePoint[] =>
    points.map(([x, y], i) => [x + 0.5, y + 0.5, S(r0 + ((r1 - r0) * i) / Math.max(1, points.length - 1))]);

  const part = (shape: Shape, material: Material, partId: number, depth: number): Part => ({
    shape,
    material,
    partId,
    depth,
  });

  /** Cream lace: scallops on the last row, eyelets one row above (when the rig has them). */
  const lace = (shape: Shape, id: number, shade: number): Material => {
    const bottom = Math.max(...shape.fragments.map((f) => f.y));
    const folds = cloth(id, 'cloth_cream', shade, {
      folds: 0.7,
      cell: 3,
      seed: 'maid:cloth_cream',
    });
    return {
      ...folds,
      base: (f) => {
        if (f.y === bottom && (f.x & 1) === 1) return null;
        const eyelet = rig.eyelets && f.y === bottom - 1 && (f.x & 1) === 0;
        return { ramp: 'cloth_cream', shade: eyelet ? shade + 1 : shade };
      },
    };
  };

  const render = (anim: string, frame: number, ctx: RenderContext): RgbaImage => {
    if (!(anim in POSES)) throw new Error(`maid: unknown animation "${anim}"`);
    const name = anim as keyof typeof ANIMS;
    const poses = POSES[name];
    const raw = poses[frame];
    if (!raw) throw new Error(`maid: ${anim} has no frame ${String(frame)}`);
    const p = scaled(raw);
    const prev = scaled(poses[(frame + poses.length - 1) % poses.length] ?? raw);
    const ch = chains(name);
    // 64 stands on the frame's last-but-one row (1 px lower than its tables), which buys head room for the jump.
    const ground = size === 64 ? 1 : 0;
    const uy = p.body + ground; // skirt, waist
    const ty = p.body - p.breath + ground; // shoulders, bib, arms
    const hy = p.body + p.head - p.breath + ground; // head
    const sx = p.sway;
    const parts: Part[] = [];

    // Back: long hair (temples → shoulders, uneven ends with 3 points per side), side locks, tail.
    const hairBack = poly(
      pts(
        [
          [12.4, 14],
          [35.6, 14],
          [35.6, 21],
          [35.2, 26.6],
          [34.4, 30.2],
          [33.2, 28.6],
          [31.6, 30.6],
          [30, 28.4],
          [29.4, 28.8],
          [18.6, 28.8],
          [18, 28.4],
          [16.4, 30.6],
          [14.8, 28.6],
          [13.6, 30.2],
          [12.8, 26.6],
          [12.4, 21],
        ],
        sx,
        hy,
      ),
    );
    parts.push(part(ellipse(S(AXIS) + sx, S(14.5) + hy, S(11.6), S(10.4), 0.9), hairClumps(2), 1, 0));
    parts.push(part(curveX(hairBack, S(AXIS) + sx, S(11)), hairClumps(1.6), 1, 0));
    for (const lock of [ch.lockL[frame], ch.lockR[frame]]) {
      if (lock) parts.push(part(stroke(chainStroke(lock, 1.5, 0.8)), hairClumps(2), 1, 0.2));
    }
    // Tail: an authored curve; the wag travels down it a frame late (the tip lags), so the spade overlaps.
    const tail = TAIL.map(([x, y, r], i): StrokePoint => {
      const t = i / (TAIL.length - 1);
      const wag = p.wag * (1 - t) + prev.wag * t;
      return [S(x) + sx * (1 - t) + wag * t * 1.5, S(y) + uy - (t > 0.5 ? Math.abs(wag) * 0.5 : 0), S(r)];
    });
    parts.push(part(stroke(tail), flat(MAT.shoe, 'hair_plum', 2.2), 2, 0.1));

    // Legs: plum stockings, 1 ramp step above the shoes so they separate on dark backdrops (2 px visible at 48, 3 at 64); the contact foot stays planted, a lifted foot rises.
    for (const [side, lift] of [
      [-1, p.lift[0]],
      [1, p.lift[1]],
    ] as const) {
      const hx = side < 0 ? 21.6 : mirror(21.6);
      const fx = side < 0 ? 21.3 : mirror(21.3);
      parts.push(
        part(
          stroke([
            [S(hx), S(39.5) + uy, S(1.35)],
            [S(fx), S(44.6) - lift + ground, S(1.15)],
          ]),
          flat(MAT.fur, 'hair_plum', 3.6),
          3,
          0.8,
        ),
      );
    }

    // Skirt (the hem swings against the sway), petticoat lace, apron, side ribbons.
    const hem = p.squash;
    const skirt = poly(
      pts(
        [
          [18.4, 29.4],
          [29.6, 29.4],
          [34 + hem / k, 39.6],
          [14 - hem / k, 39.6],
        ],
        sx,
        uy,
      ).map(([x, y], i) => [i >= 2 ? x - sx + p.hem : x, y] as [number, number]),
    );
    const skirtShape = curveX(skirt, S(AXIS) + sx, S(9));
    parts.push(
      part(
        skirtShape,
        cloth(MAT.cloth, 'cloth_teal', 3, {
          folds: 1,
          cell: 3 * k,
          seed: 'maid:skirt',
        }),
        4,
        1,
      ),
    );
    const petticoat = rect(
      Math.round(S(14.6) - hem + p.hem),
      Math.round(S(39.6) + uy),
      Math.round(S(18.8) + 2 * hem),
      Math.max(2, Math.round(S(1.4))),
    );
    parts.push(part(petticoat, lace(petticoat, MAT.apron, 4), 4, 1.05));
    const apron = curveX(
      poly(
        pts(
          [
            [20, 30.2],
            [28, 30.2],
            [30.4, 38.8],
            [17.6, 38.8],
          ],
          sx,
          uy,
        ),
      ),
      S(AXIS) + sx,
      S(8),
      0.6,
    );
    parts.push(part(apron, lace(apron, MAT.apron, 4), 5, 1.5));
    for (const rib of [ch.ribbonL[frame], ch.ribbonR[frame]]) {
      if (rib) {
        const shape = stroke(chainStroke(rib, rig.ribbon[0], rig.ribbon[1]));
        parts.push(part(shape, flat(MAT.trim, 'cloth_rose', 2.6), 6, 1.6));
      }
    }

    // Bodice, bib, waist band, neck.
    parts.push(
      part(
        rect(Math.round(S(22.2) + sx), Math.round(S(21.6) + hy), Math.round(S(3.6)), Math.round(S(2.6))),
        flat(MAT.skin, 'skin', 2.2),
        7,
        0.9,
      ),
    );
    const bodice = curveX(
      poly(
        pts(
          [
            [19.2, 23.4],
            [28.8, 23.4],
            [29.6, 30],
            [18.4, 30],
          ],
          sx,
          ty,
        ),
      ),
      S(AXIS) + sx,
      S(6),
    );
    parts.push(
      part(
        bodice,
        cloth(MAT.cloth, 'cloth_teal', 3 + p.glow, {
          folds: 0.4,
          cell: 2 * k,
          seed: 'maid:bodice',
        }),
        7,
        1,
      ),
    );
    const bib = curveX(
      poly(
        pts(
          [
            [21, 24.8],
            [27, 24.8],
            [27.4, 30.4],
            [20.6, 30.4],
          ],
          sx,
          ty,
        ),
      ),
      S(AXIS) + sx,
      S(4),
      0.5,
    );
    parts.push(
      part(
        bib,
        cloth(MAT.apron, 'cloth_cream', 4 + p.glow, {
          folds: 0.3,
          cell: 2 * k,
          seed: 'maid:bib',
        }),
        8,
        1.5,
      ),
    );
    parts.push(
      part(
        rect(Math.round(S(18.6) + sx), Math.round(S(29.4) + uy), Math.round(S(10.8)), Math.max(1, Math.round(S(1.1)))),
        flat(MAT.trim, 'cloth_rose', 2.4),
        8,
        1.6,
      ),
    );

    // Arms: puffed sleeve, upper arm (sleeve), forearm (skin), 1-px cream cuff band, hand.
    const hands: Point[] = [];
    for (const [side, [hdx, hdy]] of [
      [-1, p.hands[0]],
      [1, p.hands[1]],
    ] as const) {
      const m = (x: number): number => (side < 0 ? x : mirror(x));
      const shoulder: StrokePoint = [m(18.8), 25.2, 1.55];
      const elbow: StrokePoint = p.armsUp ? [m(13.2), 25, 1.3] : [m(17.6), 28.4, 1.3];
      const hand: Point = p.armsUp ? [m(10.4), 21.4] : [m(17.3), 31.6];
      const hx = S(hand[0]) + sx + hdx;
      const hyy = S(hand[1]) + (p.armsUp ? hy : ty) + hdy;
      parts.push(
        part(
          ellipse(S(m(18.7)) + sx, S(25) + ty, S(2.6), S(2.3), 0.9),
          cloth(MAT.cloth, 'cloth_teal', 3.2, { folds: 0.3, cell: 2 }),
          9,
          2,
        ),
      );
      parts.push(part(stroke([...sp([shoulder, elbow], sx, ty)]), flat(MAT.cloth, 'cloth_teal', 3), 9, 2));
      const elbowPx: StrokePoint = [S(elbow[0]) + sx, S(elbow[1]) + ty, S(1.2)];
      parts.push(part(stroke([elbowPx, [hx, hyy, S(0.95)]]), flat(MAT.skin, 'skin', 4), 10, 2.1));
      const cuffT = 0.62;
      const cuffX = elbowPx[0] + (hx - elbowPx[0]) * cuffT;
      const cuffY = elbowPx[1] + (hyy - elbowPx[1]) * cuffT;
      parts.push(part(ellipse(cuffX, cuffY, S(1.3), 0.55, 0.6), flat(MAT.apron, 'cloth_cream', 3), 10, 2.2));
      const handY = hyy + (p.armsUp ? -0.4 : 0.4);
      parts.push(part(ellipse(hx, handY, S(1.3), S(1.35), 1), flat(MAT.skin, 'skin', 4.2), 10, 2.3));
      hands.push([hx, handY]);
    }

    const buf = createIndexBuffer(size, size, ctx.palette);
    compose(buf, parts, ctx.rampSize, {
      light: { strength: style.light },
      occlusion: {
        radius: 1,
        strength: style.occlusion,
        cast: { length: 1, strength: 0.4 },
      },
      dither: { spread: style.dither, round: ['hair_lilac'] },
    });

    // Finger separation: one darker px on the shadow (right, lower) side of each hand.
    for (const [hx, handY] of hands) {
      const x = Math.round(hx + S(0.6));
      const y = Math.round(handY + S(0.5));
      if (buf.inBounds(x, y) && buf.get(x, y).material === MAT.skin) buf.shade[y * size + x] = 2;
    }

    // Authored masks; their px are locked (restored after outline / AA).
    const locked = new Map<number, readonly [number, number]>();
    const stamp = (mask: Mask, x: number, y: number, depth: number, fallback: number, under?: number): void => {
      stampMask(buf, mask, x, y, depth, fallback, locked, under);
    };
    stamp(rig.bow.mask, Math.round(rig.bow.at[0] + sx), Math.round(rig.bow.at[1] + ty), 1.7, MAT.trim);
    stamp(headMask, Math.round(rig.head.at[0] + sx), Math.round(rig.head.at[1] + hy), 3.5, MAT.skin);
    const faceX = Math.round(rig.face.at[0] + sx);
    const faceY = Math.round(rig.face.at[1] + hy);
    stamp(rig.face.cheeks, faceX, faceY, 3.6, MAT.skin, MAT.hair);
    stamp(rig.face[p.face], faceX, faceY, 3.6, MAT.skin, MAT.hair);
    const tip = tail[tail.length - 1];
    if (tip) {
      const half = maskSize(rig.spade).w >> 1;
      stamp(rig.spade, Math.round(tip[0] - 0.5) - half, Math.round(tip[1] - 0.5), 0.15, MAT.shoe);
    }
    stamp(rig.shoe.mask, rig.shoe.left[0], rig.shoe.left[1] - p.lift[0] + ground, 0.9, MAT.shoe);
    stamp(rig.shoe.mask, rig.shoe.right[0], rig.shoe.right[1] - p.lift[1] + ground, 0.9, MAT.shoe);

    const map = outline(buf, ctx.rampSize, {
      drop: style.drop,
      internal: true,
    });
    // Horns: outlined from the plum ramp, so the ivory never reads as a pale ear.
    const N4: readonly Point[] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (let i = 0; i < map.kind.length; i++) {
      if ((map.kind[i] ?? 0) !== 1) continue;
      const x = i % size;
      const y = Math.floor(i / size);
      const nextToHorn = N4.some(
        ([dx, dy]) => buf.inBounds(x + dx, y + dy) && buf.get(x + dx, y + dy).material === MAT.horn,
      );
      if (nextToHorn) {
        buf.set(x, y, {
          ramp: 'hair_plum',
          shade: 1,
          material: MAT.horn,
          depth: 3.5,
        });
        map.source[i] = 2;
      }
    }
    selectiveOutline(buf, map, { lit: 'lighter' });
    if (style.aa) antiAlias(buf, map);
    for (const [i, [ramp, shade]] of locked) {
      buf.ramp[i] = ramp;
      buf.shade[i] = shade;
    }
    rimLight(buf, map, ctx.rampSize, { strength: style.rim });
    return quantize(buf, ctx.palette);
  };

  return {
    id: `spike-maid-${String(size)}soft`,
    name: `maid spike ${String(size)} ${style.name}`,
    version: '0.0.1',
    author: 'Pixmates (generated by code)',
    frameSize: { w: size, h: size },
    anchor: { x: 0.5, y: 1 },
    animations: ANIMS,
    fallbacks: {
      idle: 'idle_a',
      run: 'walk',
      climb: 'walk',
      hang: 'idle_a',
      peek: 'idle_a',
      '*': 'idle_a',
    },
    render,
  };
}

/**
 * Paints an authored mask straight into the composite (after light, before outline): its tones are final. Each px
 * is recorded in `locked` (ramp index + shade). With `under`, px whose current material is `under` are left alone
 * (face layers never cover the fringe: brows show only through its gaps).
 */
function stampMask(
  buf: IndexBuffer,
  mask: Mask,
  x: number,
  y: number,
  depth: number,
  fallback: number,
  locked: Map<number, readonly [number, number]>,
  under?: number,
): void {
  mask.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const entry = LEGEND[row.charAt(c)];
      const px = x + c;
      const py = y + r;
      if (!entry || !buf.inBounds(px, py)) continue;
      if (under !== undefined && buf.get(px, py).material === under) continue;
      const swatch = OUTFIT[entry[0]];
      const material = SLOT_MATERIAL[entry[0]] ?? fallback;
      buf.set(px, py, {
        ramp: swatch.ramp,
        shade: swatch.tones[entry[1]],
        depth,
        material,
      });
      const i = py * buf.width + px;
      locked.set(i, [buf.ramp[i] ?? -1, buf.shade[i] ?? 0]);
    }
  });
}

// One forehead-band implementation for the spike and the rig (code review nit).
export { withBand };
