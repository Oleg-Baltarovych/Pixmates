// pixmates.ronin — built-in calm spirit swordsman (plan M-ART MA-29b; design spec docs/art/ronin.md, originality gate
// PASS 2026-11-24; ART-BIBLE §9–11; ADR 005, 009, 010). A stylized archetype, not a portrait: short warm `hair_umber`
// chibi dome with pointed fringe clumps and 2-px side locks (no ponytail, topknot or tie), a knee-length warm
// dove-ivory `mist` cloak (owner colourway B) with cloud-lobed hem, kasumi bands and corner wisps (`back: 'cloak'`),
// a flat squared mist mantle (`neckAcc: 'collar'`), an ash-grey (`cloth_ash`) kosode and hakama with a centre split,
// an ochre obi, one sheathed sword on his left hip with a paper charm on the cord (`Body.prop`), zori on warm bare feet
// and calm jade tareme eyes. Feet and warm skin always show (no yurei read). Shared rig poses only.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView, Cloak } from '../../rig/types.ts';
import { RONIN_FACE, RONIN_FACE_Q34 } from './face.ts';
import {
  BAND,
  CHARM,
  CHARM_Q34,
  COLLAR,
  COLLAR_Q34,
  HAIR_BACK_Q34,
  HAIR_FAR_Q34,
  HEAD,
  HEAD_Q34,
  SHOE,
  SHOE_Q34,
  SWORD,
  SWORD_Q34,
} from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  // Splits J 0, shadow j 1, mass h 2 / H 3, angel ring y/Y 4/5 (warm, lit left; 6 read as a cream headband).
  hair: { ramp: 'hair_umber', tones: [0, 1, 2, 3, 4, 5] },
  // The mantle (horn letters → mist): n 2, o 3 (curls), O 4 (panel), u 5 (lit top).
  horn: { ramp: 'mist', tones: T6UP },
  // Ash: kosode collar in the throat V, saya, kashira.
  dress: { ramp: 'cloth_ash', tones: T6 },
  // Cream: the charm, grip diamonds, sclera, highlights, zori strap, the collar underlayer.
  apron: { ramp: 'cloth_cream', tones: T6 },
  // Ochre: tsuba and the charm cord.
  trim: { ramp: 'cloth_ochre', tones: T6 },
  // Zori: umber sole 0–3, lit toe 5.
  shoe: { ramp: 'hair_umber', tones: T6 },
  // Jade: pupil C 0, iris c 1 → i 2 → I 3 → k 4, lower highlight K 5.
  eye: { ramp: 'jade', tones: T6 },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

/** §1 / §7 R1: knee-length bell panel (owner), 3 cloud lobes per side, wisp corners, two kasumi bands + dither. */
const CLOAK: Cloak = {
  ramp: 'mist',
  shade: 4,
  litShade: 5,
  top: 0,
  // Knee length (owner, art round 1): hem on the hip row, so the split hakama legs read as trousers under it.
  hemRow: 0,
  widths: { top: 8, hem: 12, shape: 'bell' },
  shoulder: 'square',
  hem: { lobes: 3, curl: 2, curlShade: 2 },
  // A mist-2 column where the panel meets the hakama / legs (the pale cloak never fuses with them).
  innerShade: 2,
  bands: [
    { row: 6, shade: 5 },
    { row: 3, shade: 5 },
  ],
  dither: { rows: [5, 4], shades: [3, 4] },
  maxTrail: 3,
};

const RONIN_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: RONIN_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    // 1 row lower than front: the q34 chin point is 1 row longer (top ≥ 2 rows under it).
    neckAcc: { mask: COLLAR_Q34, at: [-9, 5] },
    hairFar: { mask: HAIR_FAR_Q34, at: [9, -1] },
    // Authored short nape instead of the procedural mass (a bob at 1×): q34 back-hair stretch is moot (0).
    hairBack: { mask: HAIR_BACK_Q34, at: [-12, -4] },
  },
  prop: { mask: SWORD_Q34, at: [-14, -11.5], dangle: { mask: CHARM_Q34, at: [19, 5], overHem: true } },
  // The far shoulder puff sits behind the neck and mantle (no back-hair mass covers it with the far lock).
  hideFarShoulder: true,
  farLegShade: 2,
  // Head 1 px back (ronin.md §6.6): without the bob mass the head would overhang the torso front (steady, every frame).
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
    trim: 'cloth_ochre',
    legs: 'cloth_ash',
    tail: 'mist',
    tailTip: 'mist',
  },
  variants: { headAcc: 'none', hairBack: 'short', hem: 'skirt', back: 'cloak', neckAcc: 'collar', sleeves: 'long' },
  // Kosode ash 3, sleeves one step lighter (4), dark ash 1 cuffs with the hands fully visible (art round 1: cream
  // cuffs read as a blouse; ash avoids the isolated-mist-px problem of mist cuffs).
  dressShade: 3,
  sleeve: { ramp: 'cloth_ash', shade: 4 },
  cuff: { ramp: 'cloth_ash', shade: 1 },
  // White window: the pale cloak relies on its mist 1 outline (lit side mist 2).
  silhouetteOutline: [{ ramp: 'mist', lit: 2, shade: 1 }],
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: RONIN_FACE,
  masks: { shoe: SHOE, neckAcc: { mask: COLLAR, at: [-9, 4] } },
  // Ochre 2-row obi, no knot, 2 rows lower: the ash kosode shows between the mantle and the obi.
  sash: { rows: 2, knot: { mask: [], at: [0, 0] }, dy: 2 },
  // Hakama (trousers, not a bell): a trapezoid hem (torso + ≤ 3 px per side), an ash-0 centre split from 2 rows
  // under the obi, a 4-row leg notch in ash 0, 2 ash-2 pleats per leg (lit ash-5 px on the left leg) and the 2-step
  // left rim (ash 4, lit steps ash 5) for dark IDEs.
  skirtSplit: {
    rows: 9,
    shade: 0,
    notch: 4,
    notchShade: 0,
    hemHalf: 8,
    pleats: { offsets: [3, 6], shade: 2, lit: 5 },
    rim: { shade: 4, lit: 5 },
    // q34 (art round 2): two leg panels — split line + 4-row notch on contact frames, 2-row notch when passing.
    q34: { rows: 5, notch: 4, passNotch: 2, pleat: 2 },
  },
  // A plain hakama hem: no petticoat lace (a lighter scalloped row reads as a frilled skirt).
  skirtLace: false,
  cloak: CLOAK,
  // The charm hangs 2 px inboard, over the ash hakama.
  prop: { mask: SWORD, at: [-15, -10.5], dangle: { mask: CHARM, at: [19, 6], overHem: true } },
  // Short layered nape, no procedural side-lock chains (the head mask's locks end at the jaw).
  // Deviation: 0.15, not 0.3 — the longer nape framed the face as a bob at 1× (male read).
  hairBackStretch: 0.15,
  sideLocks: false,
  views: { q34: RONIN_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const RONIN_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createRoninPack = (): PackDef => ({ ...createRigPack(RONIN, ANIMS), emotions: RONIN_EMOTIONS });
