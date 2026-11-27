// witch (pixmates.witch) authored masks, MA-29a per docs/art/witch.md (originality gate PASS 2026-11-24). A stylized
// archetype, not a portrait: a compact slouched moss hat (`headAcc: 'hat'`) with a bent, singed tip, a cream patch
// and one ochre ember px, no band colour; auburn `hair_copper` under it (a 1-row brim shadow on the fringe roots, an
// angel ring 2 rows below it broken at every split), 4 pointed fringe clumps (centre-left longest, parted right of
// the axis, splits in `J`, one skin row above the lash), 2-px side locks ending at the chin row in a 1-px outward
// curl, a two-lobe cream collar with an ochre clasp, a rose potion vial as the sash knot and short brown boots.
// Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

const BLANK = '.'.repeat(30);
/** Crown rows under the brim (hidden by the hat; kept so no gap shows at the brim ends). */
const CROWN = '...' + 'h'.repeat(24) + '...';
/** Eye-band rows: 2-px locks (lit outer `H`, dark inner `j`) either side of the 20-px face. */
const FACE_ROW = '...Hj' + 'S'.repeat(18) + 'ss' + 'jh...';
/** Lower cheeks: the locks step 1 px in over the cheek edge. */
const CHEEK_ROW = '....H' + 'jSSS' + 'S'.repeat(12) + 'SSsj' + 'h....';

/** 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12). Rows 0–5 sit under the hat cone. */
export const HEAD: Mask = [
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  CROWN,
  CROWN,
  CROWN,
  // Brim shadow (hair step 1) on the fringe roots, right under the brim underside.
  '...' + 'J' + 'j'.repeat(22) + 'J' + '...',
  // Clump tops: A cols 5–8, B 10–14 (centre-left, longest), C 16–20, D 22–24; splits (`J`) at cols 9, 15, 21.
  '...Hj' + 'HHHh' + 'J' + 'HHHHh' + 'J' + 'HHHhh' + 'J' + 'Hhh' + 'jh...',
  // Angel ring 2 rows under the brim shadow: lit `Y` on the left clumps, dim `y` on the right, broken at the splits.
  '...Hj' + 'HYYh' + 'J' + 'HYYyh' + 'J' + 'hyyhh' + 'SS' + 'yh' + 'jh...',
  // Art round 1: longer clumps (no visor read), each to a 1-px point with skin-shade AA px either side.
  '...Hj' + 'HHh' + 'SS' + 'HHhh' + 'SSS' + 'Hhhh' + 'SS' + 's' + 'h' + 'jh...',
  '...Hj' + 'shs' + 'SSSS' + 'Hh' + 'SSSS' + 'shs' + 'SSSS' + 'jh...',
  // B (centre-left, longest) ends at row 14; the lash middle (row 15) sits left of it, its inner end a row lower.
  '...Hj' + 'SSSSSSS' + 'shs' + 'S'.repeat(10) + 'jh...',
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  CHEEK_ROW,
  CHEEK_ROW,
  CHEEK_ROW,
  '....H' + '.SSS' + 'S'.repeat(11) + 'SSss.' + 'h....',
  // The locks end at the chin row with a 1-px outward curl; the chin rounds over 3 rows.
  '...H.' + '..SS' + 'S'.repeat(11) + 'Sss..' + '.h...',
  '.....' + '....' + '.ssss' + 's' + 'sssss' + '.....' + '.....',
];
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 14;

/**
 * Hat (front, 28 × 10 at acc + (−14, −4): figure x 10–37, rows −1…8). Moss dress letters lit top-left, a cream patch
 * (apron) with one horn stitch, a tonal moss-1 band (never a colour), the brim 28 px (2-px overhang each side of the
 * 24-px head) over a dark underside. The cone leans right and folds to screen-right: a 2–3-px transparent notch
 * between cone and tip, the tip drooping 3 rows to a 1-px point at col 25 (x 35; 4 px past the band, the 2–4-px notch
 * stays open to the outside so the 4-neighbour outline keeps 1–2 transparent px in it), singed (moss 0 + one ochre ember `t`).
 */
// Art round 1 (owner keeps the geometry): a moss-3 rim px on the fold arm's top edge and a moss-2 tip point read
// on the dark IDE.
export const HAT: Mask = [
  '...............wDDdv........',
  '.............wWDDDdddDvV....',
  '............wWDDDddv...dvV..',
  '...........wWDDDDddv....tV..',
  '..........wWapDDDdddv....d..',
  '.........wWanpDDDdddv.......',
  '........vvvvvvvvvvvvVV......',
  '.wWWWWDDDDDDDDDDDDDdddddvvV.',
  'wWWDDDDDDDDDDDDDDdddddddvvvV',
  '.vvvvvvvvvvvvvvvvvvvvvVVVVV.',
];
/** R-W3: while the head rises the tip droops 1 row (it stretches from the fold); never above the rest tip. */
export const HAT_RISING: Mask = [
  '...............wDDdv........',
  '.............wWDDDdddDvV....',
  '............wWDDDddv...Dv...',
  '...........wWDDDDddv...dvV..',
  '..........wWapDDDdddv...tV..',
  '.........wWanpDDDdddv....d..',
  '........vvvvvvvvvvvvVV......',
  '.wWWWWDDDDDDDDDDDDDdddddvvV.',
  'wWWDDDDDDDDDDDDDDdddddddvvvV',
  '.vvvvvvvvvvvvvvvvvvvvvVVVVV.',
];

