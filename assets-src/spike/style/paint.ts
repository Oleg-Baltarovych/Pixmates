// Style spike (adult proportions, owner request 2026-11-24; prototype only, never built into resources/). A tiny
// tone painter: every px is (ramp, tone) from the master palette, painted back to front; authored masks are locked.
// Kept apart from the rig (assets-src/rig/) on purpose: the production rig's tables and checks stay untouched, so
// the production packs stay byte-identical. Integer math only (art determinism rule).
import type { RgbaImage } from '../../../tools/lib/png.ts';
import type { RampName } from '../../lib/buffer.ts';
import type { Palette } from '../../lib/palette.ts';

export type Pt = readonly [number, number];
export type Ink = readonly [RampName, number];

interface Px {
  readonly ramp: RampName;
  readonly tone: number;
  /** Authored px (head masks, small props): the contour pass leaves them alone. */
  readonly lock: boolean;
  /** Dark material (base tone ≤ 1): contour = ink on the shadow side, a 2-step rim on the lit side. */
  readonly dark: boolean;
}

export class Paint {
  readonly w: number;
  readonly h: number;
  private readonly px: (Px | undefined)[];
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Array<Px | undefined>(w * h).fill(undefined);
  }

  has(x: number, y: number): boolean {
    return this.at(x, y) !== undefined;
  }

  at(x: number, y: number): Px | undefined {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    return this.px[y * this.w + x];
  }

  set(x: number, y: number, [ramp, tone]: Ink, lock = false): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = { ramp, tone, lock, dark: !lock && tone <= 1 };
  }

  clear(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = undefined;
  }

  /** Recolour an already painted px (keeps its lock). */
  tint(x: number, y: number, ink: Ink): void {
    const p = this.at(x, y);
    if (p) this.set(x, y, ink, p.lock);
  }

  rect(x: number, y: number, w: number, h: number, ink: Ink): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, ink);
  }

  /** Horizontal span from x0 to x1 inclusive (any order). */
  span(x0: number, x1: number, y: number, ink: Ink): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, ink);
  }

  /** Filled polygon (even-odd scanline at px centres). `shade(x, y)` may pick the ink per px. */
  poly(points: readonly Pt[], ink: Ink | ((x: number, y: number) => Ink)): void {
    const ys = points.map((p) => p[1]);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    for (let y = y0; y <= y1; y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (!a || !b) continue;
        const cy = y * 2 + 1;
        const ay = a[1] * 2 + 1;
        const by = b[1] * 2 + 1;
        if (ay === by) continue;
        if ((cy >= ay && cy < by) || (cy >= by && cy < ay)) {
          xs.push(a[0] + ((cy - ay) * (b[0] - a[0])) / (by - ay));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const l = xs[i] ?? 0;
        const r = xs[i + 1] ?? 0;
        for (let x = Math.round(l); x <= Math.round(r); x++) {
          this.set(x, y, typeof ink === 'function' ? ink(x, y) : ink);
        }
      }
      // Degenerate rows (horizontal edges only) still paint their spans.
      if (xs.length === 0) {
        for (let i = 0; i < points.length; i++) {
          const a = points[i];
          const b = points[(i + 1) % points.length];
          if (a && b && a[1] === y && b[1] === y) {
            for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) {
              this.set(x, y, typeof ink === 'function' ? ink(x, y) : ink);
            }
          }
        }
      }
    }
  }

  /** Thick line (Bresenham, square brush of `width`). */
  line(a: Pt, b: Pt, width: number, ink: Ink, lock = false): void {
    let [x0, y0] = a;
    const [x1, y1] = b;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const off = Math.floor((width - 1) / 2);
    for (;;) {
      for (let yy = y0 - off; yy < y0 - off + width; yy++) {
        for (let xx = x0 - off; xx < x0 - off + width; xx++) this.set(xx, yy, ink, lock);
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Stamp an authored mask (top-left at x, y; optional horizontal flip). '.' = skip; unknown letters throw. */
  stamp(mask: readonly string[], legend: Readonly<Record<string, Ink>>, x: number, y: number, flip = false): void {
    mask.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[flip ? row.length - 1 - rx : rx] ?? '.';
        if (ch === '.') continue;
        const ink = legend[ch];
        if (!ink) throw new Error(`style spike: no ink for '${ch}'`);
        this.set(x + rx, y + ry, ink, true);
      }
    });
  }

  /**
   * Contour on the silhouette (inside px with an empty 4-neighbour): lit side (empty px to the left or above only)
   * 2 tone steps darker, else 3; dark materials get ink 0 on the shadow side and a 2-step rim on the lit side.
   */
  contour(sizeOf: (ramp: RampName) => number): void {
    const out: { x: number; y: number; ink: Ink }[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const p = this.at(x, y);
        if (!p || p.lock) continue;
        const litEmpty = !this.has(x - 1, y) || !this.has(x, y - 1);
        const shadowEmpty = !this.has(x + 1, y) || !this.has(x, y + 1);
        if (!litEmpty && !shadowEmpty) continue;
        const lit = litEmpty && !shadowEmpty;
        if (p.dark) {
          out.push({ x, y, ink: lit ? [p.ramp, Math.min(sizeOf(p.ramp) - 1, p.tone + 2)] : ['ink', 0] });
        } else {
          out.push({ x, y, ink: [p.ramp, Math.max(0, p.tone - (lit ? 2 : 3))] });
        }
      }
    }
    for (const o of out) this.set(o.x, o.y, o.ink);
  }

  toImage(palette: Palette): RgbaImage {
    const data = new Uint8Array(this.w * this.h * 4);
    this.px.forEach((p, i) => {
      if (!p) return;
      const ramp = palette.ramps.get(p.ramp);
      const rgb = ramp?.[Math.max(0, Math.min(ramp.length - 1, p.tone))];
      if (rgb === undefined) throw new Error(`style spike: bad tone ${p.ramp}/${String(p.tone)}`);
      data.set([(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255, 255], i * 4);
    });
    return { width: this.w, height: this.h, data };
  }

  /** Mirror (q34 facing left = runtime mirror, ADR 010). */
  static mirror(img: RgbaImage): RgbaImage {
    const data = new Uint8Array(img.data.length);
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const s = (y * img.width + x) * 4;
        const d = (y * img.width + (img.width - 1 - x)) * 4;
        data.set(img.data.subarray(s, s + 4), d);
      }
    }
    return { width: img.width, height: img.height, data };
  }
}
