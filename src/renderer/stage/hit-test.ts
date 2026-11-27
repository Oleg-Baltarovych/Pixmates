// Alpha hit-test for click-through (SPEC §3.1, rules/render.md). Pure: unit-tested without Pixi.

/** One alpha byte per art pixel, row-major (the atlas alpha the stage reads once per pack). */
export interface AlphaMask {
  readonly width: number;
  readonly height: number;
  readonly alpha: Uint8Array;
}

/** Alpha below this counts as transparent (anti-click on faint pixels; built-in art is binary 0 / 255). */
export const OPAQUE_ALPHA = 128;

/** The current frame's rectangle inside the mask (an atlas), in art pixels. */
export interface FrameRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Drawn mirrored (left-facing travel): screen column x shows art column w − 1 − x. */
  readonly mirrored?: boolean;
}

/**
 * Is the point (DIP, stage coordinates) over an opaque art pixel of a sprite whose top-left is at (spriteX, spriteY)
 * DIP, whose art pixels are `pixelDip` DIP wide, and which shows frame `rect` of an atlas mask (one atlas per
 * character)? Pixels outside the frame never count, even if the atlas has art there.
 */
export function isOpaqueInFrame(
  mask: AlphaMask,
  rect: FrameRect,
  spriteX: number,
  spriteY: number,
  pixelDip: number,
  pointX: number,
  pointY: number,
): boolean {
  if (!(pixelDip > 0)) return false;
  const fx = Math.floor((pointX - spriteX) / pixelDip);
  const fy = Math.floor((pointY - spriteY) / pixelDip);
  if (fx < 0 || fy < 0 || fx >= rect.w || fy >= rect.h) return false;
  const ax = rect.x + (rect.mirrored === true ? rect.w - 1 - fx : fx);
  const ay = rect.y + fy;
  if (ax < 0 || ay < 0 || ax >= mask.width || ay >= mask.height) return false;
  return (mask.alpha[ay * mask.width + ax] ?? 0) >= OPAQUE_ALPHA;
}
