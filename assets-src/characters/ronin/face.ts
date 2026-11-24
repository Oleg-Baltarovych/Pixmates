// ronin face library (MA-29b, docs/art/ronin.md §4; format in rig/face.ts). Parts sit on the face anchor (head mask
// col 5, row 12); masks are 20 px wide, the eyes mirrored about the face centre (cols 9|10) except the shine, which is
// top-left in both eyes. Jade eyes, calm gentle tareme: a thin 1-px lash straight across whose outer end dips 1 row
// (never an up-flick), a full 4 × 4 iris (darkest row on top), a 2 × 2 jade-0 pupil (pale, luminous — not ink), a
// 1 × 2 cream highlight top-left, a 1-px jade-5 lower highlight (the "spirit" glow) and an outer cream sclera sliver.
// Neutral = composed closed mouth (2-px ink on the axis + a skin-2 softener each side), one blush px per cheek, brows
// hidden. Signatures: happy serene closed flat lines with drooped outer ends + 3-px smile + `fFFf`; petted slow-closed
// eyes, tiny smile, full blush; think both eyes closed (meditation), flat mouth; startle lash lifted 1 row, 1 × 1
// pupils, sclera both sides, small `o`; worried 2-px brows inner ends up (only here), wavy mouth.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { irisShift } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number, irisRows?: readonly number[]): FacePart =>
  irisRows ? { mask, at: [x, y], irisRows } : { mask, at: [x, y] };

/** Rows of the open eye whose iris + pupil move on a glance / eyes-lead frame (the lash-dip row stays). */
const IRIS_ROWS = [2, 3] as const;

/** Open: lash row 0 (outer end 1 row down on row 1), iris rows 1–4. */
const OPEN: Mask = [
  '...XXXXX....XXXXX...',
  '..XPccc......PcccX..',
  '..pPCCi......PCCip..',
  '..piCCI......iCCIp..',
  '...IkKI......IkKI...',
];
/** Startle: the lash lifted 1 row (placed 1 row higher), 1 × 1 pupils, sclera both sides of the iris. */
const STARTLE: Mask = [
  '...XXXXX....XXXXX...',
  '..pPcccp....pPcccp..',
  '..pPiCip....pPiCip..',
  '..piiiIp....piiiIp..',
  '...IkKI......IkKI...',
];
/** Wince: the screen-right eye squeezed shut (`<`), the other open. */
const WINCE: Mask = [
  '...XXXXX............',
  '..XPccc.....XXx.....',
  '..pPCCi.......XX....',
  '..piCCI.....XXx.....',
  '...IkKI.............',
];
/** Closed (blink, sleep, think, petted): the lash line with its drooped outer ends. */
const CLOSED: Mask = ['...XXXXX....XXXXX...', '..x..............x..'];

export const RONIN_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3, IRIS_ROWS),
    /** Worried: the whole eye 1 px lower under the raised inner brows. */
    low: part(OPEN, 0, 4, IRIS_ROWS),
    closed: part(CLOSED, 0, 5),
    half: part(['...XXXXX....XXXXX...', '..XiCCi......iCCiX..', '...IkKI......IkKI...'], 0, 5),
    /** Happy: serene closed flat lines, outer ends drooped (not ^^, not arcs). */
    serene: part(['...XXXX......XXXX...', '..X..............X..'], 0, 5),
    startle: part(STARTLE, 0, 2),
    wince: part(WINCE, 0, 3),
    /** Glance: neutral with the iris + pupil 1 px toward screen-right (lash, dip, outline and shine stay). */
    side: part(irisShift(OPEN, 10, IRIS_ROWS), 0, 3, IRIS_ROWS),
  },
  brows: {
    /** Worried: 2-px brows, inner ends up (the only expression with brows). */
    worried: part(['......X......X......', '.....x........x.....'], 0, 1),
  },
  mouths: {
    /** Composed closed mouth: 2-px ink on the axis, a skin-2 softener each side. */
    calm: part(['........sXXs........'], 0, 10),
    /** Small 3-px smile (corners up in light ink). */
    smile: part(['........x..x........', '.........XX.........'], 0, 10),
    /** Tiny smile (petted). */
    tiny: part(['........x..x........', '.........xx.........'], 0, 10),
    flat: part(['........xXXx........'], 0, 10),
    talk_a: part(['.........XX.........', '.........xx.........'], 0, 10),
    talk_b: part(['........xXXx........', '.........XX.........'], 0, 10),
    talk_c: part(['........XXXX........', '........XxxX........', '.........XX.........'], 0, 10),
    /** Worried: a wavy 4-px line. */
    wavy: part(['........x.x.........', '.........X.X........'], 0, 10),
    /** Startle: a small `o`. */
    small_o: part(['.........XX.........', '.........XX.........'], 0, 10),
    sleepy: part(['.........xx.........'], 0, 10),
    /** Wince: gritted teeth. */
    gritted: part(['........XPPX........', '.........XX.........'], 0, 10),
  },
  cheeks: {
    none: part([], 0, 9),
    /** Neutral family: 1 light px per cheek. */
    light: part(['...f............f...'], 0, 9),
    soft: part(['..fFFf........fFFf..'], 0, 9),
    strong: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'calm', cheeks: 'light' },
    blink: { eyes: 'closed', mouth: 'calm', cheeks: 'light' },
    half: { eyes: 'half', mouth: 'calm', cheeks: 'light' },
    talk_a: { eyes: 'open', mouth: 'talk_a', cheeks: 'light' },
    talk_b: { eyes: 'open', mouth: 'talk_b', cheeks: 'light' },
    talk_c: { eyes: 'open', mouth: 'talk_c', cheeks: 'light' },
    happy: { eyes: 'serene', mouth: 'smile', cheeks: 'soft' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'wavy', cheeks: 'none' },
    think: { eyes: 'closed', mouth: 'flat', cheeks: 'light' },
    sleep: { eyes: 'closed', mouth: 'sleepy', cheeks: 'light' },
    startle: { eyes: 'startle', mouth: 'small_o', cheeks: 'none' },
    petted: { eyes: 'closed', mouth: 'tiny', cheeks: 'strong' },
    wince: { eyes: 'wince', mouth: 'gritted', cheeks: 'soft' },
    glance: { eyes: 'side', mouth: 'calm', cheeks: 'light' },
  },
};

// ── q34 (neutral + blink): near (left) eye = the front eye, the far eye 1 px narrower (3-px iris, no outer sclera);
// mouth 1 px toward the facing; blush on the near cheek.
const OPEN_Q34: Mask = [
  '...XXXXX....XXXX....',
  '..XPccc......PccX...',
  '..pPCCi......PCC....',
  '..piCCI......iCC....',
  '...IkKI......IkK....',
];

export const RONIN_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 3, IRIS_ROWS),
    closed: part(['...XXXXX....XXXX....', '..x.............x...'], 0, 5),
  },
  mouths: {
    calm: part(['.........sXXs.......'], 0, 10),
  },
  cheeks: {
    light: part(['...f................'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'calm', cheeks: 'light' },
    blink: { eyes: 'closed', mouth: 'calm', cheeks: 'light' },
  },
};
