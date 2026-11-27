// Rig buffer and image passes (docs/art/RIG.md): authored-mask stamping, the opt-in tone passes the composer runs
// after compose (shin wraps, far-leg gap, knee crease, far-shoulder clip, chin fists, spade cut-outs, apron panel),
// the post-outline passes (arm over torso, sleeve/hair line, hand over ties) and the image passes after quantize
// (part labels, squash separator, seam closer). Every pass mutates only what its doc says.
import type { RgbaImage } from '../../tools/lib/png.ts';
import type { IndexBuffer, RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import { LEGEND, maskSize, type Mask, type Slot, type Swatch } from '../lib/mask.ts';
import { MAT } from '../lib/materials.ts';
import { toOklab, type Palette } from '../lib/palette.ts';
import { OUTER, type outline } from '../lib/passes.ts';
import {
  ARM_IDS_L,
  ARM_IDS_R,
  ARM_LABEL,
  LABEL_OF,
  LEFT_ARM,
  LEG_PARTS,
  NEAR_SLEEVE,
  PART_ID,
  SLEEVE_PARTS,
  TORSO_PARTS,
} from './part-ids.ts';
import type { ArmVariant, Body, JointMap, SilhouetteOutline } from './types.ts';

/** Px index → final (ramp index, shade), restored after outline/AA. */
export type Locked = Map<number, readonly [number, number]>;

export const N4: readonly Point[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

// ---- Authored masks -----------------------------------------------------------------------------------------------

const SLOT_MATERIAL: Readonly<Partial<Record<string, number>>> = {
  hair: MAT.hair,
  horn: MAT.horn,
  shoe: MAT.shoe,
  trim: MAT.trim,
};

/** stampMask options: skip px of material `under`, write `partId`, and paint only px whose part `allow` accepts. */
export interface StampOptions {
  readonly under?: number;
  readonly partId?: number;
  readonly allow?: (partId: number) => boolean;
  /** Rows ≥ `from` paint `slot` px with `tones` instead of the outfit's (`HeadPlacement.hemTones`). */
  readonly toneRows?: { readonly from: number; readonly slot: Slot; readonly tones: Swatch['tones'] };
}

/** Stamps an authored mask with final tones and locks its px; returns the px indices it wrote. */
export function stampMask(
  buf: IndexBuffer,
  body: Body,
  mask: Mask,
  x: number,
  y: number,
  depth: number,
  fallback: number,
  locked: Locked,
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
      const tr = opts.toneRows;
      const tones = tr && r >= tr.from && entry[0] === tr.slot ? tr.tones : swatch.tones;
      buf.set(px, py, {
        ramp: swatch.ramp,
        shade: tones[entry[1]],
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

/** `stampMask` bound to a buffer/body/lock map; rounds `x`, `y`. */
export type Stamp = (
  mask: Mask,
  x: number,
  y: number,
  depth: number,
  fallback: number,
  under?: number,
  partId?: number,
) => void;

/**
 * Shoe with a 1-px pointed toe: the sole row again under itself, minus its outer px; its first px takes the shoe's
 * light tone (`l`), a 1-px toe highlight that reads on dark wallpapers.
 */
export function pointToe(mask: Mask): Mask {
  const last = mask[mask.length - 1] ?? '';
  const toe = last.slice(1, -1);
  return [...mask, '.' + (toe.length > 0 ? 'l' + toe.slice(1) : '') + '.'];
}

/**
 * Thinking fist under the chin (screen-right hand; mirrored for the left): a rounded 3 × 3 fist with a warm skin-dark
 * outline (skin shade, never near-black), its top row in shadow tone where it meets the jaw, the knuckle highlight on
 * its top-left in the top skin tone, the bottom-left corner in the skin mid tone (the procedural cuff under it never
 * shows through as a stray dot), and a 1-px dress cuff on the forearm side so the hand separates from the face. Long
 * sleeves end in the cream bell cuff instead (rule iii). `FIST_BREAK` = 2 px of the darker outline tone directly
 * above the fist, stamped without an arm part id (it is the jaw's shadow line).
 */
const FIST: Mask = ['.Ezz..', 'ZSSsZd', 'ZSssZd', 'sZZZ..'];
const FIST_LONG: Mask = ['.Ezz..', 'ZSSsZa', 'ZSssZa', 'sZZZq.'];
/**
 * Sleeve-over-hand paw (`Body.sleeveOverHand`): 2 knuckle px of skin on top (touching the chin) over a single 3-px
 * row of cuff lace; the sleeve itself carries on below (the composer draws no procedural cuff or hand for it).
 */
const FIST_PAW: Mask = ['.Ez...', 'qAq...'];
const FIST_BREAK: Mask = ['.ZZ...'];
/** Chin fist per sleeve kind. */
export type FistKind = 'bare' | 'long' | 'paw';
/** Chin-fist masks per sleeve kind (exported so `createRigPack` runs them through `checkMask`). */
export const FISTS: Readonly<Record<FistKind, Mask>> = { bare: FIST, long: FIST_LONG, paw: FIST_PAW };
/** Chin-fist mask kind of a body: bare hands, long-sleeve cuff, or sleeve-over-hand paw. */
export const fistKindOf = (body: Body): FistKind =>
  body.variants.sleeves === 'short' ? 'bare' : body.sleeveOverHand ? 'paw' : 'long';

/**
 * Gauntlets (`Body.gauntlets`, D-22): every arm-end px (hand, chin fist) on the skin ramp moves to `ramp` at the
 * same shade (clamped to the ramp), locked so later tone passes keep it.
 */
export function gauntletTones(
  buf: IndexBuffer,
  skinRamp: number,
  ramp: { readonly id: number; readonly steps: number },
  locked: Locked,
): void {
  const ends = new Set<number>([ARM_IDS_L.end, ARM_IDS_R.end]);
  for (let i = 0; i < buf.width * buf.height; i++) {
    if (!ends.has(buf.partId[i] ?? -1) || buf.ramp[i] !== skinRamp) continue;
    const shade = Math.min(buf.shade[i] ?? 0, ramp.steps - 1);
    buf.ramp[i] = ramp.id;
    buf.shade[i] = shade;
    locked.set(i, [ramp.id, shade]);
  }
}

/** think: fists stamped over the bow/bib under the chin (after the head), each with its jaw break above. */
export function stampChinFists(
  stamp: Stamp,
  arms: { readonly armL: ArmVariant; readonly armR: ArmVariant },
  j: JointMap,
  kind: FistKind,
): void {
  for (const [side, arm, hand] of [
    ['L', arms.armL, j.handL],
    ['R', arms.armR, j.handR],
  ] as const) {
    if (arm !== 'chin') continue;
    const mask = FISTS[kind];
    const flip = (m: Mask): Mask => (side === 'R' ? m : m.map((r) => r.split('').reverse().join('')));
    const end = (side === 'L' ? ARM_IDS_L : ARM_IDS_R).end;
    const w = maskSize(mask).w;
    const fx = side === 'R' ? Math.round(hand[0]) - 2 : Math.round(hand[0]) + 2 - (w - 1);
    stamp(flip(mask), fx, Math.round(hand[1]) - 1, 3.7, MAT.skin, undefined, end);
    stamp(flip(FIST_BREAK), fx, Math.round(hand[1]) - 2, 3.7, MAT.skin, undefined, PART_ID.none);
  }
}

/**
 * Below its first (shaft) row the spade's '.' px are cut out and stay transparent through outline and AA, so the
 * barbs and the base notch never fill in with the tail tube or its outline.
 */
export function cutSpadeNotches(buf: IndexBuffer, spade: Mask, sx: number, sy: number, locked: Locked): void {
  spade.forEach((row, r) => {
    if (r === 0) return;
    for (let c = 0; c < row.length; c++) {
      if (row.charAt(c) !== '.' || !buf.inBounds(sx + c, sy + r)) continue;
      buf.clear(sx + c, sy + r);
      locked.set((sy + r) * buf.width + sx + c, [-1, 0]);
    }
  });
}

// ---- Tone passes after compose ------------------------------------------------------------------------------------

/** Far shoulder clip (`BodyView.hideFarShoulder`): rows under the far shoulder joint the clip reaches. */
const FAR_SHOULDER_CLIP_ROWS = 2;

/** Opt-in arm clip: far upper-arm px from the top down to the shoulder joint + clip rows are cleared. */
export function clipFarShoulder(buf: IndexBuffer, shoulderY: number): void {
  const top = Math.round(shoulderY + FAR_SHOULDER_CLIP_ROWS);
  for (let y = 0; y <= top && y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) if (buf.partId[y * buf.width + x] === ARM_IDS_R.upper) buf.clear(x, y);
  }
}

/** Skin shade of the 1-px shadow at each hand's lower-right. */
const HAND_SHADOW_SHADE = 2;

/** Each hand's lower-right skin px takes a shadow tone. */
export function handShadows(buf: IndexBuffer, hands: readonly Point[]): void {
  for (const [handX, handY] of hands) {
    const x = Math.round(handX + 0.6);
    const y = Math.round(handY + 0.5);
    if (buf.inBounds(x, y) && buf.get(x, y).material === MAT.skin) buf.shade[y * buf.width + x] = HAND_SHADOW_SHADE;
  }
}

/** Default legs-ramp shade of a shin-wrap row. */
export const WRAP_SHADE = 3;

/**
 * Shin wraps (`Body.shinWrap`): on the row `row` rows above each foot joint, leg px (near or far, legs ramp) within
 * 2 px of the foot take `shade`, locked.
 */
export function shinWrap(
  buf: IndexBuffer,
  feet: readonly Point[],
  row: number,
  shade: number,
  legsRamp: number,
  locked: Locked,
): void {
  for (const foot of feet) {
    const y = Math.round(foot[1]) - row;
    for (let x = Math.round(foot[0]) - 2; x <= Math.round(foot[0]) + 2; x++) {
      if (!buf.inBounds(x, y) || buf.get(x, y).material !== MAT.fur) continue;
      const i = y * buf.width + x;
      if (buf.ramp[i] !== legsRamp || !LEG_PARTS.has(buf.partId[i] ?? 0)) continue;
      buf.shade[i] = shade;
      locked.set(i, [legsRamp, shade]);
    }
  }
}

/** Far-shin gap (`BodyView.farLegShade`): far-leg px 4-adjacent to a near-leg px take shade 0 of their ramp, locked. */
export function farLegGap(buf: IndexBuffer, locked: Locked): void {
  const w = buf.width;
  for (let i = 0; i < w * buf.height; i++) {
    if (buf.partId[i] !== PART_ID.farLeg || (buf.ramp[i] ?? -1) < 0) continue;
    const x = i % w;
    const y = (i - x) / w;
    const touches = N4.some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return buf.inBounds(nx, ny) && buf.partId[ny * w + nx] === PART_ID.legs && (buf.ramp[ny * w + nx] ?? -1) >= 0;
    });
    if (!touches) continue;
    buf.shade[i] = 0;
    locked.set(i, [buf.ramp[i] ?? -1, 0]);
  }
}

/** Seated: a 1-px darker crease under each knee bump, where the shin folds behind it. */
export function kneeCreases(buf: IndexBuffer, knees: readonly Point[], locked: Locked): void {
  for (const [kx, ky] of knees) {
    const y = Math.round(ky + 1.1);
    for (let x = Math.round(kx) - 1; x <= Math.round(kx) + 1; x++) {
      if (!buf.inBounds(x, y) || buf.get(x, y).material !== MAT.fur) continue;
      const i = y * buf.width + x;
      buf.shade[i] = 1;
      locked.set(i, [buf.ramp[i] ?? -1, 1]);
    }
  }
}

/**
 * Spade tail as a smooth 2-tone tube one ramp step under the spade (so the spade pops): the top px of every tail
 * column takes the rim tone (it also reads on dark wallpapers), the rest the shade tone; no lighting or dither noise.
 */
export function tubeTones(buf: IndexBuffer): void {
  const w = buf.width;
  const isTail = (x: number, y: number): boolean =>
    buf.inBounds(x, y) && buf.partId[y * w + x] === PART_ID.tail && buf.material[y * w + x] === MAT.shoe;
  const tone: [number, number][] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < w; x++) if (isTail(x, y)) tone.push([y * w + x, isTail(x, y - 1) ? 1 : 3]);
  }
  for (const [i, shade] of tone) buf.shade[i] = shade;
}

