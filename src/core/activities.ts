// Activity picker (SPEC §4.3, plan M1-09): a weighted pick among the activities whose conditions hold — surface kind,
// mood band, local time of day, cooldown since the last start, the pack having the animation, room to stroll — with
// the most recent picks weighted down (`ACTIVITY_PICK.recentPenalty`) so the character does not repeat itself.
// Pure and seeded: the RNG state comes in with the core state and goes out advanced. The engine (M1-14) calls
// `startActivity` when a resting state is due; the catalogue (shared set, per-character weights from M1-15) and the
// mood band (M1-12 `core/mood.ts`) come in through `PickContext`.
import { ACTIVITY_PICK } from '../content/activities.ts';
import { inDailyWindow } from './clock.ts';
import { nextFloat, nextInt } from './rng.ts';
import { artPxDipOf } from './surfaces.ts';
import { startTravel, surfaceSpan } from './travel.ts';
import type {
  ActivityAction,
  ActivityDef,
  ActivityId,
  AnimName,
  CoreState,
  MoodBand,
  Range,
  RecentActivity,
  RestingBehavior,
  RngState,
  StepResult,
} from './types.ts';

export interface PickContext {
  readonly band: MoodBand;
  readonly catalogue: readonly ActivityDef[];
}

/** An activity's action with its random parts drawn: a duration, or a stroll's target x (overlay DIP). */
export type PickedAction =
  | { readonly kind: 'idle'; readonly durationMs: number }
  | { readonly kind: 'play'; readonly anim: AnimName; readonly durationMs: number }
  | { readonly kind: 'sit'; readonly durationMs: number }
  | { readonly kind: 'stroll'; readonly target: number };

export interface ActivityPick {
  readonly id: ActivityId;
  readonly action: PickedAction;
}

export interface Picked {
  /** Null when no activity may start now. */
  readonly pick: ActivityPick | null;
  /** The advanced RNG state (unchanged when there is no pick). */
  readonly rng: RngState;
}

const SIT_ANIM = 'sit_edge';
const WALK_ANIM = 'walk';

/** Room to stroll from the current x on each side, DIP (negative when the foot is outside the span). */
function strollRoom(state: CoreState): { readonly left: number; readonly right: number } {
  const span = surfaceSpan(state.pos.surface, state.world);
  return { left: state.pos.x - span.left, right: span.right - state.pos.x };
}

/** The animation an action needs from the pack (the base idle always exists). */
function animOf(action: ActivityAction, state: CoreState): AnimName {
  switch (action.kind) {
    case 'idle':
      return state.character.idle;
    case 'play':
      return action.anim;
    case 'sit':
      return SIT_ANIM;
    case 'stroll':
      return WALK_ANIM;
  }
}

function eligible(def: ActivityDef, state: CoreState, now: number, band: MoodBand): boolean {
  const { pos, world, character, recent } = state;
  if (!def.where.includes(pos.surface.kind)) return false;
  if (def.moods !== undefined && !def.moods.includes(band)) return false;
  if (def.hours !== undefined && !inDailyWindow(now, world.tzOffsetMin, def.hours)) return false;
  const last = recent.find((entry) => entry.id === def.id);
  if (last !== undefined && now < last.at + def.cooldownMs) return false;
  if (!character.anims.includes(animOf(def.does, state))) return false;
  if (def.does.kind === 'stroll') {
    const room = strollRoom(state);
    const need = def.does.distanceArt.min * artPxDipOf(world);
    if (room.left < need && room.right < need) return false;
  }
  return true;
}

/** Weight after the recency penalty: the n-th most recent pick (n < penalty length) is multiplied down. */
function weightOf(def: ActivityDef, recent: readonly RecentActivity[]): number {
  const rank = recent.findIndex((entry) => entry.id === def.id);
  return def.weight * (rank < 0 ? 1 : (ACTIVITY_PICK.recentPenalty[rank] ?? 1));
}

/** Integer ms in `[min, max]`. */
function drawDuration(range: Range, rng: RngState): { readonly value: number; readonly state: RngState } {
  const draw = nextInt(rng, range.max - range.min + 1);
  return { value: range.min + draw.value, state: draw.state };
}

/** A stroll toward a random side that has room for the shortest distance, as far as the range and the room allow. */
function drawStroll(
  state: CoreState,
  distanceArt: Range,
  rng: RngState,
): { readonly value: number; readonly state: RngState } {
  const artDip = artPxDipOf(state.world);
  const min = distanceArt.min * artDip;
  const room = strollRoom(state);
  const sides = (['left', 'right'] as const).filter((side) => room[side] >= min);
  const side = nextInt(rng, sides.length);
  // `eligible` guarantees at least one side; `right` is a safe default for the type only.
  const dir = sides[side.value] ?? 'right';
  const max = Math.min(distanceArt.max * artDip, room[dir]);
  const distance = nextFloat(side.state);
  const d = min + distance.value * (max - min);
  return { value: dir === 'right' ? state.pos.x + d : state.pos.x - d, state: distance.state };
}

