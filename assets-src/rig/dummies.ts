// Test and review bodies for the rig (plan M-ART MA-23…MA-26): `rig-dummy-a` (biped: short hair, shorts, hair clip,
// bow) and `rig-dummy-b` (biped + fox ears + fox tail: long hair, skirt, choker, long sleeves), plus
// `rig-maid48-preview` (the 48-soft spike maid's masks on the rig, so art-director can judge the shared poses on her
// before MA-27). None of these is built into resources/; tests and `pnpm sprites:sheet --review` use them.
// The head, bow, shoe and spade masks come from the spike rig until MA-27 moves the maid's masks into
// assets-src/characters/maid/ (the dummies then take a copy before MA-31 deletes the spike).
import type { Point } from '../lib/chain.ts';
import { LEGEND, type Mask, type Outfit } from '../lib/mask.ts';
import type { PackDef } from '../lib/types.ts';
import { RIG_48 } from '../spike/maid-48/rig.ts';
import { ANIMS } from './anims/index.ts';
import { createRigPack } from './compose.ts';
import { irisShift, type FaceLibrary, type FacePart } from './face.ts';
import { STERN_FACE } from './faces/stern.ts';
import { deriveQ34Face, deriveQ34Head, deriveQ34Shoe } from './q34.ts';
import type { Body, BodyView } from './types.ts';

const T6 = [0, 1, 2, 3, 4, 5] as const;
const T6UP = [1, 2, 3, 4, 5, 6] as const;

const outfit = (over: Partial<Outfit>): Outfit => ({
  skin: { ramp: 'skin', tones: T6UP },
  hair: { ramp: 'hair_lilac', tones: T6UP },
  horn: { ramp: 'horn', tones: T6UP },
  dress: { ramp: 'cloth_teal', tones: T6 },
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_rose', tones: T6 },
  shoe: { ramp: 'hair_plum', tones: T6 },
  eye: { ramp: 'cloth_ochre', tones: T6 },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 4, 3, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
  ...over,
});

/** The spike head without its horns (rows 0–4: horn and horn-base px removed). */
const HORNLESS: Mask = RIG_48.head.mask.map((row, y) =>
  y > 4
    ? row
    : row
        .split('')
        .map((ch) => {
          const slot = LEGEND[ch]?.[0];
          return slot === 'horn' || slot === 'shoe' ? '.' : ch;
        })
        .join(''),
);
/** Head mask top-left relative to the head joint (spike head at 9,0; head joint 24,14). */
const HEAD_AT: Point = [-15, -14];
export const DUMMY_HEAD = { mask: HORNLESS, faceAt: [5, 12] as Point };

const neutral = RIG_48.face.neutral;
const rows = (mask: Mask, from: number, to: number): Mask => mask.slice(from, to + 1);
const OPEN = rows(neutral, 3, 8);
const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });
/** Left eye of OPEN with the right eye squeezed shut (`<`). */
const WINCE: Mask = OPEN.map((r, y) => {
  const squeeze = ['', '.....X....', '...XX.....', '.....X....', '', ''][y] ?? '';
  return (r.slice(0, 10) + squeeze.padEnd(10, '.').split('').reverse().join('')).slice(0, 20);
});