/**
 * Collar (front, 8 × 3 from neck + (−4, 3): x 20–27, symmetric about x = 24): a chin-AO skin row, two rounded cream
 * lobes (lit px left of each lobe's centre) meeting at a 2-px ochre clasp on the centre columns, lobe tips 1 row down.
 */
export const COLLAR: Mask = ['ssssssss', 'Ppa' + 'tt' + 'Ppa', 'a......q'];
/** q34 collar (7 px, 1 px toward the facing). */
export const COLLAR_Q34: Mask = ['sssssss', 'Ppa' + 't' + 'Ppa', 'a.....q'];

/** Potion vial (front sash knot, 3 × 4): horn cork, cream glass neck, rose potion with a cream glint, glass base. */
export const VIAL: Mask = ['.o.', 'qpq', 'pFf', 'qfq'];
/** q34 vial (2 × 4) on the near hip. */
export const VIAL_Q34: Mask = ['o.', 'pq', 'pF', 'qf'];

/** Short brown boot (front): a boot-top row, a lit toe `L`, a dark sole with one light rim px `l` on the lit heel (dark IDE). */
export const SHOE: Mask = ['Bbm.', 'LBbm', 'lmmm'];
/** Side boot (q34, toe forward = screen-right): lit toe. */
export const SHOE_Q34: Mask = ['Bbm..', 'BBbbL', 'lmmmm'];

// ── q34 (three-quarter, facing screen-right; RIG.md «Views») ─────────────────────────────────────────────────────────
// Fringe parted toward the facing; the back contour steps in monotonically from the brim to the near (screen-left)
// lock (2 px, never wider below the temple: no ear-height bulge, no cup under the brim); the far lock hides behind the
// cheek; the facing-side contour is vertical at col 25 from the eye row and steps in 1 px per row to a 1-px chin.
const Q_CROWN = '...' + 'h'.repeat(22) + '.....';
const Q_LOCK = '.....' + 'Hj';
/** Back-of-head hair (cols 0–4) under the brim, lit on the outer edge. */
const Q_BACK = 'HHhhh';

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12). */
export const HEAD_Q34: Mask = [
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  Q_CROWN,
  Q_CROWN,
  Q_CROWN,
  // The back of the head fills straight down from under the brim to the long back hair (no cup under the brim).
  'Jjjj' + 'J' + 'j'.repeat(20) + 'jJ' + '...',
  Q_BACK.slice(0, 4) + 'jHHHHJHHHHHHJHHHhJhhhjJ' + '...',
  // Ring: wide lit segments on the near side, compressed toward the far side.
  Q_BACK + 'HYYHJHYYyHHJHyyhJhhhjJ' + '...',
  Q_BACK + 'Hj' + 'hSSSHhJSSHhJSShSShjJ' + '...',
  // Art round 1: the centre and far clumps run on to 1-px points on row 14 (no visor read), skin AA either side.
  Q_BACK + 'Hj' + 'SSSSSSHhSSShhSSSSSh' + '....',
  Q_LOCK + 'SSSSSSshsSSShSSSSSs' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  Q_LOCK + 'S'.repeat(18) + 's' + '....',
  '.....' + 'hj' + 'S'.repeat(17) + 's' + '.....',
  '......' + 'h' + '.' + 's' + 'S'.repeat(14) + 's' + '......',
  // The near lock's 1-px outward curl at the chin row; facing-side chin px in chin-AO skin.
  '.....h' + '.....' + 's'.repeat(11) + 'z' + '.'.repeat(7),
  '.'.repeat(21) + 'z' + '.'.repeat(8),
];

/**
 * q34 hat (26 × 10 at q34 acc + (−14, −4): figure x 9–34). Cone 1 px toward the nape, the tip flopping backward to
 * screen-left (1-px point at col 3 = x 12) past a transparent notch; the brim's facing end tapers to 1 row
 * (1 px past the skull, less than the back overhang), the near end 3 rows thick tapering to a 1-px point.
 */
export const HAT_Q34: Mask = [
  '........wDDdv.............',
  '.....wWDDDDddvV...........',
  '...Vvd...wWDDDddv.........',
  '...Vt....wWDDDDddv........',
  '...d....wWapDDDddv........',
  '........wWanpDDDdddv......',
  '.......vvvvvvvvvvvvVV.....',
  '.wWWWDDDDDDDDDDDDdddddvV..',
  'wWDDDDDDDDDDDDDDdddddddvvV',
  '.vvvvvvvvvvvvvvvvvvvVVVV..',
];
/** q34 R-W3 variant: the backward tip droops 1 row. */
export const HAT_Q34_RISING: Mask = [
  '........wDDdv.............',
  '.....wWDDDDddvV...........',
  '....vd...wWDDDddv.........',
  '...Vvd...wWDDDDddv........',
  '...Vt...wWapDDDddv........',
  '...d....wWanpDDDdddv......',
  '.......vvvvvvvvvvvvVV.....',
  '.wWWWDDDDDDDDDDDDdddddvV..',
  'wWDDDDDDDDDDDDDDdddddddvvV',
  '.vvvvvvvvvvvvvvvvvvvVVVV..',
];

/**
 * Far lock (q34, top-left = head joint + (8, −1) = head mask col 23, row 13): a 1-px lock in the hair shadow framing
 * the far cheek (flush with the hair rows above it, no ear-height nub), then a 2-px strand stepping in along the jaw taper to a 1-px point.
 */
export const HAIR_FAR_Q34: Mask = ['...J', ...Array.from({ length: 9 }, () => '...J'), '..JJ', '.JJ.', 'JJ..', 'J...'];
