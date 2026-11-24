// Adult rig dummies (plan M-ART D-19 MA-42…MA-44, ADR 011): layout 56 × 72, builds male / female. Head 16 × 15
// (skull ≈ 14 wide, face 12 rows hairline → chin, 3-row eyes, brows, a nose shadow, a jaw), after the C+ style-spike
// proportions (reports/sprites/style-spike). Never built into resources/; tests and `pnpm sprites:sheet --adult` use
// them. Re-exported from dummies.ts.
import type { Point } from '../lib/chain.ts';
import type { Mask, Outfit } from '../lib/mask.ts';
import type { PackDef } from '../lib/types.ts';
import { animsFor } from './anims/adult.ts';
import { createRigPack } from './compose.ts';
import { irisShift, type FaceLibrary, type FacePart, type ViewFaceLibrary } from './face.ts';
import type { Body, BodyView, Prop } from './types.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const outfit = (over: Partial<Outfit>): Outfit => ({
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_lilac', tones: T6UP },
  horn: { ramp: 'horn', tones: T6UP },
  dress: { ramp: 'cloth_teal', tones: T6 },
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_rose', tones: T6 },
  shoe: { ramp: 'hair_plum', tones: T6 },
  eye: { ramp: 'cloth_ochre', tones: T6 },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
  ...over,
});

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });

/** Head mask top-left from the head joint (rows 6…20 of the 72 frame at rest). */
export const ADULT_HEAD_AT: Point = [-8, -7];
/** Last fringe row for the forehead shadow band. */
const ADULT_BAND = 4;

export const ADULT_HEAD: Mask = [
  '....JJjjjjJJ....',
  '..JjjhhhhhhjjJ..',
  '.JjhhHyyHhhhhjJ.',
  'JjhHHhhhhhhhhhjJ',
  'JhhjheEhjEehjhhJ',
  'JjjeEEEEEEEeeSjJ',
  'JjeEEEEEEEEeeSSJ',
  'JjeEEEEEEEEeeeSJ',
  'zjeEEEEEEEEeeeSz',
  '.jeEEEEEEEEeeeS.',
  '.JeeEEEEEEEeeSS.',
  '..seeEEEEEeeeS..',
  '...seeeeeeeeS...',
  '....sseeeeSs....',
  '......sSSs......',
];

/**
 * Female front head: the ADULT_HEAD skull and face rows with a narrower, pointed jaw (rows 10…14 lose 1–2 px on each
 * side, the chin is 2 px wide).
 */
export const ADULT_HEAD_FEMALE: Mask = [
  ...ADULT_HEAD.slice(0, 10),
  '.JeeEEEEEEEeeS..',
  '..seeEEEEEeeS...',
  '...sseeeeeeS....',
  '.....seeeeS.....',
  '.......sS.......',
];

/**
 * Adult worn sword, q34 view (prop slot scale, MA-45): 35 px along a 25° diagonal, hilt (8 px, wrap `X` under a `w`
 * edge) at the top right, a 2-px guard `r`, then the scabbard (`d` top edge, `v` underside) trailing down to the tip `V`.
 */
export function adultSwordQ34(length = 35, angleDeg = 25, hilt = 8, guard = 2): Mask {
  const rad = (angleDeg * Math.PI) / 180;
  const w = Math.round(length * Math.cos(rad));
  const h = Math.round(length * Math.sin(rad)) + 2;
  const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  for (let x = w - 1; x >= 0; x--) {
    const along = (w - 1 - x) / Math.cos(rad);
    const y = Math.round((w - 1 - x) * Math.tan(rad));
    const [top, bottom] =
      along < hilt ? ['w', 'X'] : along < hilt + guard ? ['r', 'r'] : x === 0 ? ['V', 'V'] : ['d', 'v'];
    const r0 = rows[y];
    const r1 = rows[y + 1];
    if (r0) r0[x] = top;
    if (r1) r1[x] = bottom;
  }
  return rows.map((r) => r.join(''));
}

/**
 * Adult worn sword, front projection (MA-45 motion round 2): the scabbard drops near-vertical behind the thigh on the
 * wearing side — a 3-px guard `r`, then a vertical 2-px scabbard (`d` lit edge, `v` shade) ending in the tip `V`
 * (`drop` rows below the guard; vertical so the contrapposto hip shift keeps it ≤ 3 px past the thigh). Hilt: a foreshortened `hilt`-px stub (`w` edge over `X` wrap)
 * rising 1 row toward the axis, stamped over the torso (`Prop.hilt`).
 */
export function adultSwordFront(drop = 17, hilt = 5): { readonly mask: Mask; readonly hilt: Mask } {
  const scabbard = ['rrr', ...Array.from({ length: drop }, (_, i) => (i === drop - 1 ? '.VV' : '.dv'))];
  const rise = Math.ceil(hilt / 2) - 1;
  const top = 'w'.repeat(rise) + '.'.repeat(hilt - rise);
  const mid = 'X'.repeat(rise) + 'w'.repeat(hilt - rise);
  const low = '.'.repeat(rise) + 'X'.repeat(hilt - rise);
  return { mask: scabbard, hilt: [top, mid, low] };
}

