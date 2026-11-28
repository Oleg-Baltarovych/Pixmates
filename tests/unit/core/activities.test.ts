import { describe, expect, it } from 'vitest';
import { ACTIVITY_PICK, SHARED_ACTIVITIES } from '../../../src/content/activities.ts';
import { WALK_TRAVEL } from '../../../src/content/stage.ts';
import { pickActivity, remember, startActivity, type PickContext } from '../../../src/core/activities.ts';
import { seedRng } from '../../../src/core/rng.ts';
import { surfaceSpan, turnMs } from '../../../src/core/travel.ts';
import type { ActivityDef, ActivityId, CoreState, MoodBand, Surface } from '../../../src/core/types.ts';
import { makeCharacter, makeCoreState, makeWorld } from '../../fixtures/core-state.ts';

const NOW = 100_000;
const WORLD = makeWorld({ scale: 4, scaleFactor: 1.25 });
/** DIP per art px at ×4 / 125 %. */
const ART_DIP = 3.2;
const FLOOR_Y = WORLD.workArea.height;
const TOP: Surface = { kind: 'window_top', id: 'w1', left: 400, right: 1400, y: 500 };
const MS_PER_MIN = 60_000;
const DAY = 24 * 60 * MS_PER_MIN;

/** The animations every built-in pack has (the M1 shared set uses idle_a/b, walk, turn, sit_edge, think, wave). */
const BUILTIN_ANIMS = [
  'idle_a',
  'idle_b',
  'walk',
  'turn',
  'sit_edge',
  'sleep',
  'drag',
  'fall',
  'land',
  'think',
  'wave',
];
const FULL = { ...makeCharacter(BUILTIN_ANIMS), idle: 'idle_a' };

const onFloor = (overrides: Partial<CoreState> = {}): CoreState =>
  makeCoreState({
    world: WORLD,
    character: FULL,
    pos: { surface: { kind: 'floor' }, x: 960, y: FLOOR_Y },
    ...overrides,
  });
const onTop = (overrides: Partial<CoreState> = {}): CoreState =>
  makeCoreState({ world: WORLD, character: FULL, pos: { surface: TOP, x: 900, y: TOP.y }, ...overrides });

const play = (id: ActivityId, extra: Partial<ActivityDef> = {}): ActivityDef => ({
  id,
  does: { kind: 'play', anim: 'idle_b', durationMs: { min: 1_000, max: 2_000 } },
  weight: 1,
  where: ['floor', 'window_top'],
  cooldownMs: 0,
  ...extra,
});

const ctxOf = (catalogue: readonly ActivityDef[], band: MoodBand = 'mid'): PickContext => ({ band, catalogue });
const SHARED = ctxOf(SHARED_ACTIVITIES);

