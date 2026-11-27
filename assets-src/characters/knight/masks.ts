// knight masks (MA-67 D-22, variant B picked by the owner 2026-11-27; docs/art/knight.md). Great bascinet: a pointed
// ogive skull, an arched face opening framed by a mail camail that drapes onto the shoulders; a hounskull ("pig-face")
// visor — raised, a solid lit snout tipped up over the brow; lowered, a cone (lit left plane, shaded right plane) with
// two eye slits in a shallow V, a ridge (lit-left / shade-right value split) that starts ≥ 2 rows below the slits (no T,
// no cross) and breaths on the shade side. Camail shaded by rows (lighter top / lit left, darker to the hem and right),
// scalloped hem. Under the plate: mail (camail, a mail hem under the faulds); over it: the emerald sash (baldric + tabard panel).
// Slots: hair = metal_silver (J 0 · j 2 · h 3 · H 4 · y 5 · Y 6), shoe = metal_silver (M 0 · m 2 · b 3 · B 4 · l 5 ·
// L 6), dress = cloth_emerald (V 0 · v 1 · d 2 · D 3 · w 4 · W 5), horn / trim = hair_umber leather (N 1 · n 2 · o 3 ·
// O 4 · u 5 · U 6), apron = cloth_cream (slit glints, P 5 · p 4). Mail = a j/h (m/b) checker. Legend:
// assets-src/lib/mask.ts. Visor masks are in head-mask coordinates (`at` = the head's `at` + offset).
import type { Mask } from '../../lib/mask.ts';
import type { PlacedMask, Visor } from '../../rig/types.ts';

const AT = [-15, -18] as const;
const placed = (mask: Mask, x = 0, y = 0): PlacedMask => ({ mask, at: [AT[0] + x, AT[1] + y] });

export const HEAD: Mask = [
  '..............................',
  '..............................',
  '..............yJ..............',
  '.............jyhJ.............',
  '............jyhhhJ............',
  '...........jyYHhhhJ...........',
  '..........jyYHHHhhhJ..........',
  '.........jyHYHHHHhhhJ.........',
  '........jyHYHHHHHHhhhJ........',
  '.......jyHHHHHHHHHHhhhJ.......',
  '......jyHHHHHHHHHHHHhhhJ......',
  '.....jyHHHHHHHHHHHHHHhhhJ.....',
  '....jyHHHHHHHHHHHHHHHHhhhJ....',
  '...jyHHHHHHHHHHHHHHHHHHhhhJ...',
  '...jyHHHHHHHHHHHHHHHHHHhhhJ...',
  '..jyHHHHHHHHHHHHHHHHHHHHhhhJ..',
  '..jhHHhjjSSSSSSSSSSSSjjhhhhJ..',
  '..jyHhjSSSSSSSSSSSSSSSsjhhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..jyHhSSSSSSSSSSSSSSSSSshhjJ..',
  '..JHhHSSSSSSSSSSSSSSSSSsjhjJ..',
  '..HhHhSSSSSSSSSSSSSSSSSshjhj..',
  'JhHhHhHSSSSSSSSSSSSSSSshjhjhjJ',
  'JHhHhHhHHSSSSSSSSSSSshhjhjhjhJ',
  'jhjhjhjhjhHsssssssshjhjhjhjhjh',
  'JjhjhjhjhjhjhjhjhjhjjJjJjJjJjJ',
  '.JjjJjjJjjJjjJjjJjjJjjJjjJjJJ.',
];
/**
 * q34 (facing right): the camail wraps the near jaw (the face opening narrows from the near side toward the chin) and
 * tucks under the chin, so the facing contour never steps out from the brow down (owner rule: no cheek bump).
 */
