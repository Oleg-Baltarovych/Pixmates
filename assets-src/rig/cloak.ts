// Cloak slot (`back: 'cloak'`, docs/art/RIG.md «Cloak»): one general procedural panel behind the back hair, from the
// shoulder line to a hem below the hip, in both views. Geometry is whole px per frame (shape, hem lobes / corner
// curls / drops, sway, seated and dangling hems); tones are final and locked after compose (fill, lit edge, bands,
// interior-only ordered dither, lobe curl lines, corner lining), so light/AO/dither never add noise to it.
import type { IndexBuffer } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import { flat, MAT } from '../lib/materials.ts';
import type { Part } from '../lib/passes.ts';
import { FLAT, type Fragment } from '../lib/shapes.ts';
import { PART_ID } from './part-ids.ts';
import type { Locked } from './passes.ts';
import type { Cloak, JointMap, PoseFrame } from './types.ts';

/** Default sideways trail cap of the hem (px). */
export const CLOAK_MAX_TRAIL = 2;
/** Seated (`sit`, `curl`) hem: this many rows under the seat joint, so the feet always show (no yurei read). */
export const CLOAK_SEAT_HEM = 3;
/** Dangling legs (drag): the hem hangs straight and this many px narrower per side. */
export const CLOAK_DANGLE_NARROW = 2;
/** Band ends stay this many px inside the panel edge (rounded ends). */
const BAND_INSET = 2;
/** q34: the leading edge sits this many px ahead of the hip / chest axis (hidden behind the torso). */
const Q34_LEAD = 3;
/** q34: the trailing hem is foreshortened to this share of the front half-width. */
const Q34_HEM_SHARE = 0.85;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Tone of one cloak px: ramp (cloak or lining) and whole shade. */
interface CloakTone {
  readonly lining: boolean;
  readonly shade: number;
}

/** One frame's cloak: covered px (frame index → tone) and the rows the tones were placed on (tests). */
export interface CloakGeometry {
  readonly px: ReadonlyMap<number, CloakTone>;
  readonly hemY: number;
  readonly topY: number;
}

/**
 * Cloak geometry of one frame. `hipLag` = previous hip − current hip; `prevHairDx` = the previous frame's `hairDx`
 * (q34 1-frame trailing lag). Front: symmetric about the hip axis, the hem sways with the hip lag + `hairDx`; q34: the
 * panel trails to screen-left from the chest, its leading edge `Q34_LEAD` px ahead of the axis.
 */
