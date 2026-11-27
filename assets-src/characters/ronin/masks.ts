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

/**
 * Owner pass (MA-65 sign-off): the round bowl crown becomes spiky clumps angled up and out — 1–2 px tips past the old
 * outline (rows 2–3 on top, rows 5–6 at the sides), the angel ring kept on rows 7–8, the temples squared (the side
 * walls go straight up from row 11 to row 5). Rows 2–8 replace the round dome; the tuft (rows 2–4, cols 14–15) is
 * stamped over it.
 */
const SPIKY_CROWN: Mask = [
  '........y..........h..........',
  '.......jyH..H.....hhj.........',
  '.......jyHHHHHHHHHHHhhj.......',
  '...j..jyHHHHHHHHHHHHhhhj..j...',
  '...jHjyHHHHHHHHHHHHHhhhhjhj...',
  '....jHHyHyYYyHHHHHHHhhhhhj....',
  '...jjyYyHHHHHHHhhhyyhhhhhjj...',
];
const spiky = (head: Mask): Mask => [...head.slice(0, 2), ...SPIKY_CROWN, ...head.slice(9)];

const HEAD_ROUND: Mask = [
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
  // Angular locks (art-director round 1): straight to row 17, then a square corner — no round bowl taper.
  '....h' + 'S'.repeat(18) + 'ss' + 'h....',
  '....h' + 'S'.repeat(18) + 'ss' + 'h....',
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
export const HEAD: Mask = spiky(HEAD_ROUND);
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 12;

/**
 * Sword (front prop, 31 × 13 from hip + (−15, −10.5): figure x 9–39, rows 29–41), sheathed on his left hip: the
 * hilt rises out of the hip outline up/out ≈ 35° at x 33–39 — kashira cap ash 4 + lit px, a 4-px grip of cream `p` /
 * ink `X` diamonds, a 3 × 1 brass tsuba (trim 4) with trim 2 under it, a 2-px saya mouth (ash 1, lit px ash 3); the
 * saya (ash 1–2, cool) runs behind the body down to a tip at knee height past the screen-left hem corner.
 */
export const SWORD: Mask = [
  '............................XxX',
  '...........................xXp.',
  '..........................xXX..',
  '.........................XpX...',
  '........................ttr....',
  '.....................lbBnn.....',
  '.................lbbbmm........',
  '.............lbbbmmmm..........',
  '.........lbbbmmmm..............',
  '.....lbbbmmmm..................',
  '....Mmmmm......................',
];

/**
 * q34 sword (23 × 12 from hip + (−14, −11.5)): the hilt pokes 3 px ahead of the belly at waist height (the near arm
 * swings over it), the saya trails down/back ≈ 25° to a tip 2 px clear of the cloak's trailing edge.
 */
export const SWORD_Q34: Mask = [
  '....................XxX',
  '...................xXp.',
  '..................xXX..',
  '.................tpX...',
  '..............lbBrr....',
  '............lbmmmM.....',
  '..........lbmm.........',
  '.......lbbmm...........',
  '.....lbmmm.............',
  '...lbmm................',
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
const HEAD_Q34_ROUND: Mask = [
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
export const HEAD_Q34: Mask = spiky(HEAD_Q34_ROUND);

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

// ── D-20 armour (MA-65, docs/art/ronin.md §1; art-director round 1). Slots: `shoe` = lacquer_black (M 0 · m 1 · b 2 ·
// B 3 · l 5 · L 6), `horn` = lacquer_red (N 0 outline · n 2 lace / tie #8a1f12 · o 3 base · O 4 lit · u 5 · U 6 spec), `trim` = cloth_ochre.
// The menpō is the only solid red shape; lacing is thin red lines, the black fill stays dark.

/**
 * Menpō (`Body.mask` front, face anchor, rows 10–13 — the chibi head leaves 4 rows under the iris): a hard shell —
 * r0 top edge (lit left half, base right) with the 2-px nose ridge on the axis flanked by black nostrils; r1 cheek
 * flares 1 px past the lower rows, a 2-px step-6 spec streak on the left cheek, one connected black whisker per side
 * (3 px out from the nostril, then 1 down on r2); r2 upturned mouth-slot corners; r3 the chin with the 3-px black
 * slot, red-0 outline ends. 15 black motif px, no teeth or fangs. Owner fix (2026-11-27): each row fills the head
 * contour cheek to cheek (jaw included), so the rig outline beside it is red, not skin, and no face px peeks past it.
 */
export const MENPO: Mask = [
  'NOOOUOOOMuoMoooooooN',
  '.NOOUMMMOOooMMMoooN.',
  '..NoMooMoooMoooMoN..',
  '.....NnoMMMoonN.....',
];
/**
 * q34: the strokes on the near cheek only, the ridge 1 px toward the facing. Like the front, the shell fills the head
 * contour on its rows (cheek to cheek, jaw and the 1-px chin tip included) so no skin shows beside or under it.
 */
export const MENPO_Q34: Mask = [
  'NOOOUOOOOMuoMoooooN.',
  '.NOOUOMMMOOooooooN..',
  '.NoooMooMoooMoooN...',
  '......NnoMMMonnN....',
  '..............N.....',
];
/** Down (happy / petted / sleep): the menpō hangs under the chin as a 6 × 3 red plate. */
export const MENPO_DOWN: Mask = ['NOOooN', 'nUoooN', '.NnnN.'];

/** Under the chin: a lacquer_black 0 gap row, then the yodare-kake (black 2) with one red lace row (1 on, 2 off). */
export const THROAT: Mask = ['.MMMMMMM.', 'bnbbnbbnb'];
export const THROAT_Q34: Mask = ['.MMMMMMM', 'bnbbnbbn'];

/**
 * Dō (`Body.torsoMask`, from the chest joint): a black top plate with a 2-px lacquer_black 5 spec streak (no red),
 * then per plate a continuous red lace line broken by a black px every 3rd px, black plate fill between.
 */
export const DO: Mask = ['mllbbbbbbbm', 'mnnMnnMnnMm', 'mbbbbbbbbbm', 'mnnMnnMnnMm'];
export const DO_Q34: Mask = ['mllbbbbbbm', 'mnnMnnMnnm', 'mbbbbbbbbm', 'mnnMnnMnnm'];

/** Sode (`Body.sode`): a lit top edge, one red lace line, black fill, an outline-0 column toward the dō. */
export const SODE: Mask = ['lllllM', 'bbbbbM', 'nnMnnM', 'bbbbbM', 'mmmmmM'];

/** Kusazuri (`Body.tassets`): 4 plates (lit top edge, one red lace row, black fill), 1-px gaps, aligned columns. */
export const KUSAZURI: Mask = [
  'mlm.mlm.mlm.mlm',
  'nnn.nnn.nnn.nnn',
  'mbm.mbm.mbm.mbm',
  'mbm.mbm.mbm.mbm',
  'MmM.MmM.MmM.MmM',
];
export const KUSAZURI_SEATED: Mask = ['mlm.mlm.mlm.mlm', 'nnn.nnn.nnn.nnn', 'MmM.MmM.MmM.MmM'];
export const KUSAZURI_Q34: Mask = ['mlm.mlm.mlm', 'nnn.nnn.nnn', 'mbm.mbm.mbm', 'mbm.mbm.mbm', 'MmM.MmM.MmM'];

/** Crown tuft (`headAcc: 'clip'`): umber 1–3, 2 px wide, slanted 1 px, tied with one deep red px on the crown row. */
export const TUFT: Mask = ['.j', 'jH', 'nh'];
export const TUFT_Q34: Mask = ['j.', 'Hj', 'hn'];
