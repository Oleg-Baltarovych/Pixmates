// Core data shapes (ADR 002, plan M0-05). Plain, serialisable data: no classes, no functions, no platform types.
import type { PlaceholderAnimation } from '../content/placeholder.ts';

export type AnimationName = PlaceholderAnimation;

/** Seeded RNG state (uint32). Lives in CoreState so a replay with the same seed is identical. */
export type RngState = number;

export type DragState = { readonly kind: 'idle' } | { readonly kind: 'dragging'; readonly since: number };

export interface CoreState {
  readonly rng: RngState;
  readonly drag: DragState;
  readonly animation: AnimationName;
  /** Whether the stage window currently lets clicks through (main mirrors it with setIgnoreMouseEvents). */
  readonly hitThrough: boolean;
}

export type PointerInput =
  | { readonly kind: 'hover'; readonly overOpaque: boolean }
  | { readonly kind: 'drag-start' }
  | { readonly kind: 'drag-end' }
  | { readonly kind: 'click' };

export type CoreEvent = { readonly type: 'tick' } | { readonly type: 'input'; readonly input: PointerInput };

export type Effect =
  | { readonly type: 'PlayAnimation'; readonly name: AnimationName }
  | { readonly type: 'SetHitThrough'; readonly ignore: boolean };

export interface StepResult {
  readonly state: CoreState;
  readonly effects: readonly Effect[];
}
