// Shape primitives for generators (plan ART-02, ADR 004): each returns the covered px with a surface normal and
// local surface coordinates, so a material can texture along the surface and the light pass can shade the form.
// Coverage samples px centres. Only + − × ÷ and Math.sqrt (correctly rounded) feed the output — no sin/cos/pow.
import type { Normal } from './buffer.ts';

/** One covered px. `u`, `v`: surface coordinates, meaning documented per primitive. */
export interface Fragment {
  readonly x: number;
  readonly y: number;
  readonly normal: Normal;
  readonly u: number;
  readonly v: number;
  /** Primitive-specific integer (e.g. tuft id for grass), if any. */
  readonly tag?: number;
}

/** Covered px plus the bounding box (whole px) they were generated in. */
export interface Shape {
  readonly fragments: readonly Fragment[];
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const FLAT: Normal = [0, 0, 127];

/** Integer normal of length ≈ 127 pointing along (x, y, z); x right, y down, z toward the viewer. */
export function unitNormal(x: number, y: number, z: number): Normal {
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len === 0) return FLAT;
  const c = (v: number): number => Math.max(-127, Math.min(127, Math.round((v / len) * 127)));
  return [c(x), c(y), c(z)];
}

const shape = (fragments: Fragment[], x: number, y: number, w: number, h: number): Shape => ({
  fragments,
  x,
  y,
  w,
  h,
});

/** Axis-aligned rectangle. `u`, `v` = px from the top-left corner. */
export function rect(x: number, y: number, w: number, h: number, normal: Normal = FLAT): Shape {
  const out: Fragment[] = [];
  for (let py = y; py < y + h; py++)
    for (let px = x; px < x + w; px++) out.push({ x: px, y: py, normal, u: px - x, v: py - y });
  return shape(out, x, y, w, h);
}

/** Polygon (even-odd, px centres). `u`, `v` = px from the bounding box's top-left. */
export function poly(points: readonly (readonly [number, number])[], normal: Normal = FLAT): Shape {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs));
  const y0 = Math.floor(Math.min(...ys));
  const x1 = Math.ceil(Math.max(...xs));
  const y1 = Math.ceil(Math.max(...ys));
  const out: Fragment[] = [];
  for (let py = y0; py < y1; py++) {
    const cy = py + 0.5;
    const cross: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i] ?? [0, 0];
      const b = points[(i + 1) % points.length] ?? [0, 0];
      if (a[1] <= cy === b[1] <= cy) continue;
      cross.push(a[0] + ((cy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    cross.sort((p, q) => p - q);
    for (let k = 0; k + 1 < cross.length; k += 2) {
      const from = Math.ceil((cross[k] ?? 0) - 0.5) + 0; // + 0: no -0 coordinates
      const to = Math.ceil((cross[k + 1] ?? 0) - 0.5);
      for (let px = from; px < to; px++) out.push({ x: px, y: py, normal, u: px - x0, v: py - y0 });
    }
  }
  return shape(out, x0, y0, x1 - x0, y1 - y0);
}

/**
 * Ellipse centred on (cx, cy) with radii rx, ry. `bulge` 0 = flat disc, 1 = hemisphere normals.
 * `u`, `v` = −1..1 across the ellipse.
 */
export function ellipse(cx: number, cy: number, rx: number, ry: number, bulge = 1): Shape {
  const out: Fragment[] = [];
  const x0 = Math.floor(cx - rx);
  const y0 = Math.floor(cy - ry);
  const x1 = Math.ceil(cx + rx);
  const y1 = Math.ceil(cy + ry);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const u = (px + 0.5 - cx) / rx;
      const v = (py + 0.5 - cy) / ry;
      const d = u * u + v * v;
      if (d > 1) continue;
      const z = Math.sqrt(1 - d);
      out.push({ x: px, y: py, normal: unitNormal(u * bulge, v * bulge, z * bulge + (1 - bulge)), u, v });
    }
  }
  return shape(out, x0, y0, x1 - x0, y1 - y0);
}

// ── character primitives (new in Pixmates, plan M-ART MA-02) ───────────────────────────────────────────────────

/** A stroke control point: centre x, y and radius (px). */
export type StrokePoint = readonly [number, number, number];

/**
 * Tapered stroke through `points` (a chain of capsules): round normals across it, so the light pass models limbs,
 * horns, tails and locks of hair. `u` = px along the stroke from its start, `v` = −1..1 across (left → right of the
 * direction of travel). Only + − × ÷ and sqrt.
 */
export function stroke(points: readonly StrokePoint[]): Shape {
  const out: Fragment[] = [];
  if (points.length === 0) return shape(out, 0, 0, 0, 0);
  const x0 = Math.floor(Math.min(...points.map(([x, , r]) => x - r)));
  const y0 = Math.floor(Math.min(...points.map(([, y, r]) => y - r)));
  const x1 = Math.ceil(Math.max(...points.map(([x, , r]) => x + r)));
  const y1 = Math.ceil(Math.max(...points.map(([, y, r]) => y + r)));
  const segments =
    points.length === 1 ? [[points[0], points[0]] as const] : points.slice(1).map((b, i) => [points[i], b] as const);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      let best: { q: number; nx: number; ny: number; u: number; v: number } | null = null;
      let along = 0;
      for (const [a, b] of segments) {
        if (!a || !b) continue;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len2 = dx * dx + dy * dy;
        const len = Math.sqrt(len2);
        const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((cx - a[0]) * dx + (cy - a[1]) * dy) / len2));
        const ox = cx - (a[0] + dx * t);
        const oy = cy - (a[1] + dy * t);
        const r = a[2] + (b[2] - a[2]) * t;
        const q = r > 0 ? (ox * ox + oy * oy) / (r * r) : 2;
        if (q <= 1 && (best === null || q < best.q)) {
          const side = dx * oy - dy * ox >= 0 ? 1 : -1;
          best = { q, nx: ox / r, ny: oy / r, u: along + len * t, v: side * Math.sqrt(q) };
        }
        along += len;
      }
      if (best)
        out.push({ x: px, y: py, normal: unitNormal(best.nx, best.ny, Math.sqrt(1 - best.q)), u: best.u, v: best.v });
    }
  }
  return shape(out, x0, y0, x1 - x0, y1 - y0);
}

/** Bends a flat shape into a vertical cylinder around `cx` (half-width `half`): normals turn left/right, so skirts
 * and bodices get form shading from the light pass instead of a flat fill. */
export function curveX(s: Shape, cx: number, half: number, bulge = 0.85): Shape {
  const fragments = s.fragments.map((f) => {
    const nx = Math.min(1, Math.max(-1, (f.x + 0.5 - cx) / half)) * bulge;
    return { ...f, normal: unitNormal(nx, 0, Math.sqrt(1 - nx * nx)) };
  });
  return { ...s, fragments };
}

/** Moves every fragment by whole px (keeps normals and u/v). */
export function translate(s: Shape, dx: number, dy: number): Shape {
  return {
    ...s,
    x: s.x + dx,
    y: s.y + dy,
    fragments: s.fragments.map((f) => ({ ...f, x: f.x + dx, y: f.y + dy })),
  };
}