/**
 * Apron front panel (Body.apron): `w` px centred on the hip from `top` down to 1 row above the skirt's last row
 * (flat bottom, follows hem lift and flare), painted only over skirt cloth px (arms and hands in front stay). Lit left
 * edge, shaded right edge; the 1-px frill is a scallop (every other px) on the bottom row and a light/base ruffle on
 * the sides. Final tones, locked.
 */
export function apronPanel(buf: IndexBuffer, body: Body, cx: number, top: number, w: number, locked: Locked): void {
  const W = buf.width;
  const isSkirt = (x: number, y: number): boolean =>
    buf.inBounds(x, y) && buf.partId[y * W + x] === PART_ID.hem && buf.material[y * W + x] === MAT.cloth;
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
      buf.set(x, y, { ramp, shade, material: MAT.apron, depth: 1.2, partId: PART_ID.hem });
      const i = y * W + x;
      locked.set(i, [buf.ramp[i] ?? -1, shade]);
    }
  }
}

/**
 * Silhouette outline (`Body.silhouetteOutline`): outer-outline px whose ramp is listed take shade `lit` where the
 * outline faces the top-left light and `shade` elsewhere (never the near-black shade 0 on a dark ramp). Horn
 * outlines (recoloured by `recolorHornOutline`) keep their tone.
 */
