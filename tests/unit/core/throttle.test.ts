import { describe, expect, it } from 'vitest';
import { CURSOR_REACTIONS, THROTTLE } from '../../../src/content/behavior.ts';
import {
  dequeue,
  dequeueReady,
  enqueue,
  fire,
  isQuietHours,
  lineVerdict,
  reactionVerdict,
  speak,
} from '../../../src/core/behavior/throttle.ts';
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
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** Cooldowns small enough to read; the shipped ones live in `content/behavior.ts`. */
const COOLDOWN = { startle: 4_000, petted: 6_000, poked: 1_000 } as const;

describe('reaction cooldown counts from the last fire', () => {
  it('a reaction that never fired is ready', () => {
    expect(reactionVerdict({}, 'startle', NOW, COOLDOWN)).toEqual({ ok: true });
  });

  it('refuses inside the cooldown and says when it will be ready', () => {
    expect(reactionVerdict({ startle: 500 }, 'startle', 4_499, COOLDOWN)).toEqual({
      ok: false,
      reason: 'cooldown',
      retryAt: 4_500,
    });
  });

  it('is ready again exactly when the cooldown has passed', () => {
    expect(reactionVerdict({ startle: 500 }, 'startle', 4_500, COOLDOWN)).toEqual({ ok: true });
  });

  it('each kind has its own cooldown and its own clock', () => {
    const firedAt = { startle: 500, poked: 500 };
    expect(reactionVerdict(firedAt, 'poked', 1_500, COOLDOWN)).toEqual({
      ok: true,
    });
    expect(reactionVerdict(firedAt, 'petted', 1_500, COOLDOWN)).toEqual({
      ok: true,
    });
    expect(reactionVerdict(firedAt, 'startle', 1_500, COOLDOWN).ok).toBe(false);
  });

  it('firing stamps the kind and restarts its cooldown', () => {
    const throttle: ThrottleState = {
      firedAt: { startle: 500 },
      lastLineAt: null,
      pending: {},
    };
    const after = fire(throttle, 'startle', 9_000);
    expect(after).toEqual({
      firedAt: { startle: 9_000 },
      lastLineAt: null,
      pending: {},
    });
    expect(reactionVerdict(after.firedAt, 'startle', 12_000, COOLDOWN)).toEqual({
      ok: false,
      reason: 'cooldown',
      retryAt: 13_000,
    });
    expect(throttle.firedAt).toEqual({ startle: 500 });
  });
});

describe('dequeueReady: the queue re-runs the cooldown check', () => {
  const limits = { maxAgeMs: 3_000, cooldownMs: COOLDOWN };

  it('a reaction queued during its cooldown is dropped if the cooldown still runs when it comes up', () => {
    // poked fired at 1 000 (cooldown 1 s), queued again at 1 200, comes up at 1 900: still cooling -> dropped.
    const throttle: ThrottleState = {
      firedAt: { poked: 1_000 },
      lastLineAt: null,
      pending: { poked: 1_200 },
    };
    expect(dequeueReady(throttle, 1_900, limits)).toEqual({
      next: null,
      throttle: { ...throttle, pending: {} },
    });
  });

  it('the same queued reaction plays once the cooldown has passed since the last fire, not since queueing', () => {
    const throttle: ThrottleState = {
      firedAt: { poked: 1_000 },
      lastLineAt: null,
      pending: { poked: 1_200 },
    };
    expect(dequeueReady(throttle, 2_000, limits)).toEqual({
      next: { reaction: 'poked', queuedAt: 1_200 },
      throttle: { ...throttle, pending: {} },
    });
  });

  it('skips a cooling reaction and takes the next ready one, keeping the rest queued', () => {
    const throttle: ThrottleState = {
      firedAt: { startle: 1_000 },
      lastLineAt: null,
      pending: { startle: 1_100, petted: 1_200, poked: 1_300 },
    };
    expect(dequeueReady(throttle, 2_000, limits)).toEqual({
      next: { reaction: 'petted', queuedAt: 1_200 },
      throttle: { ...throttle, pending: { poked: 1_300 } },
    });
  });

  it('still discards stale entries', () => {
    const throttle: ThrottleState = {
      firedAt: {},
      lastLineAt: null,
      pending: { petted: 100, poked: 5_000 },
    };
    expect(dequeueReady(throttle, 5_500, limits)).toEqual({
      next: { reaction: 'poked', queuedAt: 5_000 },
      throttle: { ...throttle, pending: {} },
    });
  });

  it('does not stamp the fire: entering the reaction does that', () => {
    const throttle: ThrottleState = {
      firedAt: {},
      lastLineAt: null,
      pending: { poked: 1_000 },
    };
    expect(dequeueReady(throttle, 1_500, limits).throttle.firedAt).toEqual({});
  });
});

