// coder (pixmates.coder) authored masks, MA-66 per docs/art/coder.md (D-20 chibi 48 × 56, stern look, richness;
// originality gate PASS 2026-11-24, D-20 re-check 2026-11-26). A stylized archetype, not a portrait: a night-shift
// coder boy — cool cocoa bedhead (flat messy top, 3 sideways tufts, one cowlick hook right of the axis, 5 uneven
// fringe clumps with two short ones over the brows), short squared sideburns, human ears; a mustard half-zip hoodie
// with the hood bunched behind the neck, a steel zipper pull, an indigo `{ }` print on the lit-left chest, a cream
// lanyard with a blank badge (amber `>_`), a kangaroo pocket, a ribbed waistband over a cream tee hem; straight
// rolled jeans; chunky cream sneakers. Slots: `dress` = cloth_mustard, `apron` = cloth_cream (tee, cord, badge,
// sneakers, sclera), `trim` = cloth_ochre (the amber mark), `horn` = metal (zipper pull), `shoe` = cloth_indigo
// (print). Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

const BLANK = '.'.repeat(30);

/**
 * Crown (rows 2–8, shared by both views): a flat messy top (row 4 already 14 px wide), the cowlick hook on rows 2–3
 * right of the axis (cols 15–18: a stem, a 3-px top, the tip curling down), a top tuft lying screen-left on row 3, a
 * left tuft out-and-down on rows 5–6, a right tuft out-and-down on rows 6–7; the angel ring on rows 7–8, one segment
 * per clump, warm lit left.
 */
const CROWN: Mask = [
  '.'.repeat(15) + 'yHh' + '.'.repeat(12),
  '..........jhH..H..j...........',
  '........jyHHHHHHHHHhhj........',
  '.....jhyHHHHHHHHHHHhhhj.......',
  '....j.jyHHHHHHHHHHHhhhhhhj....',
  '.....jyHHyYYyHHHHHHHhhhhjj....',
  '....jyYyHHHHHHHhhhyyhhhhj.....',
];

