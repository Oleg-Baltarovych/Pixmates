// Style spike heads: authored masks (adult anime face rules from the art-director brief, 2026-11-24).
// Letters: hair '0'–'6' (hair ramp tone), skin o=2 d=3 h=4 k=5 K=6, l = lid/lash (ink 0), b = brow (hair 1),
// w = sclera, p = pupil, i = iris rim, g = the one highlight, m = mouth/lip (skin 2), r/R = garnet 2/1 (cord, gem),
// c/C/x = moth clip (horn 4 / horn 2 / hair_black 0), e = ear (skin 4).
// Every head has a neutral mask plus row overrides per expression (row index → replacement row).
import type { RampName } from '../../lib/buffer.ts';
import type { Ink } from './paint.ts';

export type Expr = 'neutral' | 'blink' | 'happy' | 'startle';
export type Variant = 'B' | 'C';
export type CharId = 'ronin' | 'goth';

export interface Head {
  readonly mask: readonly string[];
  readonly exprs: Partial<Record<Exclude<Expr, 'neutral'>, Readonly<Record<number, string>>>>;
  /** Skull rows (the top rows above `skullTop` are crown extras, e.g. hair spikes). */
  readonly skullTop: number;
}

export interface Look {
  readonly hair: RampName;
  readonly eyeRim: Ink;
  readonly pupil: Ink;
  readonly glint: Ink;
}

export function legendOf(look: Look): Record<string, Ink> {
  const legend: Record<string, Ink> = {
    o: ['skin', 2],
    d: ['skin', 3],
    h: ['skin', 4],
    k: ['skin', 5],
    K: ['skin', 6],
    e: ['skin', 4],
    l: ['ink', 0],
    b: [look.hair, 1],
    w: ['cloth_cream', 4],
    p: look.pupil,
    i: look.eyeRim,
    g: look.glint,
    m: ['skin', 2],
    r: ['gem_garnet', 2],
    R: ['gem_garnet', 1],
    c: ['horn', 4],
    C: ['horn', 2],
    x: ['hair_black', 0],
  };
  for (let t = 0; t <= 6; t++) legend[String(t)] = [look.hair, t];
  return legend;
}

/** Pads every row by one '.' each side, then replaces the top rows (a crown wider than the face block). */
function widen(head: Head, top: readonly string[]): Head {
  const pad = (r: string): string => `.${r}.`;
  const mask = head.mask.map((r, i) => top[i] ?? pad(r));
  const exprs: Partial<Record<Exclude<Expr, 'neutral'>, Record<number, string>>> = {};
  for (const k of ['blink', 'happy', 'startle'] as const) {
    const rows = head.exprs[k];
    if (rows) exprs[k] = Object.fromEntries(Object.entries(rows).map(([i, r]) => [i, pad(r)]));
  }
  return { ...head, mask, exprs };
}

export function headRows(head: Head, expr: Expr): readonly string[] {
  if (expr === 'neutral') return head.mask;
  const over = head.exprs[expr] ?? {};
  return head.mask.map((row, i) => over[i] ?? row);
}

// ── ronin ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Variant C: skull 13 × 13 (+ crown spikes / temple flicks); face 11 (hairline r3 → chin r13): eye ≈ 50 %,
 * nose ≈ 70 %, mouth ≈ 82 %, jaw corner step ≈ 80 % then a 3-px chin. */
const RONIN_C_FRONT: Head = widen(
  {
    skullTop: 0,
    mask: [
      '..00.0000.0..',
      '.0034333440..',
      '0333333344430',
      '03h3hh3hh3h30',
      '0kkkkk1kkkkh0',
      '0kbbbkkkbbbh0',
      '0kkkkbkbkkkh0',
      '0klllkkklllh0',
      '0kwgpkkkgpwh0',
      'okkkkkkkkkkho',
      'okkkkhkkkkkho',
      '.okkkkkkkkho.',
      '..okkmmmkho..',
      '....okkko....',
    ],
    exprs: {
      blink: { 7: '0kkkkkkkkkkh0', 8: '0klllkkklllh0' },
      happy: { 8: '0kllpkkkgllh0', 11: '.okkmkkkmkho.', 12: '..okkmmmkho..' },
      startle: {
        5: '0bbbkkkkkbbb0',
        6: '0kkkkkkkkkkh0',
        9: '0kkiikkkiikho',
        12: '..okkkmkkho..',
      },
    },
  },
  // swept-back angular crown: spikes, lit streaks top-left, temple flicks past the skull.
  ['....0.000.0....', '..00304434300..', '.0343344433430.', '023h3hh3hh3h320'],
);

