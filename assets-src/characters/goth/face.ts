// goth face library (MA-29, docs/art/goth.md §4; format in rig/face.ts). Parts sit on the face anchor (head mask
// col 5, row 12); masks are 20 px wide, the lash shape mirrored about the face centre (cols 9|10), highlights on the
// same (top-left) side in both eyes. Warm brown eyes (horn ramp, never above horn 4): calm and heavy-lidded — a flat
// thick lash (2 rows at the outer 2 px) over a 4 × 5 iris so 4 × 4 shows (recorded per-character exception to
// ART-BIBLE §11.2), 1-px flick up-out, a 2 × 2 round pupil, a big 1 × 2 highlight + a 1-px lower one, outer sclera
// sliver. Mouth: a gentle half-smile (2-px flat line right of the axis, the screen-right corner 1 row up), never a
// fang. Signatures: startle lifts the lid (full iris, sclera both sides, small o); happy = soft closed arcs + small
// open smile + full blush; petted = irises aside + strong blush + flat wavy mouth; think = one eye more lidded +
// mouth corner pulled aside; worried = lids lifted at the inner ends (brows stay hidden) + small flat-open mouth.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { irisShift } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });

/**
 * Art round 1 (no frown read): flat thick lash, the outer end level with or below the inner end — a 1-px horizontal
 * tick 1 px out on the lower lash row instead of an up-flick — and a skin AA px above each outer end.
 */
const LASH_AA = '..S..............S..';
const LASH = '..XXXXXX....XXXXXX..';
const LASH_LOW = '.XXXccc......cccXXX.';
/** Iris rows below the heavy lid (rows 2–6), shared by open / think / worried. */
const IRIS: Mask = [
  '..XXccc......cccXX..',
  '..pPcci......Pccip..',
  '...PXXi......PXXi...',
  '...iXXI......iXXI...',
  '....kp........kp....',
];
/** Neutral: flick, flat thick lash, the iris top row under the lid. */
const OPEN: Mask = [LASH_AA, LASH, LASH_LOW, ...IRIS.slice(1)];
/** Think: the screen-right eye 1 row more lidded. */
const THINK: Mask = [
  LASH_AA,
  LASH,
  '.XXXccc......XXXXXX.',
  '..pPcci......Pccip..',
  '...PXXi......PXXi...',
  '...iXXI......iXXI...',
  '....kp........kp....',
];
/** Worried: the lash lifts at the inner ends (2 px a row higher), the outer corners stay. */
const WORRIED: Mask = ['......XX....XX......', '..XXXX........XXXX..', LASH_LOW, ...IRIS.slice(1)];
/** Startle: the lid lifts 1 row; full 4 × 5 iris with sclera on both sides. */
const STARTLE: Mask = [
  LASH_AA,
  LASH,
  '.Xpccccp....pccccpX.',
  '..pPcicp....pPcicp..',
  '..pPXXip....pPXXip..',
  '..piXXIp....piXXIp..',
  '...kkp.......kkp....',
];
/** Wince: the screen-right eye squeezed shut (`<`), the other open. */
const WINCE: Mask = [
  '..S.................',
  '..XXXXXX............',
  '.XXXccc......xX.....',
  '..pPcci........XX...',
  '...PXXi......xX.....',
  '...iXXI.............',
  '....kp..............',
];

