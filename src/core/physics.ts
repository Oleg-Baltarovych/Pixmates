// Flight and support (plan M1 Design → Physics, SPEC §4.2): a fling or a drop is a closed-form ballistic path split
// at wall and ceiling bounces, landing on the first surface it crosses downward; a standing character whose window
// moved, closed or was hidden falls from rest. Numbers in art px from `content/physics.ts` (× DIP per art px), so
// the feel is size-independent. Pure: the engine (M1-14) routes events here and runs `advanceFlight` at `wakeAt`.
import { FLIGHT_BOUNDS_ART, HARD_LANDING_HOLD_MS, LAND_PLAY, PHYSICS } from '../content/physics.ts';
import { pathDurationMs, samplePath } from '../shared/path.ts';
import { surfaceUnder, visibleTops, type WindowTop } from './surfaces.ts';
import { travelX } from './travel.ts';
import type { CoreState, Effect, PathSegment, Placement, StepResult, World } from './types.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** DIP/s, y down. */
export interface Velocity {
  readonly vx: number;
  readonly vy: number;
}

export type Impact = 'soft' | 'hard';

/** A planned flight: its path (no zero-length segments; empty when it starts on its landing spot) and its end. */
export interface Flight {
  readonly segments: readonly PathSegment[];
  readonly durationMs: number;
  readonly landing: Placement;
  readonly impact: Impact;
}

const MS_PER_S = 1000;

/** Overlay DIP per art px: the integer sprite scale (device px) over the display scale factor. */
export const artPxDipOf = ({ scale, scaleFactor }: World): number => scale / scaleFactor;

/** Where the foot pivot may fly: inside the work area by half a frame at the sides, a whole frame at the top. */
interface Bounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly floor: number;
}

function boundsOf(world: World): Bounds {
  const artPx = artPxDipOf(world);
  const { width, height } = world.workArea;
  const side = Math.min(FLIGHT_BOUNDS_ART.side * artPx, width / 2);
  return { left: side, right: width - side, top: Math.min(FLIGHT_BOUNDS_ART.top * artPx, height), floor: height };
}

/** Touch-down faster than `hardLandingArtS` (downward, DIP/s) is a hard landing. */
const impactOf = (vy: number, world: World): Impact =>
  vy > PHYSICS.hardLandingArtS * artPxDipOf(world) ? 'hard' : 'soft';

/** Window tops a flight may land on: none on the desktop-only layer (D-9: floor only). */
const landingTops = (world: World): readonly WindowTop[] =>
  world.layer === 'desktop' ? [] : visibleTops(world.windows, world.workArea, artPxDipOf(world));

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

/** Caps a fling's speed at `PHYSICS.flingMaxArtS`, keeping its direction. */
export function clampFling(velocity: Velocity, world: World): Velocity {
  const max = PHYSICS.flingMaxArtS * artPxDipOf(world);
  const speed = Math.hypot(velocity.vx, velocity.vy);
  if (speed <= max) return velocity;
  const k = max / speed;
  return { vx: velocity.vx * k, vy: velocity.vy * k };
}

/** Seconds until y(t) = y0 + vy·t + ½·g·t² comes down through `level` (the later root), or null if never. */
function descendTime(y0: number, vy: number, g: number, level: number): number | null {
  const disc = vy * vy - 2 * g * (y0 - level);
  if (disc < 0) return null;
  const t = (-vy + Math.sqrt(disc)) / g;
  return t >= 0 ? t : null;
}

/** Seconds until the rising path reaches `top` (the earlier root), or Infinity if it does not rise that far. */
function ceilingTime(y0: number, vy: number, g: number, top: number): number {
  if (vy >= 0) return Number.POSITIVE_INFINITY;
  const disc = vy * vy - 2 * g * (y0 - top);
  return disc < 0 ? Number.POSITIVE_INFINITY : Math.max(0, (-vy - Math.sqrt(disc)) / g);
}

function wallTime(x0: number, vx: number, bounds: Bounds): number {
  if (vx > 0) return Math.max(0, (bounds.right - x0) / vx);
  if (vx < 0) return Math.max(0, (bounds.left - x0) / vx);
  return Number.POSITIVE_INFINITY;
}