/** Face library derived from the 48-soft spike face (RIG_48.face), extended to every expression. */
export const DUMMY_FACE: FaceLibrary = {
  eyes: {
    open: part(OPEN, 0, 3),
    low: part(OPEN, 0, 4),
    glance: part(OPEN, 1, 3),
    /** idle_a glance: irises/pupils 1 px toward screen-right, lashes and shine in place. */
    side: part(irisShift(OPEN), 0, 3),
    closed: part(rows(RIG_48.face.blink, 6, 7), 0, 6),
    half: part(['..XXXXX......XXXXX..', '..piXXi......iXXip..', '...IIpI......IIpI...', '....II........II....'], 0, 5),
    happy: part(rows(RIG_48.face.happy, 4, 6), 0, 4),
    startle: part(
      [
        '...X............X...',
        '....XX........XX....',
        '......X......X......',
        '....XX........XX....',
        '...X............X...',
      ],
      0,
      4,
    ),
    wince: part(WINCE, 0, 3),
  },
  brows: {
    worried: part(['.....xX......Xx.....', '...xX..........Xx...'], 0, 2),
  },
  mouths: {
    smile: part(rows(neutral, 10, 11), 0, 10),
    talk_a: part(['.........XX.........'], 0, 11),
    talk_b: part(['........xXXx........', '.........gg.........'], 0, 11),
    talk_c: part(['.........XX.........', '........XggX........', '.........XX.........'], 0, 10),
    happy: part(rows(RIG_48.face.happy, 11, 12), 0, 11),
    frown: part(['.........XX.........', '........x..x........'], 0, 11),
    flat: part(['..........XXx.......'], 0, 11),
    small_o: part(['.........xx.........', '.........xx.........'], 0, 11),
  },
  cheeks: {
    none: part([], 0, 9),
    soft: part(RIG_48.face.cheeks, 0, 0),
    strong: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
  },
  expressions: {
    neutral: { eyes: 'open', mouth: 'smile', cheeks: 'soft' },
    blink: { eyes: 'closed', mouth: 'smile', cheeks: 'soft' },
    half: { eyes: 'half', mouth: 'talk_a', cheeks: 'soft' },
    talk_a: { eyes: 'open', mouth: 'talk_a', cheeks: 'soft' },
    talk_b: { eyes: 'open', mouth: 'talk_b', cheeks: 'soft' },
    talk_c: { eyes: 'open', mouth: 'talk_c', cheeks: 'soft' },
    happy: { eyes: 'happy', mouth: 'happy', cheeks: 'soft' },
    worried: { eyes: 'low', brows: 'worried', mouth: 'frown', cheeks: 'none' },
    think: { eyes: 'glance', mouth: 'flat', cheeks: 'soft' },
    sleep: { eyes: 'closed', mouth: 'small_o', cheeks: 'soft' },
    startle: { eyes: 'startle', mouth: 'talk_c', cheeks: 'none' },
    petted: { eyes: 'happy', mouth: 'smile', cheeks: 'strong' },
    wince: { eyes: 'wince', mouth: 'flat', cheeks: 'soft' },
    glance: { eyes: 'side', mouth: 'smile', cheeks: 'soft' },
  },
};

const EAR: Mask = ['.U....', '.uO...', '.uFO..', 'uFFoO.', 'uFfoOn', 'oooOnn', '..oonn'];
const FOX_EARS: Mask = EAR.map((r) => r + '..........' + r.split('').reverse().join(''));
/** q34 fox ears: near (screen-left) ear full, far ear 2 px narrower and 1 px lower. */
const FAR_EAR: Mask = [
  '....',
  ...EAR.map((r) => r.split('').reverse().join('').slice(0, 1) + r.split('').reverse().join('').slice(3)),
];
const Q34_EARS: Mask = FAR_EAR.map((far, y) => (EAR[y] ?? '......') + '............' + far);

/** q34 parts derived from the dummy front masks (assets-src/rig/q34.ts); the clip moves to the near side. */
const dummyQ34 = (headMask: Mask, masks: Omit<BodyView['masks'], 'shoe'>): BodyView => ({
  head: { mask: deriveQ34Head(headMask), at: HEAD_AT, band: RIG_48.band },
  face: deriveQ34Face(DUMMY_FACE),
  masks: { shoe: deriveQ34Shoe(RIG_48.shoe.mask), ...masks },
});