export const GOTH_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 2),
    think: part(THINK, 0, 2),
    low: part(WORRIED, 0, 2),
    startle: part(STARTLE, 0, 1),
    closed: part(['..xXXXXX....XXXXXx..', '.x................x.'], 0, 6),
    half: part(['..XXXXXX....XXXXXX..', '...iXXI......iXXI...', '....kp........kp....'], 0, 6),
    /** Content: soft closed arcs bowing down (not ^^). */
    happy: part(['..x....x....x....x..', '...XXXX......XXXX...'], 0, 4),
    wince: part(WINCE, 0, 2),
    /** Glance / petted: neutral with iris + pupil 1 px toward screen-right (lash, outline and shine stay). */
    side: part(irisShift(OPEN, 10), 0, 2),
  },
  mouths: {
    /** Half-smile: 2-px flat line 1 px right of the axis, the screen-right corner 1 row up. */
    /** Half-smile: XX ink 1 px right of the axis, the raised corner a lip tone (skin z, ≥ 0.15 ΔL under the cheek). */
    half_smile: part(['.............z......', '...........XX.......'], 0, 10),
    /** Small open smile: an ink top line with soft corners over a rose tongue (never a v). */
    smile_open: part(['........xXXx........', '........XffX........'], 0, 10),
    pulled: part(['.........XXx........'], 0, 11),
    /** Worried: small flat-open box (top and bottom lines level, never a v). */
    flat_open: part(['.........XXX........', '.........XfX........', '.........XXX........'], 0, 10),
    small_o: part(['.........XX.........', '.........XX.........'], 0, 10),
    /** Petted: a flat wavy 4-px line (one row, alternating ink tones; never a cat mouth). */
    wavy: part(['........XxXx........'], 0, 11),
    talk_a: part(['..........XX........'], 0, 11),
    /** Flat 3-px line (light-ink corners read as a v at 1×). */
    talk_b: part(['.........XXX........'], 0, 11),
    talk_c: part(['.........XXX........', '..........X.........'], 0, 10),
    sleep: part(['..........x.........'], 0, 11),
    gritted: part(['........XXXX........', '........PPPP........', '........XXXX........'], 0, 10),
  },
  cheeks: {
    none: part([], 0, 9),
    /** Neutral family: 2 light px per cheek. */
    light: part(['...ff.........ff....'], 0, 9),
    soft: part(['..fFFf........fFFf..', '...f.f........f.f...'], 0, 9),
    strong: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'half_smile', cheeks: 'light' },
    blink: { eyes: 'closed', mouth: 'half_smile', cheeks: 'light' },
    half: { eyes: 'half', mouth: 'talk_a', cheeks: 'light' },
    talk_a: { eyes: 'open', mouth: 'talk_a', cheeks: 'light' },
    talk_b: { eyes: 'open', mouth: 'talk_b', cheeks: 'light' },
    talk_c: { eyes: 'open', mouth: 'talk_c', cheeks: 'light' },
    happy: { eyes: 'happy', mouth: 'smile_open', cheeks: 'soft' },
    worried: { eyes: 'low', mouth: 'flat_open', cheeks: 'none' },
    think: { eyes: 'think', mouth: 'pulled', cheeks: 'light' },
    sleep: { eyes: 'closed', mouth: 'sleep', cheeks: 'soft' },
    startle: { eyes: 'startle', mouth: 'small_o', cheeks: 'none' },
    petted: { eyes: 'side', mouth: 'wavy', cheeks: 'strong' },
    wince: { eyes: 'wince', mouth: 'gritted', cheeks: 'soft' },
    glance: { eyes: 'side', mouth: 'half_smile', cheeks: 'light' },
  },
};

// ── q34 (neutral + blink): near (screen-left) eye = the front eye, the far eye 1 px narrower; the half-smile 1 px
// toward the facing with its high corner on the facing side; blush on the near cheek.
const OPEN_Q34: Mask = [
  '..S.................',
  '..XXXXXX.....XXXXX..',
  '.XXXccc......cccXX..',
  '..pPcci......Pcip...',
  '...PXXi......PXX....',
  '...iXXI......iXX....',
  '....kp........kp....',
];

export const GOTH_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(OPEN_Q34, 0, 2),
    closed: part(['..xXXXXX.....XXXXx..', '.x................x.'], 0, 6),
  },
  mouths: {
    half_smile: part(['..............z.....', '............XX......'], 0, 10),
  },
  cheeks: {
    light: part(['...ff...............'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'half_smile', cheeks: 'light' },
    blink: { eyes: 'closed', mouth: 'half_smile', cheeks: 'light' },
  },
};
