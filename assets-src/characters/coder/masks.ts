// coder (pixmates.coder) authored masks, MA-66 per docs/art/coder.md (D-20 chibi 48 × 56, stern look, richness;
// owner redesign 2026-11-27: black hood-up hoodie, glasses, mustard accent). A stylized archetype, not a portrait: a
// night-shift coder boy — a round chibi hood always up (no point, no ears) with a mustard edge framing a cocoa fringe,
// rectangular steel glasses, human-skin face with no shadow or glow; a black (`cloth_onyx`) half-zip hoodie with two
// mustard drawstrings, a steel zipper pull, a blank cream badge with a mustard `>_` on a steel chain, a pocket line,
// a ribbed waistband over a cream tee hem; straight rolled jeans; chunky cream sneakers.
// Slots: `dress` = cloth_onyx, `trim` = cloth_mustard (hood edge, drawstrings, badge mark), `horn` = metal (glasses,
// zipper pull, chain), `apron` = cloth_cream (tee, badge, sneakers, sclera). Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

/**
 * 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12); brows rows 13–14, lid rows 16–17.
 * The hood (rows 3–25): a round dome lit top-left (a 4-px onyx-4 `w` sheen arc inside the lit outline), its shade-side
 * edge px onyx 2 `d` (the rig's rim light lifts it to onyx 4, so the hood holds on dark wallpapers) over onyx 0–1 `v`/`V`.
 * Its face edge is a 1-px mustard rim (`r` lit, `T` shade): top row cols 7–22, each top corner bevelled in 2 diagonal
 * steps, the sides cols 4 / 25 from row 11, the last px bent 1 col in toward the jaw (soft, never a TV frame or visor);
 * inside it a 1-row hair shadow (`j`) and the 5-clump cocoa fringe. Glasses: posts (cols 5 / 12 / 17 / 24) and the bridge
 * (row 17) metal 1 `N`, the lower rim (row 21, the old eye-bag row) metal 2 `n`; the lash and lid are the top of each frame.
 */
export const HEAD: Mask = [
  '..............................',
  '..............................',
  '..............................',
  '...........DDddddvd...........',
  '........wwDdddddddddvd........',
  '......wwddddddddddddddvd......',
  '.....Ddddddddddddddddddvd.....',
  '....Dddddddddddddddddddvvd....',
  '...DdddrrrrrrrrTTTTTTTTdvVd...',
  '..DdddrjjjjjjjjjjjjjjjjTvvVd..',
  '..DddrHhSHhSHHHHhhShhShhTvVd..',
  '..DdrHhSSSSSSHHHhSSSSSShhTVd..',
  '..DdrhSSSSSSSHHhSSSSSSSShTVd..',
  '..DdrSSSSSSSSSHhSSSSSSSssTVd..',
  '..DdrVSSSSSSSShSSSSSSSSsVTVd..',
  '..DdrVSSSSSSSSSSSSSSSSSsVTVd..',
  '..DdrNSSSSSSNSSSSNSSSSSsNTVd..',
  '..DdrNSSSSSSNNNNNNSSSSSsNTVd..',
  '...DrNSSSSSSNSSSSNSSSSSsNTd...',
  '...DrNSSSSSSNSSSSNSSSSSsNTd...',
  '...DrNSSSSSSNSSSSNSSSSSsNTd...',
  '...DrnnnnnnnnSSSSnnnnnnnnTd...',
  '...DrVSSSSSSSSSSSSSSSSSsVTd...',
  '...drVSSSSSSSSSSSSSSSSSsVTd...',
  '...ddrVSSSSSSSSSSSSSSssVTvd...',
  '....DVVVVVssssssssssVVVVVD....',
];
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 12;

