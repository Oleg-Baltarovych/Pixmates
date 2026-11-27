// vampire (pixmates.vampire) authored masks (MA-68, docs/art/vampire.md §1 + «As built»). Legend: assets-src/lib/mask.ts.
// Hair `hair_black` slicked straight back from a high open forehead with a widow's peak (owner D-23): the hairline
// recedes at both temples and dips to a 2-px V on the face axis, fine j strand lines sweep back, an angel ring per
// sweep clump, 2-px sideburns tapering to eye-bottom level, no ears. Collar letters: dress = midnight outer face
// (1 edge + 5 lit, never the sleeve's 2–4, so a sleeve over a wing keeps its value step), horn = the old-gold inner
// face; apron = cream shirt / ascot.
import type { Mask } from '../../lib/mask.ts';

/** Last head row the forehead hair-shadow band may use. */
export const BAND = 11;

// ── head (30 × 26, top-left at head joint − (15, 14); face anchor at mask (5, 12) front, (7, 12) q34) ────────────
/** Combed-back crown (rows 0–8): strands run up from the hairline, ring arcs per clump. */
const CROWN: Mask = [
  '..............................',
  '..............................',
  '..............................',
  '...........jHHHHhhj...........',
  '.........jHyHHjHHhhj..........',
  '.......jHHyHHjHHyHHjhj........',
  '......jHyYHHjHyYHHjHhhhj......',
  '.....jHyYyHHjHyYyHjHHhhhj.....',
  '....jHHyHHHjHHyHHjHhHhhhhj....',
];

/**
 * Front: the hairline recedes at both temples from row 9 and the centre wedge narrows 10 → 6 → 2 px to the V tip on
 * the axis (cols 14–15, row 11), one skin row above the brows; sideburns at cols 3–5 / 24–26.
 */
export const HEAD: Mask = [
  ...CROWN,
  '...jHHh' + 'sSS' + 'jHHjHHjhHj' + 'SSs' + 'hhhj' + '...',
  '...Hhj' + 'SSSSSS' + 'jHjhhj' + 'SSSSSS' + 'jhH' + '...',
  '...Hhj' + 'SSSSSSSS' + 'jj' + 'SSSSSSSS' + 'jhH' + '...',
  '...Hhj' + 'SSSSSSSSSSSSSSSSSS' + 'jhH' + '...',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSS' + 'hH' + '...',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSS' + 'hH' + '...',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSS' + 'Hj...',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSS' + 'Hj...',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSS' + 'Hj...',
  '....h' + 'SSSSSSSSSSSSSSSSSSSS' + 'h....',
  '....h' + 'SSSSSSSSSSSSSSSSSSSS' + 'h....',
  '....' + 'sSSSSSSSSSSSSSSSSSSSSs' + '....',
  '....' + 'sSSSSSSSSSSSSSSSSSSSSs' + '....',
  '.....' + 'sSSSSSSSSSSSSSSSSSSs' + '.....',
  '......' + 'sSSSSSSSSSSSSSSSSs' + '......',
  '........' + 'sSSSSSSSSSSSSs' + '........',
  '..........' + 'ssssssssss' + '..........',
];

/**
 * q34: the crown 1 px toward the back, the far side keeps a thicker back-of-head mass, the V sits on the q34 face
 * axis (cols 16–17); the facing contour holds col 25 from the temple to the mouth, then steps in 1 px per row to a
 * 1-px chin ahead of the face centre (owner q34 rules: monotonic, no cheek bump).
 */
