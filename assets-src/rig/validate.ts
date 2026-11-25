// Body validation before rendering (docs/art/RIG.md «Body opt-ins»): every authored mask, opt-in ramps and shades,
// per-view parts, faces and expressions, head-accessory and other opt-in bounds. `createRigPack` calls
// `validateBody` first; it throws with every problem found.
import type { RampName } from '../lib/buffer.ts';
import type { Point } from '../lib/chain.ts';
import { checkMask, maskSize, type Mask } from '../lib/mask.ts';
import MASTER from '../palettes/master.json' with { type: 'json' };
import { frame as poseFrame } from './anims/kit.ts';
import { resolveJoints } from './body.ts';
import { layoutOf } from './layout.ts';
import { BREATH_GLOW, dressShadeOf, HEM_LIFT_MAX, hemLiftOf, skirtRampOf } from './chains.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace, type ExpressionId } from './face.ts';
import { FISTS, fistKindOf } from './passes.ts';
import type { Body, BodyView, Prop, RigAnim, View } from './types.ts';
import { headViewOf, usesView } from './views.ts';

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
  if (body.layout === 'adult' && body.build === undefined)
    throw new Error(`${body.id}: layout 'adult' needs Body.build`);
  if (body.layout !== 'adult' && body.build !== undefined) {
    throw new Error(`${body.id}: Body.build needs layout 'adult' (legacy bodies have one build)`);
  }
  const layout = layoutOf(body);
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
      ['q34/prop', q34.prop?.mask],
      ['q34/prop.dangle', q34.prop?.dangle?.mask],
      ['q34/prop.hilt', q34.prop?.hilt?.mask],
    );
  }
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
  const rules = layout.face;
  const problems = validateFace(
    body.face,
    body.id,
    { mask: body.head.mask, faceAt: faceAtOf('front', body.head) },
    EXPRESSIONS,
    rules,
  );
  // Per view, only the expressions its frames reference are required (q34: neutral + blink).
  const usedBy = (view: View): ExpressionId[] => [
    ...new Set(anims.flatMap((a) => a.frames.filter((_, i) => headViewOf(a, i) === view).map((f) => f.face))),
  ];
  if (q34) {
    problems.push(
      ...validateFace(
        q34.face,
        `${body.id}/q34`,
        { mask: q34.head.mask, faceAt: faceAtOf('q34', q34.head) },
        [...new Set([...Q34_EXPRESSIONS, ...usedBy('q34')])],
        rules,
      ),
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
    const layout = layoutOf(body);
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

/**
 * Adult hip-prop rules, per view (MA-45 art rounds 1–2). **q34**: a worn sword-like prop spans ≈ 34–36 px along its
 * diagonal (mask bbox hypot, ±1 tolerance), top (the hilt) at or below row 36. **front** (projected): a 4–5 px hilt
 * (`Prop.hilt`, ≤ 20° off horizontal toward the axis) with its top at or below row 36; the scabbard drops ≥ 70° from
 * horizontal to a tip at row ≤ 56; every px stays ≥ `axisGap` px on the wearing side of the axis (the hip sways ±1)
 * and ≤ `maxOut` px past the rest outline (hem / bodice half above the hem, the leg's outer edge below it, + 1 outline).
 */
export const ADULT_PROP = {
  q34: { minLen: 33, maxLen: 37, topRow: 36 },
  front: {
    topRow: 36,
    tipRow: 56,
    minDropDeg: 70,
    hilt: { minLen: 4, maxLen: 5.5, maxDeg: 20 },
    axisGap: 2,
    maxOut: 3,
  },
  /**
   * Front saya worn over the coat (`Prop.over: 'all'`, ronin MA-46, docs/art/ronin.md «Front katana»): the scabbard
   * leaves the obi at 10–30° below horizontal and may reach `maxOut` px past the rest outline (it is the silhouette
   * break); the hilt (`w − 3` × `h − 3` px past its 3 × 3 tsuba) rises 20–40° toward the axis, 4–7 px long; the axis
   * gap and the tip row still hold.
   */
  frontOver: {
    topRow: 28,
    tipRow: 46,
    dropDeg: [10, 30],
    hilt: { minLen: 4, maxLen: 7, minDeg: 20, maxDeg: 40 },
    axisGap: 2,
    maxOut: 9,
  },
} as const;

const deg = (rad: number): number => (rad * 180) / Math.PI;

/** Opaque px of a mask, hip-relative: [dx, dy]. */
function propPx(mask: Mask, at: readonly [number, number]): [number, number][] {
  const out: [number, number][] = [];
  mask.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row.charAt(c) !== '.') out.push([at[0] + c, at[1] + r]);
  });
  return out;
}

