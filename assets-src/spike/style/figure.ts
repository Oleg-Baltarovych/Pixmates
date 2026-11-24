// Style spike figures: two adult proportion variants (B «SD action» 48 × 56 control, C «adult» 48 × 64) for the new
// samurai ronin costume and the goth (owner request 2026-11-24, art-director numbers). Prototype only: nothing here
// is imported by assets-src/packs.ts, so production packs stay byte-identical. All numbers live in PROPS / poses.
import { HEADS, headRows, legendOf, TUFT, type CharId, type Expr, type Head, type Look } from './heads.ts';
import { Paint, type Ink, type Pt } from './paint.ts';

/** B = cheap control, C = main (≈ 4.4 heads), C+ = same anatomy in a bigger frame (bigger face, owner 2026-11-24). */
export type Variant = 'B' | 'C' | 'C+';

export type View = 'front' | 'q34';

export interface Proportions {
  readonly id: Variant;
  /** Head mask set: 'B' = skull 15 × 14 (face 12), 'C' = skull 13 × 13 (face 11). */
  readonly head: 'B' | 'C';
  readonly w: number;
  readonly h: number;
  /** Frame row of the soles. */
  readonly foot: number;
  /** Hip joint → sole, rows. */
  readonly legs: number;
  /** Shoulder line → hip joint, rows. */
  readonly torso: number;
  readonly neck: number;
  readonly shoulder: { readonly m: number; readonly f: number };
  readonly neckW: { readonly m: number; readonly f: number };
  /** Upper arm, forearm (fist 3 px below the wrist). */
  readonly arm: readonly [number, number];
  /** Foot centre to foot centre. */
  readonly stance: { readonly m: number; readonly f: number };
  readonly footW: { readonly m: number; readonly f: number };
}

export const PROPS: Readonly<Record<Variant, Proportions>> = {
  // ≈ 3.2 heads: skull 15 × 14, neck 2, chest→hip 13, hip→foot 18, shoulders 17 / 15, arm 7 + 5 + fist 3.
  B: {
    id: 'B',
    head: 'B',
    w: 48,
    h: 56,
    foot: 54,
    legs: 18,
    torso: 13,
    neck: 2,
    shoulder: { m: 17, f: 15 },
    neckW: { m: 4, f: 3 },
    arm: [7, 5],
    stance: { m: 10, f: 7 },
    footW: { m: 5, f: 4 },
  },
  // ≈ 4.4 heads: skull 13 × 13, neck 3, chest→hip 15, hip→foot 26 (45 %), shoulders 19 / 15, arm 9 + 8 + fist 3.
  C: {
    id: 'C',
    head: 'C',
    w: 48,
    h: 64,
    foot: 62,
    legs: 26,
    torso: 15,
    neck: 3,
    shoulder: { m: 19, f: 15 },
    neckW: { m: 4, f: 3 },
    arm: [9, 8],
    stance: { m: 11, f: 8 },
    footW: { m: 5, f: 4 },
  },
  // ≈ 4.4 heads in 56 × 72: skull 15 × 14 (the B head: face 12, iris 2 × 3), neck 3, chest→hip 17, hip→foot 30,
  // shoulders 21 / 17, arm 10 + 9 + fist 3, stance 13 / 9.
  'C+': {
    id: 'C+',
    head: 'B',
    w: 56,
    h: 72,
    foot: 70,
    legs: 30,
    torso: 17,
    neck: 3,
    shoulder: { m: 21, f: 17 },
    neckW: { m: 5, f: 3 },
    arm: [10, 9],
    stance: { m: 13, f: 9 },
    footW: { m: 6, f: 5 },
  },
};

export type Arms = 'rest' | 'attitude' | 'pump' | 'startle' | 'walk';

export interface Frame {
  readonly view: View;
  /** Whole figure dy (− = up). */
  readonly bob: number;
  /** Shoulders + head dy (inhale −1). */
  readonly breath: number;
  /** Contrapposto: hip dx toward the weight leg; the opposite shoulder drops `tilt` px. */
  readonly hip: number;
  readonly tilt: number;
  readonly expr: Expr;
  readonly arms: Arms;
  /** Walk phase −2…2 (near-arm swing, cloth lag). */
  readonly swing: number;
  /** Feet dx / lift from the stance positions: [screen-left, screen-right]. */
  readonly feet: readonly [Pt, Pt];
  /** Cloth sway −1…1 (haori wisps, hair tips). */
  readonly sway: number;
  /** Small attitude detail (ronin: thumb pushes the tsuba; goth: crossed arms rise with the breath). */
  readonly beat: number;
}

export interface Options {
  /** Owner amendment: the crown tuft + oxblood cord (toggle to compare with and without). */
  readonly tuft: boolean;
}

const SIZE: Readonly<Record<string, number>> = {};
const sizeOf = (ramp: string): number => SIZE[ramp] ?? 6;
export function setRampSizes(sizes: Readonly<Record<string, number>>): void {
  Object.assign(SIZE, sizes);
}

const RONIN_LOOK: Look = {
  hair: 'hair_umber',
  eyeRim: ['jade', 2],
  pupil: ['hair_black', 0],
  glint: ['jade', 5],
};
const GOTH_LOOK: Look = {
  hair: 'hair_black',
  eyeRim: ['horn', 2],
  pupil: ['horn', 0],
  glint: ['cloth_cream', 5],
};

