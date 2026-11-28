import { describe, expect, it } from 'vitest';
import { FLIGHT_BOUNDS_ART, HARD_LANDING_HOLD_MS, LAND_PLAY, PHYSICS } from '../../../src/content/physics.ts';
import {
  advanceFlight,
  artPxDipOf,
  checkSupport,
  clampFling,
  planFlight,
  replanFlight,
  startFlight,
  supportOf,
} from '../../../src/core/physics.ts';
import { startTravel, advanceTravel, travelX } from '../../../src/core/travel.ts';
import type { CoreState, Placement, World } from '../../../src/core/types.ts';
import { samplePath } from '../../../src/shared/motion.ts';
import { makeCoreState, makeWindow, makeWorld } from '../../fixtures/core-state.ts';

// makeWorld: 1920 × 1032 DIP, ×4 at 125 % → 3.2 DIP per art px.
const world = makeWorld();
const A = artPxDipOf(world);
const G = PHYSICS.gravityArtS2 * A;
const FLOOR = world.workArea.height;
const LEFT = FLIGHT_BOUNDS_ART.side * A;
const RIGHT = world.workArea.width - LEFT;
const TOP = FLIGHT_BOUNDS_ART.top * A;
const LAND_MS = (LAND_PLAY.frames * 1000) / LAND_PLAY.fps;
const NOW = 10_000;

/** A window whose top edge (y 600) spans x 800…1200. */
const shelf = makeWindow('w1', 800, 600, 400, 300);
const onShelf = makeWorld({ windows: [shelf] });
const shelfSpot: Placement = {
  surface: { kind: 'window_top', id: 'w1', left: 800, right: 1200, y: 600 },
  x: 1000,
  y: 600,
};
const dropMs = (height: number, g = G): number => Math.sqrt((2 * height) / g) * 1000;
const lastPoint = (segments: Parameters<typeof samplePath>[0]) => samplePath(segments, Number.POSITIVE_INFINITY);

