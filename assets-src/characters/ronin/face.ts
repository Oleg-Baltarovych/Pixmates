// ronin face library — adult redesign MA-46 (ADR 011 adult face rules, ART-BIBLE §11.0; format in rig/face.ts).
// Parts sit on the face anchor (head mask col 2, row 5); masks are 12 px wide, mirrored about the face centre
// (cols 5|6). A stern ~25-year-old: tsurime half-lid (a heavy ink lid, the inner corner lighter), brows angled down to
// the nose, dark jade-0 pupils with a jade-1 rim and a 1-px jade-5 glint, a cream sclera px outside; a 3-px flat
// mouth; a skin nose shadow; clean-shaven; no blush outside petted. Signatures (ronin.md): happy = serene closed
// eyes with drooped outer ends + a small closed smile; think = meditation (eyes closed, level brows, flat mouth);
// worried = the inner brow ends lifted.
import type { FaceLibrary, FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { irisShift } from '../../rig/face.ts';
import type { Mask } from '../../lib/mask.ts';

const part = (mask: Mask, x: number, y: number, irisRows?: readonly number[]): FacePart =>
  irisRows ? { mask, at: [x, y], irisRows } : { mask, at: [x, y] };

/** Rows of the open eye whose pupil + glint move on a glance. */
const IRIS_ROWS = [1] as const;
/** Glance split column (`RigLayout.irisHalf`, adult 6). */
const EYE_HALF = 6;

/** Open: the heavy half-lid (outer end ink 0, inner end ink 1), then sclera · glint · pupil · rim. */
const OPEN: Mask = ['.XXXx..xXXX.', '.pKCc..cCKp.'];

export const RONIN_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3, IRIS_ROWS),
    low: part(OPEN, 0, 4, IRIS_ROWS),
    side: part(irisShift(OPEN, EYE_HALF, IRIS_ROWS), 0, 3, IRIS_ROWS),
    closed: part(['.XXXx..xXXX.'], 0, 4),
    half: part(['.xXXx..xXXx.', '..KC....CK..'], 0, 4),
    /** Serene closed lines, the outer ends drooped (not ^^, not arcs). */
    serene: part(['..XXX..XXX..', '.x........x.'], 0, 4),
    startle: part(['.xXXx..xXXx.', '.pKCp..pCKp.', '..pp....pp..'], 0, 3),
    wince: part(['.XXXx..x....', '.pKCc...xXX.', '.......x....'], 0, 3),
    petted: part(['..XX....XX..', '.x..x..x..x.'], 0, 3),
  },
  brows: {
    /** Stern: outer ends high, sloping down to the nose (2 rows). */
    stern: part(['.jj......jj.', '...jJ..Jj...'], 0, 1),
    /** Worried (only here): the inner ends lifted. */
    worried: part(['...Jj..jJ...', '.jj......jj.'], 0, 1),
    up: part(['.jjJj..jJjj.'], 0, 1),
    /** Meditation: level, calm. */
    level: part(['.jjJj..jJjj.'], 0, 2),
  },
  mouths: {
    flat: part(['.....xxx....'], 0, 8),
    talk_a: part(['.....xXx....', '......z.....'], 0, 8),
    talk_b: part(['.....XXX....', '......x.....'], 0, 8),
    talk_c: part(['.....xXx....', '.....XzX....', '......x.....'], 0, 8),
    serene: part(['....x...x...', '.....xXx....'], 0, 8),
    frown: part(['.....xXx....', '....x...x...'], 0, 8),
    small_o: part(['.....xx.....', '.....xx.....'], 0, 8),
  },
  cheeks: {
    none: part([], 0, 6),
    blush: part(['.FF......FF.'], 0, 6),
  },
  nose: part(['S', 's'], 6, 5),
  expressions: {
    neutral: { eyes: 'open', brows: 'stern', mouth: 'flat', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'stern', mouth: 'flat', cheeks: 'none' },
    half: { eyes: 'half', brows: 'stern', mouth: 'talk_a', cheeks: 'none' },
    talk_a: { eyes: 'open', brows: 'stern', mouth: 'talk_a', cheeks: 'none' },
    talk_b: { eyes: 'open', brows: 'stern', mouth: 'talk_b', cheeks: 'none' },
    talk_c: { eyes: 'open', brows: 'stern', mouth: 'talk_c', cheeks: 'none' },
    happy: { eyes: 'serene', mouth: 'serene', cheeks: 'none' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'frown', cheeks: 'none' },
    think: { eyes: 'closed', brows: 'level', mouth: 'flat', cheeks: 'none' },
    sleep: { eyes: 'closed', mouth: 'small_o', cheeks: 'none' },
    startle: { eyes: 'startle', brows: 'up', mouth: 'talk_c', cheeks: 'none' },
    petted: { eyes: 'petted', mouth: 'serene', cheeks: 'blush' },
    wince: { eyes: 'wince', brows: 'worried', mouth: 'flat', cheeks: 'none' },
    glance: { eyes: 'side', brows: 'stern', mouth: 'flat', cheeks: 'none' },
  },
};

/** q34 face (neutral + blink): near eye 4 px, far eye 2 px, the stern brow, the nose shadow on the profile. */
export const RONIN_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(['....xXXX.xX.', '....pKCc.C..'], 0, 3),
    closed: part(['....xXXX.xX.'], 0, 4),
  },
  brows: { stern: part(['....jj....j.', '......jJ.J..'], 0, 1) },
  mouths: { flat: part(['.......xx...'], 0, 8) },
  cheeks: { none: part([], 0, 6) },
  nose: part(['S', 's'], 10, 5),
  expressions: {
    neutral: { eyes: 'open', brows: 'stern', mouth: 'flat', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'stern', mouth: 'flat', cheeks: 'none' },
  },
};