/** Variant C, q34 facing right: back hair spikes left, near eye cols 7–10, far eye 12–13, nose bump col 14. */
const RONIN_C_Q34: Head = {
  skullTop: 0,
  mask: [
    '.....000.000...',
    '...0033344440..',
    '.00333443344430',
    '0233334433h3h30',
    '02333333kkk1ko.',
    '0233333kbbbkbbo',
    '023333kkkkkbkko',
    '02233ekllllkllo',
    '01223ekwgpkkpko',
    '.0122ekkkkkkkko',
    '.0122okkkkkhkkh',
    '..012okkkkkkko.',
    '...0okkkkkmmo..',
    '.....ookkkko...',
  ],
  exprs: {
    blink: { 7: '02233ekkkkkkkko', 8: '01223ekllllkllo' },
    happy: { 8: '01223eklgpkkllo', 12: '...0okkkkmkmo..' },
    startle: { 5: '0233333bbbkbbbo', 6: '023333kkkkkkkko' },
  },
};

/** Variant B: skull 15 × 14 (+ crown); face 12 (hairline r4 → chin r14), eye r8–10, nose r11, mouth r13. */
const RONIN_B_FRONT: Head = widen(
  {
    skullTop: 0,
    mask: [
      '..00.00000.0..',
      '..0033433400..',
      '.033433334440.',
      '03333333344430',
      '03h3hh3hh3hh30',
      '03kkk1k1k1kkh0',
      '0bbbbkkkkbbbb0',
      '0kkkkbkkbkkkh0',
      '0llllkkkkllll0',
      '0lwgpkkkkgpwl0',
      'okhiikkkkiihho',
      'okkkkkhkkkkkho',
      '.okkkkkkkkkho.',
      '..okkkmmmkho..',
      '.....okkho....',
    ],
    exprs: {
      blink: { 8: '0kkkkkkkkkkkh0', 9: '0llllkkkkllll0', 10: 'okkkkkkkkkkhho' },
      happy: {
        9: '0llgpkkkkgpll0',
        10: 'okkkkkkkkkkhho',
        12: '.okkkmkkkmkho.',
        13: '..okkkmmmkho..',
      },
      startle: {
        6: '0bbbkkkkkkbbb0',
        7: '0kkkkkkkkkkkh0',
        10: 'okwiikkkkiiwho',
        13: '..okkkkmkkho..',
      },
    },
  },
  ['....0.0000.0....', '..003044343300..', '.03433443344430.', '0344334433444330', '023h3hh3hh3hh320'],
);

const RONIN_B_Q34: Head = {
  skullTop: 0,
  mask: [
    '..00.000000...',
    '.00334333340..',
    '03334333344430',
    '03333333344430',
    '033333333h3hh0',
    '0333333kk1k1k0',
    '03333bbbbkkbbb',
    '02333kkkbkkkk0',
    '0223ellllkklll',
    '0123ekwgpkkgpk',
    '.012ekiikkkiik',
    '.012okkkkkkkko',
    '..01okkkkkkhk.',
    '...0okkkkmmmo.',
    '.....ookkkoo..',
  ],
  exprs: {
    blink: { 8: '0223ekkkkkkkkk', 9: '0123ellllkklll', 10: '.012ekkkkkkkkk' },
    happy: { 9: '0123ekllpkkgll', 10: '.012ekkkkkkkkk', 13: '...0okkkmkkmo.' },
    startle: { 6: '03333bbbkkkbbb', 7: '02333kkkkkkkk0', 13: '...0okkkkmkko.' },
  },
};

// ── goth (docs/art/goth.md: hair_black, horn-brown eyes, moth clip screen-left crown; adult female face) ──────

/** Variant C front: steady taper to a 2-px chin, thinner brows, 4-px lids with a thick outer corner, iris 2 × 3
 * (one row under the lid), lower-lip px; long hair frames the face (the back mass is drawn by figure.ts). */