const SKIN: Ink = ['skin', 5];
const SKIN_SH: Ink = ['skin', 4];
const SKIN_DEEP: Ink = ['skin', 3];

interface Layout {
  readonly cx: number;
  readonly hipY: number;
  readonly shY: number;
  readonly neckTop: number;
  readonly chinY: number;
  readonly foot: number;
  readonly half: number;
  readonly sl: number;
  readonly sr: number;
  readonly fl: Pt;
  readonly fr: Pt;
}

function layout(p: Proportions, f: Frame, female: boolean): Layout {
  const cx = Math.floor(p.w / 2);
  const foot = p.foot + f.bob;
  // Female hips sit 1 row higher (art-director: hip 1–2 rows higher).
  const hipY = foot - p.legs + 1 - (female ? 1 : 0);
  const shY = hipY - p.torso + f.breath;
  const neckTop = shY - p.neck;
  const S = female ? p.shoulder.f : p.shoulder.m;
  const half = Math.floor(S / 2);
  const st = female ? p.stance.f : p.stance.m;
  const sh = Math.floor(st / 2);
  const view = f.view === 'q34' ? -1 : 0;
  return {
    cx,
    hipY,
    shY,
    neckTop,
    chinY: neckTop - 1,
    foot,
    half,
    sl: cx - half + (f.view === 'q34' ? 2 : 0),
    sr: cx + (S - half - 1) + (f.view === 'q34' ? -1 : 0),
    fl: [cx - sh + view + f.feet[0][0], p.foot - f.feet[0][1]],
    fr: [cx + st - sh + view + f.feet[1][0], p.foot - f.feet[1][1]],
  };
}

function stampHead(pt: Paint, head: Head, look: Look, expr: Expr, cx: number, chinY: number, view: View): void {
  const rows = headRows(head, expr);
  const w = rows[0]?.length ?? 0;
  for (const [i, r] of rows.entries()) {
    if (r.length !== w)
      throw new Error(`style spike head row ${String(i)} is ${String(r.length)} wide, not ${String(w)}`);
  }
  let chinRow = 0;
  rows.forEach((r, i) => {
    if (r.includes('k')) chinRow = i;
  });
  const x0 = cx - Math.floor(w / 2) + (view === 'q34' ? 1 : 0);
  pt.stamp(rows, legendOf(look), x0, chinY - chinRow);
}

/** Head top-left + crown position for extras (tuft). */
function headTop(head: Head, cx: number, chinY: number, view: View): Pt {
  let chinRow = 0;
  head.mask.forEach((r, i) => {
    if (r.includes('k')) chinRow = i;
  });
  const w = head.mask[0]?.length ?? 0;
  return [cx - Math.floor(w / 2) + (view === 'q34' ? 1 : 0), chinY - chinRow];
}

function neck(pt: Paint, l: Layout, w: number, view: View): void {
  const x0 = l.cx - Math.floor(w / 2) + (view === 'q34' ? 1 : 0);
  for (let y = l.neckTop - 1; y < l.shY + 1; y++) {
    for (let x = x0; x < x0 + w; x++) {
      // 2-row neck shadow under the jaw, lit px on the left.
      const deep = y < l.neckTop + 1;
      pt.set(x, y, deep ? SKIN_DEEP : x === x0 ? SKIN : SKIN_SH);
    }
  }
}

/** Arm from shoulder through elbow to wrist, sleeve width `sw`, 3-px fist below the wrist. */
function arm(pt: Paint, s: Pt, e: Pt, wr: Pt, sw: number, sleeve: Ink, lit: Ink, fist: boolean): void {
  pt.line(s, e, sw, sleeve);
  pt.line(e, wr, sw, sleeve);
  pt.set(s[0] - (sw > 1 ? 1 : 0), s[1], lit);
  if (fist) hand(pt, [wr[0] - 1, wr[1] + 1]);
}

function hand(pt: Paint, [x, y]: Pt): void {
  pt.rect(x, y, 3, 3, SKIN);
  pt.set(x + 2, y + 1, SKIN_SH);
  pt.set(x + 2, y + 2, SKIN_SH);
  pt.set(x + 1, y + 2, SKIN_SH);
}

function zori(pt: Paint, [x, y]: Pt, w: number, dir: -1 | 1): void {
  const x0 = x - Math.floor(w / 2);
  // tabi row (cream sock), sole row with the lit toe, garnet thong px.
  pt.span(x0 + 1, x0 + w - 2, y - 1, ['cloth_cream', 3]);
  pt.span(x0, x0 + w - 1, y, ['horn', 2]);
  pt.set(dir < 0 ? x0 : x0 + w - 1, y, ['horn', 5]);
  pt.set(x0 + Math.floor(w / 2), y - 1, ['gem_garnet', 2]);
}

