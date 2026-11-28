import { describe, expect, it } from 'vitest';
import { PRIORITY } from '../../../src/content/behavior.ts';
import { arbitrate, dequeue, enqueue, priorityOf, queueAfterEnter } from '../../../src/core/behavior/priorities.ts';
import type { Behavior, Interrupt, ThrottleState } from '../../../src/core/types.ts';

type Pending = ThrottleState['pending'];

const open = { since: 0, until: null } as const;
const timed = { since: 0, until: 1_000 } as const;

/** One behaviour of every kind M1 builds, keyed by kind. */
const B = {
  idle: { ...open, kind: 'idle', anim: 'idle_a' },
  sit_edge: { ...open, kind: 'sit_edge' },
  activity: { ...open, kind: 'activity', id: 'stroll', anim: 'idle_b' },
  turn: { ...timed, kind: 'turn', dir: 'left', then: { kind: 'front' } },
  walk: { ...timed, kind: 'walk', dir: 'left', x0: 100, x1: 40 },
  react: { ...timed, kind: 'react', reaction: 'startle', anim: 'happy', resume: { kind: 'idle', anim: 'idle_a' } },
  drag: { ...open, kind: 'drag' },
  fall: { ...timed, kind: 'fall', path: [] },
  land: { ...timed, kind: 'land' },
  sleep: { ...open, kind: 'sleep' },
  menu: { ...open, kind: 'menu' },
  switch_out: { ...timed, kind: 'switch_out', mode: 'poof', to: 'pixmates.goth' },
  switch_in: { ...timed, kind: 'switch_in', mode: 'poof' },
  hidden: { ...open, kind: 'hidden' },
} as const satisfies { readonly [K in Behavior['kind']]: Extract<Behavior, { kind: K }> };

describe('priorityOf (SPEC §4.1 table)', () => {
  it.each([
    ['idle', 'activity'],
    ['sit_edge', 'activity'],
    ['activity', 'activity'],
    ['turn', 'activity'],
    ['walk', 'activity'],
    ['react', 'cursor'],
    ['drag', 'drag'],
    ['fall', 'drag'],
    ['land', 'drag'],
    ['sleep', 'sleep'],
    ['menu', 'menu'],
    ['switch_out', 'switch'],
    ['switch_in', 'switch'],
    ['hidden', 'hidden'],
  ] as const)('%s runs at the %s priority', (kind, row) => {
    expect(priorityOf(B[kind])).toBe(PRIORITY[row]);
  });

  it('orders the rows drag > hidden > switch > menu > cursor > sleep > activity', () => {
    const order: Interrupt[] = ['drag', 'hidden', 'switch', 'menu', 'cursor', 'sleep', 'activity'];
    const values = order.map((row) => PRIORITY[row]);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('arbitrate: an event preempts only with a higher priority', () => {
  it.each([
    ['idle', 'cursor'],
    ['walk', 'cursor'],
    ['sleep', 'cursor'],
    ['idle', 'sleep'],
    ['react', 'menu'],
    ['menu', 'switch'],
    ['sleep', 'switch'],
    ['switch_out', 'hidden'],
    ['menu', 'hidden'],
  ] as const)('%s yields to %s', (kind, incoming) => {
    expect(arbitrate(B[kind], incoming)).toBe('preempt');
  });

  it.each([
    ['react', 'cursor'],
    ['sleep', 'sleep'],
    ['switch_out', 'switch'],
    ['switch_in', 'switch'],
  ] as const)('an equal priority waits: %s defers %s', (kind, incoming) => {
    expect(arbitrate(B[kind], incoming)).toBe('defer');
  });

  it.each([
    ['menu', 'cursor'],
    ['react', 'sleep'],
    ['switch_out', 'cursor'],
    ['fall', 'cursor'],
    ['drag', 'switch'],
  ] as const)(
    'a lower priority waits: %s defers %s (SPEC: cursor reactions wait while the menu is open)',
    (kind, incoming) => {
      expect(arbitrate(B[kind], incoming)).toBe('defer');
    },
  );

  it.each(Object.keys(B) as Behavior['kind'][])('drag beats everything, a fall or landing included: %s', (kind) => {
    expect(arbitrate(B[kind], 'drag')).toBe('preempt');
  });

  it('hidden drops cursor reactions instead of queueing them', () => {
    expect(arbitrate(B.hidden, 'cursor')).toBe('drop');
  });

  it('hidden still lets a non-reaction wait (a switch requested from the tray)', () => {
    expect(arbitrate(B.hidden, 'switch')).toBe('defer');
  });
});

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

  it('dequeues the reaction that has waited longest and removes it', () => {
    const pending: Pending = { poked: 700, startle: 500, petted: 600 };
    expect(dequeue(pending)).toEqual({ reaction: 'startle', queuedAt: 500, pending: { poked: 700, petted: 600 } });
  });

  it('a re-queued kind moves to the back of the line', () => {
    const pending = enqueue(enqueue(enqueue({}, 'startle', 500), 'poked', 600), 'startle', 700);
    expect(dequeue(pending)?.reaction).toBe('poked');
  });

  it('breaks a same-time tie in a fixed order, whatever the insertion order', () => {
    const a = dequeue({ poked: 500, startle: 500 });
    const b = dequeue({ startle: 500, poked: 500 });
    expect(a?.reaction).toBe(b?.reaction);
    expect(a?.pending).toEqual(b?.pending);
  });

  it('an empty queue yields nothing', () => {
    expect(dequeue({})).toBeNull();
  });
});

describe('queueAfterEnter: hidden drops everything that waited', () => {
  const pending: Pending = { startle: 500, poked: 600 };

  it('entering hidden empties the queue', () => {
    expect(queueAfterEnter(B.hidden, pending)).toEqual({});
  });

  it.each(Object.keys(B).filter((kind) => kind !== 'hidden') as Behavior['kind'][])(
    'entering %s keeps the queue',
    (kind) => {
      expect(queueAfterEnter(B[kind], pending)).toBe(pending);
    },
  );
});