export function silhouetteOutline(
  buf: IndexBuffer,
  map: ReturnType<typeof outline>,
  outlines: readonly SilhouetteOutline[],
  headPx: ReadonlySet<number> = new Set(),
): void {
  const byRamp = new Map<string, SilhouetteOutline>(outlines.map((o) => [o.ramp, o]));
  for (let i = 0; i < map.kind.length; i++) {
    if ((map.kind[i] ?? 0) !== OUTER || buf.material[i] === MAT.horn) continue;
    const ramp = buf.get(i % buf.width, Math.floor(i / buf.width)).ramp;
    const o = ramp === null ? undefined : byRamp.get(ramp);
    if (!o) continue;
    const ox = map.ox[i] ?? 0;
    const oy = map.oy[i] ?? 0;
    const facing = -(ox + oy);
    // `head`: the inner neighbour is a head-mask px (still unlabelled, so no arm or torso drew over it).
    const inner = i - ox - oy * buf.width;
    const h = o.head && headPx.has(inner) && buf.partId[inner] === PART_ID.none ? o.head : undefined;
    buf.shade[i] = facing > 0 ? (h?.lit ?? o.lit) : (h?.shade ?? o.shade);
  }
}

/**
 * `Body.greaves` (MA-69): visible procedural leg px (`MAT.fur`, the legs ramp, part legs / far leg) get calm plate
 * tones. Per row of each leg the first and last px (the contour) stay; inner px run `lit` (first), `shade` (last),
 * `mid` between; one px per leg (4-connected) — the first inner px of its top visible row — takes `spec`.
 */
