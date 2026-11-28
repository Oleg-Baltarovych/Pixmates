// The core step (ADR 002): (state, event, now) → { state, effects }. Pure and deterministic.
// Interim M0 behaviour on the M1 shapes (plan M1-03): drag, click-through and a click reaction. Every event is
// checked first; the M1 engine (`core/behavior/engine.ts`, M1-14) replaces the rest.
import { CLICK_REACTIONS } from '../content/stage.ts';
import { nextInt } from './rng.ts';
import { idleOf } from './state.ts';
import type { AnimName, CoreEvent, CoreState, Effect, PointerInput, StepResult } from './types.ts';
import { checkEvent } from './validate.ts';

const NOTHING: readonly Effect[] = [];

export function step(state: CoreState, event: CoreEvent, now: number): StepResult {
  const reason = checkEvent(event, now);
  if (reason !== undefined) return { state, effects: [{ type: 'Rejected', event: event.type, reason }] };
  switch (event.type) {
    case 'input':
      return onInput(state, event.input, now);
    case 'tick':
    case 'world':
    case 'user-idle':
    case 'power':
    case 'visibility':
    case 'switch':
    case 'character-loaded':
    case 'menu-closed':
      // Valid, handled from M1-04 on (surfaces, sleep, switch, menu).
      return { state, effects: NOTHING };
  }
}

/** A front-facing animation where the character stands. */
const showStill = (state: CoreState, anim: AnimName): Effect => ({
  type: 'Show',
  anim,
  facing: 'front',
  playback: 'fwd',
  motion: { kind: 'still', x: state.pos.x, y: state.pos.y },
});

function setHitThrough(state: CoreState, ignore: boolean): StepResult {
  if (state.hitThrough === ignore) return { state, effects: NOTHING };
  return { state: { ...state, hitThrough: ignore }, effects: [{ type: 'SetHitThrough', ignore }] };
}

function onInput(state: CoreState, input: PointerInput, now: number): StepResult {
  const dragging = state.behavior.kind === 'drag';
  switch (input.kind) {
    case 'hover':
      // During a drag the cursor may outrun the sprite; keep the mouse captured until drag-end.
      if (dragging) return { state, effects: NOTHING };
      return setHitThrough(state, !input.overOpaque);
    case 'drag-start': {
      if (dragging) return { state, effects: NOTHING };
      const captured = setHitThrough(state, false);
      return {
        state: { ...captured.state, behavior: { kind: 'drag', since: now, until: null } },
        effects: [...captured.effects, showStill(state, 'drag')],
      };
    }
    case 'drag-end': {
      const idle = idleOf(state.character);
      if (!dragging || idle === undefined) return { state, effects: NOTHING };
      return {
        state: { ...state, behavior: { kind: 'idle', anim: idle, since: now, until: null } },
        effects: [showStill(state, idle)],
      };
    }
    case 'click': {
      const idle = idleOf(state.character);
      if (dragging || idle === undefined) return { state, effects: NOTHING };
      const draw = nextInt(state.rng, CLICK_REACTIONS.length);
      const anim = CLICK_REACTIONS[draw.value] ?? idle;
      const resume = { kind: 'idle', anim: idle, since: now, until: null } as const;
      return {
        state: {
          ...state,
          rng: draw.state,
          behavior: { kind: 'react', reaction: 'poked', anim, resume, since: now, until: null },
        },
        effects: [showStill(state, anim)],
      };
    }
    case 'pointer':
    case 'pointer-leave':
    case 'context-menu':
      // Valid, handled by the cursor (M1-10) and menu (M1-25) steps.
      return { state, effects: NOTHING };
  }
}
