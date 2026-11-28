// Behaviour numbers (SPEC §4, plan M1 Content). Data only; the core reads them, never hard-codes them.
// M1-05…M1-13 add durations, the sleep threshold and the switch numbers here.
import type { CursorReaction, Interrupt, MoodState, QuietHours, ReactionKey } from '../core/types.ts';

/**
 * SPEC §4.1 priority table, the rows M1 builds (plan M1 Design → Priorities). Higher interrupts lower; drag beats
 * everything, a fling's own fall and landing included (`core/behavior/priorities.ts`).
 */
export const PRIORITY = {
  drag: 100,
  hidden: 95,
  switch: 92,
  menu: 60,
  cursor: 55,
  sleep: 40,
  activity: 10,
} as const satisfies Record<Interrupt, number>;

/**
 * How long a queued reaction stays worth playing (`core/behavior/throttle.ts` `dequeue`). 3 s ≈ a menu glance or a
 * switch transition: a poke that waited longer no longer reads as an answer to what the user just did.
 */
export const PENDING_MAX_AGE_MS = 3_000;

/**
 * Cursor reactions are user-initiated and silent (animation + FX, no line), so they cool down in seconds, not the
 * 30-min reaction default (SPEC §4.1, D-27 / plan F4). Counted from the last fire (`core/behavior/throttle.ts`).
 * M1-10 adds the gesture thresholds here. Startle is the longest: being made to jump reads as spam soonest.
 */
export const CURSOR_REACTIONS = {
  startle: { cooldownMs: 10_000 },
  petted: { cooldownMs: 6_000 },
  poked: { cooldownMs: 1_500 },
} as const satisfies Record<CursorReaction, { readonly cooldownMs: number }>;

/** Per-reaction cooldowns the throttle reads; M3/M4 reactions join with the 30-min default (SPEC §4.1). */
export const REACTION_COOLDOWN_MS = {
  startle: CURSOR_REACTIONS.startle.cooldownMs,
  petted: CURSOR_REACTIONS.petted.cooldownMs,
  poked: CURSOR_REACTIONS.poked.cooldownMs,
} as const satisfies Record<ReactionKey, number>;

/**
 * Global anti-spam (SPEC §4.1): at most one unsolicited line per `lineGapMs`; quiet hours default to none (the user
 * sets them in M5 settings, SPEC §9).
 */
export const THROTTLE: { readonly lineGapMs: number; readonly quietHours: QuietHours | null } = {
  lineGapMs: 10 * 60_000,
  quietHours: null,
};

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