/** A mist wisp under the haori hem: a rounded tongue 3 → 2 → 1 px wide, leaning with the sway (never a torn rag). */
function wisp(pt: Paint, x: number, y: number, len: number, dx: number, ink: Ink): void {
  for (let r = 0; r < len; r++) {
    const w = r === 0 ? 3 : r < len - 1 ? 2 : 1;
    const x0 = x + Math.trunc((r * dx) / 2) + (r === 0 ? -1 : 0);
    pt.span(x0, x0 + w - 1, y + r, r === len - 1 ? HAORI_FOLD : ink);
  }
}

// ── ronin ────────────────────────────────────────────────────────────────────────────────────────────────────────

const KOSODE: Ink = ['cloth_ash', 1];
const KOSODE_LIT: Ink = ['cloth_ash', 2];
const HAKAMA: Ink = ['hair_umber', 1];
const HAKAMA_LIT: Ink = ['hair_umber', 2];
const PLEAT: Ink = ['hair_umber', 0];
const HAORI: Ink = ['mist', 5];
const HAORI_SH: Ink = ['mist', 4];
const HAORI_FOLD: Ink = ['mist', 3];
const HAORI_LIT: Ink = ['mist', 6];
const OBI: Ink = ['gem_garnet', 1];
const OBI_LIT: Ink = ['gem_garnet', 2];
const LACQUER: Ink = ['hair_black', 1];
const LACQUER_LIT: Ink = ['hair_black', 5];
const BRASS: Ink = ['cloth_ochre', 3];

