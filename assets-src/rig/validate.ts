// Body validation before rendering (docs/art/RIG.md «Body opt-ins»): every authored mask, opt-in ramps and shades,
// per-view parts, faces and expressions, head-accessory and other opt-in bounds. `createRigPack` calls
// `validateBody` first; it throws with every problem found.
import type { RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import { checkMask, LEGEND, maskSize, type Mask } from '../lib/mask.ts';
import MASTER from '../palettes/master.json' with { type: 'json' };
import { frame as poseFrame } from './anims/kit.ts';
import { resolveJoints } from './body.ts';
import { layoutOf } from './layout.ts';
import { BREATH_GLOW, dressShadeOf, HEM_LIFT_MAX, hemLiftOf, skirtRampOf } from './chains.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace, type ExpressionId, type ViewFaceLibrary } from './face.ts';
import { FISTS, fistKindOf } from './passes.ts';
import type { Body, BodyView, PlacedMask, RigAnim, View, Visor } from './types.ts';
import { bodyViewOf, headViewOf, usesView } from './views.ts';

/** Highest index of a six-tone ramp / swatch (shade opt-ins are 0..MAX_SHADE). */
const MAX_SHADE = 5;
/** Master palette ramp → tone count (validation only; rendering reads `ctx.palette`). */
const MASTER_RAMP_SIZE: ReadonlyMap<string, number> = new Map(
  Object.entries(MASTER.ramps).map(([name, tones]) => [name, tones.length]),
);

/**
 * All body-part validation before rendering: every authored mask (front, q34, apron, sash knot), shade opt-ins in
 * range, required per-view parts (q34 view, scarf ends, spade), faces and expressions. Throws with every problem.
 */
export function validateBody(body: Body, anims: readonly RigAnim[], frameH: number): void {
  const layout = layoutOf();
  if (!layout.frameHChoices.includes(frameH)) {
    throw new Error(`${body.id}: frame height ${String(frameH)} is not one of ${layout.frameHChoices.join('/')}`);
  }
  const q34 = body.views?.q34;
  const usesQ34 = usesView(anims, 'q34');
  if (usesQ34 && !q34) {
    throw new Error(`${body.id}: q34 poses (walk, turn) need Body.views.q34 (head, face, masks; ADR 010)`);
  }
  const masks: [string, Mask | undefined][] = [
    ['head', body.head.mask],
    ['shoe', body.masks.shoe],
    ['headAcc', body.masks.headAcc?.mask],
    ['headAccRising', body.masks.headAccRising],
    ['neckAcc', body.masks.neckAcc?.mask],
    ['spade', body.masks.spade],
    ['bib', body.apron?.bib.mask],
    ['ties', body.apron?.ties?.mask],
    ['sashKnot', body.sash?.knot.mask],
    ['torsoMask', body.torsoMask?.mask],
    ['tassets', body.tassets?.front.mask],
    ['tassets.seated', body.tassets?.seated?.mask],
    ['sode', body.sode?.mask],
    ['prop', body.prop?.mask],
    ['prop.dangle', body.prop?.dangle?.mask],
    ['prop.hilt', body.prop?.hilt?.mask],
  ];
  if (q34) {
    masks.push(
      ['q34/head', q34.head.mask],
      ['q34/shoe', q34.masks.shoe],
      ['q34/headAcc', q34.masks.headAcc?.mask],
      ['q34/headAccRising', q34.masks.headAccRising],
      ['q34/neckAcc', q34.masks.neckAcc?.mask],
      ['q34/bib', q34.apron?.bib.mask],
      ['q34/ties', q34.apron?.ties?.mask],
      ['q34/hairFar', q34.masks.hairFar?.mask],
      ['q34/hairBack', q34.masks.hairBack?.mask],
      ['q34/sashKnot', q34.sashKnot?.mask],
      ['q34/torsoMask', q34.torsoMask?.mask],
      ['q34/tassets', q34.tassets?.front.mask],
      ['q34/tassets.seated', q34.tassets?.seated?.mask],
      ['q34/sode', q34.sode?.mask],
      ['q34/prop', q34.prop?.mask],
      ['q34/prop.dangle', q34.prop?.dangle?.mask],
      ['q34/prop.hilt', q34.prop?.hilt?.mask],
      ['q34/visor.up', body.visor?.upQ34?.mask],
      ['q34/visor.down', body.visor?.downQ34?.mask],
      ...Object.entries(body.visor?.slitQ34 ?? {}).map(([e, m]): [string, Mask] => [`q34/visor.slit.${e}`, m.mask]),
    );
  }
  masks.push(['visor.up', body.visor?.up.mask], ['visor.down', body.visor?.down.mask]);
  for (const [e, m] of Object.entries(body.visor?.slit ?? {})) masks.push([`visor.slit.${e}`, m.mask]);
  masks.push(['chinFist', FISTS[fistKindOf(body)]]);
  for (const [name, mask] of masks) if (mask) checkMask(mask, `${body.id}/${name}`);
  const partProblems: string[] = [];
  const sleeveRamp = body.sleeve?.ramp ?? body.ramps.cloth;
  const outlines = body.silhouetteOutline ?? [];
  const ramps: [string, RampName | undefined][] = [
    ['sleeve', body.sleeve?.ramp],
    ['cuff', body.cuff?.ramp],
    ['cloak', body.cloak?.ramp],
    ['cloak.lining', body.cloak?.lining?.ramp],
    ['gauntlets', body.gauntlets?.ramp],
    ...outlines.map((o, i): [string, RampName] => [`silhouetteOutline[${String(i)}]`, o.ramp]),
  ];
  for (const [name, ramp] of ramps) {
    if (ramp !== undefined && !MASTER_RAMP_SIZE.has(ramp)) {
      partProblems.push(`${body.id}: ${name} ramp "${ramp}" is not in the master palette`);
    }
  }
  /** Highest shade index of a ramp (its tone count − 1; an unknown ramp is reported above). */
  const topOf = (ramp: RampName): number => (MASTER_RAMP_SIZE.get(ramp) ?? MAX_SHADE + 1) - 1;
  const outlineRamps = outlines.map((o) => o.ramp);
  for (const r of new Set(outlineRamps.filter((r, i) => outlineRamps.indexOf(r) !== i))) {
    partProblems.push(`${body.id}: silhouetteOutline lists ramp "${r}" more than once`);
  }
  /** Shade opt-ins: 0..MAX_SHADE, within their ramp when it is known, whole when written straight into buf.shade. */
  const shades: { name: string; s: number | undefined; ramp?: RampName; int?: true }[] = [
    { name: 'shorts.shade', s: body.shorts?.shade },
    { name: 'shinWrap.shade', s: body.shinWrap?.shade },
    { name: 'legRim', s: body.legRim, ramp: body.ramps.legs, int: true },
    // Fractional on purpose (a far-leg tone between two steps).
    { name: 'views.q34.farLegShade', s: q34?.farLegShade },
    // The bodice lifts by BREATH_GLOW on breath frames.
    { name: 'dressShade + breath glow', s: dressShadeOf(body) + BREATH_GLOW, ramp: body.ramps.cloth },
    { name: 'sleeve.shade', s: body.sleeve?.shade, ramp: sleeveRamp },
    ...(body.cuff ? [{ name: 'cuff.shade', s: body.cuff.shade, ramp: body.cuff.ramp, int: true as const }] : []),
    { name: 'sleeveRim', s: body.sleeveRim, ramp: sleeveRamp, int: true },
    ...(body.hakama
      ? [{ name: 'hakama.shade', s: body.hakama.shade, ramp: body.hakama.ramp, int: true as const }]
      : []),
    { name: 'skirtSplit.shade', s: body.skirtSplit?.shade, ramp: skirtRampOf(body), int: true },
    { name: 'skirtSplit.notchShade', s: body.skirtSplit?.notchShade, ramp: skirtRampOf(body), int: true },
    { name: 'skirtSplit.pleats.shade', s: body.skirtSplit?.pleats?.shade, ramp: skirtRampOf(body), int: true },
    { name: 'skirtSplit.pleats.lit', s: body.skirtSplit?.pleats?.lit, ramp: skirtRampOf(body), int: true },
    { name: 'skirtSplit.rim.shade', s: body.skirtSplit?.rim?.shade, ramp: skirtRampOf(body), int: true },
    { name: 'skirtSplit.rim.lit', s: body.skirtSplit?.rim?.lit, ramp: skirtRampOf(body), int: true },
    { name: 'skirtSplit.q34.pleat', s: body.skirtSplit?.q34?.pleat, ramp: skirtRampOf(body), int: true },
    ...cloakShades(body),
    ...outlines.flatMap((o) => [
      { name: `silhouetteOutline.${o.ramp}.lit`, s: o.lit, ramp: o.ramp, int: true as const },
      { name: `silhouetteOutline.${o.ramp}.shade`, s: o.shade, ramp: o.ramp, int: true as const },
    ]),
  ];
  for (const { name, s, ramp, int } of shades) {
    if (s === undefined) continue;
    const top = Math.min(MAX_SHADE, ramp === undefined ? MAX_SHADE : topOf(ramp));
    if (!(s >= 0 && s <= top)) partProblems.push(`${body.id}: ${name} ${String(s)} is outside 0..${String(top)}`);
    else if (int && !Number.isInteger(s)) partProblems.push(`${body.id}: ${name} ${String(s)} must be a whole shade`);
  }
  partProblems.push(...headAccProblems(body, frameH));
  const raise = body.skirtRaise;
  if (raise !== undefined) {
    if (!(Number.isInteger(raise) && raise >= 0 && raise <= SKIRT_RAISE_MAX)) {
      partProblems.push(`${body.id}: skirtRaise ${String(raise)} must be a whole 0..${String(SKIRT_RAISE_MAX)}`);
    }
    if (body.variants.hem !== 'skirt') partProblems.push(`${body.id}: skirtRaise needs hem 'skirt'`);
  }
  partProblems.push(...slotProblems(body, usesQ34));
  const maxLift = Math.max(0, ...anims.flatMap((a) => a.frames.map((f) => hemLiftOf(body, f))));
  if (maxLift > HEM_LIFT_MAX) {
    partProblems.push(
      `${body.id}: pose hem.lift + raise reaches ${String(maxLift)} rows (max ${String(HEM_LIFT_MAX)})`,
    );
  }
  const cuts = q34?.hairBackCuts;
  if (cuts) {
    const bad = [...cuts.rows, ...(cuts.nape === undefined ? [] : [cuts.nape])].filter(
      (r) => !(Number.isInteger(r) && r >= 0 && r <= HAIR_CUT_MAX_ROW),
    );
    // Each cut flicks the row above it: two cuts on the same or adjacent rows would overwrite each other.
    const sorted = [...cuts.rows].sort((a, b) => a - b);
    const crowded = sorted.some((r, i) => i > 0 && r - (sorted[i - 1] ?? -2) < 2);
    if (bad.length > 0 || crowded || cuts.rows.length > HAIR_CUT_MAX_COUNT) {
      partProblems.push(
        `${body.id}: hairBackCuts rows must be ≤ ${String(HAIR_CUT_MAX_COUNT)} distinct, non-adjacent whole offsets 0..${String(HAIR_CUT_MAX_ROW)}`,
      );
    }
  }
  if (partProblems.length > 0) throw new Error(partProblems.join('\n'));
  if (body.sleeveOverHand && body.variants.sleeves !== 'long') {
    throw new Error(`${body.id}: sleeveOverHand needs sleeves 'long'`);
  }
  if (body.variants.neckAcc === 'scarf') {
    if (!body.scarf) throw new Error(`${body.id}: neckAcc 'scarf' needs Body.scarf (front ends)`);
    if (usesQ34 && !q34?.scarf) throw new Error(`${body.id}: neckAcc 'scarf' needs views.q34.scarf`);
  }
  const faceAtOf = (view: View, head: Body['head']): Point => {
    const rest = resolveJoints(body, poseFrame({}), frameH, view);
    return [rest.face[0] - (rest.head[0] + head.at[0]), rest.face[1] - (rest.head[1] + head.at[1])];
  };
  const problems = validateFace(
    body.face,
    body.id,
    { mask: body.head.mask, faceAt: faceAtOf('front', body.head) },
    EXPRESSIONS,
  );
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
  problems.push(...collarProblems(body, anims, frameH));
  problems.push(...mouthMaskProblems(body, usesQ34, faceAtOf));
  problems.push(...visorProblems(body, anims, usesQ34, faceAtOf));
  if (problems.length > 0) throw new Error(problems.join('\n'));
  if (body.variants.back === 'spade_tail' && !body.masks.spade) throw new Error(`${body.id}: spade_tail needs a spade`);
}

/**
 * `headAcc: 'hat'` bounds (figure units): at most `w` × `h` px, top row at rest ≥ `top` (the outline adds 1 row and
 * the highest pose lifts the head 3, so the apex stays ≥ frame row 3 with 8 headroom rows), inside the frame width.
 */
export const HAT_MAX = { w: 28, h: 10, top: -1 } as const;
/** `Body.skirtRaise` upper bound (rows): the hem stays below the knees. */
export const SKIRT_RAISE_MAX = 3;
/** `BodyView.hairBackCuts` bounds: offsets from the head / neck joint and the number of cut rows. */
export const HAIR_CUT_MAX_ROW = 24;
export const HAIR_CUT_MAX_COUNT = 4;

/**
 * `neckAcc: 'collar'` bounds (R-V2, docs/art/vampire.md §7): at most `w` × `h` px; on every frame the placed collar
 * stays inside cols `x0`..`x1` (raised hands live at x ≤ 10 / ≥ 38, and arms draw over a collar) and its top row
 * sits ≥ `eyeGap` rows under the bottom row of the open eyes (a collar tip at eye level reads as ear-muffs).
 */
export const COLLAR_MAX = { w: 27, h: 9, x0: 11, x1: 37, eyeGap: 1 } as const;

function collarProblems(body: Body, anims: readonly RigAnim[], frameH: number): string[] {
  if (body.variants.neckAcc !== 'collar') return [];
  const problems: string[] = [];
  const maskOf = (view: View): PlacedMask | undefined =>
    view === 'front' ? body.masks.neckAcc : body.views?.[view]?.masks.neckAcc;
  for (const view of ['front', 'q34'] as const) {
    const acc = maskOf(view);
    if (!acc) continue;
    const { w, h } = maskSize(acc.mask);
    if (w > COLLAR_MAX.w || h > COLLAR_MAX.h) {
      problems.push(
        `${body.id}/${view}: collar ${String(w)} × ${String(h)} exceeds ${String(COLLAR_MAX.w)} × ${String(COLLAR_MAX.h)}`,
      );
    }
  }
  const seen = new Set<string>();
  for (const a of anims) {
    a.frames.forEach((f, i) => {
      const view = bodyViewOf(a, i);
      const acc = maskOf(view);
      const lib = headViewOf(a, i) === 'q34' ? body.views?.q34?.face : body.face;
      const eyes = lib?.eyes.open;
      if (!acc || !eyes) return;
      const j = resolveJoints(body, f, frameH);
      const x = Math.round(j.neck[0] + acc.at[0]);
      const top = Math.round(j.neck[1] + acc.at[1]);
      const x1 = x + maskSize(acc.mask).w - 1;
      const eyeBottom = Math.round(j.face[1]) + eyes.at[1] + eyes.mask.length - 1;
      const name = `${body.id}/${a.name}/${String(i).padStart(2, '0')}`;
      const out = `cols ${String(x)}..${String(x1)}`;
      if ((x < COLLAR_MAX.x0 || x1 > COLLAR_MAX.x1) && !seen.has(`x${out}`)) {
        seen.add(`x${out}`);
        problems.push(`${name}: collar ${out} leave x ${String(COLLAR_MAX.x0)}..${String(COLLAR_MAX.x1)}`);
      }
      if (top < eyeBottom + COLLAR_MAX.eyeGap && !seen.has(`t${String(top)}`)) {
        seen.add(`t${String(top)}`);
        problems.push(`${name}: collar top row ${String(top)} is not under the eyes (bottom row ${String(eyeBottom)})`);
      }
    });
  }
  return problems;
}

/** Head-accessory checks: a rising alternate matches its mask; a hat stays inside `HAT_MAX` in every view. */
function headAccProblems(body: Body, frameH: number): string[] {
  const problems: string[] = [];
  const views: readonly (readonly [View, BodyView['masks'] | Body['masks'] | undefined])[] = [
    ['front', body.masks],
    ['q34', body.views?.q34?.masks],
  ];
  for (const [view, masks] of views) {
    if (!masks) continue;
    const acc = masks.headAcc;
    const name = `${body.id}/${view}`;
    if (masks.headAccRising) {
      if (!acc) problems.push(`${name}: headAccRising needs headAcc`);
      else {
        const [a, r] = [maskSize(acc.mask), maskSize(masks.headAccRising)];
        if (a.w !== r.w || a.h !== r.h) problems.push(`${name}: headAccRising must be the size of headAcc`);
      }
    }
    if (body.variants.headAcc !== 'hat') continue;
    if (!acc) {
      problems.push(`${name}: headAcc 'hat' needs a headAcc mask`);
      continue;
    }
    const { w, h } = maskSize(acc.mask);
    const rest = resolveJoints(body, poseFrame({}), frameH, view);
    const x = Math.round(rest.acc[0] + acc.at[0]);
    const layout = layoutOf();
    const top = Math.round(rest.acc[1] + acc.at[1]) - (frameH - layout.figureH);
    if (w > HAT_MAX.w || h > HAT_MAX.h) {
      problems.push(`${name}: hat ${String(w)} × ${String(h)} exceeds ${String(HAT_MAX.w)} × ${String(HAT_MAX.h)}`);
    }
    if (top < HAT_MAX.top) problems.push(`${name}: hat top row ${String(top)} is above ${String(HAT_MAX.top)}`);
    if (x < 1 || x + w > layout.w - 1) {
      problems.push(`${name}: hat cols ${String(x)}..${String(x + w - 1)} leave the frame`);
    }
  }
  return problems;
}

/** `Body.skirtSplit.rows` upper bound (the split stays in the lower hem). */
export const SKIRT_SPLIT_MAX = 12;
/** `Body.hakama.drop` upper bound (extra standing hem rows). */
export const HAKAMA_DROP_MAX = 16;
/** `Body.skirtSplit.hemHalf` bounds (px from the hip axis): at least the waist half-width, at most the default bell. */
export const SKIRT_HEM_HALF_RANGE = [6, 10] as const;
/** `Body.sash.dy` upper bound (whole rows under the default waist band). */
export const SASH_DY_MAX = 3;
/** `Body.cloak` bounds: hem rows below the hip, `maxTrail` px, lobes per side. */
export const CLOAK_MAX = { hemRow: 6, maxTrail: 4, lobes: 4, wisps: 3, wispLength: 3 } as const;

/** Cloak shade opt-ins (whole, within their ramps). */
function cloakShades(body: Body): { name: string; s: number | undefined; ramp?: RampName; int: true }[] {
  const c = body.cloak;
  if (!c) return [];
  return [
    { name: 'cloak.shade', s: c.shade, ramp: c.ramp, int: true },
    { name: 'cloak.litShade', s: c.litShade, ramp: c.ramp, int: true },
    { name: 'cloak.hem.curlShade', s: c.hem.curlShade, ramp: c.ramp, int: true },
    { name: 'cloak.innerShade', s: c.innerShade, ramp: c.ramp, int: true },
    { name: 'cloak.hem.wisps.tipShade', s: c.hem.wisps?.tipShade, ramp: c.ramp, int: true },
    ...c.bands.map((b, i) => ({
      name: `cloak.bands[${String(i)}].shade`,
      s: b.shade,
      ramp: c.ramp,
      int: true as const,
    })),
    ...(c.dither?.shades ?? []).map((d, i) => ({
      name: `cloak.dither.shades[${String(i)}]`,
      s: d,
      ramp: c.ramp,
      int: true as const,
    })),
    ...(c.lining ? [{ name: 'cloak.lining.shade', s: c.lining.shade, ramp: c.lining.ramp, int: true as const }] : []),
  ];
}

/** Slot opt-ins: cloak (required with `back: 'cloak'`, bounds), prop per view, collar mask, skirt split. */
function slotProblems(body: Body, usesQ34: boolean): string[] {
  const problems: string[] = [];
  const id = body.id;
  const whole = (n: number | undefined, lo: number, hi: number): boolean =>
    n === undefined || (Number.isInteger(n) && n >= lo && n <= hi);
  const c = body.cloak;
  if (body.variants.back === 'cloak' && !c) problems.push(`${id}: back 'cloak' needs Body.cloak`);
  if (c && body.variants.back !== 'cloak') problems.push(`${id}: Body.cloak needs back 'cloak'`);
  if (c) {
    const hemMax = layoutOf().cloakHemMax;
    if (!whole(c.hemRow, 0, hemMax)) problems.push(`${id}: cloak.hemRow must be a whole 0..${String(hemMax)}`);
    if (!whole(c.maxTrail, 0, CLOAK_MAX.maxTrail))
      problems.push(`${id}: cloak.maxTrail must be a whole 0..${String(CLOAK_MAX.maxTrail)}`);
    if (!whole(c.hem.lobes, 0, CLOAK_MAX.lobes))
      problems.push(`${id}: cloak.hem.lobes must be a whole 0..${String(CLOAK_MAX.lobes)}`);
    const wisps = c.hem.wisps;
    if (
      wisps &&
      (!whole(wisps.count, 1, CLOAK_MAX.wisps) ||
        !whole(wisps.length, 1, CLOAK_MAX.wispLength) ||
        !whole(wisps.span, wisps.count * wisps.length, c.widths.hem))
    )
      problems.push(
        `${id}: cloak.hem.wisps needs count 1..${String(CLOAK_MAX.wisps)}, length 1..${String(CLOAK_MAX.wispLength)}, span count × length..hem`,
      );
    if (!whole(c.hem.curl, 0, 3) || !whole(c.hem.cornerDrop, 0, 3))
      problems.push(`${id}: cloak corner curl / drop must be whole 0..3`);
    if (c.lining && !whole(c.lining.inset, 0, 2)) problems.push(`${id}: cloak.lining.inset must be a whole 0..2`);
    const maxHalf = layoutOf().w / 2 - 2;
    if (!(c.widths.top > 0 && c.widths.hem >= c.widths.top && c.widths.hem <= maxHalf)) {
      problems.push(`${id}: cloak widths need 0 < top ≤ hem ≤ ${String(maxHalf)}`);
    }
    const rows = [...c.bands.map((b) => b.row), ...(c.dither?.rows ?? [])];
    if (rows.some((r) => !whole(r, 1, 30)) || new Set(rows).size !== rows.length) {
      problems.push(`${id}: cloak band / dither rows must be distinct whole rows 1..30 above the hem`);
    }
  }
  if (body.prop && usesQ34 && !body.views?.q34?.prop) problems.push(`${id}: Body.prop needs views.q34.prop`);
  if (body.variants.neckAcc === 'collar') {
    if (!body.masks.neckAcc) problems.push(`${id}: neckAcc 'collar' needs masks.neckAcc`);
    if (usesQ34 && !body.views?.q34?.masks.neckAcc)
      problems.push(`${id}: neckAcc 'collar' needs views.q34.masks.neckAcc`);
  }
  const split = body.skirtSplit;
  if (split) {
    const splitMax = SKIRT_SPLIT_MAX + (body.hakama?.drop ?? 0);
    if (!whole(split.rows, 1, splitMax)) problems.push(`${id}: skirtSplit.rows must be a whole 1..${String(splitMax)}`);
    if (body.variants.hem !== 'skirt') problems.push(`${id}: skirtSplit needs hem 'skirt'`);
    if (!whole(split.notch, 0, split.rows)) problems.push(`${id}: skirtSplit.notch must be a whole 0..rows`);
    if (!whole(split.notchHalf, 1, 3)) problems.push(`${id}: skirtSplit.notchHalf must be a whole 1..3`);
    const [lo, hi] = SKIRT_HEM_HALF_RANGE;
    if (split.hemHalf !== undefined && !(split.hemHalf >= lo && split.hemHalf <= hi))
      problems.push(`${id}: skirtSplit.hemHalf must be ${String(lo)}..${String(hi)}`);
    const sq = split.q34;
    if (sq && (!whole(sq.rows, 1, 8) || !whole(sq.notch, 0, sq.rows) || !whole(sq.passNotch, 0, sq.notch)))
      problems.push(`${id}: skirtSplit.q34 needs whole rows 1..8, notch 0..rows, passNotch 0..notch`);
    if (split.pleats && split.pleats.offsets.some((o) => !whole(o, 1, 8)))
      problems.push(`${id}: skirtSplit.pleats.offsets must be whole 1..8`);
  }
  if (!whole(body.sash?.dy, 0, SASH_DY_MAX)) {
    problems.push(`${id}: sash.dy must be a whole 0..${String(SASH_DY_MAX)}`);
  }
  if (body.hakama && (body.variants.hem !== 'skirt' || !whole(body.hakama.drop, 0, HAKAMA_DROP_MAX)))
    problems.push(`${id}: hakama needs hem 'skirt' and a whole drop 0..${String(HAKAMA_DROP_MAX)}`);
  if (body.skirtLace === false && body.variants.hem !== 'skirt') problems.push(`${id}: skirtLace needs hem 'skirt'`);
  return problems;
}
/** `Body.mask.down` / `downQ34` row cap (ART-BIBLE §11.10: under the chin, ≤ 3 rows). */
export const MASK_DOWN_MAX_ROWS = 3;

const isPx = (ch: string): boolean => ch !== '.' && ch !== ' ' && ch !== '';
const opaque = (mask: Mask, at: Point): Set<string> => {
  const out = new Set<string>();
  mask.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (isPx(row.charAt(x))) out.add(`${String(at[0] + x)},${String(at[1] + y)}`);
  });
  return out;
};
const paintedRowCount = (mask: Mask): number => mask.filter((r) => r.split('').some(isPx)).length;

