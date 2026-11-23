// Alpha hit-test for click-through (SPEC §3.1, rules/render.md). Pure: unit-tested without Pixi.

import type { AlphaMask } from '../../shared/placeholder-art.ts';

/** Alpha below this counts as transparent (anti-click on faint pixels; placeholder art is 0 or 255). */
export const OPAQUE_ALPHA = 128;

/** The current frame's rectangle inside the mask (an atlas), in art pixels. */
export interface FrameRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Like `isOpaqueAt`, for a sprite showing frame `rect` of an atlas mask (M-ART: one atlas per character).
 * Pixels outside the frame never count, even if the atlas has art there.
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
  const ax = rect.x + fx;
  const ay = rect.y + fy;
  if (ax < 0 || ay < 0 || ax >= mask.width || ay >= mask.height) return false;
  return (mask.alpha[ay * mask.width + ax] ?? 0) >= OPAQUE_ALPHA;
}

/**
 * Is the point (DIP, stage coordinates) over an opaque art pixel of a sprite whose top-left is at
 * (spriteX, spriteY) DIP and whose art pixels are `pixelDip` DIP wide?
 */
export function isOpaqueAt(
  mask: AlphaMask,
  spriteX: number,
  spriteY: number,
  pixelDip: number,
  pointX: number,
  pointY: number,
): boolean {
  if (!(pixelDip > 0)) return false;
  const ax = Math.floor((pointX - spriteX) / pixelDip);
  const ay = Math.floor((pointY - spriteY) / pixelDip);
  if (ax < 0 || ay < 0 || ax >= mask.width || ay >= mask.height) return false;
  return (mask.alpha[ay * mask.width + ax] ?? 0) >= OPAQUE_ALPHA;
}