export function greaveTones(
  buf: IndexBuffer,
  legsRamp: number,
  tones: { readonly lit: number; readonly mid: number; readonly shade: number; readonly spec: number },
): void {
  const w = buf.width;
  const isLeg = (x: number, y: number): boolean => {
    if (!buf.inBounds(x, y)) return false;
    const i = y * w + x;
    return buf.ramp[i] === legsRamp && buf.material[i] === MAT.fur && LEG_PARTS.has(buf.partId[i] ?? 0);
  };
  const seen = new Uint8Array(w * buf.height);
  for (let y0 = 0; y0 < buf.height; y0++) {
    for (let x0 = 0; x0 < w; x0++) {
      if (seen[y0 * w + x0] === 1 || !isLeg(x0, y0)) continue;
      // One leg: its 4-connected px, grouped by row.
      const rows = new Map<number, number[]>();
      const stack: [number, number][] = [[x0, y0]];
      seen[y0 * w + x0] = 1;
      while (stack.length > 0) {
        const [x, y] = stack.pop() ?? [0, 0];
        rows.set(y, [...(rows.get(y) ?? []), x]);
        for (const [dx, dy] of N4) {
          const nx = x + dx;
          const ny = y + dy;
          if (isLeg(nx, ny) && seen[ny * w + nx] === 0) {
            seen[ny * w + nx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      let specDone = false;
      for (const y of [...rows.keys()].sort((a, b) => a - b)) {
        const xs = (rows.get(y) ?? []).sort((a, b) => a - b);
        // Contiguous runs only: a gap (another part) splits a row.
        let start = 0;
        for (let k = 1; k <= xs.length; k++) {
          if (k < xs.length && (xs[k] ?? 0) === (xs[k - 1] ?? 0) + 1) continue;
          const run = xs.slice(start, k);
          start = k;
          const inner = run.slice(1, -1);
          inner.forEach((x, n) => {
            const s = n === 0 ? tones.lit : n === inner.length - 1 ? tones.shade : tones.mid;
            buf.shade[y * w + x] = s;
          });
          const first = inner[0];
          if (!specDone && first !== undefined) {
            buf.shade[y * w + first] = tones.spec;
            specDone = true;
          }
        }
      }
    }
  }
}

/**
 * `Body.sabatons` (MA-69 art-director re-gate): calm plate shoes and greave rims at 1×, after rim light and
 * `greaveTones`. `feet` = the px each shoe stamp wrote, in stamp order (a later shoe's px leave the earlier ones);
 * `preRim` = the shades before `rimLight`; `kind` = the outline map's kinds. Order: leg rims first (only the outer
 * — screen-right — leg keeps the lift on its right edge, `rim` px from the top), then per shoe: rim lift removed and
 * ≤ `max` except one authored `spec` px, outline px beside it ≤ `seam`, the top row one `top` run (one step darker
 * without a spec px) with `seam` ends, the row above the run (± 1 px, opaque shoe/legs-ramp px) `seam`.
 */
export function sabatonTones(
  buf: IndexBuffer,
  feet: readonly (readonly number[])[],
  preRim: Float32Array,
  kind: Uint8Array,
  ramps: { readonly shoe: number; readonly legs: number },
  t: NonNullable<Body['sabatons']>,
): void {
  const w = buf.width;
  const isLeg = (i: number): boolean =>
    buf.ramp[i] === ramps.legs && buf.material[i] === MAT.fur && LEG_PARTS.has(buf.partId[i] ?? 0);
  // Leg rims: 4-connected legs; a rim px = a leg px lifted by the rim whose right neighbour is not a leg px.
  const comp = new Int32Array(w * buf.height).fill(-1);
  const rims: number[][] = [];
  const maxX: number[] = [];
  for (let s = 0; s < comp.length; s++) {
    if (comp[s] !== -1 || !isLeg(s)) continue;
    const id = rims.length;
    rims.push([]);
    maxX.push(-1);
    const stack = [s];
    comp[s] = id;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      const [x, y] = [i % w, Math.floor(i / w)];
      maxX[id] = Math.max(maxX[id] ?? -1, x);
      const right = buf.inBounds(x + 1, y) && isLeg(i + 1);
      if (!right && (buf.shade[i] ?? 0) > (preRim[i] ?? 0)) rims[id]?.push(i);
      for (const [dx, dy] of N4) {
        if (!buf.inBounds(x + dx, y + dy)) continue;
        const n = (y + dy) * w + x + dx;
        if (comp[n] === -1 && isLeg(n)) {
          comp[n] = id;
          stack.push(n);
        }
      }
    }
  }
  const outer = maxX.indexOf(Math.max(-1, ...maxX));
  rims.forEach((px, id) => {
    const keep = id === outer ? t.rim : 0;
    px.sort((a, b) => a - b).forEach((i, k) => {
      if (k >= keep) buf.shade[i] = preRim[i] ?? 0;
    });
  });
  // Shoes: a later shoe (the q34 near one) owns the px it stamped over an earlier one.
  const taken = new Set<number>();
  const shoes = [...feet]
    .reverse()
    .map((px) => {
      const own = px.filter((i) => !taken.has(i) && buf.ramp[i] === ramps.shoe);
      for (const i of own) taken.add(i);
      return own.sort((a, b) => a - b);
    })
    .reverse();
  const silver = (i: number): boolean => buf.ramp[i] === ramps.shoe || buf.ramp[i] === ramps.legs;
  const free = (x: number, y: number): number => {
    if (!buf.inBounds(x, y)) return -1;
    const i = y * w + x;
    return !taken.has(i) && silver(i) ? i : -1;
  };
  for (const own of shoes) {
    const first = own[0];
    if (first === undefined) continue;
    const yTop = Math.floor(first / w);
    let spec = -1;
    for (const i of own) {
      const s = preRim[i] ?? 0;
      if (spec < 0 && s === t.spec) spec = i;
      buf.shade[i] = i === spec ? s : Math.min(s, t.max);
    }
    for (const i of own) {
      const [x, y] = [i % w, Math.floor(i / w)];
      for (const [dx, dy] of N4) {
        const n = y + dy < yTop ? -1 : free(x + dx, y + dy);
        if (n >= 0 && (kind[n] ?? 0) !== 0) buf.shade[n] = Math.min(preRim[n] ?? 0, t.seam);
      }
    }
    const top = own.filter((i) => Math.floor(i / w) === yTop).map((i) => i % w);
    const dark = spec < 0 ? 1 : 0;
    const lit = Math.ceil(top.length / 2);
    top.forEach((x, k) => {
      buf.shade[yTop * w + x] = Math.max(0, (k < lit ? t.top[0] : t.top[1]) - dark);
    });
    const x0 = top[0] ?? 0;
    const x1 = top.at(-1) ?? 0;
    for (const x of [x0 - 1, x1 + 1]) {
      const n = free(x, yTop);
      if (n >= 0) buf.shade[n] = t.seam;
    }
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      const n = free(x, yTop - 1);
      if (n >= 0) buf.shade[n] = t.seam;
    }
  }
}

/**
 * Near-sleeve rim (`Body.sleeveRim`): near (L) sleeve cloth px whose left neighbour is neither arm nor torso (hair,
 * background, empty) take `shade`; px touching the torso keep the arm-over-torso separator.
 */
export function sleeveRim(buf: IndexBuffer, shade: number): void {
  const w = buf.width;
  const hits: number[] = [];
  const idAt = (x: number, y: number): number =>
    buf.inBounds(x, y) && (buf.ramp[y * w + x] ?? -1) >= 0 ? (buf.partId[y * w + x] ?? 0) : PART_ID.none;
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!NEAR_SLEEVE.has(buf.partId[i] ?? 0) || buf.material[i] !== MAT.cloth || (buf.ramp[i] ?? -1) < 0) continue;
      const left = idAt(x - 1, y);
      if (LEFT_ARM.has(left) || TORSO_PARTS.has(left)) continue;
      if (N4.some(([dx, dy]) => TORSO_PARTS.has(idAt(x + dx, y + dy)))) continue;
      hits.push(i);
    }
  }
  for (const i of hits) buf.shade[i] = shade;
}

