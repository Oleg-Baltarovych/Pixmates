// Stage numbers (SPEC v1.4 §3.3, owner decision D-10). Tuned by the owner by eye; logic never hard-codes them.
import { builtinPackId } from '../shared/pack.ts';

/** Height of the placeholder frame in art pixels; real packs bring their own `frameSize` in the manifest. */
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

/** The character shown when none is chosen (M-ART: `maid`; until phase 2 builds it, the placeholder stays). */
export const DEFAULT_CHARACTER = builtinPackId('maid');
