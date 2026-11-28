import { describe, expect, it } from 'vitest';
import { SPRITE_FRAME_WIDTH_ART } from '../../../src/content/desktop.ts';
import { TURN_PLAY, WALK_EDGE_INSET_ART, WALK_TRAVEL } from '../../../src/content/stage.ts';
import {
  advanceTravel,
  planStride,
  startTravel,
  stepDipOf,
  surfaceSpan,
  travelX,
  turnMs,
} from '../../../src/core/travel.ts';
import type { Behavior, CoreState, Effect, World } from '../../../src/core/types.ts';
import { walkX } from '../../../src/shared/motion.ts';
import { makeCoreState, makeWorld } from '../../fixtures/core-state.ts';

const NOW = 10_000;
const FRAME_MS = 1000 / WALK_TRAVEL.fps;
/** ×4 at 125 %: one walk frame = 2 art px × 4 device px = 8 device px = 6.4 DIP. */
const WORLD = makeWorld({ scale: 4, scaleFactor: 1.25 });
const FLOOR_Y = WORLD.workArea.height;
const FULL = { left: 0, right: WORLD.workArea.width };
/** DIP per art px at ×4 / 125 %. */
const ART_DIP = 3.2;
/** A window top's foot inset: `WALK_EDGE_INSET_ART` art px. */
const INSET = WALK_EDGE_INSET_ART * ART_DIP;
/** The floor's inset: half the frame width, so the whole sprite stays on screen. */
const FLOOR_INSET = (SPRITE_FRAME_WIDTH_ART / 2) * ART_DIP;

const onFloorAt = (x: number, overrides: Partial<CoreState> = {}): CoreState =>
  makeCoreState({ world: WORLD, pos: { surface: { kind: 'floor' }, x, y: FLOOR_Y }, ...overrides });

const shows = (effects: readonly Effect[]) => effects.filter((e) => e.type === 'Show');

/** Runs a planned travel to its end, one deadline at a time, as main's timer would (`wakeAt`); it must end idle. */
function runTravel(state: CoreState): { states: CoreState[]; effects: Effect[] } {
  const states: CoreState[] = [state];
  const effects: Effect[] = [];
  let current = state;
  for (let guard = 0; guard < 4 && (current.behavior.kind === 'turn' || current.behavior.kind === 'walk'); guard++) {
    const due = current.behavior.until;
    const next = advanceTravel(current, due);
    states.push(next.state);
    effects.push(...next.effects);
    current = next.state;
  }
  expect(current.behavior.kind).toBe('idle');
  return { states, effects };
}

describe('stride and speed (ADR 010, plan acceptance 2)', () => {
  it('one walk frame moves pxPerFrame art px × the integer scale in device px', () => {
    expect(stepDipOf(WORLD)).toBeCloseTo(6.4, 9);
    expect(stepDipOf(WORLD) * WORLD.scaleFactor).toBeCloseTo(WALK_TRAVEL.pxPerFrame * WORLD.scale, 9);
  });

  it.each([
    [2, 1],
    [3, 1.25],
    [4, 1.25],
    [4, 1.5],
    [5, 2],
  ])('on-screen speed = pxPerSecond × scale device px/s exactly (scale %d at %d)', (scale, scaleFactor) => {
    const world = makeWorld({ scale, scaleFactor });
    const stride = planStride(0, 400, world, { left: 0, right: 1920 });
    expect(stride).not.toBeNull();
    if (stride === null) return;
    const devicePx = (stride.x1 - stride.x0) * scaleFactor;
    expect(devicePx / (stride.durationMs / 1000)).toBeCloseTo(WALK_TRAVEL.pxPerSecond * scale, 6);
  });

  it('turn lasts its frames at its fps', () => {
    expect(turnMs).toBe((TURN_PLAY.frames * 1000) / TURN_PLAY.fps);
  });
});

