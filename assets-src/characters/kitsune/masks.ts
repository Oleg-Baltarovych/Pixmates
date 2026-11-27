// kitsune (pixmates.kitsune) authored masks, MA-28 per docs/art/kitsune.md (originality gate PASS 2026-11-24).
// Silver `fur_ash` mop (crown widths 12 → 16 → 18 → 20 → 22 as maid), two 2-px cowlick tufts 1 px above the crown
// between the ears, 4 pointed fringe clumps (centre-left longest, points 1 px screen-left, splits in `j`), short side
// locks to mid-cheek with a 1-px outward kick, and the ivory side fox mask (horn letters, teal brow marks and snout
// px, ink eye slits; no red, no cord, no scar) on the screen-left temple, kept 1 px of hair clear of the fringe and
// below the ear. Fox ears in a 6 × 7 box (dummy EAR footprint), 1-px point leaning outward, cream base tuft.
// Legend: assets-src/lib/mask.ts.
import type { Mask } from '../../lib/mask.ts';

/** Paints the non-'.' px of `over` onto `base` with its top-left at (x, y). */
const overlay = (base: Mask, over: Mask, x: number, y: number): Mask =>
  base.map((row, r) => {
    const src = over[r - y];
    if (src === undefined) return row;
    const out = row.split('');
    for (let c = 0; c < src.length; c++) if (src.charAt(c) !== '.') out[x + c] = src.charAt(c);
    return out.join('');
  });

const BLANK = '.'.repeat(30);

/**
 * Side fox mask, front (7 × 7; art round MA-28-1: a fox face, not a skull): two 1-px ear points in the horn mid tone
 * with a 1-px dip, 2-px teal brow marks, each eye 2 ink px on a diagonal slanting up and out with ivory all round (no
 * blocks), the bottom 2 rows tapering to a 1-px teal tip (no ink nose); outline horn shade 2. Tilted out: the taper
 * sits 1 px toward screen-left (snout down/out).
 */
export const SIDE_MASK: Mask = ['.o...o.', 'nUn.nUn', 'ntTUTtn', 'uXUUUXu', 'OUXUXUO', 'OUUUO..', '..t....'];
/** q34 side mask (7 × 7): the same face turned more to the viewer (symmetric), on the near back-temple. */
export const SIDE_MASK_Q34: Mask = ['.o...o.', 'nUn.nUn', 'ntTUTtn', 'uXUUUXu', 'OUXUXUO', '.OUUUO.', '...t...'];
/** Head-mask px of the side mask (top-left), per view. */
export const SIDE_MASK_AT = { front: [0, 7], q34: [0, 7] } as const;

// Locks: 1-px dark outline outside, shade-3 fill next to the face (art round MA-28-1: no dark helmet column).
const FACE_LOCKS = (face: string): string => '...Hj' + face + 'Hj...';

