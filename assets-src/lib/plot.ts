// Recipe plotting (art-director recipes, docs/art/recipes/): some materials are specified pixel by pixel (exact ramp
// steps per role — lip rows, mullions, seams). A Plot collects such px and becomes an ordinary `Part`, so it goes
// through `compose()` (outline, emissive) like any shape. Shades are whole ramp indices (master.json).
import type { RampName } from './buffer.ts';
import type { Material, Part } from './passes.ts';
import type { Fragment } from './shapes.ts';

export interface PlotPx {
  readonly ramp: RampName;
  readonly shade: number;
  /** Depth toward the viewer (only matters if occlusion runs), default 0. */
  readonly depth?: number;
}

const KEY = 4096;

/** Sparse px map; later writes replace earlier ones. Negative coordinates are ignored. */
export class Plot {
  readonly px = new Map<number, PlotPx>();

  set(x: number, y: number, ramp: RampName, shade: number, depth?: number): void {
    if (x < 0 || y < 0 || x >= KEY) return;
    this.px.set(y * KEY + x, depth === undefined ? { ramp, shade } : { ramp, shade, depth });
  }

  get(x: number, y: number): PlotPx | undefined {
    return x < 0 || y < 0 || x >= KEY ? undefined : this.px.get(y * KEY + x);
  }

  has(x: number, y: number): boolean {
    return this.get(x, y) !== undefined;
  }

  delete(x: number, y: number): void {
    if (x >= 0 && y >= 0 && x < KEY) this.px.delete(y * KEY + x);
  }

  /** All px as fragments (u = v = 0), in key order (row-major) so output never depends on write order. */
  fragments(): Fragment[] {
    return [...this.px.keys()]
      .sort((a, b) => a - b)
      .map((k) => ({ x: k % KEY, y: Math.floor(k / KEY), normal: [0, 0, 127] as const, u: 0, v: 0 }));
  }

  /** The plot as a `Part` with material id `id`; `emissive` (same coordinates) becomes its night mask. */
  part(id: number, partId: number, emissive?: Plot): Part {
    const fragments = this.fragments();
    const xs = fragments.map((f) => f.x);
    const ys = fragments.map((f) => f.y);
    const x = xs.length > 0 ? Math.min(...xs) : 0;
    const y = ys.length > 0 ? Math.min(...ys) : 0;
    const w = xs.length > 0 ? Math.max(...xs) - x + 1 : 0;
    const h = ys.length > 0 ? Math.max(...ys) - y + 1 : 0;
    const material: Material = {
      id,
      base: (f) => this.get(f.x, f.y) ?? null,
      ...(emissive
        ? {
            emissive: (f) => {
              const e = emissive.get(f.x, f.y);
              return e ? { ramp: e.ramp, shade: e.shade } : null;
            },
          }
        : {}),
    };
    return { shape: { fragments, x, y, w, h }, material, partId };
  }
}
