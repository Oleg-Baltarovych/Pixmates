// Logic behind `pnpm showcase`: the README media in docs/media/, built from the generated packs (resources/characters).
// Frame selection from a manifest strip, nearest-neighbour integer upscale, the shared GIF palette, grids and GIFs.
// Pure (no file access): the wiring lives in tools/showcase.ts. Same packs → same bytes.
import { Canvas, type Rgb } from './canvas.ts';
import { encodeGif, type GifFrame } from './gif.ts';
import type { RgbaImage } from './png.ts';

export const SHOWCASE_USAGE = `Usage: pnpm showcase

Runs \`pnpm sprites\`, then writes the README media from resources/characters/ into docs/media/:
  cast.png, cast-dark.png      all characters in idle, ×4, on a light and on a dark backdrop
  cast.gif                     all characters together, idle → walk → happy, ×2, transparent
  <id>.gif                     one per character, idle → walk → happy, ×4, transparent
Fails when a pack is missing or does not match assets-src/sprites.lock.json.

Options:
  -h, --help   show this help`;

/** One animation of a manifest, as far as the showcase needs it. */
export interface Strip {
  readonly frames: number;
  readonly fps: number;
  readonly origin?: { readonly x: number; readonly y: number } | undefined;
}

/** A generated pack: frame size, strips by animation name and the decoded atlas. */
export interface ShowcasePack {
  readonly id: string;
  readonly frameSize: { readonly w: number; readonly h: number };
  readonly animations: Readonly<Record<string, Strip>>;
  readonly atlas: RgbaImage;
}

/** One part of the loop: an animation played `loops` times. */
export interface Step {
  readonly anim: string;
  readonly loops: number;
}

/** Idle, then walking (in place, q34), then happy: the three looks a reader should see first. */
export const SHOWCASE_SEQUENCE: readonly Step[] = [
  { anim: 'idle_a', loops: 1 },
  { anim: 'walk', loops: 2 },
  { anim: 'happy', loops: 2 },
];

/** Integer upscales (nearest neighbour): the static cast and per-character GIFs, the one-row cast GIF. */
export const CAST_SCALE = 4;
export const CHARACTER_GIF_SCALE = 4;
export const CAST_GIF_SCALE = 2;
/** Cast sheet: 4 columns (2 rows of 4 at ×4 ≈ 850 px wide, GitHub's README column without downscaling). */
export const CAST_COLUMNS = 4;
/** Gap around and between grid cells, in native (pre-upscale) pixels. */
export const GRID_GAP = 4;
/** Animation whose frame 0 is the static cast (the rest pose). */
export const CAST_ANIM = 'idle_a';

/** One GIF frame: which frame of which animation, and how long it shows. */
export interface Beat {
  readonly anim: string;
  readonly frame: number;
  readonly delayCs: number;
}

/** GIF delay for an animation's fps, in whole centiseconds (6 fps → 17, 8 → 13, 10 → 10). */
export const delayCs = (fps: number): number => Math.round(100 / fps);

function stripOf(pack: ShowcasePack, anim: string): Strip {
  const strip = pack.animations[anim];
  if (!strip) throw new Error(`${pack.id}: no animation '${anim}'`);
  return strip;
}

/** Frame `index` of `anim` cut from the atlas (strips run left to right from the animation's origin). */
export function sliceFrame(pack: ShowcasePack, anim: string, index: number): RgbaImage {
  const strip = stripOf(pack, anim);
  if (!Number.isInteger(index) || index < 0 || index >= strip.frames) {
    throw new RangeError(`${pack.id}/${anim}: frame ${String(index)} outside 0..${String(strip.frames - 1)}`);
  }
  const { w, h } = pack.frameSize;
  const ox = (strip.origin?.x ?? 0) + index * w;
  const oy = strip.origin?.y ?? 0;
  if (ox + w > pack.atlas.width || oy + h > pack.atlas.height) {
    throw new RangeError(`${pack.id}/${anim}: frame ${String(index)} lies outside the atlas`);
  }
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((oy + y) * pack.atlas.width + ox) * 4;
    data.set(pack.atlas.data.subarray(from, from + w * 4), y * w * 4);
  }
  return { width: w, height: h, data };
}

/** Nearest-neighbour upscale by a positive integer factor. */
export function upscale(img: RgbaImage, scale: number): RgbaImage {
  if (!Number.isInteger(scale) || scale < 1) throw new RangeError('upscale needs a positive integer factor');
  const width = img.width * scale;
  const data = new Uint8Array(width * img.height * scale * 4);
  for (let y = 0; y < img.height * scale; y++) {
    for (let x = 0; x < width; x++) {
      const src = (Math.floor(y / scale) * img.width + Math.floor(x / scale)) * 4;
      data.set(img.data.subarray(src, src + 4), (y * width + x) * 4);
    }
  }
  return { width, height: img.height * scale, data };
}

/** Every frame of `sequence` in play order, with its delay from the animation's fps. */
export function sequenceBeats(pack: ShowcasePack, sequence: readonly Step[]): Beat[] {
  return sequence.flatMap(({ anim, loops }) => {
    const strip = stripOf(pack, anim);
    const delay = delayCs(strip.fps);
    return Array.from({ length: loops * strip.frames }, (_, i) => ({ anim, frame: i % strip.frames, delayCs: delay }));
  });
}

