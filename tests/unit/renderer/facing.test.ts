import { describe, expect, it } from 'vitest';
import { DEV_ANIM_CYCLE } from '../../../src/content/stage.ts';
import { mirrorShiftPx, needsMirror } from '../../../src/renderer/stage/facing.ts';

describe('needsMirror (ADR 010: left = runtime mirror of right)', () => {
  it('mirrors a sided animation only when asked for the other side', () => {
    expect(needsMirror('right', 'left')).toBe(true);
    expect(needsMirror('left', 'right')).toBe(true);
    expect(needsMirror('right', 'right')).toBe(false);
    expect(needsMirror('right', undefined)).toBe(false);
  });

  it('never mirrors a front animation or one without a facing', () => {
    expect(needsMirror('front', 'left')).toBe(false);
    expect(needsMirror(undefined, 'left')).toBe(false);
  });
});

describe('mirrorShiftPx (flip around the foot pivot, not the frame centre)', () => {
  it('keeps the pivot column on screen when the frame is mirrored', () => {
    // A 48-px frame mirrored about its centre moves pivot x = a·w to (1 − a)·w; the shift puts it back.
    for (const a of [0, 0.25, 0.5, 0.75, 1]) {
      const w = 48;
      expect((1 - a) * w + mirrorShiftPx(a, w)).toBeCloseTo(a * w);
    }
    expect(mirrorShiftPx(0.5, 48)).toBe(0);
  });
});

describe('dev travel preview cycle (MA-33)', () => {
  it('shows idle, turn, walk right, walk left, happy — both directions of travel', () => {
    expect(DEV_ANIM_CYCLE.map((s) => [s.anim, s.face])).toEqual([
      ['idle_a', undefined],
      ['turn', 'right'],
      ['walk', 'right'],
      ['walk', 'left'],
      ['happy', undefined],
    ]);
    for (const step of DEV_ANIM_CYCLE) expect(step.loops).toBeGreaterThanOrEqual(1);
  });
});
