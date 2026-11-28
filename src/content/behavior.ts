// Behaviour numbers (SPEC §4, plan M1 Content). Data only; the core reads them, never hard-codes them.
// M1-04…M1-13 add priorities, durations, the sleep threshold and the switch numbers here.
import type { MoodState } from '../core/types.ts';

/** A character with no stored state starts neutral (the drift target, SPEC §4.5) and as a new acquaintance. */
export const NEW_CHARACTER_MOOD = { mood: 50, affinity: 0 } as const satisfies Omit<MoodState, 'updatedAt'>;

/** Range of `mood` and `affinity` (SPEC §4.5). */
export const MOOD_RANGE = { min: 0, max: 100 } as const;

/**
 * Sanity bounds on what main hands the core (rules/core.md: invalid input → unchanged state + `Rejected`). They
 * reject broken data, not unusual data: a fast fling is clamped by physics, not refused here.
 */
export const INPUT_LIMITS = {
  /** |x|, |y| of any point or work-area side, DIP (plan M1 IPC `drag-end` bound). */
  coordDip: 16_384,
  /** Windows per world snapshot (SPEC §4.2, ADR 014). */
  windows: 64,
  /** Smallest window side, DIP (SPEC §4.2: ≥ 1 px). */
  windowMinDip: 1,
  /** Local time offsets run UTC−12:00 … UTC+14:00; the bound is the larger magnitude. */
  tzOffsetMin: 14 * 60,
} as const;