function drawAction(action: ActivityAction, state: CoreState, rng: RngState): { action: PickedAction; rng: RngState } {
  switch (action.kind) {
    case 'stroll': {
      const target = drawStroll(state, action.distanceArt, rng);
      return { action: { kind: 'stroll', target: target.value }, rng: target.state };
    }
    case 'idle':
    case 'sit': {
      const d = drawDuration(action.durationMs, rng);
      return { action: { kind: action.kind, durationMs: d.value }, rng: d.state };
    }
    case 'play': {
      const d = drawDuration(action.durationMs, rng);
      return { action: { kind: 'play', anim: action.anim, durationMs: d.value }, rng: d.state };
    }
  }
}

/** Picks the next activity at `now` from `ctx.catalogue`; no pick (and the RNG untouched) when none may start. */
export function pickActivity(state: CoreState, now: number, ctx: PickContext): Picked {
  const weighted = ctx.catalogue
    .filter((def) => eligible(def, state, now, ctx.band))
    .map((def) => ({ def, weight: weightOf(def, state.recent) }))
    .filter(({ weight }) => weight > 0);
  const total = weighted.reduce((sum, { weight }) => sum + weight, 0);
  const last = weighted.at(-1);
  if (last === undefined) return { pick: null, rng: state.rng };
  const roll = nextFloat(state.rng);
  let left = roll.value * total;
  // The last candidate also catches a roll that rounding left at (or past) the total.
  const chosen = weighted.find(({ weight }) => (left -= weight) < 0) ?? last;
  const drawn = drawAction(chosen.def.does, state, roll.state);
  return { pick: { id: chosen.def.id, action: drawn.action }, rng: drawn.rng };
}

/** `recent` with `id` started at `now` in front; its older entry (if any) is dropped, so each id appears once. */
export const remember = (recent: readonly RecentActivity[], id: ActivityId, now: number): readonly RecentActivity[] => [
  { id, at: now },
  ...recent.filter((entry) => entry.id !== id),
];

/** Rests in `behavior` (front-facing, in place) from `now` for `durationMs`. */
function rest(
  state: CoreState,
  behavior: RestingBehavior,
  anim: AnimName,
  durationMs: number,
  now: number,
): StepResult {
  const until = now + durationMs;
  const { x, y } = state.pos;
  return {
    state: { ...state, behavior: { ...behavior, since: now, until }, wakeAt: until },
    effects: [{ type: 'Show', anim, facing: 'front', playback: 'fwd', motion: { kind: 'still', x, y } }],
  };
}

/** The base idle for `ACTIVITY_PICK.fallbackIdleMs`, when nothing may start. */
const holdIdle = (state: CoreState, now: number): StepResult =>
  rest(
    state,
    { kind: 'idle', anim: state.character.idle, since: now, until: null },
    state.character.idle,
    ACTIVITY_PICK.fallbackIdleMs,
    now,
  );

/**
 * Picks and starts the next activity at `now`: a timed rest (`activity` or `sit_edge`, `wakeAt` = its end) or a
 * stroll (`startTravel`: turn → walk → turn back → idle). The start is remembered for recency and cooldowns. When
 * nothing may start, holds the base idle for `fallbackIdleMs`. The engine (M1-14) calls it only from a resting state
 * whose time is up; it does not check the current state itself.
 */
export function startActivity(state: CoreState, now: number, ctx: PickContext): StepResult {
  const { pick, rng } = pickActivity(state, now, ctx);
  if (pick === null) return holdIdle(state, now);
  const picked: CoreState = { ...state, rng, recent: remember(state.recent, pick.id, now) };
  const { action, id } = pick;
  switch (action.kind) {
    case 'stroll': {
      const travel = startTravel(picked, action.target, now);
      // A target the stride grid cannot reach (under half a stride after snapping): rest instead, RNG kept advanced.
      return travel.effects.length > 0 ? travel : holdIdle({ ...state, rng }, now);
    }
    case 'idle': {
      const anim = state.character.idle;
      return rest(picked, { kind: 'activity', id, anim, since: now, until: null }, anim, action.durationMs, now);
    }
    case 'play':
      return rest(
        picked,
        { kind: 'activity', id, anim: action.anim, since: now, until: null },
        action.anim,
        action.durationMs,
        now,
      );
    case 'sit':
      return rest(picked, { kind: 'sit_edge', since: now, until: null }, SIT_ANIM, action.durationMs, now);
  }
}
