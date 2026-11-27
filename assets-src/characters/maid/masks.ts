// maid (pixmates.maid) authored masks, MA-27 final from the 48-soft spike (MA-07, deleted in MA-31) with the
// art-director LATER items: rounder skull (crown widths 8 → 12 → 16 → 18 → 20 → 22, 2-px steps at the top corners),
// side locks tapering 1 px inward over their bottom third with a 2-px outward kick at the tips, imp hook horns (ivory,
// plum base; never dragon horns or blue/swept-back) tapering to a 1-px point that curls outward, mid-tone AA px on the
// outer curve and one darker underside px (art round MA-27-1), a hair-mid AA px at the left temple (the
// band pass adds the dark step under it), a clean 4 × 3 bow-tie (the spike's 6-px emblem removed), shoes with a light toe/heel
// rim for dark IDEs and a spade tip with a light upper-edge rim. Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

const FACE = '....H' + 'jSSS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSSsj' + 'h....';
const FACE_ROW = '...Hj' + 'SSSS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSSss' + 'jh...';

/** 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12). */
export const HEAD: Mask = [
  '.uUO......................UOu.',
  'U.nOn....................UOn.U',
  '...UOn..................UOn...',
  '....UOn....jHHHHhhj....UOn....',
  '.....Lbm.jHHyyHHHHhhj.Lbm.....',
  '.......jHHYYyHHHHHHhhhj.......',
  '......jHHyHHHHHHHHHhhhhj......',
  '.....jHHHHHHHHHHHHHHhhhhj.....',
  '....jHyYYyHyYYyhHyyyhhyhhj....',
  '...jHHyyHHHyyHHHhyyhhhyhhjj...',
  '...jHHHHHjHHHHHHjHHHhhjhhjJ...',
  '...Hj' + 'HHHj' + 'HHHHh' + 'h' + 'HHHhj' + 'hhhhj' + 'jh...',
  '...Hj' + 'hHHj' + 'HHHHh' + 'S' + 'hHHhj' + 'hhhjj' + 'jh...',
  '...Hj' + 'SShS' + 'SHHhS' + 'S' + 'SShhS' + 'Shjss' + 'jh...',
  '...Hj' + 'SSSS' + 'SSShS' + 'S' + 'SSSSS' + 'SSSss' + 'jh...',
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  FACE_ROW,
  // Bottom third: the locks step 1 px in over the cheeks…
  '....H' + 'jESS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSesj' + 'h....',
  FACE,
  FACE,
  // …then kick 2 px out at the tips.
  '...Hj' + '.SSS' + 'SSSSS' + 'S' + 'SSSSS' + 'SSss.' + 'jh...',
  '..Hh.' + '..SS' + 'SSSSS' + 'S' + 'SSSSS' + 'Sss..' + '.jh..',
  '..h..' + '....' + '.ssss' + 's' + 'sssss' + '.....' + '..h..',
];
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 14;

/** Clean 4 × 3 bow-tie at the collar: two loops (lit left) meeting at a 2-px knot, no tails or emblem. */
export const BOW: Mask = ['R..T', 'rggt', 'r..t'];

/**
 * Spade tip: a 1-px dark shaft neck, then a 5-px arrowhead with two light barbs swept back beside the neck (light =
 * the rim on dark wallpapers) and a 1-px notch at the base between each barb and the neck.
 */
export const SPADE: Mask = ['..m..', 'L.m.L', 'lLlLm', 'lLBbm', '.lBm.', '..m..'];

/** Apron bib (8 × 3, 2 px wider than the 4-px bow on each side, from the neck joint): cream, lit left, under the collar bow (the bow sits on it). */
export const BIB: Mask = ['pPPPPPPa', 'pPPPPPPa', 'pAAAAAAq'];

/** One shoe (top-left = foot − (2, 0.6)): plum, 1-px lighter rim at toe and heel for dark IDEs. */
export const SHOE: Mask = ['.LM.', 'lmlm', 'lMMl'];

