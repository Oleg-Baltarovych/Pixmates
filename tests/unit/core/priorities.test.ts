import { describe, expect, it } from 'vitest';
import { PRIORITY } from '../../../src/content/behavior.ts';
import { arbitrate, priorityOf, queueAfterEnter } from '../../../src/core/behavior/priorities.ts';
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
  walk: { ...timed, kind: 'walk', dir: 'left', x0: 100, x1: 40, steps: 10, stepDip: 6 },
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

/** The other cursor reactions, so every reaction kind is checked against its row. */
const R = {
  ...B,
  react_petted: { ...B.react, reaction: 'petted' },
  react_poked: { ...B.react, reaction: 'poked' },
} as const satisfies Record<string, Behavior>;

describe('priorityOf (SPEC §4.1 table)', () => {
  it.each([
    ['idle', 'activity'],
    ['sit_edge', 'activity'],
    ['activity', 'activity'],
    ['turn', 'activity'],
    ['walk', 'activity'],
    ['react', 'cursor'],
    ['react_petted', 'cursor'],
    ['react_poked', 'cursor'],
    ['drag', 'drag'],
    ['fall', 'drag'],
    ['land', 'drag'],
    ['sleep', 'sleep'],
    ['menu', 'menu'],
    ['switch_out', 'switch'],
    ['switch_in', 'switch'],
    ['hidden', 'hidden'],
  ] as const)('%s runs at the %s priority', (kind, row) => {
    expect(priorityOf(R[kind])).toBe(PRIORITY[row]);
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

  // A second drag-start while dragging is not an interrupt; the engine treats it as a no-op (plan M1-14).
  it.each((Object.keys(B) as Behavior['kind'][]).filter((kind) => kind !== 'drag'))(
    'drag beats everything, a fall or landing included: %s',
    (kind) => {
      expect(arbitrate(B[kind], 'drag')).toBe('preempt');
    },
  );

  it.each(['hidden', 'sleep'] as const)('%s drops cursor reactions instead of queueing them', (kind) => {
    expect(arbitrate(B[kind], 'cursor')).toBe('drop');
  });

  it('a switch still wakes a sleeping character (only cursor reactions are dropped)', () => {
    expect(arbitrate(B.sleep, 'switch')).toBe('preempt');
  });

  it('hidden defers sleep: it is re-derived from idle/power state on unhide', () => {
    expect(arbitrate(B.hidden, 'sleep')).toBe('defer');
  });

  it('hidden still lets a non-reaction wait (a switch requested from the tray)', () => {
    expect(arbitrate(B.hidden, 'switch')).toBe('defer');
  });
});

describe('queueAfterEnter: hidden drops everything that waited', () => {
  const pending: Pending = { startle: 500, poked: 600 };

  it('entering hidden empties the queue', () => {
    expect(queueAfterEnter(B.hidden, pending)).toEqual({});
  });

  it('entering any other state keeps the queue', () => {
    expect(queueAfterEnter(B.react, pending)).toEqual(pending);
  });
});
