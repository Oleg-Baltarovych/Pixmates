// Alpha hit-test for click-through (SPEC §3.1, rules/render.md). Pure: unit-tested without Pixi.

import type { AlphaMask } from '../../shared/placeholder-art.ts';

/** Alpha below this counts as transparent (anti-click on faint pixels; placeholder art is 0 or 255). */
export const OPAQUE_ALPHA = 128;

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
