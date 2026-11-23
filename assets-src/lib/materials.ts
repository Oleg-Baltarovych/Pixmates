// Procedural materials for characters (plan M-ART MA-02; replaces Cossack Kin's earth/plank/thatch). Procedural code
// is only for material texture; silhouettes, faces and key details are authored (SPEC §5.2). Every texture delta
// goes through q8 inside `compose`, and noise is integer-hashed, so output is bit-identical across engines.
import type { RampName } from './buffer.ts';
import { rand2, seedOf, valueNoise } from './noise.ts';
import type { Material } from './passes.ts';

/** Material ids (buffer `material` field): internal outlines are drawn where these change. */
export const MAT = { skin: 1, hair: 2, cloth: 3, apron: 4, trim: 5, horn: 6, metal: 7, fur: 8, shoe: 9 } as const;

/** Plain lit surface (skin): base shade only, the light pass models it. */
export function flat(id: number, ramp: RampName, shade: number): Material {
  return { id, base: () => ({ ramp, shade }) };
}

export interface ClothOptions {
  /** Fold strength in shade steps (default 0.9). */
  readonly folds?: number;
  /** Fold spacing in px (default 3). */
  readonly cell?: number;
  /** 0..1: folds deepen toward the hem (`v` grows downward in poly/rect shapes). */
  readonly hemBias?: number;
  readonly seed?: string;
}

/** Woven cloth: soft vertical folds from 1-D value noise along `u`, deeper toward the hem. */
export function cloth(id: number, ramp: RampName, shade: number, options: ClothOptions = {}): Material {
  const folds = options.folds ?? 0.9;
  const cell = options.cell ?? 3;
  const bias = options.hemBias ?? 0.6;
  const seed = seedOf(options.seed ?? `cloth:${ramp}`);
  return {
    id,
    base: () => ({ ramp, shade }),
    texture: (f, _px, shape) => {
      const depthT = shape.h > 1 ? f.v / (shape.h - 1) : 0;
      const n = valueNoise(f.u, 0, cell, 1, seed) - 0.5;
      return n * folds * (1 - bias + bias * depthT) * 2;
    },
  };
}

/** Hair: long vertical strands (elongated noise) plus a few bright strand highlights on the lit side. */
export function strands(id: number, ramp: RampName, shade: number, seedKey = 'hair'): Material {
  const seed = seedOf(seedKey);
  return {
    id,
    base: () => ({ ramp, shade }),
    texture: (f, px) => {
      const n = valueNoise(f.x, f.y, 1.5, 6, seed) - 0.5;
      const lit = px.shade > shade + 0.6 && rand2(f.x, f.y >> 2, seed + 7) > 0.8 ? 0.7 : 0;
      return n * 1.2 + lit;
    },
  };
}

/** Horn: growth rings across the stroke (`u` = px along it) and a brighter tip. */
export function horn(id: number, ramp: RampName, shade: number, ringEvery = 3): Material {
  return {
    id,
    base: () => ({ ramp, shade }),
    texture: (f, _px, shape) => {
      const ring = Math.floor(f.u) % ringEvery === ringEvery - 1 ? -0.7 : 0;
      const length = Math.max(1, shape.w + shape.h);
      return ring + (f.u / length) * 1.2;
    },
  };
}

/** Polished metal: a hard specular step where the surface faces the light, darker grazing faces. */
export function metal(id: number, ramp: RampName, shade: number): Material {
  return {
    id,
    base: () => ({ ramp, shade }),
    texture: (f, px) => (px.shade > shade + 0.9 ? 1.5 : f.normal[2] < 60 ? -0.8 : 0),
  };
}

/** Fur: short diagonal tufts (hashed lattice), clumped by low-frequency noise. */
export function fur(id: number, ramp: RampName, shade: number, seedKey = 'fur'): Material {
  const seed = seedOf(seedKey);
  return {
    id,
    base: () => ({ ramp, shade }),
    texture: (f) => {
      const clump = valueNoise(f.x, f.y, 4, 4, seed) - 0.5;
      const tuft = rand2((f.x + f.y) >> 1, f.y >> 1, seed + 3) > 0.7 ? 0.8 : 0;
      return clump * 1.4 + tuft;
    },
  };
}
