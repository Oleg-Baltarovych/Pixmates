// pixmates.vampire — MA-68 (docs/art/vampire.md, owner pick 2026-11-27: variant A + C's fan collar + a widow's peak,
// D-23): a chibi aristocrat count. Midnight slate-blue cloak, waistcoat and trousers (`cloth_midnight`), the old-gold
// fan collar face, 2 buttons, cloak corners and buckle (`cloth_ochre`, inside the costume only — never edge trim),
// cream shirt and ascot with a moonstone brooch, crimson eyes (`fx_red` 1–4, never a glow), paired fangs, short
// `hair_black` slicked back from a high forehead with a widow's peak. Normal face.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { VAMPIRE_FACE, VAMPIRE_FACE_Q34 } from './face.ts';
import * as M from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;
const HEAD_AT = [-15, -14] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_black', tones: [0, 0, 1, 2, 5, 6] },
  horn: { ramp: 'cloth_ochre', tones: T6 },
  dress: { ramp: 'cloth_midnight', tones: T6 },
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_ochre', tones: T6 },
  shoe: { ramp: 'cloth_midnight', tones: [0, 1, 2, 3, 4, 6] },
  eye: { ramp: 'fx_red', tones: [0, 1, 2, 3, 4, 4] },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const Q34: BodyView = {
  head: { mask: M.HEAD_Q34, at: HEAD_AT, band: M.BAND },
  face: VAMPIRE_FACE_Q34,
  masks: { shoe: M.SHOE_Q34, neckAcc: { mask: M.COLLAR_Q34, at: M.COLLAR_AT } },
  torsoMask: { mask: M.CHEST_Q34, at: [-7, 0] },
  hideFarShoulder: true,
  farLegShade: 2,
  tweaks: { head: { dx: -1, dy: 0 } },
};

export const VAMPIRE: Body = {
  id: 'pixmates.vampire',
  name: 'vampire',
  outfit: OUTFIT,
  ramps: {
    hair: 'hair_black',
    cloth: 'cloth_midnight',
    clothAlt: 'cloth_midnight',
    trim: 'cloth_ochre',
    legs: 'cloth_midnight',
    tail: 'cloth_midnight',
    tailTip: 'cloth_ochre',
  },
  variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'cloak', neckAcc: 'collar', sleeves: 'long' },
  dressShade: 4,
  // Sleeves midnight 3: a value step over the cloak (2) and under the waistcoat (4), so the arms read on both.
  sleeve: { ramp: 'cloth_midnight', shade: 3 },
  sleeveRim: 4,
  cuff: { ramp: 'cloth_cream', shade: 4 },
  silhouetteOutline: [
    { ramp: 'cloth_midnight', lit: 5, shade: 3 },
    { ramp: 'hair_black', lit: 5, shade: 4 },
  ],
  head: { mask: M.HEAD, at: HEAD_AT, band: M.BAND },
  face: VAMPIRE_FACE,
  masks: { shoe: M.SHOE, neckAcc: { mask: M.COLLAR, at: M.COLLAR_AT } },
  torsoMask: { mask: M.CHEST, at: [-6, 0] },
  sash: { rows: 1, knot: { mask: [], at: [0, 0] } },
  shorts: { shade: 3, raise: 0 },
  hairBackStretch: 0.2,
  sideLocks: false,
  /** Knee-length straight column, square shoulders, straight hem, 2 × 3 gold turned-back corners 1 px inside the edge. */
  cloak: {
    ramp: 'cloth_midnight',
    shade: 2,
    litShade: 3,
    top: 0,
    hemRow: 4,
    widths: { top: 11, hem: 11, shape: 'column' },
    shoulder: 'square',
    hem: { lobes: 0, cornerDrop: 1 },
    bands: [],
    innerShade: 1,
    lining: { ramp: 'cloth_ochre', shade: 3, corner: [2, 3], inset: 1 },
    flareRows: 1,
  },
  views: { q34: Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const VAMPIRE_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createVampirePack = (): PackDef => ({ ...createRigPack(VAMPIRE, ANIMS), emotions: VAMPIRE_EMOTIONS });