/** The shared beats of a cast: every pack must play `sequence` with the same frame counts and fps. */
export function castBeats(packs: readonly ShowcasePack[], sequence: readonly Step[]): Beat[] {
  const [first, ...rest] = packs;
  if (!first) throw new Error('a cast needs at least one pack');
  const beats = sequenceBeats(first, sequence);
  for (const pack of rest) {
    const own = sequenceBeats(pack, sequence);
    if (own.length !== beats.length || own.some((b, i) => b.delayCs !== beats[i]?.delayCs)) {
      throw new Error(`${pack.id}: frame counts or fps differ from ${first.id}, the cast cannot play in step`);
    }
  }
  return beats;
}

/**
 * Grid of same-size images, `columns` wide, filled row by row, at an integer `scale` with `gap` native px around and
 * between cells; `backdrop` fills the sheet, or it stays transparent.
 */
export function grid(
  images: readonly RgbaImage[],
  columns: number,
  scale: number,
  gap: number,
  backdrop?: Rgb,
): RgbaImage {
  const [first] = images;
  if (!first) throw new Error('a grid needs at least one image');
  if (images.some((i) => i.width !== first.width || i.height !== first.height)) {
    throw new Error('grid images must share one size');
  }
  const cols = Math.min(columns, images.length);
  const rows = Math.ceil(images.length / cols);
  const g = gap * scale;
  const cellW = first.width * scale;
  const cellH = first.height * scale;
  const canvas = new Canvas(cols * (cellW + g) + g, rows * (cellH + g) + g);
  if (backdrop) canvas.fill(0, 0, canvas.width, canvas.height, backdrop);
  images.forEach((img, i) => {
    canvas.blit(img, g + (i % cols) * (cellW + g), g + Math.floor(i / cols) * (cellH + g), scale);
  });
  return canvas.image();
}

/** Index 0 of every showcase palette: the transparent slot. */
export const TRANSPARENT_INDEX = 0;

const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i] ?? 0) << 16) | ((data[i + 1] ?? 0) << 8) | (data[i + 2] ?? 0);

/**
 * The palette of a set of images: the transparent slot, then every opaque colour once, ascending as 0xRRGGBB (so the
 * order does not depend on which image or pixel came first). Throws on partial alpha or more than 255 colours.
 */
export function paletteOf(images: readonly RgbaImage[]): number[] {
  const colours = new Set<number>();
  for (const img of images) {
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3] ?? 0;
      if (a === 0) continue;
      if (a !== 255) throw new Error('GIF frames need binary alpha (0 or 255)');
      colours.add(rgbAt(img.data, i));
    }
  }
  if (colours.size > 255)
    throw new Error(`${String(colours.size)} colours do not fit one GIF palette (255 + transparent)`);
  return [0, ...[...colours].sort((a, b) => a - b)];
}

/** Palette indices of `img`: transparent px → TRANSPARENT_INDEX, opaque px → their colour's slot. */
export function toIndices(img: RgbaImage, palette: readonly number[]): Uint8Array {
  const slot = new Map(palette.map((c, i) => [c, i] as const).slice(1));
  const out = new Uint8Array(img.width * img.height);
  for (let p = 0; p < out.length; p++) {
    if ((img.data[p * 4 + 3] ?? 0) === 0) continue;
    const index = slot.get(rgbAt(img.data, p * 4));
    if (index === undefined) throw new Error('colour missing from the GIF palette');
    out[p] = index;
  }
  return out;
}

/** A looping transparent GIF of same-size frames, each with its own delay. */
export function animatedGif(frames: readonly { readonly image: RgbaImage; readonly delayCs: number }[]): Buffer {
  const [first] = frames;
  if (!first) throw new Error('a GIF needs at least one frame');
  const palette = paletteOf(frames.map((f) => f.image));
  const gifFrames: GifFrame[] = frames.map((f) => ({ indices: toIndices(f.image, palette), delayCs: f.delayCs }));
  return encodeGif(gifFrames, {
    width: first.image.width,
    height: first.image.height,
    palette,
    transparentIndex: TRANSPARENT_INDEX,
  });
}

/** One character's loop at CHARACTER_GIF_SCALE. */
export function characterGif(pack: ShowcasePack, sequence: readonly Step[] = SHOWCASE_SEQUENCE): Buffer {
  return animatedGif(
    sequenceBeats(pack, sequence).map((b) => ({
      image: upscale(sliceFrame(pack, b.anim, b.frame), CHARACTER_GIF_SCALE),
      delayCs: b.delayCs,
    })),
  );
}

/** The whole cast in one row, playing the loop in step, at CAST_GIF_SCALE. */
export function castGif(packs: readonly ShowcasePack[], sequence: readonly Step[] = SHOWCASE_SEQUENCE): Buffer {
  return animatedGif(
    castBeats(packs, sequence).map((b) => ({
      image: grid(
        packs.map((p) => sliceFrame(p, b.anim, b.frame)),
        packs.length,
        CAST_GIF_SCALE,
        GRID_GAP,
      ),
      delayCs: b.delayCs,
    })),
  );
}

/** The static cast: frame 0 of CAST_ANIM for every pack, CAST_COLUMNS wide, at CAST_SCALE over `backdrop`. */
export const castSheet = (packs: readonly ShowcasePack[], backdrop: Rgb): RgbaImage =>
  grid(
    packs.map((p) => sliceFrame(p, CAST_ANIM, 0)),
    CAST_COLUMNS,
    CAST_SCALE,
    GRID_GAP,
    backdrop,
  );
