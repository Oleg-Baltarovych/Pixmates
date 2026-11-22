// Stage numbers (SPEC v1.4 §3.3, owner decision D-10). Tuned by the owner by eye; logic never hard-codes them.
/** Height of one character frame in art pixels. The placeholder is 32; the real rig frame (M-ART) is 48 or 64. */
export const FRAME_HEIGHT_PX = 32;

/** Size presets as target on-screen height in DIP (M ≈ 3 cm on a 15.6" 1080p laptop at 125 %). */
export const SIZE_PRESETS_DIP = { s: 96, m: 136, l: 176 } as const;
export type SizePreset = keyof typeof SIZE_PRESETS_DIP;
export const DEFAULT_SIZE_PRESET: SizePreset = 'm';

/** The character never grows taller than this share of the work-area height. */
export const MAX_HEIGHT_FRACTION = 0.25;

/** Smallest integer physical scale: one art pixel is at least 2×2 device pixels. */
export const MIN_SCALE = 2;

/** Pointer travel (DIP) below which a press-release is a click, not a drag. */
export const CLICK_SLOP_DIP = 4;

/** Stage ticker cap while dragging; otherwise the ticker is stopped and frames render on demand. */
export const DRAG_FPS = 60;
