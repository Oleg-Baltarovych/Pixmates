import { describe, expect, it } from 'vitest';
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
/** `WALK_EDGE_INSET_ART` at ×4 / 125 % (3.2 DIP per art px). */
const INSET = WALK_EDGE_INSET_ART * 3.2;

const onFloorAt = (x: number, overrides: Partial<CoreState> = {}): CoreState =>
  makeCoreState({ world: WORLD, pos: { surface: { kind: 'floor' }, x, y: FLOOR_Y }, ...overrides });

const shows = (effects: readonly Effect[]) => effects.filter((e) => e.type === 'Show');

/** Runs a planned travel to its end, one deadline at a time, as main's timer would (`wakeAt`). */
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
    expect(planStride(500, 600, WORLD, FULL)).toEqual({
      dir: 'right',
      x0: 500,
      x1: 500 + 16 * 6.4,
      steps: 16,
      stepDip: 6.4,
      durationMs: 16 * FRAME_MS,
    });
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
});

describe('surfaceSpan: where the foot pivot may walk', () => {
  it('the floor spans the work area, a window top its visible segment, both inset so the feet stay on', () => {
    const floor = surfaceSpan({ kind: 'floor' }, WORLD);
    expect(floor.left).toBeCloseTo(INSET, 9);
    expect(floor.right).toBeCloseTo(WORLD.workArea.width - INSET, 9);
    const top = surfaceSpan({ kind: 'window_top', id: 'w', left: 300, right: 700, y: 400 }, WORLD);
    expect(top.left).toBeCloseTo(300 + INSET, 9);
    expect(top.right).toBeCloseTo(700 - INSET, 9);
  });

  it('the inset is in art px: it scales with the sprite', () => {
    const span = surfaceSpan({ kind: 'floor' }, makeWorld({ scale: 2, scaleFactor: 1 }));
    expect(span.left).toBe(WALK_EDGE_INSET_ART * 2);
  });
});

describe('startTravel: turn forward first', () => {
  it('enters turn toward the target, faces it and shows the turn forward in place', () => {
    const { state, effects } = startTravel(onFloorAt(500), 600, NOW);
    expect(state.behavior).toEqual({
      kind: 'turn',
      dir: 'right',
      then: { kind: 'walk', x1: 500 + 16 * 6.4 },
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
    const state = makeCoreState({ world: WORLD, pos: { surface, x: 650, y: 400 } });
    const { state: next } = startTravel(state, 900, NOW);
    // Inset right end 700 − 19.2 = 680.8: 30.8 / 6.4 = 4.8 → 5 would end at 682 → 4.
    expect(next.behavior.kind === 'turn' && next.behavior.then).toEqual({ kind: 'walk', x1: 650 + 4 * 6.4 });
  });

  it('a target within half a stride changes nothing', () => {
    const state = onFloorAt(500);
    expect(startTravel(state, 502, NOW)).toEqual({ state, effects: [] });
  });
});

describe('advanceTravel: turn fwd → walk → turn rev → front idle', () => {
  it('plays the sequence in order, each at its deadline, ending front-facing on the stride grid', () => {
    const { states, effects } = runTravel(startTravel(onFloorAt(500), 600, NOW).state);
    const x1 = 500 + 16 * 6.4;
    const walkStart = NOW + turnMs;
    const walkEnd = walkStart + 16 * FRAME_MS;
    expect(states.map((s) => s.behavior.kind)).toEqual(['turn', 'walk', 'turn', 'idle']);
    expect(states[1]?.behavior).toEqual({ kind: 'walk', dir: 'right', x0: 500, x1, since: walkStart, until: walkEnd });
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
        motion: { kind: 'walk', x0: 500, y: FLOOR_Y, dir: 'right', steps: 16, stepDip: 6.4 },
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
    expect(walkX(shown, walk.until - walk.since, WALK_TRAVEL.fps)).toBeCloseTo(walk.x1, 9);
    expect(shown.dir).toBe('left');
    expect(shows(effects).map((e) => e.facing)).toEqual(['left', 'left', 'front']);
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
    expect(state.behavior).toMatchObject({ kind: 'walk', x0: 500, x1: 500 + 13 * 8 });
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
  const walking = (): CoreState => {
    const behavior: Behavior = { kind: 'walk', dir: 'right', x0: 500, x1: 532, since: NOW, until: NOW + 5 * FRAME_MS };
    return { ...onFloorAt(500), behavior };
  };

  it('mid-walk it is the last whole stride taken', () => {
    expect(travelX(walking(), NOW + 2 * FRAME_MS + 40)).toBeCloseTo(500 + 2 * 6.4, 9);
  });

  it('after the arrival it is the arrival', () => {
    expect(travelX(walking(), NOW + 60_000)).toBeCloseTo(532, 9);
  });

  it('when not walking it is the settled spot', () => {
    expect(travelX(startTravel(onFloorAt(500), 600, NOW).state, NOW + 50)).toBe(500);
  });
});
