// Ramp-index pixel buffer (plan §0, ADR 004). Generators write a per-px record — ramp + shade (+ alpha,
// material, normal, partId, depth for the lighting/outline passes of ART-02+) — and `quantize` turns it into
// RGBA by picking ramp colors (+ Bayer 4×4 on fractional shades), so every opaque px is a palette color by
// construction.
import type { RgbaImage } from '../../tools/lib/png.ts';
import type { Palette } from './palette.ts';

export type RampName = keyof (typeof import('../palettes/master.json'))['ramps'];

/** Unit-ish surface normal, each component −127..127 (x right, y down, z toward the viewer). */
export type Normal = readonly [number, number, number];

/** What a generator writes into one px. Omitted fields take the defaults below. */
export interface PixelInput {
  readonly ramp: RampName;
  /** 0 = darkest color of the ramp; fractions dither toward the next color; clamped to the ramp. */
  readonly shade: number;
  /** 0..1, default 1. Anything but 0 or 1 is legal only in soft-alpha atlases (`fx`). */
  readonly alpha?: number;
  /** Material id 0..255 (generator-defined: thatch, plank, plaster…), default 0. */
  readonly material?: number;
  /** Default `[0, 0, 127]` (facing the viewer). */
  readonly normal?: Normal;
  /** Part id 0..65535 (roof, wall, door… for outlines and masks), default 0. */
  readonly partId?: number;
  /** Depth toward the viewer in px (finite), default 0. */
  readonly depth?: number;
}

/** A px as read back: `ramp: null` = transparent (other fields are then the defaults). */
export interface Pixel {
  readonly ramp: RampName | null;
  readonly shade: number;
  readonly alpha: number;
  readonly material: number;
  readonly normal: Normal;
  readonly partId: number;
  readonly depth: number;
}

export const PIXEL_DEFAULTS = {
  alpha: 1,
  material: 0,
  normal: [0, 0, 127] as Normal,
  partId: 0,
  depth: 0,
} as const;

export interface IndexBuffer {
  readonly width: number;
  readonly height: number;
  /** True when (x, y) is a whole-px coordinate inside the buffer. */
  inBounds(x: number, y: number): boolean;
  /** Writes px (x, y); throws outside the buffer or on an invalid field. */
  set(x: number, y: number, px: PixelInput): void;
  /** Reads px (x, y); throws outside the buffer (check `inBounds` first in neighbour passes). */
  get(x: number, y: number): Pixel;
  /** Makes px (x, y) transparent and resets every field to its default. */
  clear(x: number, y: number): void;
  /** Ramp id per px (index into `palette.rampNames`), −1 = transparent. */
  readonly ramp: Int16Array;
  readonly shade: Float32Array;
  readonly alpha: Float32Array;
  readonly material: Uint8Array;
  /** 3 components per px. */
  readonly normal: Int8Array;
  readonly partId: Uint16Array;
  readonly depth: Float32Array;
}

const isIntIn = (v: number, lo: number, hi: number): boolean => Number.isInteger(v) && v >= lo && v <= hi;

export function createIndexBuffer(width: number, height: number, palette: Palette): IndexBuffer {
  const n = width * height;
  const ramp = new Int16Array(n);
  const shade = new Float32Array(n);
  const alpha = new Float32Array(n);
  const material = new Uint8Array(n);
  const normal = new Int8Array(n * 3);
  const partId = new Uint16Array(n);
  const depth = new Float32Array(n);
  const rampIds = new Map(palette.rampNames.map((name, id) => [name, id]));

  const inBounds = (x: number, y: number): boolean =>
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < width && y < height;
  const index = (x: number, y: number): number => {
    if (!inBounds(x, y)) {
      throw new RangeError(`px (${String(x)}, ${String(y)}) is outside ${String(width)}×${String(height)}`);
    }
    return y * width + x;
  };
  const reset = (i: number): void => {
    ramp[i] = -1;
    shade[i] = 0;
    alpha[i] = 0;
    material[i] = PIXEL_DEFAULTS.material;
    normal.set(PIXEL_DEFAULTS.normal, i * 3);
    partId[i] = PIXEL_DEFAULTS.partId;
    depth[i] = PIXEL_DEFAULTS.depth;
  };
  for (let i = 0; i < n; i++) reset(i);

  return {
    width,
    height,
    ramp,
    shade,
    alpha,
    material,
    normal,
    partId,
    depth,
    inBounds,
    set(x, y, px) {
      const at = `at (${String(x)}, ${String(y)})`;
      const id = rampIds.get(px.ramp);
      if (id === undefined) throw new Error(`unknown ramp "${px.ramp}" ${at}`);
      const a = px.alpha ?? PIXEL_DEFAULTS.alpha;
      const m = px.material ?? PIXEL_DEFAULTS.material;
      const nrm = px.normal ?? PIXEL_DEFAULTS.normal;
      const part = px.partId ?? PIXEL_DEFAULTS.partId;
      const d = px.depth ?? PIXEL_DEFAULTS.depth;
      if (!Number.isFinite(px.shade)) throw new RangeError(`shade ${String(px.shade)} is not finite ${at}`);
      if (!(a >= 0 && a <= 1)) throw new RangeError(`alpha ${String(a)} is outside 0..1 ${at}`);
      if (!isIntIn(m, 0, 255)) throw new RangeError(`material ${String(m)} is not an integer 0..255 ${at}`);
      if (!nrm.every((c) => isIntIn(c, -127, 127))) {
        throw new RangeError(`normal [${nrm.join(', ')}] needs integers −127..127 ${at}`);
      }
      if (!isIntIn(part, 0, 65535)) throw new RangeError(`partId ${String(part)} is not an integer 0..65535 ${at}`);
      if (!Number.isFinite(d)) throw new RangeError(`depth ${String(d)} is not finite ${at}`);
      const i = index(x, y);
      ramp[i] = id;
      shade[i] = px.shade;
      alpha[i] = a;
      material[i] = m;
      normal.set(nrm, i * 3);
      partId[i] = part;
      depth[i] = d;
    },
    get(x, y) {
      const i = index(x, y);
      const id = ramp[i] ?? -1;
      return {
        ramp: id < 0 ? null : ((palette.rampNames[id] ?? null) as RampName | null),
        shade: shade[i] ?? 0,
        alpha: alpha[i] ?? 0,
        material: material[i] ?? 0,
        normal: [normal[i * 3] ?? 0, normal[i * 3 + 1] ?? 0, normal[i * 3 + 2] ?? 0],
        partId: partId[i] ?? 0,
        depth: depth[i] ?? 0,
      };
    },
    clear(x, y) {
      reset(index(x, y));
    },
  };
}

/** Bayer 4×4 thresholds (0..15). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** Ramp-index buffer → RGBA. Transparent px are written as 0,0,0,0 so output bytes are canonical. */
export function quantize(buffer: IndexBuffer, palette: Palette): RgbaImage {
  const { width, height } = buffer;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const id = buffer.ramp[i] ?? -1;
      const a = Math.round((buffer.alpha[i] ?? 0) * 255);
      if (id < 0 || a === 0) continue;
      const colors = palette.ramps.get(palette.rampNames[id] ?? '') ?? [];
      const top = colors.length - 1;
      const s = Math.min(top, Math.max(0, buffer.shade[i] ?? 0));
      const base = Math.floor(s);
      const threshold = ((BAYER4[(y & 3) * 4 + (x & 3)] ?? 0) + 0.5) / 16;
      const rgb = colors[Math.min(top, base + (s - base > threshold ? 1 : 0))] ?? 0;
      data.set([(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, a], i * 4);
    }
  }
  return { width, height, data };
}
