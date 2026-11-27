// pixmates.witch — built-in unsure apprentice witch (plan M-ART MA-29a; design spec docs/art/witch.md, originality
// gate PASS 2026-11-24; ART-BIBLE §9/§11; ADR 005, 009, 010). A stylized archetype, not a portrait: a compact slouched
// moss hat with a bent, singed tip (`headAcc: 'hat'`, the tip droops while the head rises — R-W3), soft auburn
// `hair_copper` to mid-back, a moss (`cloth_moss`) A-line robe-dress with bell sleeves and visible hands, ochre cuffs,
// belt and tights with a sock row, a two-lobe cream collar, a rose potion vial on the hip (the only rose besides the
// blush), short brown boots, leaf-green downturned eyes. Owner decisions 2026-11-24: colourway A "moss and ember",
// hat-tip droop now, mustard tights with a sock row. Shared rig poses only; no props.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { WITCH_FACE, WITCH_FACE_Q34 } from './face.ts';
import {
  BAND,
  COLLAR,
  COLLAR_Q34,
  HAT,
  HAT_Q34,
  HAT_Q34_RISING,
  HAT_RISING,
  HAIR_FAR_Q34,
  HEAD,
  HEAD_Q34,
  SHOE,
  SHOE_Q34,
  VIAL,
  VIAL_Q34,
} from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;
/** Hat placement from the `acc` joint in both views (top px at figure row −1 at rest). */
const HAT_AT = [-14, -4] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  // §2 shade map: splits J 0, shadow j 1, mid h 2, lit clumps H 3, ring y/Y 5/6 (steps 4+ only in the ring: auburn).
  hair: { ramp: 'hair_copper', tones: [0, 1, 2, 3, 5, 6] },
  // Boots' cork / patch stitch.
  horn: { ramp: 'horn', tones: T6UP },
  // The hat (moss, lit top-left).
  dress: { ramp: 'cloth_moss', tones: T6 },
  // Cream: collar, hat patch, vial glass, sclera and highlights.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Ochre: the hat's ember px and the collar clasp.
  trim: { ramp: 'cloth_ochre', tones: T6 },
  // Short brown boots: m 0, b 1, B 2, l 3 (sole rim), L 5 (lit toe).
  shoe: { ramp: 'horn', tones: [0, 0, 1, 2, 3, 5] },
  // Leaf green (spec): C = moss 1 (under the lash centre), c 2 → i 3 → I 4 → k 5.
  eye: { ramp: 'cloth_moss', tones: [1, 2, 3, 4, 5, 6] },
  // Blush and the potion.
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const WITCH_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: WITCH_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    headAcc: { mask: HAT_Q34, at: HAT_AT },
    headAccRising: HAT_Q34_RISING,
    neckAcc: { mask: COLLAR_Q34, at: [-3, 3] },
    hairFar: { mask: HAIR_FAR_Q34, at: [8, -1] },
  },
  sashKnot: { mask: VIAL_Q34, at: [-2, -10] },
  // Clump tips cut into the straight back edge (rows from the head joint) + a nape indent at the collar row.
  hairBackCuts: { rows: [8, 12, 16], nape: 3 },
  hideFarShoulder: true,
  farLegShade: 2.6,
  hairTipLag: true,
};

export const WITCH: Body = {
  id: 'pixmates.witch',
  name: 'witch',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_copper',
    cloth: 'cloth_moss',
    clothAlt: 'cloth_moss',
    trim: 'cloth_ochre',
    legs: 'cloth_ochre',
    tail: 'hair_copper',
    tailTip: 'hair_copper',
  },
  variants: { headAcc: 'hat', hairBack: 'long', hem: 'skirt', back: 'none', neckAcc: 'choker', sleeves: 'long' },
  // Sleeves one step over the bodice (3) on the moss ramp; ochre bell cuffs, hands visible.
  sleeve: { ramp: 'cloth_moss', shade: 4 },
  cuff: { ramp: 'cloth_ochre', shade: 4 },
  // Dark IDE: the lit-side hair outline one step up (hair 1), elsewhere the floor (no halo).
  silhouetteOutline: [{ ramp: 'hair_copper', lit: 1, shade: 0 }],
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: WITCH_FACE,
  masks: {
    shoe: SHOE,
    headAcc: { mask: HAT, at: HAT_AT },
    headAccRising: HAT_RISING,
    neckAcc: { mask: COLLAR, at: [-4, 3] },
  },
  // Ochre 1-row belt with the potion vial as the knot on the near (screen-left) hip.
  // Hung from the belt at the hip (cork 1 row under the belt), ≥ 1 moss px inboard of the hand.
  sash: { rows: 1, knot: { mask: VIAL, at: [-4, -10] } },
  // Mustard tights with a darker sock-top row.
  shinWrap: { row: 2, shade: 1 },
  // 4 rows of tights show under the hem (incl. the sock row), lit side ochre 4.
  skirtRaise: 2,
  legRim: 4,
  hairBackStretch: 1.15,
  views: { q34: WITCH_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const WITCH_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createWitchPack = (): PackDef => ({ ...createRigPack(WITCH, ANIMS), emotions: WITCH_EMOTIONS });
