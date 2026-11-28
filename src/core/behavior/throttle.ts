// Anti-spam (SPEC §4.1, plan M1-05): the dedup queue now (M1-04); cooldowns, the global line limit and quiet hours
// join it in M1-05. Pure: time enters as `now`, limits come from `content/behavior.ts` through the caller.
import type { ReactionKey, ThrottleState } from '../types.ts';

type Pending = ThrottleState['pending'];

/** Tie-break for reactions queued at the same moment: lower runs first. Exhaustive over `ReactionKey`. */
const REACTION_RANK = { startle: 0, petted: 1, poked: 2 } as const satisfies Record<ReactionKey, number>;

// Keys of an object that `satisfies Record<ReactionKey, number>` are exactly the reaction kinds.
const KINDS = Object.keys(REACTION_RANK) as ReactionKey[];

/** Queue a reaction at `now`; a newer one of the same kind replaces the older (and moves to the back). */
export const enqueue = (pending: Pending, reaction: ReactionKey, now: number): Pending => ({
  ...pending,
  [reaction]: now,
});

export interface Queued {
  readonly reaction: ReactionKey;
  readonly queuedAt: number;
}

export interface Dequeued {
  /** The reaction to run now; null when nothing fresh waits. */
  readonly next: Queued | null;
  /** The queue without `next` and without every stale entry passed over. */
  readonly pending: Pending;
}

/** Longest-waiting entry; same-time ties go by `REACTION_RANK`. */
function oldest(pending: Pending): Queued | null {
  let head: Queued | null = null;
  for (const reaction of KINDS) {
    const queuedAt = pending[reaction];
    if (queuedAt === undefined) continue;
    const earlier =
      head === null ||
      queuedAt < head.queuedAt ||
      (queuedAt === head.queuedAt && REACTION_RANK[reaction] < REACTION_RANK[head.reaction]);
    if (earlier) head = { reaction, queuedAt };
  }
  return head;
}

const without = (pending: Pending, reaction: ReactionKey): Pending => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the taken entry is destructured only to omit it
  const { [reaction]: _taken, ...rest } = pending;
  return rest;
};

/**
 * Take the longest-waiting reaction that is still fresh (`now - queuedAt <= maxAgeMs`), discarding the stale ones
 * ahead of it. The caller re-runs the reaction's cooldown check before entering it (plan M1-05).
 */
export function dequeue(pending: Pending, now: number, maxAgeMs: number): Dequeued {
  let queue = pending;
  for (let head = oldest(queue); head !== null; head = oldest(queue)) {
    queue = without(queue, head.reaction);
    if (now - head.queuedAt <= maxAgeMs) return { next: head, pending: queue };
  }
  return { next: null, pending: queue };
}
