// ronin (pixmates.ronin) authored masks, MA-29b per docs/art/ronin.md (originality gate PASS 2026-11-24; owner
// colourway B — warm dove-ivory mist, paper charm, calf-length cloak). A stylized archetype, not a portrait: a smooth
// umber chibi dome (no ears, tufts, ponytail or tie), 4 pointed fringe clumps parted right of the axis (tips 6/8/7/5
// rows from the crown top, centre-left longest, splits in `J`, ≥ 2 skin rows above the lash), 2-px side locks
// tapering to a 1-px point at the cheek, curling 1 px inward; a flat squared mist mantle (horn letters → mist)
// with a 1-px throat V showing the ash kosode collar and one cream underlayer px; a sheathed sword on his left hip
// (screen-right hilt rising out of the hip ~35°, cream / ink grip diamonds, brass tsuba, ash saya behind the body) with
// a paper charm on the cord; zori on warm bare feet (cream thong strap, lit toe). Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

const BLANK = '.'.repeat(30);
/** Rows 13–14: 1-px side locks (dark `j`, tapered in from the 2-px temple) either side of the 20-px face (cols 5–24). */
const LOCK_ROW = '....j' + 'S'.repeat(18) + 'ss' + 'j....';

/** 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12); lash row 15. */
export const HEAD: Mask = [
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  // Smooth dome, crown widths 12 → 16 → 18 → 20 → 22 (as maid); no ears, tufts or tie.
  // Smooth dome, crown widths 12 → 16 → 18 → 20 → 22 (as maid); a 1-px hair-4 (y) rim inside the top-left arc
  // (dark IDE); no ears, tufts or tie.
  '.'.repeat(9) + 'jyHHHHHHHhhj' + '.'.repeat(9),
  '.'.repeat(7) + 'jyHHHHHHHHHHhhhj' + '.'.repeat(7),
  '.'.repeat(6) + 'jyHHHHHHHHHHHhhhhj' + '.'.repeat(6),
  // Angel ring as an arc: the centre-left segment (Y, lit) 1 row above the side segments (lit left y/Y, right y),
  // real hair breaks between the 3 segments.
  '.....jy' + 'HH' + 'yYYy' + 'HHHHHHH' + 'hhhh' + 'j.....',
  '....j' + 'yYy' + 'HH' + 'HHHHH' + 'hh' + 'hyyh' + 'hhhh' + 'j....',
  // Clumps: A cols 5–8, B 10–14 (centre-left, longest), part 15–16 (right of the axis), C 17–20, D 22–24.
  '...' + 'jH' + 'HHHH' + 'J' + 'HHHHh' + 'JJ' + 'HHhh' + 'J' + 'shh' + 'hj' + '...',
  // Uneven tips with skin between: D ended (row 9), A row 10, C row 11, B row 12 — B crosses diagonally toward the
  // part. From the temple down the side contour tapers 1 px inward every 3 rows (cols 3 → 4 → 5): no helmet / brim.
  '...Hj' + 'SHhS' + 'S' + 'SHHHh' + 'SS' + 'HHhS' + 'S' + 'SSs' + 'jh...',
  '...Hj' + 'SSSS' + 'S' + 'SSHHh' + 'SS' + 'ShSS' + 'S' + 'SSs' + 'jh...',
  // B (centre-left) ends on row 12 at the part: two skin rows stay above the lash (row 15; startle lifts it to 14).
  '....j' + 'SSSS' + 'S' + 'SSSSH' + 'hS' + 'SSSS' + 'S' + 'SSs' + 'j....',
  LOCK_ROW,
  LOCK_ROW,
  // Deviation (male read at 1×, owner): the 1-px locks end at the eye's top row in a point (row 15), then curl 1 px
  // inward over the cheek edge (row 16) — no flat cut; the jaw shows clear (a jaw-length lock reads as a bob).
  '....h' + 'S'.repeat(18) + 'ss' + 'h....',
  '.....h' + 'S'.repeat(17) + 's' + 'h.....',
  '.....' + 'S'.repeat(18) + 'ss' + '.....',
  '.....' + 'S'.repeat(18) + 'ss' + '.....',
  // Human ears (2 px, inner shadow) under the lock tips cover the back hair beside the cheek: short sides, not a bob.
  '...sS' + 'S'.repeat(18) + 'ss' + 'ss...',
  '...sz' + 'S'.repeat(18) + 'ss' + 'zs...',
  '....s' + 'S'.repeat(18) + 'ss' + 's....',
  '.....' + 'S'.repeat(18) + 'ss' + '.....',
  '......' + 'S'.repeat(17) + 's' + '......',
  '.......' + 'S'.repeat(14) + 'ss' + '.......',
  '.'.repeat(10) + 's'.repeat(10) + '.'.repeat(10),
];
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 12;

