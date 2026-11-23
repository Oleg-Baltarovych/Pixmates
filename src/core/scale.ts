// Integer pixel scale for the character (SPEC v1.4 §3.3, D-10). Pure: display metrics come in as numbers.
// One art pixel = `scale` × `scale` device pixels, so the sprite stays crisp at 125 % / 150 % Windows scaling.

export interface ScaleInput {
  /** Desired on-screen height in DIP. */
  readonly targetDip: number;
  /** Display scale factor (1, 1.25, 1.5, 2, ...). */
  readonly scaleFactor: number;
  /** Art frame height in pixels (clamps the on-screen height). */
  readonly frameH: number;
  /** Standing-figure height used for sizing (manifest `scaleRef`, ADR 009 headroom); default `frameH`. */
  readonly refH?: number | undefined;
  readonly workAreaHeightDip: number;
  readonly maxFraction: number;
  /** Smallest allowed scale. */
  readonly minScale: number;
}

const positive = (value: number): boolean => Number.isFinite(value) && value > 0;

/** Sizing height: the visible standing figure (`refH`, never taller than the frame), else the frame height. */
const refHeight = (frameH: number, refH: number | undefined): number =>
  refH !== undefined && positive(refH) ? Math.min(refH, frameH) : frameH;

/** Largest scale whose visible-figure height (`refH`, ADR 009; the frame box may be ~17 % taller because the
 * headroom rows are transparent) stays within `maxFraction` of the work area (never below `minScale`).
 * Broken metrics (NaN, 0, negative scale factor or frame height) give `minScale`. */
export function maxScale({ scaleFactor, frameH, refH, workAreaHeightDip, maxFraction, minScale }: ScaleInput): number {
  if (!positive(scaleFactor) || !positive(frameH)) return minScale;
  // The clamp measures the visible figure (refH): headroom rows are transparent. With the full 56-px frame the
  // L preset would drop to ×4 at 1080p / 125 % (plan MA-21 deviation, reported).
  const ref = refHeight(frameH, refH);
  const limit = Math.floor((maxFraction * workAreaHeightDip * scaleFactor) / ref);
  return Number.isFinite(limit) ? Math.max(minScale, limit) : minScale;
}

/** round(target × scaleFactor / (refH ?? frameH)), at least `minScale`, clamped to `maxScale`. Broken input gives `minScale`. */
export function computeScale(input: ScaleInput): number {
  if (!positive(input.scaleFactor) || !positive(input.frameH)) return input.minScale;
  const ref = refHeight(input.frameH, input.refH);
  const wanted = Math.round((input.targetDip * input.scaleFactor) / ref);
  if (!Number.isFinite(wanted)) return input.minScale;
  return Math.min(Math.max(input.minScale, wanted), maxScale(input));
}

/** Scales for the S/M/L presets, each clamped to [minScale, maxScale] and non-decreasing. On a work area too
 * small for three sizes the presets collapse (e.g. all equal); they never exceed the clamp. */
export function presetScales(
  targets: { readonly s: number; readonly m: number; readonly l: number },
  base: Omit<ScaleInput, 'targetDip'>,
): { readonly s: number; readonly m: number; readonly l: number } {
  const s = computeScale({ ...base, targetDip: targets.s });
  const m = Math.max(computeScale({ ...base, targetDip: targets.m }), s);
  const l = Math.max(computeScale({ ...base, targetDip: targets.l }), m);
  return { s, m, l };
}

/** Fine control («Більше» / «Менше»): ±1 within [minScale, max]; never moves against its direction (a scale
 * already above `max` stays put on «Більше»). */
export function stepScale(current: number, delta: 1 | -1, minScale: number, max: number): number {
  const next = Math.min(Math.max(current + delta, minScale), Math.max(minScale, max));
  return delta > 0 ? Math.max(current, next) : Math.min(current, next);
}
