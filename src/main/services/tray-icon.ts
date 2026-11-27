// Tray icon source (MA-30, replaces the M0 placeholder blob): a square crop of the active character's first idle
// frame, taken from the top of the standing figure (the head reads at 16 DIP). Pure: tray.ts does the image work.
import { resolveAnim } from '../../shared/anim.ts';
import type { Manifest } from '../../shared/pack.ts';

/** Icon side in art px; shown at scale factor 2 = 16 DIP, the Windows small-icon size. */
export const TRAY_ICON_PX = 32;

export interface IconRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Atlas rectangle of the icon: frame 0 of the idle animation, figure top (`frameSize.h − scaleRef`), centred. */
export function trayIconRect(manifest: Manifest): IconRect {
  const name = resolveAnim('idle_a', manifest) ?? 'idle_a';
  const origin = manifest.animations[name]?.origin ?? { x: 0, y: 0 };
  const { w, h } = manifest.frameSize;
  const side = Math.min(TRAY_ICON_PX, w, h);
  const figureTop = h - Math.min(manifest.scaleRef ?? h, h);
  const top = Math.min(figureTop, h - side);
  return { x: origin.x + Math.floor((w - side) / 2), y: origin.y + top, width: side, height: side };
}
