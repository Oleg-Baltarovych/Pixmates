// Cursor numbers (SPEC §4.3, plan M1 Content). M1-10 adds the startle speed, near radius and petting thresholds.

/**
 * Pointer samples the core keeps (`CoreState.cursor.trail`, oldest dropped first): 2 s at the 30 Hz near-sampling
 * rate (rules/main.md), enough for one petting window (M1-10 checks it against `PET_WINDOW_MS`).
 */
export const CURSOR_TRAIL = { samples: 60 } as const;
