// Generator passes in ADR 004 order (plan ART-02): paint → light (normal · L, sun top-left) → material texture →
// occlusion (AO + cast shadow) → dither (Bayer 4×4) → colored outline → selective outline → quantize (buffer.ts,
// run by `pnpm sprites`). Everything works on ramp indices, so colors stay in the palette by construction.
// Determinism: only + − × ÷ / sqrt; light deltas are rounded to 1/256 (types.ts).
import type { IndexBuffer, Normal, Pixel, PixelInput, RampName } from './buffer.ts';
import { q8 } from './noise.ts';
import type { Fragment, Shape } from './shapes.ts';

export type RampSize = (ramp: RampName) => number;

/** Sun direction toward the light (x right, y down, z toward the viewer): top-left, fairly low. */
export const SUN: readonly [number, number, number] = (() => {
  const [x, y, z] = [-1, -1, 0.8];
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len] as const;
})();

/** Bayer 4×4 thresholds (0..15), same matrix as `quantize`. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;
const bayer = (x: number, y: number): number => ((BAYER4[(y & 3) * 4 + (x & 3)] ?? 0) + 0.5) / 16;

const opaque = (buf: IndexBuffer, i: number): boolean => (buf.ramp[i] ?? -1) >= 0 && (buf.alpha[i] ?? 0) > 0;
const rampOf = (buf: IndexBuffer, x: number, y: number): RampName => buf.get(x, y).ramp ?? 'ink';

// ── light ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface LightOptions {
  /** Shade steps between a face toward the viewer and a face at 90° to the sun (default 3). */
  readonly strength?: number;
  /** Toward the light, unit length (default `SUN`). */
  readonly dir?: readonly [number, number, number];
}

/**
 * Directional Lambert: `shade += strength · (max(0, n·L) − L.z)`. A face toward the viewer keeps its base shade,
 * faces turned to the sun gain, faces turned away lose — never a centre-bright "pillow".
 */
export function light(buf: IndexBuffer, options: LightOptions = {}): void {
  const strength = options.strength ?? 3;
  const [lx, ly, lz] = options.dir ?? SUN;
  for (let i = 0; i < buf.width * buf.height; i++) {
    if (!opaque(buf, i)) continue;
    const nx = (buf.normal[i * 3] ?? 0) / 127;
    const ny = (buf.normal[i * 3 + 1] ?? 0) / 127;
    const nz = (buf.normal[i * 3 + 2] ?? 0) / 127;
    const dot = Math.max(0, nx * lx + ny * ly + nz * lz);
    buf.shade[i] = (buf.shade[i] ?? 0) + q8(strength * (dot - lz));
  }
}

// ── occlusion ────────────────────────────────────────────────────────────────────────────────────────────────

export interface OcclusionOptions {
  /** AO neighbourhood radius in px (0 = off). */
  readonly radius: number;
  /** Shade steps removed when every neighbour is ≥ 2 px in front (inner corners get the most). */
  readonly strength: number;
  /** Cast shadow: march `length` px toward the sun; a px in front by more than the ray height shades this one. */
  readonly cast?: { readonly length: number; readonly strength: number; readonly rise?: number };
}