function roninFront(pt: Paint, p: Proportions, f: Frame, o: Options): void {
  const l = layout(p, f, false);
  const { cx, hipY, shY } = l;
  const hs = f.hip;
  const obiTop = hipY - (p.id !== 'B' ? 4 : 3);
  const obiH = p.id !== 'B' ? 3 : 2;
  const hemY = l.foot - 2;
  const haoriHem = hipY + (p.id !== 'B' ? 7 : 5);
  const edgeL = l.sl - 2;
  const edgeR = l.sr + 2;
  const slY = shY + f.tilt; // screen-left shoulder drops (contrapposto)

  // 1. saya behind the silhouette: from the obi (char's left = screen right) down and out 6–8 px past the haori.
  const koi: Pt = [cx + 4 + hs + f.beat, obiTop + 1];
  const sayaEnd: Pt = [edgeR + 9, koi[1] + 6];
  pt.line(koi, sayaEnd, 2, LACQUER);
  pt.line([koi[0] + 2, koi[1] - 1], [sayaEnd[0], sayaEnd[1] - 1], 1, LACQUER_LIT, true);
  pt.set(sayaEnd[0] + 1, sayaEnd[1], ['metal', 3]);
  pt.set(sayaEnd[0] + 1, sayaEnd[1] - 1, ['metal', 2]);

  // 2. hakama: trapezoid flaring past the hips to the feet, split between the legs, 2 stiff pleats.
  const fw = p.footW.m;
  const hl = l.fl[0] - Math.floor(fw / 2) - 1;
  const hr = l.fr[0] + Math.floor(fw / 2) + 1;
  const wl = cx - l.half + 3 + hs;
  const wr = cx + l.half - 3 + hs;
  const midX = Math.floor((l.fl[0] + l.fr[0]) / 2);
  const split = p.id !== 'B' ? 7 : 4;
  pt.poly(
    [
      [wl, obiTop],
      [wr, obiTop],
      [hr, hemY - Math.min(l.fr[1] - p.foot + 0, 0)],
      [midX + 1, hemY - split + 1],
      [midX, hemY - split],
      [midX - 1, hemY - split + 1],
      [hl, hemY],
    ],
    (x) => (x <= wl + 1 + Math.floor((x - wl) / 8) ? HAKAMA_LIT : HAKAMA),
  );
  // stiff pleats: one hard dark line each side of the centre, diverging toward the hem.
  pt.line([cx - 2 + hs, obiTop + obiH], [midX - 4, hemY - 1], 1, PLEAT);
  pt.line([cx + 2 + hs, obiTop + obiH], [midX + 4, hemY - 1], 1, PLEAT);
  // feet
  zori(pt, l.fl, fw, -1);
  zori(pt, l.fr, fw, 1);

  // 3. kosode torso (charcoal), square shoulders.
  pt.poly(
    [
      [l.sl, slY + 1],
      [l.sl + 1, slY],
      [l.sr - 1, shY],
      [l.sr, shY + 1],
      [wr + 1, obiTop],
      [wl - 1, obiTop],
    ],
    (x) => (x <= l.sl + 2 ? KOSODE_LIT : KOSODE),
  );
  // collar V (eri), left over right, with a skin wedge at the neck.
  const nW = p.neckW.m;
  pt.poly(
    [
      [cx - 2, shY],
      [cx + 1, shY],
      [cx, shY + 3],
    ],
    SKIN_SH,
  );
  pt.line([cx - 3, shY], [cx + 1, shY + (p.id !== 'B' ? 6 : 4)], 1, ['cloth_ash', 4]);
  pt.line([cx + 2, shY], [cx, shY + 2], 1, ['cloth_ash', 3]);
  // futokoro-de: the right hand (screen left) rests inside the kosode → a 3-px bulge under the lapel.
  if (f.arms !== 'pump') {
    const by = shY + (p.id !== 'B' ? 6 : 4);
    pt.rect(cx - 4, by, 3, 2, KOSODE_LIT);
    pt.span(cx - 4, cx - 2, by + 2, ['cloth_ash', 0]);
  }

  // 4. obi (oxblood), lit top row.
  pt.rect(wl - 1, obiTop, wr - wl + 3, obiH, OBI);
  pt.span(wl - 1, wr + 1, obiTop, OBI_LIT);

  // 5. haori panels: square shoulders 2 px past the joint, open front, hem dissolving into tapered wisps.
  const innerL = cx - 3;
  const innerR = cx + 3;
  const panel = (outer: number, inner: number, top: number, side: -1 | 1): void => {
    const pts: Pt[] =
      side < 0
        ? [
            [outer, top + 1],
            [outer + 1, top],
            [inner, top],
            [inner - 2, haoriHem],
            [outer, haoriHem],
          ]
        : [
            [inner, top],
            [outer - 1, top],
            [outer, top + 1],
            [outer, haoriHem],
            [inner + 2, haoriHem],
          ];
    pt.poly(pts, (x, y) => {
      if (y <= top) return HAORI_LIT;
      return side < 0 ? (x <= outer + 1 ? HAORI_LIT : HAORI) : HAORI_SH;
    });
    // collar band along the open front edge
    pt.line([inner, top], [inner - 2 * -side * 0 - (side < 0 ? 2 : -2), haoriHem], 1, ['mist', 3]);
    // one hard fold shape per panel
    const fx = side < 0 ? outer + 3 : outer - 3;
    pt.line([fx, hipY - 3], [fx + side, haoriHem - 1], 1, HAORI_FOLD);
    // wisps: 2 tapered rounded tongues per panel (never torn rags), swaying with the cloth.
    const w0 = side < 0 ? outer : inner + 3;
    const w1 = side < 0 ? inner - 5 : outer - 2;
    for (const [i, wx] of [w0, w1].entries()) {
      const len = p.id !== 'B' ? 4 - i : 3 - i;
      const dx = f.sway * (i === 0 ? 1 : 0);
      wisp(pt, wx, haoriHem + 1, len, dx, side < 0 ? HAORI : HAORI_SH);
    }
  };
  panel(edgeL, innerL, slY, -1);
  panel(edgeR, innerR, shY, 1);

  // 6. sleeves. Screen-left = the right arm tucked in (empty tamoto hanging square); screen-right = sword arm.
  const [ua, fa] = p.arm;
  if (f.arms === 'pump') {
    // happy: the right hand comes out and pumps a fist at shoulder height.
    const s: Pt = [l.sl, slY + 1];
    const e: Pt = [l.sl - 3, slY + ua - 2 + f.beat];
    const wrist: Pt = [l.sl - 3, slY + 1 + f.beat];
    pt.rect(edgeL - 1, slY + 1, 4, ua, HAORI);
    arm(pt, s, e, e, 3, HAORI, HAORI_LIT, false);
    pt.line(e, wrist, 2, KOSODE);
    hand(pt, [wrist[0] - 1, wrist[1] - 3]);
  } else {
    const sx = edgeL - 1;
    const sw = p.id !== 'B' ? 5 : 4;
    const sh = p.id !== 'B' ? ua + fa - 2 : ua + fa - 2;
    const lag = f.arms === 'walk' ? f.swing : 0;
    pt.poly(
      [
        [sx + 1, slY + 1],
        [sx + sw, slY + 1],
        [sx + sw + lag, slY + sh],
        [sx + lag, slY + sh],
      ],
      (x, y) => (y >= slY + sh - 1 ? HAORI_SH : x <= sx + 1 + lag ? HAORI_LIT : HAORI),
    );
    pt.line([sx + sw - 1, slY + 3], [sx + sw - 1 + lag, slY + sh - 2], 1, HAORI_FOLD);
  }
  // sword arm: upper arm down the side, elbow out, forearm (lacquer kote) to the tsuba; tamoto hangs below.
  const tsuba: Pt = [koi[0] - 1, koi[1] - 2];
  const elbow: Pt = [l.sr + 2, shY + ua];
  const sw = p.id !== 'B' ? 4 : 3;
  pt.poly(
    [
      [l.sr - 1, shY + 1],
      [edgeR + 1, shY + 1],
      [edgeR + 2, elbow[1] + 4],
      [elbow[0] - 3, elbow[1] + 4],
    ],
    HAORI_SH,
  );
  pt.line([l.sr, shY + 1], elbow, sw, HAORI_SH);
  pt.line(elbow, [tsuba[0] + 3, tsuba[1]], 2, LACQUER);
  pt.set(elbow[0] - 2, elbow[1] + 1, BRASS);
  pt.set(tsuba[0] + 5, tsuba[1] - (p.id !== 'B' ? 1 : 0), BRASS);

  // 7. katana: tsuba 3 × 3, hilt forward and up ≈ 30° for 7–8 px, brass kashira, sageo + paper charm.
  const hiltEnd: Pt = [tsuba[0] - 7, tsuba[1] - 4];
  pt.line([tsuba[0] - 1, tsuba[1]], hiltEnd, 1, ['hair_black', 1]);
  pt.line([tsuba[0] - 1, tsuba[1] - 1], [hiltEnd[0], hiltEnd[1] - 1], 1, ['hair_black', 2]);
  for (let k = 2; k < 7; k += 2) pt.set(tsuba[0] - k, tsuba[1] - 1 - Math.floor(k / 2), ['mist', 5]);
  pt.set(hiltEnd[0], hiltEnd[1] - 1, BRASS);
  pt.set(hiltEnd[0] - 1, hiltEnd[1], BRASS);
  pt.rect(tsuba[0], tsuba[1] - 1, 3, 3, ['metal', 1]);
  pt.set(tsuba[0], tsuba[1] - 1, ['metal', 3]);
  // left hand rests on the tsuba (thumb on the guard).
  hand(pt, [tsuba[0] + 1, tsuba[1] - 1]);
  // the sageo hangs from the saya just past the haori edge, so the charm reads outside the silhouette.
  const cx0 = edgeR + 3;
  const cord: Pt = [cx0, koi[1] + 1 + Math.floor((5 * (cx0 - koi[0])) / (sayaEnd[0] - koi[0]))];
  pt.line(cord, [cord[0] + 1, cord[1] + 3], 1, ['gem_garnet', 1]);
  pt.rect(cord[0], cord[1] + 4, 2, 3, ['cloth_cream', 5]);
  pt.set(cord[0] + 1, cord[1] + 5, ['gem_garnet', 2]);

  // 8. neck + head (+ tuft).
  neck(pt, l, nW, 'front');
  pt.contour(sizeOf);
  const head = HEADS.ronin[p.head].front;
  const [hx, hy] = headTop(head, cx, l.chinY, 'front');
  if (o.tuft) pt.stamp(TUFT, legendOf(RONIN_LOOK), hx + Math.floor((head.mask[0]?.length ?? 0) / 2) - 2, hy - 2);
  stampHead(pt, head, RONIN_LOOK, f.expr, cx, l.chinY, 'front');
}

