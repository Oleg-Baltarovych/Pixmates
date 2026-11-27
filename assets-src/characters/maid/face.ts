// maid face library (plan M-ART MA-27; docs/art/RIG.md §Face library; ART-BIBLE §11). Parts sit on the face anchor
// (head mask col 5, row 12); masks are 20 px wide and symmetric about the face centre (cols 9|10).
// 48-px lessons from the spike: 4×5 anime eye (lash row + iris c → i → I, 2×2 pupil, 1×2 upper and 1-px lower
// highlight, both top-left), arched lash with a 1-px up-flick at the outer corner, calm symmetric soft smile.
// happy: ^^ eyes; closed wide smile on the ground frames, the open D-mouth (dark interior + 2×1 pink tongue) on the
// arms-up frames (`raisedMouth`). think: the eyes glance aside by 1 px with the pupils 1 px up.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });

/** Lash row + 5 iris rows. */
const OPEN: Mask = [
  '.X.XXXX......XXXX.X.',
  '..XPcccx....xPcccX..',
  '..pPXXc......PXXcp..',
  '..piXXi......iXXip..',
  '...IIpI......IIpI...',
  '....kk........kk....',
];
/** Think: pupils 1 px up inside the iris (the whole eye also sits 1 px aside). */
const GLANCE: Mask = [
  '.X.XXXX......XXXX.X.',
  '..XPXXcx....xPXXcX..',
  '..pPXXc......PXXcp..',
  '..picci......iccip..',
  '...IIpI......IIpI...',
  '....kk........kk....',
];
/** Glance (idle_a micro-variation): neutral with the pupils 1 px toward the facing side (screen-right). */
const SIDE: Mask = [
  '.X.XXXX......XXXX.X.',
  '..XPcccx....xPcccX..',
  '..pPcXX......PcXXp..',
  '..picXX......icXXp..',
  '...IIpI......IIpI...',
  '....kk........kk....',
];
/** Right eye squeezed shut (`<`), left eye open. */
const WINCE: Mask = [
  '.X.XXXX.............',
  '..XPcccx.....xX.....',
  '..pPXXc........XX...',
  '..piXXi......xX.....',
  '...IIpI.............',
  '....kk..............',
];

export const MAID_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3),
    /** Worried: the whole eye 1 px lower under raised inner brows. */
    low: part(OPEN, 0, 4),
    /** Think: 1 px aside (toward the chin hand), pupils 1 px up (the fringe leaves no room to lift the eye). */
    glance: part(GLANCE, 1, 3),
    closed: part(['..x....x....x....x..', '...XXXX......XXXX...'], 0, 6),
    half: part(['..XXXXX......XXXXX..', '..piXXi......iXXip..', '...IIpI......IIpI...', '....kk........kk....'], 0, 5),
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
    side: part(SIDE, 0, 3),
  },
  brows: {
    worried: part(['.....xX......Xx.....', '...xX..........Xx...'], 0, 2),
  },
  mouths: {
    smile: part(['........x..x........', '.........XX.........'], 0, 10),
    wide: part(['.......x....x.......', '........XXXX........'], 0, 10),
    /** Open D-mouth (4 × 3): straight top, dark rose interior, 2 × 1 pink tongue centred on the bottom inner row. */
    open_d: part(['........XXXX........', '........XGGX........', '.........TT.........'], 0, 10),
    talk_a: part(['.........XX.........'], 0, 11),
    talk_b: part(['........xXXx........', '.........gg.........'], 0, 11),
    talk_c: part(['.........XX.........', '........XggX........', '.........XX.........'], 0, 10),
    frown: part(['.........XX.........', '........x..x........'], 0, 11),
    flat: part(['..........XXx.......'], 0, 11),
    small_o: part(['.........xx.........', '.........xx.........'], 0, 11),
  },
  cheeks: {
    none: part([], 0, 9),
    soft: part(['..fFFf........fFFf..', '...f.f........f.f...'], 0, 9),
    strong: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'smile', cheeks: 'soft' },
    blink: { eyes: 'closed', mouth: 'smile', cheeks: 'soft' },
    half: { eyes: 'half', mouth: 'talk_a', cheeks: 'soft' },
    talk_a: { eyes: 'open', mouth: 'talk_a', cheeks: 'soft' },
    talk_b: { eyes: 'open', mouth: 'talk_b', cheeks: 'soft' },
    talk_c: { eyes: 'open', mouth: 'talk_c', cheeks: 'soft' },
    happy: { eyes: 'happy', mouth: 'wide', raisedMouth: 'open_d', cheeks: 'soft' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'frown', cheeks: 'none' },
    think: { eyes: 'glance', mouth: 'flat', cheeks: 'soft' },
    sleep: { eyes: 'closed', mouth: 'small_o', cheeks: 'soft' },
    startle: { eyes: 'startle', mouth: 'talk_c', cheeks: 'none' },
    petted: { eyes: 'happy', mouth: 'wide', cheeks: 'strong' },
    wince: { eyes: 'wince', mouth: 'flat', cheeks: 'soft' },
    glance: { eyes: 'side', mouth: 'smile', cheeks: 'soft' },
  },
};

// ── q34 face library (MA-27d; owner D-16 Q-D16-2: `neutral` + `blink` only) ───────────────────────────────────────
// Same 20-px grid on the q34 face anchor (head mask col 7). Near (left) eye = the front eye; the far eye is 1 px
// narrower (one iris column foreshortened) with its inner corner 1 px nearer the profile; its iris rows keep the
// 2-px pupil inside ≥ 3 iris px so `irisShift` (turn f0, eyes lead) moves it cleanly. Mouth 1 px toward the facing (owner, MA-27d: +2 stretched the narrower lower face),
// blush on the near cheek only.
const OPEN_Q34: Mask = [
  '.X.XXXX.......XXX.X.',
  '..XPcccx.....xPccX..',
  '..pPXXc.......PXXc..',
  '..piXXi.......iXXi..',
  '...IIpI.......IIpI..',
  '....kk.........kk...',
];

export const MAID_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 3),
    closed: part(['..x....x.....x...x..', '...XXXX.......XXX...'], 0, 6),
  },
  mouths: {
    smile: part(['.........x..x.......', '..........XX........'], 0, 10),
  },
  cheeks: {
    soft: part(['..fFFf..............', '...f.f..............'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'smile', cheeks: 'soft' },
    blink: { eyes: 'closed', mouth: 'smile', cheeks: 'soft' },
  },
};