interface Touch {
  readonly t: number;
  readonly landing: Placement;
}

/** The first surface the piece from (x, y) with (vx, vy) comes down onto: a window top holding x then, or the floor. */
function firstTouch(tops: readonly WindowTop[], bounds: Bounds, from: Point, v: Velocity, g: number): Touch {
  // The floor is at or below the start (bounds clamp it) and g > 0, so the root always exists.
  const floorT = descendTime(from.y, v.vy, g, bounds.floor) ?? 0;
  let best: Touch = { t: floorT, landing: { surface: { kind: 'floor' }, x: from.x + v.vx * floorT, y: bounds.floor } };
  for (const top of tops) {
    const t = descendTime(from.y, v.vy, g, top.y);
    if (t === null || t >= best.t) continue;
    const x = from.x + v.vx * t;
    if (top.left <= x && x < top.right) best = { t, landing: { surface: top, x, y: top.y } };
  }
  return best;
}

/**
 * The flight from `from` at `velocity` (as given; clamp a fling first) in `world`: the start is moved inside the
 * flight bounds, each segment ends at the first wall, ceiling or landing; a bounce keeps `restitution` of the speed
 * into the wall or ceiling, reversed. After `maxBounces` the rest drops straight down, so every flight ends.
 */
export function planFlight(world: World, from: Point, velocity: Velocity): Flight {
  const bounds = boundsOf(world);
  const g = PHYSICS.gravityArtS2 * artPxDipOf(world);
  const tops = landingTops(world);
  const segments: PathSegment[] = [];
  let at: Point = { x: clamp(from.x, bounds.left, bounds.right), y: clamp(from.y, bounds.top, bounds.floor) };
  let v = velocity;
  const piece = (t: number): void => {
    if (t > 0) segments.push({ durationMs: t * MS_PER_S, x0: at.x, y0: at.y, vx: v.vx, vy: v.vy, gravity: g });
  };
  for (let bounces = 0; ; bounces += 1) {
    if (bounces >= PHYSICS.maxBounces) v = { vx: 0, vy: Math.max(0, v.vy) };
    const touch = firstTouch(tops, bounds, at, v, g);
    const tWall = wallTime(at.x, v.vx, bounds);
    const tCeiling = ceilingTime(at.y, v.vy, g, bounds.top);
    const tBounce = Math.min(tWall, tCeiling);
    if (touch.t <= tBounce) {
      piece(touch.t);
      const durationMs = pathDurationMs(segments);
      const impact = impactOf(v.vy + g * touch.t, world);
      return { segments, durationMs, landing: touch.landing, impact };
    }
    piece(tBounce);
    const vy = v.vy + g * tBounce;
    const x = tWall <= tCeiling ? (v.vx > 0 ? bounds.right : bounds.left) : at.x + v.vx * tBounce;
    const y = tCeiling <= tWall ? bounds.top : at.y + v.vy * tBounce + (g * tBounce * tBounce) / 2;
    at = { x, y };
    v = {
      vx: tWall <= tCeiling ? -v.vx * PHYSICS.restitution : v.vx,
      vy: tCeiling <= tWall ? -vy * PHYSICS.restitution : vy,
    };
  }
}

/**
 * Where a character standing at `placement` stands in `world`, re-homed onto the fresh segment (`surfaceUnder`:
 * same window, top within tolerance, x on it), or null when it must fall. The floor always holds; its y follows the
 * work area. Segment ends change with every occluder move, so this never compares segments.
 */
export function supportOf(world: World, placement: Placement): Placement | null {
  if (placement.surface.kind === 'floor') return { ...placement, y: world.workArea.height };
  const top = surfaceUnder(landingTops(world), placement);
  return top === null ? null : { surface: top, x: placement.x, y: top.y };
}

const landMs = (impact: Impact): number =>
  (LAND_PLAY.frames * MS_PER_S) / LAND_PLAY.fps + (impact === 'hard' ? HARD_LANDING_HOLD_MS : 0);