describe('planStride: distance quantised to whole strides', () => {
  it('rounds to the nearest stride count and arrives on that stride grid', () => {
    // 100 / 6.4 = 15.6 → 16 strides = 102.4 DIP in 1.6 s.
    const stride = planStride(500, 600, WORLD, FULL);
    expect(stride).toMatchObject({ dir: 'right', x0: 500, steps: 16, durationMs: 16 * FRAME_MS });
    expect(stride?.stepDip).toBeCloseTo(6.4, 9);
    expect(stride?.x1).toBeCloseTo(602.4, 9);
  });

  it('rounds down when the remainder is under half a stride', () => {
    // 98 / 6.4 = 15.3 → 15.
    expect(planStride(500, 598, WORLD, FULL)?.steps).toBe(15);
  });

  it('a target left of the start walks left', () => {
    const stride = planStride(500, 400, WORLD, FULL);
    expect(stride?.dir).toBe('left');
    expect(stride?.x1).toBeCloseTo(500 - 16 * 6.4, 9);
  });

  it('less than half a stride away is no travel', () => {
    expect(planStride(500, 503, WORLD, FULL)).toBeNull();
    expect(planStride(500, 500, WORLD, FULL)).toBeNull();
  });

  it('clamps the target into the span', () => {
    const stride = planStride(1900, 5000, WORLD, FULL);
    expect(stride?.dir).toBe('right');
    expect(stride?.steps).toBe(3);
    expect(stride?.x1).toBeLessThanOrEqual(FULL.right);
  });

  it('the span is half-open: an arrival exactly at its right end is one stride too far', () => {
    const stride = planStride(1900, 5000, WORLD, { left: 0, right: 1900 + 2 * 6.4 });
    expect(stride?.steps).toBe(1);
  });

  it('drops the last stride when rounding up would step off the span', () => {
    // 19 DIP to the edge = 2.97 strides → 3 would land at 1919.2 > 1919 → 2.
    const stride = planStride(1900, 1919, WORLD, { left: 0, right: 1919 });
    expect(stride?.steps).toBe(2);
    expect(stride?.x1).toBeCloseTo(1900 + 2 * 6.4, 9);
  });

  it('walking left clamps the target to the left end, which is inclusive', () => {
    // 2 strides land exactly on `left`; a target far past it asks for no more.
    const span = { left: 100 - 2 * 6.4, right: 1920 };
    expect(planStride(100, -500, WORLD, span)).toMatchObject({ dir: 'left', steps: 2, x1: span.left });
  });

  it('walking left drops the last stride when rounding up would step past the left end', () => {
    // 19 DIP to the left end = 2.97 strides → 3 would land at 80.8 < 81 → 2.
    const stride = planStride(100, 0, WORLD, { left: 81, right: 1920 });
    expect(stride).toMatchObject({ dir: 'left', steps: 2 });
    expect(stride?.x1).toBeCloseTo(100 - 2 * 6.4, 9);
  });

  it('from outside the span (the window moved) walks back in, toward its nearest end', () => {
    const span = { left: 300, right: 500 };
    const inside = (x: number | undefined): boolean => x !== undefined && span.left <= x && x < span.right;
    // From the right: target 900 clamps to the right end; 100 / 6.4 = 15.6 → 16 lands at 497.6.
    const fromRight = planStride(600, 900, WORLD, span);
    expect(fromRight).toMatchObject({ dir: 'left', steps: 16 });
    expect(inside(fromRight?.x1)).toBe(true);
    // 98 / 6.4 = 15.3 rounds to 15, which would stop at 502, still outside: one more stride brings the foot in.
    const shortOfIt = planStride(598, 900, WORLD, span);
    expect(shortOfIt).toMatchObject({ dir: 'left', steps: 16 });
    expect(inside(shortOfIt?.x1)).toBe(true);
    // From the left: target −100 clamps to the left end; 98 / 6.4 → 15 would stop at 298 → 16.
    const fromLeft = planStride(202, -100, WORLD, span);
    expect(fromLeft).toMatchObject({ dir: 'right', steps: 16 });
    expect(inside(fromLeft?.x1)).toBe(true);
  });

  it('an empty or inverted span (a top narrower than both insets) has nowhere to walk', () => {
    expect(planStride(500, 600, WORLD, { left: 520, right: 480 })).toBeNull();
    expect(planStride(500, 600, WORLD, { left: 520, right: 520 })).toBeNull();
    expect(planStride(400, 600, WORLD, { left: 520, right: 480 })).toBeNull();
  });
});