function roninQ34(pt: Paint, p: Proportions, f: Frame, o: Options): void {
  const l = layout(p, f, false);
  const { cx, hipY, shY } = l;
  const obiTop = hipY - (p.id !== 'B' ? 4 : 3);
  const obiH = p.id !== 'B' ? 3 : 2;
  const hemY = l.foot - 2;
  const haoriHem = hipY + (p.id !== 'B' ? 7 : 5);
  const back = l.sl - 1;
  const front = l.sr + 1;

  // saya: the far-hip sword sticks out BEHIND (screen left), angled down.
  const koi: Pt = [cx + 1 + f.beat, obiTop + 1];
  const sayaEnd: Pt = [back - 11, koi[1] + 6];
  pt.line(koi, sayaEnd, 2, LACQUER);
  pt.line([koi[0] - 1, koi[1] - 1], [sayaEnd[0], sayaEnd[1] - 1], 1, LACQUER_LIT, true);
  pt.set(sayaEnd[0] - 1, sayaEnd[1], ['metal', 3]);

  // far foot + hakama
  const fw = p.footW.m;
  const midX = Math.floor((l.fl[0] + l.fr[0]) / 2);
  const split = p.id !== 'B' ? 7 : 4;
  const wl = back + 2;
  const wr = front - 1;
  pt.poly(
    [
      [wl, obiTop],
      [wr, obiTop],
      [l.fr[0] + Math.floor(fw / 2) + 2, hemY - (p.foot - l.fr[1])],
      [midX + 1, hemY - split + 1],
      [midX, hemY - split],
      [midX - 1, hemY - split + 1],
      [l.fl[0] - Math.floor(fw / 2) - 1, hemY - (p.foot - l.fl[1])],
    ],
    (x) => (x <= wl + 2 ? HAKAMA_LIT : HAKAMA),
  );
  pt.line([cx + 2, obiTop + obiH], [midX + 4, hemY - 1], 1, PLEAT);
  pt.line([cx - 1, obiTop + obiH], [midX - 2, hemY - split - 1], 1, PLEAT);
  zori(pt, [l.fl[0], l.fl[1] + f.bob], fw, 1);
  zori(pt, [l.fr[0], l.fr[1] + f.bob], fw, 1);

  // kosode
  pt.poly(
    [
      [back + 1, shY + 1],
      [back + 2, shY],
      [front - 1, shY],
      [front, shY + 1],
      [wr, obiTop],
      [wl, obiTop],
    ],
    (x) => (x <= back + 3 ? KOSODE_LIT : KOSODE),
  );
  pt.line([cx + 1, shY], [cx + 4, shY + (p.id !== 'B' ? 6 : 4)], 1, ['cloth_ash', 4]);
  pt.rect(wl, obiTop, wr - wl + 2, obiH, OBI);
  pt.span(wl, wr + 1, obiTop, OBI_LIT);

  // haori: back panel (screen left), front panel edge on the right showing the kosode front.
  pt.poly(
    [
      [back - 1, shY + 1],
      [back, shY],
      [cx + 2, shY],
      [cx + 1, haoriHem],
      [back - 2, haoriHem],
    ],
    (x) => (x <= back + 1 ? HAORI_LIT : HAORI),
  );
  pt.line([cx - 1, hipY - 3], [cx - 1, haoriHem - 1], 1, HAORI_FOLD);
  pt.line([cx + 2, shY], [cx + 1, haoriHem], 1, ['mist', 3]);
  pt.poly(
    [
      [front - 2, shY + 2],
      [front, shY + 2],
      [front + 1, haoriHem - 2],
      [front - 1, haoriHem - 2],
    ],
    HAORI_SH,
  );
  for (const [i, wx] of [back - 2, cx - 3].entries()) {
    const len = (p.id !== 'B' ? 4 : 3) - i;
    const dx = -f.swing + (i === 0 ? f.sway : 0);
    wisp(pt, wx, haoriHem + 1, len, Math.max(-2, Math.min(2, dx)), HAORI);
  }

  // far hand on the hilt in front (screen right), hilt forward-up.
  const tsuba: Pt = [cx + 4 + f.beat, obiTop - 1];
  const hiltEnd: Pt = [tsuba[0] + 7, tsuba[1] - 4];
  pt.line([tsuba[0] + 3, tsuba[1]], hiltEnd, 1, ['hair_black', 1]);
  pt.line([tsuba[0] + 3, tsuba[1] - 1], [hiltEnd[0], hiltEnd[1] - 1], 1, ['hair_black', 2]);
  for (let k = 4; k < 9; k += 2) pt.set(tsuba[0] + k, tsuba[1] - 1 - Math.floor((k - 2) / 2), ['mist', 5]);
  pt.set(hiltEnd[0] + 1, hiltEnd[1] - 1, BRASS);
  pt.rect(tsuba[0], tsuba[1] - 1, 3, 3, ['metal', 1]);
  pt.set(tsuba[0], tsuba[1] - 1, ['metal', 3]);
  pt.line([tsuba[0] - 2, tsuba[1] - 3], [tsuba[0] + 1, tsuba[1] - 1], 2, LACQUER);
  pt.set(tsuba[0] - 1, tsuba[1] - 4, BRASS);
  hand(pt, [tsuba[0] + 1, tsuba[1] - 2]);

  // near (right) arm tucked in: the empty tamoto hangs square in front of the body, swinging on the walk.
  const [ua, fa] = p.arm;
  const sx = cx - 3;
  const sh = ua + fa - 2;
  const lag = f.arms === 'walk' ? f.swing : 0;
  if (f.arms === 'pump') {
    pt.rect(sx, shY + 1, 4, ua, HAORI);
    pt.line([sx + 3, shY + ua], [sx + 5, shY + 2 + f.beat], 2, KOSODE);
    hand(pt, [sx + 4, shY - 1 + f.beat]);
  } else {
    pt.poly(
      [
        [sx, shY + 1],
        [sx + 4, shY + 1],
        [sx + 5 + lag, shY + sh],
        [sx + lag, shY + sh],
      ],
      (x, y) => (y >= shY + sh - 1 ? HAORI_SH : x <= sx + 1 + lag ? HAORI_LIT : HAORI),
    );
    pt.line([sx + 4, shY + 3], [sx + 4 + lag, shY + sh - 2], 1, HAORI_FOLD);
  }
  const cx0 = back - 4;
  const cord: Pt = [cx0, koi[1] + 1 + Math.floor((5 * (koi[0] - cx0)) / (koi[0] - sayaEnd[0]))];
  pt.line(cord, [cord[0] - 1, cord[1] + 3], 1, ['gem_garnet', 1]);
  pt.rect(cord[0] - 2, cord[1] + 4, 2, 3, ['cloth_cream', 5]);
  pt.set(cord[0] - 1, cord[1] + 5, ['gem_garnet', 2]);

  neck(pt, l, p.neckW.m, 'q34');
  pt.contour(sizeOf);
  const head = HEADS.ronin[p.head].q34;
  const [hx, hy] = headTop(head, cx, l.chinY, 'q34');
  if (o.tuft) pt.stamp(TUFT, legendOf(RONIN_LOOK), hx + 3, hy - 2);
  stampHead(pt, head, RONIN_LOOK, f.expr, cx, l.chinY, 'q34');
}

