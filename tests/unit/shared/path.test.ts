import { describe, expect, it } from 'vitest';
import type { PathSegment } from '../../../src/shared/motion.ts';
import { pathDurationMs, samplePath } from '../../../src/shared/path.ts';

const G = 7_680;
const first: PathSegment = { durationMs: 200, x0: 100, y0: 300, vx: 500, vy: -400, gravity: G };
// Starts where `first` ends (0.2 s): x 200, y 300 − 80 + 153.6 = 373.6, vy −400 + 1536 = 1136, vx bounced to −250.
const second: PathSegment = { durationMs: 100, x0: 200, y0: 373.6, vx: -250, vy: 1_136, gravity: G };

describe('path sampler (shared by core and stage, M1-08)', () => {
  it('follows the closed form p(t) = p0 + v·t + ½·g·t² inside a segment', () => {
    const at = samplePath([first], 100);
    expect(at?.x).toBeCloseTo(100 + 500 * 0.1, 9);
    expect(at?.y).toBeCloseTo(300 - 400 * 0.1 + (G * 0.1 * 0.1) / 2, 9);
    expect(at?.vx).toBe(500);
    expect(at?.vy).toBeCloseTo(-400 + G * 0.1, 9);
  });

  it('moves on to the next segment after a bounce, continuously', () => {
    const end = samplePath([first], 200);
    const start = samplePath([first, second], 200);
    expect(start?.x).toBeCloseTo(end?.x ?? Number.NaN, 9);
    expect(start?.y).toBeCloseTo(end?.y ?? Number.NaN, 9);
    const later = samplePath([first, second], 250);
    expect(later?.x).toBeCloseTo(200 - 250 * 0.05, 9);
    expect(later?.y).toBeCloseTo(373.6 + 1_136 * 0.05 + (G * 0.05 * 0.05) / 2, 9);
  });

  it('clamps: the start before 0, the landing point after the last segment', () => {
    expect(samplePath([first, second], -50)).toEqual(samplePath([first, second], 0));
    expect(samplePath([first, second], 0)).toMatchObject({ x: 100, y: 300, vx: 500, vy: -400 });
    const landing = samplePath([first, second], 300);
    expect(samplePath([first, second], 60_000)).toEqual(landing);
    expect(landing?.x).toBeCloseTo(175, 9);
  });

  it('an empty path has no point; durations add up', () => {
    expect(samplePath([], 0)).toBeNull();
    expect(pathDurationMs([])).toBe(0);
    expect(pathDurationMs([first, second])).toBe(300);
  });
});