describe('planFlight: ballistic closed form, landing on the first surface crossed downward', () => {
  it('drops from rest onto the floor in √(2h/g)', () => {
    const flight = planFlight(world, { x: 960, y: 500 }, { vx: 0, vy: 0 });
    expect(flight.segments).toHaveLength(1);
    expect(flight.durationMs).toBeCloseTo(dropMs(FLOOR - 500), 6);
    expect(flight.landing).toEqual({ surface: { kind: 'floor' }, x: 960, y: FLOOR });
  });

  it('lands on a visible window top that holds x, not on the floor below it', () => {
    const flight = planFlight(onShelf, { x: 1000, y: 300 }, { vx: 0, vy: 0 });
    expect(flight.landing.surface).toMatchObject({ kind: 'window_top', id: 'w1', y: 600 });
    expect(flight.landing.y).toBe(600);
    expect(flight.durationMs).toBeCloseTo(dropMs(300), 6);
  });

  it('misses a window top whose span does not hold x at the crossing', () => {
    expect(planFlight(onShelf, { x: 700, y: 300 }, { vx: 0, vy: 0 }).landing.surface).toEqual({ kind: 'floor' });
    // Moving right, it crosses y 600 only after x has passed the window's right end.
    const fast = planFlight(onShelf, { x: 1100, y: 590 }, { vx: 3_000, vy: 0 });
    expect(fast.landing.surface).toEqual({ kind: 'floor' });
  });

  it('falls through the part of an edge a front window hides', () => {
    const front = makeWindow('front', 920, 500, 160, 300);
    const flight = planFlight(makeWorld({ windows: [front, shelf] }), { x: 1000, y: 300 }, { vx: 0, vy: 0 });
    expect(flight.landing.surface).toMatchObject({ kind: 'window_top', id: 'front', y: 500 });
    const beside = planFlight(makeWorld({ windows: [front, shelf] }), { x: 850, y: 300 }, { vx: 0, vy: 0 });
    expect(beside.landing.surface).toMatchObject({ kind: 'window_top', id: 'w1', left: 800, right: 920 });
  });

  it('only a descending crossing lands: from below an edge it passes up through it and lands on the way down', () => {
    expect(planFlight(onShelf, { x: 1000, y: 700 }, { vx: 0, vy: 0 }).landing.surface).toEqual({ kind: 'floor' });
    const vy = -Math.sqrt(2 * G * 300); // apex at y 400, 200 DIP above the edge
    const thrown = planFlight(onShelf, { x: 1000, y: 700 }, { vx: 0, vy });
    expect(thrown.landing.surface).toMatchObject({ kind: 'window_top', id: 'w1' });
    expect(thrown.durationMs).toBeCloseTo((-vy / G) * 1000 + dropMs(200), 6);
  });

  it('desktop layer = floor only, even over a window', () => {
    const flight = planFlight(makeWorld({ windows: [shelf], layer: 'desktop' }), { x: 1000, y: 300 }, { vx: 0, vy: 0 });
    expect(flight.landing.surface).toEqual({ kind: 'floor' });
  });

  it('bounces off a wall: the speed into it × restitution, reversed; position and vy continuous', () => {
    const flight = planFlight(world, { x: RIGHT - 100, y: 300 }, { vx: 1_000, vy: 0 });
    const [a, b] = flight.segments;
    expect(a?.durationMs).toBeCloseTo(100, 6);
    expect(b?.x0).toBeCloseTo(RIGHT, 9);
    expect(b?.y0).toBeCloseTo(300 + (G * 0.1 * 0.1) / 2, 9);
    expect(b?.vx).toBeCloseTo(-1_000 * PHYSICS.restitution, 9);
    expect(b?.vy).toBeCloseTo(G * 0.1, 9);
    expect(flight.landing.x).toBeLessThan(RIGHT);
  });

  it('bounces off the left wall the same way', () => {
    const [, b] = planFlight(world, { x: LEFT + 50, y: 300 }, { vx: -500, vy: 0 }).segments;
    expect(b?.x0).toBeCloseTo(LEFT, 9);
    expect(b?.vx).toBeCloseTo(500 * PHYSICS.restitution, 9);
  });

  it('bounces off the ceiling (the frame height under the work-area top)', () => {
    const vy = -1_500;
    const flight = planFlight(world, { x: 960, y: TOP + 50 }, { vx: 0, vy });
    const [, b] = flight.segments;
    expect(b?.y0).toBeCloseTo(TOP, 9);
    expect(b?.vy).toBeGreaterThan(0);
    const hit = (flight.segments[0]?.durationMs ?? 0) / 1000;
    expect(b?.vy).toBeCloseTo(-(vy + G * hit) * PHYSICS.restitution, 6);
  });

  it('starts inside the flight bounds when released outside them', () => {
    const flight = planFlight(world, { x: 5_000, y: -300 }, { vx: 0, vy: 0 });
    expect(flight.segments[0]).toMatchObject({ x0: RIGHT, y0: TOP });
    const below = planFlight(world, { x: -40, y: 2_000 }, { vx: 0, vy: 0 });
    expect(below.segments).toEqual([]);
    expect(below.landing).toEqual({ surface: { kind: 'floor' }, x: LEFT, y: FLOOR });
  });

  it('always ends: a wild fling caps the bounces, then drops straight down', () => {
    const flight = planFlight(
      makeWorld({ workArea: { width: 400, height: 1032 } }),
      { x: 200, y: 300 },
      clampFling({ vx: 1e6, vy: -1e6 }, world),
    );
    expect(flight.segments.length).toBeLessThanOrEqual(PHYSICS.maxBounces + 1);
    expect(flight.landing.surface).toEqual({ kind: 'floor' });
    expect(Number.isFinite(flight.durationMs)).toBe(true);
    for (const segment of flight.segments) expect(segment.durationMs).toBeGreaterThan(0);
  });

  it('the path ends exactly on the landing point', () => {
    const flight = planFlight(onShelf, { x: 300, y: 400 }, { vx: 900, vy: -1_200 });
    const end = lastPoint(flight.segments);
    expect(end?.x).toBeCloseTo(flight.landing.x, 6);
    expect(end?.y).toBeCloseTo(flight.landing.y, 6);
  });

  it('hard vs soft by the downward speed at touch-down', () => {
    const limit = PHYSICS.hardLandingArtS * A;
    const fallFor = (speed: number) => FLOOR - (speed * speed) / (2 * G);
    expect(planFlight(world, { x: 960, y: fallFor(limit * 1.1) }, { vx: 0, vy: 0 }).impact).toBe('hard');
    expect(planFlight(world, { x: 960, y: fallFor(limit * 0.9) }, { vx: 0, vy: 0 }).impact).toBe('soft');
  });

  it('feels the same at every size: the same drop in art px takes the same time', () => {
    const small = makeWorld({ scale: 2, scaleFactor: 1 });
    const artDrop = 100;
    const big = planFlight(world, { x: 960, y: FLOOR - artDrop * A }, { vx: 0, vy: 0 });
    const tiny = planFlight(small, { x: 960, y: FLOOR - artDrop * artPxDipOf(small) }, { vx: 0, vy: 0 });
    expect(tiny.durationMs).toBeCloseTo(big.durationMs, 6);
  });
});

