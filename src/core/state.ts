// The core's first state (plan M1-03). Main builds it once the display and the active pack are known.
import { NEW_CHARACTER_MOOD } from '../content/behavior.ts';
import { STAGE_LAYOUT_DIP } from '../content/stage.ts';
import { IDLE_NAMES } from '../shared/anim.ts';
import { seedRng } from './rng.ts';
import type { AnimName, CharacterRef, CoreState, MoodState, RejectReason, World } from './types.ts';
import { checkCharacter, checkMood, checkWorld } from './validate.ts';

export interface InitInput {
  readonly seed: number;
  readonly character: CharacterRef;
  readonly world: World;
  /** The character's stored mood; absent for a character never seen before. */
  readonly mood?: MoodState | undefined;
  readonly now: number;
}

export type InitResult =
  { readonly ok: true; readonly state: CoreState } | { readonly ok: false; readonly reason: RejectReason };

/** The pack's base idle (`idle_a` on the rig, `idle` allowed by SPEC §5.1); validated to exist. */
export const idleOf = (character: CharacterRef): AnimName | undefined =>
  IDLE_NAMES.find((name) => character.anims.includes(name));

/**
 * Idle on the floor near the right edge (where the M0 stage placed it), click-through, with empty anti-spam memory
 * and `wakeAt = now`: the first tick picks an activity. Broken input is refused with a reason, never thrown.
 */
export function initialState({ seed, character, world, mood, now }: InitInput): InitResult {
  const reason =
    (Number.isFinite(now) && Number.isFinite(seed) ? undefined : 'non-finite') ??
    checkWorld(world) ??
    checkCharacter(character.id, character.anims) ??
    (mood === undefined ? undefined : checkMood(mood));
  const idle = idleOf(character);
  if (reason !== undefined) return { ok: false, reason };
  if (idle === undefined) return { ok: false, reason: 'no-idle' };
  const { width, height } = world.workArea;
  return {
    ok: true,
    state: {
      rng: seedRng(seed),
      character,
      world,
      pos: { surface: { kind: 'floor' }, x: Math.max(0, width - STAGE_LAYOUT_DIP.rightMargin), y: height },
      // It starts at the right edge, so the room to walk is on its left.
      facing: 'left',
      behavior: { kind: 'idle', anim: idle, since: now, until: null },
      mood: mood ?? { ...NEW_CHARACTER_MOOD, updatedAt: now },
      throttle: { firedAt: {}, lastLineAt: null, pending: [] },
      recent: [],
      hitThrough: true,
      wakeAt: now,
    },
  };
}