/**
 * Mouth-mask rules (MA-63, ART-BIBLE §11.10) per view whose head the poses use: the mask lies inside the head mask,
 * covers every mouth px of each mask-up expression and starts ≥ 1 skin row under the lowest iris row of those
 * expressions; the down masks are ≤ 3 rows; while the mask is up, `talk_a/b/c` differ pairwise in eyes or brows.
 */
function mouthMaskProblems(
  body: Body,
  usesQ34: boolean,
  faceAtOf: (view: View, head: Body['head']) => Point,
): string[] {
  const m = body.mask;
  if (!m) return [];
  const id = body.id;
  const problems: string[] = [];
  const views: [View, Body['head'], ViewFaceLibrary, PlacedMask | undefined][] = [
    ['front', body.head, body.face, m.front],
  ];
  const q34 = body.views?.q34;
  if (usesQ34 && q34) views.push(['q34', q34.head, q34.face, m.q34]);
  if (usesQ34 && !m.q34) problems.push(`${id}: mask.q34 is required when q34 poses show the head`);
  const placedAll = {
    front: m.front,
    q34: m.q34,
    down: m.down,
    downQ34: m.downQ34,
  };
  for (const [name, placed] of Object.entries(placedAll)) {
    if (placed) checkMask(placed.mask, `${id}/mask.${name}`);
  }
  for (const [name, placed] of Object.entries({
    down: m.down,
    downQ34: m.downQ34,
  })) {
    const rows = placed ? paintedRowCount(placed.mask) : 0;
    if (rows > MASK_DOWN_MAX_ROWS) {
      problems.push(`${id}: mask.${name} has ${String(rows)} rows (≤ ${String(MASK_DOWN_MAX_ROWS)} rows)`);
    }
  }
  const up = (e: ExpressionId): boolean => !m.downExpressions.includes(e);
  for (const [view, head, lib, placed] of views) {
    if (!placed) continue;
    const covered = opaque(placed.mask, placed.at);
    const faceAt = faceAtOf(view, head);
    for (const key of covered) {
      const [x = 0, y = 0] = key.split(',').map(Number);
      if (!isPx(head.mask[faceAt[1] + y]?.charAt(faceAt[0] + x) ?? '')) {
        problems.push(`${id}: mask.${view} px ${key} (face anchor) is outside the head`);
        break;
      }
    }
    const top = placed.at[1] + placed.mask.findIndex((r) => r.split('').some(isPx));
    for (const e of EXPRESSIONS) {
      const ex = lib.expressions[e];
      if (!ex || !up(e)) continue;
      for (const mouthId of [ex.mouth, ex.raisedMouth]) {
        const mouth = mouthId === undefined ? undefined : lib.mouths[mouthId];
        if (mouth && [...opaque(mouth.mask, mouth.at)].some((k) => !covered.has(k))) {
          problems.push(`${id}: mask.${view} leaves ${e} mouth "${mouthId ?? ''}" px uncovered`);
        }
      }
      const eyes = lib.eyes[ex.eyes];
      const irisRows = eyes
        ? eyes.mask.flatMap((row, y) => (row.split('').some((ch) => LEGEND[ch]?.[0] === 'eye') ? [eyes.at[1] + y] : []))
        : [];
      if (irisRows.length > 0 && top < Math.max(...irisRows) + 2) {
        problems.push(`${id}: mask.${view} needs ≥ 1 skin row under the iris (${e})`);
      }
    }
  }
  const talks = (['talk_a', 'talk_b', 'talk_c'] as const).filter(up);
  const look = (e: ExpressionId): string => {
    const ex = body.face.expressions[e];
    return JSON.stringify([body.face.eyes[ex.eyes], ex.brows === undefined ? null : body.face.brows?.[ex.brows]]);
  };
  talks.forEach((a, i) => {
    for (const b of talks.slice(i + 1)) {
      if (look(a) === look(b)) problems.push(`${id}: mask up — ${a} and ${b} must differ in eyes or brows`);
    }
  });
  return problems;
}