const HEAD_BASE: Mask = [
  BLANK,
  BLANK,
  BLANK,
  // Cowlicks: two 2-px tufts 1 px above the crown curve, between the ears.
  '.'.repeat(11) + 'yH' + '...' + 'Hh' + '.'.repeat(12),
  '.'.repeat(9) + 'jHHHHHHHHhhj' + '.'.repeat(9),
  '.'.repeat(7) + 'jHHHHHHHHHHHhhhj' + '.'.repeat(7),
  '.'.repeat(6) + 'jHHHHHHHHHHHHhhhhj' + '.'.repeat(6),
  '.'.repeat(5) + 'jHHHHHHHHHHHHHHhhhhj' + '.'.repeat(5),
  // Angel ring (art round MA-28-1): one continuous 2-row band split per fringe clump (mid-tone AA px only at the
  // splits, cols 7 / 10 / 15 / 20), warm and brightest on the lit left, fading into shade on the right.
  // Art round MA-28-2: varied per clump — lit-left clumps 3 px of cream (Y), right clumps 2 px of mid shine (y), the
  // far-right clump's band 1 row lower; a mid-tone (H, fur_ash shade 4) AA px at each split.
  '....' + 'jyYHYYHYYYHHyyhhHhhhhj' + '....',
  '...' + 'jHHHHHHHHHHHhHHhhhyyhhjj' + '...',
  // Clump splits (j): hair col 7 | A 8–9 | B 11–14 | C 16–19 | D 21–24.
  '...' + 'jHHHjHHjHHHHjHHhhjhhhhjJ' + '...',
  FACE_LOCKS('HHjHhSHHHhSHHhSShhhs'),
  FACE_LOCKS('HHjhSSHHhSSHhSSSShSs'),
  // B (centre-left) is the longest clump: its 1-px tip 1 px left of its centre; a skin row stays above the lash.
  FACE_LOCKS('HHjSSSSh' + 'S'.repeat(11) + 's'),
  FACE_LOCKS('S'.repeat(19) + 's'),
  FACE_LOCKS('S'.repeat(19) + 's'),
  FACE_LOCKS('S'.repeat(19) + 's'),
  FACE_LOCKS('S'.repeat(19) + 's'),
  FACE_LOCKS('S'.repeat(19) + 's'),
  FACE_LOCKS('S'.repeat(18) + 'ss'),
  // Short locks end at mid-cheek, the tips kicking 1 px out.
  '..Hj.' + 'S'.repeat(18) + 'ss' + '.Hj..',
  '..h..' + 'S'.repeat(18) + 'ss' + '..h..',
  '.....' + 'S'.repeat(18) + 'ss' + '.....',
  '......' + 'S'.repeat(17) + 's' + '......',
  '.......' + 'S'.repeat(14) + 'ss' + '.......',
  '.'.repeat(10) + 's'.repeat(10) + '.'.repeat(10),
];

/** 30 × 26, top-left at head joint − (15, 14). Face anchor at mask (5, 12). */
export const HEAD: Mask = overlay(HEAD_BASE, SIDE_MASK, ...SIDE_MASK_AT.front);
/** Last head row the forehead hair-shadow band (`withBand`) may use. */
export const BAND = 14;

/** Left fox ear (6 × 7): 1-px point leaning outward, convex inner edge, inner shade j, 2-px cream tuft at the base. */
const EAR_L: Mask = ['.Y....', '.yH...', '.yjH..', 'yHjjH.', 'yHjjHh', 'hHPPHh', '..HHhh'];
/** Right ear: the mirror with the outer edge in the shadow tones (light from the top-left). */
const EAR_R: Mask = ['....h.', '...Hh.', '..Hjh.', '.Hjjhj', 'hHjjhj', 'hHPPhj', 'hhHH..'];
/** Fox ears at acc + (−11, −4): the dummy ear footprint (headroom never above dummy-b's). */
export const EARS: Mask = EAR_L.map((r, y) => r + '..........' + (EAR_R[y] ?? ''));
/** q34 ears: near ear full, far ear 2 px narrower and 1 px lower. */
const FAR_EAR: Mask = ['....', '..h.', '.Hh.', '.Hjh', 'HjjJ', 'HPPj', 'hHh.', '....'];
export const EARS_Q34: Mask = FAR_EAR.map((far, y) => (EAR_L[y] ?? '......') + '............' + far);

/**
 * Scarf (front, 9 × 5 from neck + (−4, 3)): a 2-row teal band lit left, a 2 × 2 knot at the screen-right end, and the
 * crossover collar's darker 3-row V under it (indigo, in the same mask). The ends are rig chains (`Body.scarf`).
 */
export const SCARF: Mask = ['rTTTTTTTg', 'rttttttRT', '.vVVVVvTg', '..vVVv...', '...vv....'];
/** q34 scarf (8 × 5): 1 px narrower, the knot near-front (facing side), the V 1 px toward the facing. */
export const SCARF_Q34: Mask = ['rTTTTTTg', 'rtttttRT', '..vVVvTg', '...vVv..', '....v...'];

/** Tabi (front): dark indigo with a light toe/heel rim (shade 5), no split-toe notch. */
export const SHOE: Mask = ['.Bm.', 'LBbm', 'LMML'];
/** Side tabi (q34, toe forward = screen-right): light heel and toe rims. */
export const SHOE_Q34: Mask = ['.Bm..', 'LbbBL', 'LMMMm'];

// ── q34 (three-quarter, facing screen-right; RIG.md «Views») ─────────────────────────────────────────────────────────