/** AO from the depth field (nearer neighbours occlude) plus a crisp cast shadow down-right of protrusions. */
export function occlusion(buf: IndexBuffer, options: OcclusionOptions): void {
  const { width, height } = buf;
  const depth = Float32Array.from(buf.depth);
  const solid = Uint8Array.from({ length: width * height }, (_, i) => (opaque(buf, i) ? 1 : 0));
  const r = options.radius;
  const area = (2 * r + 1) * (2 * r + 1) - 1;
  const cast = options.cast;
  // Ray rise per px of horizontal travel toward the sun (diagonal step = √2 px).
  const rise = cast?.rise ?? (SUN[2] / Math.sqrt(SUN[0] * SUN[0] + SUN[1] * SUN[1])) * Math.SQRT2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (solid[i] === 0) continue;
      const d = depth[i] ?? 0;
      let delta = 0;
      if (r > 0 && options.strength !== 0) {
        let occ = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const qx = x + dx;
            const qy = y + dy;
            if ((dx === 0 && dy === 0) || qx < 0 || qy < 0 || qx >= width || qy >= height) continue;
            const q = qy * width + qx;
            if (solid[q] === 0) continue;
            occ += Math.min(2, Math.max(0, (depth[q] ?? 0) - d)) / 2;
          }
        }
        delta -= options.strength * (occ / area);
      }
      if (cast && cast.strength !== 0) {
        for (let k = 1; k <= cast.length; k++) {
          const qx = x - k;
          const qy = y - k;
          if (qx < 0 || qy < 0) break;
          const q = qy * width + qx;
          if (solid[q] === 1 && (depth[q] ?? 0) - d >= k * rise - 1e-6 && (depth[q] ?? 0) - d > 0) {
            delta -= cast.strength;
            break;
          }
        }
      }
      if (delta !== 0) buf.shade[i] = (buf.shade[i] ?? 0) + q8(delta);
    }
  }
}

// ── dither ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface DitherOptions {
  /** 1 = full Bayer across the whole step; smaller = dither only fractions near ½, round the rest (default 1). */
  readonly spread?: number;
  /** Ramps that are always rounded, never dithered (e.g. hair: strands read as clean clumps). */
  readonly round?: readonly RampName[];
}

/** Fractional shades → whole ramp indices (Bayer 4×4 on the transition), clamped to each ramp. */
export function dither(buf: IndexBuffer, rampSize: RampSize, options: DitherOptions = {}): void {
  const round = new Set(options.round ?? []);
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      const i = y * buf.width + x;
      if ((buf.ramp[i] ?? -1) < 0) continue;
      const ramp = rampOf(buf, x, y);
      const spread = round.has(ramp) ? 0 : (options.spread ?? 1);
      const top = rampSize(ramp) - 1;
      const s = Math.min(top, Math.max(0, buf.shade[i] ?? 0));
      const base = Math.floor(s);
      const threshold = 0.5 + (bayer(x, y) - 0.5) * spread;
      buf.shade[i] = Math.min(top, base + (s - base > threshold ? 1 : 0));
    }
  }
}

// ── outline ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface OutlineOptions {
  /** `outer`: transparent px around the silhouette become outline; `inner`: the silhouette px themselves. */
  readonly mode?: 'outer' | 'inner';
  /** Steps below the neighbour's shade (default 2). */
  readonly drop?: number;
  /** `transparent` (default): the buffer border counts as empty; `opaque`: as filled (tiles, swatches). */
  readonly edges?: 'transparent' | 'opaque';
  /** Also draw 1-step internal lines where the material changes, on the px that sits behind. */
  readonly internal?: boolean;
  /** Only px of these part ids get or source an outline (default: all). */
  readonly parts?: readonly number[];
}

/** Which px the outline pass wrote, so the selective pass can lift the lit side. */
export interface OutlineMap {
  /** 0 none, 1 outer silhouette, 2 inner silhouette, 3 internal line. */
  readonly kind: Uint8Array;
  /** Outward direction of the silhouette at the px (sum of unit steps toward empty space). */
  readonly ox: Int8Array;
  readonly oy: Int8Array;
  /** Shade of the neighbour the outline was taken from. */
  readonly source: Float32Array;
}

const N4 = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
] as const;

/** The outline never switches ramp; in `ink` it stops at ink 1 — `ink[0]` is never chosen automatically. */
const floorOf = (ramp: RampName): number => (ramp === 'ink' ? 1 : 0);

