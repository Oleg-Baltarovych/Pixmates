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

const part = (mask: Mask, x: number, y: number, irisRows?: readonly number[]): FacePart =>
  irisRows ? { mask, at: [x, y], irisRows } : { mask, at: [x, y] };

/**
 * Art round 1 (no frown read): flat thick lash, the outer end level with or below the inner end — a 1-px horizontal
 * tick 1 px out on the lower lash row instead of an up-flick — and a skin AA px above each outer end. Kept for the
 * soft lash that breaks the stern read (petted, worried, startle).
 */
const LASH_AA = '..S..............S..';
const LASH = '..XXXXXX....XXXXXX..';
const LASH_LOW = '.XXXccc......cccXXX.';
/** Iris rows under the soft lash (pre-D-20), shared by petted / worried. */
const IRIS: Mask = ['..pPcci......Pccip..', '...iXXi......iXXi...', '...iXXI......iXXI...', '....kp........kp....'];
const SOFT_OPEN: Mask = [LASH_AA, LASH, LASH_LOW, ...IRIS];
/**
 * D-20 stern eye (art-director round 1, ART-BIBLE §11.9), stamped from face row 4: a 2-row ink lash (the darkest face
 * px) over the top 2 iris rows, so 4 × 3 of iris shows; its outer 2 px drop 1 row and end in a square 1-px tick (no
 * flick); one cream 1 × 1 highlight at the iris top-left under the lash; a 2 × 2 pupil in the darkest iris tone
 * touching the lash; the bottom-inner corner in iris dark (no pale px there — it read sleepy); a 2-px skin-shadow
 * lower lid under the outer 2 iris columns. Mirrored about cols 9 | 10, highlights top-left in both eyes.
 */
const OPEN: Mask = [
  '..XXXXXX....XXXXXX..',
  '...XXXXX....XXXXX...',
  '.XXPCCc......PCCcXX.',
  '...cCCc......cCCc...',
  '...ikkc......ckki...',
  '...zz..........zz...',
];
/** Glance (idle_a) / think: iris + pupil 1 px toward screen-right; lash, tick, highlight and lower lid stay. */
const SIDE: Mask = [
  '..XXXXXX....XXXXXX..',
  '...XXXXX....XXXXX...',
  '.XXPcCC......PcCCXX.',
  '...ccCC......ccCC...',
  '...ckki......icki...',
  '...zz..........zz...',
];
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
/** Worried: the lash lifts at the inner ends (2 px a row higher), the outer corners stay. */
const WORRIED: Mask = ['......XX....XX......', '..XXXX........XXXX..', LASH_LOW, ...IRIS];
/** Wince: the screen-left eye stern, the screen-right one squeezed shut (`<`). */
const WINCE: Mask = [
  '..XXXXXX............',
  '...XXXXX.....xX.....',
  '.XXPCCc........XX...',
  '...cCCc......xX.....',
  '...ikkc.............',
  '...zz...............',
];

