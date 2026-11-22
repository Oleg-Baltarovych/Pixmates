import { describe, expect, it } from 'vitest';
import { nextFloat, nextInt, seedRng } from '../../../src/core/rng.ts';

/** Draws `count` floats from a seed, threading the state like core does. */
function floats(seed: number, count: number): number[] {
  let state = seedRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const next = nextFloat(state);
    out.push(next.value);
    state = next.state;
  }
  return out;
}

describe('seeded RNG (mulberry32)', () => {
  it('matches the reference mulberry32 sequence for seed 1 (golden values)', () => {
    expect(floats(1, 5)).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741, 0.9683778982143849,
    ]);
  });

  it('is a pure function of the state', () => {
    const state = seedRng(42);
    expect(nextFloat(state)).toEqual(nextFloat(state));
    expect(floats(42, 20)).toEqual(floats(42, 20));
    expect(floats(42, 5)).not.toEqual(floats(43, 5));
  });

  it('keeps the state a uint32 and values in [0, 1)', () => {
    let state = seedRng(-7.9);
    expect(Number.isInteger(state) && state >= 0 && state <= 0xffffffff).toBe(true);
    for (let i = 0; i < 1000; i++) {
      const next = nextFloat(state);
      expect(next.value).toBeGreaterThanOrEqual(0);
      expect(next.value).toBeLessThan(1);
      expect(Number.isInteger(next.state) && next.state >= 0 && next.state <= 0xffffffff).toBe(true);
      state = next.state;
    }
  });

  it('draws integers in [0, max) and covers the range', () => {
    let state = seedRng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const next = nextInt(state, 3);
      seen.add(next.value);
      state = next.state;
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('returns 0 without advancing for an empty or invalid range', () => {
    const state = seedRng(5);
    expect(nextInt(state, 0)).toEqual({ value: 0, state });
    expect(nextInt(state, Number.NaN)).toEqual({ value: 0, state });
  });
});
