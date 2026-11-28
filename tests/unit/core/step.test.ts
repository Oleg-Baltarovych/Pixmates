import { describe, expect, it } from 'vitest';
import { INPUT_LIMITS } from '../../../src/content/behavior.ts';
import { CLICK_REACTIONS } from '../../../src/content/stage.ts';
import { PACK_LIMITS } from '../../../src/shared/pack.ts';
import { step } from '../../../src/core/step.ts';
import type { CoreEvent, CoreState, Effect, PointerInput } from '../../../src/core/types.ts';
import { makeCoreState, makeWindow, makeWorld, readyState } from '../../fixtures/core-state.ts';

const input = (value: PointerInput): CoreEvent => ({ type: 'input', input: value });
const release = (overrides: Partial<{ x: number; y: number; vx: number; vy: number }> = {}): CoreEvent =>
  input({ kind: 'drag-end', x: 100, y: 200, vx: 0, vy: 0, ...overrides });

/** Replays timed events from a state; returns the final state and every effect in order. */
function replay(start: CoreState, events: readonly (readonly [number, CoreEvent])[]) {
  let state = start;
  const effects: Effect[] = [];
  for (const [now, event] of events) {
    const result = step(state, event, now);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

const SCRIPT: readonly (readonly [number, CoreEvent])[] = [
  [0, { type: 'tick' }],
  [100, input({ kind: 'hover', overOpaque: true })],
  [150, input({ kind: 'click' })],
  [400, input({ kind: 'click' })],
  [700, input({ kind: 'drag-start' })],
  [720, input({ kind: 'hover', overOpaque: false })],
  [900, release()],
  [950, input({ kind: 'hover', overOpaque: false })],
  [1000, input({ kind: 'click' })],
];

const seeded = (seed: number): CoreState => makeCoreState({}, { seed });
const shownAnims = (effects: readonly Effect[]): string[] =>
  effects.flatMap((effect) => (effect.type === 'Show' ? [effect.anim] : []));

describe('step determinism', () => {
  it('same seed and same events give the same state and effects', () => {
    const a = replay(seeded(7), SCRIPT);
    expect(a.effects.length).toBeGreaterThan(0);
    expect(a).toEqual(replay(seeded(7), SCRIPT));
  });

  it('click reactions come from the seeded RNG: across seeds every reaction shows up, and nothing else', () => {
    const clicks = Array.from({ length: 12 }, (_, i) => [i * 100, input({ kind: 'click' })] as const);
    const runs = [1, 2, 3, 4, 5].map((seed) => replay(seeded(seed), clicks).effects);
    expect(new Set(runs.map((run) => JSON.stringify(run))).size).toBeGreaterThan(1);
    expect(new Set(runs.flatMap(shownAnims))).toEqual(new Set(CLICK_REACTIONS));
    expect(replay(seeded(1), clicks).state.rng).not.toBe(seeded(1).rng);
  });

  it('a click shows the reaction it picked, front-facing and still where the character stands', () => {
    const start = makeCoreState();
    const { state, effects } = step(start, input({ kind: 'click' }), 50);
    expect(effects).toHaveLength(1);
    const [effect] = effects;
    if (effect?.type !== 'Show') throw new Error(`expected Show, got ${effect?.type ?? 'nothing'}`);
    expect(effect).toMatchObject({
      facing: 'front',
      playback: 'fwd',
      motion: { kind: 'still', x: start.pos.x, y: start.pos.y },
    });
    expect(state.behavior).toMatchObject({ kind: 'react', reaction: 'poked', anim: effect.anim, since: 50 });
  });

  it('does not mutate the input state', () => {
    const state = makeCoreState();
    const before = structuredClone(state);
    replay(state, SCRIPT);
    expect(state).toEqual(before);
  });
});

describe('click-through (SetHitThrough)', () => {
  it('starts click-through and captures the mouse only over opaque pixels', () => {
    const start = readyState();
    expect(start.hitThrough).toBe(true);
    const over = step(start, input({ kind: 'hover', overOpaque: true }), 10);
    expect(over.effects).toEqual([{ type: 'SetHitThrough', ignore: false }]);
    const away = step(over.state, input({ kind: 'hover', overOpaque: false }), 20);
    expect(away.effects).toEqual([{ type: 'SetHitThrough', ignore: true }]);
    expect(away.state.hitThrough).toBe(true);
  });

  it('emits nothing when the hover result does not change', () => {
    expect(step(makeCoreState({ hitThrough: false }), input({ kind: 'hover', overOpaque: true }), 0).effects).toEqual(
      [],
    );
    expect(step(makeCoreState(), input({ kind: 'hover', overOpaque: false }), 0).effects).toEqual([]);
  });

  it('keeps the mouse captured during a drag even if the cursor outruns the sprite', () => {
    const dragging = step(makeCoreState({ hitThrough: false }), input({ kind: 'drag-start' }), 0).state;
    expect(step(dragging, input({ kind: 'hover', overOpaque: false }), 16).effects).toEqual([]);
  });
});

describe('drag', () => {
  it('drag-start enters drag, shows the drag pose and captures the mouse', () => {
    const start = makeCoreState();
    const result = step(start, input({ kind: 'drag-start' }), 500);
    expect(result.state.behavior).toEqual({ kind: 'drag', since: 500, until: null });
    expect(result.effects).toEqual([
      { type: 'SetHitThrough', ignore: false },
      {
        type: 'Show',
        anim: 'drag',
        facing: 'front',
        playback: 'fwd',
        motion: { kind: 'still', x: start.pos.x, y: start.pos.y },
      },
    ]);
  });

  it('drag-end returns to idle and stays captured until the next hover result', () => {
    const dragging = step(makeCoreState(), input({ kind: 'drag-start' }), 0).state;
    const result = step(dragging, release(), 300);
    expect(result.state.behavior).toEqual({ kind: 'idle', anim: 'idle_a', since: 300, until: null });
    expect(result.state.hitThrough).toBe(false);
    expect(shownAnims(result.effects)).toEqual(['idle_a']);
  });

  it('ignores clicks and a second drag-start while dragging', () => {
    const dragging = step(makeCoreState(), input({ kind: 'drag-start' }), 0).state;
    expect(step(dragging, input({ kind: 'click' }), 10)).toEqual({ state: dragging, effects: [] });
    expect(step(dragging, input({ kind: 'drag-start' }), 20)).toEqual({ state: dragging, effects: [] });
  });

  it('ignores drag-end without a drag', () => {
    const idle = makeCoreState();
    expect(step(idle, release(), 10)).toEqual({ state: idle, effects: [] });
  });
});

describe('illegal input → unchanged state + Rejected', () => {
  const tooMany = Array.from({ length: INPUT_LIMITS.windows + 1 }, (_, i) => makeWindow(`w${String(i)}`, 0, 0, 9, 9));
  it.each<[string, CoreEvent, string]>([
    [
      'world with a NaN work area',
      { type: 'world', world: makeWorld({ workArea: { width: NaN, height: 9 } }) },
      'non-finite',
    ],
    ['world with too many windows', { type: 'world', world: makeWorld({ windows: tooMany }) }, 'too-many'],
    ['world with a fractional scale', { type: 'world', world: makeWorld({ scale: 0.5 }) }, 'out-of-range'],
    ['pointer far off the overlay', input({ kind: 'pointer', x: INPUT_LIMITS.coordDip + 1, y: 0 }), 'out-of-range'],
    ['pointer with NaN', input({ kind: 'pointer', x: 0, y: NaN }), 'non-finite'],
    ['release with an infinite speed', release({ vx: Infinity }), 'non-finite'],
    ['release past the coordinate limit', release({ y: -INPUT_LIMITS.coordDip - 1 }), 'out-of-range'],
    ['negative user idle', { type: 'user-idle', idleMs: -1 }, 'out-of-range'],
    ['NaN user idle', { type: 'user-idle', idleMs: NaN }, 'non-finite'],
    [
      'switch to an empty id',
      { type: 'switch', to: '', mood: { mood: 50, affinity: 0, updatedAt: 0 } },
      'out-of-range',
    ],
    [
      'switch with mood 200',
      { type: 'switch', to: 'pixmates.goth', mood: { mood: 200, affinity: 0, updatedAt: 0 } },
      'out-of-range',
    ],
    [
      'loaded pack without an idle',
      { type: 'character-loaded', id: 'pixmates.goth', ok: true, anims: ['walk'] },
      'no-idle',
    ],
    [
      'loaded pack with too many animations',
      {
        type: 'character-loaded',
        id: 'pixmates.goth',
        ok: true,
        anims: Array.from({ length: PACK_LIMITS.animationsMax + 1 }, (_, i) => `a${String(i)}`),
      },
      'too-many',
    ],
  ])('%s', (_name, event, reason) => {
    const state = makeCoreState();
    const result = step(state, event, 10);
    expect(result.state).toBe(state);
    expect(result.effects).toEqual([{ type: 'Rejected', event: event.type, reason }]);
  });

  it('a non-finite now is rejected for any event', () => {
    const state = makeCoreState();
    expect(step(state, { type: 'tick' }, NaN)).toEqual({
      state,
      effects: [{ type: 'Rejected', event: 'tick', reason: 'non-finite' }],
    });
  });

  it.each<[string, CoreEvent]>([
    ['world at the window limit', { type: 'world', world: makeWorld({ windows: tooMany.slice(1) }) }],
    [
      'pointer exactly at the coordinate limit',
      input({ kind: 'pointer', x: -INPUT_LIMITS.coordDip, y: INPUT_LIMITS.coordDip }),
    ],
    ['fast release (clamped by physics, not rejected)', release({ vx: 1e7, vy: -1e7 })],
    ['zero user idle', { type: 'user-idle', idleMs: 0 }],
    ['a failed load', { type: 'character-loaded', id: 'pixmates.goth', ok: false }],
    ['lock', { type: 'power', state: 'lock' }],
  ])('accepts %s', (_name, event) => {
    expect(step(makeCoreState(), event, 10).effects.filter((effect) => effect.type === 'Rejected')).toEqual([]);
  });
});

describe('tick', () => {
  it('changes nothing before the M1 engine (no behaviour loop yet)', () => {
    const state = makeCoreState();
    expect(step(state, { type: 'tick' }, 1000)).toEqual({ state, effects: [] });
  });
});
