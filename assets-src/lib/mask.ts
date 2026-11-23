// Authored pixel masks (plan M-ART MA-05, ART-BIBLE §6). Extends the Cossack Kin `doll.ts` legend from 4 to 6 tones:
// each mask char names a *slot* and a *tone* (0 deepest … 5 brightest), never a colour. An outfit maps each slot to
// a palette ramp and its six shades, so masks stay palette-safe by construction and one mask set serves every
// style preset (soft / crisp remap the shades, not the masks). Face layers are separate masks placed on the head's
// face anchor, one per emotion.
import type { RampName } from './buffer.ts';
import { Plot } from './plot.ts';

export const SLOTS = ['skin', 'hair', 'horn', 'dress', 'apron', 'trim', 'shoe', 'eye', 'blush', 'ink'] as const;
export type Slot = (typeof SLOTS)[number];

export type Tone = 0 | 1 | 2 | 3 | 4 | 5;

export interface Swatch {
  readonly ramp: RampName;
  /** Ramp shade for tones 0..5. */
  readonly tones: readonly [number, number, number, number, number, number];
}

export type Outfit = Readonly<Record<Slot, Swatch>>;

/**
 * Legend. Each slot has a (shade, base, light) letter triple; tones run SHADE 0 · shade 1 · base 2 · BASE 3 ·
 * light 4 · LIGHT 5 (upper case = the further end of the pair). `blush` has f/F (2/3), `ink` X/x (0/1) for drawn
 * linework (lashes, mouth). `.` or space = empty.
 *   skin z s e · hair j h y · horn n o u · dress v d w · apron q a p · trim g t r · shoe m b l · eye c i k
 */
export const LEGEND: Readonly<Record<string, readonly [Slot, Tone]>> = (() => {
  const table: Record<string, readonly [Slot, Tone]> = {};
  const families: readonly (readonly [Slot, string, string, string])[] = [
    ['skin', 'z', 's', 'e'],
    ['hair', 'j', 'h', 'y'],
    ['horn', 'n', 'o', 'u'],
    ['dress', 'v', 'd', 'w'],
    ['apron', 'q', 'a', 'p'],
    ['trim', 'g', 't', 'r'],
    ['shoe', 'm', 'b', 'l'],
    ['eye', 'c', 'i', 'k'],
  ];
  for (const [slot, shade, base, light] of families) {
    table[shade.toUpperCase()] = [slot, 0];
    table[shade] = [slot, 1];
    table[base] = [slot, 2];
    table[base.toUpperCase()] = [slot, 3];
    table[light] = [slot, 4];
    table[light.toUpperCase()] = [slot, 5];
  }
  table['f'] = ['blush', 2];
  table['F'] = ['blush', 3];
  table['X'] = ['ink', 0];
  table['x'] = ['ink', 1];
  return table;
})();

export type Mask = readonly string[];

/** Throws on a non-legend char (with mask name, row and column), so a typo fails `pnpm sprites`. */
export function checkMask(mask: Mask, name: string): void {
  mask.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row.charAt(x);
      if (ch !== '.' && ch !== ' ' && !LEGEND[ch]) {
        throw new Error(`${name}: unknown mask char "${ch}" at row ${String(y)}, col ${String(x)}`);
      }
    }
  });
}

/** Width (longest row) and height of a mask. */
export const maskSize = (mask: Mask): { readonly w: number; readonly h: number } => ({
  w: Math.max(0, ...mask.map((r) => r.length)),
  h: mask.length,
});

/** A mask placed at (x, y); `flip` mirrors it horizontally (only for symmetric, unlit details). */
export interface Stamp {
  readonly mask: Mask;
  readonly x: number;
  readonly y: number;
  readonly flip?: boolean;
}

/** Paints stamps in order (later covers earlier) into a Plot with the outfit's ramps. */
export function paintMasks(plot: Plot, outfit: Outfit, stamps: readonly Stamp[]): void {
  for (const { mask, x, y, flip } of stamps) {
    const w = maskSize(mask).w;
    mask.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const entry = LEGEND[row.charAt(c)];
        if (!entry) continue;
        const [slot, tone] = entry;
        const swatch = outfit[slot];
        plot.set(x + (flip === true ? w - 1 - c : c), y + r, swatch.ramp, swatch.tones[tone]);
      }
    });
  }
}

/** Mask → Plot in one call (for tests and single-mask parts). */
export function plotMasks(outfit: Outfit, stamps: readonly Stamp[]): Plot {
  const plot = new Plot();
  paintMasks(plot, outfit, stamps);
  return plot;
}