function landAt(state: CoreState, landing: Placement, impact: Impact, now: number): StepResult {
  const until = now + landMs(impact);
  const effects: Effect[] = [
    {
      type: 'Show',
      anim: 'land',
      facing: 'front',
      playback: 'fwd',
      motion: { kind: 'still', x: landing.x, y: landing.y },
    },
  ];
  if (impact === 'hard') effects.push({ type: 'Fx', mark: 'sweat', untilMs: until });
  return { state: { ...state, pos: landing, behavior: { kind: 'land', since: now, until }, wakeAt: until }, effects };
}

/** Flies `flight` from `now`. While falling, `pos` is where it will land (kept fresh by `replanFlight`). */
function fly(state: CoreState, flight: Flight, now: number): StepResult {
  if (flight.segments.length === 0) return landAt(state, flight.landing, flight.impact, now);
  const until = now + flight.durationMs;
  return {
    state: {
      ...state,
      pos: flight.landing,
      behavior: { kind: 'fall', path: flight.segments, since: now, until },
      wakeAt: until,
    },
    effects: [
      {
        type: 'Show',
        anim: 'fall',
        facing: 'front',
        playback: 'fwd',
        motion: { kind: 'path', segments: flight.segments },
      },
    ],
  };
}

/** A fling (drag release, speed clamped) or a drop from rest, from `from` at `now`. */
export const startFlight = (state: CoreState, from: Point, velocity: Velocity, now: number): StepResult =>
  fly(state, planFlight(state.world, from, clampFling(velocity, state.world)), now);

/**
 * After a world change: a falling character re-plans from where it is now, at the speed it has now (a window that
 * appeared below catches it; one that vanished no longer does). Any other state is left as it is.
 */
export function replanFlight(state: CoreState, now: number): StepResult {
  const { behavior } = state;
  if (behavior.kind !== 'fall') return { state, effects: [] };
  const here = samplePath(behavior.path, now - behavior.since);
  if (here === null) return { state, effects: [] };
  return fly(state, planFlight(state.world, here, { vx: here.vx, vy: here.vy }), now);
}

/**
 * After a world change, for a character standing on `pos` (any state but `drag` and `fall`, which the engine handles
 * with the release and `replanFlight`): still supported → `pos` re-homed (surface and y; a walk keeps its start x),
 * no effect; otherwise it falls from rest at its live x (a walker's last stride). Whether a hidden or sleeping
 * character falls at once is the engine's call (M1-14).
 */
export function checkSupport(state: CoreState, now: number): StepResult {
  const { behavior, pos, world } = state;
  if (behavior.kind === 'drag' || behavior.kind === 'fall') return { state, effects: [] };
  const x = travelX(state, now);
  const support = supportOf(world, { ...pos, x });
  if (support !== null)
    return { state: { ...state, pos: { ...pos, surface: support.surface, y: support.y } }, effects: [] };
  return startFlight(state, { x, y: pos.y }, { vx: 0, vy: 0 }, now);
}

/**
 * Moves a flight on once its deadline has passed: fall → `land` at the landing spot (a hard landing holds longer and
 * sweats) → front idle (`wakeAt = now`: the engine picks what comes next). Any other state, or a deadline still
 * ahead, is left as it is.
 */
export function advanceFlight(state: CoreState, now: number): StepResult {
  const { behavior } = state;
  if ((behavior.kind !== 'fall' && behavior.kind !== 'land') || now < behavior.until) return { state, effects: [] };
  if (behavior.kind === 'fall') {
    const end = samplePath(behavior.path, behavior.until - behavior.since);
    const impact = impactOf(end?.vy ?? 0, state.world);
    return landAt(state, state.pos, impact, now);
  }
  const anim = state.character.idle;
  const { x, y } = state.pos;
  return {
    state: { ...state, behavior: { kind: 'idle', anim, since: now, until: null }, wakeAt: now },
    effects: [{ type: 'Show', anim, facing: 'front', playback: 'fwd', motion: { kind: 'still', x, y } }],
  };
}
