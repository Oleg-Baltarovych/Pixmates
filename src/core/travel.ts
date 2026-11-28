// Travel along a surface (plan M1 Design → Travel, SPEC §4.2 D-16, ADR 010): distance quantised to whole walk
// strides so the planted foot never skates; `turn` forward → `walk` → `turn` reversed → front idle. Facing comes from
// the travel direction; left is the stage's runtime mirror of the right-facing q34 art. Pure: the caller (engine,
// M1-14) picks the target and runs `advanceTravel` at each `wakeAt`.
import { SPRITE_FRAME_WIDTH_ART } from '../content/desktop.ts';
import { TURN_PLAY, WALK_EDGE_INSET_ART, WALK_TRAVEL } from '../content/stage.ts';
import { dirSign, walkX } from '../shared/motion.ts';
import type { Span } from './surfaces.ts';
import type { CoreState, Direction, Effect, StepResult, Surface, World } from './types.ts';

/** A walk planned in whole strides: `steps` walk frames of `stepDip`, arriving at `x1` after `durationMs`. */
export interface Stride {
  readonly dir: Direction;
  readonly x0: number;
  readonly x1: number;
  readonly steps: number;
  readonly stepDip: number;
  readonly durationMs: number;
}

const MS_PER_S = 1000;
const HALF = 2;

/** One turn, played either way. */
export const turnMs = (TURN_PLAY.frames * MS_PER_S) / TURN_PLAY.fps;

/** DIP the sprite moves per walk frame: `pxPerFrame` art px × the integer scale in device px, as overlay DIP. */
export const stepDipOf = ({ scale, scaleFactor }: World): number => (WALK_TRAVEL.pxPerFrame * scale) / scaleFactor;

/** `x` on the device-pixel grid (a DIP multiple of 1 / scaleFactor): strides are whole device px, so all land on it. */
const toDeviceGrid = (x: number, { scaleFactor }: World): number => Math.round(x * scaleFactor) / scaleFactor;

/**
 * Where the foot pivot may walk on `surface`. The floor (the work-area width) is inset by half the frame width so the
 * whole sprite stays on screen; a window top (its visible segment) only by `WALK_EDGE_INSET_ART`, so both feet stay
 * on the edge while the sprite may overhang its ends (plan M1-07). A top narrower than both insets gives an empty span.
 */
export function surfaceSpan(surface: Surface, world: World): Span {
  const artDip = world.scale / world.scaleFactor;
  if (surface.kind === 'floor') {
    const inset = Math.max(WALK_EDGE_INSET_ART, SPRITE_FRAME_WIDTH_ART / HALF) * artDip;
    return { left: inset, right: world.workArea.width - inset };
  }
  const inset = WALK_EDGE_INSET_ART * artDip;
  return { left: surface.left + inset, right: surface.right - inset };
}

const clamp = (value: number, span: Span): number => Math.min(span.right, Math.max(span.left, value));
/** Half-open: an arrival that lands on `right` only by FP rounding is refused, conservatively losing that stride. */
const inSpan = (x: number, span: Span): boolean => span.left <= x && x < span.right;

/**
 * The walk from `x0` toward `target` (clamped to the span's ends) in `round(distance / stepDip)` strides; when that
 * arrival is outside `[left, right)`, one fewer (it overshot an end) or, when `x0` itself is outside (the window
 * moved), one more (it fell short of the nearest end). Null when no stride count arrives inside, or the span is empty.
 */
export function planStride(x0: number, target: number, world: World, span: Span): Stride | null {
  if (span.right <= span.left) return null;
  const stepDip = stepDipOf(world);
  const dx = clamp(target, span) - x0;
  const dir: Direction = dx < 0 ? 'left' : 'right';
  const sign = dirSign(dir);
  const arrival = (steps: number): number => x0 + sign * steps * stepDip;
  const rounded = Math.round(Math.abs(dx) / stepDip);
  const candidates = inSpan(x0, span) ? [rounded, rounded - 1] : [rounded, rounded + 1];
  const steps = candidates.find((n) => n > 0 && inSpan(arrival(n), span));
  if (steps === undefined) return null;
  return { dir, x0, x1: arrival(steps), steps, stepDip, durationMs: (steps * MS_PER_S) / WALK_TRAVEL.fps };
}