export const DUMMY_A: Body = {
  id: 'rig-dummy-a',
  name: 'rig dummy A (biped)',
  outfit: outfit({ hair: { ramp: 'hair_ash', tones: T6UP } }),
  ramps: {
    hair: 'hair_ash',
    cloth: 'cloth_teal',
    clothAlt: 'cloth_ochre',
    trim: 'cloth_rose',
    legs: 'skin',
    tail: 'hair_plum',
    tailTip: 'cloth_cream',
  },
  variants: { headAcc: 'clip', hairBack: 'short', hem: 'shorts', back: 'none', neckAcc: 'bow', sleeves: 'short' },
  head: { mask: HORNLESS, at: HEAD_AT, band: RIG_48.band },
  face: DUMMY_FACE,
  masks: {
    shoe: RIG_48.shoe.mask,
    headAcc: { mask: ['.rt', 'rtg', '.g.'], at: [6, 4] },
    neckAcc: { mask: RIG_48.bow.mask, at: [-3, 3] },
  },
  views: {
    q34: dummyQ34(HORNLESS, {
      headAcc: { mask: ['.rt', 'rtg', '.g.'], at: [-10, 4] },
      neckAcc: { mask: RIG_48.bow.mask, at: [-2, 3] },
    }),
  },
};

export const DUMMY_B: Body = {
  id: 'rig-dummy-b',
  name: 'rig dummy B (biped + fox ears + tail)',
  outfit: outfit({ horn: { ramp: 'fur_fox', tones: T6 } }),
  ramps: {
    hair: 'hair_lilac',
    cloth: 'cloth_teal',
    clothAlt: 'cloth_cream',
    trim: 'cloth_rose',
    legs: 'hair_plum',
    tail: 'fur_fox',
    tailTip: 'fur_snow',
  },
  variants: {
    headAcc: 'fox_ears',
    hairBack: 'long',
    hem: 'skirt',
    back: 'fox_tail',
    neckAcc: 'choker',
    sleeves: 'long',
  },
  head: { mask: HORNLESS, at: HEAD_AT, band: RIG_48.band },
  face: DUMMY_FACE,
  masks: {
    shoe: RIG_48.shoe.mask,
    headAcc: { mask: FOX_EARS, at: [-11, -4] },
    neckAcc: { mask: ['gtTTtg', '..rr..'], at: [-3, 2] },
  },
  views: {
    q34: dummyQ34(HORNLESS, {
      headAcc: { mask: Q34_EARS, at: [-11, -4] },
      neckAcc: { mask: ['gtTtg', '..rr.'], at: [-2, 2] },
    }),
  },
};

/** The spike maid's masks (horns, bow, spade tail) driven by the rig: a preview, not the MA-27 final. */
export const MAID_PREVIEW: Body = {
  id: 'rig-maid48-preview',
  name: 'maid 48 soft on the rig (preview)',
  outfit: outfit({}),
  ramps: {
    hair: 'hair_lilac',
    cloth: 'cloth_teal',
    clothAlt: 'cloth_cream',
    trim: 'cloth_rose',
    legs: 'hair_plum',
    tail: 'hair_plum',
    tailTip: 'hair_plum',
  },
  variants: { headAcc: 'horns', hairBack: 'short', hem: 'skirt', back: 'spade_tail', neckAcc: 'bow', sleeves: 'short' },
  head: { mask: RIG_48.head.mask, at: HEAD_AT, band: RIG_48.band },
  face: DUMMY_FACE,
  masks: {
    shoe: RIG_48.shoe.mask,
    neckAcc: { mask: RIG_48.bow.mask, at: [-3, 3] },
    spade: RIG_48.spade,
  },
  hornOutline: 'hair_plum',
  views: { q34: dummyQ34(RIG_48.head.mask, { neckAcc: { mask: RIG_48.bow.mask, at: [-2, 3] } }) },
};

/** Stern-look review body (MA-62): dummy B with the shared stern kit (front only; its q34 face stays the dummy one). */
export const DUMMY_STERN: Body = { ...DUMMY_B, id: 'rig-dummy-stern', name: 'Rig dummy (stern)', face: STERN_FACE };

/** Review packs for `pnpm sprites:sheet --review` (never written to resources/). */
export const reviewPacks = (): PackDef[] =>
  [DUMMY_A, DUMMY_B, DUMMY_STERN, MAID_PREVIEW].map((b) => createRigPack(b, ANIMS));