export function cloakGeometry(
  cloak: Cloak,
  p: PoseFrame,
  j: JointMap,
  q: boolean,
  hipLag: Point,
  prevHairDx: number,
  width: number,
): CloakGeometry {
  const maxTrail = cloak.maxTrail ?? CLOAK_MAX_TRAIL;
  const seated = p.parts.legs === 'sit' || p.parts.legs === 'curl';
  const dangle = p.parts.legs === 'dangle';
  const flareFrame = p.hairLift === 1 || p.squash > 0;
  const topY = Math.round(Math.min(j.shoulderL[1], j.shoulderR[1])) + cloak.top;
  let hemY = Math.round(j.hip[1] + cloak.hemRow) - (p.hairLift === 1 ? 1 : 0);
  if (seated) hemY = Math.min(hemY, Math.round(j.seat[1]) + CLOAK_SEAT_HEM);
  hemY = Math.max(hemY, topY + 2);
  const hemHalf = cloak.widths.hem + Math.max(0, p.squash) - (dangle ? CLOAK_DANGLE_NARROW : 0);
  const hairDx = p.hairDx ?? 0;
  // Front sway: hip lag + back-hair tip offset, capped; q34: trailing extra from the previous frame's stride.
  const sway = q || dangle ? 0 : clamp(Math.round(hipLag[0]) + hairDx, -maxTrail, maxTrail);
  const trail = q ? clamp(Math.abs(prevHairDx) + Math.abs(Math.round(hipLag[0])), 0, maxTrail) : 0;
  const cx = Math.round(j.hip[0]);
  const rows = hemY - topY;
  const spans: [number, number][] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const k = cloak.widths.shape === 'column' ? Math.min(1, 3 * t) : t;
    const half = Math.round(cloak.widths.top + (hemHalf - cloak.widths.top) * k);
    const dx = Math.round(sway * t);
    if (q) {
      const lead = Math.round(j.chest[0]) + Q34_LEAD;
      const back = Math.round(half * (r === 0 ? 1 : Q34_HEM_SHARE + (1 - Q34_HEM_SHARE) * (1 - t)));
      spans.push([cx - back - Math.round(trail * t), lead]);
    } else {
      spans.push([cx - half + dx, cx + half - 1 + dx]);
    }
  }
  const px = new Map<number, CloakTone>();
  const fill: CloakTone = { lining: false, shade: cloak.shade };
  const put = (x: number, y: number, tone: CloakTone = fill): void => {
    if (x >= 0 && x < width && y >= 0) px.set(y * width + x, tone);
  };
  const del = (x: number, y: number): void => {
    px.delete(y * width + x);
  };
  spans.forEach(([x0, x1], r) => {
    const inset = r === 0 && cloak.shoulder === 'round' ? 1 : 0;
    for (let x = x0 + inset; x <= x1 - inset; x++) put(x, topY + r);
  });
  const [h0, h1] = spans[rows] ?? [cx, cx];
  const w = h1 - h0 + 1;
  // Hem lobes: per side `lobes`, the first and last column of each lobe 1 row up (rounded, 1-row dips).
  const lobes = cloak.hem.lobes;
  const dips: number[] = [];
  if (lobes > 0) {
    const n = 2 * lobes;
    for (let k = 0; k < w; k++) {
      const lobe = Math.floor((k * n) / w);
      const first = Math.floor(((k - 1) * n) / w) !== lobe;
      const last = Math.floor(((k + 1) * n) / w) !== lobe;
      if (first || last) del(h0 + k, hemY);
      if (last && k < w - 1) dips.push(h0 + k);
    }
  }
  // Outer corners: a stepped 1-px wisp curling up and out (attached), or a pointed drop.
  const curl = cloak.hem.curl ?? 0;
  for (const [x, out] of [
    [h0, -1],
    [h1, 1],
  ] as const) {
    for (let s = 1; s <= curl; s++) {
      put(x + out * s, hemY - s);
      if (s < curl) put(x + out * s, hemY - s - 1);
    }
    for (let s = 1; s <= (cloak.hem.cornerDrop ?? 0); s++) put(x, hemY + s);
  }
  // Wisps (opt-in): per side `count` tongues evenly spaced over the outer `span` px, widths length → 1.
  const wisps = cloak.hem.wisps;
  const wispTips: number[] = [];
  if (wisps && wisps.count > 0) {
    const centres: number[] = [];
    for (let k = 0; k < wisps.count; k++) {
      const off = Math.floor(((2 * k + 1) * wisps.span) / (2 * wisps.count));
      centres.push(h0 + off);
      if (!q) centres.push(h1 - off);
    }
    for (const c of centres) {
      for (let s = 1; s <= wisps.length; s++) {
        const ww = wisps.length - s + 1;
        const x0 = c - Math.floor((ww - 1) / 2);
        for (let x = x0; x < x0 + ww; x++) {
          put(x, hemY + s);
          if (s === wisps.length) wispTips.push((hemY + s) * width + x);
        }
      }
    }
  }
  // Tones: bands with rounded ends, interior-only dither, lobe curl lines, lit left edge, corner lining.
  const inside = (x: number, y: number): boolean => px.has(y * width + x);
  const interior = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!inside(x + dx, y + dy)) return false;
    return true;
  };
  const rowSpan = (y: number): [number, number] | undefined => spans[y - topY];
  for (const band of cloak.bands) {
    const y = hemY - band.row;
    const span = rowSpan(y);
    if (!span) continue;
    for (let x = span[0] + BAND_INSET; x <= span[1] - BAND_INSET; x++) {
      if (inside(x, y)) put(x, y, { lining: false, shade: band.shade });
    }
  }
  if (cloak.dither) {
    const [a, b] = cloak.dither.shades;
    for (const r of cloak.dither.rows) {
      const y = hemY - r;
      const span = rowSpan(y);
      if (!span) continue;
      // Cloak-local Bayer 2×1: fixed to the hem row and the axis, never to the frame.
      for (let x = span[0]; x <= span[1]; x++) {
        if (interior(x, y)) put(x, y, { lining: false, shade: ((x - cx + r) & 1) === 0 ? a : b });
      }
    }
  }
  if (cloak.hem.curlShade !== undefined) {
    for (const x of dips) if (inside(x, hemY - 1)) put(x, hemY - 1, { lining: false, shade: cloak.hem.curlShade });
  }
  const lit = cloak.litShade;
  if (lit !== undefined) {
    for (const [i, tone] of [...px]) {
      const x = i % width;
      if (!inside(x - 1, Math.floor(i / width)) && tone.shade === cloak.shade) {
        px.set(i, { lining: false, shade: lit });
      }
    }
  }
  if (wisps?.tipShade !== undefined) {
    for (const i of wispTips) px.set(i, { lining: false, shade: wisps.tipShade });
  }
  if (cloak.lining) {
    const [cw, ch] = cloak.lining.corner;
    const lh = ch + (flareFrame ? (cloak.flareRows ?? 0) : 0);
    const tone: CloakTone = { lining: true, shade: cloak.lining.shade };
    const inset = cloak.lining.inset ?? 0;
    for (let r = 0; r < lh; r++) {
      const n = cw - Math.floor((r * cw) / lh);
      const y = hemY - inset - r;
      for (let c = inset; c < n + inset; c++) {
        if (!q && inside(h1 - c, y)) put(h1 - c, y, tone);
        if (inside(h0 + c, y)) put(h0 + c, y, tone);
      }
    }
  }
  return { px, hemY, topY };
}

