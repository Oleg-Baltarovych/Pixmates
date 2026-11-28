// Interrupt priorities (SPEC §4.1, plan M1-04). Pure decisions; the engine (M1-14) applies them; the dedup queue
// lives in `throttle.ts`. Rule: an event preempts the current state only with a higher priority; otherwise it waits
// (equal → queue, and SPEC's menu row: cursor reactions wait while the menu is open); `hidden` and `sleep` drop
// cursor reactions (waking is a transition, M1-11); drag beats everything.
// `defer` means two things: a reaction goes to the dedup queue; a non-reaction (hidden, switch, sleep, menu,
// activity) is not stored — the engine re-derives it from world / idle / power state when the current timed state
// ends (M1-14).
import { PRIORITY } from '../../content/behavior.ts';
import type { Behavior, Interrupt, ReactionKey, ThrottleState } from '../types.ts';

type Pending = ThrottleState['pending'];

/** Rows whose state ignores cursor reactions outright instead of queueing them. */
const DROPS_CURSOR: ReadonlySet<Interrupt> = new Set(['hidden', 'sleep']);

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

/**
 * `preempt` = enter it now; `drop` = forget it; `defer` = it waits: a reaction goes to the dedup queue, a
 * non-reaction (hidden, switch, sleep, menu, activity) is re-derived from world / idle / power state when the current
 * timed state ends.
 */
export type Verdict = 'preempt' | 'defer' | 'drop';

export function arbitrate(current: Behavior, incoming: Interrupt): Verdict {
  // Drag beats everything (rules/core.md), so a falling character can be caught (fall shares the drag row).
  if (incoming === 'drag') return 'preempt';
  if (incoming === 'cursor' && DROPS_CURSOR.has(rowOf(current))) return 'drop';
  if (PRIORITY[incoming] > priorityOf(current)) return 'preempt';
  return 'defer';
}

/** The queue once `next` has been entered: `hidden` drops every waiting reaction (SPEC §4.1). */
export const queueAfterEnter = (next: Behavior, pending: Pending): Pending => (next.kind === 'hidden' ? {} : pending);