export const GOTH_FACE: FaceLibrary = {
  style: 'stern',
  eyes: {
    open: part(OPEN, 0, 4),
    /** Think: the gaze aside under the same lid (the pulled mouth carries it). */
    think: part(SIDE, 0, 4),
    low: part(WORRIED, 0, 2),
    startle: part(STARTLE, 0, 1),
    closed: part(['..xXXXXX....XXXXXx..', '.x................x.'], 0, 6),
    half: part(['..XXXXXX....XXXXXX..', '...iXXI......iXXI...', '....kp........kp....'], 0, 6),
    /** Content: soft closed arcs bowing down (not ^^). */
    happy: part(['..x....x....x....x..', '...XXXX......XXXX...'], 0, 4),
    wince: part(WINCE, 0, 4),
    /** Glance / petted: neutral with iris + pupil 1 px toward screen-right (lash, outline and shine stay). */
    side: part(SIDE, 0, 4),
    /** Petted: the glance under the soft lash (the lid lifts off the iris top — breaks the stern read). */
    soft_side: part(irisShift(SOFT_OPEN, 10), 0, 2),
  },
  /**
   * Brows (D-20): hair_black 1 (`j`) through the fringe gaps beside the B point, 4 px with one step. Set = inner end
   * 1 row lower, 1 skin row above the lid; flat on happy / startle / petted; inner ends up on worried.
   */
  brows: {
    set: part(['..hhh..........hhh..', '.....h........h.....'], 0, 1),
    flat: part(['..hhhh........hhhh..'], 0, 1),
    /** Startle: flat and 1 row higher (over the lifted lid). */
    raised: part(['..hhhh........hhhh..'], 0, 0),
    up: part(['.....h........h.....', '..hhh..........hhh..'], 0, 0),
  },
  mouths: {
    /** Smirk (D-20 neutral): 2-px `XX` 1 px right of the axis + the 1-px lip-tone corner up on screen-right (signed-off tone). */
    smirk: part(['.............z......', '...........XX.......'], 0, 10),
    /** Small open smile: an ink top line with soft corners over a rose tongue (never a v). */
    smile_open: part(['........xXXx........', '........XffX........'], 0, 10),
    pulled: part(['.........XXx........'], 0, 11),
    /** Worried: small flat-open box (top and bottom lines level, never a v). */
    flat_open: part(['.........XXX........', '.........XfX........', '.........XXX........'], 0, 10),
    small_o: part(['.........XX.........', '.........XX.........'], 0, 10),
    /** Petted: a flat wavy 4-px line (one row, alternating ink tones; never a cat mouth). */
    wavy: part(['........XxXx........'], 0, 11),
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
    // D-20 stern: set brows + the thick lid on the calm set, no blush outside petted.
    neutral: { eyes: 'open', brows: 'set', mouth: 'smirk', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'set', mouth: 'smirk', cheeks: 'none' },
    half: { eyes: 'half', brows: 'set', mouth: 'smirk', cheeks: 'none' },
    talk_a: { eyes: 'open', brows: 'set', mouth: 'smirk', cheeks: 'none' },
    talk_b: { eyes: 'open', brows: 'set', mouth: 'talk_b', cheeks: 'none' },
    talk_c: { eyes: 'open', brows: 'set', mouth: 'talk_c', cheeks: 'none' },
    happy: { eyes: 'happy', brows: 'flat', mouth: 'smile_open', cheeks: 'soft' },
    worried: { eyes: 'low', brows: 'up', mouth: 'flat_open', cheeks: 'none' },
    think: { eyes: 'think', brows: 'set', mouth: 'pulled', cheeks: 'none' },
    sleep: { eyes: 'closed', mouth: 'sleep', cheeks: 'none' },
    startle: { eyes: 'startle', brows: 'raised', mouth: 'small_o', cheeks: 'none' },
    petted: { eyes: 'soft_side', brows: 'flat', mouth: 'wavy', cheeks: 'strong' },
    wince: { eyes: 'wince', brows: 'set', mouth: 'gritted', cheeks: 'none' },
    glance: { eyes: 'side', brows: 'set', mouth: 'smirk', cheeks: 'none' },
  },
};

// ── q34 (neutral + blink): near (screen-left) eye = the front eye, the far eye 1 px narrower; the half-smile 1 px
// toward the facing with its high corner on the facing side; blush on the near cheek.
const OPEN_Q34: Mask = [
  '..XXXXXX.....XXXXX..',
  '...XXXXX.....XXXX...',
  '.XXPCCc......PCcXX..',
  '...cCCc......cCc....',
  '...ikkc......cki....',
  '...zz.........zz....',
];

export const GOTH_FACE_Q34: ViewFaceLibrary = {
  style: 'stern',
  eyes: {
    open: part(OPEN_Q34, 0, 4),
    closed: part(['..xXXXXX.....XXXXx..', '.x................x.'], 0, 6),
  },
  brows: {
    // Far brow foreshortened to 2 + 2 px through the fringe gaps (cols 16–17 / 14–15).
    set: part(['..hhh...........hh..', '.....h........hh....'], 0, 1),
  },
  mouths: {
    /** Smirk 1 px toward the facing, the raised corner on the facing side. */
    smirk: part(['..............z.....', '............XX......'], 0, 10),
  },
  cheeks: {
    none: part([], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', brows: 'set', mouth: 'smirk', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'set', mouth: 'smirk', cheeks: 'none' },
  },
};