/**
 * The adult male dummy's sword in both views (hip-relative placements): q34 hilt top on row 36 at the front hip, the
 * scabbard trailing down-back to row 52; front hilt top on row 36 at the screen-right hip pointing toward the axis
 * (never crossing it), the scabbard behind the screen-right thigh to row 56, ≤ 3 px past the outline. Both views wear
 * it on the screen-right hip, so the turn never flips it.
 */
export function adultSword(): { readonly front: Prop; readonly q34: Prop } {
  const front = adultSwordFront();
  return {
    front: { mask: front.mask, at: [5, -1], hilt: { mask: front.hilt, at: [-2, -3] } },
    q34: { mask: adultSwordQ34(), at: [-23, -4] },
  };
}
const ADULT_SWORD = adultSword();

/** q34 head (facing screen-right): back hair mass on the trailing side, ear at col 5, the profile on the right. */
export const ADULT_HEAD_Q34: Mask = [
  '...JJjjjjjJJ....',
  '.JjjhhhhhhhjjJ..',
  'JjhhhHyyHhhhhjJ.',
  'JhhhHhhhhhhhhhjJ',
  'JhhhhhhjhEhjEhhJ',
  'JhhhhhjeEEEEEEeJ',
  'JhhhhjeEEEEEEEEe',
  'JhhhhzeEEEEEEEEe',
  'JjhhhzeEEEEEEEEe',
  '.jhhhjeEEEEEEEEE',
  '.Jjhh.seEEEEEEEe',
  '..Jjj.seEEEEEEe.',
  '...J..sseEEEEe..',
  '......sseeeeS...',
  '........sSSs....',
];

/** Open adult eyes: 3 rows (¼ of the 12-row face): lash line, sclera + iris + 1-px pupil, lower lid. */
const ADULT_OPEN: Mask = ['.xXXX..XXXx.', '.pKcX..XcKp.', '..ic....ci..'];
const ADULT_IRIS_ROWS = [1, 2] as const;
/** Glance split column of the adult eye mask (`RigLayout.irisHalf`). */
const EYE_HALF = 6;

export const ADULT_FACE: FaceLibrary = {
  eyes: {
    open: { ...part(ADULT_OPEN, 0, 3), irisRows: ADULT_IRIS_ROWS },
    low: { ...part(ADULT_OPEN, 0, 4), irisRows: ADULT_IRIS_ROWS },
    glance: { ...part(irisShift(ADULT_OPEN, EYE_HALF, ADULT_IRIS_ROWS), 0, 3), irisRows: ADULT_IRIS_ROWS },
    side: { ...part(irisShift(ADULT_OPEN, EYE_HALF, ADULT_IRIS_ROWS), 0, 3), irisRows: ADULT_IRIS_ROWS },
    closed: part(['.xXXx..xXXx.'], 0, 4),
    half: part(['.xXXx..xXXx.', '.pcc....ccp.'], 0, 4),
    happy: part(['..XX....XX..', '.x..x..x..x.'], 0, 3),
    startle: part(['.xXXx..xXXx.', '.pcpp..ppcp.', '.xppx..xppx.'], 0, 3),
    wince: part(['.xXXx..x....', '.pKcX...xXX.', '..ic....x...'], 0, 3),
  },
  brows: {
    flat: part(['.jJJj..jJJj.'], 0, 2),
    worried: part(['..jJJ..JJj..'], 0, 2),
    up: part(['.JJ......JJ.'], 0, 2),
  },
  mouths: {
    smile: part(['....xXXx....'], 0, 8),
    flat: part(['.....XX.....'], 0, 8),
    talk_a: part(['....xXXx....', '.....zz.....'], 0, 8),
    talk_b: part(['....xXXx....', '.....gg.....'], 0, 8),
    talk_c: part(['.....XX.....', '....XggX....', '.....XX.....'], 0, 8),
    happy: part(['....x..x....', '.....XX.....'], 0, 8),
    frown: part(['.....XX.....', '....x..x....'], 0, 8),
    small_o: part(['.....xx.....', '.....xx.....'], 0, 8),
  },
  cheeks: {
    none: part([], 0, 6),
    blush: part(['.FF......FF.'], 0, 6),
  },
  nose: part(['S', 's'], 6, 5),
  expressions: {
    neutral: { eyes: 'open', brows: 'flat', mouth: 'smile', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'flat', mouth: 'smile', cheeks: 'none' },
    half: { eyes: 'half', brows: 'flat', mouth: 'talk_a', cheeks: 'none' },
    talk_a: { eyes: 'open', brows: 'flat', mouth: 'talk_a', cheeks: 'none' },
    talk_b: { eyes: 'open', brows: 'flat', mouth: 'talk_b', cheeks: 'none' },
    talk_c: { eyes: 'open', brows: 'flat', mouth: 'talk_c', cheeks: 'none' },
    happy: { eyes: 'happy', brows: 'up', mouth: 'happy', cheeks: 'none' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'frown', cheeks: 'none' },
    think: { eyes: 'glance', brows: 'worried', mouth: 'flat', cheeks: 'none' },
    sleep: { eyes: 'closed', mouth: 'small_o', cheeks: 'none' },
    startle: { eyes: 'startle', brows: 'up', mouth: 'talk_c', cheeks: 'none' },
    petted: { eyes: 'happy', brows: 'flat', mouth: 'smile', cheeks: 'blush' },
    wince: { eyes: 'wince', brows: 'worried', mouth: 'flat', cheeks: 'none' },
    glance: { eyes: 'side', brows: 'flat', mouth: 'smile', cheeks: 'none' },
  },
};