/**
 * Sword (front prop, 31 × 13 from hip + (−15, −10.5): figure x 9–39, rows 29–41), sheathed on his left hip: the
 * hilt rises out of the hip outline up/out ≈ 35° at x 33–39 — kashira cap ash 4 + lit px, a 4-px grip of cream `p` /
 * ink `X` diamonds, a 3 × 1 brass tsuba (trim 4) with trim 2 under it, a 2-px saya mouth (ash 1, lit px ash 3); the
 * saya (ash 1–2, cool) runs behind the body down to a tip at knee height past the screen-left hem corner.
 */
export const SWORD: Mask = [
  '............................WrR',
  '...........................wXp.',
  '..........................wXX..',
  '.........................WpX...',
  '........................rrr....',
  '.....................bbBmM.....',
  '.................bbbbmm........',
  '.............bbbbmmmm..........',
  '.........bbbbmmmm..............',
  '.....bbbbmmmm..................',
  '....Mmmmm......................',
];

/**
 * q34 sword (23 × 12 from hip + (−14, −11.5)): the hilt pokes 3 px ahead of the belly at waist height (the near arm
 * swings over it), the saya trails down/back ≈ 25° to a tip 2 px clear of the cloak's trailing edge.
 */
export const SWORD_Q34: Mask = [
  '....................WrR',
  '...................wXp.',
  '..................wXX..',
  '.................rpX...',
  '..............bbBrr....',
  '............bbmmmM.....',
  '..........bbmm.........',
  '.......bbbmm...........',
  '.....bbmmm.............',
  '...bbmm................',
  '...Mmm.................',
];

/** Zori (front): warm bare foot (skin), a 1-px cream thong strap, umber sole with a lit toe px. */
export const SHOE: Mask = ['.Ss.', 'SpSs', 'RTtg'];
/** Side zori (q34, toe forward = screen-right): strap over the instep, lit toe px. */
export const SHOE_Q34: Mask = ['.Ss..', 'sSSpS', 'gttTR'];

// ── q34 (three-quarter, facing screen-right; RIG.md «Views») ─────────────────────────────────────────────────────────
// Fringe parted toward the facing; the back of the head is the authored `HAIR_BACK_Q34` (no procedural mass): the skull
// curve + ≤ 1 px of hair, stepping in 1 px at ear level, then a 2-row nape. A 2 × 3 skin ear sits inside the head
// contour with a 1-px hair-3 sideburn in front; the far lock (`HAIR_FAR_Q34`) ends at the eye's top row; the
// facing-side contour is vertical at col 25 from the eye row to the mouth row (22), then steps in 1 px per row to a
// 1-px chin; the face skin per row ≤ front.
const Q_SKIN = 'S'.repeat(17) + 's' + '....';

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12). */
export const HEAD_Q34: Mask = [
  BLANK,
  BLANK,
  BLANK,
  BLANK,
  '.'.repeat(9) + 'jyHHHHHHHhhj' + '.'.repeat(9),
  '.'.repeat(7) + 'jyHHHHHHHHHHhhhj' + '.'.repeat(7),
  '.'.repeat(6) + 'jyHHHHHHHHHHHhhhhj' + '.'.repeat(6),
  // Ring arc: the wide lit near segment 1 row above the side segments, compressed toward the far side.
  '.....jy' + 'HH' + 'YYYy' + 'HHHHHHH' + 'hhhh' + 'j.....',
  '....j' + 'yYy' + 'HHHHHHH' + 'hh' + 'hyyh' + 'hhhh' + 'j....',
  // Clumps: A 8–10, B 12–16 (longest, diagonal toward the part at 17), C 18–21, D 23–25; back of the head cols 3–7.
  '...' + 'jyHHH' + 'HHH' + 'J' + 'HHHHh' + 'J' + 'HHhh' + 'J' + 'hhh' + 'J' + '...',
  '.......' + 'h' + 'SHh' + 'S' + 'SHHHh' + 'S' + 'HHhS' + 'S' + 'SSs' + '....',
  '.......' + 'h' + 'SSSS' + 'SSHHh' + 'S' + 'ShSS' + 'S' + 'SSs' + '....',
  '.......' + 'h' + 'SSSS' + 'SSSSH' + 'h' + 'SSSS' + 'S' + 'SSs' + '....',
  // 1-px hair-3 sideburn (col 7) from the temple to the ear's lower row; the cheek starts at col 8.
  '.......H' + Q_SKIN,
  '.......H' + Q_SKIN,
  '.......H' + Q_SKIN,
  // Ear 2 × 3 (skin 3, inner skin 1) at cols 5–6, inside the contour; hair cut above it (HAIR_BACK_Q34).
  '.....SSH' + Q_SKIN,
  '.....SzH' + Q_SKIN,
  '.....sSh' + Q_SKIN,
  '.......' + 'S'.repeat(18) + 's' + '....',
  '.......' + 'S'.repeat(18) + 's' + '....',
  '.......' + 'S'.repeat(18) + 's' + '....',
  '.......' + 'S'.repeat(18) + 's' + '....',
  '........' + 'S'.repeat(16) + 's' + '.....',
  '........' + 's' + 'S'.repeat(14) + 's' + '......',
  '.'.repeat(13) + 's'.repeat(10) + '.'.repeat(7),
  '.'.repeat(21) + 's' + '.'.repeat(8),
];

