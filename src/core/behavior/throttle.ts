// Anti-spam (SPEC §4.1, plan M1-04/05): dedup queue, per-reaction cooldowns (counted from the last fire), the global
// limit on unsolicited lines and quiet hours. Pure: time enters as `now`, limits come from `content/behavior.ts`
// through the caller. Verdicts carry `retryAt` so the engine can fold it into `wakeAt` (F2).
// Quiet hours gate unsolicited lines only: M1's cursor reactions are user-initiated and silent (D-27).
import type { QuietHours, ReactionKey, ThrottleState } from '../types.ts';

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

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Why something may not happen now, and the first moment it could. */
export type Verdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'cooldown' | 'line-gap' | 'quiet-hours'; readonly retryAt: number };

type Blocked = Extract<Verdict, { ok: false }>;

const READY: Verdict = { ok: true };

/** May `reaction` fire at `now`? Its cooldown runs from its last fire (`firedAt`), never from when it was queued. */
export function reactionVerdict(
  firedAt: ThrottleState['firedAt'],
  reaction: ReactionKey,
  now: number,
  cooldownMs: Readonly<Record<ReactionKey, number>>,
): Verdict {
  const last = firedAt[reaction];
  if (last === undefined) return READY;
  const retryAt = last + cooldownMs[reaction];
  return now < retryAt ? { ok: false, reason: 'cooldown', retryAt } : READY;
}

/** Record that `reaction` fired at `now` (on entering it); restarts its cooldown. */
export const fire = (throttle: ThrottleState, reaction: ReactionKey, now: number): ThrottleState => ({
  ...throttle,
  firedAt: { ...throttle.firedAt, [reaction]: now },
});

export interface QueueLimits {
  readonly maxAgeMs: number;
  readonly cooldownMs: Readonly<Record<ReactionKey, number>>;
}

export interface DequeuedReady {
  readonly next: Queued | null;
  readonly throttle: ThrottleState;
}

/**
 * `dequeue` plus the cooldown re-check (plan M1-05): a fresh entry whose kind is still cooling down is dropped, as it
 * would have been refused had it arrived now. Does not stamp the fire; the caller does that on entering the reaction.
 */
export function dequeueReady(throttle: ThrottleState, now: number, limits: QueueLimits): DequeuedReady {
  let pending = throttle.pending;
  // Terminates: every pass that does not return removes at least one entry from `pending`.
  for (;;) {
    const taken = dequeue(pending, now, limits.maxAgeMs);
    pending = taken.pending;
    const { next } = taken;
    if (next === null || reactionVerdict(throttle.firedAt, next.reaction, now, limits.cooldownMs).ok) {
      return { next, throttle: { ...throttle, pending } };
    }
  }
}

/** `a mod b` in `[0, b)`, also for negative `a`. */
const mod = (a: number, b: number): number => ((a % b) + b) % b;

/** Ms from `now` until the window ends, or null outside it (and for no / an empty window). */
function quietLeftMs(now: number, tzOffsetMin: number, window: QuietHours | null): number | null {
  if (window === null || window.fromMin === window.toMin) return null;
  const local = mod(now + tzOffsetMin * MS_PER_MINUTE, MS_PER_DAY);
  const from = window.fromMin * MS_PER_MINUTE;
  const to = window.toMin * MS_PER_MINUTE;
  const inside = from < to ? local >= from && local < to : local >= from || local < to;
  return inside ? mod(to - local, MS_PER_DAY) : null;
}

/** Is local time (`now` shifted by `tzOffsetMin`) inside the daily quiet-hours window? */
export const isQuietHours = (now: number, tzOffsetMin: number, window: QuietHours | null): boolean =>
  quietLeftMs(now, tzOffsetMin, window) !== null;

export interface LineRules {
  readonly lineGapMs: number;
  readonly quietHours: QuietHours | null;
  /** From `world.tzOffsetMin`. */
  readonly tzOffsetMin: number;
}

/**
 * May an unsolicited line be said at `now`? Blocked by quiet hours and by the global gap since the last line; when
 * both block, the verdict names the one that frees up later (ties go to quiet hours).
 */
export function lineVerdict(lastLineAt: number | null, now: number, rules: LineRules): Verdict {
  const quietLeft = quietLeftMs(now, rules.tzOffsetMin, rules.quietHours);
  const quiet: Blocked | null =
    quietLeft === null ? null : { ok: false, reason: 'quiet-hours', retryAt: now + quietLeft };
  const gapEnd = lastLineAt === null ? null : lastLineAt + rules.lineGapMs;
  const gap: Blocked | null =
    gapEnd !== null && now < gapEnd ? { ok: false, reason: 'line-gap', retryAt: gapEnd } : null;
  if (quiet === null) return gap ?? READY;
  if (gap === null) return quiet;
  return gap.retryAt > quiet.retryAt ? gap : quiet;
}

/** Record an unsolicited line said at `now`. */
export const speak = (throttle: ThrottleState, now: number): ThrottleState => ({ ...throttle, lastLineAt: now });