function adultFrontOverProblems(body: Body, prop: Prop): string[] {
  const layout = layoutOf(body);
  const rule = ADULT_PROP.frontOver;
  const id = body.id;
  const hip = layout.rest.hip;
  const out: string[] = [];
  const hilt = prop.hilt;
  if (!hilt) return [`${id}: front prop needs a hilt (Prop.hilt)`];
  const hiltAt = [prop.at[0] + hilt.at[0], prop.at[1] + hilt.at[1]] as const;
  const hs = maskSize(hilt.mask);
  const [gw, gh] = [hs.w - 3, hs.h - 3];
  const hLen = Math.hypot(gw, gh);
  const hDeg = deg(Math.atan2(gh, Math.max(1, gw)));
  if (hLen < rule.hilt.minLen || hLen > rule.hilt.maxLen || hDeg < rule.hilt.minDeg || hDeg > rule.hilt.maxDeg)
    out.push(`${id}: front over-coat hilt ${hLen.toFixed(1)} px at ${hDeg.toFixed(0)}°`);
  const { w, h } = maskSize(prop.mask);
  const drop = deg(Math.atan2(h - 2, Math.max(1, w - 1)));
  if (drop < rule.dropDeg[0] || drop > rule.dropDeg[1])
    out.push(
      `${id}: front over-coat saya at ${drop.toFixed(0)}° (${String(rule.dropDeg[0])}…${String(rule.dropDeg[1])})`,
    );
  const top = hip[1] + Math.min(prop.at[1], hiltAt[1]);
  if (top < rule.topRow) out.push(`${id}: front prop top row ${String(top)} above ${String(rule.topRow)}`);
  const tip = hip[1] + prop.at[1] + h - 1;
  if (tip > rule.tipRow) out.push(`${id}: front prop tip row ${String(tip)} below ${String(rule.tipRow)}`);
  const px = [...propPx(prop.mask, prop.at), ...propPx(hilt.mask, hiltAt)];
  const side = Math.sign(prop.at[0]) || 1;
  if (px.some(([dx]) => dx * side < rule.axisGap)) out.push(`${id}: front prop crosses the axis`);
  const t = layout.torso;
  // Rest outline half-width at the hip: the skirt, the bodice or a coat (cloak hem half-width), + 1 outline px.
  const coat = body.cloak?.widths.hem ?? 0;
  const reach =
    Math.max(...px.map(([dx]) => Math.abs(dx))) -
    (Math.max(body.skirtSplit?.hemHalf ?? t.skirt.hemHalf, t.chestHalf, coat) + 1);
  if (reach > rule.maxOut)
    out.push(`${id}: front prop reaches ${String(reach)} px past the outline (≤ ${String(rule.maxOut)})`);
  return out;
}

