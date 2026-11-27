// The core step (ADR 002, plan M0-05): (state, event, now) → { state, effects }. Pure and deterministic.
// M0 decides only the drag state, click-through and a click reaction; main interprets the effects.
import { CLICK_REACTIONS } from '../content/stage.ts';
import { nextInt, seedRng } from './rng.ts';
import type { CoreEvent, CoreState, Effect, PointerInput, StepResult } from './types.ts';

const NOTHING: readonly Effect[] = [];

export function initialState(seed: number): CoreState {
  return { rng: seedRng(seed), drag: { kind: 'idle' }, animation: 'idle_a', hitThrough: true };
}

export function step(state: CoreState, event: CoreEvent, now: number): StepResult {
  switch (event.type) {
    case 'tick':
      return { state, effects: NOTHING };
    case 'input':
      return onInput(state, event.input, now);
  }
}

function setHitThrough(state: CoreState, ignore: boolean): StepResult {
  if (state.hitThrough === ignore) return { state, effects: NOTHING };
  return { state: { ...state, hitThrough: ignore }, effects: [{ type: 'SetHitThrough', ignore }] };
}

function onInput(state: CoreState, input: PointerInput, now: number): StepResult {
  const dragging = state.drag.kind === 'dragging';
  switch (input.kind) {
    case 'hover':
      // During a drag the cursor may outrun the sprite; keep the mouse captured until drag-end.
      if (dragging) return { state, effects: NOTHING };
      return setHitThrough(state, !input.overOpaque);
    case 'drag-start': {
      if (dragging) return { state, effects: NOTHING };
      const captured = setHitThrough(state, false);
      return {
        state: { ...captured.state, drag: { kind: 'dragging', since: now }, animation: 'drag' },
        effects: [...captured.effects, { type: 'PlayAnimation', name: 'drag' }],
      };
    }
    case 'drag-end':
      if (!dragging) return { state, effects: NOTHING };
      return {
        state: { ...state, drag: { kind: 'idle' }, animation: 'idle_a' },
        effects: [{ type: 'PlayAnimation', name: 'idle_a' }],
      };
    case 'click': {
      if (dragging) return { state, effects: NOTHING };
      const draw = nextInt(state.rng, CLICK_REACTIONS.length);
      const name = CLICK_REACTIONS[draw.value] ?? 'idle_a';
      return { state: { ...state, rng: draw.state, animation: name }, effects: [{ type: 'PlayAnimation', name }] };
    }
  }
}
