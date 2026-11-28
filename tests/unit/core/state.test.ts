import { describe, expect, it } from 'vitest';
import { INPUT_LIMITS, NEW_CHARACTER_MOOD } from '../../../src/content/behavior.ts';
import { STAGE_LAYOUT_DIP } from '../../../src/content/stage.ts';
import { seedRng } from '../../../src/core/rng.ts';
import { initialState, resumeBehavior, type InitInput } from '../../../src/core/state.ts';
import { ANIM_NAME_MAX, PACK_LIMITS } from '../../../src/shared/limits.ts';
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
    expect(state.character).toEqual({ ...maid(), idle: 'idle_a' });
    expect(state.world).toEqual(makeWorld());
    expect(state.hitThrough).toBe(true);
    expect(state.wakeAt).toBe(1_000);
    expect(state.rng).toBe(seedRng(7));
  });

  it('starts with empty anti-spam memory, no recent activities and no cursor memory', () => {
    const state = ready(makeInit());
    expect(state.throttle).toEqual({ firedAt: {}, lastLineAt: null, pending: {} });
    expect(state.recent).toEqual([]);
    expect(state.cursor).toEqual({ last: null, trail: [] });
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
    expect(state.character.idle).toBe('idle');
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
    const longId = 'p'.repeat(PACK_LIMITS.idMax);
    const longAnim = `${'a'.repeat(32)}:${'b'.repeat(ANIM_NAME_MAX - 33)}`;
    expect(initialState(makeInit({ character: { id: longId, anims: ['idle_a', longAnim] } })).ok).toBe(true);
    expect(initialState(makeInit({ world: makeWorld({ windows: [win(longId, 0, 0, 9, 9)] }) })).ok).toBe(true);
  });
});

describe('resumeBehavior', () => {
  it('stamps a stored resting state with fresh times: it lasts until an event ends it', () => {
    expect(resumeBehavior({ kind: 'idle', anim: 'idle_b' }, 900)).toEqual({
      kind: 'idle',
      anim: 'idle_b',
      since: 900,
      until: null,
    });
    expect(resumeBehavior({ kind: 'sit_edge' }, 5)).toEqual({ kind: 'sit_edge', since: 5, until: null });
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
    [
      'character id past the id limit',
      { character: { id: 'p'.repeat(PACK_LIMITS.idMax + 1), anims: ['idle_a'] } },
      'out-of-range',
    ],
    [
      'animation name past the name limit',
      { character: maid(['idle_a', 'a'.repeat(ANIM_NAME_MAX + 1)]) },
      'out-of-range',
    ],
    ['empty animation name', { character: maid(['idle_a', '']) }, 'out-of-range'],
    [
      'window id past the id limit',
      { world: makeWorld({ windows: [win('w'.repeat(PACK_LIMITS.idMax + 1), 0, 0, 9, 9)] }) },
      'out-of-range',
    ],
    [
      'two windows with one id',
      { world: makeWorld({ windows: [win('w1', 0, 0, 9, 9), win('w1', 20, 0, 9, 9)] }) },
      'duplicate',
    ],
    ['NaN now', { now: Number.NaN }, 'non-finite'],
  ])('%s', (_name, overrides, reason) => {
    expect(initialState(makeInit(overrides))).toEqual({ ok: false, reason });
  });
});
