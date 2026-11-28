// How the stage moves the sprite between core decisions (plan M1 Design, SPEC §3.2 `stage:frame-state`). Plain data,
// zod-free: core emits it in `Show`, the stage renderer samples it. The samplers arrive with M1-07 (walk) and
// M1-08 (path); both ends then share them so they agree on every point. Units: overlay DIP, ms, DIP/s, DIP/s².

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
