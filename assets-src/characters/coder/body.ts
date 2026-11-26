// pixmates.coder — D-20 night-shift coder boy (MA-66, docs/art/coder.md; ART-BIBLE §11.9 stern look, §12 richness).
// A stylized archetype, not a portrait: an unimpressed senior dev in a boxy mustard half-zip hoodie (hood down and
// bunched behind the neck, steel zipper pull, indigo `{ }` chest print, kangaroo pocket, ribbed waistband) over a
// cream tee hem, a cream lanyard with a blank badge (the signature piece), straight rolled denim jeans and chunky
// cream sneakers; cool cocoa bedhead with one cowlick, grey-blue half-lidded eyes with eye bags. Layers: tee → hoodie
// → lanyard; materials: knit cloth, denim, rubber soles, steel, cord. Frame 48 × 56, shared rig poses only (the mug
// is an M1 signature prop, owner Q2 a).
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { CODER_FACE, CODER_FACE_Q34 } from './face.ts';
import { BAND, CHEST, CHEST_Q34, HAIR_BACK_Q34, HAIR_FAR_Q34, HEAD, HEAD_Q34, SHOE, SHOE_Q34 } from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_cocoa', tones: T6 },
  // Steel: the zipper pull.
  horn: { ramp: 'metal', tones: T6UP },
  // Mustard knit: hood, collar, pocket edges, rib ticks.
  dress: { ramp: 'cloth_mustard', tones: T6UP },
  // Cream: tee hem, lanyard cord and badge, sneakers, sclera and highlights.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Amber: the badge's `>_` mark.
  trim: { ramp: 'cloth_ochre', tones: T6 },
  // Indigo: the `{ }` chest print.
  shoe: { ramp: 'cloth_indigo', tones: T6UP },
  // Cool grey-blue "monitor glow" iris: c = ash 0, i 2, I 3, k 4.
  eye: { ramp: 'hair_ash', tones: [0, 0, 2, 3, 4, 5] },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const CODER_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: CODER_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    hairFar: { mask: HAIR_FAR_Q34, at: [9, -1] },
    hairBack: { mask: HAIR_BACK_Q34, at: [-12, -4] },
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
    cloth: 'cloth_mustard',
    // The jeans' seat (`hem: 'shorts'`, untailored: no leg-hem flare) and legs in denim.
    clothAlt: 'cloth_indigo',
    // Ribbed waistband.
    trim: 'cloth_mustard',
    legs: 'cloth_indigo',
    tail: 'hair_cocoa',
    tailTip: 'hair_cocoa',
  },
  variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'none', neckAcc: 'none', sleeves: 'long' },
  dressShade: 4,
  // Sleeves one step over the body (arm over torso), a darker ribbed cuff, hands fully visible (no sweater paws).
  sleeve: { ramp: 'cloth_mustard', shade: 3 },
  cuff: { ramp: 'cloth_mustard', shade: 2 },
  // Mustard lights on a white window: a darker mustard outline.
  silhouetteOutline: [{ ramp: 'cloth_mustard', lit: 2, shade: 1 }],
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: CODER_FACE,
  masks: {
    shoe: SHOE,
  },
  // Rib waistband: 2 rows over the jeans top.
  sash: { rows: 2, knot: { mask: [], at: [0, 0] } },
  torsoMask: { mask: CHEST, at: [-6, 0] },
  // Rolled denim cuff above each sneaker.
  shinWrap: { row: 1, shade: 4 },
  hairBackStretch: 0.2,
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