describe('clampFling', () => {
  it('caps the speed along the throw direction and leaves a slow throw alone', () => {
    const max = PHYSICS.flingMaxArtS * A;
    const { vx, vy } = clampFling({ vx: 3 * max, vy: -4 * max }, world);
    expect(Math.hypot(vx, vy)).toBeCloseTo(max, 6);
    expect(vx / vy).toBeCloseTo(-0.75, 9);
    expect(clampFling({ vx: 100, vy: -50 }, world)).toEqual({ vx: 100, vy: -50 });
  });
});

describe('supportOf: still standing after a world change (via surfaceUnder, never segment equality)', () => {
  it('the floor always holds; its y follows the work area', () => {
    const floor: Placement = { surface: { kind: 'floor' }, x: 500, y: 1032 };
    expect(supportOf(makeWorld({ workArea: { width: 1920, height: 1000 } }), floor)).toEqual({ ...floor, y: 1000 });
  });

  it('re-homes onto the fresh segment when an occluder changed the segment ends', () => {
    const front = makeWindow('front', 1100, 550, 300, 300);
    const placement = supportOf(makeWorld({ windows: [front, shelf] }), shelfSpot);
    expect(placement?.surface).toEqual({ kind: 'window_top', id: 'w1', left: 800, right: 1100, y: 600 });
  });

  it('tolerates a 1-DIP shift; a real move, a close, a minimise or the desktop layer → null (fall)', () => {
    expect(supportOf(makeWorld({ windows: [makeWindow('w1', 800, 601, 400, 300)] }), shelfSpot)?.y).toBe(601);
    expect(supportOf(makeWorld({ windows: [makeWindow('w1', 800, 640, 400, 300)] }), shelfSpot)).toBeNull();
    expect(supportOf(makeWorld({ windows: [makeWindow('w1', 1100, 600, 400, 300)] }), shelfSpot)).toBeNull();
    expect(supportOf(world, shelfSpot)).toBeNull();
    expect(supportOf(makeWorld({ windows: [shelf], layer: 'desktop' }), shelfSpot)).toBeNull();
  });
});

const standing = (w: World, overrides: Partial<CoreState> = {}): CoreState =>
  makeCoreState({ world: w, pos: shelfSpot, ...overrides });

describe('checkSupport: window moved / gone under a standing character → fall from rest', () => {
  it('keeps standing (re-homed) while the edge holds', () => {
    const front = makeWindow('front', 1100, 550, 300, 300);
    const { state, effects } = checkSupport(standing(makeWorld({ windows: [front, shelf] })), NOW);
    expect(effects).toEqual([]);
    expect(state.behavior.kind).toBe('idle');
    expect(state.pos.surface).toMatchObject({ right: 1100 });
  });

  it('falls from rest when the window closes: fall shown on a path from the feet, lands on the floor', () => {
    const { state, effects } = checkSupport(standing(world), NOW);
    expect(state.behavior).toMatchObject({ kind: 'fall', since: NOW, until: NOW + dropMs(FLOOR - 600) });
    expect(state.wakeAt).toBe(state.behavior.until);
    expect(state.pos).toEqual({ surface: { kind: 'floor' }, x: 1000, y: FLOOR });
    expect(effects).toEqual([
      {
        type: 'Show',
        anim: 'fall',
        facing: 'front',
        playback: 'fwd',
        motion: {
          kind: 'path',
          segments: [{ durationMs: dropMs(FLOOR - 600), x0: 1000, y0: 600, vx: 0, vy: 0, gravity: G }],
        },
      },
    ]);
  });

  it('a window that moved down catches it again', () => {
    const lower = makeWorld({ windows: [makeWindow('w1', 800, 700, 400, 300)] });
    const { state } = checkSupport(standing(lower), NOW);
    expect(state.behavior.kind).toBe('fall');
    expect(state.pos.surface).toMatchObject({ kind: 'window_top', id: 'w1', y: 700 });
  });

  it('a walker is checked at its live x (the last stride), not at the walk start', () => {
    const start = standing(onShelf, { pos: { ...shelfSpot, x: 820 } });
    const turned = startTravel(start, 1180, NOW).state;
    const walking = advanceTravel(turned, turned.wakeAt ?? NOW).state;
    if (walking.behavior.kind !== 'walk') throw new Error('expected a walk');
    const mid = (walking.behavior.since + walking.behavior.until) / 2;
    const liveX = travelX(walking, mid);
    // An occluder now hides the right part of the edge, where the walker already is.
    const front = makeWindow('front', liveX - 10, 550, 400, 300);
    const moved = { ...walking, world: makeWorld({ windows: [front, shelf] }) };
    const { state } = checkSupport(moved, mid);
    expect(state.behavior.kind).toBe('fall');
    expect(state.behavior.kind === 'fall' && state.behavior.path[0]?.x0).toBe(liveX);
    // The same occluder behind the walker leaves it walking.
    const behind = { ...walking, world: makeWorld({ windows: [makeWindow('front', 700, 550, 130, 300), shelf] }) };
    expect(checkSupport(behind, mid).state.behavior.kind).toBe('walk');
  });

  it('leaves drag and fall to their own handling', () => {
    const dragging = standing(world, { behavior: { kind: 'drag', since: NOW, until: null } });
    expect(checkSupport(dragging, NOW)).toEqual({ state: dragging, effects: [] });
  });
});