const HEAD_Q34_BASE: Mask = [
  BLANK,
  BLANK,
  BLANK,
  '.'.repeat(12) + 'yH' + '...' + 'Hh' + '.'.repeat(11),
  '.'.repeat(9) + 'jHHHHHHHHhhj' + '.'.repeat(9),
  '.'.repeat(7) + 'jHHHHHHHHHHHhhhj' + '.'.repeat(7),
  '.'.repeat(6) + 'jHHHHHHHHHHHHhhhhj' + '.'.repeat(6),
  '.'.repeat(5) + 'jHHHHHHHHHHHHHHhhhhj' + '.'.repeat(5),
  // Shine band split per clump (splits cols 7 / 11 / 17 / 22), lit left.
  '....' + 'jyYHYYYHYYYHhHyyhhHhhj' + '....',
  '...' + 'jHHHHHHHHHHHHhhHHhhhyyhj' + '...',
  // Fringe parted toward the facing: hair col 7 | A 8–10 | B 12–16 (longest) | C 18–21 | D 23–25.
  '...' + 'jHHHHHHHjHHHHhjHHhhjhhhJ' + '...',
  '...' + 'HHhj' + 'j' + 'HHh' + 'S' + 'HHHh' + 'SS' + 'HHh' + 'SS' + 'hhh' + 'j' + '...',
  '..' + 'HHHhj' + 'j' + 'Hh' + 'SS' + 'HHh' + 'SSS' + 'Hh' + 'SSS' + 'h' + 'Ss' + '....',
  '..' + 'HHHhj' + 'j' + 'SSSS' + 'h' + 'S'.repeat(12) + 's' + '....',
  // Near lock (art round MA-28-2: no earcup block): a 2-px diagonal shine under the mask, 1 px of cheek skin between
  // lock and face, then two pointed clumps tapering 4 → 3 → 1 px, tips kicking 1 px back and down, ending at the
  // eye-bottom row + 1 (row 21) as in front.
  '..' + 'HyHhj' + 'S'.repeat(18) + 's' + '....',
  '..' + 'HHyhs' + 'S'.repeat(18) + 's' + '....',
  '..' + 'HHhjs' + 'S'.repeat(18) + 's' + '....',
  '..' + 'HHhjs' + 'S'.repeat(18) + 's' + '....',
  '..' + 'HjHhs' + 'S'.repeat(18) + 's' + '....',
  '.' + 'Hj.Hjs' + 'S'.repeat(18) + 's' + '....',
  '.' + 'h..Hjs' + 'S'.repeat(18) + 's' + '....',
  // The near lock ends at mid-cheek with a 1-px outward kick. Facing-side contour (art round MA-28-1): vertical at
  // col 25 from the eye row to the mouth row (22), then a rounded chin — steps 1, 1 and a final 2 (the "2-1-1" read
  // from the chin up), the 1-px chin point 1 px further back than the 45° stair had it.
  '...h...' + 'S'.repeat(18) + 's' + '....',
  '.'.repeat(7) + 'S'.repeat(18) + 's' + '....',
  '.'.repeat(7) + 'S'.repeat(17) + 's' + '.....',
  '.'.repeat(8) + 's' + 'S'.repeat(14) + 's' + '......',
  '.'.repeat(11) + 's'.repeat(12) + '.'.repeat(7),
  '.'.repeat(20) + 's' + '.'.repeat(9),
];

/** 30 × 27, top-left at head joint − (15, 14). q34 face anchor at mask (7, 12). */
export const HEAD_Q34: Mask = overlay(HEAD_Q34_BASE, SIDE_MASK_Q34, ...SIDE_MASK_AT.q34);

/**
 * Far lock (q34, top-left = head joint + (8, −1) = head mask col 23, row 13): a 1-px lock framing the far cheek to
 * mid-cheek, no kick (art round MA-28-1: no px outside the face edge between the eye and mouth rows).
 */
export const HAIR_FAR_Q34: Mask = ['...j', ...Array.from({ length: 6 }, () => '...J')];

/**
 * Sash knot (2 × 2, from the hip joint) 1 row under the 2-row sash on the near (screen-left) hip, its top-left px one
 * teal step lighter, and a 1 × 2 teal tail hanging below it.
 */
export const SASH_KNOT: Mask = ['RT', 'Tg', 't.', 't.'];