/** Outline px next to a horn take `ramp` shade 1 (so ivory never reads as a pale ear). */
export function recolorHornOutline(buf: IndexBuffer, map: ReturnType<typeof outline>, ramp: RampName): void {
  for (let i = 0; i < map.kind.length; i++) {
    if ((map.kind[i] ?? 0) !== OUTER) continue;
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

// ---- Tone passes after outline / AA / rim -------------------------------------------------------------------------

/** OKLab L step the composer keeps between sleeve fill and the bodice next to it (the test floor is 0.05). */
const SLEEVE_STEP_L = 0.06;

/**
 * Arm over torso (RIG.md rule i + ii), the last tone pass. (i) Value step: sleeve fill px within 2 px of a torso px
 * step away from the bodice tone (in the sleeve's direction: darker when the sleeve sits under the bodice) until
 * their OKLab L differs by ≥ SLEEVE_STEP_L, so lighting, AO and dither never merge them. (ii) Separator: the sleeve
 * px touching a torso px (in front or behind) takes the deepest tone (shade 0) of its ramp. Hands and cuffs are the
 * contrasting arm end (rule iii) and keep their tones; the outline pass already lines the bodice behind them.
 */
export function armOverTorso(buf: IndexBuffer, palette: Palette, dir: 1 | -1): void {
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

/** Hair px 4-adjacent to a near-sleeve px take the `ramp`'s shade-1 tone (a 1-px line on the hair side). */
export function sleeveHairLine(buf: IndexBuffer, ramp: RampName): void {
  const w = buf.width;
  const hits: [number, number][] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < w; x++) {
      if (buf.material[y * w + x] !== MAT.hair || (buf.ramp[y * w + x] ?? -1) < 0) continue;
      const near = N4.some(
        ([dx, dy]) => buf.inBounds(x + dx, y + dy) && NEAR_SLEEVE.has(buf.partId[(y + dy) * w + x + dx] ?? 0),
      );
      if (near) hits.push([x, y]);
    }
  }
  for (const [x, y] of hits) buf.set(x, y, { ramp, shade: 1, material: MAT.hair, depth: 3 });
}

/**
 * Hand px (arm-end parts, skin) 4-adjacent to a tie px (stamped apron px of `mask` at `at`) take the skin ramp's
 * shade-1 tone: a 1-px dark edge on the hand's back, so a swinging hand never melts into the cream bow; the ties
 * keep their cream tones.
 */
export function handLineOverTies(
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
    const touches = N4.some(([dx, dy]) => buf.inBounds(x + dx, y + dy) && tie.has((y + dy) * w + x + dx));
    if (touches) hits.push(i);
  }
  // Ramp too: an outlined hand edge px may sit on the outline ramp.
  for (const i of hits) [buf.ramp[i], buf.shade[i]] = [skinRamp, skin.tones[1]];
}

