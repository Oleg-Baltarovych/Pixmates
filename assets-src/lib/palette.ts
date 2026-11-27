// Master palette for `pnpm sprites` (assets-src/palettes/master.json, art bible). Generators address colors
// as (ramp, index); OKLab-nearest is only for external RGB sources (.aseprite / .px), plan §0.

export interface Palette {
  /** Ramp names in file order. */
  readonly rampNames: readonly string[];
  /** Ramp → colors dark → light as 0xRRGGBB. */
  readonly ramps: ReadonlyMap<string, readonly number[]>;
  /** Every palette color (0xRRGGBB) → its first (ramp, index). */
  readonly colors: ReadonlyMap<number, { readonly ramp: string; readonly index: number }>;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Validates and loads a parsed palette file (`{ ramps: { name: ["#rrggbb", …] } }`). */
export function loadPalette(json: unknown): Palette {
  const rampsJson = typeof json === 'object' && json !== null ? (json as { ramps?: unknown }).ramps : undefined;
  if (typeof rampsJson !== 'object' || rampsJson === null) throw new Error('palette: missing "ramps" object');
  const ramps = new Map<string, number[]>();
  const colors = new Map<number, { ramp: string; index: number }>();
  for (const [name, list] of Object.entries(rampsJson)) {
    if (!Array.isArray(list) || list.length === 0) throw new Error(`palette: ramp "${name}" is not a color list`);
    const values = list.map((hex: unknown, index) => {
      if (typeof hex !== 'string' || !HEX.test(hex)) {
        throw new Error(`palette: ramp "${name}"[${String(index)}] = ${JSON.stringify(hex)} is not #rrggbb`);
      }
      const rgb = Number.parseInt(hex.slice(1), 16);
      if (!colors.has(rgb)) colors.set(rgb, { ramp: name, index });
      return rgb;
    });
    ramps.set(name, values);
  }
  return { rampNames: [...ramps.keys()], ramps, colors };
}

/** OKLab (Björn Ottosson) of a 0xRRGGBB color. */
export function toOklab(rgb: number): readonly [number, number, number] {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((rgb >> 16) & 0xff);
  const g = lin((rgb >> 8) & 0xff);
  const b = lin(rgb & 0xff);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Palette color (0xRRGGBB) nearest to `rgb` in OKLab; ties go to the earlier color in file order. */
export function nearestColor(palette: Palette, rgb: number): number {
  if (palette.colors.has(rgb)) return rgb;
  const [l, a, b] = toOklab(rgb);
  let best = -1;
  let bestDist = Infinity;
  for (const color of palette.colors.keys()) {
    const [l2, a2, b2] = toOklab(color);
    const dist = (l - l2) ** 2 + (a - a2) ** 2 + (b - b2) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  }
  return best;
}
