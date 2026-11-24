// Stage numbers (SPEC v1.4 §3.3, owner decision D-10). Tuned by the owner by eye; logic never hard-codes them.
import { builtinPackId } from '../shared/pack.ts';

/** Height of the placeholder frame in art pixels; real packs bring their own `frameSize` in the manifest. */
export const FRAME_HEIGHT_PX = 32;

/**
 * Size presets as target on-screen height in DIP (M ≈ 3 cm on a 15.6" 1080p laptop at 125 %). ADR 011: L 200 so the
 * adult `scaleRef` 66 gives S ×2 / M ×3 / L ×4 at 1080p / 125 % (legacy `scaleRef` 48 stays ×3 / ×4 / ×5).
 */
export const SIZE_PRESETS_DIP = { s: 96, m: 136, l: 200 } as const;
export type SizePreset = keyof typeof SIZE_PRESETS_DIP;
export const DEFAULT_SIZE_PRESET: SizePreset = 'm';

/** The character never grows taller than this share of the work-area height (ADR 011: 0.30 keeps adult L at ×4). */
export const MAX_HEIGHT_FRACTION = 0.3;

/** Smallest integer physical scale: one art pixel is at least 2×2 device pixels. */
export const MIN_SCALE = 2;

/** Pointer travel (DIP) below which a press-release is a click, not a drag. */
export const CLICK_SLOP_DIP = 4;

/** Stage ticker cap while dragging; otherwise the ticker is stopped and frames render on demand. */
export const DRAG_FPS = 60;

/** The character shown when none is chosen (M-ART: `maid`; until phase 2 builds it, the placeholder stays). */
export const DEFAULT_CHARACTER = builtinPackId('maid');

/**
 * M1 travel speed per rig layout, matched to the q34 `walk` so the planted foot never skates: the stance foot slides
 * back `pxPerFrame` native px per frame at `fps`, so the sprite moves `pxPerSecond` native px/s (× the integer sprite
 * scale on screen). Legacy 48 × 56 (art round MA-27c-1): 2 px × 10 fps; adult 56 × 72 (MA-45, 16-px stride over 4
 * stance frames): 4 px × 10 fps.
 */
export const WALK_TRAVEL = {
  legacy: { pxPerFrame: 2, fps: 10, pxPerSecond: 20 },
  adult: { pxPerFrame: 4, fps: 10, pxPerSecond: 40 },
} as const;