// ── q34 (three-quarter, facing screen-right; RIG.md «Views») ─────────────────────────────────────────────────────────
// The hood wraps the back of the head (cols 2–7, screen-left) and ends at the brow on the facing side, so the face
// is open below the eye row; the facing-side contour is vertical at col 25 from the lid row to the mouth row, then
// 1 px in per row to the chin (ronin's signed-off q34 skull: monotonic, no cheek bump). Glasses: near lens posts 7 /
// 14, far lens 19 / 25 (the far temple on the contour), lower rim row 21. The facing-side rim corner bevels like the
// front (top row to col 24, one mustard-3 diagonal px, the side from row 10).

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12); brows rows 13–14. */
export const HEAD_Q34: Mask = [
  '..............................',
  '..............................',
  '..............................',
  '.........DDddddddddvd.........',
  '.......wwDdddddddddddvd.......',
  '.....wwddddddddddddddvd.......',
  '....Ddddddddddddddddddvd......',
  '...Dddddddddddddddddddddvd....',
  '...DdddddrrrrrrrrrTTTTTTTd....',
  '..DdddddrjjjjjjjjjjjjjjjjT....',
  '..DddddrHhSHhSSHHHhShhSShhT...',
  '..DddddrHhSSSSSHHhSSSSSShsT...',
  '..DddddrhSSSSSSHhSSSSSSSSsT...',
  '..DddddrVSSSSSSShSSSSSSSSsT...',
  '..DddddrVSSSSSSSSSSSSSSSSsT...',
  '..DddddrVSSSSSSSSSSSSSSSSsT...',
  '..DddddNVSSSSSNSSSSNSSSSSN....',
  '..DddddNVSSSSSNNNNNNSSSSSN....',
  '..DddddNVSSSSSNSSSSNSSSSSN....',
  '..DddddNVSSSSSNSSSSNSSSSSN....',
  '..DddddNVSSSSSNSSSSNSSSSSN....',
  '..DddddnnnnnnnnSSSSnnnnnnn....',
  '..DddddrVSSSSSSSSSSSSSSSSs....',
  '...DdddrVSSSSSSSSSSSSSSSSs....',
  '....dddrVSSSSSSSSSSSSSSSs.....',
  '.....ddrVVSSSSSSSSSSSSSs......',
  '......rVVVVVVssssssssss.......',
  '.....................s........',
];

// ── Costume ────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Hoodie front (`Body.torsoMask`, from the chest joint + (−6, 0): x 18–29, frame rows 34–45). Flat black knit (body
 * onyx 2 `d`, folds onyx 1 `v`, onyx 3 `D` lit collar, a lit px on each shoulder and one 3-px fold from the near armpit
 * toward the pocket) so the 12-px chest never turns into dither noise at 1×:
 * - rows 0–2: the collar and a 2-px steel zipper pull (`u`/`o`) on col 6;
 * - rows 1–4: two mustard drawstrings (`T`, a lit tip: mustard 5 `R` on the lit screen-left one, `r` on the other)
 *   either side of the pull, the screen-left one 1 px longer;
 * - rows 3–5: a 1-px steel chain from the collar's right side down to a steel-5 clip;
 * - rows 6–9: a blank 3 × 4 cream badge with a mustard `>` and `_` (2 px), hung under the clip on the right chest;
 * - row 7: the pocket line, 8 px of onyx 0;
 * - rows 9–11: the rib waistband with a tick every 4 px; 3 broken cream px of the tee hem peek out lit-left.
 * Three chest reads at 1×: drawstrings, chain + badge, pocket line.
 */
export const CHEST: Mask = [
  'vdDDDDDddddv',
  'DvdvTvuTvvvD',
  'dVVvTVoTVVVd',
  'ddddTddrddod',
  'dDddRddddodd',
  'ddDddddddudd',
  'dddDddddpPpV',
  'VVVVVVVVtppV',
  'vVvvvvVvptpV',
  'vvvVvvvVppaV',
  'vvvVvvvVvvvV',
  'PaVaVVVVVVVV',
];
/**
 * q34 hoodie (from the chest joint + (−8, 0)): the hood's back trails behind the nape (cols 0–2, screen-left), the
 * collar, pull and drawstrings 1 px toward the facing, the chain and badge toward the facing edge, a 5-px pocket line.
 */
export const CHEST_Q34: Mask = [
  'VvdDDDDDddvv',
  'VvvdvTuTvvvV',
  '.VVvvToTVVVd',
  '..ddvTdrddod',
  '..dDvRddddod',
  '...dDddddudd',
  '...ddDddpPpV',
  '...VVVVVtppV',
  '...vVvvVptpV',
  '...vVvvvppaV',
  '...vVvvvvvvv',
  '...aaVVVVVVV',
];

/** Chunky cream sneakers (front, 5 × 3): upper cream 4, a lace px, a lit toe, a 1-row sole with its shade line. */
export const SHOE: Mask = ['.pap.', 'Pppaq', 'aqqqa'];
/** Side sneaker (q34, toe forward = screen-right): heel tab, lace px, lit toe, sole line. */
export const SHOE_Q34: Mask = ['qpa..', 'qpppP', 'aqqqa'];
