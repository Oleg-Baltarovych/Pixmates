// FX marks (plan M-ART MA-26, ART-BIBLE §11.6): anime emotion marks drawn over the head at the rig's `fx` anchor
// (and the blush hatching on the cheeks). Authored masks in the shared legend, painted through FX_OUTFIT, each mark
// gets a 1-px outline in one tone. Glyphs («?», «!», ^^, ><) are cream with a dark coloured outline (a dark
// interior would read as a hollow ring on dark IDEs); coloured marks get their own darkest tone so they hold on
// white. The anger vein is the four-curve cross mark in `fx_red`, self-outlined (a ring would close its centre gap)
// and placed low-left in its frame so it lands on the temple from the `fx` anchor. Built into resources/fx/ by `pnpm sprites`;
// not shipped or loaded until M1.
import type { Mask, Outfit, Slot, Tone } from '../lib/mask.ts';

/** FX frame side (px); marks themselves are ≤ 7 × 7 (smoke and zzz drift over the frame). */
export const FX_FRAME = 16;

export interface FxStamp {
  readonly mask: Mask;
  readonly x: number;
  readonly y: number;
}

export interface FxMark {
  readonly name: string;
  readonly fps: number;
  readonly loop: boolean;
  /** Outline tone (slot, tone) around every filled px; null = the mask carries its own edge. */
  readonly outline: readonly [Slot, Tone] | null;
  readonly frames: readonly (readonly FxStamp[])[];
}

const T6 = [0, 1, 2, 3, 4, 5] as const;
export const FX_OUTFIT: Outfit = {
  skin: { ramp: 'skin', tones: T6 },
  hair: { ramp: 'hair_lilac', tones: [0, 1, 3, 4, 5, 6] },
  /** Anger-vein red (no FX mark uses horn). */
  horn: { ramp: 'fx_red', tones: T6 },
  dress: { ramp: 'fur_snow', tones: T6 },
  apron: { ramp: 'cloth_cream', tones: T6 },
  trim: { ramp: 'cloth_rose', tones: T6 },
  shoe: { ramp: 'hair_ash', tones: T6 },
  eye: { ramp: 'cloth_teal', tones: [0, 1, 3, 4, 5, 6] },
  blush: { ramp: 'cloth_rose', tones: [3, 3, 3, 2, 3, 3] },
  ink: { ramp: 'ink', tones: [0, 1, 2, 3, 4, 4] },
};

const DROP: Mask = ['.i..', '.ii.', 'iKii', 'iKiI', 'iiII', '.II.'];
/** Four curved brackets around an open cross, each bowed toward the centre with its tips flicking out; red rim on
 * the inner side, dark-red body on the outer side. */
const VEIN_BASE: Mask = [
  '..O...O..',
  '..nO.On..',
  'OnnO.OnnO',
  '.OO...OO.',
  '.........',
  '.OO...OO.',
  'OnnO.OnnO',
  '..nO.On..',
  '..O...O..',
];
/** The 8 outer tip px (flick ends) sit one tone higher so they hold on dark wallpaper (art round 5, A2). */
const VEIN_TIPS: readonly (readonly [number, number])[] = [
  [2, 0],
  [6, 0],
  [0, 2],
  [8, 2],
  [0, 6],
  [8, 6],
  [2, 8],
  [6, 8],
];
const withTips = (mask: Mask, tip: string): Mask =>
  mask.map((r, y) =>
    r
      .split('')
      .map((ch, x) => (VEIN_TIPS.some(([tx, ty]) => tx === x && ty === y) ? tip : ch))
      .join(''),
  );
const VEIN: Mask = withTips(VEIN_BASE, 'u');
/** Pulse: the inner stroke flares hot. */
const VEIN_HOT: Mask = withTips(
  VEIN_BASE.map((r) => r.replaceAll('O', 'u')),
  'U',
);
const HATCH: Mask = ['..F.F.F', '.F.F.F.', 'F.F.F..'];
const HATCH_SOFT: Mask = ['..f.F.f', '.f.F.f.', 'f.F.f..'];
const CARET: Mask = ['..P..', '.P.P.', 'P...P'];
const CHEVRON: Mask = ['P...', '.PP.', '...P', '.PP.', 'P...'];
const Z4: Mask = ['yyyy', '..h.', '.h..', 'hhhh'];
const Z3: Mask = ['yyy', '.h.', 'hhh'];
const HEART_BIG: Mask = ['.TT.TT.', 'TrTTTTT', 'TTTTTTt', '.TTTTt.', '..TTt..', '...t...'];
const HEART_SMALL: Mask = ['.T.T.', 'TrTTt', '.TTt.', '..t..'];
const QUESTION: Mask = ['.PPP.', 'P...P', '....P', '..PP.', '..P..', '.....', '..P..'];
const EXCLAIM: Mask = ['PP', 'PP', 'PP', 'PP', '..', 'PP'];

