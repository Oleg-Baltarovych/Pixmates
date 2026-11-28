// Stage numbers (SPEC v1.4 §3.3, owner decision D-10). Tuned by the owner by eye; logic never hard-codes them.
import type { BUILTIN_PREFIX, Facing } from '../shared/pack.ts';

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

/**
 * The built-in `turn` (front ↔ q34, ADR 010): 2 frames at 10 fps, played forward before travel and reversed after it.
 * The core times the turn from these (it never sees manifests); a rig test keeps them equal to the authored anim.
 */
export const TURN_PLAY = { frames: 2, fps: 10 } as const;

/**
 * How far (art px) the walking foot pivot stays inside a surface's ends: the walk's feet stand 8 art px apart, so 6
 * keeps both on a window edge. The sprite itself may overhang the end (plan M1-07, ≤ 12).
 */
export const WALK_EDGE_INSET_ART = 6;

/** One step of the dev cycle: play `anim` for `loops` loops (a non-looping anim counts held ticks on its last frame). */
export interface DevCycleStep {
  readonly anim: string;
  readonly loops: number;
  /** Screen direction for a sided (q34) animation; the stage mirrors when it differs from the authored `facing`. */
  readonly face?: Exclude<Facing, 'front'>;
}

/**
 * Dev cycle (`--art-lineup` / `--anim-cycle`, plan MA-33 travel preview), in place: idle, turn, walk right, walk
 * mirrored left, happy. `turn` is 2 frames at 10 fps; 3 counts hold its last frame ≈ 0.2 s more.
 */
export const DEV_ANIM_CYCLE: readonly DevCycleStep[] = [
  { anim: 'idle_a', loops: 3 },
  { anim: 'turn', loops: 3, face: 'right' },
  { anim: 'walk', loops: 2, face: 'right' },
  { anim: 'walk', loops: 2, face: 'left' },
  { anim: 'happy', loops: 1 },
];

/** Animations the M0 core asks for until M1 behaviour (names from the built-in set, ADR 010). */
export type CoreAnimation = 'idle_a' | 'drag' | 'happy' | 'wave';

/** A click picks one of these, uniformly, from the seeded RNG. */
export const CLICK_REACTIONS = ['happy', 'wave'] as const satisfies readonly CoreAnimation[];

/** How long the interim click reaction lasts, ms: two loops of `happy` (6 f at 8 fps), 1.5 of `wave` (8 f at 8 fps). */
export const CLICK_REACTION_MS = 1_500;
