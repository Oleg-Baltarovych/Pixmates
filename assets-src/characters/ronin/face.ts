// ronin face library — D-20 armoured samurai (MA-65, docs/art/ronin.md §3; format in rig/face.ts). The shared stern
// kit (rig/faces/stern.ts, ART-BIBLE §11.9) on the chibi head (face anchor = head mask col 5, row 12), jade eyes. The
// menpō (`Body.mask`) hides the mouth on every expression but happy / petted / sleep, so talk reads through the eyes:
// talk_a = the stern eye, talk_b = a glance, talk_c = the lid lifted 1 row (4 iris rows). worried / startle sit 1 row
// higher than the kit (their iris must end ≥ 1 skin row above the menpō); think keeps the stern eye (the chin fist and
// the hidden mouth carry it; the stern rules need an open eye there).
import type { Mask } from '../../lib/mask.ts';
import type { FacePart, ViewFaceLibrary } from '../../rig/face.ts';
import { STERN_FACE, sternFace } from '../../rig/faces/stern.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });
const kitBrow = (id: string): FacePart => {
  const p = STERN_FACE.brows?.[id];
  if (!p) throw new Error(`stern kit has no brows "${id}"`);
  return p;
};
const kitEye = (id: string): FacePart => {
  const p = STERN_FACE.eyes[id];
  if (!p) throw new Error(`stern kit has no eyes "${id}"`);
  return p;
};

/** talk_c: the lid lifted 1 row — 4 iris rows under it (still a stern lid: it covers the iris top). */
const LID_UP: Mask = [
  '.XXXXXX......XXXXXX.',
  '...ciic......ciic...',
  '...KXXc......KXXc...',
  '...iXXi......iXXi...',
  '...ckkc......ckkc...',
];

export const RONIN_FACE = sternFace({
  eyes: {
    lid_up: part(LID_UP, 0, 4),
    worried: { ...kitEye('worried'), at: [0, 3] },
    startle: { ...kitEye('startle'), at: [0, 3] },
  },
  brows: {
    /** talk_c: the set brows lift with the lid (1 skin row between them kept). */
    set_up: { ...kitBrow('set'), at: [0, 1] },
    /** Worried brows 1 row higher (over the raised eye). */
    up: part(['......h......h......', '...hhh........hhh...'], 0, 1),
  },
  expressions: {
    talk_b: { eyes: 'side', brows: 'set', mouth: 'talk_b', cheeks: 'none' },
    talk_c: { eyes: 'lid_up', brows: 'set_up', mouth: 'talk_c', cheeks: 'none' },
    petted: { eyes: 'closed', brows: 'flat', mouth: 'happy', cheeks: 'blush' },
    happy: { eyes: 'happy', brows: 'flat', mouth: 'happy', cheeks: 'blush' },
  },
});

/** q34 (neutral + blink): the kit's stern eye and set brows; the mouth sits under the q34 menpō. */
export const RONIN_FACE_Q34: ViewFaceLibrary = {
  style: 'stern',
  eyes: { stern: kitEye('stern'), closed: kitEye('closed') },
  brows: { set: part(['...hhh........hhh...', '......h......h......'], 0, 2) },
  mouths: { set: part(['..........XXX.......'], 0, 11) },
  cheeks: { none: part([], 0, 9) },
  expressions: {
    neutral: { eyes: 'stern', brows: 'set', mouth: 'set', cheeks: 'none' },
    blink: { eyes: 'closed', brows: 'set', mouth: 'set', cheeks: 'none' },
  },
};