describe('surfaceSpan: where the foot pivot may walk', () => {
  it('the floor keeps the whole sprite on screen; a window top only keeps the feet on its segment', () => {
    const floor = surfaceSpan({ kind: 'floor' }, WORLD);
    expect(floor.left).toBeCloseTo(FLOOR_INSET, 9);
    expect(floor.right).toBeCloseTo(WORLD.workArea.width - FLOOR_INSET, 9);
    const top = surfaceSpan({ kind: 'window_top', id: 'w', left: 300, right: 700, y: 400 }, WORLD);
    expect(top.left).toBeCloseTo(300 + INSET, 9);
    expect(top.right).toBeCloseTo(700 - INSET, 9);
  });

  it('the insets are in art px: they scale with the sprite', () => {
    const world = makeWorld({ scale: 2, scaleFactor: 1 });
    expect(surfaceSpan({ kind: 'floor' }, world).left).toBe((SPRITE_FRAME_WIDTH_ART / 2) * 2);
    const top = surfaceSpan({ kind: 'window_top', id: 'w', left: 300, right: 700, y: 400 }, world);
    expect(top.left).toBe(300 + WALK_EDGE_INSET_ART * 2);
  });
});

describe('startTravel: turn forward first', () => {
  it('enters turn toward the target, faces it and shows the turn forward in place', () => {
    const { state, effects } = startTravel(onFloorAt(500), 600, NOW);
    const x1 = planStride(500, 600, WORLD, FULL)?.x1;
    expect(state.behavior).toEqual({
      kind: 'turn',
      dir: 'right',
      then: { kind: 'walk', x1 },
      since: NOW,
      until: NOW + turnMs,
    });
    expect(state.facing).toBe('right');
    expect(state.wakeAt).toBe(NOW + turnMs);
    expect(effects).toEqual([
      { type: 'Show', anim: 'turn', facing: 'right', playback: 'fwd', motion: { kind: 'still', x: 500, y: FLOOR_Y } },
    ]);
  });

  it('leftward travel faces left (the stage mirrors the right-facing art)', () => {
    const { state, effects } = startTravel(onFloorAt(500), 300, NOW);
    expect(state.facing).toBe('left');
    expect(shows(effects).map((e) => e.facing)).toEqual(['left']);
  });

  it('stays on a window top: the span is its segment', () => {
    const surface = { kind: 'window_top', id: 'w', left: 300, right: 700, y: 400 } as const;
    const state = makeCoreState({ world: WORLD, pos: { surface, x: 651.2, y: 400 } });
    const { state: next } = startTravel(state, 900, NOW);
    // Inset right end 700 − 19.2 = 680.8: 29.6 / 6.4 = 4.6 → 5 would end at 683.2 → 4.
    expect(next.behavior.kind === 'turn' && next.behavior.then).toMatchObject({ kind: 'walk' });
    const x1 = next.behavior.kind === 'turn' && next.behavior.then.kind === 'walk' ? next.behavior.then.x1 : NaN;
    expect(x1).toBeCloseTo(651.2 + 4 * 6.4, 9);
  });

  it('a target within half a stride changes nothing', () => {
    const state = onFloorAt(500);
    expect(startTravel(state, 502, NOW)).toEqual({ state, effects: [] });
  });

  it('a window top narrower than both foot insets changes nothing', () => {
    const surface = { kind: 'window_top', id: 'w', left: 500, right: 500 + INSET, y: 400 } as const;
    const state = makeCoreState({ world: WORLD, pos: { surface, x: 505, y: 400 } });
    expect(startTravel(state, 900, NOW)).toEqual({ state, effects: [] });
  });

  it.each([
    [1.25, 500.3],
    [1.5, 700.1],
    [1.75, 333.33],
  ])('at %d snaps the start onto the device-pixel grid, so every stride lands on a whole device px', (sf, x) => {
    const world = makeWorld({ scale: 4, scaleFactor: sf });
    const start = makeCoreState({ world, pos: { surface: { kind: 'floor' }, x, y: FLOOR_Y } });
    const { states, effects } = runTravel(startTravel(start, x + 200, NOW).state);
    const shown = shows(effects)[0]?.motion;
    expect(shown?.kind).toBe('walk');
    if (shown?.kind !== 'walk') return;
    expect(Math.abs(shown.x0 - x) * sf).toBeLessThanOrEqual(0.5);
    for (let k = 0; k <= shown.steps; k++) {
      const devicePx = walkX(shown, k * FRAME_MS, WALK_TRAVEL.fps) * sf;
      expect(Math.abs(devicePx - Math.round(devicePx))).toBeLessThan(1e-6);
    }
    expect(states[0]?.pos.x).toBe(shown.x0);
  });
});

