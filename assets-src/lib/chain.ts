// Deterministic verlet chain for secondary motion (plan M-ART MA-06): ribbons, hair locks, apron tails, later tails
// and cloaks. The anchor follows the body per frame; the chain lags behind (follow-through). Only + − × ÷ and sqrt.
// Two loops run as warm-up, then the residual between the end of the recorded loop and its start is spread over
// the loop, so the quantized loop is seamless by construction.

export type Point = readonly [number, number];

export interface ChainSpec {
  /** Points after the anchor. */
  readonly segments: number;
  /** Rest length per segment in px. */
  readonly length: number;
  /** Per-substep acceleration in px (x right, y down), e.g. [0, 0.12]. */
  readonly gravity: Point;
  /** Velocity kept per substep, 0..1 (default 0.9). */
  readonly damping?: number;
  /** Constraint passes per substep (default 6). */
  readonly iterations?: number;
  /** Substeps per frame (default 4). */
  readonly substeps?: number;
  /** Warm-up loops before recording (default 2). */
  readonly warmup?: number;
}

export interface ChainResult {
  /** Per frame: anchor + `segments` points, whole px. */
  readonly frames: readonly (readonly Point[])[];
  /** Largest residual (px) that the seam correction spread over the loop. */
  readonly residual: number;
}

/** Simulates a looping chain whose anchor is at `anchors[f]` in frame f. */
export function simulateChain(anchors: readonly Point[], spec: ChainSpec): ChainResult {
  const n = anchors.length;
  const first = anchors[0];
  if (!first || n < 1) throw new RangeError('chain needs at least one anchor frame');
  if (!Number.isInteger(spec.segments) || spec.segments < 1) throw new RangeError('chain needs ≥ 1 segment');
  const damping = spec.damping ?? 0.9;
  const iterations = spec.iterations ?? 6;
  const substeps = spec.substeps ?? 4;
  const warmup = spec.warmup ?? 2;
  const [gx, gy] = spec.gravity;
  const glen = Math.sqrt(gx * gx + gy * gy) || 1;
  const count = spec.segments + 1;
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    px[i] = first[0] + (gx / glen) * spec.length * i;
    py[i] = first[1] + (gy / glen) * spec.length * i;
  }
  const qx = Float64Array.from(px);
  const qy = Float64Array.from(py);

  const stepFrame = (f: number): void => {
    const from = anchors[(f - 1 + n) % n] ?? first;
    const to = anchors[f % n] ?? first;
    for (let s = 1; s <= substeps; s++) {
      px[0] = from[0] + ((to[0] - from[0]) * s) / substeps;
      py[0] = from[1] + ((to[1] - from[1]) * s) / substeps;
      for (let i = 1; i < count; i++) {
        const x = px[i] ?? 0;
        const y = py[i] ?? 0;
        px[i] = x + (x - (qx[i] ?? 0)) * damping + gx;
        py[i] = y + (y - (qy[i] ?? 0)) * damping + gy;
        qx[i] = x;
        qy[i] = y;
      }
      for (let k = 0; k < iterations; k++) {
        for (let i = 1; i < count; i++) {
          const dx = (px[i] ?? 0) - (px[i - 1] ?? 0);
          const dy = (py[i] ?? 0) - (py[i - 1] ?? 0);
          const d = Math.sqrt(dx * dx + dy * dy) || 1e-9;
          const diff = (d - spec.length) / d;
          // The anchor is pinned: the first link moves only its free end.
          const w = i === 1 ? 1 : 0.5;
          px[i] = (px[i] ?? 0) - dx * diff * w;
          py[i] = (py[i] ?? 0) - dy * diff * w;
          if (i > 1) {
            px[i - 1] = (px[i - 1] ?? 0) + dx * diff * 0.5;
            py[i - 1] = (py[i - 1] ?? 0) + dy * diff * 0.5;
          }
        }
      }
    }
  };

  for (let f = 1; f <= warmup * n; f++) stepFrame(f);
  const recorded: number[][] = [];
  for (let f = 0; f <= n; f++) {
    if (f > 0) stepFrame(f);
    recorded.push([...px, ...py]);
  }
  const start = recorded[0] ?? [];
  const end = recorded[n] ?? [];
  let residual = 0;
  for (let i = 0; i < start.length; i++) residual = Math.max(residual, Math.abs((end[i] ?? 0) - (start[i] ?? 0)));
  const frames = recorded.slice(0, n).map((state, f) =>
    Array.from({ length: count }, (_, i): Point => {
      const fix = (k: number): number => ((end[k] ?? 0) - (start[k] ?? 0)) * (f / n);
      return [Math.round((state[i] ?? 0) - fix(i)), Math.round((state[count + i] ?? 0) - fix(count + i))];
    }),
  );
  return { frames, residual };
}