/** The `turn` shown in place at `x`: forward before a walk, reversed after it. */
const turnShow = (dir: Direction, playback: 'fwd' | 'rev', x: number, y: number): Effect => ({
  type: 'Show',
  anim: 'turn',
  facing: dir,
  playback,
  motion: { kind: 'still', x, y },
});

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
    effects: [turnShow(dir, 'rev', x, state.pos.y)],
  };
}

/**
 * Starts travel toward `target` on the current surface: `turn` forward, facing the travel direction, from the foot
 * snapped onto the device-pixel grid (≤ half a device px) so every stride lands on whole device px. A target under
 * half a stride away (after clamping to the surface), or an empty span, leaves the state as it is.
 */
export function startTravel(state: CoreState, target: number, now: number): StepResult {
  const { pos, world } = state;
  const x0 = toDeviceGrid(pos.x, world);
  const stride = planStride(x0, target, world, surfaceSpan(pos.surface, world));
  if (stride === null) return { state, effects: [] };
  const until = now + turnMs;
  return {
    state: {
      ...state,
      pos: { ...pos, x: x0 },
      facing: stride.dir,
      behavior: { kind: 'turn', dir: stride.dir, then: { kind: 'walk', x1: stride.x1 }, since: now, until },
      wakeAt: until,
    },
    effects: [turnShow(stride.dir, 'fwd', x0, pos.y)],
  };
}

/**
 * Moves a travel on once its deadline has passed: turn forward → walk (re-planned on the current stride grid, so a
 * scale change during the turn is honoured) → turn reversed at the arrival → front idle (`wakeAt = now`: the engine
 * picks what comes next). Any other state, or a deadline still ahead, is left as it is. Each phase is stamped at
 * `now`, not at the missed deadline: the stage starts the shown animation when it receives it, so a late wake shifts
 * the walk in time and never jumps its position.
 */
export function advanceTravel(state: CoreState, now: number): StepResult {
  const { behavior, pos, world } = state;
  if ((behavior.kind !== 'turn' && behavior.kind !== 'walk') || now < behavior.until) return { state, effects: [] };
  if (behavior.kind === 'walk') return turnBack(state, behavior.dir, behavior.x1, now);
  if (behavior.then.kind === 'walk') {
    const x0 = toDeviceGrid(pos.x, world);
    const stride = planStride(x0, behavior.then.x1, world, surfaceSpan(pos.surface, world));
    if (stride === null) return turnBack(state, behavior.dir, pos.x, now);
    const { dir, x1, steps, stepDip, durationMs } = stride;
    const until = now + durationMs;
    return {
      state: {
        ...state,
        pos: { ...pos, x: x0 },
        facing: dir,
        behavior: { kind: 'walk', dir, x0, x1, steps, stepDip, since: now, until },
        wakeAt: until,
      },
      effects: [
        {
          type: 'Show',
          anim: 'walk',
          facing: dir,
          playback: 'fwd',
          motion: { kind: 'walk', x0, y: pos.y, dir, steps, stepDip },
        },
      ],
    };
  }
  const anim = state.character.idle;
  return {
    state: { ...state, behavior: { kind: 'idle', anim, since: now, until: null }, wakeAt: now },
    effects: [{ type: 'Show', anim, facing: 'front', playback: 'fwd', motion: { kind: 'still', x: pos.x, y: pos.y } }],
  };
}

/** The live foot x: the last whole stride of a walk (what the stage shows), exactly `x1` from its arrival on. */
export function travelX(state: CoreState, now: number): number {
  const { behavior, pos } = state;
  if (behavior.kind !== 'walk') return pos.x;
  if (now >= behavior.until) return behavior.x1;
  const { x0, dir, steps, stepDip, since } = behavior;
  return walkX({ kind: 'walk', x0, y: pos.y, dir, steps, stepDip }, now - since, WALK_TRAVEL.fps);
}
