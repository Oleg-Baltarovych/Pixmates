// knight face library (MA-67 D-22, docs/art/knight.md §4; format in rig/face.ts). Normal chibi boy's face (no stern
// option). Parts sit on the face anchor (head mask col 5, row 12); masks are 20 px wide, eyes mirrored about the face
// centre (cols 9|10) except the highlights (top-left in both eyes).
// Eyes (cloth_emerald, dark top row): a 4 × 5 iris under a lash that droops at the outer corner (brave but
// scared), a 2 × 3 pupil, a cream highlight top-left + a 1-px lower highlight. Neutral: flat determined brows with the
// inner px 1 row lower over the wide eyes, a small pressed mouth, a 1-px nose shadow. Signatures: happy ^^ + open
// grin + light blush; petted ^^ + soft smile + strong blush (blush on these two only); worried inner-up brows + a teary highlight + a wavy mouth; startle
// pinpoint pupils + small o. Visor down (walk, startle, …) hides all of it: the slit glints carry the emotion.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { irisShift } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number, irisRows?: readonly number[]): FacePart =>
  irisRows ? { mask, at: [x, y], irisRows } : { mask, at: [x, y] };

const OPEN: Mask = [
  '....XXXX....XXXX....',
  '..XXCCCC....CCCCXX..',
  '.X.PkXXc....PkXXc.X.',
  '...PkXXi....PkXXi...',
  '...iiXXi....iiXXi...',
  '...ikiii....ikiii...',
];
const WORRIED: Mask = [
  '....XXXX....XXXX....',
  '..XXCCCC....CCCCXX..',
  '.X.PkXXc....PkXXc.X.',
  '...PkXXi....PkXXi...',
  '...iiXXk....iiXXk...',
  '...ikiip....ikiip...',
];
const STARTLE: Mask = [
  '...XXXXX....XXXXX...',
  '..XPCCCC....CCCCPX..',
  '...PkiCc....PkiCc...',
  '...PiXii....PiXii...',
  '...iiiii....iiiii...',
  '....kii......kii....',
];
const THINK: Mask = [
  '....XXXX............',
  '..XXCkXX....XXXXXX..',
  '.X.PCkXX....PCkXXc..',
  '...PiiCi....PiiCi...',
  '...iiiii....iiiii...',
  '...ikiii............',
];
const WINCE: Mask = [
  '....XXXX............',
  '..XXCCCC....Xx......',
  '.X.PkXXc......XX....',
  '...PkXXi....Xx......',
  '...iiXXi............',
  '...ikiii............',
];
/** Nose: one shadow px on the axis's shade side. */
const NOSE = '..........z.........';

export const knightFace: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3),
    low: part(WORRIED, 0, 3),
    think: part(THINK, 0, 3),
    closed: part(['...x........x.......', '....XXXX....XXXX....', '........x......x....'], 0, 6),
    half: part(['..XXXXXX....XXXXXX..', '...PkXXi....PkXXi...', '...ikiii....ikiii...'], 0, 6),
    happy: part(['....XXX......XXX....', '...X...X....X...X...', '..X.....X..X.....X..'], 0, 5),
    startle: part(STARTLE, 0, 2),
    wince: part(WINCE, 0, 3),
    side: part(irisShift(OPEN, 10), 0, 3),
  },
  brows: {
    brave: part(['..ZZ............ZZ..', '....Z..........Z....'], 0, 1),
    worried: part(['....Z..........Z....', '..ZZ............ZZ..'], 0, 1),
    up: part(['..ZZZ..........ZZZ..'], 0, 1),
  },
  mouths: {
    pressed: part([NOSE, '....................', '.........xXx........'], 0, 9),
    open: part([NOSE, '........XXXX........', '........XffX........', '.........XX.........'], 0, 9),
    smile: part([NOSE, '....................', '........x..x........', '.........XX.........'], 0, 9),
    wavy: part([NOSE, '....................', '.........XX.........', '........x..x........'], 0, 9),
    small_o: part([NOSE, '....................', '.........xx.........', '.........xx.........'], 0, 9),
    aside: part([NOSE, '....................', '..........xXx.......'], 0, 9),
    gritted: part([NOSE, '........XXXX........', '........PPPP........', '........XXXX........'], 0, 9),
    talk_a: part([NOSE, '....................', '........xXXx........'], 0, 9),
    talk_b: part([NOSE, '....................', '........xXXx........', '.........ff.........'], 0, 9),
    talk_c: part([NOSE, '.........XX.........', '........XffX........', '.........XX.........'], 0, 9),
  },
  cheeks: {
    none: part([], 0, 10),
    light: part(['.fFf............fFf.'], 0, 10),
    strong: part(['.FFF............FFF.', '.fFf............fFf.'], 0, 10),
  },
  expressions: {
    neutral: { eyes: 'open', brows: 'brave', mouth: 'pressed', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'brave', mouth: 'pressed', cheeks: 'none' },
    half: { eyes: 'half', brows: 'brave', mouth: 'talk_a', cheeks: 'none' },
    talk_a: { eyes: 'open', brows: 'brave', mouth: 'talk_a', cheeks: 'none' },
    talk_b: { eyes: 'open', brows: 'brave', mouth: 'talk_b', cheeks: 'none' },
    talk_c: { eyes: 'open', brows: 'brave', mouth: 'talk_c', cheeks: 'none' },
    happy: { eyes: 'happy', mouth: 'open', cheeks: 'light' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'wavy', cheeks: 'none' },
    think: { eyes: 'think', brows: 'brave', mouth: 'aside', cheeks: 'none' },
    sleep: { eyes: 'closed', mouth: 'small_o', cheeks: 'none' },
    startle: { eyes: 'startle', brows: 'up', mouth: 'small_o', cheeks: 'none' },
    petted: { eyes: 'happy', mouth: 'smile', cheeks: 'strong' },
    wince: { eyes: 'wince', brows: 'worried', mouth: 'gritted', cheeks: 'none' },
    glance: { eyes: 'side', brows: 'brave', mouth: 'pressed', cheeks: 'none' },
  },
};

// ── q34 (neutral + blink; the head's q34 frames are walk / turn, visor down — kept for the validator and turn f0).
const OPEN_Q34: Mask = [
  '....XXXX.....XXX....',
  '..XXCCCC.....CCCX...',
  '.X.PkXXc.....kXXc...',
  '...PkXXi.....kXXi...',
  '...iiXXi.....iXXi...',
  '...ikiii.....kiii...',
];

export const knightFaceQ34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 3),
    closed: part(['...x.........x......', '....XXXX.....XXX....', '........x......x....'], 0, 6),
  },
  brows: {
    brave: part(['..ZZ.............Z..', '....Z.........Z.....'], 0, 1),
  },
  mouths: {
    pressed: part(['...........z........', '....................', '..........xXx.......'], 0, 9),
  },
  cheeks: {
    none: part([], 0, 10),
  },
  expressions: {
    neutral: { eyes: 'open', brows: 'brave', mouth: 'pressed', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'brave', mouth: 'pressed', cheeks: 'none' },
  },
};