// ── goth ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const DRESS: Ink = ['cloth_black', 2];
const DRESS_LIT: Ink = ['cloth_black', 3];
const DRESS_FOLD: Ink = ['cloth_black', 1];
const SLEEVE: Ink = ['cloth_black', 4]; // one step above the bodice lit strip so the arm reads over the torso
const LACE: Ink = ['cloth_cream', 4];
const HAIR: Ink = ['hair_black', 2];
const HAIR_LIT: Ink = ['hair_black', 4];

function gothFront(pt: Paint, p: Proportions, f: Frame): void {
  const l = layout(p, f, true);
  const { cx, hipY, shY } = l;
  const hemY = l.foot - 2;
  const hs = f.hip;
  const slY = shY + f.tilt;
  // back hair: long, to the hips, 3 pointed clumps.
  const hw = p.id !== 'B' ? 8 : 8;
  pt.poly(
    [
      [cx - hw + 1, l.chinY - 8],
      [cx + hw - 1, l.chinY - 8],
      [cx + hw, hipY - 3],
      [cx + hw - 2, hipY + 1 + f.sway],
      [cx + 3, hipY - 2],
      [cx, hipY + 1],
      [cx - 3, hipY - 2],
      [cx - hw + 2, hipY + 1 - f.sway],
      [cx - hw, hipY - 3],
    ],
    (x) => (x <= cx - hw + 1 ? HAIR_LIT : HAIR),
  );
  // straight long skirt (no slit) from the hips to the ankles, tonal lace hem.
  const hipHalf = Math.floor(p.shoulder.f / 2);
  const hl = cx - hipHalf + hs;
  const hr = cx + hipHalf + hs;
  pt.poly(
    [
      [hl, hipY - 1],
      [hr, hipY - 1],
      [hr + 1, hemY],
      [hl - 1, hemY],
    ],
    (x) => (x <= hl + 1 ? DRESS_LIT : DRESS),
  );
  pt.line([cx - 2 + hs, hipY + 2], [cx - 3 + hs, hemY - 1], 1, DRESS_FOLD);
  pt.line([cx + 3 + hs, hipY + 2], [cx + 4 + hs, hemY - 1], 1, DRESS_FOLD);
  for (let x = hl - 1; x <= hr + 1; x++) pt.set(x, hemY, (x & 1) === 0 ? ['cloth_black', 5] : ['cloth_black', 4]);
  // pointed shoes (1 px shorter feet)
  const fw = p.footW.f;
  for (const [fp, dir] of [
    [l.fl, -1],
    [l.fr, 1],
  ] as const) {
    const x0 = fp[0] - Math.floor(fw / 2);
    pt.span(x0, x0 + fw - 1, fp[1], ['cloth_black', 1]);
    pt.span(x0 + 1, x0 + fw - 2, fp[1] - 1, ['cloth_black', 2]);
    pt.set(dir < 0 ? x0 : x0 + fw - 1, fp[1], ['cloth_black', 4]);
  }
  // bodice: shoulders 15, waist pinched 2 px per side at ≈ 60 % of the torso, hips = shoulders.
  const waistY = shY + Math.floor((p.torso * 6) / 10);
  pt.poly(
    [
      [l.sl, slY + 1],
      [l.sl + 1, slY],
      [l.sr - 1, shY],
      [l.sr, shY + 1],
      [l.sr - 2 + hs, waistY],
      [hr, hipY],
      [hl, hipY],
      [l.sl + 2 + hs, waistY],
    ],
    (x) => (x <= l.sl + 2 ? DRESS_LIT : DRESS),
  );
  // square neckline with a skin wedge, cream choker, the only garnet drop.
  pt.rect(cx - 2, shY, 4, 2, SKIN);
  pt.set(cx + 1, shY + 1, SKIN_SH);
  pt.span(cx - 3, cx + 3, shY - 1 - (p.id !== 'B' ? 0 : 0), LACE);
  // waist band
  pt.span(l.sl + 2 + hs, l.sr - 2 + hs, waistY, ['cloth_black', 1]);
  // arms
  const [ua, fa] = p.arm;
  if (f.arms === 'attitude') {
    // arms crossed under the bust: forearms horizontal, cuffs + one hand visible on each side.
    const y = shY + ua - 2 + f.beat;
    pt.line([l.sl, slY + 1], [l.sl, y], 3, SLEEVE);
    pt.line([l.sr, shY + 1], [l.sr, y], 3, SLEEVE);
    pt.line([l.sl, y], [l.sr - 2, y - 1], 3, SLEEVE);
    pt.line([l.sr, y + 1], [l.sl + 3, y + 2], 3, ['cloth_black', 2]);
    pt.span(l.sr - 3, l.sr - 3, y - 2, LACE);
    pt.span(l.sl + 2, l.sl + 2, y + 1, LACE);
    hand(pt, [l.sr - 3, y - 3]);
    hand(pt, [l.sl + 0, y + 1]);
  } else if (f.arms === 'pump') {
    pt.line([l.sl, slY + 1], [l.sl - 1, shY + ua + fa], 3, SLEEVE);
    pt.rect(l.sl - 3, shY + ua + fa, 5, 2, LACE);
    hand(pt, [l.sl - 2, shY + ua + fa + 2]);
    pt.line([l.sr, shY + 1], [l.sr + 3, shY + ua - 1], 3, SLEEVE);
    pt.line([l.sr + 3, shY + ua - 1], [l.sr + 3, shY + 1 + f.beat], 3, SLEEVE);
    pt.span(l.sr + 2, l.sr + 4, shY + f.beat, LACE);
    hand(pt, [l.sr + 2, shY - 3 + f.beat]);
  } else if (f.arms === 'startle') {
    pt.line([l.sl, slY + 1], [l.sl - 1, shY + ua], 3, SLEEVE);
    pt.line([l.sl - 1, shY + ua], [cx - 3, shY + 4], 3, SLEEVE);
    pt.line([l.sr, shY + 1], [l.sr + 1, shY + ua], 3, SLEEVE);
    pt.line([l.sr + 1, shY + ua], [cx + 3, shY + 5], 3, SLEEVE);
    hand(pt, [cx - 4, shY + 2]);
    hand(pt, [cx + 2, shY + 3]);
  } else {
    const lag = f.arms === 'walk' ? f.swing : 0;
    arm(
      pt,
      [l.sl, slY + 1],
      [l.sl - 1 - lag, slY + 1 + ua],
      [l.sl - 1 - lag, slY + ua + fa],
      3,
      SLEEVE,
      DRESS_LIT,
      false,
    );
    arm(pt, [l.sr, shY + 1], [l.sr + 1, shY + 1 + ua], [l.sr + 1, shY + ua + fa], 3, SLEEVE, SLEEVE, false);
    pt.rect(l.sl - 3 - lag, slY + ua + fa, 5, 2, LACE);
    pt.rect(l.sr - 1, shY + ua + fa, 5, 2, LACE);
    hand(pt, [l.sl - 2 - lag, slY + ua + fa + 2]);
    hand(pt, [l.sr, shY + ua + fa + 2]);
  }
  neck(pt, l, p.neckW.f, 'front');
  pt.contour(sizeOf);
  stampHead(pt, HEADS.goth[p.head].front, GOTH_LOOK, f.expr, cx, l.chinY, 'front');
  // choker gem drop (garnet, ≥ 8 rows below the eyes)
  pt.set(cx, shY, ['gem_garnet', 2], true);
}