/** 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12); brows rows 13–14, lid rows 16–17. */
export const HEAD: Mask = [
  BLANK,
  BLANK,
  ...CROWN,
  // Clumps (row 9): A cols 4–7 | B 9–11 (short, over the near brow) | C 13–17 (longest) | D 19–21 (short, over the
  // far brow) | E 23–25; splits in `J`.
  '...jHHHHJHHhJHHHhhJhhhJhhhj...',
  // B and D end on row 10, so rows 11–12 stay skin over the brows (the two fringe gaps); A and E taper to row 12 with
  // their tips kicking out in opposite directions; C narrows to a 1-px tip on row 14 left of the axis.
  '...Hh' + 'HHh' + 'SHhS' + 'HHHHhh' + 'ShhS' + 'hhh' + 'hj...',
  '...Hh' + 'Hh' + 'S' + 'SSSS' + 'S' + 'HHHh' + 'S' + 'SSSS' + 'S' + 'hh' + 'hj...',
  '...Hh' + 'h' + 'SSSSSSS' + 'HHh' + 'SSSSSSSS' + 'h' + 'hj...',
  '...Hh' + 'S'.repeat(9) + 'Hh' + 'S'.repeat(7) + 'ss' + 'hj...',
  '...Hh' + 'S'.repeat(9) + 'h' + 'S'.repeat(8) + 'ss' + 'hj...',
  // Short squared sideburns (2 px) to the eye's lid rows, then 1 px, ending above the ears.
  '...Hh' + 'S'.repeat(18) + 'ss' + 'hj...',
  '...Hh' + 'S'.repeat(18) + 'ss' + 'hj...',
  '....h' + 'S'.repeat(18) + 'ss' + 'h....',
  '....h' + 'S'.repeat(18) + 'ss' + 'h....',
  // Human ears (2 px, inner shadow) beside the cheeks, as ronin.
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

// ── q34 (three-quarter, facing screen-right; RIG.md «Views») ─────────────────────────────────────────────────────────
// Fringe parted toward the facing; the back of the head is the authored `HAIR_BACK_Q34`; ear inside the contour; the
// facing-side contour vertical at col 25 from the eye row to the mouth row, then 1 px in per row to the chin (ronin's
// signed-off q34 skull: monotonic, no cheek bump).
const Q_SKIN = 'S'.repeat(17) + 's' + '....';

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12); brows rows 13–14. */
export const HEAD_Q34: Mask = [
  BLANK,
  BLANK,
  ...CROWN,
  // Clumps: back of the head 3–9 (incl. A 8–9) | B 11–13 (short, near brow) | C 15–18 (longest) | D 20–22 (short,
  // far brow) | E 24–25.
  '...jyHHHHHJHHhJHHhhJhhhJhhJ...',
  '.......h' + 'Hh' + 'S' + 'Hh' + 'S' + 'S' + 'HHHh' + 'S' + 'hh' + 'S' + 'S' + 'hh' + '....',
  '.......h' + 'Hh' + 'S'.repeat(5) + 'HHh' + 'S'.repeat(6) + 'hs' + '....',
  '.......h' + 'h' + 'S'.repeat(6) + 'Hh' + 'S'.repeat(8) + 's' + '....',
  '.......H' + 'S'.repeat(8) + 'h' + 'S'.repeat(8) + 's' + '....',
  '.......H' + Q_SKIN,
  '.......H' + Q_SKIN,
  '.......H' + Q_SKIN,
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

/** q34 back hair (from the head joint + (−12, −4)): the skull back to the ear, then a short nape with 2 flicks. */
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
/** Far sideburn (q34, from head joint + (9, −1)): 1 px behind the far cheek to the lid rows. */
export const HAIR_FAR_Q34: Mask = ['..H', '..H', '..H'];

// ── Costume ────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Hoodie front (`Body.torsoMask`, from the chest joint + (−6, 0): x 18–29, frame rows 34–45). The knit is authored
 * flat (body `D`, folds `d`) so the 12-px chest never turns into dither noise at 1×:
 * - rows 0–2: the hood bunched round the neck as a thick lit-left roll + the half-zip collar, a 2-px steel pull (`u`/`o`)
 *   on the axis;
 * - rows 3–5: the indigo `{ }` print on the lit-left chest (two 3-row braces, a 2-px gap);
 * - the lanyard: a 1-px cream cord from the collar to a 3 × 4 blank badge on the screen-right chest (cream, an amber
 *   `>` and `_`, a darker bottom edge) — the signature piece;
 * - rows 6–8: the kangaroo pocket (top edge one step darker, side openings mustard 1 diagonals);
 * - rows 9–10: the rib waistband with a mustard-1 tick every 3 px;
 * - row 11: the cream tee hem under the rib (the under layer).
 */
export const CHEST: Mask = [
  'dwWWWWWwwwDd',
  'vdwwWwuwwdDv',
  'DvvddvovddvD',
  'DDbDDbDDDpDD',
  'DbDDDDbDpppD',
  'DDbDDbDDtPpD',
  'DvvvvvvvPptD',
  'DvDDDDDDqqqD',
  'DDvDDDDDDvDD',
  'dvddvddvddvd',
  'dvddvddvddvd',
  'qaaaaaaaaaaq',
];
/**
 * q34 hoodie (from the chest joint + (−8, 0)): the hood lump trails behind the nape (cols 0–2, screen-left), the
 * collar and zip 1 px toward the facing, the print on the near chest, the badge toward the facing edge.
 */
export const CHEST_Q34: Mask = [
  'vDdwWWWWwwDd',
  'vDddwwWuwdDv',
  '.vvDvvdovdvD',
  '..DbDDbDDpDD',
  '..bDDDDbpppD',
  '..DbDDbDtPpD',
  '...vvvvvPptD',
  '...vDDDDqqqD',
  '....vDDDDDvD',
  '...vddvddvdd',
  '...vddvddvdd',
  '...aaaaaaaaq',
];

/** Chunky cream sneakers (front, 5 × 3): upper cream 4, a lace px, a lit toe, a 1-row sole with its shade line. */
export const SHOE: Mask = ['.pap.', 'Pppaq', 'aqqqa'];
/** Side sneaker (q34, toe forward = screen-right): heel tab, lace px, lit toe, sole line. */
export const SHOE_Q34: Mask = ['qpa..', 'qpppP', 'aqqqa'];
