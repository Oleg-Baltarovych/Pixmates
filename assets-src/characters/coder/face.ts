// coder face library — D-20 stern "unimpressed senior dev" (MA-66, docs/art/coder.md §4 + «D-20»; format in
// rig/face.ts). The shared stern kit (rig/faces/stern.ts, ART-BIBLE §11.9) with the coder's own eye: a flat ink lid
// 2 rows thick (square outer tick, no flick) over a 4-col iris so 3 rows show, a 2 × 2 pupil touching the lid, a 1 × 1
// highlight top-left in both eyes, and the signature eye bags (2 px of skin 2 under the outer half, never ink). Grey-
// blue `hair_ash` eyes. Brows (hair 0) through the fringe gaps 1 row higher than the kit (1 skin row above the thick
// lid). Neutral mouth: the kit's flat `XXX` 1 px right of the axis. No blush outside happy / petted (`ff` only).
// Emotions break it: happy = the lid lifts off a full 5-row iris with an extra highlight + a lopsided smile; startle /
// worried = the kit's open eyes; petted / sleep = closed lines.
import type { Mask } from '../../lib/mask.ts';
import type { FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { STERN_FACE, sternFace } from '../../rig/faces/stern.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });
const kitBrow = (id: string): FacePart => {
  const p = STERN_FACE.brows?.[id];
  if (!p) throw new Error(`stern kit has no brows "${id}"`);
  return p;
};

const BAGS = '...ss..........ss...';

/**
 * Stern eye (face rows 4–9, art-director round 1): a hooded 2-row lid, both rows 1 px past the outer corner (flat),
 * the lower row's inner end dropping 1 px onto the iris (`x`, the brow–lid wedge); a dark iris (ash 1 `c`, ash 0
 * `C`) with one 1 × 1 highlight top-left of each iris and no lower highlight; the 2 × 2 pupil touching the lid.
 */
const STERN: Mask = [
  '.XXXXXX......XXXXXX.',
  '..XXXXX......XXXXX..',
  '...KXXx......xXXC...',
  '...cXXc......KXXc...',
  '...CccC......CccC...',
  BAGS,
];
/** Glance (idle_a, think): the irises and pupils 1 px toward screen-right under the same lid and wedge. */
const SIDE: Mask = [
  '.XXXXXX......XXXXXX.',
  '..XXXXX......XXXXX..',
  '...CKXX......xCXX...',
  '...ccXX......KcXX...',
  '...CCcc......CCcc...',
  BAGS,
];
/** Wince: the screen-left eye stern, the screen-right one squeezed shut. */
const WINCE: Mask = [
  '.XXXXXX.............',
  '..XXXXX.......XX....',
  '...KXXx.........XX..',
  '...cXXc.......XX....',
  '...CccC.............',
  BAGS,
];
/** Happy ("huh, it works"): the lid lifts off the iris — 5 rows show, an extra lower highlight. */
const HAPPY: Mask = [
  '.XXXXXX......XXXXXX.',
  '...KXXC......KXXC...',
  '...iXXi......iXXi...',
  '...CKiC......CKiC...',
  '...CkkC......CkkC...',
  '....kk........kk....',
];
/** The eye slot maps `c` to ash 1 (the dark stern iris): kit parts keep their ash-0 rims as `C`. */
const darkRims = (p: FacePart): FacePart => ({ ...p, mask: p.mask.map((r) => r.replaceAll('c', 'C')) });
const kitEye = (id: string): FacePart => {
  const p = STERN_FACE.eyes[id];
  if (!p) throw new Error(`stern kit has no eyes "${id}"`);
  return darkRims(p);
};

export const CODER_FACE = sternFace({
  eyes: {
    stern: part(STERN, 0, 4),
    side: part(SIDE, 0, 4),
    half: part(
      ['.XXXXXX......XXXXXX.', '..XXXXX......XXXXX..', '...cXXx......xXXc...', '...CccC......CccC...', BAGS],
      0,
      5,
    ),
    closed: part(['..XXXXX......XXXXX..', '....................', BAGS], 0, 7),
    /** Petted / sleep: flat closed lines, no bags (relaxed). */
    shut: part(['..XXXXX......XXXXX..'], 0, 7),
    happy: part(HAPPY, 0, 3),
    wince: part(WINCE, 0, 4),
    worried: kitEye('worried'),
    startle: kitEye('startle'),
  },
  brows: {
    set: { ...kitBrow('set'), at: [0, 1] },
    flat: { ...kitBrow('flat'), at: [0, 1] },
    up: { ...kitBrow('up'), at: [0, 1] },
  },
  mouths: {
    /** The kit's open mouths with a rose (blush-slot) interior: the kit's trim `t` would be the amber badge ochre. */
    talk_b: part(['.........XXX........', '.........XfX........'], 0, 11),
    talk_c: part(['.........XX.........', '........XffX........', '.........XX.........'], 0, 10),
    worried: part(['.........XXX........', '.........XfX........', '.........XXX........'], 0, 10),
    /** Lopsided 3-px smile, the screen-right corner up. */
    lopsided: part(['...........X........', '.........XX.........'], 0, 10),
    /** Petted: a small 2-px smile ("fine, whatever"). */
    small_smile: part(['.........XX.........'], 0, 11),
  },
  cheeks: {
    ff: part(['...ff..........ff...'], 0, 9),
  },
  expressions: {
    happy: { eyes: 'happy', brows: 'flat', mouth: 'lopsided', cheeks: 'ff' },
    petted: { eyes: 'shut', brows: 'flat', mouth: 'small_smile', cheeks: 'ff' },
    sleep: { eyes: 'shut', mouth: 'sleep', cheeks: 'none' },
    worried: { eyes: 'worried', brows: 'up', mouth: 'worried', cheeks: 'none' },
    startle: { eyes: 'startle', brows: 'flat', mouth: 'small_o', cheeks: 'none' },
    think: { eyes: 'side', brows: 'set', mouth: 'grim', cheeks: 'none' },
  },
});

/** q34 (neutral + blink): the near eye full, the far eye 1 px narrower; near brow 4 px, far 3 px; mouth toward facing. */
const STERN_Q34: Mask = [
  '.XXXXXX......XXXXX..',
  '..XXXXX......XXXX...',
  '...KXXx......xXC....',
  '...cXXc......KXc....',
  '...CccC......CcC....',
  '...ss.........ss....',
];

export const CODER_FACE_Q34: ViewFaceLibrary = {
  style: 'stern',
  eyes: {
    stern: part(STERN_Q34, 0, 4),
    closed: part(['..XXXXX......XXXX...', '....................', '...ss.........ss....'], 0, 7),
  },
  brows: { set: part(['...JJJ........JJ....', '......J......J......'], 0, 1) },
  mouths: { set: part(['..........XXX.......'], 0, 11) },
  cheeks: { none: part([], 0, 9) },
  expressions: {
    neutral: { eyes: 'stern', brows: 'set', mouth: 'set', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'set', mouth: 'set', cheeks: 'none' },
  },
};
