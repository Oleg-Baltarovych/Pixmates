// Flight path sampler (plan M1-08, SPEC §4.2): the core plans a `path` motion, the stage draws it, both through this
// one function so they agree on every point. Zod-free, pure. Units: overlay DIP, ms, DIP/s, DIP/s² (y down).
import type { PathSegment } from './motion.ts';

/** A point on a flight with its velocity there. */
export interface PathSample {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

const MS_PER_S = 1000;

/** `segment` after `ms`: p(t) = p0 + v·t + ½·g·t². */
function segmentAt(segment: PathSegment, ms: number): PathSample {
  const t = ms / MS_PER_S;
  return {
    x: segment.x0 + segment.vx * t,
    y: segment.y0 + segment.vy * t + (segment.gravity * t * t) / 2,
    vx: segment.vx,
    vy: segment.vy + segment.gravity * t,
  };
}

export const pathDurationMs = (segments: readonly PathSegment[]): number =>
  segments.reduce((sum, segment) => sum + segment.durationMs, 0);

/**
 * The point `elapsedMs` into a flight, clamped to it: its start before 0, its last point (the landing) after the end.
 * Null for an empty path.
 */
export function samplePath(segments: readonly PathSegment[], elapsedMs: number): PathSample | null {
  let rest = Math.max(0, elapsedMs);
  for (const [index, segment] of segments.entries()) {
    if (rest < segment.durationMs || index === segments.length - 1) {
      return segmentAt(segment, Math.min(rest, segment.durationMs));
    }
    rest -= segment.durationMs;
  }
  return null;
}
