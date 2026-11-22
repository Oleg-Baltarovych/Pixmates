// Seeded RNG for the core (ADR 002): mulberry32 over a uint32 state that lives in CoreState.
// Pure: every draw returns the value and the next state; nothing is hidden in module scope.
import type { RngState } from './types.ts';

const UINT32 = 0x1_0000_0000;
const GOLDEN_GAMMA = 0x6d2b79f5;

export function seedRng(seed: number): RngState {
  return Math.trunc(seed) >>> 0;
}

export function nextFloat(state: RngState): { readonly value: number; readonly state: RngState } {
  const next = (state + GOLDEN_GAMMA) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / UINT32, state: next >>> 0 };
}

/** Integer in [0, maxExclusive). An empty or invalid range returns 0 and does not advance the state. */
export function nextInt(state: RngState, maxExclusive: number): { readonly value: number; readonly state: RngState } {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) return { value: 0, state };
  const draw = nextFloat(state);
  return { value: Math.floor(draw.value * maxExclusive), state: draw.state };
}
