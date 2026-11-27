// vampire (pixmates.vampire) authored masks (MA-68, docs/art/vampire.md §1 + «As built»). Legend: assets-src/lib/mask.ts.
// Hair `hair_black` slicked straight back from a high open forehead with a widow's peak (owner D-23): the hairline
// recedes at both temples and dips to a 2-px V on the face axis, fine j strand lines sweep back, 3 angel-ring
// segments on the skull arc (lit top-left), 2-px sideburns ending at the eye-bottom row, no ears, no procedural back
// mass (it read as a bob). Collar letters: dress = midnight (5 = the lit outer face on the rim and outside, 1 = the
// shadow where the wing meets the shoulder; never the sleeve's 2–4, so a sleeve over a wing keeps its value step),
// horn = the old-gold inner face; apron = cream shirt / ascot.
import type { Mask } from '../../lib/mask.ts';

/** Last head row the forehead hair-shadow band may use. */
export const BAND = 11;

// ── head (30 × 26, top-left at head joint − (15, 14); face anchor at mask (5, 12) front, (7, 12) q34) ────────────
/** Combed-back crown (rows 0–8): strands run up from the hairline; the angel ring is 3 short segments (2–3 px, 1-px breaks) on the skull arc. */
const CROWN: Mask = [
  '..............................',
  '..............................',
  '..............................',
  '...........jHHHHhhj...........',
  '.........jHHHHjyHhhj..........',
  '.......jHHHYyjHHyHHjhj........',
  '......jHHHyHjHHHHHjHhhhj......',
  '.....jHYyHHHjHHHHHjHHhhhj.....',
  '....jHyHHHHjHHHHHjHhHhhhhj....',
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
 * q34: the crown 1 px toward the back; the back contour tapers in 1 px per row from the ear row (2 j strands sweep
 * back and down through it) to a 1-px nape flick at jaw − 1; the V sits on the q34 face
 * axis (cols 16–17); the facing contour holds col 25 from the temple to the mouth, then steps in 1 px per row to a
 * 1-px chin ahead of the face centre (owner q34 rules: monotonic, no cheek bump). Facing cheek edge (col 25): `s` from
 * the temple to the iris middle, so the rig's +2 rim light lands on skin 5; `S` (rim skin 6) only on the 2 cheekbone
 * rows at the eye bottom (owner MA-33: the full skin-6 column read as a white stripe on walk).
 */
export const HEAD_Q34: Mask = [
  ...CROWN.map((r) => r.slice(1) + '.'),
  '..jHjHh' + 'sSSSS' + 'jHHjHhjhHj' + 'SSs' + 'hj' + '...',
  '..HjHj' + 'SSSSSSSS' + 'jHjhhj' + 'SSSSS' + 'hj' + '...',
  '..jHHj' + 'SSSSSSSSSS' + 'jj' + 'SSSSSSSS' + '....',
  '..HHjj' + 'SSSSSSSSSSSSSSSSSSSs' + '....',
  '..HjH' + 'SSSSSSSSSSSSSSSSSSSSs' + '....',
  '..jHh' + 'SSSSSSSSSSSSSSSSSSSSs' + '....',
  '...Hh' + 'SSSSSSSSSSSSSSSSSSSSs' + '....',
  '....h' + 'SSSSSSSSSSSSSSSSSSSSs' + '....',
  '....h' + 'SSSSSSSSSSSSSSSSSSSSs' + '....',
  '....h' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
  '...jh' + 'SSSSSSSSSSSSSSSSSSSSS' + '....',
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
 * The fan collar (owner pick: variant C's 9-row wings): two stiff wings flaring out from the neck base. The lit
 * midnight-5 outer face runs as a 1-px stepped rim rising to the tip, 1 row over the old-gold inner face (a stepped
 * wedge, 2 px wide at the top, 1 px at the neck); 1 px of midnight 1 where the wing meets the shoulder. R-V2 (`COLLAR_MAX`) fixes the span: 25 px (tips at x 12 / 36 at rest, inside 11–37 on the
 * idle_b sway) with the top 1 row over A's (the head bob of walk / happy / sleep would put a higher tip at eye level).
 */
export const COLLAR: Mask = sym([
  'W...........',
  'WW..........',
  'WuW.........',
  'WuuW........',
  'WWuuW.......',
  '.WWuOW......',
  '..WWWuW.....',
  '...vWWuW....',
  '....vWWuWv..',
]);
export const COLLAR_Q34: Mask = q34Of(COLLAR, 4);
export const COLLAR_AT = [-12, -1] as const;

// ── chest (`torsoMask`, 12 × 12 from the neck joint − (6, 0)) ────────────────────────────────────────────────────
/** Cream shirt V, 2-tier ascot with the moonstone brooch, midnight-4 waistcoat with a tonal 4/5 checker
 * brocade (off the outline, folds and gold) and a 2-button gold column. */
export const CHEST: Mask = [
  'vwWapPPpawWv',
  'vwwWpPPpWwwv',
  'vwwwaPPawwwv',
  'vwwwwuOwwwwv',
  'vwdwwOPwWdwv',
  'vwdWwapWwdwv',
  'vwdwWwuwWdwv',
  'vwdWwWdWwdwv',
  'vwdwWwuwWdwv',
  'vvwWwwdwwwwv',
  'vvvwwvdvwwvv',
  'vvvvvdvdvvvv',
];
export const CHEST_Q34: Mask = [
  'vwWapPPpawWv',
  'vwwWpPPpWwwv',
  '.vwwaPPawwwv',
  '..vwwuOwwwwv',
  '..vwwOPwWdwv',
  '...vwapWwdwv',
  '...vwwuwWdwv',
  '...vwWdWwdwv',
  '...vwwuwWdwv',
  '...vwwdwwwwv',
  '...vvvdvwwvv',
  '...vvdvdvvvv',
];

/** Pointed dress shoe: midnight, 1-px lit toe, 1-px gold buckle. */
export const SHOE: Mask = ['.bu.', 'mbbm', 'mMLm'];
export const SHOE_Q34: Mask = ['.ub..', 'mbbbL', 'MMMMml'];
