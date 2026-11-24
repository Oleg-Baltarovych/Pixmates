// witch face library (MA-29a, docs/art/witch.md §4; format in rig/face.ts). Parts sit on the face anchor (head mask
// col 5, row 12); masks are 20 px wide, the lash shape mirrored about the face centre (cols 9|10), highlights on the
// same (top-left) side in both eyes. Leaf-green eyes (moss ramp: c 1 → i 3 → I 4 → k 5), big and round with a
// downturned outer corner (tare-me, unsure): the lash runs over the iris, its outer corner 1 row lower than the inner
// end with a 1-px horizontal outer tick (per-character exception to ART-BIBLE §11.2's up-out flick); iris 4 × 5 fully
// visible, 2 × 2 pupil, 1 × 2 highlight + 1-px lower highlight, outer sclera sliver. Neutral = a tiny uncertain pout.
// Signatures: happy ("it worked!") ^^ + big open smile with a rose tongue; petted soft closed arcs + strong blush +
// small wobbly smile; think glance up-aside + lips pressed to one side; startle O_O with 1-px pupils + small o;
// worried (home emotion) inner lash ends raised + 2-px wet lower shine + wavy mouth; wince one eye shut + gritted.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { irisShift } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });

/**
 * Arched lash (art round 1): the middle 3 px on the top row, both ends 1 row lower, the outer corner a further row
 * down with its 1-px horizontal tick (tare-me); the top iris row moss 2 with moss 1 under the lash centre; a cream
 * sclera px at the inner top corner and an outer sliver; 1 × 2 highlight top-left, 2 × 2 pupil, 1-px lower highlight.
 */
const OPEN: Mask = [
  '....XXX......XXX....',
  '...XCCcX....XcCCX...',
  '.XXPccip....pPcciXX.',
  '..pPXXi......PXXip..',
  '...iXXI......iXXI...',
  '....kp........kp....',
];
/** Rows of `OPEN` the glance moves (pupil + iris below the lash corner). */
const OPEN_IRIS_ROWS = [3, 4, 5] as const;
/** Think: the iris up 1 row and aside (screen-right): the pupil touches the lash, one sclera row under the iris. */
const THINK: Mask = [
  '....XXX......XXX....',
  '...XcXXX....XccXX...',
  '.XXPiXXp....pPiXXXX.',
  '..piIIk......iIIkp..',
  '...kkkp......kkkp...',
  '....pp........pp....',
];
/** Worried: the inner lash ends 2 rows higher, a 2-px wet lower shine 1 row above the lower lid. */
const WORRIED: Mask = [
  '.......X....X.......',
  '....XXX......XXX....',
  '...XCCcp....pcCCX...',
  '.XXPccip....pPcciXX.',
  '..pPXXi......PXXip..',
  '...ippI......ippI...',
  '....kk........kk....',
];
/** Startle (O_O): the lash lifted 1 row, round eyes ringed in sclera, 1-px pupils. */
const STARTLE: Mask = [
  '...XXXX......XXXX...',
  '..XpccpX....XpccpX..',
  '..pPicip....pPicip..',
  '..pciXip....pciXip..',
  '..pikkip....pikkip..',
  '...pkkp......pkkp...',
];
/** Wince: the screen-right eye squeezed shut (`<`), the other open. */
const WINCE: Mask = [
  '....XXX.............',
  '...XCCcX.....xX.....',
  '.XXPccip.......XX...',
  '..pPXXi......xX.....',
  '...iXXI.............',
  '....kp..............',
];

