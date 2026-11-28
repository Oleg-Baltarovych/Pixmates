// How the stage moves the sprite between core decisions (plan M1 Design, SPEC §3.2 `stage:frame-state`). Plain data,
// zod-free: core emits it in `Show`, the stage renderer samples it. Core and stage share the samplers (walk M1-07,
// path M1-08) so they agree on every point. Units: overlay DIP, ms, DIP/s, DIP/s².

/** Screen direction of travel; left is the runtime mirror of the right-facing q34 art (ADR 010). */
export type Direction = 'left' | 'right';

/** One ballistic piece of a flight between bounces: p(t) = p0 + v·t + ½·g·t² (y down), for `durationMs`. */
export interface PathSegment {
  readonly durationMs: number;
  readonly x0: number;
  readonly y0: number;
  readonly vx: number;
  readonly vy: number;
  readonly gravity: number;
}

export type Motion =
  | { readonly kind: 'still'; readonly x: number; readonly y: number }
  /** Stride-locked walk along a surface at `y`: one `stepDip` per walk frame, `steps` frames (ADR 010). */
  | {
      readonly kind: 'walk';
      readonly x0: number;
      readonly y: number;
      readonly dir: Direction;
      readonly steps: number;
      readonly stepDip: number;
    }
  | { readonly kind: 'path'; readonly segments: readonly PathSegment[] };

export type WalkMotion = Extract<Motion, { readonly kind: 'walk' }>;

/** +1 for screen-right travel, −1 for screen-left. */
export const dirSign = (dir: Direction): 1 | -1 => (dir === 'right' ? 1 : -1);

/**
 * Frames this close to a whole count are that count. `elapsedMs` is a difference of two `now` stamps, so a boundary
 * `since + k·1000/fps` comes back a few ulps short (≤ ~2e-6 frames even at epoch-scale `now`) and a bare floor would
 * drop that frame's stride; 1e-4 frames (≤ 10 µs) is far above that error and far below any timer resolution.
 */
const FRAME_EPSILON = 1e-4;

/**
 * Whole strides taken `elapsedMs` after a walk started at `fps` walk frames per second: one per finished frame,
 * clamped to `[0, steps]`. The sprite moves only on these steps, never by interpolation, so the planted foot of the
 * q34 walk stays put on screen (ADR 010).
 */
export function walkStepsAt(steps: number, elapsedMs: number, fps: number): number {
  const frames = (elapsedMs * fps) / 1000;
  const nearest = Math.round(frames);
  const whole = Math.abs(frames - nearest) < FRAME_EPSILON ? nearest : Math.floor(frames);
  return Math.min(steps, Math.max(0, whole));
}

/** Foot pivot x of `motion` after `elapsedMs` (overlay DIP). */
export const walkX = (motion: WalkMotion, elapsedMs: number, fps: number): number =>
  motion.x0 + dirSign(motion.dir) * walkStepsAt(motion.steps, elapsedMs, fps) * motion.stepDip;