/** Colored outline: the neighbour's own ramp, `drop` steps darker (ART-BIBLE §3), never black. */
export function outline(buf: IndexBuffer, rampSize: RampSize, options: OutlineOptions = {}): OutlineMap {
  const { width, height } = buf;
  const mode = options.mode ?? 'outer';
  const drop = options.drop ?? 2;
  const edgesOpaque = options.edges === 'opaque';
  const parts = options.parts ? new Set(options.parts) : null;
  const n = width * height;
  const map: OutlineMap = {
    kind: new Uint8Array(n),
    ox: new Int8Array(n),
    oy: new Int8Array(n),
    source: new Float32Array(n),
  };
  const snap = Array.from({ length: n }, (_, i) => buf.get(i % width, Math.floor(i / width)));
  const eligible = (p: Pixel): boolean => p.ramp !== null && (parts === null || parts.has(p.partId));
  const at = (x: number, y: number): Pixel | 'edge' =>
    x < 0 || y < 0 || x >= width || y >= height ? 'edge' : (snap[y * width + x] ?? snap[0] ?? buf.get(0, 0));
  const empty = (p: Pixel | 'edge'): boolean => (p === 'edge' ? !edgesOpaque : p.ramp === null);
  const write = (x: number, y: number, src: Pixel, shade: number, kind: number, ox: number, oy: number): void => {
    const ramp = src.ramp ?? 'ink';
    const top = rampSize(ramp) - 1;
    const value = Math.min(top, Math.max(floorOf(ramp), Math.round(shade)));
    buf.set(x, y, {
      ramp,
      shade: value,
      material: src.material,
      partId: src.partId,
      depth: src.depth,
      normal: src.normal,
    });
    const i = y * width + x;
    map.kind[i] = kind;
    map.ox[i] = Math.sign(ox);
    map.oy[i] = Math.sign(oy);
    map.source[i] = src.shade;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const self = at(x, y);
      if (self === 'edge') continue;
      if (mode === 'outer' && self.ramp === null) {
        let src: Pixel | null = null;
        let ox = 0;
        let oy = 0;
        for (const [dx, dy] of N4) {
          const q = at(x + dx, y + dy);
          if (q === 'edge' || !eligible(q)) continue;
          ox -= dx;
          oy -= dy;
          if (src === null || q.depth > src.depth) src = q;
        }
        if (src) write(x, y, src, src.shade - drop, 1, ox, oy);
        continue;
      }
      if (!eligible(self)) continue;
      if (mode === 'inner') {
        let ox = 0;
        let oy = 0;
        for (const [dx, dy] of N4) {
          if (!empty(at(x + dx, y + dy))) continue;
          ox += dx;
          oy += dy;
        }
        const touches = N4.some(([dx, dy]) => empty(at(x + dx, y + dy)));
        if (touches) {
          const inward = at(x - Math.sign(ox), y - Math.sign(oy));
          const ref = inward !== 'edge' && inward.ramp !== null ? Math.min(self.shade, inward.shade) : self.shade;
          write(x, y, self, ref - drop, 2, ox, oy);
          continue;
        }
      }
      if (options.internal) {
        for (const [dx, dy] of N4) {
          const q = at(x + dx, y + dy);
          if (q === 'edge' || q.ramp === null || q.material === self.material || q.depth <= self.depth) continue;
          write(x, y, self, self.shade - 1, 3, dx, dy);
          break;
        }
      }
    }
  }
  return map;
}

export interface SelectiveOptions {
  /** Lit-side (top-left) silhouette: `lighter` = one step less dark, `vanish` = no outline there. */
  readonly lit?: 'lighter' | 'vanish';
}

/** Selective outline (ART-BIBLE §3): on the side facing the sun the outline lightens or disappears. */
export function selectiveOutline(buf: IndexBuffer, map: OutlineMap, options: SelectiveOptions = {}): void {
  const lit = options.lit ?? 'lighter';
  for (let i = 0; i < map.kind.length; i++) {
    const kind = map.kind[i] ?? 0;
    if (kind !== 1 && kind !== 2) continue;
    const facing = -((map.ox[i] ?? 0) + (map.oy[i] ?? 0)); // > 0: outward toward the top-left
    if (facing < 0) continue;
    const x = i % buf.width;
    const y = Math.floor(i / buf.width);
    const source = Math.round(map.source[i] ?? 0);
    const lighter = Math.min(source, (buf.shade[i] ?? 0) + 1);
    if (facing > 0 && lit === 'vanish') {
      if (kind === 1) buf.clear(x, y);
      else buf.shade[i] = source;
    } else if (facing > 0 || lit === 'vanish') {
      // Lit side one step lighter; with `vanish`, the neutral (top-right / bottom-left) corners lighten too.
      buf.shade[i] = lighter;
    }
  }
}

