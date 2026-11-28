import { describe, expect, it } from 'vitest';
import { WALK_TRAVEL } from '../../../src/content/stage.ts';
import { dirSign, walkStepsAt, walkX, type WalkMotion } from '../../../src/shared/motion.ts';

const FPS = WALK_TRAVEL.fps;
const FRAME_MS = 1000 / FPS;
const walk = (overrides: Partial<WalkMotion> = {}): WalkMotion => ({
  kind: 'walk',
  x0: 500,
  y: 1032,
  dir: 'right',
  steps: 5,
  stepDip: 6.4,
  ...overrides,
});

describe('walk sampler (shared by core and stage, ADR 010)', () => {
  it('direction sign: right moves +x, left −x', () => {
    expect(dirSign('right')).toBe(1);
    expect(dirSign('left')).toBe(-1);
  });

  it('counts whole strides from elapsed time: one per walk frame, none before the first frame ends', () => {
    expect(walkStepsAt(5, 0, FPS)).toBe(0);
    expect(walkStepsAt(5, FRAME_MS - 1, FPS)).toBe(0);
    expect(walkStepsAt(5, FRAME_MS, FPS)).toBe(1);
    expect(walkStepsAt(5, 3 * FRAME_MS + 50, FPS)).toBe(3);
  });

  it('clamps to [0, steps]: no step before the start, none past the arrival', () => {
    expect(walkStepsAt(5, -250, FPS)).toBe(0);
    expect(walkStepsAt(5, 5 * FRAME_MS, FPS)).toBe(5);
    expect(walkStepsAt(5, 60_000, FPS)).toBe(5);
  });

  it('moves the foot pivot in whole strides, never between them (no skate from interpolation)', () => {
    const motion = walk();
    expect(walkX(motion, 0, FPS)).toBe(500);
    expect(walkX(motion, FRAME_MS, FPS)).toBeCloseTo(506.4, 9);
    expect(walkX(motion, FRAME_MS + 60, FPS)).toBe(walkX(motion, FRAME_MS, FPS));
    expect(walkX(motion, 5 * FRAME_MS, FPS)).toBeCloseTo(532, 9);
    expect(walkX(motion, 9_000, FPS)).toBeCloseTo(532, 9);
  });

  it('walks left by the same strides, mirrored about x0', () => {
    const motion = walk({ dir: 'left' });
    expect(walkX(motion, 2 * FRAME_MS, FPS)).toBeCloseTo(500 - 2 * 6.4, 9);
    expect(walkX(motion, 5 * FRAME_MS, FPS)).toBeCloseTo(468, 9);
  });
});