/** Opaque px of a placed mask, as "x,y" keys relative to its joint. */
const placedPx = (m: PlacedMask): Set<string> => {
  const out = new Set<string>();
  m.mask.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (isPx(ch)) out.add(`${String(m.at[0] + x)},${String(m.at[1] + y)}`);
    });
  });
  return out;
};

/**
 * Visor rules (D-22, ART-BIBLE §11.11) per view whose head the poses use: never with a mouth mask; `downIn` names
 * animations of the pack and their frames; the lowered visor covers every skin px of the head mask; the raised visor
 * covers no face-part px; every slit glint lies on the lowered visor.
 */
function visorProblems(
  body: Body,
  anims: readonly RigAnim[],
  usesQ34: boolean,
  faceAtOf: (view: View, head: Body['head']) => Point,
): string[] {
  const vz = body.visor;
  if (!vz) return [];
  const id = body.id;
  const problems: string[] = [];
  if (body.mask) problems.push(`${id}: visor and mask are both set (one face cover per body)`);
  for (const [name, frames] of Object.entries(vz.downIn)) {
    const a = anims.find((x) => x.name === name);
    if (!a) problems.push(`${id}: visor.downIn names "${name}", not an animation of the pack`);
    else if (frames !== 'all' && frames.some((f) => !Number.isInteger(f) || f < 0 || f >= a.frames.length)) {
      problems.push(`${id}: visor.downIn.${name} lists a frame outside 0..${String(a.frames.length - 1)}`);
    }
  }
  const q34 = body.views?.q34;
  const views: [View, Body['head'], ViewFaceLibrary, PlacedMask | undefined, PlacedMask | undefined, Visor['slit']][] =
    [['front', body.head, body.face, vz.up, vz.down, vz.slit]];
  if (usesQ34 && q34) views.push(['q34', q34.head, q34.face, vz.upQ34, vz.downQ34, vz.slitQ34]);
  if (usesQ34 && (!vz.upQ34 || !vz.downQ34)) {
    problems.push(`${id}: visor.upQ34 and visor.downQ34 are required when q34 poses show the head`);
  }
  for (const [view, head, lib, up, down, slit] of views) {
    const tag = view === 'front' ? 'visor' : 'visor (q34)';
    if (down) {
      const covered = placedPx(down);
      const skin = [...placedPx(head)].filter((k) => {
        const [x = 0, y = 0] = k.split(',').map(Number);
        const ch = head.mask[y - head.at[1]]?.charAt(x - head.at[0]) ?? '';
        return LEGEND[ch]?.[0] === 'skin' && !covered.has(k);
      });
      if (skin.length > 0) problems.push(`${id}: ${tag} down leaves face skin px ${skin[0] ?? ''} uncovered`);
      for (const [e, m] of Object.entries(slit ?? {})) {
        if ([...placedPx(m)].some((k) => !covered.has(k))) {
          problems.push(`${id}: ${tag} slit.${e} has px off the lowered visor`);
        }
      }
    }
    if (up) {
      const covered = placedPx(up);
      const faceAt = faceAtOf(view, head);
      const parts = [lib.eyes, lib.brows ?? {}, lib.mouths, lib.cheeks].flatMap((g) => Object.entries(g));
      for (const [name, fp] of parts) {
        const hit = [
          ...placedPx({ mask: fp.mask, at: [fp.at[0] + faceAt[0] + head.at[0], fp.at[1] + faceAt[1] + head.at[1]] }),
        ];
        if (hit.some((k) => covered.has(k))) {
          problems.push(`${id}: ${tag} up covers face part "${name}"`);
          break;
        }
      }
    }
  }
  return problems;
}
