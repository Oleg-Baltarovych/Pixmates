// pixmates.goth — built-in calm gothic girl (plan M-ART MA-29; design spec docs/art/goth.md, originality gate PASS
// 2026-11-24; ART-BIBLE §9/§11.8, black rule R6; ADR 005, 009, 010). A stylized archetype, not a portrait: long
// blue-black `hair_black` hair to the hip with pointed bangs and a broken angel ring, a dusty-ivory moth clip, an
// all-black (`cloth_black`, lifted plum-blue, never #000) fitted dress with an A-line skirt and tonal hem lace, bell
// sleeves past the hands with cream lace cuffs (fingertips only), a black velvet choker with cream lace and the only
// red on the figure — a small garnet drop — opaque black tights, black Mary Janes, warm brown heavy-lidded eyes.
// Owner decisions 2026-11-24: tonal plum hem lace (not cream), opaque black tights. Shared rig poses only.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { GOTH_FACE, GOTH_FACE_Q34 } from './face.ts';
import { BAND, CHOKER, CHOKER_Q34, HAIR_FAR_Q34, HEAD, HEAD_Q34, MOTH, MOTH_Q34, SHOE, SHOE_Q34 } from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  // Art round 1: J/j split lines step 0, shadow mass h step 1, mid mass H step 2, angel ring y/Y steps 5/6.
  hair: { ramp: 'hair_black', tones: [0, 0, 1, 2, 5, 6] },
  // The moth clip (dusty ivory / tan).
  horn: { ramp: 'horn', tones: T6UP },
  // Choker band (velvet): one step up so its darkest px is never the ramp floor.
  dress: { ramp: 'cloth_black', tones: T6UP },
  // Cream: choker lace, cuff lace on the chin paw, sclera and highlights.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Mask trim = the garnet drop only (R4); the waist band is `ramps.trim` (tonal black).
  trim: { ramp: 'gem_garnet', tones: T6 },
  // Mary Janes: L = the lit toe in the ramp top (6), l = the sole line / strap (4).
  shoe: { ramp: 'cloth_black', tones: [0, 1, 2, 3, 4, 6] },
  // Warm brown iris: c = horn 0, i 2, I 3, k 4; never above horn 4 (brown, not amber).
  eye: { ramp: 'horn', tones: [0, 0, 2, 3, 4, 4] },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const GOTH_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: GOTH_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    headAcc: { mask: MOTH_Q34, at: [-9, 0] },
    neckAcc: { mask: CHOKER_Q34, at: [-2, 3] },
    hairFar: { mask: HAIR_FAR_Q34, at: [8, -1] },
  },
  // The far puff sits behind the neck (no back-hair block under the jaw with the far lock).
  hideFarShoulder: true,
  // Far tights one step darker with a touch outline (no merged black patch on the contact frames).
  farLegShade: 2.6,
  // Long hair follows the stride a frame late (≤ 2 px) instead of moving as one slab.
  hairTipLag: true,
};

export const GOTH: Body = {
  id: 'pixmates.goth',
  name: 'goth',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_black',
    cloth: 'cloth_black',
    // Tonal hem lace (owner Q1): clothAlt = the dress ramp; the cuffs get their own cream (`cuff`, R3).
    clothAlt: 'cloth_black',
    trim: 'cloth_black',
    legs: 'cloth_black',
    tail: 'hair_black',
    tailTip: 'hair_black',
  },
  variants: { headAcc: 'clip', hairBack: 'long', hem: 'skirt', back: 'none', neckAcc: 'choker', sleeves: 'long' },
  // §11.8: plum-black bodice (shade 2), sleeves one step lighter and cooler (3).
  dressShade: 2,
  // Art round 1: sleeves at 4 (ΔL 0.125 / 40° from the hair mid mass), a lit rim on the near sleeve's outer edge.
  sleeve: { ramp: 'cloth_black', shade: 4 },
  sleeveRim: 5,
  // Sleeves past the hands (R1): only fingertips under the cream bell cuff (R3).
  sleeveOverHand: true,
  cuff: { ramp: 'cloth_cream', shade: 3 },
  // R2: the black silhouette holds on a dark IDE (lit side shade 5, elsewhere 3, never the floor).
  silhouetteOutline: [
    { ramp: 'cloth_black', lit: 5, shade: 3 },
    { ramp: 'hair_black', lit: 5, shade: 4 },
  ],
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: GOTH_FACE,
  masks: {
    shoe: SHOE,
    headAcc: { mask: MOTH, at: [-9, 0] },
    neckAcc: { mask: CHOKER, at: [-3, 3] },
  },
  // The global outline next to the moth in the hair outline ramp (no tan halo).
  hornOutline: 'hair_black',
  // Side locks lean in one line root → tip (a lagging chain never bulges out at cheek height in think).
  lockLean: true,
  // think (art round 2): the paw under the jaw line on screen-right, 2–3 px right of the mouth, knuckles touching the
  // chin from below.
  chinHand: { dx: -2, dy: 0 },
  views: { q34: GOTH_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const GOTH_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createGothPack = (): PackDef => ({ ...createRigPack(GOTH, ANIMS), emotions: GOTH_EMOTIONS });