describe('advanceTravel: turn fwd → walk → turn rev → front idle', () => {
  it('plays the sequence in order, each at its deadline, ending front-facing on the stride grid', () => {
    const { states, effects } = runTravel(startTravel(onFloorAt(500), 600, NOW).state);
    const { x1, stepDip } = planStride(500, 600, WORLD, FULL) ?? { x1: NaN, stepDip: NaN };
    const walkStart = NOW + turnMs;
    const walkEnd = walkStart + 16 * FRAME_MS;
    expect(states.map((s) => s.behavior.kind)).toEqual(['turn', 'walk', 'turn', 'idle']);
    expect(states[1]?.behavior).toEqual({
      kind: 'walk',
      dir: 'right',
      x0: 500,
      x1,
      steps: 16,
      stepDip,
      since: walkStart,
      until: walkEnd,
    });
    expect(states[2]?.behavior).toEqual({
      kind: 'turn',
      dir: 'right',
      then: { kind: 'front' },
      since: walkEnd,
      until: walkEnd + turnMs,
    });
    expect(states[3]?.behavior).toEqual({ kind: 'idle', anim: 'idle_a', since: walkEnd + turnMs, until: null });
    expect(states.map((s) => s.wakeAt)).toEqual([walkStart, walkEnd, walkEnd + turnMs, walkEnd + turnMs]);
    expect(states[2]?.pos).toEqual({ surface: { kind: 'floor' }, x: x1, y: FLOOR_Y });
    expect(shows(effects)).toEqual([
      {
        type: 'Show',
        anim: 'walk',
        facing: 'right',
        playback: 'fwd',
        motion: { kind: 'walk', x0: 500, y: FLOOR_Y, dir: 'right', steps: 16, stepDip },
      },
      { type: 'Show', anim: 'turn', facing: 'right', playback: 'rev', motion: { kind: 'still', x: x1, y: FLOOR_Y } },
      { type: 'Show', anim: 'idle_a', facing: 'front', playback: 'fwd', motion: { kind: 'still', x: x1, y: FLOOR_Y } },
    ]);
  });

  it('the shown walk arrives exactly where and when the core says', () => {
    const { states, effects } = runTravel(startTravel(onFloorAt(800), 500, NOW).state);
    const walk = states[1]?.behavior;
    const shown = shows(effects)[0]?.motion;
    expect(walk?.kind).toBe('walk');
    expect(shown?.kind).toBe('walk');
    if (walk?.kind !== 'walk' || shown?.kind !== 'walk') return;
    expect(walkX(shown, walk.until - walk.since, WALK_TRAVEL.fps)).toBe(walk.x1);
    expect(shown.dir).toBe('left');
    expect(shows(effects).map((e) => e.facing)).toEqual(['left', 'left', 'front']);
  });

  it('a late wake starts the walk at that now: lateness shifts time, never position', () => {
    const turning = startTravel(onFloorAt(500), 600, NOW).state;
    const late = NOW + turnMs + 37;
    const { state, effects } = advanceTravel(turning, late);
    const stride = planStride(500, 600, WORLD, FULL);
    const until = late + (stride?.durationMs ?? NaN);
    expect(state.behavior).toMatchObject({ kind: 'walk', x0: 500, x1: stride?.x1, since: late, until });
    expect(state.wakeAt).toBe(until);
    expect(shows(effects)[0]?.motion).toMatchObject({ kind: 'walk', x0: 500, steps: stride?.steps });
  });

  it('before the deadline nothing changes', () => {
    const state = startTravel(onFloorAt(500), 600, NOW).state;
    expect(advanceTravel(state, NOW + turnMs - 1)).toEqual({ state, effects: [] });
  });

  it('a state that is not travelling is left alone', () => {
    const state = onFloorAt(500);
    expect(advanceTravel(state, NOW + 60_000)).toEqual({ state, effects: [] });
  });

  it('a scale change during the turn re-plans the walk on the new stride grid', () => {
    const turning = startTravel(onFloorAt(500), 600, NOW).state;
    const bigger: World = makeWorld({ scale: 5, scaleFactor: 1.25 });
    const { state } = advanceTravel({ ...turning, world: bigger }, NOW + turnMs);
    // 102.4 / 8 = 12.8 → 13 strides of 8 DIP.
    expect(state.behavior).toMatchObject({ kind: 'walk', x0: 500, steps: 13, stepDip: 8, x1: 500 + 13 * 8 });
    expect(state.wakeAt).toBe(NOW + turnMs + 13 * FRAME_MS);
  });

  it('a walk target the new grid cannot reach skips the walk and turns back to front', () => {
    const turning: CoreState = {
      ...onFloorAt(500),
      behavior: { kind: 'turn', dir: 'right', then: { kind: 'walk', x1: 501 }, since: NOW, until: NOW + turnMs },
    };
    const { state, effects } = advanceTravel(turning, NOW + turnMs);
    expect(state.behavior).toMatchObject({ kind: 'turn', then: { kind: 'front' }, since: NOW + turnMs });
    expect(shows(effects)).toEqual([
      { type: 'Show', anim: 'turn', facing: 'right', playback: 'rev', motion: { kind: 'still', x: 500, y: FLOOR_Y } },
    ]);
  });
});