export const HEAD_Q34: Mask = [
  ...CROWN.map((r) => r.slice(1) + '.'),
  '..jHHHh' + 'sSSSS' + 'jHHjHhjhHj' + 'SSs' + 'hj' + '...',
  '..HHHj' + 'SSSSSSSS' + 'jHjhhj' + 'SSSSS' + 'hj' + '...',
  '..HHHj' + 'SSSSSSSSSS' + 'jj' + 'SSSSSSSS' + '....',
  '..HHHj' + 'SSSSSSSSSSSSSSSSSSSS' + '....',
  '..HHh' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '..HHh' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '....h' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '....h' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '.....' + 'sSSSSSSSSSSSSSSSSSSs' + '.....',
  '......' + 'sSSSSSSSSSSSSSSSSs' + '......',
  '.......' + 'sSSSSSSSSSSSSSSs' + '.......',
  '.........' + 'sSSSSSSSSSSSs' + '........',
  '............' + 'sSSSSSSSs' + '.........',
  '...................' + 's' + '..........',
];

// ── neck / collar (`neckAcc: 'collar'`, from the neck joint) ─────────────────────────────────────────────────────
/** Mirror a left half about a centre column (same tones both sides: the lit side comes from the rig's rim pass). */
const sym = (halves: readonly string[], centre = '.'): Mask =>
  halves.map((l) => l + centre + Array.from({ length: l.length }, (_, i) => l.charAt(l.length - 1 - i)).join(''));
/**
 * q34: only the trailing (screen-left) wing stands free; on the facing side the collar keeps `keep` columns past the
 * centre (a sliver at the chin, never ahead of it), and the whole collar shifts 1 px toward the facing.
 */
const q34Of = (m: Mask, keep: number): Mask =>
  m.map((r) => {
    const cut = Math.floor(r.length / 2) + 1 + keep;
    return ('.' + r.slice(0, cut) + '.'.repeat(r.length)).slice(0, r.length);
  });

/**
 * The fan collar (owner pick: variant C's 9-row wings and broad 2-px old-gold inner face): two stiff wings flaring
 * out from the neck base. R-V2 (`COLLAR_MAX`) fixes the span: 25 px (tips at x 12 / 36 at rest, inside 11–37 on the
 * idle_b sway) with the top 1 row over A's (the head bob of walk / happy / sleep would put a higher tip at eye level).
 */
export const COLLAR: Mask = sym([
  'v...........',
  'vv..........',
  'Wvv.........',
  'WuOv........',
  'WuOOv.......',
  '.WuOOv......',
  '..WuOOv.....',
  '...vWuOv....',
  '....vWuOvv..',
]);
export const COLLAR_Q34: Mask = q34Of(COLLAR, 4);
export const COLLAR_AT = [-12, -1] as const;

// ── chest (`torsoMask`, 12 × 12 from the neck joint − (6, 0)) ────────────────────────────────────────────────────
/** Cream shirt V, 2-tier ascot with the moonstone brooch, midnight-4 waistcoat with a 2-button gold column. */
export const CHEST: Mask = [
  'vwWapPPpawWv',
  'vwwWpPPpWwwv',
  'vwwwaPPawwwv',
  'vwwwwuOwwwwv',
  'vwdwwOPwwdwv',
  'vwdwwapwwdwv',
  'vwdwwwuwwdwv',
  'vwdwwwdwwdwv',
  'vwdwwwuwwdwv',
  'vvwwwwdwwwwv',
  'vvvwwvdvwwvv',
  'vvvvvdvdvvvv',
];
export const CHEST_Q34: Mask = [
  'vwWapPPpawWv',
  'vwwWpPPpWwwv',
  '.vwwaPPawwwv',
  '..vwwuOwwwwv',
  '..vwwOPwwdwv',
  '...vwapwwdwv',
  '...vwwuwwdwv',
  '...vwwdwwdwv',
  '...vwwuwwdwv',
  '...vwwdwwwwv',
  '...vvvdvwwvv',
  '...vvdvdvvvv',
];

/** Pointed dress shoe: midnight, 1-px lit toe, 1-px gold buckle. */
export const SHOE: Mask = ['.bu.', 'mbbm', 'mMLm'];
export const SHOE_Q34: Mask = ['.ub..', 'mbbbL', 'MMMMml'];
