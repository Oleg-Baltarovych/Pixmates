// Post-composite polish passes (plan M-ART MA-02, SPEC §5.2 «Якість»): manual AA on outline steps, a rim light on
// the side away from the light (holds the sprite on dark wallpapers); the crisp-style posterize went with the cel
// preset (MA-22). They run after `compose` + `outline`, on the whole composite, so part seams never show. Ramp indices only.
import type { IndexBuffer, RampName } from './buffer.ts';
import type { OutlineMap, RampSize } from './passes.ts';

const N4 = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
] as const;

const filled = (buf: IndexBuffer, x: number, y: number): boolean =>
  buf.inBounds(x, y) && (buf.ramp[y * buf.width + x] ?? -1) >= 0;

const rampAt = (buf: IndexBuffer, i: number): RampName | null => buf.get(i % buf.width, Math.floor(i / buf.width)).ramp;

/**
 * Manual anti-aliasing: an outer-outline px on a staircase corner (two orthogonal empty neighbours, two filled) takes
 * the ramp-mid tone between the outline and the fill it came from, which softens the step without blur or alpha.
 * Fill px in an inner corner (outline on two orthogonal sides) drop half-way toward the outline.
 */
export function antiAlias(buf: IndexBuffer, map: OutlineMap): void {
  const { width, height } = buf;
  const snapshot = Float32Array.from(buf.shade);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if ((buf.ramp[i] ?? -1) < 0) continue;
      const kind = map.kind[i] ?? 0;
      const empties = N4.map(([dx, dy]) => !filled(buf, x + dx, y + dy));
      const corner = (empties[0] === true || empties[2] === true) && (empties[1] === true || empties[3] === true);
      const count = empties.filter(Boolean).length;
      if (kind === 1 && corner && count === 2) {
        buf.shade[i] = Math.round(((snapshot[i] ?? 0) + (map.source[i] ?? 0)) / 2);
      } else if (kind === 0) {
        const outlined = N4.map(([dx, dy]) => {
          const qx = x + dx;
          const qy = y + dy;
          return buf.inBounds(qx, qy) && (map.kind[qy * width + qx] ?? 0) === 1;
        });
        const inner = (outlined[0] === true || outlined[2] === true) && (outlined[1] === true || outlined[3] === true);
        if (inner) buf.shade[i] = Math.max(0, Math.round((snapshot[i] ?? 0) - 0.5));
      }
    }
  }
}

export interface RimOptions {
  /** Shade steps added to the inner edge on the shadow side (default 1). */
  readonly strength?: number;
  /** Also lift the bottom-facing edge (default false: feet and hems stay grounded). */
  readonly bottom?: boolean;
}

/** Rim light: the fill px just inside a right-facing (away from the top-left light) outline gets brighter. */
export function rimLight(buf: IndexBuffer, map: OutlineMap, rampSize: RampSize, options: RimOptions = {}): void {
  const strength = options.strength ?? 1;
  if (strength === 0) return;
  const { width } = buf;
  const lifted = new Set<number>();
  for (let i = 0; i < map.kind.length; i++) {
    if ((map.kind[i] ?? 0) !== 1) continue;
    const ox = map.ox[i] ?? 0;
    const oy = map.oy[i] ?? 0;
    if (ox <= 0 && !(options.bottom === true && oy > 0)) continue;
    if (ox <= 0 && oy <= 0) continue;
    const x = (i % width) - ox;
    const y = Math.floor(i / width) - (ox > 0 ? 0 : oy);
    if (!buf.inBounds(x, y)) continue;
    const j = y * width + x;
    if ((map.kind[j] ?? 0) !== 0 || (buf.ramp[j] ?? -1) < 0 || lifted.has(j)) continue;
    const ramp = rampAt(buf, j);
    if (ramp === null || ramp === 'ink') continue;
    lifted.add(j);
    buf.shade[j] = Math.min(rampSize(ramp) - 1, (buf.shade[j] ?? 0) + strength);
  }
}
