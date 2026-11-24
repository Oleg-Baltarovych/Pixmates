// Rig buffer and image passes (docs/art/RIG.md): authored-mask stamping, the opt-in tone passes the composer runs
// after compose (shin wraps, far-leg gap, knee crease, far-shoulder clip, chin fists, spade cut-outs, apron panel),
// the post-outline passes (arm over torso, sleeve/hair line, hand over ties) and the image passes after quantize
// (part labels, squash separator, seam closer). Every pass mutates only what its doc says.
import type { RgbaImage } from '../../tools/lib/png.ts';
import type { IndexBuffer, RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import { LEGEND, maskSize, type Mask, type Swatch } from '../lib/mask.ts';
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
): void {
  const byRamp = new Map<string, SilhouetteOutline>(outlines.map((o) => [o.ramp, o]));
  for (let i = 0; i < map.kind.length; i++) {
    if ((map.kind[i] ?? 0) !== OUTER || buf.material[i] === MAT.horn) continue;
    const ramp = buf.get(i % buf.width, Math.floor(i / buf.width)).ramp;
    const o = ramp === null ? undefined : byRamp.get(ramp);
    if (!o) continue;
    const facing = -((map.ox[i] ?? 0) + (map.oy[i] ?? 0));
    buf.shade[i] = facing > 0 ? o.lit : o.shade;
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
