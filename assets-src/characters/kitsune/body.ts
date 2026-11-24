// pixmates.kitsune — built-in fox-spirit boy (plan M-ART MA-28; design spec docs/art/kitsune.md, originality gate
// PASS 2026-11-24; ART-BIBLE §9/§11; ADR 005, 009, 010). Silver `fur_ash` mop with fox ears and two cowlicks, one
// oversized smooth fox tail with a cream tip, short teal scarf (2-segment ends, never below the chest row), short
// indigo wrap top with a crossover V, teal waist sash, indigo shorts, pale cream shin wraps, dark indigo tabi, an
// ivory side fox mask with teal markings (no red) on the screen-left temple, violet eyes, smirk with one fang. No
// orange, whisker marks, forehead plate, swirl symbol, vest, goggles or lower-face cloth (kitsune.md «Lookalikes»).
// Shared rig poses only; no persona or lines until M1.
import type { Outfit } from '../../lib/mask.ts';
import type { PackDef } from '../../lib/types.ts';
import { ANIMS } from '../../rig/anims/index.ts';
import { createRigPack } from '../../rig/compose.ts';
import type { Body, BodyView } from '../../rig/types.ts';
import { KITSUNE_FACE, KITSUNE_FACE_Q34 } from './face.ts';
import {
  BAND,
  SASH_KNOT,
  EARS,
  EARS_Q34,
  HAIR_FAR_Q34,
  HEAD,
  HEAD_Q34,
  SCARF,
  SCARF_Q34,
  SHOE,
  SHOE_Q34,
} from './masks.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'fur_ash', tones: T6UP },
  // The side mask: ivory face, outline 2 steps under it.
  horn: { ramp: 'horn', tones: T6UP },
  dress: { ramp: 'cloth_indigo', tones: T6 },
  // Cream: fang, highlights, the ear tufts.
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_teal', tones: T6 },
  shoe: { ramp: 'cloth_indigo', tones: T6 },
  eye: { ramp: 'hair_lilac', tones: T6 },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

/** Front tail: a brush S-curve rising behind the screen-right hip; 7-px widest, pale tip over the last 2 segments. */
const TAIL_FRONT = {
  // Art round MA-28-1: belly bulge low (at hip height), cream only on the last 2 points, root 1 px further out.
  radii: [2.4, 3.5, 3.0, 2.4, 1.9, 1.4],
  tipRadii: [2.0, 1.4],
  root: [2, 1],
  shine: true,
  length: 2.5,
  gravity: [0.08, -0.09],
  // S-curve: the middle bows out, the tip curls 1 px back toward the body.
  bend: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 0],
    [0, 0],
    [-1, 0],
  ],
} as const;

/** q34 tail: rooted at the trailing hip, rising ~1 px per 2 px back, the last point a 1-px up-curl. */
const TAIL_Q34 = {
  points: [
    [0, 0],
    [-4, -2],
    [-8, -4],
    [-12, -6],
    [-14, -8],
  ],
  radii: [1.5, 2.4, 3.0, 2.6, 1.8],
  tipRadii: [2.1, 1.6],
} as const;

const KITSUNE_Q34: BodyView = {
  head: { mask: HEAD_Q34, at: [-15, -14], band: BAND },
  face: KITSUNE_FACE_Q34,
  masks: {
    shoe: SHOE_Q34,
    headAcc: { mask: EARS_Q34, at: [-11, -4] },
    neckAcc: { mask: SCARF_Q34, at: [-4, 3] },
    hairFar: { mask: HAIR_FAR_Q34, at: [8, -1] },
  },
  // Scarf ends trail behind the nape.
  scarf: { at: [-4, 1], lengths: [4, 5] },
  sleeveHairLine: 'cloth_indigo',
  hideFarShoulder: true,
  sashKnot: { mask: SASH_KNOT, at: [-4, -3.5] },
  // Far shin one cream step under the near one with an outline where they touch (no merged pale patch on contact).
  farLegShade: 3,
  // Head anchor 1 px further back than the shared q34 rest (art round MA-28-1: kitsune sat ~1 px ahead of maid).
  tweaks: { head: { dx: -1, dy: 0 } },
};

export const KITSUNE: Body = {
  id: 'pixmates.kitsune',
  name: 'kitsune',
  outfit: OUTFIT,
  ramps: {
    hair: 'fur_ash',
    cloth: 'cloth_indigo',
    clothAlt: 'cloth_indigo',
    trim: 'cloth_teal',
    legs: 'cloth_cream',
    tail: 'fur_ash',
    tailTip: 'cloth_cream',
  },
  variants: {
    headAcc: 'fox_ears',
    hairBack: 'short',
    hem: 'shorts',
    back: 'fox_tail',
    neckAcc: 'scarf',
    sleeves: 'short',
  },
  // Indigo sleeves one step above the bodice (3): the value step keeps the arm readable over the torso.
  sleeve: { ramp: 'cloth_indigo', shade: 4 },
  head: { mask: HEAD, at: [-15, -14], band: BAND },
  face: KITSUNE_FACE,
  masks: {
    shoe: SHOE,
    headAcc: { mask: EARS, at: [-11, -4] },
    neckAcc: { mask: SCARF, at: [-4, 3] },
  },
  // Front scarf ends hang from under the knot (screen-right), 4 and 5 px.
  scarf: { at: [3, 4], lengths: [4, 5] },
  foxTail: { front: TAIL_FRONT, q34: TAIL_Q34 },
  // Short boy's mop: back hair ends at the nape, no procedural side-lock chains (the head mask's locks end mid-cheek).
  hairBackStretch: 0.2,
  // Tailored shorts 1 indigo step under the top, hem raised 2 rows; a darker wrap row on each shin.
  shorts: { shade: 2, raise: 2 },
  shinWrap: { row: 2, shade: 4 },
  sash: { rows: 2, knot: { mask: SASH_KNOT, at: [-4, -3.5] } },
  // The global outline next to the side mask in the hair outline ramp (no tan halo).
  hornOutline: 'fur_ash',
  sideLocks: false,
  views: { q34: KITSUNE_Q34 },
};

/** Manifest `emotions` (plan MA-32 content-integrity list): each is an animation of the pack. */
export const KITSUNE_EMOTIONS = ['happy', 'think', 'worried', 'startle'] as const;

export const createKitsunePack = (): PackDef => ({ ...createRigPack(KITSUNE, ANIMS), emotions: KITSUNE_EMOTIONS });
