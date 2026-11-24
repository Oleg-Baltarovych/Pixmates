// Style spike animations (same timing for every figure): idle_a contrapposto breath (front + q34), idle_b attitude,
// walk q34 (left = runtime mirror), happy (adult: small hop + arm pump), startle (face-read test).
import type { Arms, Frame, View } from './figure.ts';

export interface SpikeAnim {
  readonly name: string;
  readonly fps: number;
  readonly frames: readonly Frame[];
}

const base: Frame = {
  view: 'front',
  bob: 0,
  breath: 0,
  hip: 1,
  tilt: 1,
  expr: 'neutral',
  arms: 'rest',
  swing: 0,
  feet: [
    [0, 0],
    [0, 0],
  ],
  sway: 0,
  beat: 0,
};

const BREATH = [0, 0, -1, -1, -1, 0, 0, 0] as const;
const SWAY = [0, 0, 0, 1, 1, 1, 0, 0] as const;

function idle(view: View, arms: Arms, beats: readonly number[]): Frame[] {
  return BREATH.map((b, i) => ({
    ...base,
    view,
    arms,
    breath: b,
    sway: SWAY[i] ?? 0,
    beat: beats[i] ?? 0,
    expr: i === 6 ? 'blink' : 'neutral',
  }));
}

// q34 walk, 8 frames @ 10 fps: contact → down → passing → up per step; feet dx from the stance, lift on passing.
const WALK_FEET: readonly (readonly [readonly [number, number], readonly [number, number]])[] = [
  [
    [-3, 0],
    [3, 0],
  ],
  [
    [-2, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [2, 0],
    [-1, 1],
  ],
  [
    [3, 0],
    [-3, 0],
  ],
  [
    [2, 0],
    [-2, 0],
  ],
  [
    [0, 1],
    [0, 0],
  ],
  [
    [-1, 1],
    [2, 0],
  ],
];
const WALK_BOB = [0, 1, 0, -1, 0, 1, 0, -1] as const;
const WALK_SWING = [-2, -1, 0, 1, 2, 1, 0, -1] as const;

export const SPIKE_ANIMS: readonly SpikeAnim[] = [
  { name: 'idle_a', fps: 6, frames: idle('front', 'rest', []) },
  { name: 'idle_a_q34', fps: 6, frames: idle('q34', 'rest', []) },
  { name: 'idle_b', fps: 6, frames: idle('front', 'attitude', [0, 0, 1, 1, 1, 0, 0, 0]) },
  {
    name: 'walk',
    fps: 10,
    frames: WALK_FEET.map((feet, i) => ({
      ...base,
      view: 'q34',
      hip: 0,
      tilt: 0,
      arms: 'walk',
      feet,
      bob: WALK_BOB[i] ?? 0,
      swing: WALK_SWING[i] ?? 0,
      sway: -(WALK_SWING[i] ?? 0) > 0 ? 1 : 0,
    })),
  },
  {
    name: 'happy',
    fps: 8,
    frames: [
      { ...base, expr: 'happy' },
      { ...base, expr: 'happy', bob: 1, arms: 'pump', beat: 2 },
      { ...base, expr: 'happy', bob: -2, hip: 0, tilt: 0, arms: 'pump', beat: -1 },
      { ...base, expr: 'happy', bob: -2, hip: 0, tilt: 0, arms: 'pump', beat: 0, sway: 1 },
      { ...base, expr: 'happy', bob: 1, arms: 'pump', beat: 1 },
      { ...base, expr: 'happy' },
    ],
  },
  {
    name: 'startle',
    fps: 8,
    frames: [
      { ...base },
      { ...base, expr: 'startle', bob: -1, hip: 0, tilt: 0, arms: 'startle' },
      { ...base, expr: 'startle', hip: 0, tilt: 0, arms: 'startle', sway: 1 },
      { ...base, expr: 'startle', hip: 0, tilt: 0, arms: 'startle' },
    ],
  },
];