const GOTH_C_FRONT: Head = {
  skullTop: 0,
  mask: [
    '..000000000..',
    '.cc333444430.',
    '0Cxc3h33hh330',
    '03kkkkkkkkk30',
    '03bbbkkkbbb30',
    '03kkkkkkkkk30',
    '0llllkkkllll0',
    '0lwgpkkkgpwl0',
    '03kiikkkiik30',
    '03kkkhkkkkk30',
    '03kkkkmmkkh30',
    '033okkdkkho30',
    '03333okko3330',
  ],
  exprs: {
    blink: { 6: '03kkkkkkkkk30', 7: '0llllkkkllll0', 8: '03kkkkkkkkk30' },
    happy: { 8: '03kkkkkkkkk30', 10: '03kkkmkkmkh30', 11: '033okkmmkho30' },
    startle: {
      3: '03bbbkkkbbb30',
      4: '03kkkkkkkkk30',
      8: '03wiikkkiiw30',
      10: '03kkkkkkkkh30',
      11: '033okkmkkho30',
    },
  },
};

const GOTH_C_Q34: Head = {
  skullTop: 0,
  mask: [
    '..000000000..',
    '.cc333344430.',
    '0Cxc33333h330',
    '033333kkkkkk0',
    '033333bbbkbbo',
    '033333kkkkkko',
    '03333llllkllo',
    '0333elwgpkgpk',
    '0333ekkiikiik',
    '03333kkkkkhkk',
    '03333okkkmmo.',
    '033333okkdko.',
    '0333333okko..',
  ],
  exprs: {
    blink: { 6: '03333kkkkkkko', 7: '0333ellllklll', 8: '0333ekkkkkkkk' },
    happy: { 8: '0333ekkkkkkkk', 10: '03333okkmkmo.' },
    startle: { 4: '033333bbbkbb0', 8: '0333ekwiikiik' },
  },
};

/** Variant B front (14 × 15). */
const GOTH_B_FRONT: Head = {
  skullTop: 0,
  mask: [
    '...00000000...',
    '.cc0333334400.',
    'cCxc3333344430',
    '0xc33333334430',
    '03h3hh3hh3h3h0',
    '03kkkkkkkkkkh0',
    '03bbbkkkkbbb30',
    '03kkkkkkkkkk30',
    '0kllllkkllllh0',
    '0lwgpkkkkgpwl0',
    '0kiipkkkkpiik0',
    '03kkkkhkkkkh30',
    '03okkkkmmkko30',
    '032okkkdkko230',
    '0032ookkkoo200',
  ],
  exprs: {
    blink: { 8: '0kkkkkkkkkkkh0', 9: '0kllllkkllllh0', 10: '0kkkkkkkkkkkh0' },
    happy: { 9: '0kllgpkkgpllh0', 10: '0kkkkkkkkkkkh0', 12: '03okkmkkmkko30' },
    startle: { 6: '03kkkkkkkkkk30', 5: '03bbbkkkkbbb30', 12: '03okkkmkkkko30' },
  },
};

const GOTH_B_Q34: Head = {
  skullTop: 0,
  mask: [
    '..000000000...',
    '.cc33333344 0.'.replace(' ', '0'),
    '0Cxc3333344430',
    '0xc333333h3h30',
    '033333333kkk30',
    '0333333kkkkkk0',
    '033333kbbbkbbo',
    '033333kkkkkkko',
    '02333ellllklll',
    '02333elwgpkgpk',
    '02333ekkiikiik',
    '022330kkkkkhko',
    '0122330okkmmo.',
    '01223330okkdo.',
    '011223300ooo..',
  ],
  exprs: {
    blink: { 8: '02333ekkkkkkkk', 9: '02333ellllklll', 10: '02333ekkkkkkkk' },
    happy: { 10: '02333ekkkkkkkk', 12: '0122330okmkkm.' },
    startle: { 6: '033333bbbkkbbo', 7: '033333kkkkkkko', 10: '02333ekwiikiik' },
  },
};

export const HEADS: Readonly<Record<CharId, Readonly<Record<Variant, { readonly front: Head; readonly q34: Head }>>>> =
  {
    ronin: {
      B: { front: RONIN_B_FRONT, q34: RONIN_B_Q34 },
      C: { front: RONIN_C_FRONT, q34: RONIN_C_Q34 },
    },
    goth: {
      B: { front: GOTH_B_FRONT, q34: GOTH_B_Q34 },
      C: { front: GOTH_C_FRONT, q34: GOTH_C_Q34 },
    },
  };

/** Crown tuft (owner amendment, toggle): 2 × 3 umber knot over an oxblood cord row. */
export const TUFT: readonly string[] = ['.33.', '.43.', 'rRR.'];
