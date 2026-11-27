// pixmates.ronin — D-20 armoured chibi samurai (MA-65, docs/art/ronin.md; ART-BIBLE §11.9 stern look, §11.10 menpō,
// §12 richness). A stylized archetype, not a portrait: a masterless samurai who kept his own armour — black-lacquer dō
// with vermilion odoshi lacing, square sode, kusazuri over an ash hakama, kote on both forearms, a red lacquer menpō
// with an original black whisker motif (down on happy / petted / sleep), umber chibi hair with a crown tuft, one katana
// at the hip. Frame 48 × 56, the chibi head from cefa873. Slots: `shoe` = lacquer_black, `horn` = lacquer_red, `trim` =
// cloth_ochre (studs, tsuba, straw zori), `dress` = cloth_ash (hilt wrap), `apron` = cream (grip, highlights).
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { RONIN_FACE, RONIN_FACE_Q34 } from './face.ts';
import {
  BAND,
  DO,
  DO_Q34,
  HAIR_BACK_Q34,
  HAIR_FAR_Q34,
  HEAD,
  HEAD_Q34,
  KUSAZURI,
  KUSAZURI_Q34,
  KUSAZURI_SEATED,
  MENPO,
  MENPO_DOWN,
  MENPO_Q34,
  SHOE,
  SHOE_Q34,
  SODE,
  SWORD,
  SWORD_Q34,
  THROAT,
  THROAT_Q34,
  TUFT,
  TUFT_Q34,
} from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_umber', tones: T6 },
  // Vermilion lacquer: menpō, odoshi lacing, throat guard, tuft cord.
  horn: { ramp: 'lacquer_red', tones: [0, 2, 3, 4, 5, 6] },
  dress: { ramp: 'cloth_ash', tones: T6 },
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_ochre', tones: T6 },
  // Black lacquer: dō, sode, kusazuri, saya, menpō whiskers; `L` = the hard spec streak (step 6).
  shoe: { ramp: 'lacquer_black', tones: [0, 1, 2, 3, 5, 6] },
  // Jade one step darker (tougher read), the 1 × 1 highlight `K` keeps the top step.
  eye: { ramp: 'jade', tones: [0, 0, 1, 2, 3, 5] },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const RONIN_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: RONIN_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    headAcc: { mask: TUFT_Q34, at: [-1, -1] },
    neckAcc: { mask: THROAT_Q34, at: [-4, 3] },
    hairFar: { mask: HAIR_FAR_Q34, at: [9, -1] },
    hairBack: { mask: HAIR_BACK_Q34, at: [-12, -4] },
  },
  prop: { mask: SWORD_Q34, at: [-14, -11.5] },
  torsoMask: { mask: DO_Q34, at: [-5, 2] },
  tassets: { front: { mask: KUSAZURI_Q34, at: [-6, -5.5] } },
  sode: { mask: SODE, at: [-4, -1] },
  hideFarShoulder: true,
  farLegShade: 2,
  tweaks: { head: { dx: -1, dy: 0 } },
};

export const RONIN: Body = {
  id: 'pixmates.ronin',
  name: 'ronin',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_umber',
    cloth: 'cloth_ash',
    clothAlt: 'cloth_ash',
    // The obi (waist band) in vermilion.
    trim: 'lacquer_red',
    legs: 'cloth_ash',
    tail: 'cloth_ash',
    tailTip: 'cloth_ash',
  },
  variants: { headAcc: 'clip', hairBack: 'short', hem: 'skirt', back: 'none', neckAcc: 'collar', sleeves: 'long' },
  dressShade: 3,
  // Kosode sleeves (ash) under the armour; black lacquer cuffs + kote on both forearms, brass studs on the near one.
  sleeve: { ramp: 'cloth_ash', shade: 4 },
  cuff: { ramp: 'lacquer_black', shade: 1 },
  kote: {
    side: 'L',
    both: true,
    rows: 2,
    ramp: 'lacquer_black',
    shade: 1,
    stud: { ramp: 'cloth_ochre', shade: 4, count: 2 },
  },
  // Black lacquer on a dark IDE: a lighter outline on the lit side.
  silhouetteOutline: [{ ramp: 'lacquer_black', lit: 4, shade: 3 }],
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: RONIN_FACE,
  masks: {
    shoe: SHOE,
    headAcc: { mask: TUFT, at: [-1, -1] },
    neckAcc: { mask: THROAT, at: [-4, 3] },
  },
  // Obi: 2 vermilion rows under the dō.
  sash: { rows: 2, knot: { mask: [], at: [0, 0] }, dy: 3 },
  torsoMask: { mask: DO, at: [-5, 2] },
  tassets: { front: { mask: KUSAZURI, at: [-7, -5.5] }, seated: { mask: KUSAZURI_SEATED, at: [-7, -5.5] } },
  sode: { mask: SODE, at: [-4, -1] },
  mask: {
    front: { mask: MENPO, at: [0, 10] },
    q34: { mask: MENPO_Q34, at: [0, 10] },
    down: { mask: MENPO_DOWN, at: [-3, 3] },
    downExpressions: ['happy', 'petted', 'sleep'],
  },
  skirtSplit: {
    rows: 9,
    shade: 0,
    notch: 4,
    notchShade: 0,
    hemHalf: 8,
    pleats: { offsets: [3, 6], shade: 2, lit: 5 },
    rim: { shade: 4, lit: 5 },
    q34: { rows: 5, notch: 4, passNotch: 2, pleat: 2 },
  },
  skirtLace: false,
  prop: { mask: SWORD, at: [-15, -10.5] },
  hairBackStretch: 0.15,
  sideLocks: false,
  views: { q34: RONIN_Q34 },
};

export const RONIN_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createRoninPack = (): PackDef => ({ ...createRigPack(RONIN, ANIMS), emotions: RONIN_EMOTIONS });