// ---- Image passes after quantize ----------------------------------------------------------------------------------

/** Per-px `ARM_LABEL` (red channel, alpha 255 where labelled); a bare (non-cloth) sleeve px counts as its arm end. */
export function labelImage(buf: IndexBuffer): RgbaImage {
  const data = new Uint8Array(buf.width * buf.height * 4);
  for (let i = 0; i < buf.width * buf.height; i++) {
    if ((buf.ramp[i] ?? -1) < 0) continue;
    const part = buf.partId[i] ?? 0;
    const bare = SLEEVE_PARTS.has(part) && buf.material[i] !== MAT.cloth;
    const label = bare ? (LEFT_ARM.has(part) ? ARM_LABEL.endL : ARM_LABEL.endR) : (LABEL_OF[part] ?? ARM_LABEL.none);
    if (label === ARM_LABEL.none) continue;
    data[i * 4] = label;
    data[i * 4 + 3] = 255;
  }
  return { width: buf.width, height: buf.height, data };
}

/**
 * Squash removes rows at the waist, so a sleeve px can newly touch the bodice: such px take the sleeve ramp's
 * deepest tone `deep` (0xRRGGBB), keeping the separator rule (RIG.md «arm over torso» ii) after squash.
 */
export function squashSeparator(img: RgbaImage, labels: RgbaImage, deep: number): RgbaImage {
  const { width: w, height: h } = img;
  const data = new Uint8Array(img.data);
  const lab = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : (labels.data[(y * w + x) * 4] ?? 0);
  const torso = (l: number): boolean => l === ARM_LABEL.torso || l === ARM_LABEL.trim;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = lab(x, y);
      if (l !== ARM_LABEL.sleeveL && l !== ARM_LABEL.sleeveR) continue;
      if (!N4.some(([dx, dy]) => torso(lab(x + dx, y + dy)))) continue;
      const i = (y * w + x) * 4;
      data[i] = (deep >> 16) & 0xff;
      data[i + 1] = (deep >> 8) & 0xff;
      data[i + 2] = deep & 0xff;
    }
  }
  return { ...img, data };
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

/** `Body.legRim`: leg px whose left neighbour is not a leg px take `shade` (the lit outer side of each leg). */
export function legRim(buf: IndexBuffer, shade: number, legsRamp: number, locked: Locked): void {
  const edge: number[] = [];
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      const i = y * buf.width + x;
      if (locked.has(i) || buf.ramp[i] !== legsRamp || !LEG_PARTS.has(buf.partId[i] ?? 0)) continue;
      if (x > 0 && LEG_PARTS.has(buf.partId[i - 1] ?? 0) && (buf.ramp[i - 1] ?? -1) >= 0) continue;
      edge.push(i);
    }
  }
  // Not locked (yet): the later outline / AA passes retone edge rim px (witch: 418 px over all frames). Locking them
  // is a visible change pending art review — see docs/CONTEXT.md gotchas.
  for (const i of edge) buf.shade[i] = shade;
}

/**
 * `BodyView.hairBackCuts` (q34, trailing side = screen-left): on each row the outermost back-hair px is cleared and
 * the px left of the edge on the row above becomes a copy of the edge px there (a 1-px outward flick).
 */