function adultFrontPropProblems(body: Body, prop: Prop): string[] {
  if (prop.over === 'all') return adultFrontOverProblems(body, prop);
  const layout = layoutOf(body);
  const rule = ADULT_PROP.front;
  const id = body.id;
  const hip = layout.rest.hip;
  const out: string[] = [];
  const hilt = prop.hilt;
  if (!hilt) return [`${id}: front prop needs a projected hilt (Prop.hilt)`];
  const hiltAt = [prop.at[0] + hilt.at[0], prop.at[1] + hilt.at[1]] as const;
  const hs = maskSize(hilt.mask);
  const hLen = Math.hypot(hs.w, hs.h - 2);
  if (hLen < rule.hilt.minLen || hLen > rule.hilt.maxLen)
    out.push(
      `${id}: front prop hilt spans ${hLen.toFixed(1)} px (${String(rule.hilt.minLen)}…${String(rule.hilt.maxLen)})`,
    );
  const hDeg = deg(Math.atan2(hs.h - 2, Math.max(1, hs.w - 1)));
  if (hDeg > rule.hilt.maxDeg)
    out.push(`${id}: front prop hilt at ${hDeg.toFixed(0)}° (≤ ${String(rule.hilt.maxDeg)}°)`);
  const { w, h } = maskSize(prop.mask);
  const drop = deg(Math.atan2(h - 1, Math.max(0, w - 2)));
  if (drop < rule.minDropDeg)
    out.push(`${id}: front prop scabbard at ${drop.toFixed(0)}° (≥ ${String(rule.minDropDeg)}° from horizontal)`);
  const top = hip[1] + Math.min(prop.at[1], hiltAt[1]);
  if (top < rule.topRow) out.push(`${id}: front prop top row ${String(top)} above ${String(rule.topRow)}`);
  const tip = hip[1] + prop.at[1] + h - 1;
  if (tip > rule.tipRow) out.push(`${id}: front prop tip row ${String(tip)} below ${String(rule.tipRow)}`);
  // Rest outline half-width per row below the hip: bodice / hem down to the hem, then the leg's outer edge.
  const t = layout.torso;
  const hem = body.variants.hem === 'skirt' ? t.skirt : t.shorts;
  const ankle = layout.rest.footR[1] - hip[1];
  const footDx = layout.rest.footR[0] - hip[0];
  const outline = (dy: number): number => {
    if (dy <= hem.hemDy) return Math.max(hem.hemHalf, t.chestHalf) + 1;
    const k = Math.min(1, Math.max(0, dy / ankle));
    return t.leg.dx + t.leg.hipR + k * (footDx + t.leg.footR - t.leg.dx - t.leg.hipR) + 1;
  };
  const px = [...propPx(prop.mask, prop.at), ...propPx(hilt.mask, hiltAt)];
  const side = Math.sign(hiltAt[0] + hs.w / 2) || 1;
  const crossing = px.filter(([dx]) => dx * side < rule.axisGap);
  if (crossing.length > 0)
    out.push(
      `${id}: front prop crosses the axis (${String(crossing.length)} px within ${String(rule.axisGap)} px or past it)`,
    );
  const worst = Math.max(...px.map(([dx, dy]) => Math.abs(dx) + 1 - outline(dy)));
  if (worst > rule.maxOut)
    out.push(`${id}: front prop reaches ${worst.toFixed(1)} px past the outline (≤ ${String(rule.maxOut)})`);
  return out;
}

function adultPropProblems(body: Body): string[] {
  const layout = layoutOf(body);
  if (layout.id !== 'adult') return [];
  const out: string[] = [];
  if (body.prop) out.push(...adultFrontPropProblems(body, body.prop));
  const prop = body.views?.q34?.prop;
  if (prop) {
    const rule = ADULT_PROP.q34;
    const { w, h } = maskSize(prop.mask);
    const len = Math.hypot(w, h - 1);
    if (len < rule.minLen || len > rule.maxLen) {
      out.push(`${body.id}: q34 prop spans ${len.toFixed(1)} px (adult ${String(rule.minLen)}…${String(rule.maxLen)})`);
    }
    const top = layout.rest.hip[1] + prop.at[1];
    if (top < rule.topRow) out.push(`${body.id}: q34 prop top row ${String(top)} above ${String(rule.topRow)}`);
  }
  return out;
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
    const hemMax = layoutOf(body).cloakHemMax;
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
    const maxHalf = layoutOf(body).w / 2 - 2;
    if (!(c.widths.top > 0 && c.widths.hem >= c.widths.top && c.widths.hem <= maxHalf)) {
      problems.push(`${id}: cloak widths need 0 < top ≤ hem ≤ ${String(maxHalf)}`);
    }
    const rows = [...c.bands.map((b) => b.row), ...(c.dither?.rows ?? [])];
    if (rows.some((r) => !whole(r, 1, 30)) || new Set(rows).size !== rows.length) {
      problems.push(`${id}: cloak band / dither rows must be distinct whole rows 1..30 above the hem`);
    }
  }
  if (body.prop && usesQ34 && !body.views?.q34?.prop) problems.push(`${id}: Body.prop needs views.q34.prop`);
  problems.push(...adultPropProblems(body));
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