describe('travelX: the live foot x, for re-planning an interrupted walk', () => {
  const STEP_DIP = 6.4;
  const walkFrom = (since: number): CoreState => {
    const behavior: Behavior = {
      kind: 'walk',
      dir: 'right',
      x0: 500,
      x1: 500 + 5 * STEP_DIP,
      steps: 5,
      stepDip: STEP_DIP,
      since,
      until: since + 5 * FRAME_MS,
    };
    return { ...onFloorAt(500), behavior };
  };

  it('mid-walk it is the last whole stride taken', () => {
    expect(travelX(walkFrom(NOW), NOW + 2 * FRAME_MS + 40)).toBeCloseTo(500 + 2 * STEP_DIP, 9);
  });

  it('after the arrival it is the arrival', () => {
    expect(travelX(walkFrom(NOW), NOW + 60_000)).toBeCloseTo(532, 9);
  });

  it.each([10_000, 10_000.37, 1_800_000_000_000.37])('at the arrival deadline it is exactly x1 (since %d)', (since) => {
    const { behavior } = walkFrom(since);
    if (behavior.kind !== 'walk') throw new Error('fixture is a walk');
    expect(travelX(walkFrom(since), behavior.until)).toBe(behavior.x1);
  });

  it('each frame boundary is exactly that stride, from the stored strides', () => {
    const since = 10_000.37;
    for (let k = 0; k <= 5; k++) expect(travelX(walkFrom(since), since + k * FRAME_MS)).toBe(500 + k * STEP_DIP);
  });

  it('when not walking it is the settled spot', () => {
    expect(travelX(startTravel(onFloorAt(500), 600, NOW).state, NOW + 50)).toBe(500);
  });
});
