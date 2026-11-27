// Position-hashed noise for material textures (plan ART-02). Integer hashing + polynomial interpolation only, so the
// values are bit-identical on every engine (types.ts determinism rules) and independent of draw order.
import { hashString } from './rng.ts';

/** 32-bit hash of an integer lattice point. */
export function hash2(x: number, y: number, seed: number): number {
  let h = (seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Uniform [0, 1) per lattice point. */
export const rand2 = (x: number, y: number, seed: number): number => hash2(x, y, seed) / 4294967296;

/** Seed from a readable key (`'plaster:patches'`). */
export const seedOf = (key: string): number => hashString(key);

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Smooth value noise in [0, 1): lattice every `cellX` × `cellY` px, bilinear with smoothstep. */
export function valueNoise(x: number, y: number, cellX: number, cellY: number, seed: number): number {
  const fx = x / cellX;
  const fy = y / cellY;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = smooth(fx - ix);
  const ty = smooth(fy - iy);
  const a = rand2(ix, iy, seed);
  const b = rand2(ix + 1, iy, seed);
  const c = rand2(ix, iy + 1, seed);
  const d = rand2(ix + 1, iy + 1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Fractal sum of `octaves` value-noise layers (cell halves, weight halves), normalised to [0, 1). */
export function fbm(x: number, y: number, cell: number, octaves: number, seed: number): number {
  let sum = 0;
  let weight = 1;
  let total = 0;
  let c = cell;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x, y, c, c, seed + o * 0x9e37) * weight;
    total += weight;
    weight /= 2;
    c = Math.max(1, c / 2);
  }
  return sum / total;
}

/** Rounds to 1/256 so a float decision never depends on the last bits. */
export const q8 = (v: number): number => Math.round(v * 256) / 256;