export const HEAD_Q34: Mask = [
  '..............................',
  '..............................',
  '.............yJ...............',
  '............jyhJ..............',
  '...........jyhhhJ.............',
  '..........jyYHhhhJ............',
  '.........jyYHHHhhhJ...........',
  '........jyHYHHHHhhhJ..........',
  '.......jyHYHHHHHHHhhhJ........',
  '......jyHHHHHHHHHHHhhhJ.......',
  '.....jyHHHHHHHHHHHHHhhhJ......',
  '....jyHHHHHHHHHHHHHHHhhhJ.....',
  '...jyHHHHHHHHHHHHHHHHHhhhJ....',
  '...jyHHHHHHHHHHHHHHHHHHhhhJ...',
  '..jyHHHHHHHHHHHHHHHHHHHhhhJ...',
  '..jyHHHHHHHHHHHHHHHHHHHHhhhJ..',
  '..jyHHHhhhSSSSSSSSSSSSSSshhJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..jyHHhhSSSSSSSSSSSSSSSSSSsJ..',
  '..JhjhjhjSSSSSSSSSSSSSSSSsJ...',
  '..hjhjhjhjhSSSSSSSSSSSSSsJ....',
  '..JhjhjhjhjhjSSSSSSSSSSSsJ....',
  '.JhjhjhjhjhjhjhSSSSSSSSsJ.....',
  '.JjhjhjhjhjhjhjhjsssssjhJ.....',
  '.JhjhjhjhjhjhjhjhjhjhjhJ......',
  '..JhjhjhjhjhjhjhjhjhjJJ.......',
];

/** Raised (head-mask rows 10–15): a solid lit triangle (tone 5, tone-6 left edge), a tone-2 underside over the brow, one temple rivet per side. */
const UP: Mask = [
  '..............Yyh.............',
  '.............Yyyyh............',
  '............Yyyyyyh...........',
  '...........Yyyyyyyyh..........',
  '..........Yyyyyyyyyyh.........',
  '.....Y...jjjjjjjjjjjjj...Y....',
];
const UP_Q34: Mask = [
  '...............Yyh............',
  '..............Yyyyh...........',
  '.............Yyyyyyh..........',
  '............Yyyyyyyyh.........',
  '...........Yyyyyyyyyyh........',
  '......Y...jjjjjjjjjjjjj...Y...',
];
/**
 * Lowered (head-mask rows 16–30): a pivot seam and a lit lip, two slits in a shallow V (rows 3–4, inner ends 1 px lower,
 * a 6-px gap at the centre), the ridge as a value split from row 7 to the tip, breaths on the shaded right plane.
 */
const DOWN: Mask = [
  '..jyHjjjjjjjjjjjjjjjjjjjhhhJ..',
  '..jyYyyyyyyyHHHHhhhhhhhhhHhJ..',
  '..jyHHHHHHHHHHHhhhhhhhhhhhhJ..',
  '..jyHHJJJHHHHHHhhhhhhJJJhhhJ..',
  '..jyHHHHHJJJHHHhhhJJJhhhhhhJ..',
  '..jyHHHHHHHHHHHhhhhhhhhhhhhJ..',
  '..jyHHHHHHHHHHHhhhhhhhhhhhhJ..',
  '..jyHHHHHHHHHHyhhhJhJhhhhhhJ..',
  '...jyHHHHHHHHHyhhhhhhhhhhhJ...',
  '....jyHHHHHHHHyhhhhJhJhhhJ....',
  '.....jyHHHHHHHyhhhhhhhhhJ.....',
  '......jyHHHHHHyhhhJhJhhJ......',
  '.......jyHHHHHyhhhhhhhJ.......',
  '.........jyHHHyhhhhhJ.........',
  '............jyyhhJ............',
];
/** q34: the ridge off-centre (col 20) from row 7, a long near slit and a short far one, a spec at the snout tip with a tone-2 underplane below. */
const DOWN_Q34: Mask = [
  '........jjjjjjjjjjjjjjjjjhhJ..',
  '.......jYyyyyHHHHHHHhhhhhhhJ..',
  '......hyHHHHHHHHHHHHhhhhhhhJ..',
  '......hyHJJJJHHHHHHHhhhhJJhJ..',
  '......hyHHHHHJJJHHHHhhJJhhhJ..',
  '......hyHHHHHHHHHHHHhhhhhhhJ..',
  '......hyHHHHHHHHHHHHhhhhhhhJ..',
  '......hyHHHHHHHHHHHHyhhJhJhJ..',
  '......hyHHHHHHHHHHHHyhhhhhhJ..',
  '........jyHHHHHHHHHHyhJhJhJ...',
  '..........jyHHHHHHHHyhhhhJ....',
  '............jyHHHHHHyhhJhJ....',
  '..............jyHHHHYhhhJ.....',
  '................jyHHjjjhJ.....',
  '..................jyjjJ.......',
];

/** Slit glints (front from head-mask col 6, rows 19–20; q34 row 20): the eyes behind the slits carry the emotion. */
const SLIT = {
  neutral: ['..................', '....Pp......pP....'],
  startle: ['..P............P..', '...P..........P...'],
  worried: ['.Pp............pP.', '..................'],
  wince: ['..................', '...PPp............'],
} as const;