/** How often each activity is picked from `state` over many seeds (one pick each). */
function shareOver(state: CoreState, now: number, ctx: PickContext, seeds = 2_000): Map<ActivityId | null, number> {
  const counts = new Map<ActivityId | null, number>();
  for (let seed = 1; seed <= seeds; seed++) {
    const id = pickActivity({ ...state, rng: seedRng(seed) }, now, ctx).pick?.id ?? null;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return new Map([...counts].map(([id, n]) => [id, n / seeds]));
}

describe('weighted pick', () => {
  it('picks in proportion to the weights when nothing is recent', () => {
    const share = shareOver(onFloor(), NOW, ctxOf([play('a', { weight: 3 }), play('b', { weight: 1 })]), 4_000);
    expect(share.get('a')).toBeGreaterThan(0.72);
    expect(share.get('a')).toBeLessThan(0.78);
    expect(share.get('b')).toBeGreaterThan(0.22);
  });

  it('is deterministic: the same seed and state give the same pick and the same next rng', () => {
    const state = onFloor({ rng: seedRng(42) });
    expect(pickActivity(state, NOW, SHARED)).toEqual(pickActivity(state, NOW, SHARED));
    expect(pickActivity(state, NOW, SHARED).rng).not.toBe(state.rng);
  });
});

describe('recency', () => {
  const ab = ctxOf([play('a'), play('b')]);

  it('the last activity counts at the first recent penalty', () => {
    const [last] = ACTIVITY_PICK.recentPenalty;
    const share = shareOver(onFloor({ recent: [{ id: 'a', at: NOW - 5_000 }] }), NOW, ab, 4_000);
    const expected = last / (last + 1);
    expect(share.get('a')).toBeGreaterThan(expected - 0.03);
    expect(share.get('a')).toBeLessThan(expected + 0.03);
  });

  it('the one before the last counts at the second penalty', () => {
    const [last, second] = ACTIVITY_PICK.recentPenalty;
    const recent = [
      { id: 'b', at: NOW - 2_000 },
      { id: 'a', at: NOW - 5_000 },
    ];
    const share = shareOver(onFloor({ recent }), NOW, ab, 4_000);
    const expected = second / (second + last);
    expect(share.get('a')).toBeGreaterThan(expected - 0.03);
    expect(share.get('a')).toBeLessThan(expected + 0.03);
  });

  it('remember keeps the newest start first and one entry per activity', () => {
    const recent = remember(remember(remember([], 'a', 1), 'b', 2), 'a', 3.5);
    expect(recent).toEqual([
      { id: 'a', at: 3.5 },
      { id: 'b', at: 2 },
    ]);
  });
});

describe('conditions', () => {
  it('sits only on a window top, never on the floor', () => {
    expect(shareOver(onFloor(), NOW, SHARED).has('sit')).toBe(false);
    expect(shareOver(onTop(), NOW, SHARED).get('sit')).toBeGreaterThan(0);
  });

  it('a mood-gated activity starts only in its bands', () => {
    expect(shareOver(onFloor(), NOW, ctxOf(SHARED_ACTIVITIES, 'low')).has('wave')).toBe(false);
    expect(shareOver(onFloor(), NOW, ctxOf(SHARED_ACTIVITIES, 'mid')).get('wave')).toBeGreaterThan(0);
  });

  it('a time-of-day activity starts only inside its local window, over midnight too', () => {
    const night = ctxOf([play('owl', { hours: { fromMin: 22 * 60, toMin: 6 * 60 } }), play('any')]);
    // Local = UTC + tzOffsetMin; this is local hh:mm (plus half a ms, to keep `now` fractional).
    const localAt = (h: number, m: number) => 10 * DAY + (h * 60 + m - WORLD.tzOffsetMin) * MS_PER_MIN + 0.5;
    expect(shareOver(onFloor(), localAt(23, 0), night).get('owl')).toBeGreaterThan(0);
    expect(shareOver(onFloor(), localAt(5, 59), night).get('owl')).toBeGreaterThan(0);
    expect(shareOver(onFloor(), localAt(12, 0), night).has('owl')).toBe(false);
    expect(shareOver(onFloor(), localAt(6, 0), night).has('owl')).toBe(false);
  });

  it('an activity whose animation the pack lacks never starts', () => {
    const noThink = onFloor({ character: { ...makeCharacter(), idle: 'idle_a' } });
    expect(noThink.character.anims).not.toContain('think');
    expect(shareOver(noThink, NOW, SHARED).has('think')).toBe(false);
    expect(shareOver(onFloor(), NOW, SHARED).get('think')).toBeGreaterThan(0);
  });

  it('a stroll needs a walk and room for its shortest distance', () => {
    const stroll = ctxOf([SHARED_ACTIVITIES.find((a) => a.id === 'stroll') ?? play('missing')]);
    const noWalk = onFloor({ character: { id: 'pixmates.maid', anims: ['idle_a', 'turn'], idle: 'idle_a' } });
    expect(pickActivity(onFloor(), NOW, stroll).pick?.id).toBe('stroll');
    expect(pickActivity(noWalk, NOW, stroll).pick).toBeNull();
    // A ledge just wider than the foot insets: no room for 24 art px either way.
    const ledge: Surface = { kind: 'window_top', id: 'w2', left: 500, right: 500 + 30 * ART_DIP, y: 500 };
    const narrow = makeCoreState({ world: WORLD, pos: { surface: ledge, x: 500 + 15 * ART_DIP, y: 500 } });
    expect(pickActivity(narrow, NOW, stroll).pick).toBeNull();
  });

  it('cools down from its last start, exactly at the stored value (fractional now)', () => {
    const only = ctxOf([play('a', { cooldownMs: 10_000 })]);
    const state = onFloor({ recent: [{ id: 'a', at: 1_000.5 }] });
    expect(pickActivity(state, 11_000.25, only).pick).toBeNull();
    expect(pickActivity(state, 11_000.5, only).pick?.id).toBe('a');
  });

  it('nothing eligible → no pick and the rng is not advanced', () => {
    const state = onFloor();
    const result = pickActivity(state, NOW, ctxOf([play('perch', { where: ['window_top'] })]));
    expect(result).toEqual({ pick: null, rng: state.rng });
  });
});

describe('picked details', () => {
  it('durations stay inside the activity range', () => {
    const ctx = ctxOf([play('a', { does: { kind: 'play', anim: 'idle_b', durationMs: { min: 1_000, max: 1_500 } } })]);
    for (let seed = 1; seed <= 500; seed++) {
      const { pick } = pickActivity(onFloor({ rng: seedRng(seed) }), NOW, ctx);
      if (pick?.action.kind !== 'play') throw new Error('expected a play pick');
      expect(pick.action.durationMs).toBeGreaterThanOrEqual(1_000);
      expect(pick.action.durationMs).toBeLessThanOrEqual(1_500);
    }
  });

  it('a stroll target is inside the walkable span, within the distance range, toward a side with room', () => {
    const ctx = ctxOf(SHARED_ACTIVITIES.filter((a) => a.id === 'stroll'));
    // Near the right end of the floor: room only on the left for the full range.
    const span = surfaceSpan({ kind: 'floor' }, WORLD);
    const x = span.right - 10;
    for (let seed = 1; seed <= 500; seed++) {
      const state = onFloor({ rng: seedRng(seed), pos: { surface: { kind: 'floor' }, x, y: FLOOR_Y } });
      const { pick } = pickActivity(state, NOW, ctx);
      if (pick?.action.kind !== 'stroll') throw new Error('expected a stroll pick');
      const { target } = pick.action;
      expect(target).toBeLessThan(x);
      expect(target).toBeGreaterThanOrEqual(span.left);
      expect(x - target).toBeGreaterThanOrEqual(24 * ART_DIP - 1e-9);
      expect(x - target).toBeLessThanOrEqual(160 * ART_DIP + 1e-9);
    }
  });
});

/**
 * 10 k consecutive picks as the engine would make them: each start is remembered, time moves on by the activity's
 * length (a stroll: its walk plus two turns) and a stroll ends at its target.
 */
function simulate(
  start: CoreState,
  picks: number,
): { pickShare: Map<ActivityId, number>; timeShare: Map<ActivityId, number> } {
  const count = new Map<ActivityId, number>();
  const time = new Map<ActivityId, number>();
  let state = start;
  let now = NOW;
  let total = 0;
  for (let i = 0; i < picks; i++) {
    const { pick, rng } = pickActivity(state, now, SHARED);
    if (pick === null) throw new Error(`no pick at ${String(i)}`);
    const { action } = pick;
    const ms =
      action.kind === 'stroll'
        ? (Math.abs(action.target - state.pos.x) / (WALK_TRAVEL.pxPerSecond * ART_DIP)) * 1000 + 2 * turnMs
        : action.durationMs;
    const x = action.kind === 'stroll' ? action.target : state.pos.x;
    state = { ...state, rng, recent: remember(state.recent, pick.id, now), pos: { ...state.pos, x } };
    count.set(pick.id, (count.get(pick.id) ?? 0) + 1);
    time.set(pick.id, (time.get(pick.id) ?? 0) + ms);
    now += ms;
    total += ms;
  }
  return {
    pickShare: new Map([...count].map(([id, n]) => [id, n / picks])),
    timeShare: new Map([...time].map(([id, ms]) => [id, ms / total])),
  };
}

describe('variety (content rule: no activity > 30 %)', () => {
  it.each([
    ['floor', onFloor({ rng: seedRng(2026) }), ['stand', 'fidget', 'stroll', 'think', 'wave']],
    ['window top', onTop({ rng: seedRng(2026) }), ['stand', 'fidget', 'stroll', 'sit', 'think', 'wave']],
  ])('%s: over 10 k picks every activity appears and none takes > 30 %% of picks or of time', (_, start, ids) => {
    const { pickShare, timeShare } = simulate(start, 10_000);
    expect([...pickShare.keys()].sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(pickShare.get(id), `${id} picks`).toBeLessThanOrEqual(0.3);
      expect(timeShare.get(id), `${id} time`).toBeLessThanOrEqual(0.3);
    }
  });
});

describe('startActivity', () => {
  const only = (def: ActivityDef) => ctxOf([def]);
  const NOW_F = NOW + 0.25;

  it('play: shows the animation front-facing in place until its end, and remembers the start', () => {
    const state = onFloor();
    const { state: next, effects } = startActivity(state, NOW_F, only(play('fidget')));
    const { behavior } = next;
    if (behavior.kind !== 'activity') throw new Error(`expected activity, got ${behavior.kind}`);
    expect(behavior).toMatchObject({ id: 'fidget', anim: 'idle_b', since: NOW_F });
    expect(behavior.until).not.toBeNull();
    expect(next.wakeAt).toBe(behavior.until);
    expect(next.recent[0]).toEqual({ id: 'fidget', at: NOW_F });
    expect(next.rng).not.toBe(state.rng);
    expect(effects).toEqual([
      { type: 'Show', anim: 'idle_b', facing: 'front', playback: 'fwd', motion: { kind: 'still', x: 960, y: FLOOR_Y } },
    ]);
  });

  it('idle: holds the pack base idle', () => {
    const def: ActivityDef = { ...play('stand'), does: { kind: 'idle', durationMs: { min: 4_000, max: 4_000 } } };
    const { state: next, effects } = startActivity(onFloor(), NOW_F, only(def));
    expect(next.behavior).toEqual({
      kind: 'activity',
      id: 'stand',
      anim: 'idle_a',
      since: NOW_F,
      until: NOW_F + 4_000,
    });
    expect(next.wakeAt).toBe(NOW_F + 4_000);
    expect(effects).toMatchObject([{ type: 'Show', anim: 'idle_a', facing: 'front' }]);
  });

  it('sit: sits on the edge until its end', () => {
    const def = SHARED_ACTIVITIES.find((a) => a.id === 'sit') ?? play('missing');
    const { state: next, effects } = startActivity(onTop(), NOW_F, only(def));
    if (next.behavior.kind !== 'sit_edge') throw new Error(`expected sit_edge, got ${next.behavior.kind}`);
    expect(next.behavior.since).toBe(NOW_F);
    expect(next.wakeAt).toBe(next.behavior.until);
    expect(effects).toEqual([
      { type: 'Show', anim: 'sit_edge', facing: 'front', playback: 'fwd', motion: { kind: 'still', x: 900, y: TOP.y } },
    ]);
  });

  it('stroll: starts the travel (turn toward the target) and remembers it', () => {
    const def = SHARED_ACTIVITIES.find((a) => a.id === 'stroll') ?? play('missing');
    const { state: next, effects } = startActivity(onFloor({ rng: seedRng(3) }), NOW_F, only(def));
    expect(next.behavior.kind).toBe('turn');
    if (next.behavior.kind !== 'turn' || next.behavior.then.kind !== 'walk') throw new Error('expected turn → walk');
    expect(next.facing).toBe(next.behavior.dir);
    expect(next.recent[0]).toEqual({ id: 'stroll', at: NOW_F });
    expect(effects).toMatchObject([{ type: 'Show', anim: 'turn', playback: 'fwd' }]);
  });

  it('nothing eligible: holds the base idle for the fallback time, remembering nothing', () => {
    const state = onFloor();
    const { state: next, effects } = startActivity(state, NOW_F, only(play('perch', { where: ['window_top'] })));
    const until = NOW_F + ACTIVITY_PICK.fallbackIdleMs;
    expect(next.behavior).toEqual({ kind: 'idle', anim: 'idle_a', since: NOW_F, until });
    expect(next.wakeAt).toBe(until);
    expect(next.recent).toEqual([]);
    expect(next.rng).toBe(state.rng);
    expect(effects).toMatchObject([{ type: 'Show', anim: 'idle_a', facing: 'front' }]);
  });

  it('a stroll shorter than half a stride rests in the base idle instead, without remembering it', () => {
    // 0.5 art px = a quarter of a 2-art-px stride: the travel rounds to zero strides.
    const tiny: ActivityDef = { ...play('shuffle'), does: { kind: 'stroll', distanceArt: { min: 0.5, max: 0.5 } } };
    const state = onFloor();
    const { state: next, effects } = startActivity(state, NOW_F, only(tiny));
    expect(next.behavior).toEqual({
      kind: 'idle',
      anim: 'idle_a',
      since: NOW_F,
      until: NOW_F + ACTIVITY_PICK.fallbackIdleMs,
    });
    expect(next.recent).toEqual([]);
    expect(next.rng).not.toBe(state.rng);
    expect(effects).toMatchObject([{ type: 'Show', anim: 'idle_a', facing: 'front' }]);
  });
});

describe('content: shared set', () => {
  it('ids are unique, weights positive, ranges ordered, every entry has a surface', () => {
    const ids = SHARED_ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of SHARED_ACTIVITIES) {
      expect(a.weight, a.id).toBeGreaterThan(0);
      expect(a.where.length, a.id).toBeGreaterThan(0);
      const range = a.does.kind === 'stroll' ? a.does.distanceArt : a.does.durationMs;
      expect(range.min, a.id).toBeLessThanOrEqual(range.max);
      expect(range.min, a.id).toBeGreaterThan(0);
    }
  });
});
