// Stage numbers (SPEC v1.4 §3.3, owner decision D-10). Tuned by the owner by eye; logic never hard-codes them.
import type { BUILTIN_PREFIX } from '../shared/pack.ts';

/**
 * Size presets as target on-screen height in DIP (M ≈ 3 cm on a 15.6" 1080p laptop at 125 %). ADR 012: with
 * `scaleRef` 48, S ×3 / M ×4 / L ×5 at 1080p / 125 % and ×2 / ×3 / ×4 at 100 %.
 */
export const SIZE_PRESETS_DIP = { s: 96, m: 136, l: 176 } as const;
export type SizePreset = keyof typeof SIZE_PRESETS_DIP;
export const DEFAULT_SIZE_PRESET: SizePreset = 'm';

/** The character never grows taller than this share of the work-area height (ADR 012). */
export const MAX_HEIGHT_FRACTION = 0.25;

/** Smallest integer physical scale: one art pixel is at least 2×2 device pixels. */
export const MIN_SCALE = 2;

/** Pointer travel (DIP) below which a press-release is a click, not a drag. */
export const CLICK_SLOP_DIP = 4;

/** Stage ticker cap while dragging; otherwise the ticker is stopped and frames render on demand. */
export const DRAG_FPS = 60;

/** Stage placement in DIP: first spot from the overlay's right edge, gap between lineup actors, label above the head. */
export const STAGE_LAYOUT_DIP = { rightMargin: 64, lineupGap: 40, labelGap: 8 } as const;

/** The character shown when none is chosen (`--character=pixmates.<id>` picks another, MA-30). */
export const DEFAULT_CHARACTER = 'pixmates.maid' satisfies `${typeof BUILTIN_PREFIX}${string}`;

/**
 * M1 travel speed, matched to the q34 `walk` so the planted foot never skates (art round MA-27c-1, ADR 010): the stance
 * foot slides back `pxPerFrame` native px per frame at `fps`, so the sprite moves `pxPerSecond` native px/s (× the
 * integer sprite scale on screen).
 */
export const WALK_TRAVEL = { pxPerFrame: 2, fps: 10, pxPerSecond: 20 } as const;

/** Animations the M0 core asks for until M1 behaviour (names from the built-in set, ADR 010). */
export type CoreAnimation = 'idle_a' | 'drag' | 'happy' | 'wave';

/** A click picks one of these, uniformly, from the seeded RNG. */
export const CLICK_REACTIONS = ['happy', 'wave'] as const satisfies readonly CoreAnimation[];