/** q34 face (neutral + blink, ADR 010): near eye 4 px, far eye 2 px, the nose shadow on the profile. */
export const ADULT_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(['....xXXx.xX.', '....pKcX.Xc.', '.....ic..i..'], 0, 3),
    closed: part(['....xXXx.xX.'], 0, 4),
  },
  brows: { flat: part(['....jJJj.jJ.'], 0, 2) },
  mouths: { smile: part(['.......xXx..'], 0, 8) },
  cheeks: { none: part([], 0, 6) },
  nose: part(['S', 's'], 10, 5),
  expressions: {
    neutral: { eyes: 'open', brows: 'flat', mouth: 'smile', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'flat', mouth: 'smile', cheeks: 'none' },
  },
};

const ADULT_SHOE: Mask = ['.mbm.', 'mbBbm', 'MmmmM'];
const ADULT_SHOE_Q34: Mask = ['.mbm..', 'mbBbbm', 'Mmmmmm'];
const ADULT_COLLAR: Mask = ['.gtTTTTtg.', 'gt......tg'];

const adultQ34 = (masks: Omit<BodyView['masks'], 'shoe'> = {}): BodyView => ({
  head: { mask: ADULT_HEAD_Q34, at: ADULT_HEAD_AT, band: ADULT_BAND },
  face: ADULT_FACE_Q34,
  masks: { shoe: ADULT_SHOE_Q34, ...masks },
});

/** Adult male dummy: shorts, short-cut hair, a short cloak and a collar, long sleeves. */
export const ADULT_MALE: Body = {
  id: 'rig-adult-male',
  name: 'rig adult dummy (male)',
  layout: 'adult',
  build: 'male',
  outfit: outfit({ hair: { ramp: 'hair_ash', tones: T6UP } }),
  ramps: {
    hair: 'hair_ash',
    cloth: 'cloth_teal',
    clothAlt: 'cloth_ochre',
    trim: 'cloth_rose',
    legs: 'hair_plum',
    tail: 'hair_plum',
    tailTip: 'cloth_cream',
  },
  variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'cloak', neckAcc: 'collar', sleeves: 'long' },
  sleeve: { ramp: 'cloth_cream', shade: 3 },
  hairBackStretch: 0.3,
  sideLocks: false,
  head: { mask: ADULT_HEAD, at: ADULT_HEAD_AT, band: ADULT_BAND },
  face: ADULT_FACE,
  masks: { shoe: ADULT_SHOE, neckAcc: { mask: ADULT_COLLAR, at: [-5, 1] } },
  // Hip prop at adult scale (MA-45 round 2): projected per view (`adultSword`).
  prop: ADULT_SWORD.front,
  cloak: {
    ramp: 'hair_plum',
    shade: 2,
    litShade: 3,
    top: 0,
    hemRow: 4,
    widths: { top: 8, hem: 10, shape: 'bell' },
    shoulder: 'round',
    hem: { lobes: 0 },
    bands: [],
  },
  views: {
    q34: { ...adultQ34({ neckAcc: { mask: ADULT_COLLAR, at: [-5, 1] } }), prop: ADULT_SWORD.q34 },
  },
};

/** Adult female dummy: skirt, long hair, short sleeves, the pinched waist of the female build. */
export const ADULT_FEMALE: Body = {
  id: 'rig-adult-female',
  name: 'rig adult dummy (female)',
  layout: 'adult',
  build: 'female',
  outfit: outfit({}),
  ramps: {
    hair: 'hair_lilac',
    cloth: 'cloth_teal',
    clothAlt: 'cloth_cream',
    trim: 'cloth_rose',
    legs: 'hair_plum',
    tail: 'hair_plum',
    tailTip: 'cloth_cream',
  },
  variants: { headAcc: 'none', hairBack: 'long', hem: 'skirt', back: 'none', neckAcc: 'none', sleeves: 'short' },
  sideLocks: false,
  head: { mask: ADULT_HEAD_FEMALE, at: ADULT_HEAD_AT, band: ADULT_BAND },
  face: ADULT_FACE,
  masks: { shoe: ADULT_SHOE },
  views: { q34: adultQ34() },
};

/** Adult review packs (`pnpm sprites:sheet --adult`; never written to resources/). */
export const adultPacks = (): PackDef[] => [ADULT_MALE, ADULT_FEMALE].map((b) => createRigPack(b, animsFor(b)));
