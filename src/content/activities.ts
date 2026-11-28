// Idle activities (SPEC §4.3, plan M1 Design → Activities): the M1 shared set from existing animations and the
// picker's numbers. Data only; `core/activities.ts` reads them. Owner of the numbers: persona-designer (+ the owner by
// eye at M1-33); per-character weights come with M1-15 (`characters/<id>/activities.ts`). Starting values below.
import type { ActivityDef } from '../core/types.ts';

export const ACTIVITY_PICK = {
  /**
   * Weight multipliers for the most recent picks, newest first: the last activity counts ¼, the one before ½, then ¾;
   * older ones count fully. Keeps the character from repeating itself without forbidding a repeat.
   */
  recentPenalty: [0.25, 0.5, 0.75],
  /** When nothing may start (every candidate cooling down or out of place), hold the base idle this long, ms. */
  fallbackIdleMs: 4_000,
} as const;

/**
 * M1 shared set (SPEC §4.3): stand, fidget, stroll to a random reachable x, sit on the edge (window tops only: on
 * the floor the legs would hang under the work area), think, wave. Weights keep every activity under 30 % of picks
 * and of idle time (`tests/unit/core/activities.test.ts`, 10 k picks).
 */
export const SHARED_ACTIVITIES = [
  {
    id: 'stand',
    does: { kind: 'idle', durationMs: { min: 3_000, max: 6_000 } },
    weight: 2.5,
    where: ['floor', 'window_top'],
    cooldownMs: 0,
  },
  {
    id: 'fidget',
    does: { kind: 'play', anim: 'idle_b', durationMs: { min: 3_000, max: 6_000 } },
    weight: 2,
    where: ['floor', 'window_top'],
    cooldownMs: 0,
  },
  {
    // 24–160 art px = 1.2–8 s of walking at WALK_TRAVEL (20 art px/s).
    id: 'stroll',
    does: { kind: 'stroll', distanceArt: { min: 24, max: 160 } },
    weight: 2.5,
    where: ['floor', 'window_top'],
    cooldownMs: 0,
  },
  {
    id: 'sit',
    does: { kind: 'sit', durationMs: { min: 8_000, max: 16_000 } },
    weight: 2,
    where: ['window_top'],
    cooldownMs: 30_000,
  },
  {
    id: 'think',
    does: { kind: 'play', anim: 'think', durationMs: { min: 3_000, max: 6_000 } },
    weight: 2,
    where: ['floor', 'window_top'],
    cooldownMs: 10_000,
  },
  {
    // Two loops of `wave` (8 frames at 8 fps). A cheerful gesture: not in a low mood.
    id: 'wave',
    does: { kind: 'play', anim: 'wave', durationMs: { min: 2_000, max: 2_000 } },
    weight: 1,
    where: ['floor', 'window_top'],
    moods: ['mid', 'high'],
    cooldownMs: 60_000,
  },
] as const satisfies readonly ActivityDef[];
