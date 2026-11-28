// Core test builders (rules/testing.md): a valid world, character and state, overridable per test.
import { initialState, type InitInput } from '../../src/core/state.ts';
import type { CharacterRef, CoreState, DesktopWindow, World } from '../../src/core/types.ts';

export const makeWorld = (overrides: Partial<World> = {}): World => ({
  workArea: { width: 1920, height: 1032 },
  windows: [],
  scale: 4,
  scaleFactor: 1.25,
  layer: 'on-top',
  tzOffsetMin: 120,
  ...overrides,
});

export const makeCharacter = (
  anims: readonly string[] = ['idle_a', 'idle_b', 'walk', 'turn', 'drag', 'happy', 'wave'],
): CharacterRef => ({ id: 'pixmates.maid', anims });

export const makeWindow = (id: string, x: number, y: number, width: number, height: number): DesktopWindow => ({
  id,
  rect: { x, y, width, height },
});

export const makeInit = (overrides: Partial<InitInput> = {}): InitInput => ({
  seed: 7,
  character: makeCharacter(),
  world: makeWorld(),
  now: 1_000,
  ...overrides,
});

/** The state of a successful init; throws with the reason otherwise (a broken builder, not a test result). */
export function readyState(input: InitInput = makeInit()): CoreState {
  const result = initialState(input);
  if (!result.ok) throw new Error(`initialState rejected: ${result.reason}`);
  return result.state;
}

export function makeCoreState(overrides: Partial<CoreState> = {}, init: Partial<InitInput> = {}): CoreState {
  return { ...readyState(makeInit(init)), ...overrides };
}