function gothQ34(pt: Paint, p: Proportions, f: Frame): void {
  const l = layout(p, f, true);
  const { cx, hipY, shY } = l;
  const hemY = l.foot - 2;
  pt.poly(
    [
      [cx - 7, l.chinY - 8],
      [cx + 2, l.chinY - 8],
      [cx + 1, hipY - 4],
      [cx - 2, hipY + f.sway],
      [cx - 4, hipY - 3],
      [cx - 6, hipY + 1 - f.swing],
      [cx - 8, hipY - 4],
    ],
    (x) => (x <= cx - 7 ? HAIR_LIT : HAIR),
  );
  const hl = l.sl - 1;
  const hr = l.sr;
  const fw = p.footW.f;
  // skirt: straight, the hem follows the feet a little on the walk.
  pt.poly(
    [
      [hl, hipY - 1],
      [hr, hipY - 1],
      [Math.max(hr + 1, l.fr[0] + 2), hemY],
      [Math.min(hl - 1, l.fl[0] - 2), hemY],
    ],
    (x) => (x <= hl + 1 ? DRESS_LIT : DRESS),
  );
  pt.line([cx + 1, hipY + 2], [cx + 1 + Math.sign(f.swing), hemY - 1], 1, DRESS_FOLD);
  for (let x = Math.min(hl - 1, l.fl[0] - 2); x <= Math.max(hr + 1, l.fr[0] + 2); x++) {
    pt.set(x, hemY, (x & 1) === 0 ? ['cloth_black', 5] : ['cloth_black', 4]);
  }
  for (const fp of [l.fl, l.fr]) {
    const x0 = fp[0] - Math.floor(fw / 2) + 1;
    pt.span(x0, x0 + fw - 1, fp[1] + f.bob, ['cloth_black', 1]);
    pt.set(x0 + fw - 1, fp[1] + f.bob, ['cloth_black', 4]);
  }
  const waistY = shY + Math.floor((p.torso * 6) / 10);
  pt.poly(
    [
      [l.sl, shY + 1],
      [l.sl + 1, shY],
      [l.sr - 1, shY],
      [l.sr, shY + 1],
      [l.sr - 2, waistY],
      [hr, hipY],
      [hl, hipY],
      [l.sl + 1, waistY],
    ],
    (x) => (x <= l.sl + 2 ? DRESS_LIT : DRESS),
  );
  pt.rect(cx, shY, 3, 2, SKIN);
  pt.span(cx - 1, cx + 3, shY - 1, LACE);
  pt.span(l.sl + 1, l.sr - 2, waistY, ['cloth_black', 1]);
  const [ua, fa] = p.arm;
  if (f.arms === 'attitude') {
    const y = shY + ua - 2 + f.beat;
    pt.line([cx - 1, shY + 1], [cx - 1, y], 3, SLEEVE);
    pt.line([cx - 1, y], [l.sr + 1, y - 1], 3, SLEEVE);
    pt.span(l.sr, l.sr, y - 2, LACE);
    hand(pt, [l.sr, y - 3]);
  } else {
    const lag = f.arms === 'walk' ? f.swing : 0;
    arm(
      pt,
      [cx - 1, shY + 1],
      [cx - 1 - lag, shY + 1 + ua],
      [cx - 1 - lag, shY + ua + fa],
      3,
      SLEEVE,
      DRESS_LIT,
      false,
    );
    pt.rect(cx - 3 - lag, shY + ua + fa, 5, 2, LACE);
    hand(pt, [cx - 2 - lag, shY + ua + fa + 2]);
  }
  neck(pt, l, p.neckW.f, 'q34');
  pt.contour(sizeOf);
  stampHead(pt, HEADS.goth[p.head].q34, GOTH_LOOK, f.expr, cx, l.chinY, 'q34');
}

export function renderFigure(char: CharId, p: Proportions, f: Frame, o: Options): Paint {
  const pt = new Paint(p.w, p.h);
  if (char === 'ronin') (f.view === 'front' ? roninFront : roninQ34)(pt, p, f, o);
  else if (f.view === 'front') gothFront(pt, p, f);
  else gothQ34(pt, p, f);
  return pt;
}