/** The cloak as a compose part (flat; its tones are replaced and locked by `cloakTones`). */
export function cloakPart(cloak: Cloak, geom: CloakGeometry, width: number): Part {
  const fragments: Fragment[] = [...geom.px.keys()].map((i) => {
    const x = i % width;
    const y = Math.floor(i / width);
    return { x, y, normal: FLAT, u: x, v: y };
  });
  const xs = fragments.map((f) => f.x);
  const ys = fragments.map((f) => f.y);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  return {
    shape: { fragments, x: x0, y: y0, w: Math.max(...xs) - x0 + 1, h: Math.max(...ys) - y0 + 1 },
    material: flat(MAT.cloth, cloak.ramp, cloak.shade),
    partId: PART_ID.cloak,
    depth: 0.1,
  };
}

/**
 * Final cloak tones on the px still showing the cloak after compose; locked through outline / AA. A cloak px left with
 * no cloak 4-neighbour (a 1-px sliver between a leg and the hem) is cleared: the seam closer or the outline fills it.
 */
export function cloakTones(
  buf: IndexBuffer,
  cloak: Cloak,
  geom: CloakGeometry,
  rampIndex: (name: Cloak['ramp']) => number,
  locked: Locked,
): void {
  const ramp = rampIndex(cloak.ramp);
  const lining = cloak.lining ? rampIndex(cloak.lining.ramp) : ramp;
  const w = buf.width;
  const isCloak = (i: number): boolean => buf.partId[i] === PART_ID.cloak;
  const lone = [...geom.px.keys()].filter(
    (i) =>
      isCloak(i) && ![i - 1, i + 1, i - w, i + w].some((n) => n >= 0 && Math.abs((n % w) - (i % w)) <= 1 && isCloak(n)),
  );
  for (const i of lone) buf.clear(i % w, Math.floor(i / w));
  // `innerShade`: a 1-px column where the panel meets the skirt or the legs.
  const body = (n: number): boolean =>
    n >= 0 && n < buf.partId.length && (buf.partId[n] === PART_ID.hem || buf.partId[n] === PART_ID.legs);
  for (const [i, tone] of geom.px) {
    if (!isCloak(i)) continue;
    const r = tone.lining ? lining : ramp;
    const x = i % w;
    const touches = body(i - w) || body(i + w) || (x > 0 && body(i - 1)) || (x < w - 1 && body(i + 1));
    const shade = touches ? (cloak.innerShade ?? tone.shade) : tone.shade;
    buf.ramp[i] = r;
    buf.shade[i] = shade;
    locked.set(i, [r, shade]);
  }
}