export function hairBackCuts(buf: IndexBuffer, rows: readonly number[]): void {
  const edgeOf = (y: number): number => {
    for (let x = 0; x < buf.width; x++) if (buf.partId[y * buf.width + x] === PART_ID.hair) return x;
    return -1;
  };
  for (const y of rows) {
    if (y < 1 || y >= buf.height) continue;
    const x = edgeOf(y);
    const above = edgeOf(y - 1);
    if (x < 0 || above < 1) continue;
    buf.clear(x, y);
    const src = buf.get(above, y - 1);
    if (src.ramp === null) continue;
    buf.set(above - 1, y - 1, {
      ramp: src.ramp,
      shade: src.shade,
      material: src.material,
      partId: src.partId,
      depth: src.depth,
    });
  }
}

/**
 * `Body.jawOverNeckAcc`: neck-accessory px (still trim) 4-touching a head skin px are cleared and unlocked, so the
 * outline pass gives the jaw its outer outline there as over an empty backdrop (a contour that moves only with the
 * head, whatever the collar does under it).
 */
export function jawOverNeckAcc(
  buf: IndexBuffer,
  neckAccPx: readonly number[],
  headPx: ReadonlySet<number>,
  locked: Locked,
): void {
  const { width: w, height: h } = buf;
  const skin = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const i = y * w + x;
    return headPx.has(i) && buf.material[i] === MAT.skin;
  };
  const ring = neckAccPx.filter((i) => {
    if (buf.partId[i] !== PART_ID.trim) return false;
    const [x, y] = [i % w, Math.floor(i / w)];
    return N4.some(([dx, dy]) => skin(x + dx, y + dy));
  });
  for (const i of ring) {
    buf.clear(i % w, Math.floor(i / w));
    locked.delete(i);
  }
}

/** Nape indent: back-hair px 4-adjacent to a torso / trim px on row `y` take shade 0 of their ramp. */
export function napeIndent(buf: IndexBuffer, y: number): void {
  if (y < 0 || y >= buf.height) return;
  for (let x = 0; x < buf.width; x++) {
    const i = y * buf.width + x;
    if (buf.partId[i] !== PART_ID.hair) continue;
    // Same-row neighbours only (x ± 1 inside the frame; never wraps to the previous / next row).
    const touches = [x - 1, x + 1].some(
      (nx) => nx >= 0 && nx < buf.width && TORSO_PARTS.has(buf.partId[y * buf.width + nx] ?? 0),
    );
    if (touches) buf.shade[i] = 0;
  }
}

/**
 * `Body.skirtSplit` (front): a 1-px cloth-ramp line in column `x` from the lowest hem px up `rows` hem px (skirt
 * and lace; arms or hands in front are skipped), e.g. the centre split of a hakama. Final tones, locked.
 */
/**
 * `Body.skirtSplit` detail opt-ins (front, after `skirtSplit`; final tones, locked): `notchShade` on the leg px in the
 * 2-px notch, `pleats` lines mirrored about the split, and the 2-step screen-left `rim`. Only hem / leg px are painted
 * (arms and hands in front are skipped).
 */
export function skirtDetail(
  buf: IndexBuffer,
  x: number,
  split: NonNullable<Body['skirtSplit']>,
  ramp: number,
  locked: Locked,
): void {
  const w = buf.width;
  const at = (cx: number, cy: number): number => (cx >= 0 && cx < w && cy >= 0 && cy < buf.height ? cy * w + cx : -1);
  const isHem = (i: number): boolean => i >= 0 && buf.partId[i] === PART_ID.hem;
  const set = (i: number, shade: number): void => {
    buf.ramp[i] = ramp;
    buf.shade[i] = shade;
    locked.set(i, [ramp, shade]);
  };
  let bottom = -1;
  for (let y = 0; y < buf.height; y++) if (isHem(at(x, y)) || isHem(at(x - 1, y))) bottom = y;
  if (bottom < 0) return;
  const top = bottom - split.rows + 1;
  if (split.notchShade !== undefined) {
    for (let y = bottom - (split.notch ?? 0) + 1; y <= bottom; y++) {
      for (const cx of [x, x + 1]) {
        const i = at(cx, y);
        const beside = at(x - 1, y);
        if (i < 0 || buf.partId[i] === PART_ID.hem || !isHem(beside)) continue;
        // The gap (legs, the cloak behind them or empty px) becomes an inner leg shadow of the skirt cloth.
        const src = buf.get(x - 1, y);
        if (((buf.alpha[i] ?? 0) === 0 || buf.ramp[i] === -1) && src.ramp !== null)
          buf.set(cx, y, { ...src, ramp: src.ramp, partId: PART_ID.legs });
        if (buf.partId[i] === PART_ID.legs || buf.partId[i] === PART_ID.cloak) set(i, split.notchShade);
      }
    }
  }
  const pleats = split.pleats;
  if (pleats) {
    for (let y = top; y <= bottom; y++) {
      for (const o of pleats.offsets) {
        for (const cx of [x - o, x + 1 + o]) if (isHem(at(cx, y))) set(at(cx, y), pleats.shade);
        const lit = at(x - o - 1, y);
        if (pleats.lit !== undefined && isHem(lit)) set(lit, pleats.lit);
      }
    }
  }
  const rim = split.rim;
  if (rim) {
    let prevLeft = Infinity;
    for (let y = 0; y < buf.height; y++) {
      let left = -1;
      for (let cx = 0; cx < w; cx++) {
        if (isHem(at(cx, y))) {
          left = cx;
          break;
        }
      }
      if (left < 0) {
        prevLeft = Infinity;
        continue;
      }
      if (!isHem(at(left - 1, y)) && at(left - 1, y) >= 0 && buf.partId[at(left - 1, y)] !== PART_ID.legs) {
        set(at(left, y), left < prevLeft && prevLeft !== Infinity ? rim.lit : rim.shade);
      }
      prevLeft = left;
    }
  }
}

