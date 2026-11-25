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

/** Open (2 rows): the heavy half-lid cuts the iris top (outer end ink 0, inner ink 1); glint · pupil · rim, no sclera. */
const OPEN: Mask = ['.XXXx..xXXX.', '..KCc..KCc..'];

export const RONIN_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3, IRIS_ROWS),
    low: part(OPEN, 0, 4, IRIS_ROWS),
    side: part(irisShift(OPEN, EYE_HALF, IRIS_ROWS), 0, 3, IRIS_ROWS),
    closed: part(['.XXXx..xXXX.'], 0, 4),
    half: part(['.xXXx..xXXx.', '..KC...KC...'], 0, 4),
    /** Serene closed lines, the outer ends drooped (not ^^, not arcs). */
    serene: part(['..XXX..XXX..', '.x........x.'], 0, 4),
    startle: part(['.xXXx..xXXx.', '.pKCp..pCKp.', '..pp....pp..'], 0, 3),
    wince: part(['.XXXx..x....', '.pKCc...xXX.', '.......x....'], 0, 3),
    petted: part(['..XX....XX..', '.x..x..x..x.'], 0, 3),
  },
  brows: {
    /** Stern: outer ends high, sloping down to the nose (2 rows). */
    stern: part(['.JJ......JJ.', '...JJ..JJ...'], 0, 0),
    /** Worried (only here): the inner ends lifted. */
    worried: part(['...JJ..JJ...', '.JJ......JJ.'], 0, 0),
    up: part(['.JJJJ..JJJJ.'], 0, 0),
    /** Meditation: level, calm. */
    level: part(['.JJJJ..JJJJ.'], 0, 1),
  },
  mouths: {
    flat: part(['.....ZZZ....'], 0, 8),
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
  nose: part(['s', 'z'], 6, 5),
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

/** q34 face (neutral + blink): a narrow 2-row near eye (lid cuts the iris), a 2-px far eye, the dark brow angled down
 * to the nose 1 px clear of the lid, a closed skin-0 mouth line, the nose shadow on the profile. */
export const RONIN_FACE_Q34: ViewFaceLibrary = {
  eyes: {
    open: part(['.....XXx.xX.', '......KC.C..'], 1, 3),
    closed: part(['.....XXx.xX.'], 1, 4),
  },
  brows: { stern: part(['....JJ......', '......JJ....'], 1, 0) },
  mouths: { flat: part(['.......ZZ...'], 0, 8) },
  cheeks: { none: part([], 0, 6) },
  nose: part(['s'], 11, 6),
  expressions: {
    neutral: { eyes: 'open', brows: 'stern', mouth: 'flat', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'stern', mouth: 'flat', cheeks: 'none' },
  },
};