describe('startFlight / advanceFlight: fall → land → front idle', () => {
  const released = (from = { x: 600, y: 300 }, v = { vx: 400, vy: -300 }) => startFlight(makeCoreState(), from, v, NOW);

  it('a fling clamps its speed and shows the path', () => {
    const { state, effects } = startFlight(makeCoreState(), { x: 600, y: 300 }, { vx: 1e5, vy: 0 }, NOW);
    expect(state.behavior.kind === 'fall' && Math.abs(state.behavior.path[0]?.vx ?? 0)).toBeCloseTo(
      PHYSICS.flingMaxArtS * A,
      6,
    );
    expect(effects[0]).toMatchObject({ type: 'Show', anim: 'fall', facing: 'front', motion: { kind: 'path' } });
  });

  it('nothing happens before the landing deadline', () => {
    const { state } = released();
    expect(advanceFlight(state, (state.wakeAt ?? NOW) - 1)).toEqual({ state, effects: [] });
  });

  it('a soft landing plays land once, in place, then the front idle', () => {
    const { state: falling } = released({ x: 600, y: 900 }, { vx: 0, vy: 0 });
    const touch = falling.wakeAt ?? NOW;
    const { state: landed, effects } = advanceFlight(falling, touch);
    expect(landed.behavior).toEqual({ kind: 'land', since: touch, until: touch + LAND_MS });
    expect(landed.pos).toEqual({ surface: { kind: 'floor' }, x: 600, y: FLOOR });
    expect(effects).toEqual([
      { type: 'Show', anim: 'land', facing: 'front', playback: 'fwd', motion: { kind: 'still', x: 600, y: FLOOR } },
    ]);
    const { state: idle, effects: after } = advanceFlight(landed, touch + LAND_MS);
    expect(idle.behavior).toEqual({ kind: 'idle', anim: idle.character.idle, since: touch + LAND_MS, until: null });
    expect(idle.wakeAt).toBe(touch + LAND_MS);
    expect(after[0]).toMatchObject({ type: 'Show', anim: idle.character.idle, facing: 'front' });
  });

  it('a hard landing holds longer and sweats', () => {
    const { state: falling } = released({ x: 600, y: TOP }, { vx: 0, vy: 0 });
    const touch = falling.wakeAt ?? NOW;
    const { state, effects } = advanceFlight(falling, touch);
    const until = touch + LAND_MS + HARD_LANDING_HOLD_MS;
    expect(state.behavior).toEqual({ kind: 'land', since: touch, until });
    expect(effects).toContainEqual({ type: 'Fx', mark: 'sweat', untilMs: until });
  });

  it('released on the floor at rest: straight to land, no empty fall', () => {
    const { state } = released({ x: 600, y: FLOOR }, { vx: 0, vy: 0 });
    expect(state.behavior).toMatchObject({ kind: 'land', since: NOW });
  });
});

describe('replanFlight: the world changed mid-flight', () => {
  it('re-plans from the current point and velocity, landing on a window that appeared below', () => {
    const { state: falling } = startFlight(makeCoreState(), { x: 1000, y: 300 }, { vx: 0, vy: 0 }, NOW);
    const at = NOW + 100;
    const here = falling.behavior.kind === 'fall' ? samplePath(falling.behavior.path, 100) : null;
    const { state, effects } = replanFlight({ ...falling, world: onShelf }, at);
    expect(state.behavior).toMatchObject({ kind: 'fall', since: at });
    expect(state.pos.surface).toMatchObject({ kind: 'window_top', id: 'w1' });
    expect(state.behavior.kind === 'fall' && state.behavior.path[0]).toMatchObject({
      x0: here?.x,
      y0: here?.y,
      vy: here?.vy,
    });
    expect(effects[0]).toMatchObject({ type: 'Show', anim: 'fall' });
  });

  it('leaves any other state alone', () => {
    const idle = makeCoreState();
    expect(replanFlight(idle, NOW)).toEqual({ state: idle, effects: [] });
  });
});