/**
 * q34 back hair (`BodyView.masks.hairBack`, from the head joint + (−12, −4) = head-mask col 3, row 10): the skull back
 * (lit H) from the clump row down to the ear, cut above the ear; 1 px of hair behind the ear (the contour steps in);
 * then a 2-row tapered nape ending in 2 pointed 1-px flicks down/back. Nothing below the ear's last row + 2.
 */
export const HAIR_BACK_Q34: Mask = [
  'HHHh',
  'HHhh',
  'HHhh',
  'Hhhh',
  'Hhhj',
  'hjj.',
  '.j..',
  '.j..',
  '.j..',
  '.jhh',
  '.J.j',
];

/**
 * Far (facing-side) lock (q34, from head joint + (9, −1) = mask col 24, row 13): 1 px of hair 3 (lit inner edge; the
 * outline adds the dark outer px) behind the far cheek, ending on the eye's top row (lash row 15).
 */
export const HAIR_FAR_Q34: Mask = ['..H', '..H', '..H'];

// ── D-20 armour (MA-65, docs/art/ronin.md §1). Slots: `shoe` = lacquer_black (M 0 · m 1 · b 2 · B 3 · l 4 · L 6 spec),
// `horn` = lacquer_red (N 1 · n 2 · o 3 · O 4 · u 5 · U 6 spec), `trim` = cloth_ochre (studs, tsuba, straw).

/**
 * Menpō (`Body.mask` front, from the face anchor): red lacquer from under the iris (row 10) to the chin, cheek to cheek
 * inside the head; a lit nose ridge on the axis flanked by black nostrils, 1 lit + 1 spec px top-left, black dragon
 * whiskers (3 px each) sweeping to the cheek edges, a 2-px black mouth slot with upturned corners, darker chin rows.
 */
export const MENPO: Mask = [
  '.NouonnnMooMnnnnnNN.',
  '..NmmmnnmnnmnnmmmN..',
  '...NNnnnnMMnnnnNN...',
  '......NNNNNNNN......',
];
/** q34 menpō: 1 px narrower toward the facing, the near whisker only. */
export const MENPO_Q34: Mask = [
  '.NouonnnMooMnnnnNN..',
  '..NmmmnnmnnmnnnnN...',
  '..NNnnnnMMnnnnN.....',
  '......NNNNNNNN......',
];
/** Down (happy / petted / sleep): the menpō hangs under the chin as a 6 × 3 red plate over the throat guard. */
export const MENPO_DOWN: Mask = ['NnnnnN', 'NonnnN', '.NNNN.'];

/** Yodare-kake (throat guard, `neckAcc: 'collar'`): 2 rows of red lacing under the chin. */
export const THROAT: Mask = ['.NnNnNnN.', 'MNMNMNMNM'];
export const THROAT_Q34: Mask = ['.NnNnNnN', 'MNMNMNMN'];

/**
 * Dō (`Body.torsoMask`, from the chest joint): black lacquer cuirass, a lit top edge with the 1-px spec streak at the
 * top-left, 2 lacquer plate rows with 2 offset vermilion odoshi dashes each (every-2-px lacing read as a checker at 1×), shade-1 plate lines between them.
 */
export const DO: Mask = ['mLlbbbbbbbm', 'mbobbbbbobm', 'mmmmmmmmmmm', 'mbbbobobbbm', 'MmmmmmmmmmM'];
export const DO_Q34: Mask = ['mLlbbbbbbm', 'mbbobbbobm', 'mmmmmmmmmm', 'mbbbobobbm', 'MmmmmmmmmM'];

/** Sode (`Body.sode`, from the near shoulder joint): square 6 × 5 plates, 2 lace rows, a spec px. */
export const SODE: Mask = ['mLbbbm', 'mbobbm', 'mmmmmm', 'mbbobm', 'MmmmmM'];

/** Kusazuri (`Body.tassets`, from the hip joint): 4 hanging plates, a red lace row each, 1-px gaps (hakama shows). */
export const KUSAZURI: Mask = [
  'mLm.mlm.mlm.mbm',
  'mom.mom.mom.mom',
  'mbm.mbm.mbm.mbm',
  'mbm.mbm.mbm.mbm',
  'MmM.MmM.MmM.MmM',
];
export const KUSAZURI_SEATED: Mask = ['mLm.mlm.mlm.mbm', 'mom.mom.mom.mom', 'MmM.MmM.MmM.MmM'];
export const KUSAZURI_Q34: Mask = ['mLm.mlm.mbm', 'mom.mom.mom', 'mbm.mbm.mbm', 'mbm.mbm.mbm', 'MmM.MmM.MmM'];

/** Crown tuft (`headAcc: 'clip'`): 2 umber px × 2 rows above the crown, tied with a 1-px red cord on the crown row. */
export const TUFT: Mask = ['jh', 'Hh', 'oN'];
