import { describe, expect, it } from 'vitest';
import { INPUT_LIMITS, NEW_CHARACTER_MOOD } from '../../../src/content/behavior.ts';
import { STAGE_LAYOUT_DIP } from '../../../src/content/stage.ts';
import { seedRng } from '../../../src/core/rng.ts';
import { initialState, type InitInput } from '../../../src/core/state.ts';
import {
  makeCharacter as maid,
  makeInit,
  makeWindow as win,
  makeWorld,
  readyState as ready,
} from '../../fixtures/core-state.ts';

describe('initialState', () => {
  it('stands the character idle on the floor near the right edge, click-through, due for a decision now', () => {
    const state = ready(makeInit());
    expect(state.pos).toEqual({ surface: { kind: 'floor' }, x: 1920 - STAGE_LAYOUT_DIP.rightMargin, y: 1032 });
    expect(state.behavior).toEqual({ kind: 'idle', anim: 'idle_a', since: 1_000, until: null });
    expect(state.character).toEqual(maid());
    expect(state.world).toEqual(makeWorld());
    expect(state.hitThrough).toBe(true);
    expect(state.wakeAt).toBe(1_000);
    expect(state.rng).toBe(seedRng(7));
  });

  it('starts with empty anti-spam memory and no recent activities', () => {
    const state = ready(makeInit());
    expect(state.throttle).toEqual({ firedAt: {}, lastLineAt: null, pending: [] });
    expect(state.recent).toEqual([]);
  });

  it('a character with no stored mood starts at the new-character mood, dated now', () => {
    expect(ready(makeInit()).mood).toEqual({ ...NEW_CHARACTER_MOOD, updatedAt: 1_000 });
  });

  it('keeps the stored mood of a returning character as it was saved', () => {
    const mood = { mood: 83, affinity: 12, updatedAt: 500 };
    expect(ready(makeInit({ mood })).mood).toEqual(mood);
  });

  it("plays the pack's own idle name when it has `idle` instead of `idle_a`", () => {
    const state = ready(makeInit({ character: maid(['idle', 'walk']) }));
    expect(state.behavior).toMatchObject({ kind: 'idle', anim: 'idle' });
  });

  it('stays inside a work area narrower than the start margin', () => {
    expect(ready(makeInit({ world: makeWorld({ workArea: { width: 40, height: 300 } }) })).pos.x).toBe(0);
  });

  it('is deterministic: the same input gives the same state', () => {
    expect(initialState(makeInit())).toEqual(initialState(makeInit()));
    expect(ready(makeInit({ seed: 8 })).rng).not.toBe(ready(makeInit()).rng);
  });

  it('accepts inputs exactly at the limits', () => {
    const windows = Array.from({ length: INPUT_LIMITS.windows }, (_, i) => win(`w${String(i)}`, 0, 0, 1, 1));
    const edge = makeWorld({ windows, tzOffsetMin: -INPUT_LIMITS.tzOffsetMin });
    expect(initialState(makeInit({ world: edge })).ok).toBe(true);
    expect(initialState(makeInit({ mood: { mood: 0, affinity: 100, updatedAt: 0 } })).ok).toBe(true);
  });
});

describe('initialState rejects illegal input without throwing', () => {
  it.each<[string, Partial<InitInput>, string]>([
    ['NaN work-area width', { world: makeWorld({ workArea: { width: Number.NaN, height: 1032 } }) }, 'non-finite'],
    ['zero work-area height', { world: makeWorld({ workArea: { width: 1920, height: 0 } }) }, 'out-of-range'],
    [
      'work area past the coordinate limit',
      { world: makeWorld({ workArea: { width: 1e6, height: 9 } }) },
      'out-of-range',
    ],
    ['fractional sprite scale', { world: makeWorld({ scale: 2.5 }) }, 'out-of-range'],
    ['zero scale factor', { world: makeWorld({ scaleFactor: 0 }) }, 'out-of-range'],
    ['infinite scale factor', { world: makeWorld({ scaleFactor: Infinity }) }, 'non-finite'],
    ['tz offset past UTC+14', { world: makeWorld({ tzOffsetMin: INPUT_LIMITS.tzOffsetMin + 1 }) }, 'out-of-range'],
    [
      'too many windows',
      { world: makeWorld({ windows: Array.from({ length: INPUT_LIMITS.windows + 1 }, () => win('w', 0, 0, 9, 9)) }) },
      'too-many',
    ],
    ['window with a NaN edge', { world: makeWorld({ windows: [win('w', Number.NaN, 0, 9, 9)] }) }, 'non-finite'],
    ['window under 1 DIP wide', { world: makeWorld({ windows: [win('w', 0, 0, 0.5, 9)] }) }, 'out-of-range'],
    ['window with an empty id', { world: makeWorld({ windows: [win('', 0, 0, 9, 9)] }) }, 'out-of-range'],
    ['mood above 100', { mood: { mood: 101, affinity: 0, updatedAt: 0 } }, 'out-of-range'],
    ['negative affinity', { mood: { mood: 50, affinity: -1, updatedAt: 0 } }, 'out-of-range'],
    ['NaN mood date', { mood: { mood: 50, affinity: 0, updatedAt: Number.NaN } }, 'non-finite'],
    ['character without an idle', { character: maid(['walk', 'turn']) }, 'no-idle'],
    ['character with an empty id', { character: { id: '', anims: ['idle_a'] } }, 'out-of-range'],
    ['NaN now', { now: Number.NaN }, 'non-finite'],
  ])('%s', (_name, overrides, reason) => {
    expect(initialState(makeInit(overrides))).toEqual({ ok: false, reason });
  });
});
