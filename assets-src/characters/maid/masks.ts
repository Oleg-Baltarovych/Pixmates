// maid (pixmates.maid) authored masks, MA-27 final from the 48-soft spike (assets-src/spike/maid-48/rig.ts) with the
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