export const WITCH_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3),
    think: part(THINK, 0, 3),
    low: part(WORRIED, 0, 2),
    startle: part(STARTLE, 0, 2),
    closed: part(['..xXXXXX....XXXXXx..', '.x................x.'], 0, 7),
    half: part(['..XXXXXX....XXXXXX..', '...iXXI......iXXI...', '....kp........kp....'], 0, 6),
    /** ^^ arcs (it worked!). */
    happy: part(['...xXXx......xXXx...', '..X....X....X....X..'], 0, 5),
    /** Petted: soft closed arcs bowing down. */
    content: part(['..x....x....x....x..', '...XXXX......XXXX...'], 0, 5),
    wince: part(WINCE, 0, 3),
    /** Glance: neutral with iris + pupil 1 px toward screen-right (lash, outline and shine stay). */
    side: { ...part(irisShift(OPEN, 10, OPEN_IRIS_ROWS), 0, 3), irisRows: OPEN_IRIS_ROWS },
  },
  brows: {
    /** Worried: connected `/  \` slashes through the fringe gaps: a hair-0 outer end, the ink inner end 1 row up. */
    worried: part(['....X....X..........', '...J......J.........'], 0, 0),
  },
  mouths: {
    /** Unsure pout: 2-px `XX` 1 px left of the axis + a low corner in skin shade 1 one row down on screen-left. */
    pout: part(['........XX..........', '.......z............'], 0, 10),
    /** Big open smile: an ink top line with soft corners over a rose tongue (never a v). */
    smile_big: part(['.......xXXXXx.......', '........XffX........'], 0, 10),
    /** Petted: a small wobbly 4-px smile (corners up, centre down). */
    wobbly: part(['........x..x........', '.........XX.........'], 0, 10),
    /** Think: lips pressed toward the glance side (screen-right). */
    pressed: part(['...........XXx......'], 0, 11),
    /** Worried: a 4-px wavy line (zigzag over two rows, never a v). */
    wavy: part(['........X.X.........', '.........X.X........'], 0, 10),
    small_o: part(['.........XX.........', '.........XX.........'], 0, 10),
    talk_a: part(['........XX..........'], 0, 11),
    talk_b: part(['........XXX.........'], 0, 11),
    talk_c: part(['........XXX.........', '.........X..........'], 0, 10),
    sleep: part(['.........x..........'], 0, 11),
    gritted: part(['........XXXX........', '........PPPP........', '........XXXX........'], 0, 10),
  },
  cheeks: {
    none: part([], 0, 9),
    soft: part(['..fFFf........fFFf..', '...f.f........f.f...'], 0, 9),
    strong: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'pout', cheeks: 'soft' },
    blink: { eyes: 'closed', mouth: 'pout', cheeks: 'soft' },
    half: { eyes: 'half', mouth: 'talk_a', cheeks: 'soft' },
    talk_a: { eyes: 'open', mouth: 'talk_a', cheeks: 'soft' },
    talk_b: { eyes: 'open', mouth: 'talk_b', cheeks: 'soft' },
    talk_c: { eyes: 'open', mouth: 'talk_c', cheeks: 'soft' },
    happy: { eyes: 'happy', mouth: 'smile_big', cheeks: 'strong' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'wavy', cheeks: 'soft' },
    think: { eyes: 'think', mouth: 'pressed', cheeks: 'soft' },
    sleep: { eyes: 'closed', mouth: 'sleep', cheeks: 'soft' },
    startle: { eyes: 'startle', mouth: 'small_o', cheeks: 'none' },
    petted: { eyes: 'content', mouth: 'wobbly', cheeks: 'strong' },
    wince: { eyes: 'wince', mouth: 'gritted', cheeks: 'soft' },
    glance: { eyes: 'side', mouth: 'pout', cheeks: 'soft' },
  },
};

// ── q34 (neutral + blink): near (screen-left) eye = the front eye, the far eye 1 px narrower; the pout 2 px toward
// the facing with its low skin-shade corner screen-left of the `XX` (art round 2); blush on the near cheek.
const OPEN_Q34: Mask = [
  '....XXX......XX.....',
  '...XCCcX....XcCX....',
  '.XXPccip....pPciXX..',
  '..pPXXi......PXXp...',
  '...iXXI......iXX....',
  '....kp........kp....',
];

export const WITCH_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 3),
    closed: part(['..xXXXXX.....XXXXx..', '.x................x.'], 0, 7),
  },
  mouths: {
    pout: part(['..........XX........', '.........z..........'], 0, 10),
  },
  cheeks: {
    soft: part(['..fFFf..............', '...f.f..............'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'pout', cheeks: 'soft' },
    blink: { eyes: 'closed', mouth: 'pout', cheeks: 'soft' },
  },
};
