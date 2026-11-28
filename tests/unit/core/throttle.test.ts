import { describe, expect, it } from 'vitest';
import { dequeue, enqueue } from '../../../src/core/behavior/throttle.ts';
import type { ThrottleState } from '../../../src/core/types.ts';

type Pending = ThrottleState['pending'];

/** A limit far beyond every timestamp below, so ordering cases never hit the stale rule. */
const FOREVER = 1_000_000;
const NOW = 1_000;

describe('dedup queue: one pending per kind, the newest wins', () => {
  it('queues a reaction with the time it was queued', () => {
    expect(enqueue({}, 'startle', 500)).toEqual({ startle: 500 });
  });

  it('a newer reaction of the same kind replaces the older one', () => {
    const once = enqueue({}, 'petted', 500);
    expect(enqueue(once, 'petted', 900)).toEqual({ petted: 900 });
  });

  it('different kinds wait side by side', () => {
    expect(enqueue(enqueue({}, 'startle', 500), 'poked', 600)).toEqual({ startle: 500, poked: 600 });
  });

  it('does not change the queue it was given', () => {
    const before: Pending = { startle: 500 };
    enqueue(before, 'startle', 900);
    expect(before).toEqual({ startle: 500 });
  });
});

describe('dequeue: longest-waiting first, stale entries discarded', () => {
  it('takes the reaction that has waited longest and removes it', () => {
    const pending: Pending = { poked: 700, startle: 500, petted: 600 };
    expect(dequeue(pending, NOW, FOREVER)).toEqual({
      next: { reaction: 'startle', queuedAt: 500 },
      pending: { poked: 700, petted: 600 },
    });
  });

  it('a re-queued kind moves to the back of the line', () => {
    const pending = enqueue(enqueue(enqueue({}, 'startle', 500), 'poked', 600), 'startle', 700);
    expect(dequeue(pending, NOW, FOREVER).next?.reaction).toBe('poked');
  });

  it.each([[{ poked: 500, startle: 500 }], [{ startle: 500, poked: 500 }]] as const)(
    'a same-time tie goes startle before poked, whatever the insertion order: %o',
    (pending) => {
      const first = dequeue(pending, NOW, FOREVER);
      expect(first).toEqual({ next: { reaction: 'startle', queuedAt: 500 }, pending: { poked: 500 } });
      expect(dequeue(first.pending, NOW, FOREVER)).toEqual({ next: { reaction: 'poked', queuedAt: 500 }, pending: {} });
    },
  );

  it('drains a queue holding all three kinds in order across repeated calls', () => {
    let pending: Pending = { poked: 600, petted: 500, startle: 500 };
    const order: string[] = [];
    for (let left = 3; left > 0; left -= 1) {
      const { next, pending: rest } = dequeue(pending, NOW, FOREVER);
      if (next !== null) order.push(next.reaction);
      pending = rest;
    }
    expect(order).toEqual(['startle', 'petted', 'poked']);
    expect(dequeue(pending, NOW, FOREVER)).toEqual({ next: null, pending: {} });
  });

  it('does not change the queue it was given', () => {
    const before: Pending = { startle: 500, poked: 600 };
    dequeue(before, NOW, FOREVER);
    dequeue(before, NOW, 100);
    expect(before).toEqual({ startle: 500, poked: 600 });
  });

  it('an empty queue yields nothing', () => {
    expect(dequeue({}, NOW, FOREVER)).toEqual({ next: null, pending: {} });
  });

  it('an entry exactly at the age limit is still fresh', () => {
    expect(dequeue({ petted: 600 }, NOW, 400)).toEqual({ next: { reaction: 'petted', queuedAt: 600 }, pending: {} });
  });

  it('skips entries over the age limit and takes the first fresh one', () => {
    const pending: Pending = { startle: 500, petted: 599, poked: 700 };
    expect(dequeue(pending, NOW, 400)).toEqual({ next: { reaction: 'poked', queuedAt: 700 }, pending: {} });
  });

  it('keeps fresh entries behind the one it takes', () => {
    const pending: Pending = { startle: 100, petted: 700, poked: 800 };
    expect(dequeue(pending, NOW, 400)).toEqual({
      next: { reaction: 'petted', queuedAt: 700 },
      pending: { poked: 800 },
    });
  });

  it('a queue of only stale entries comes back empty', () => {
    expect(dequeue({ startle: 100, poked: 200 }, NOW, 400)).toEqual({ next: null, pending: {} });
  });
});
