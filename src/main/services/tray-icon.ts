// Tray icon source (MA-30, replaces the M0 placeholder blob): a square crop of the active character's first idle
// frame, from the figure's top opaque row, so ears and hats stay in (owner review). Pure: tray.ts does the image work.
import { resolveAnim } from '../../shared/anim.ts';
import { isBuiltinPackId } from '../../shared/pack.ts';

/** Icon size in DIP: the Windows small-icon size. */
export const TRAY_ICON_DIP = 16;
/** Smallest crop side in art px (32 px at scale factor 2 = 16 DIP); wider headwear widens the square. */
export const TRAY_ICON_PX = 32;

export interface IconRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The manifest fields the icon needs (a validated `Manifest` fits). */
export interface IconFrames {
  readonly frameSize: { readonly w: number; readonly h: number };
  readonly animations: Readonly<
    Record<string, { readonly origin?: { readonly x: number; readonly y: number } | undefined }>
  >;
  readonly fallbacks: Readonly<Record<string, string>>;
}

/** 4 bytes per px with alpha at byte 3: RGBA and BGRA (`NativeImage.toBitmap`) alike. */
export interface AlphaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

export interface IconCrop {
  readonly rect: IconRect;
  /** `rect.width / TRAY_ICON_DIP`: the crop always shows at 16 DIP. */
  readonly scaleFactor: number;
}

/** Atlas rectangle of frame 0 of the pack's idle animation; undefined when the pack has no idle. */
export function idleFrameRect(manifest: IconFrames): IconRect | undefined {
  const name = resolveAnim('idle_a', manifest);
  const anim = name === undefined ? undefined : manifest.animations[name];
  if (!anim) return undefined;
  const origin = anim.origin ?? { x: 0, y: 0 }; // SPEC §5.1: no origin = the strip starts at the atlas corner
  return { x: origin.x, y: origin.y, width: manifest.frameSize.w, height: manifest.frameSize.h };
}

/** Opaque-px bounds of `rows` (frame-relative) inside the frame, or undefined when none is opaque. */
function opaqueBounds(frame: IconRect, image: AlphaImage, fromRow: number, toRow: number) {
  let top = -1;
  let minX = frame.width;
  let maxX = -1;
  for (let y = fromRow; y < Math.min(toRow, frame.height); y++) {
    const row = (frame.y + y) * image.width + frame.x;
    for (let x = 0; x < frame.width; x++) {
      if ((image.data[(row + x) * 4 + 3] ?? 0) === 0) continue;
      if (top < 0) top = y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }
  return top < 0 ? undefined : { top, minX, maxX };
}

const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max);

/**
 * Square crop of one frame: top = the figure's top opaque row, side = TRAY_ICON_PX or the width of the figure's top
 * TRAY_ICON_PX rows when wider (capped by the frame), centred on those rows and kept inside the frame. Undefined for
 * an empty frame or one outside the image.
 */
export function trayIconCrop(frame: IconRect, image: AlphaImage): IconCrop | undefined {
  const inside = frame.x + frame.width <= image.width && frame.y + frame.height <= image.height;
  if (!inside || image.data.length < image.width * image.height * 4) return undefined;
  const figure = opaqueBounds(frame, image, 0, frame.height);
  if (!figure) return undefined;
  const head = opaqueBounds(frame, image, figure.top, figure.top + TRAY_ICON_PX) ?? figure;
  const side = Math.min(Math.max(TRAY_ICON_PX, head.maxX - head.minX + 1), frame.width, frame.height);
  const x = clamp(Math.round((head.minX + head.maxX + 1 - side) / 2), frame.width - side);
  const y = clamp(figure.top, frame.height - side);
  return { rect: { x: frame.x + x, y: frame.y + y, width: side, height: side }, scaleFactor: side / TRAY_ICON_DIP };
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Why main must not build an icon from this pack's atlas, or undefined when it may: built-ins only until pack
 * import exists, and the decoded image must match the PNG header size the registry validated.
 */
export function trayIconProblem(
  pack: { readonly id: string; readonly atlasSize: Size },
  decoded: Size,
): string | undefined {
  if (!isBuiltinPackId(pack.id)) return `${pack.id} is not a built-in pack`;
  const { width, height } = pack.atlasSize;
  if (decoded.width !== width || decoded.height !== height) {
    return `decoded atlas ${String(decoded.width)}×${String(decoded.height)} ≠ header ${String(width)}×${String(height)}`;
  }
  return undefined;
}
