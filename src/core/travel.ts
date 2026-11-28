// Travel along a surface (plan M1 Design → Travel, SPEC §4.2 D-16, ADR 010): distance quantised to whole walk
// strides so the planted foot never skates; `turn` forward → `walk` → `turn` reversed → front idle. Facing comes from
// the travel direction; left is the stage's runtime mirror of the right-facing q34 art. Pure: the caller (engine,
// M1-14) picks the target and runs `advanceTravel` at each `wakeAt`.
import { TURN_PLAY, WALK_EDGE_INSET_ART, WALK_TRAVEL } from '../content/stage.ts';
import { dirSign, walkX, type WalkMotion } from '../shared/motion.ts';
import type { Behavior, CoreState, Direction, Effect, StepResult, Surface, World } from './types.ts';

/** Half-open horizontal range `[left, right)` the foot pivot may stand in (overlay DIP). */
export interface Span {
  readonly left: number;
  readonly right: number;
}

/** A walk planned in whole strides: `steps` walk frames of `stepDip`, arriving at `x1` after `durationMs`. */
export interface Stride {
  readonly dir: Direction;
  readonly x0: number;
  readonly x1: number;
  readonly steps: number;
  readonly stepDip: number;
  readonly durationMs: number;
}

type Walk = Extract<Behavior, { readonly kind: 'walk' }>;

const MS_PER_S = 1000;

/** One turn, played either way. */
export const turnMs = (TURN_PLAY.frames * MS_PER_S) / TURN_PLAY.fps;

/** DIP the sprite moves per walk frame: `pxPerFrame` art px × the integer scale in device px, as overlay DIP. */
export const stepDipOf = ({ scale, scaleFactor }: World): number => (WALK_TRAVEL.pxPerFrame * scale) / scaleFactor;

/**
 * Where the foot pivot may walk on `surface`: the work-area width on the floor, the visible segment on a window top,
 * each inset by `WALK_EDGE_INSET_ART` so both feet stay on the edge. The sprite may overhang a segment end (plan
 * M1-07): segments have no half-sprite inset.
 */
export function surfaceSpan(surface: Surface, world: World): Span {
  const inset = (WALK_EDGE_INSET_ART * world.scale) / world.scaleFactor;
  const raw = surface.kind === 'floor' ? { left: 0, right: world.workArea.width } : surface;
  return { left: raw.left + inset, right: raw.right - inset };
}

const clamp = (value: number, span: Span): number => Math.min(span.right, Math.max(span.left, value));
const inSpan = (x: number, span: Span): boolean => span.left <= x && x < span.right;

/**
 * The walk from `x0` toward `target` (clamped to the span's ends) in `round(distance / stepDip)` strides, one fewer
 * when that would end outside `[left, right)`. Null when that is no stride at all.
 */
export function planStride(x0: number, target: number, world: World, span: Span): Stride | null {
  const stepDip = stepDipOf(world);
  const dx = clamp(target, span) - x0;
  const dir: Direction = dx < 0 ? 'left' : 'right';
  const sign = dirSign(dir);
  const arrival = (steps: number): number => x0 + sign * steps * stepDip;
  const rounded = Math.round(Math.abs(dx) / stepDip);
  const steps = inSpan(arrival(rounded), span) ? rounded : rounded - 1;
  if (steps <= 0) return null;
  return { dir, x0, x1: arrival(steps), steps, stepDip, durationMs: (steps * MS_PER_S) / WALK_TRAVEL.fps };
}

const walkMotion = (stride: Stride, y: number): WalkMotion => ({
  kind: 'walk',
  x0: stride.x0,
  y,
  dir: stride.dir,
  steps: stride.steps,
  stepDip: stride.stepDip,
});

/** The walk a `walk` behaviour shows: stride count from its duration, stride length from its distance. */
function motionOf(walk: Walk, y: number): WalkMotion {
  const steps = Math.round(((walk.until - walk.since) * WALK_TRAVEL.fps) / MS_PER_S);
  const stepDip = steps > 0 ? Math.abs(walk.x1 - walk.x0) / steps : 0;
  return { kind: 'walk', x0: walk.x0, y, dir: walk.dir, steps, stepDip };
}

const still = (x: number, y: number) => ({ kind: 'still', x, y }) as const;

/** The reversed turn back to front after a walk (or instead of one), in place at `x`. */
function turnBack(state: CoreState, dir: Direction, x: number, now: number): StepResult {
  const until = now + turnMs;
  return {
    state: {
      ...state,
      pos: { ...state.pos, x },
      facing: dir,
      behavior: { kind: 'turn', dir, then: { kind: 'front' }, since: now, until },
      wakeAt: until,
    },
    effects: [{ type: 'Show', anim: 'turn', facing: dir, playback: 'rev', motion: still(x, state.pos.y) }],
  };
}

/**
 * Starts travel toward `target` on the current surface: `turn` forward, facing the travel direction. A target under
 * half a stride away (after clamping to the surface) leaves the state as it is.
 */
export function startTravel(state: CoreState, target: number, now: number): StepResult {
  const { pos, world } = state;
  const stride = planStride(pos.x, target, world, surfaceSpan(pos.surface, world));
  if (stride === null) return { state, effects: [] };
  const until = now + turnMs;
  const effects: Effect[] = [
    { type: 'Show', anim: 'turn', facing: stride.dir, playback: 'fwd', motion: still(pos.x, pos.y) },
  ];
  return {
    state: {
      ...state,
      facing: stride.dir,
      behavior: { kind: 'turn', dir: stride.dir, then: { kind: 'walk', x1: stride.x1 }, since: now, until },
      wakeAt: until,
    },
    effects,
  };
}

/**
 * Moves a travel on once its deadline has passed: turn forward → walk (re-planned on the current stride grid, so a
 * scale change during the turn is honoured) → turn reversed at the arrival → front idle (`wakeAt = now`: the engine
 * picks what comes next). Any other state, or a deadline still ahead, is left as it is.
 */
export function advanceTravel(state: CoreState, now: number): StepResult {
  const { behavior, pos, world } = state;
  if ((behavior.kind !== 'turn' && behavior.kind !== 'walk') || now < behavior.until) return { state, effects: [] };
  if (behavior.kind === 'walk') return turnBack(state, behavior.dir, behavior.x1, now);
  if (behavior.then.kind === 'walk') {
    const stride = planStride(pos.x, behavior.then.x1, world, surfaceSpan(pos.surface, world));
    if (stride === null) return turnBack(state, behavior.dir, pos.x, now);
    const until = now + stride.durationMs;
    return {
      state: {
        ...state,
        facing: stride.dir,
        behavior: { kind: 'walk', dir: stride.dir, x0: stride.x0, x1: stride.x1, since: now, until },
        wakeAt: until,
      },
      effects: [{ type: 'Show', anim: 'walk', facing: stride.dir, playback: 'fwd', motion: walkMotion(stride, pos.y) }],
    };
  }
  const anim = state.character.idle;
  return {
    state: { ...state, behavior: { kind: 'idle', anim, since: now, until: null }, wakeAt: now },
    effects: [{ type: 'Show', anim, facing: 'front', playback: 'fwd', motion: still(pos.x, pos.y) }],
  };
}

/** The live foot x: the last whole stride of a walk (what the stage shows), else the settled spot. */
export const travelX = (state: CoreState, now: number): number =>
  state.behavior.kind === 'walk'
    ? walkX(motionOf(state.behavior, state.pos.y), now - state.behavior.since, WALK_TRAVEL.fps)
    : state.pos.x;