/** A round puff of radius r (light fur_snow, shaded lower right); `bite` removes px where (x·3 + y·5) % bite == 0. */
function puff(r: number, bite = 0): Mask {
  const rows: string[] = [];
  for (let y = -r; y <= r; y++) {
    let row = '';
    for (let x = -r; x <= r; x++) {
      const inside = x * x + y * y <= r * r + r * 0.6;
      const eaten = bite > 0 && ((x + r) * 3 + (y + r) * 5) % bite === 0;
      row += !inside || eaten ? '.' : x + y > r * 0.6 ? 'v' : x + y < -r * 0.6 ? 'w' : 'd';
    }
    rows.push(row);
  }
  return rows;
}
const at = (mask: Mask, cx: number, cy: number): FxStamp => {
  const w = Math.max(...mask.map((r) => r.length));
  return { mask, x: cx - (w >> 1), y: cy - (mask.length >> 1) };
};

export const FX_MARKS: readonly FxMark[] = [
  {
    name: 'sweat',
    fps: 8,
    loop: true,
    outline: ['eye', 0],
    frames: [3, 4, 5, 6].map((y) => [{ mask: DROP, x: 6, y }]),
  },
  {
    name: 'vein',
    fps: 8,
    loop: true,
    outline: null,
    frames: [[at(VEIN, 7, 10)], [at(VEIN_HOT, 7, 10)], [at(VEIN_HOT, 7, 10)], [at(VEIN, 7, 10)]],
  },
  {
    name: 'blush',
    fps: 4,
    loop: true,
    outline: ['blush', 3],
    frames: [[at(HATCH, 8, 8)], [at(HATCH_SOFT, 8, 8)]],
  },
  { name: 'eyes_happy', fps: 1, loop: false, outline: ['hair', 0], frames: [[at(CARET, 8, 8)]] },
  { name: 'eyes_startle', fps: 1, loop: false, outline: ['hair', 0], frames: [[at(CHEVRON, 8, 8)]] },
  {
    name: 'zzz',
    fps: 3,
    loop: true,
    outline: ['hair', 0],
    frames: [
      [{ mask: Z4, x: 2, y: 10 }],
      [{ mask: Z4, x: 3, y: 8 }],
      [
        { mask: Z4, x: 4, y: 6 },
        { mask: Z3, x: 10, y: 3 },
      ],
      [
        { mask: Z3, x: 11, y: 1 },
        { mask: Z4, x: 2, y: 10 },
      ],
    ],
  },
  {
    name: 'heart',
    fps: 8,
    loop: true,
    outline: ['trim', 0],
    frames: [[at(HEART_SMALL, 8, 9)], [at(HEART_BIG, 8, 8)], [at(HEART_BIG, 8, 7)], [at(HEART_BIG, 8, 8)]],
  },
  {
    name: 'question',
    fps: 8,
    loop: false,
    outline: ['eye', 0],
    frames: [[at(QUESTION, 8, 10)], [at(QUESTION, 8, 7)], [at(QUESTION, 8, 8)]],
  },
  {
    name: 'exclaim',
    fps: 8,
    loop: false,
    outline: ['eye', 0],
    frames: [[at(EXCLAIM, 8, 10)], [at(EXCLAIM, 8, 7)], [at(EXCLAIM, 8, 8)]],
  },
  {
    name: 'smoke',
    fps: 10,
    loop: false,
    outline: ['shoe', 1],
    // Short and small (art round 1: ~60 % of the old r 5 puff): it pops beside/above the head (placed off the `fx`
    // anchor by the caller), never over the eye or cheek, and breaks into two wisps.
    frames: [
      [at(puff(1), 8, 10)],
      [at(puff(2), 8, 9)],
      [at(puff(3, 7), 8, 8)],
      [at(puff(1), 6, 6), at(puff(1), 11, 8)],
    ],
  },
];
