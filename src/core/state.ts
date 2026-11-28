// The core's first state (plan M1-03). Main builds it once the display and the active pack are known.
import { NEW_CHARACTER_MOOD } from '../content/behavior.ts';
import { STAGE_LAYOUT_DIP } from '../content/stage.ts';
import { seedRng } from './rng.ts';
import type { CharacterSpec, CoreState, MoodState, RejectReason, RestingBehavior, Resume, World } from './types.ts';
import { checkMood, checkWorld, toCharacterRef } from './validate.ts';

export interface InitInput {
  readonly seed: number;
  readonly character: CharacterSpec;
  readonly world: World;
  /** The character's stored mood; absent for a character never seen before. */
  readonly mood?: MoodState | undefined;
  readonly now: number;
}

export type InitResult =
  { readonly ok: true; readonly state: CoreState } | { readonly ok: false; readonly reason: RejectReason };

/** A stored resting state, stamped to start `now`; it lasts until an event (or the engine's next pick) ends it. */
export const resumeBehavior = (resume: Resume, now: number): RestingBehavior => ({
  ...resume,
  since: now,
  until: null,
});

/**
 * Idle on the floor near the right edge (where the M0 stage placed it), click-through, with empty anti-spam memory
 * and `wakeAt = now`: the first tick picks an activity. Broken input is refused with a reason, never thrown.
 */
export function initialState({ seed, character, world, mood, now }: InitInput): InitResult {
  const reason =
    (Number.isFinite(now) && Number.isFinite(seed) ? undefined : 'non-finite') ??
    checkWorld(world) ??
    (mood === undefined ? undefined : checkMood(mood));
  if (reason !== undefined) return { ok: false, reason };
  const checked = toCharacterRef(character.id, character.anims);
  if (!checked.ok) return checked;
  const ref = checked.character;
  const { width, height } = world.workArea;
  return {
    ok: true,
    state: {
      rng: seedRng(seed),
      character: ref,
      world,
      pos: { surface: { kind: 'floor' }, x: Math.max(0, width - STAGE_LAYOUT_DIP.rightMargin), y: height },
      // It starts at the right edge, so the room to walk is on its left.
      facing: 'left',
      behavior: { kind: 'idle', anim: ref.idle, since: now, until: null },
      mood: mood ?? { ...NEW_CHARACTER_MOOD, updatedAt: now },
      throttle: { firedAt: {}, lastLineAt: null, pending: {} },
      cursor: { last: null, trail: [] },
      recent: [],
      hitThrough: true,
      wakeAt: now,
    },
  };
}