// ── compose ──────────────────────────────────────────────────────────────────────────────────────────────────

/** What a material writes for one fragment before lighting (`depth` is relief added to the part's depth). */
export interface MaterialPx {
  readonly ramp: RampName;
  readonly shade: number;
  readonly normal?: Normal;
  readonly depth?: number;
}

/** A material paints, textures and (optionally) lights up its fragments. */
export interface Material {
  /** Stored in the buffer's `material` field (0..255). */
  readonly id: number;
  /** Base px for a fragment; `null` leaves the px untouched (ragged edges, holes). */
  readonly base: (f: Fragment, shape: Shape) => MaterialPx | null;
  /** After light: shade delta for an owned px (reads the lit shade, e.g. streaks only on the sunny side). */
  readonly texture?: (f: Fragment, px: Pixel, shape: Shape) => number;
  /** Night mask px for an owned px (windows, fire), or null. */
  readonly emissive?: (f: Fragment, px: Pixel, shape: Shape) => PixelInput | null;
}

export interface Part {
  readonly shape: Shape;
  readonly material: Material;
  readonly partId?: number;
  /** Base depth toward the viewer (px). */
  readonly depth?: number;
}

export interface ComposeOptions {
  readonly light?: LightOptions | false;
  readonly occlusion?: OcclusionOptions | false;
  readonly dither?: DitherOptions;
  /** Off unless given. */
  readonly outline?: OutlineOptions;
  /** Default `{ lit: 'lighter' }` when `outline` is on; `false` = plain outline. */
  readonly selective?: SelectiveOptions | false;
  /** Emissive companion layer (`params.layers.emissive`). */
  readonly emissive?: IndexBuffer;
}

export const DEFAULT_OCCLUSION: OcclusionOptions = { radius: 1, strength: 0.8, cast: { length: 3, strength: 1 } };

/** Paints `parts` in order (later parts cover earlier ones) and runs every pass in ADR 004 order. */
export function compose(
  buf: IndexBuffer,
  parts: readonly Part[],
  rampSize: RampSize,
  options: ComposeOptions = {},
): void {
  const owner = new Int16Array(buf.width * buf.height).fill(-1);
  parts.forEach((part, index) => {
    for (const f of part.shape.fragments) {
      if (!buf.inBounds(f.x, f.y)) continue;
      const px = part.material.base(f, part.shape);
      if (!px) continue;
      buf.set(f.x, f.y, {
        ramp: px.ramp,
        shade: px.shade,
        normal: px.normal ?? f.normal,
        material: part.material.id,
        partId: part.partId ?? 0,
        depth: (part.depth ?? 0) + (px.depth ?? 0),
      });
      owner[f.y * buf.width + f.x] = index;
    }
  });
  const owned = (index: number, visit: (f: Fragment, i: number, part: Part) => void): void => {
    const part = parts[index];
    if (!part) return;
    for (const f of part.shape.fragments) {
      if (!buf.inBounds(f.x, f.y)) continue;
      const i = f.y * buf.width + f.x;
      if (owner[i] === index) visit(f, i, part);
    }
  };

  if (options.light !== false) light(buf, options.light ?? {});
  parts.forEach((part, index) => {
    const { texture, emissive } = part.material;
    if (texture) {
      owned(index, (f, i) => {
        buf.shade[i] = (buf.shade[i] ?? 0) + q8(texture(f, buf.get(f.x, f.y), part.shape));
      });
    }
    const layer = options.emissive;
    if (emissive && layer) {
      owned(index, (f) => {
        const e = emissive(f, buf.get(f.x, f.y), part.shape);
        if (e) layer.set(f.x, f.y, e);
      });
    }
  });
  if (options.occlusion !== false) occlusion(buf, options.occlusion ?? DEFAULT_OCCLUSION);
  dither(buf, rampSize, options.dither ?? {});
  if (options.outline) {
    const map = outline(buf, rampSize, options.outline);
    if (options.selective !== false) selectiveOutline(buf, map, options.selective ?? { lit: 'lighter' });
  }
}
