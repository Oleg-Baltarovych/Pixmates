// pixmates.knight — D-22 chibi human knight in full silver plate with a movable visor, a noble coward (MA-67,
// docs/art/knight.md; ART-BIBLE §11.11, §12). Variant B (owner pick 2026-11-27): a great bascinet with a pointed
// hounskull visor, a mail camail draped onto the shoulders, an emerald sash (baldric + tabard panel) over polished
// `metal_silver` plate head to toe (gorget, breastplate, pauldrons, vambraces, gauntlets, faulds over a mail hem,
// greaves, sabatons), leather belt and a sword at the hip. The visor is lowered on walk / turn / startle / fall / drag
// / the landing impact and raised otherwise (`VISOR_DOWN_IN`). Frame 48 × 56, shared rig poses only, normal face.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView, Visor } from '../../rig/types.ts';
import { knightFace, knightFaceQ34 } from './face.ts';
import {
  CHEST,
  CHEST_Q34,
  FAULDS,
  FAULDS_Q34,
  FAULDS_SEATED,
  GORGET,
  GORGET_Q34,
  HEAD,
  HEAD_Q34,
  PAULDRON,
  SHOE,
  SHOE_Q34,
  SWORD,
  SWORD_Q34,
  VISOR,
} from './masks.ts';

/**
 * Visor rule (owner-approved 2026-11-27, docs/art/knight.md §1): lowered on the moves and scares — walk, turn, startle
 * (slammed down after the first surprised frame), fall, drag (held by the cursor) and the landing impact (frames 0–1;
 * raised again as he settles); raised on idle, sit, sleep, talk, think, happy, worried, wave and petted. M1 adds run,
 * climb, guard and «fights the mouse» to the lowered list.
 */
export const VISOR_DOWN_IN: Visor['downIn'] = {
  walk: 'all',
  turn: 'all',
  startle: [1, 2, 3, 4],
  fall: 'all',
  drag: 'all',
  land: [0, 1],
};

/** Silver tones for the hair (helmet) and shoe (armour) slots: 0 dark reflection · 2 · 3 · 4 base · 5 · 6 spec. */
const SILVER = [0, 2, 3, 4, 5, 6] as const;
const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;
const HEAD_AT = [-15, -18] as const;
const NO_BACK_HAIR = { mask: [], at: [0, 0] } as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  // Helmet, visor, camail.
  hair: { ramp: 'metal_silver', tones: SILVER },
  // Leather: sword grip, scabbard.
  horn: { ramp: 'hair_umber', tones: T6UP },
  // Emerald sash: baldric, tabard panel.
  dress: { ramp: 'cloth_emerald', tones: T6 },
  // Slit glints, eye highlights.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Belt leather.
  trim: { ramp: 'hair_umber', tones: T6UP },
  // Breastplate, faulds, mail hem, pauldrons, sabatons, gorget, sword metal.
  shoe: { ramp: 'metal_silver', tones: SILVER },
  eye: { ramp: 'cloth_emerald', tones: T6 },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const Q34: BodyView = {
  head: { mask: HEAD_Q34, at: HEAD_AT, band: 16 },
  face: knightFaceQ34,
  masks: { shoe: SHOE_Q34, hairBack: NO_BACK_HAIR, neckAcc: GORGET_Q34 },
  torsoMask: { mask: CHEST_Q34, at: [-7, 0] },
  tassets: { front: { mask: FAULDS_Q34, at: [-6, -2] } },
  sode: { mask: PAULDRON, at: [-5, -2] },
  sashKnot: { mask: SWORD_Q34, at: [4, -3] },
  hideFarShoulder: true,
  farLegShade: 2,
  tweaks: { head: { dx: -1, dy: 0 } },
};

export const KNIGHT: Body = {
  id: 'pixmates.knight',
  name: 'knight',
  outfit: OUTFIT,
  ramps: {
    hair: 'metal_silver',
    cloth: 'metal_silver',
    clothAlt: 'metal_silver',
    trim: 'hair_umber',
    legs: 'metal_silver',
    tail: 'metal_silver',
    tailTip: 'metal_silver',
  },
  variants: {
    headAcc: 'none',
    hairBack: 'short',
    hem: 'shorts',
    back: 'none',
    neckAcc: 'choker',
    sleeves: 'long',
  },
  dressShade: 2,
  sleeve: { ramp: 'metal_silver', shade: 4 },
  cuff: { ramp: 'metal_silver', shade: 5 },
  gauntlets: { ramp: 'metal_silver' },
  head: { mask: HEAD, at: HEAD_AT, band: 16 },
  face: knightFace,
  masks: { shoe: SHOE, hairBack: NO_BACK_HAIR, neckAcc: GORGET },
  torsoMask: { mask: CHEST, at: [-6, 0] },
  tassets: { front: { mask: FAULDS, at: [-6, -2] }, seated: { mask: FAULDS_SEATED, at: [-6, -2] } },
  sode: { mask: PAULDRON, at: [-5, -2] },
  sash: { rows: 2, knot: { mask: SWORD, at: [5, -4] } },
  shorts: { shade: 3, raise: 0 },
  legRim: 5,
  hairBackStretch: 0.2,
  sideLocks: false,
  visor: { ...VISOR, downIn: VISOR_DOWN_IN },
  views: { q34: Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const KNIGHT_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createKnightPack = (): PackDef => ({ ...createRigPack(KNIGHT, ANIMS), emotions: KNIGHT_EMOTIONS });
