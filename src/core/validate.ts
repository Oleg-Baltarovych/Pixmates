// Input sanity checks (rules/core.md): the core never throws on sensor or user data. A broken value is refused
// with a reason, and the caller keeps its state unchanged. Bounds come from content/behavior.ts.
import { INPUT_LIMITS, MOOD_RANGE } from '../content/behavior.ts';
import { IDLE_NAMES } from '../shared/anim.ts';
import { PACK_LIMITS } from '../shared/pack.ts';
import type { AnimName, CharacterId, CoreEvent, MoodState, PointerInput, RejectReason, World } from './types.ts';

type Check = RejectReason | undefined;

const finite = (...values: readonly number[]): Check =>
  values.every((value) => Number.isFinite(value)) ? undefined : 'non-finite';

const within = (min: number, max: number, ...values: readonly number[]): Check =>
  finite(...values) ?? (values.every((value) => value >= min && value <= max) ? undefined : 'out-of-range');

const coords = (...values: readonly number[]): Check =>
  within(-INPUT_LIMITS.coordDip, INPUT_LIMITS.coordDip, ...values);

const first = (...checks: readonly (() => Check)[]): Check => {
  for (const check of checks) {
    const reason = check();
    if (reason !== undefined) return reason;
  }
  return undefined;
};

const id = (value: string): Check =>
  value.length >= 1 && value.length <= PACK_LIMITS.idMax ? undefined : 'out-of-range';

export function checkWorld(world: World): Check {
  const { workArea, windows, scale, scaleFactor, tzOffsetMin } = world;
  return first(
    () => within(1, INPUT_LIMITS.coordDip, workArea.width, workArea.height),
    () => finite(scale, scaleFactor),
    () => (Number.isInteger(scale) && scale >= 1 && scaleFactor > 0 ? undefined : 'out-of-range'),
    () => within(-INPUT_LIMITS.tzOffsetMin, INPUT_LIMITS.tzOffsetMin, tzOffsetMin),
    () => (windows.length <= INPUT_LIMITS.windows ? undefined : 'too-many'),
    ...windows.map(
      ({ id: windowId, rect }) =>
        () =>
          first(
            () => coords(rect.x, rect.y),
            () => within(INPUT_LIMITS.windowMinDip, INPUT_LIMITS.coordDip, rect.width, rect.height),
            () => id(windowId),
          ),
    ),
  );
}

export function checkMood({ mood, affinity, updatedAt }: MoodState): Check {
  return first(
    () => finite(updatedAt),
    () => within(MOOD_RANGE.min, MOOD_RANGE.max, mood, affinity),
  );
}

export function checkCharacter(characterId: CharacterId, anims: readonly AnimName[]): Check {
  return first(
    () => id(characterId),
    () => (anims.length <= PACK_LIMITS.animationsMax ? undefined : 'too-many'),
    () => (IDLE_NAMES.some((name) => anims.includes(name)) ? undefined : 'no-idle'),
  );
}

function checkInput(input: PointerInput): Check {
  switch (input.kind) {
    case 'pointer':
      return coords(input.x, input.y);
    case 'drag-end':
      // Speed only has to be a number: physics clamps a fast fling (M1-08).
      return coords(input.x, input.y) ?? finite(input.vx, input.vy);
    case 'hover':
    case 'pointer-leave':
    case 'click':
    case 'drag-start':
    case 'context-menu':
      return undefined;
  }
}

/** Why `event` (at `now`) is unusable, or undefined when it is fine. */
export function checkEvent(event: CoreEvent, now: number): Check {
  const clock = finite(now);
  if (clock !== undefined) return clock;
  switch (event.type) {
    case 'world':
      return checkWorld(event.world);
    case 'input':
      return checkInput(event.input);
    case 'user-idle':
      return within(0, Number.MAX_SAFE_INTEGER, event.idleMs);
    case 'switch':
      return id(event.to) ?? checkMood(event.mood);
    case 'character-loaded':
      return event.ok ? checkCharacter(event.id, event.anims) : id(event.id);
    case 'tick':
    case 'power':
    case 'visibility':
    case 'menu-closed':
      return undefined;
  }
}