/** q34 split: feet at least this many px apart = a contact frame (line + notch + panel hems), else passing. */
export const SPLIT_Q34_CONTACT_DX = 4;

/**
 * `Body.skirtSplit.q34` (q34 frames; final tones, locked; arms / hands in front are skipped): see the type. `hipX` is
 * the hem top x (hip + hem dx); the near leg is L.
 */
export function skirtSplitQ34(
  buf: IndexBuffer,
  hipX: number,
  footL: Point,
  footR: Point,
  split: NonNullable<Body['skirtSplit']>,
  ramp: number,
  locked: Locked,
): void {
  const sq = split.q34;
  if (!sq) return;
  const w = buf.width;
  const isHem = (x: number, y: number): boolean =>
    x >= 0 && x < w && y >= 0 && y < buf.height && buf.partId[y * w + x] === PART_ID.hem;
  const paint = (x: number, y: number, shade: number): void => {
    const i = y * w + x;
    buf.ramp[i] = ramp;
    buf.shade[i] = shade;
    locked.set(i, [ramp, shade]);
  };
  let bottom = -1;
  for (let y = 0; y < buf.height; y++) for (let x = 0; x < w; x++) if (isHem(x, y)) bottom = y;
  if (bottom < 0) return;
  const contact = Math.abs(footL[0] - footR[0]) >= SPLIT_Q34_CONTACT_DX;
  const midX = (footL[0] + footR[0]) / 2;
  const rows = contact ? sq.rows : sq.passNotch;
  const gapAt = (y: number): number => {
    const t = rows <= 1 ? 1 : (y - (bottom - rows + 1)) / (rows - 1);
    return Math.round(hipX + (midX - hipX) * t) - 1;
  };
  // Panel hems: the bottom 2 rows of the front (screen-right) panel extend 1 px forward, the back panel 1 px back.
  if (contact) {
    for (let y = bottom - 1; y <= bottom; y++) {
      const g = gapAt(y);
      let [lo, hi] = [w, -1];
      for (let x = 0; x < w; x++) {
        if (!isHem(x, y)) continue;
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
      }
      if (hi < 0) continue;
      for (const [edge, out] of [
        [hi, 1],
        [lo, -1],
      ] as const) {
        const nx = edge + out;
        const src = buf.get(edge, y);
        if ((edge - g) * out <= 0 || nx < 0 || nx >= w || (buf.alpha[y * w + nx] ?? 0) > 0 || src.ramp === null)
          continue;
        buf.set(nx, y, { ...src, ramp: src.ramp });
        paint(nx, y, buf.shade[y * w + edge] ?? split.shade);
      }
    }
  }
  const notch = contact ? sq.notch : sq.passNotch;
  for (let y = bottom - rows + 1; y <= bottom; y++) {
    const g = gapAt(y);
    const cols = y > bottom - notch ? [g, g + 1] : [g + 1];
    for (const x of cols) {
      if (!isHem(x, y)) continue;
      paint(x, y, y > bottom - notch ? (split.notchShade ?? split.shade) : split.shade);
    }
  }
  if (sq.pleat !== undefined) {
    for (let y = bottom - rows + 1; y <= bottom - 1; y++) {
      const t = (y - (bottom - rows + 1)) / Math.max(1, rows - 1);
      const x = Math.round(hipX + (footL[0] - hipX) * t) - 3;
      if (isHem(x, y) && Math.abs(x - gapAt(y)) > 1) paint(x, y, sq.pleat);
    }
  }
}

export function skirtSplit(
  buf: IndexBuffer,
  x: number,
  rows: number,
  ramp: number,
  shade: number,
  locked: Locked,
): void {
  const w = buf.width;
  let bottom = -1;
  for (let y = 0; y < buf.height; y++) if (buf.partId[y * w + x] === PART_ID.hem) bottom = y;
  for (let y = bottom; y > bottom - rows && y >= 0; y--) {
    const i = y * w + x;
    if (buf.partId[i] !== PART_ID.hem) continue;
    buf.ramp[i] = ramp;
    buf.shade[i] = shade;
    locked.set(i, [ramp, shade]);
  }
}
