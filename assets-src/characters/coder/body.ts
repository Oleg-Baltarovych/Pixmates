// pixmates.coder — D-20 night-shift coder boy (MA-66, docs/art/coder.md; ART-BIBLE §11.9 stern look, §12 richness;
// owner redesign 2026-11-27). A stylized archetype, not a portrait: an unimpressed senior dev in a boxy black half-zip
// hoodie with the round hood always up (mustard edge, two mustard drawstrings, steel zipper pull, pocket line, ribbed
// waistband) over a cream tee hem, a blank cream badge with a mustard `>_` on a steel chain (the signature piece),
// rectangular steel glasses over grey-blue hooded eyes, straight rolled denim jeans and chunky cream sneakers.
// Layers: tee → hoodie → chain + badge; materials: knit cloth, denim, rubber soles, steel. Frame 48 × 56, shared rig
// poses only (the mug is an M1 signature prop, owner Q2 a).
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { CODER_FACE, CODER_FACE_Q34 } from './face.ts';
import { BAND, CHEST, CHEST_Q34, HEAD, HEAD_Q34, SHOE, SHOE_Q34 } from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;
/** The hood covers the back of the head in both views: an empty authored back hair replaces the procedural mass. */
const NO_BACK_HAIR = { mask: [], at: [0, 0] } as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_cocoa', tones: T6 },
  // Steel: glasses, zipper pull, badge chain and clip.
  horn: { ramp: 'metal', tones: T6UP },
  // Black knit: hood, hoodie body, collar, pocket line, rib.
  dress: { ramp: 'cloth_onyx', tones: T6 },
  // Cream: tee hem, badge, sneakers, sclera and highlights.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Mustard accent: hood edge, drawstrings, the badge's `>_`.
  trim: { ramp: 'cloth_mustard', tones: T6 },
  // Shoe slot (the few rig-drawn shoe px): cream, matching the authored sneakers.
  shoe: { ramp: 'cloth_cream', tones: T6 },
  // Cool grey-blue "monitor glow" iris: C = ash 0, c 1 (the dark stern iris), i 2, I 3, k 4, K 5.
  eye: { ramp: 'hair_ash', tones: [0, 1, 2, 3, 4, 5] },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const CODER_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: CODER_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    hairBack: NO_BACK_HAIR,
  },
  torsoMask: { mask: CHEST_Q34, at: [-8, 0] },
  hideFarShoulder: true,
  farLegShade: 2,
  // q34 keeps the shared rest (head at hip x − 1, feet untouched: the walk travels at WALK_TRAVEL).
  tweaks: {},
};

export const CODER: Body = {
  id: 'pixmates.coder',
  name: 'coder',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_cocoa',
    cloth: 'cloth_onyx',
    // The jeans' seat (`hem: 'shorts'`, untailored: no leg-hem flare) and legs in denim.
    clothAlt: 'cloth_indigo',
    // Ribbed waistband.
    trim: 'cloth_onyx',
    legs: 'cloth_indigo',
    tail: 'hair_cocoa',
    tailTip: 'hair_cocoa',
  },
  variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'none', neckAcc: 'none', sleeves: 'long' },
  dressShade: 2,
  // Sleeves two steps over the body: onyx 3 matched the shade-side outline at ΔL 0 on petted/2 + /6 (arm-over-torso
  // gate); a darker ribbed cuff, hands fully visible (no sweater paws).
  sleeve: { ramp: 'cloth_onyx', shade: 4 },
  cuff: { ramp: 'cloth_onyx', shade: 1 },
  // Black on a dark IDE: a lit onyx-5 outline (lit side) and onyx 3 (shade side). Hair: a cocoa-2 lit side.
  silhouetteOutline: [
    { ramp: 'cloth_onyx', lit: 5, shade: 3, head: { shade: 4 } },
    { ramp: 'hair_cocoa', lit: 2, shade: 1 },
  ],
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: CODER_FACE,
  masks: {
    shoe: SHOE,
    hairBack: NO_BACK_HAIR,
  },
  // Rib waistband: 2 rows over the jeans top.
  sash: { rows: 2, knot: { mask: [], at: [0, 0] } },
  torsoMask: { mask: CHEST, at: [-6, 0] },
  // Rolled denim cuff above each sneaker.
  shinWrap: { row: 1, shade: 4 },
  sideLocks: false,
  // Boxy dropped shoulders, sneakers set 1 px wider each side.
  tweaks: {
    shoulderL: { dx: -1, dy: 0 },
    shoulderR: { dx: 1, dy: 0 },
    footL: { dx: -1, dy: 0 },
    footR: { dx: 1, dy: 0 },
  },
  views: { q34: CODER_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const CODER_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createCoderPack = (): PackDef => ({ ...createRigPack(CODER, ANIMS), emotions: CODER_EMOTIONS });
