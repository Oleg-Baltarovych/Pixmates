// pixmates.maid — built-in default character (plan M-ART MA-27; ART-BIBLE §9/§11; ADR 005, 009). A small imp maid:
// lilac hair (never orange), ivory imp hook horns on plum bases (not dragon horns), teal dress with pink puff sleeves,
// cream apron (bib + frilled front panel) with the rose bow on the bib, cream hem lace, plum stockings and shoes, thin plum spade-tipped tail. Shared rig poses only;
// per-character parts are the masks (./masks.ts) and the face library (./face.ts). No persona or lines until M1.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { MAID_FACE, MAID_FACE_Q34 } from './face.ts';
import {
  BAND,
  BIB,
  BIB_Q34,
  BOW,
  BOW_Q34,
  HEAD,
  HAIR_FAR_Q34,
  HEAD_Q34,
  SHOE,
  SHOE_Q34,
  SPADE,
  TIES_Q34,
} from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_lilac', tones: T6UP },
  horn: { ramp: 'horn', tones: T6UP },
  dress: { ramp: 'cloth_teal', tones: T6 },
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_rose', tones: T6 },
  shoe: { ramp: 'hair_plum', tones: T6 },
  eye: { ramp: 'cloth_ochre', tones: T6 },
  // F (index 3) = rose 3, visible on skin at real size; f (index 2) = rose 4, the lighter soft edge.
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

/**
 * Three-quarter view (MA-27d, ADR 010), authored facing screen-right: own head (near/far horns, parted fringe, far
 * lock hidden, jaw taper + chin point), face (neutral + blink), collar bow and bib 1 px narrower with the near side
 * wider, an 8-px apron panel 1 px toward the facing, apron ties trailing at the back, and the side shoe.
 */
const MAID_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: MAID_FACE_Q34,
  masks: { shoe: SHOE_Q34, neckAcc: { mask: BOW_Q34, at: [-1, 3] }, hairFar: { mask: HAIR_FAR_Q34, at: [8, -1] } },
  apron: { bib: { mask: BIB_Q34, at: [-4, 3] }, panelW: 8, dx: 1, ties: { mask: TIES_Q34, at: [-10, -12] } },
  // Plum line between the pink near puff and the lilac near lock; far puff hidden behind the neck (no back-hair
  // block under the jaw with the far lock).
  sleeveHairLine: 'hair_plum',
  hideFarShoulder: true,
};

export const MAID: Body = {
  id: 'pixmates.maid',
  name: 'maid',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_lilac',
    cloth: 'cloth_teal',
    clothAlt: 'cloth_cream',
    trim: 'cloth_rose',
    legs: 'hair_plum',
    tail: 'hair_plum',
    tailTip: 'hair_plum',
  },
  variants: { headAcc: 'horns', hairBack: 'short', hem: 'skirt', back: 'spade_tail', neckAcc: 'bow', sleeves: 'short' },
  // Pink puff sleeves: own ramp, so the composer's value-step pass keeps them apart from the teal bodice and the
  // rose trim (bow, waist band) at the shoulder seam.
  sleeve: { ramp: 'cloth_rose', shade: 4 },
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: MAID_FACE,
  masks: {
    shoe: SHOE,
    neckAcc: { mask: BOW, at: [-2, 3] },
    spade: SPADE,
  },
  // Cream apron: bib on the bodice under the rose bow, ~10-px front panel with a frill from waist to hem.
  apron: { bib: { mask: BIB, at: [-4, 3] }, panelW: 10 },
  hornOutline: 'hair_plum',
  views: { q34: MAID_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const MAID_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createMaidPack = (): PackDef => ({ ...createRigPack(MAID, ANIMS), emotions: MAID_EMOTIONS });
