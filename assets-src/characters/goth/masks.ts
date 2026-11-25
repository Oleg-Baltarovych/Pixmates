// goth (pixmates.goth) authored masks, MA-29 per docs/art/goth.md (originality gate PASS 2026-11-24). A stylized
// archetype, not a portrait. Blue-black `hair_black` dome (crown widths 8 → 12 → 16 → 18 → 20 → 22), 4 pointed fringe
// clumps of uneven length (tips 6 / 8 / 7 / 5 rows, centre-left longest, parting right of the axis, splits in `j`,
// one skin row above the lash), an angel ring broken into one segment per clump that follows the skull arc (centre
// clumps 1 row higher than the side ones; never one continuous band), 2-px side locks tapering to 1-px points (the
// procedural lock chains continue them to the chest), a dusty-ivory moth clip (seen from above at rest: swept delta
// wings, 1-px body, feathered antennae) on the screen-left crown, a black velvet choker with cream lace and a garnet
// drop, and black Mary Janes. Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

const BLANK = '.'.repeat(30);
/** Eye-band rows: 2-px locks (lit outer `H`, dark inner `j`) either side of the 20-px face. */
const FACE_ROW = '...Hj' + 'S'.repeat(18) + 'ss' + 'jh...';
/** Lower cheeks: the locks step 1 px in over the cheek edge. */
const CHEEK_ROW = '....H' + 'jSSS' + 'S'.repeat(12) + 'SSsj' + 'h....';

/** 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12). */
export const HEAD: Mask = [
  BLANK,
  BLANK,
  BLANK,
  '.'.repeat(11) + 'jHHHHhhj' + '.'.repeat(11),
  '.'.repeat(9) + 'jHHHHHHhhhhj' + '.'.repeat(9),
  // Angel ring (art round 1): a 1-px band 2–3 rows under the crown, one segment per clump, broken at the splits;
  // centre clumps (B lit Y, C dim y) 1 row above the side ones (A lit, D dim), following the skull arc.
  '.'.repeat(7) + 'jHHYYYHHHyyHhhhj' + '.'.repeat(7),
  '.'.repeat(6) + 'jYYyHHHHHHHHHHhyhj' + '.'.repeat(6),
  '.'.repeat(5) + 'jHHHHHHHHHHHHHHhhhhj' + '.'.repeat(5),
  // Angel ring, centre clumps (B cols 9–12 lit `Y`, C cols 16–17 dim `y`), 1 row above the side segments.
  '....' + 'jHHHHHHHHHHHHHHHhhhhhj' + '....',
  // Side segments (A cols 5–6 lit, D col 23 dim) and the first clump splits (cols 8, 15, 21).
  '...' + 'jHHHHjHHHHHHjHHHhhjhhhhj' + '...',
  // Clumps: A cols 5–7, B 9–14, C 16–20, D tip (col 23, 5 rows); V gaps of forehead skin between them.
  '...Hj' + 'HHhSHHHHHhSHHHhhSShS' + 'jh...',
  '...Hj' + 'ShSSSHHHhSSSHHhSSSSS' + 'jh...',
  '...Hj' + 'SSSSSSHhSSSSSSSSSSSS' + 'jh...',
  // B (centre-left, longest) ends in a 1-px point; the next row is the skin row above the lash.
  '...Hj' + 'SSSSSSSSSSSSSSSSSSSS' + 'jh...',
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  CHEEK_ROW,
  CHEEK_ROW,
  CHEEK_ROW,
  // The locks taper to 1-px points (the chains carry them on to the chest); the chin rounds over 3 rows.
  '....H' + '.SSS' + 'S'.repeat(11) + 'SSss.' + 'h....',
  '.....' + '..SS' + 'S'.repeat(11) + 'Sss..' + '.....',
  '.....' + '....' + '.ssss' + 's' + 'sssss' + '.....' + '.....',
];
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 14;

/**
 * Moth clip (front, 7 × 4; horn letters, `hornOutline` hair_black): feathered antennae, swept delta forewings in the
 * ivory light tone, a 1-px body one value step under the wings on the centre column (art pitfall 7: no wing spots,
 * so it never reads as a bow), hindwing tips. Placed at
 * acc + (−9, 0): head rows 3–6 on the screen-left crown, over the fringe root, the bump on one side of the dome.
 */
