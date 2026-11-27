// vampire face library (MA-68, docs/art/vampire.md §4). Normal face on the 20-px grid (face anchor = head mask
// col 5 / q34 col 7, row 12). Crimson 4 × 5 iris, a straight flat lash with a sharp inner corner (no flick), round
// 2 × 2 pupil, cream highlight top-left, a single fx_red-3 lower highlight inside the iris (no red row under it: a
// red px on the skin reads bloodshot); brows always visible, flat, the screen-right one 2 rows higher with a 1-px arch
// (the raised theatrical brow); a closed 4-px mouth line with a symmetric pair of 1-px cream fangs under it; no blush in neutral.
// Open mouths use ink (never the trim slot, which is the accent ramp here).
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });

const OPEN: Mask = [
  '..XXXXX......XXXXX..',
  '..XPcccx....xPcccX..',
  '..pPXXc......PXXcp..',
  '..piXXi......iXXip..',
  '...iiIi......iiIi...',
];
const GLANCE: Mask = [
  '..XXXXX......XXXXX..',
  '..XPXXcx....xPXXcX..',
  '..pPXXc......PXXcp..',
  '..picci......iccip..',
  '...iiIi......iiIi...',
];
const SIDE: Mask = [
  '..XXXXX......XXXXX..',
  '..XPcccx....xPcccX..',
  '..pPcXX......PcXXp..',
  '..picXX......icXXp..',
  '...iiIi......iiIi...',
];
const WINCE: Mask = [
  '..XXXXX.............',
  '..XPcccx.....xX.....',
  '..pPXXc........XX...',
  '..piXXi......xX.....',
  '...iiIi.............',
];

/**
 * Single raised brow, composed: the screen-left brow flat (3 px, the inner end 1 row lower over 1 px); the screen-right
 * brow 2 rows higher with a 1-px arch at its centre (the theatrical signature). Placed 1 row over the face anchor.
 */
const BROWS: Mask = ['..............xx....', '.............x..x...', '..xxx...............', '.....x..............'];
/** Happy keeps its round-1 brows (owner: the happy frame stays as it is). */
const BROWS_HAPPY: Mask = ['..............xx....', '...xx........x......', '.....x..............'];
/** Worried: inner ends up. */
const BROWS_WORRIED: Mask = ['.....x........x.....', '...xx..........xx...', '....................'];
/** Hiss / wince: brows angled in. */
const BROWS_IN: Mask = ['...xx..........xx...', '.....x........x.....', '....................'];

/** Closed composed line + paired fangs (x 22 and 25 on the frame axis). */
const MOUTH_FANGS: Mask = ['........XXXX........', '........p..p........'];

export const VAMPIRE_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3),
    low: part(OPEN, 0, 4),
    glance: part(GLANCE, 1, 3),
    closed: part(['..XXXXX......XXXXX..', '.......x....x.......'], 0, 6),
    half: part(['..XXXXX......XXXXX..', '..piXXi......iXXip..', '...iiIi......iiIi...'], 0, 5),
    /** Happy: closed flat lines, inner corner kept (no ^^ arch). */
    happy: part(['..XXXXX......XXXXX..', '.......x....x.......'], 0, 5),
    startle: part(
      [
        '..XXXXX......XXXXX..',
        '.pPcccp......pPcccp.',
        '.pcciip......pcciip.',
        '.pciXip......pciXip.',
        '..pIIp........pIIp..',
      ],
      0,
      2,
    ),
    wince: part(WINCE, 0, 3),
    side: part(SIDE, 0, 3),
  },
  brows: {
    neutral: part(BROWS, 0, -1),
    happy: part(BROWS_HAPPY, 0, 0),
    worried: part(BROWS_WORRIED, 0, 1),
    angry: part(BROWS_IN, 0, 1),
  },
  mouths: {
    fangs: part(MOUTH_FANGS, 0, 10),
    /** Open smile with both fangs (dark ink interior, a 2-px rose tongue). */
    open_fangs: part(['.......xXXXXx.......', '........pxxp........', '.........ff.........'], 0, 10),
    talk_a: part(['........xXXx........', '........p..p........'], 0, 10),
    talk_b: part(['........XXXX........', '........pxxp........'], 0, 10),
    talk_c: part(['........XXXX........', '........pxxp........', '.........XX.........'], 0, 10),
    frown: part(['.........XX.........', '........x..x........'], 0, 11),
    flat: part(['.........XXx........', '.........p..........'], 0, 10),
    small_o: part(['.........xx.........', '.........xx.........'], 0, 11),
  },
  cheeks: {
    none: part([], 0, 9),
    soft: part(['..fFFf........fFFf..'], 0, 9),
    strong: part(['.FFFF..........FFFF.', '.fFFf..........fFFf.'], 0, 10),
  },
  expressions: {
    neutral: { eyes: 'open', brows: 'neutral', mouth: 'fangs', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'neutral', mouth: 'fangs', cheeks: 'none' },
    half: { eyes: 'half', brows: 'neutral', mouth: 'talk_a', cheeks: 'none' },
    talk_a: { eyes: 'open', brows: 'neutral', mouth: 'talk_a', cheeks: 'none' },
    talk_b: { eyes: 'open', brows: 'neutral', mouth: 'talk_b', cheeks: 'none' },
    talk_c: { eyes: 'open', brows: 'neutral', mouth: 'talk_c', cheeks: 'none' },
    happy: { eyes: 'happy', brows: 'happy', mouth: 'open_fangs', cheeks: 'soft' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'frown', cheeks: 'none' },
    think: { eyes: 'glance', brows: 'neutral', mouth: 'flat', cheeks: 'none' },
    sleep: { eyes: 'closed', brows: 'neutral', mouth: 'small_o', cheeks: 'none' },
    startle: { eyes: 'startle', brows: 'neutral', mouth: 'small_o', cheeks: 'none' },
    petted: { eyes: 'side', brows: 'worried', mouth: 'fangs', cheeks: 'strong' },
    wince: { eyes: 'wince', brows: 'angry', mouth: 'talk_b', cheeks: 'none' },
    glance: { eyes: 'side', brows: 'neutral', mouth: 'fangs', cheeks: 'none' },
  },
};

const OPEN_Q34: Mask = [
  '..XXXXX.......XXXX..',
  '..XPcccx.....xPccX..',
  '..pPXXc.......PXXc..',
  '..piXXi.......iXXi..',
  '...iiIi.......iiIi..',
];

export const VAMPIRE_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 3),
    closed: part(['..XXXXX.......XXXX..', '.......x.....x......'], 0, 6),
  },
  brows: {
    neutral: part(
      ['..............xx....', '.............x..x...', '..xxx...............', '.....x..............'],
      0,
      -1,
    ),
  },
  mouths: { fangs: part(['.........XXXX.......', '.........p..........'], 0, 10) },
  cheeks: { none: part([], 0, 9) },
  expressions: {
    neutral: { eyes: 'open', brows: 'neutral', mouth: 'fangs', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'neutral', mouth: 'fangs', cheeks: 'none' },
  },
};