// ── q34 (three-quarter, facing screen-right; MA-27d, ADR 010, RIG.md «Views») ─────────────────────────────────────
// Authored, not derived: the face sits 2 px further toward the facing (q34 face anchor at mask col 7), the near
// (screen-left) lock is full and the far one hides behind the cheek, the fringe parts toward the facing (skin V at
// col 18), the angel ring compresses on the far side, the jaw tapers on the facing side to a 1-px chin point. Near
// horn = the front left horn; the far horn is one row shorter, one ramp step darker, its plum base tucked behind the
// skull edge and its outward curl inside the mask (col 28).
const Q_EYE_ROW = '..' + 'HyHhj' + 'SSSSSSSSSSSSSSSSSSs' + '....';
/** Cheek rows: the same width as the eye rows (owner, MA-27d: no cheekbone bump). */
const Q_CHEEK_ROW = '...' + 'HHhj' + 'SSSSSSSSSSSSSSSSSSs' + '....';

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12). */
export const HEAD_Q34: Mask = [
  '.uUO' + '.'.repeat(26),
  'U.nOn' + '.'.repeat(20) + 'uoO..',
  '...UOn' + '.'.repeat(18) + 'uoN.u.',
  '....UOn....' + 'jHHHHhhj' + '....' + 'uoN....',
  '.....Lbm.' + 'jHHyyHHHHhhj' + 'bm' + '.......',
  '.......' + 'jHHYYyHHHHHHhhhj' + '.......',
  '......' + 'jHHyHHHHHHHHHhhhhj' + '......',
  '.....' + 'jHHHHHHHHHHHHHHhhhhj' + '.....',
  // Angel ring: wide clumps on the near side, compressed toward the far side.
  '....' + 'jHyYYyHhyYyHhyyHhhyhhj' + '....',
  '...' + 'jHHyyHHHyyHHHHyyhhhyhhjj' + '...',
  // Fringe clumps, the part toward the facing (col 19 gap, skin V at col 18 below).
  '...' + 'jHHHHHHHjHHHhjHHhhjhhhjJ' + '...',
  '...' + 'HHhj' + 'HHHhjHHhhjHHhhjHhhhj' + '...',
  // The near side of the skull rounds out 1 px (col 2) over the eye band.
  // Three pointed clumps cut into the forehead (2 rows deep: above the near eye's inner corner, at the part
  // toward the facing, a short one over the far eye); the skin band (`withBand`) follows each tip down.
  '..' + 'HHHhj' + 'hSSSSHhjSSHhjSShjShj' + '...',
  '..' + 'HHHhj' + 'SSSSSSjSSSSjSSSSSSh' + '....',
  '..' + 'HHHhj' + 'SSSSSSSSSSSSSSSSSSs' + '....',
  Q_EYE_ROW,
  Q_EYE_ROW,
  Q_EYE_ROW,
  Q_CHEEK_ROW,
  Q_CHEEK_ROW,
  Q_CHEEK_ROW,
  // Facing-side contour (owner, MA-27d): widest at eye level (col 25), one smooth convex curve stepping in by
  // 1 px per row from the mouth down (25 → 24 → 23 → 22) to the 1-px chin; the far sidelock (`HAIR_FAR_Q34`)
  // frames it, so skin is never the outer silhouette above the jaw.
  '....' + 'Hhj' + 'SSSSSSSSSSSSSSSSSSs' + '....',
  '....' + 'Hhj' + 'SSSSSSSSSSSSSSSSSSs' + '....',
  '....' + 'Hhj' + 'SSSSSSSSSSSSSSSSSs' + '.....',
  '..' + 'Hhj' + '...' + 'sSSSSSSSSSSSSSSs' + '......',
  '..h' + '........' + 'ssssssssssss' + '.......',
  '.'.repeat(21) + 's' + '.'.repeat(8),
];

/** q34 collar bow (3 × 3, 1 px narrower): near loop full height, knot, far loop foreshortened to 2 rows. */
export const BOW_Q34: Mask = ['R.t', 'rgt', 'r..'];

/** q34 bib (7 × 3, 1 px narrower): 3 px show on the near side of the bow, 1 px on the far side (turning away). */
export const BIB_Q34: Mask = ['pPPPPAa', 'pPPPPAa', 'pAAAAAq'];

/** Side shoe (5 px, toe forward = screen-right): ankle opening at the heel, lit vamp, light heel and toe rims. */
export const SHOE_Q34: Mask = ['.Lm..', 'lmbBl', 'lMMMm'];

/**
 * Apron ties at the small of the back (q34 only; front hides them): a cream bow loop with a dark-cream outer edge
 * peeking past the trailing waist, then two distinct 1-px tails with a 1-px gap trailing down and back over the
 * skirt edge. Top-left from the hip joint; never painted over the near arm, which gets a dark-cream line against
 * them (composer).
 */
export const TIES_Q34: Mask = ['.QQ...', 'QpaqA.', '.QQa.a', '...a.a', '..A..a', '..a.A.'];

/**
 * Far sidelock (q34, top-left = head joint + (8, −1), i.e. head mask col 23, row 13): the temple hair continues from
 * the fringe edge as a 1-px lock in the hair shadow step framing the far cheek down to the mouth (one mid-tone px at
 * the top), then a 2-px strand steps in 1 px per row along the jaw taper to a 1-px point. Its outer edge never passes
 * the face's widest column + 1.
 */
export const HAIR_FAR_Q34: Mask = ['...j', ...Array.from({ length: 9 }, () => '...J'), '..JJ', '.JJ.', 'JJ..', 'J...'];