export const MOTH: Mask = ['.O...O.', '..UuU..', '.UOuOU.', 'UO.u.OU'];
/** q34 moth (5 × 4, near side): turned ~20°, the wings swept back toward the nape (screen-left). */
export const MOTH_Q34: Mask = ['..O.O', '.UuU.', 'UOuO.', 'O.u..'];

/**
 * Choker (6 × 4 from neck + (−3, 3), symmetric about x = 24): black velvet band lit left of centre, cream lace
 * scallops with the centre bail over chin-shadow skin, then the garnet drop (highlight top-left, shadow bottom-right).
 */
export const CHOKER: Mask = ['ssssss', 'VvVVVV', 'p.RT.p', '..gG..'];
/** q34 choker (5 px), the drop 1 px toward the facing side. */
export const CHOKER_Q34: Mask = ['sssss', 'VvVVV', 'p.RTp', '..gG.'];

/** Mary Jane (front): black upper, a 1-px tonal strap, a lit toe px and a sole rim for the dark IDE. */
export const SHOE: Mask = ['.Bm.', 'Lllm', 'llll'];
/** Side Mary Jane (q34, toe forward = screen-right): strap, light heel and toe rims. */
export const SHOE_Q34: Mask = ['.Bm..', 'mllbL', 'lllll'];

// ── q34 (three-quarter, facing screen-right; RIG.md «Views») ─────────────────────────────────────────────────────────
// Fringe parted toward the facing; the near (screen-left) lock 2–3 px from the temple, never wider below it (no bulge
// at ear height); the far lock hides behind the cheek (`HAIR_FAR_Q34` frames it); the facing-side contour is
// vertical at col 25 from the eye row and steps in 1 px per row to a 1-px chin point at col 21.
const Q_TEMPLE = '.....' + 'Hj';
const Q_LOCK = '.....' + 'Hj';

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12). */
export const HEAD_Q34: Mask = [
  BLANK,
  BLANK,
  BLANK,
  '.'.repeat(11) + 'jHHHHhhj' + '.'.repeat(11),
  '.'.repeat(9) + 'jHHHHHHhhhhj' + '.'.repeat(9),
  '.'.repeat(7) + 'jHYYYyHHHyyHhhhj' + '.'.repeat(7),
  '.'.repeat(6) + 'jYyHHHHHHHHHHHhyhj' + '.'.repeat(6),
  '.'.repeat(5) + 'jHHHHHHHHHHHHHHhhhhj' + '.'.repeat(5),
  // Ring: wide lit segments on the near side, compressed toward the far side; side segments 1 row lower.
  '....' + 'jHHHHHHHHHHHHHHhhhhhhj' + '....',
  '...' + 'jHHHHHHjHHHHHHjHHHhhjhhJ' + '...',
  '...' + 'jHHHHHHHjHHHhjHHhhjhhhjJ' + '...',
  '...' + 'HHhj' + 'HHHhjHHhhjHHhhjHhhhj' + '...',
  Q_TEMPLE + 'hSSSSHhjSSHhjSShSShj' + '...',
  Q_TEMPLE + 'SSSSSSjSSSShSSSSSSh' + '....',
  Q_TEMPLE + 'S'.repeat(18) + 's' + '....',
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
  // Art round 2: the facing-side chin px in chin-AO skin (z), so their outline never reads as a jaw bump.
  '.'.repeat(11) + 's'.repeat(11) + 'z' + '.'.repeat(7),
  '.'.repeat(21) + 'z' + '.'.repeat(8),
];

/**
 * Far lock (q34, top-left = head joint + (8, −1) = head mask col 23, row 13): a 1-px lock in the hair shadow framing
 * the far cheek to the mouth, then a 2-px strand stepping in along the jaw taper to a 1-px point.
 */
export const HAIR_FAR_Q34: Mask = ['...j', ...Array.from({ length: 9 }, () => '...J'), '..JJ', '.JJ.', 'JJ..', 'J...'];