/** The visor without its per-animation rule (`VISOR_DOWN_IN`, body.ts). */
export const VISOR: Omit<Visor, 'downIn'> = {
  up: placed(UP, 0, 10),
  upQ34: placed(UP_Q34, 0, 10),
  down: placed(DOWN, 0, 16),
  downQ34: placed(DOWN_Q34, 0, 16),
  slit: {
    neutral: placed(SLIT.neutral, 6, 19),
    startle: placed(SLIT.startle, 6, 19),
    worried: placed(SLIT.worried, 6, 19),
    wince: placed(SLIT.wince, 6, 19),
  },
  slitQ34: { neutral: placed(['.......Pp.......pP'], 6, 20) },
};

/**
 * Breastplate (12 × 12 from chest − (6, 0)): plate lit left with a keel, the emerald baldric from the near shoulder to
 * the far hip, a leather belt with a silver buckle, a plate rim under it.
 */
export const CHEST: Mask = [
  'MdDBBLlBBbbM',
  'mBdDBLlBBbbm',
  'mBLdDLlBBBbm',
  'mBlBdDlBBbmm',
  'mbBBBdDBBbmm',
  'mbBBBLdDbbmm',
  'MmbBBlLdDmmM',
  'MMmmbLlbdDMM',
  'gtTTTlLTTdDg',
  'ggtttLltttgg',
  'mbBBBlLBBbbm',
  'MmmmmmmmmmmM',
];
export const CHEST_Q34: Mask = [
  '.dDBBLlBBbbM',
  '.BdDBLlBBbbm',
  '.BLdDLlBBBbm',
  '.BlBdDlBBbmm',
  '.bBBBdDBBbmm',
  '.bBBBLdDbbmm',
  '.mbBBlLdDmmM',
  '.MmmbLlbdDMM',
  '.tTTTlLTTdDg',
  '.gtttLltttgg',
  '.bBBBlLBBbbm',
  '.mmmmmmmmmmM',
];
/** Faulds (from hip − (6, 2)): two plate lames one tone apart (tones 2–5, tone 6 only at each lit-left corner) over a 2-row mail hem; the emerald panel. */
export const FAULDS: Mask = ['Lllbvddvlbbm', 'bBBbvdDvBbbm', 'LBbbvdDvbbbm', 'mbmbvddvmbmb', '.mbmvdwvbmb.'];
export const FAULDS_SEATED: Mask = ['Lllbvddvlbbm', 'bBBbvdDvBbbm', '.mbmvdwvbmb.'];
export const FAULDS_Q34: Mask = ['Llbvddvlbbm', 'bBbvdDvBbbm', 'LBbvdDvbbbm', 'mbmvddvbmbm', '.mbvdwvmbm.'];
/** Small rounded spaulder (the camail covers the shoulder top). */
export const PAULDRON: Mask = ['.......', '.bLlBb.', 'bLlBBbm', 'MmmmmmM', 'bBlBBbm', '.MmmmM.'];

/** Sabatons (front, 5 × 3): a lit toe cap, one lame line, a dark sole. */
export const SHOE: Mask = ['.bBb.', 'LlBbm', 'MmmmM'];
/** Side sabaton (q34, toe forward = screen-right): lame steps down to a pointed lit toe. */
export const SHOE_Q34: Mask = ['bBb..', 'LbBll', 'MmmmM'];

/** Gorget (choker slot, from the neck joint): two plate lames over the neck, lit left. */
export const GORGET: PlacedMask = { mask: ['mlLBBBbm', '.MbBBbM.'], at: [-4, 0] };
export const GORGET_Q34: PlacedMask = { mask: ['mlLBBbm', '.MbBbM.'], at: [-3, 0] };

/**
 * Sword in its scabbard (sash knot on the screen-right hip, 4 × 11 from the hip joint): a 1-px silver pommel, a leather
 * grip with a lit wrap, a 3-px silver crossguard (spec on its left px), the dark leather scabbard, a silver chape.
 */
export const SWORD: Mask = ['.l..', '.u..', 'LBb.', '.nN.', '.oN.', '.oN.', '.oN.', '.oN.', '.oN.', '.lB.', '..b.'];
/** q34: pommel, grip and guard (3 × 3) just ahead of the far hip; the scabbard hides behind the near leg. */
export const SWORD_Q34: Mask = ['.L.', '.u.', 'lBm'];