describe('global limit: at most one unsolicited line per gap', () => {
  const rules = { lineGapMs: 10 * MIN, quietHours: null, tzOffsetMin: 0 };

  it('the first line is allowed', () => {
    expect(lineVerdict(null, NOW, rules)).toEqual({ ok: true });
  });

  it('refuses a second line inside the gap, with the moment it frees up', () => {
    expect(lineVerdict(1_000, 1_000 + 10 * MIN - 1, rules)).toEqual({
      ok: false,
      reason: 'line-gap',
      retryAt: 1_000 + 10 * MIN,
    });
  });

  it('allows a line exactly one gap after the last one', () => {
    expect(lineVerdict(1_000, 1_000 + 10 * MIN, rules)).toEqual({ ok: true });
  });

  it('speaking stamps the last line time and leaves the rest alone', () => {
    const throttle: ThrottleState = {
      firedAt: { poked: 5 },
      lastLineAt: null,
      pending: { startle: 7 },
    };
    expect(speak(throttle, 42)).toEqual({
      firedAt: { poked: 5 },
      lastLineAt: 42,
      pending: { startle: 7 },
    });
  });
});

describe('quiet hours (local time, may run over midnight)', () => {
  /** Local midnight of some day, as UTC ms for a given offset. */
  const day0 = 20 * DAY;
  const localAt = (hours: number, minutes: number, tzOffsetMin: number): number =>
    day0 + hours * HOUR + minutes * MIN - tzOffsetMin * MIN;
  const night = { fromMin: 22 * 60, toMin: 7 * 60 } as const;
  const lunch = { fromMin: 12 * 60, toMin: 13 * 60 } as const;

  it.each([
    [22, 0, true],
    [23, 59, true],
    [0, 0, true],
    [6, 59, true],
    [7, 0, false],
    [12, 0, false],
    [21, 59, false],
  ] as const)('a 22:00-07:00 window over midnight at %i:%i -> quiet %s', (h, m, quiet) => {
    expect(isQuietHours(localAt(h, m, 0), 0, night)).toBe(quiet);
  });

  it.each([
    [11, 59, false],
    [12, 0, true],
    [12, 59, true],
    [13, 0, false],
  ] as const)('a same-day 12:00-13:00 window at %i:%i -> quiet %s', (h, m, quiet) => {
    expect(isQuietHours(localAt(h, m, 0), 0, lunch)).toBe(quiet);
  });

  it.each([120, -300, 345, 840, -720])('reads the clock in local time (offset %i min)', (tz) => {
    expect(isQuietHours(localAt(23, 0, tz), tz, night)).toBe(true);
    expect(isQuietHours(localAt(9, 0, tz), tz, night)).toBe(false);
  });

  it('works before the epoch too (negative ms)', () => {
    expect(isQuietHours(-1 * HOUR, 0, night)).toBe(true);
  });

  it('no window (the default) and an empty window are never quiet', () => {
    expect(isQuietHours(localAt(23, 0, 0), 0, null)).toBe(false);
    expect(isQuietHours(localAt(23, 0, 0), 0, { fromMin: 600, toMin: 600 })).toBe(false);
  });

  it('a line inside quiet hours waits for the window to end, even with the gap free', () => {
    const now = localAt(23, 30, 120);
    expect(
      lineVerdict(null, now, {
        lineGapMs: 10 * MIN,
        quietHours: night,
        tzOffsetMin: 120,
      }),
    ).toEqual({
      ok: false,
      reason: 'quiet-hours',
      retryAt: localAt(31, 0, 120), // 07:00 the next local day
    });
  });

  it('both blocking: the verdict names whichever frees up later', () => {
    const rules = { lineGapMs: 10 * MIN, quietHours: night, tzOffsetMin: 0 };
    // last line 05:55 → gap frees 06:05, quiet ends 07:00
    expect(lineVerdict(localAt(5, 55, 0), localAt(6, 0, 0), rules)).toEqual({
      ok: false,
      reason: 'quiet-hours',
      retryAt: localAt(7, 0, 0),
    });
    // last line 06:57 → gap frees 07:07, after quiet ends
    expect(lineVerdict(localAt(6, 57, 0), localAt(6, 58, 0), rules)).toEqual({
      ok: false,
      reason: 'line-gap',
      retryAt: localAt(7, 7, 0),
    });
  });
});

describe('shipped numbers (content/behavior.ts)', () => {
  it('cursor reactions cool down in seconds (D-27, F4), not the 30-min default', () => {
    for (const { cooldownMs } of Object.values(CURSOR_REACTIONS)) {
      expect(cooldownMs).toBeGreaterThanOrEqual(1_000);
      expect(cooldownMs).toBeLessThan(MIN);
    }
  });

  it('one unsolicited line per 10 min, no quiet hours by default (SPEC 4.1)', () => {
    expect(THROTTLE.lineGapMs).toBe(10 * MIN);
    expect(THROTTLE.quietHours).toBeNull();
  });
});
