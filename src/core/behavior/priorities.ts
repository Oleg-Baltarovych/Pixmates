// Interrupt priorities and the dedup queue (SPEC §4.1, plan M1-04). Pure decisions; the engine (M1-14) applies them.
// Rule: an event preempts the current state only with a higher priority; otherwise it waits (equal → queue, and
// SPEC's menu row: cursor reactions wait while the menu is open); `hidden` drops reactions; drag beats everything.
import { PRIORITY } from '../../content/behavior.ts';
import type { Behavior, Interrupt, ReactionKey, ThrottleState } from '../types.ts';

type Pending = ThrottleState['pending'];

/** The table row a reaction runs at. Every M1 reaction is a cursor one; M3/M4 reactions get their own rows. */
const reactionRow = (reaction: ReactionKey): Interrupt => {
  switch (reaction) {
    case 'startle':
    case 'petted':
    case 'poked':
      return 'cursor';
  }
};

/** The table row the current state runs at. A fling's fall and landing belong to the drag row (SPEC §4.1, 100). */
export function rowOf(behavior: Behavior): Interrupt {
  switch (behavior.kind) {
    case 'idle':
    case 'sit_edge':
    case 'activity':
    case 'turn':
    case 'walk':
      return 'activity';
    case 'react':
      return reactionRow(behavior.reaction);
    case 'drag':
    case 'fall':
    case 'land':
      return 'drag';
    case 'sleep':
      return 'sleep';
    case 'menu':
      return 'menu';
    case 'switch_out':
    case 'switch_in':
      return 'switch';
    case 'hidden':
      return 'hidden';
  }
}

export const priorityOf = (behavior: Behavior): number => PRIORITY[rowOf(behavior)];

/** `preempt` = enter it now; `defer` = it waits (reactions go to the dedup queue); `drop` = forget it. */
export type Verdict = 'preempt' | 'defer' | 'drop';

export function arbitrate(current: Behavior, incoming: Interrupt): Verdict {
  // Drag beats everything (rules/core.md), so a falling character can be caught (fall shares the drag row).
  if (incoming === 'drag') return 'preempt';
  if (PRIORITY[incoming] > priorityOf(current)) return 'preempt';
  if (current.kind === 'hidden' && incoming === 'cursor') return 'drop';
  return 'defer';
}

/** Queue a reaction at `now`; a newer one of the same kind replaces the older (and moves to the back). */
export const enqueue = (pending: Pending, reaction: ReactionKey, now: number): Pending => ({
  ...pending,
  [reaction]: now,
});

/** Fixed tie-break order for reactions queued at the same moment (deterministic, independent of insertion). */
const REACTION_ORDER = ['startle', 'petted', 'poked'] as const satisfies readonly ReactionKey[];

export interface Dequeued {
  readonly reaction: ReactionKey;
  readonly queuedAt: number;
  readonly pending: Pending;
}

/** Take the reaction that has waited longest; null when nothing waits. */
export function dequeue(pending: Pending): Dequeued | null {
  let next: { reaction: ReactionKey; queuedAt: number } | null = null;
  for (const reaction of REACTION_ORDER) {
    const queuedAt = pending[reaction];
    if (queuedAt !== undefined && (next === null || queuedAt < next.queuedAt)) next = { reaction, queuedAt };
  }
  if (next === null) return null;
  const taken = next.reaction;
  const rest: Partial<Record<ReactionKey, number>> = {};
  for (const reaction of REACTION_ORDER) {
    const queuedAt = pending[reaction];
    if (reaction !== taken && queuedAt !== undefined) rest[reaction] = queuedAt;
  }
  return { ...next, pending: rest };
}

/** The queue once `next` has been entered: `hidden` drops every waiting reaction (SPEC §4.1). */
export const queueAfterEnter = (next: Behavior, pending: Pending): Pending => (next.kind === 'hidden' ? {} : pending);
