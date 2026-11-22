import { describe, expect, it } from 'vitest';
import { computeScale, maxScale, presetScales, stepScale, type ScaleInput } from '../../../src/core/scale.ts';

const PRESETS = { s: 96, m: 136, l: 176 };
/** Sprite height in DIP for a scale (frame px × scale ÷ scale factor). */
const heightDip = (scale: number, frameH: number, scaleFactor: number): number => (frameH * scale) / scaleFactor;

const base = (overrides: Partial<ScaleInput> = {}): ScaleInput => ({
  targetDip: PRESETS.m,
  scaleFactor: 1,
  frameH: 32,
  workAreaHeightDip: 1400,
  maxFraction: 0.25,
  minScale: 2,
  ...overrides,
});

describe('computeScale', () => {
  it.each([
    [1, 4],
    [1.25, 5],
    [1.5, 6],
    [2, 9],
  ])('M at scale factor %s gives integer scale %s', (scaleFactor, expected) => {
    expect(computeScale(base({ scaleFactor }))).toBe(expected);
  });

  it('gives about 3 cm on the owner laptop (15.6" 1080p at 125 %, work area 816 DIP)', () => {
    const scale = computeScale(base({ scaleFactor: 1.25, workAreaHeightDip: 816 }));
    expect(scale).toBe(5);
    expect(heightDip(scale, 32, 1.25)).toBe(128);
  });

  it.each([
    [32, 5],
    [48, 4],
    [64, 3],
  ])('depends on the frame height (frameH %s at 125 % gives %s)', (frameH, expected) => {
    expect(computeScale(base({ scaleFactor: 1.25, frameH }))).toBe(expected);
  });

  it('clamps to the share of a small work area', () => {
    const input = base({ workAreaHeightDip: 400 });
    expect(maxScale(input)).toBe(3);
    expect(computeScale(input)).toBe(3);
    expect(heightDip(computeScale(input), 32, 1)).toBeLessThanOrEqual(0.25 * 400);
  });

  it('never goes below the minimum scale', () => {
    expect(computeScale(base({ targetDip: 10 }))).toBe(2);
    expect(computeScale(base({ workAreaHeightDip: 100 }))).toBe(2);
  });
});

describe('presetScales', () => {
  it('keeps S < M < L at every scale factor', () => {
    for (const scaleFactor of [1, 1.25, 1.5, 2]) {
      const { s, m, l } = presetScales(PRESETS, base({ scaleFactor }));
      expect(s).toBeLessThan(m);
      expect(m).toBeLessThan(l);
    }
    expect(presetScales(PRESETS, base({ scaleFactor: 1.25, workAreaHeightDip: 816 }))).toEqual({ s: 4, m: 5, l: 7 });
  });

  it.each([
    [200, { s: 2, m: 2, l: 2 }],
    [400, { s: 3, m: 3, l: 3 }],
    [600, { s: 3, m: 4, l: 4 }],
  ])('clamps every preset to the work area %s DIP (collapsing allowed)', (workAreaHeightDip, expected) => {
    const input = base({ workAreaHeightDip });
    const presets = presetScales(PRESETS, input);
    expect(presets).toEqual(expected);
    for (const scale of Object.values(presets)) {
      expect(scale).toBeLessThanOrEqual(maxScale(input));
      expect(scale).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('stepScale', () => {
  it('steps by one within [min, max]', () => {
    expect(stepScale(5, 1, 2, 7)).toBe(6);
    expect(stepScale(7, 1, 2, 7)).toBe(7);
    expect(stepScale(2, -1, 2, 7)).toBe(2);
    expect(stepScale(5, -1, 2, 7)).toBe(4);
  });

  it('never moves against its direction when the current scale is above max', () => {
    expect(stepScale(9, 1, 2, 7)).toBe(9);
    expect(stepScale(9, -1, 2, 7)).toBe(7);
    expect(stepScale(1, -1, 2, 7)).toBe(1);
    expect(stepScale(1, 1, 2, 7)).toBe(2);
  });
});

describe('broken display metrics', () => {
  it.each([
    ['scaleFactor NaN', { scaleFactor: Number.NaN }],
    ['scaleFactor 0', { scaleFactor: 0 }],
    ['scaleFactor < 0', { scaleFactor: -1.25 }],
    ['frameH NaN', { frameH: Number.NaN }],
    ['frameH 0', { frameH: 0 }],
    ['frameH < 0', { frameH: -32 }],
    ['scaleFactor Infinity', { scaleFactor: Number.POSITIVE_INFINITY }],
    ['work area NaN', { workAreaHeightDip: Number.NaN }],
    ['target NaN', { targetDip: Number.NaN }],
  ] as const)('%s gives the minimum scale', (_name, overrides) => {
    const input = base(overrides);
    expect(computeScale(input)).toBe(2);
    expect(maxScale(input)).toBeLessThanOrEqual(Number.isNaN(input.targetDip) ? Infinity : 2);
    expect(Object.values(presetScales(PRESETS, input)).every(Number.isInteger)).toBe(true);
  });
});
