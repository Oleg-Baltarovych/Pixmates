// kitsune face library (MA-28, docs/art/kitsune.md §4; format in rig/face.ts). Parts sit on the face anchor (head
// mask col 5, row 12); masks are 20 px wide, the eyes mirrored about the face centre (cols 9|10).
// Violet eyes (hair_lilac, dark top): a 4 × 4 iris under a lash line that slopes up to the outer corner (+1 row) with a
// 1-px flick; a 1 × 3 vertical pupil with round (lighter ink) ends set inward; a 1 × 2 cream highlight top-left and a
// 1-px lower highlight, the highlights on the same side in both eyes. Mouth: a lopsided 3-px smirk, the screen-right
// corner 1 px higher, one cream fang px directly under it touching the line (q34: the facing side). Brows only on
// worried (inner ends up) and think (smug). Signatures: happy ^^ + wide grin + fang; petted strong blush + wavy 5-px
// mouth; think far-eye half-lid + smug brow + smirk; startle >< + open square mouth; wince one eye shut + gritted teeth.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { irisShift } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number, irisRows?: readonly number[]): FacePart =>
  irisRows ? { mask, at: [x, y], irisRows } : { mask, at: [x, y] };

/** Rows of the open eye whose iris + 1-px pupil move on a glance / eyes-lead frame (below the lash). */
const IRIS_ROWS = [3, 4, 5] as const;

/** Flick, sloping lash (outer end 1 row higher), 4 × 4 iris with the pupil set inward. */
/** Arched lid (centre 2 px 1 row up, outer flick kept) over a full 4 × 4 iris, its top row the darkest iris tone. */
const OPEN: Mask = [
  '.X..XX........XX..X.',
  '..XX..Xx....xX..XX..',
  '...PCCC......PCCC...',
  '...PixC......PxiC...',
  '...iiXi......iXii...',
  '...kpxk......kxkp...',
];
/** Think: the near (screen-left) eye open under the smug brow, the far eye half-lidded. */
const THINK: Mask = [
  '.X..XX..............',
  '..XX..Xx............',
  '...PCCC......XXXXX..',
  '...PixC......PxiC...',
  '...iiXi......iXii...',
  '...kpxk......kxkp...',
];
/** Wince: the screen-right eye squeezed shut (`<`), the other open. */
const WINCE: Mask = [
  '.X..XX..............',
  '..XX..Xx............',
  '...PCCC......xX.....',
  '...PixC........XX...',
  '...iiXi......xX.....',
  '...kpxk.............',
];

export const KITSUNE_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3, IRIS_ROWS),
    /** Worried: the whole eye 1 px lower under the raised inner brows. */
    low: part(OPEN, 0, 4, IRIS_ROWS),
    think: part(THINK, 0, 3),
    closed: part(['..x....x....x....x..', '...XXXX......XXXX...'], 0, 6),
    half: part(['..XXXXX......XXXXX..', '...iiXi......iXii...', '...kpxk......kxkp...'], 0, 6),
    happy: part(['....X..........X....', '...X.X........X.X...', '..X...X......X...X..'], 0, 4),
    startle: part(
      [
        '...X............X...',
        '....XX........XX....',
        '......X......X......',
        '....XX........XX....',
        '...X............X...',
      ],
      0,
      4,
    ),
    wince: part(WINCE, 0, 3),
    /** Glance: neutral with the iris + pupil 1 px toward screen-right (lash, outline and shine stay). */
    side: part(irisShift(OPEN, 10, IRIS_ROWS), 0, 3),
  },
  brows: {
    worried: part(['.....xX......Xx.....', '...xX..........Xx...'], 0, 1),
    /** Smug: a 2-px brow raised over the open near eye. */
    smug: part(['..Xx................'], 0, 2),
  },
  mouths: {
    /** Lopsided 3-px smirk, the screen-right corner 1 px higher; the fang (cream) under it touches the line. */
    smirk: part(['...........X........', '.........XXP........'], 0, 10),
    /** Wide grin with the fang under the top line. */
    grin: part(['.......XXXXXX.......', '........XFFPX.......'], 0, 10),
    /** Open (raised arms): a square mouth with the fang on its top line. */
    open_fang: part(['........XXXX........', '........XxPX........', '........XXXX........'], 0, 10),
    /** Startle: open square mouth, no fang. */
    square: part(['........XXXX........', '........XxxX........', '........XXXX........'], 0, 10),
    talk_a: part(['.........XXx........'], 0, 11),
    talk_b: part(['........xXXx........', '..........P.........'], 0, 11),
    talk_c: part(['.........XX.........', '........XxPX........', '.........XX.........'], 0, 10),
    frown: part(['.........XX.........', '........x..x........'], 0, 11),
    /** Petted: flustered wavy 5-px mouth. */
    wavy: part(['........X.X.........', '.......X.X.X........'], 0, 10),
    /** Wince: gritted teeth between two lines. */
    gritted: part(['........XXXX........', '........PPPP........', '........XXXX........'], 0, 10),
    small_o: part(['.........xx.........', '.........xx.........'], 0, 11),
  },
  cheeks: {
    none: part([], 0, 9),
    soft: part(['..fFFf........fFFf..', '...f.f........f.f...'], 0, 9),
    /** Neutral family (art round MA-28-1): 1 light px per cheek. */
    light: part(['...f..........f.....'], 0, 9),
    strong: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'smirk', cheeks: 'light' },
    blink: { eyes: 'closed', mouth: 'smirk', cheeks: 'light' },
    half: { eyes: 'half', mouth: 'talk_a', cheeks: 'light' },
    talk_a: { eyes: 'open', mouth: 'talk_a', cheeks: 'light' },
    talk_b: { eyes: 'open', mouth: 'talk_b', cheeks: 'light' },
    talk_c: { eyes: 'open', mouth: 'talk_c', cheeks: 'light' },
    happy: { eyes: 'happy', mouth: 'grin', raisedMouth: 'open_fang', cheeks: 'soft' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'frown', cheeks: 'none' },
    think: { eyes: 'think', brows: 'smug', mouth: 'smirk', cheeks: 'soft' },
    sleep: { eyes: 'closed', mouth: 'small_o', cheeks: 'soft' },
    startle: { eyes: 'startle', mouth: 'square', cheeks: 'none' },
    petted: { eyes: 'happy', mouth: 'wavy', cheeks: 'strong' },
    wince: { eyes: 'wince', mouth: 'gritted', cheeks: 'soft' },
    glance: { eyes: 'side', mouth: 'smirk', cheeks: 'light' },
  },
};

// ── q34 (neutral + blink): near (left) eye = the front eye, the far eye 1 px narrower (one iris column
// foreshortened, inner corner 1 px nearer the profile); smirk + fang 1 px toward the facing; blush on the near cheek.
const OPEN_Q34: Mask = [
  '.X..XX........XX..X.',
  '..XX..Xx.....x..XX..',
  '...PCCC.......PCC...',
  '...PixC.......PxC...',
  '...iiXi.......iXi...',
  '...kpxk.......kxk...',
];

export const KITSUNE_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 3, IRIS_ROWS),
    closed: part(['..x....x.....x...x..', '...XXXX.......XXX...'], 0, 6),
  },
  mouths: {
    smirk: part(['............X.......', '..........XXP.......'], 0, 10),
  },
  cheeks: {
    light: part(['...f................'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'smirk', cheeks: 'light' },
    blink: { eyes: 'closed', mouth: 'smirk', cheeks: 'light' },
  },
};
