import { describe, expect, it } from 'vitest';
import { CLICK_REACTIONS } from '../../../src/content/stage.ts';
import { initialState, step } from '../../../src/core/step.ts';
import type { CoreEvent, CoreState, Effect, PointerInput } from '../../../src/core/types.ts';

const input = (value: PointerInput): CoreEvent => ({ type: 'input', input: value });

function makeCoreState(overrides: Partial<CoreState> = {}): CoreState {
  return { ...initialState(1), ...overrides };
}

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
  [900, input({ kind: 'drag-end' })],
  [950, input({ kind: 'hover', overOpaque: false })],
  [1000, input({ kind: 'click' })],
];

describe('step determinism', () => {
  it('same seed and same events give the same state and effects', () => {
    const a = replay(initialState(7), SCRIPT);
    expect(a.effects.length).toBeGreaterThan(0);
    expect(a).toEqual(replay(initialState(7), SCRIPT));
  });

  it('click reactions come from the seeded RNG: across seeds every reaction shows up, and nothing else', () => {
    const clicks = Array.from({ length: 12 }, (_, i) => [i * 100, input({ kind: 'click' })] as const);
    const runs = [1, 2, 3, 4, 5].map((seed) => replay(initialState(seed), clicks).effects);
    expect(new Set(runs.map((run) => JSON.stringify(run))).size).toBeGreaterThan(1);
    const names = new Set(runs.flat().map((effect) => (effect.type === 'PlayAnimation' ? effect.name : effect.type)));
    expect(names).toEqual(new Set(CLICK_REACTIONS));
    expect(replay(initialState(1), clicks).state.rng).not.toBe(initialState(1).rng);
  });

  it('a click plays the reaction it picked and the state shows it', () => {
    const { state, effects } = step(initialState(3), input({ kind: 'click' }), 0);
    expect(effects).toHaveLength(1);
    const [effect] = effects;
    expect(effect?.type).toBe('PlayAnimation');
    if (effect?.type !== 'PlayAnimation') return;
    expect(state.animation).toBe(effect.name);
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
    const start = initialState(1);
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
  it('drag-start enters dragging, plays drag and captures the mouse', () => {
    const result = step(makeCoreState(), input({ kind: 'drag-start' }), 500);
    expect(result.state.drag).toEqual({ kind: 'dragging', since: 500 });
    expect(result.state.animation).toBe('drag');
    expect(result.effects).toEqual([
      { type: 'SetHitThrough', ignore: false },
      { type: 'PlayAnimation', name: 'drag' },
    ]);
  });

  it('drag-end returns to idle and stays captured until the next hover result', () => {
    const dragging = step(makeCoreState(), input({ kind: 'drag-start' }), 0).state;
    const result = step(dragging, input({ kind: 'drag-end' }), 300);
    expect(result.state.drag).toEqual({ kind: 'idle' });
    expect(result.state.animation).toBe('idle_a');
    expect(result.state.hitThrough).toBe(false);
    expect(result.effects).toEqual([{ type: 'PlayAnimation', name: 'idle_a' }]);
  });

  it('ignores clicks and a second drag-start while dragging', () => {
    const dragging = step(makeCoreState(), input({ kind: 'drag-start' }), 0).state;
    expect(step(dragging, input({ kind: 'click' }), 10)).toEqual({ state: dragging, effects: [] });
    expect(step(dragging, input({ kind: 'drag-start' }), 20)).toEqual({ state: dragging, effects: [] });
  });

  it('ignores drag-end without a drag', () => {
    const idle = makeCoreState();
    expect(step(idle, input({ kind: 'drag-end' }), 10)).toEqual({ state: idle, effects: [] });
  });
});

describe('tick', () => {
  it('changes nothing in M0 (no behaviour loop yet)', () => {
    const state = makeCoreState();
    expect(step(state, { type: 'tick' }, 1000)).toEqual({ state, effects: [] });
  });
});
