// pixmates.ronin — built-in spirit swordsman, adult redesign MA-46 (D-19, ADR 011; design spec docs/art/ronin.md
// «D-19» + the adult lookalike hard rules; ART-BIBLE §9–11; target = style-spike ronin-C+). A stylized archetype,
// not a portrait: a stern young adult (~25, male build, ≈ 4.4 heads) with shaggy swept-back `hair_umber` hair and a
// short tied crown tuft (oxblood cord); a charcoal kosode (`cloth_ash` 1); an umber-black hakama (`Body.hakama`,
// `hair_umber` 1) flaring to an ankle-length trapezoid wider than the hips with stiff pleats and a split between the
// legs; a pale dove-ivory `mist` haori on both shoulders, open at the front (the cloak slot behind the body, mist
// sleeves, mist lapels in the collar) whose hem ends in regular tapered 3 → 2 → 1 wisps (`Cloak.hem.wisps`, never
// torn rags); an oxblood (`gem_garnet`) obi; one katana through the obi on his left hip with the paper charm on the
// sageo; straw zori. Feet and warm skin always show (no yurei read).
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { animsFor } from '../../rig/anims/adult.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView, Cloak } from '../../rig/types.ts';
import { RONIN_FACE, RONIN_FACE_Q34 } from './face.ts';
import {
  BAND,
  CHARM,
  CHARM_Q34,
  COLLAR,
  COLLAR_Q34,
  HAIR_BACK,
  HAIR_BACK_Q34,
  HEAD,
  HEAD_Q34,
  HILT_FRONT,
  HILT_Q34,
  HILT_Q34_COL,
  SHOE,
  SHOE_Q34,
  SWORD_FRONT,
  SWORD_Q34,
} from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

/** Head mask top-left from the head joint: the adult skull (−8, −7) + 1 tuft row on top. */
const HEAD_AT = [-8, -8] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  // Umber: splits J 0, shadow j 1, mass h 2 / H 3, angel ring y/Y 4/5.
  hair: { ramp: 'hair_umber', tones: T6 },
  // Haori lapels (horn letters → mist): o 3 fold, O 4, u 5, U 6.
  horn: { ramp: 'mist', tones: T6UP },
  // Charcoal ash: kosode crossover, tsuba, the hilt rim and the saya's lit px.
  dress: { ramp: 'cloth_ash', tones: T6 },
  // Cream: the charm, hilt diamonds, sclera, the zori thong.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Oxblood: the tuft cord and the sageo only (the obi is the sash, `ramps.trim`).
  trim: { ramp: 'gem_garnet', tones: T6 },
  // Straw zori + brass kashira (ochre): M 0 … L 5 lit toe.
  shoe: { ramp: 'cloth_ochre', tones: T6 },
  // Jade: pupil C 0, rim c 1, glint K 5.
  eye: { ramp: 'jade', tones: T6 },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

/**
 * Haori back panel: square shoulders 3 px past the shoulder joints (past the sleeve caps), a column to the hem 7 rows
 * under the hip, the hem ending in regular tapered wisps (3 → 2 → 1, 3 per side over the outer 12 px, clear of the
 * hakama), mist 4 with a mist-5 lit edge (every haori tone h 60–95: no pinkish mist 0–3 inside).
 */
export const HAORI: Cloak = {
  ramp: 'mist',
  shade: 4,
  top: 0,
  hemRow: 9,
  widths: { top: 12, hem: 13, shape: 'column' },
  shoulder: 'square',
  hem: { lobes: 0, wisps: { count: 3, length: 3, span: 12, tipShade: 4 } },
  bands: [],
  maxTrail: 2,
};

const RONIN_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: HEAD_AT, band: BAND },
  face: RONIN_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    neckAcc: { mask: COLLAR_Q34, at: [-5, 1] },
    hairBack: { mask: HAIR_BACK_Q34, at: [-9, -4] },
  },
  prop: {
    mask: SWORD_Q34,
    at: [-23, -4],
    hilt: { mask: HILT_Q34, at: [HILT_Q34_COL, 0] },
    over: 'hilt',
    dangle: { mask: CHARM_Q34, at: [19, 8], overHem: true },
  },
  farLegShade: 0,
};

export const RONIN: Body = {
  id: 'pixmates.ronin',
  name: 'ronin',
  layout: 'adult',
  build: 'male',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_umber',
    cloth: 'cloth_ash',
    clothAlt: 'cloth_ash',
    trim: 'gem_garnet',
    legs: 'hair_umber',
    tail: 'mist',
    tailTip: 'mist',
  },
  variants: { headAcc: 'none', hairBack: 'short', hem: 'skirt', back: 'cloak', neckAcc: 'collar', sleeves: 'long' },
  // Charcoal kosode (ash 1, the dark anchor); haori sleeves mist 4; dark ash kosode cuffs at the wrist.
  dressShade: 1,
  sleeve: { ramp: 'mist', shade: 5 },
  // Off-arm cuff: a light ash edge (no second dark band; art round 2 F5).
  cuff: { ramp: 'cloth_ash', shade: 4 },
  // Black-lacquer kote on the right forearm (rig side L) with 2 brass studs (never oxblood: hard rule 5).
  kote: { side: 'L', rows: 3, ramp: 'ink', shade: 1, stud: { ramp: 'cloth_ochre', shade: 4, count: 2 } },
  head: { mask: HEAD, at: HEAD_AT, band: BAND },
  face: RONIN_FACE,
  masks: { shoe: SHOE, neckAcc: { mask: COLLAR, at: [-5, 1] }, hairBack: { mask: HAIR_BACK, at: [-1, -4] } },
  // Oxblood obi, 3 rows, no knot.
  sash: { rows: 3, knot: { mask: [], at: [0, 0] } },
  hakama: { ramp: 'hair_umber', shade: 1, drop: 13 },
  skirtSplit: {
    // Split from ≈ 4 rows under the obi, a dark leg notch at the hem, 2 stiff pleats per leg, a narrower trapezoid.
    rows: 24,
    shade: 0,
    // A see-through gap between the legs from ≈ row 52 down (4 px wide), not umber-on-umber.
    notch: 12,
    notchHalf: 2,
    hemHalf: 10,
    pleats: { offsets: [3, 6], shade: 0, lit: 4 },
    rim: { shade: 2, lit: 4 },
    q34: { rows: 8, notch: 6, passNotch: 3, clear: true },
  },
  skirtLace: false,
  cloak: HAORI,
  // Katana worn over the haori (art round 2 F1): the saya breaks the silhouette on the wearer's left (screen-right).
  prop: {
    mask: SWORD_FRONT,
    at: [8, -5],
    hilt: { mask: HILT_FRONT, at: [-5, -5] },
    dangle: { mask: CHARM, at: [0, 2], overHem: true },
    over: 'all',
  },
  hairBackStretch: 0.2,
  sideLocks: false,
  despeckle: 'mist',
  tamoto: { shade: 5, lineShade: 3 },
  views: { q34: RONIN_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const RONIN_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createRoninPack = (): PackDef => ({ ...createRigPack(RONIN, animsFor(RONIN)), emotions: RONIN_EMOTIONS });
