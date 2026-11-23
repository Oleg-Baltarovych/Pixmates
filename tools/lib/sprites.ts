// Pack builder core for `pnpm sprites` (plan M-ART MA-08, MA-23, MA-26): renders every frame of a PackDef, checks it
// (size, palette conformance, binary alpha, non-empty, headroom row 0 for built-ins), packs one atlas (`rows`: one
// row per animation; `shelf`: strips packed into shelves ≤ 1024 wide) with `origin` per animation, and writes the
// manifest with a SHA-256 per file. Also builds the FX marks atlas. Pure apart from reading the master palette, so the
// determinism tests can build twice in memory and compare hashes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FX_FRAME, FX_MARKS, FX_OUTFIT } from '../../assets-src/fx/marks.ts';
import { LEGEND } from '../../assets-src/lib/mask.ts';
import { loadPalette, type Palette } from '../../assets-src/lib/palette.ts';
import type { RampName } from '../../assets-src/lib/buffer.ts';
import type { PackDef, RenderContext } from '../../assets-src/lib/types.ts';
import { encodePng, type RgbaImage } from './png.ts';

export const ATLAS_FILE = 'sprites/atlas.png';
export const FX_FILE = 'sprites/fx.png';
/** rules/render.md: one atlas per character ≤ 2048² (row layout, spike packs). */
export const MAX_ATLAS_SIDE = 2048;
/** Plan M-ART phase 2: built-in (shelf) atlases ≤ 1024², FX ≤ 512². */
export const MAX_SHELF_SIDE = 1024;
export const MAX_FX_SIDE = 512;

export const ROOT = join(import.meta.dirname, '..', '..');

export function loadMasterPalette(): Palette {
  return loadPalette(JSON.parse(readFileSync(join(ROOT, 'assets-src', 'palettes', 'master.json'), 'utf8')));
}

export function renderContext(palette: Palette): RenderContext {
  return { palette, rampSize: (ramp: RampName) => palette.ramps.get(ramp)?.length ?? 1 };
}

/** Index 0 (the deepest outline tone) of every ramp, as 0xRRGGBB. */
export function deepestTones(palette: Palette): ReadonlySet<number> {
  return new Set([...palette.ramps.values()].map((r) => r[0] ?? -1));
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface BuiltPack {
  readonly manifest: Record<string, unknown>;
  readonly atlas: Buffer;
  readonly atlasSize: Size;
  readonly sha256: string;
  /** Rendered frames per animation (for sheets and previews). */
  readonly frames: ReadonlyMap<string, readonly RgbaImage[]>;
  /** FX anchor per frame (packs that define `fxAnchor`). */
  readonly fx: ReadonlyMap<string, readonly (readonly [number, number])[]>;
}

export const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** Throws with the pack, animation and frame when a frame breaks a rule. */
export function checkFrame(def: PackDef, anim: string, index: number, image: RgbaImage, palette: Palette): void {
  const at = `${def.id}/${anim}/${String(index).padStart(2, '0')}`;
  if (image.width !== def.frameSize.w || image.height !== def.frameSize.h) {
    throw new Error(`${at}: frame is ${String(image.width)}×${String(image.height)}, expected frameSize`);
  }
  checkPixels(at, image, palette);
  if (def.headroom === true) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[x * 4 + 3] ?? 0) !== 0) throw new Error(`${at}: opaque px on row 0 (headroom, ADR 009)`);
    }
  }
}

function checkPixels(at: string, image: RgbaImage, palette: Palette): void {
  let opaque = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const a = image.data[i + 3] ?? 0;
    if (a === 0) continue;
    if (a !== 255) throw new Error(`${at}: soft alpha ${String(a)} (characters use 0 or 255)`);
    const rgb = ((image.data[i] ?? 0) << 16) | ((image.data[i + 1] ?? 0) << 8) | (image.data[i + 2] ?? 0);
    if (!palette.colors.has(rgb)) throw new Error(`${at}: colour #${rgb.toString(16).padStart(6, '0')} is off-palette`);
    opaque++;
  }
  if (opaque === 0) throw new Error(`${at}: empty frame`);
}

export interface ShelfResult {
  readonly placements: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
  readonly width: number;
  readonly height: number;
}

/**
 * First-fit decreasing shelf packing of horizontal strips (`frames` × frameW, frameH tall): longest strips first
 * (ties keep input order), each into the first shelf with room, shelves stacked downwards. Deterministic.
 */
export function shelfPack(
  strips: readonly { readonly name: string; readonly frames: number }[],
  frameW: number,
  frameH: number,
  maxW: number,
): ShelfResult {
  const order = strips.map((s, i) => ({ ...s, i })).sort((a, b) => b.frames - a.frames || a.i - b.i);
  const used: number[] = [];
  const placements = new Map<string, { x: number; y: number }>();
  for (const s of order) {
    const w = s.frames * frameW;
    if (w > maxW) throw new Error(`${s.name}: strip ${String(w)} px is wider than ${String(maxW)}`);
    let shelf = used.findIndex((u) => u + w <= maxW);
    if (shelf < 0) {
      shelf = used.length;
      used.push(0);
    }
    placements.set(s.name, { x: used[shelf] ?? 0, y: shelf * frameH });
    used[shelf] = (used[shelf] ?? 0) + w;
  }
  return { placements, width: Math.max(0, ...used), height: used.length * frameH };
}

export function buildPack(def: PackDef, ctx: RenderContext): BuiltPack {
  const { w, h } = def.frameSize;
  const names = Object.keys(def.animations);
  for (const name of names) {
    const anim = def.animations[name];
    if (!anim || !Number.isInteger(anim.frames) || anim.frames < 1) {
      throw new Error(`${def.id}/${name}: bad frame count`);
    }
  }
  const frameCount = (n: string): number => def.animations[n]?.frames ?? 0;
  let width: number;
  let height: number;
  let placeOf: (name: string, row: number) => { x: number; y: number };
  if (def.layout === 'shelf') {
    const shelf = shelfPack(
      names.map((name) => ({ name, frames: frameCount(name) })),
      w,
      h,
      MAX_SHELF_SIDE,
    );
    ({ width, height } = shelf);
    if (height > MAX_SHELF_SIDE) throw new Error(`${def.id}: atlas height ${String(height)} exceeds 1024`);
    placeOf = (name) => shelf.placements.get(name) ?? { x: 0, y: 0 };
  } else {
    width = Math.max(...names.map(frameCount)) * w;
    height = names.length * h;
    if (width > MAX_ATLAS_SIDE || height > MAX_ATLAS_SIDE) {
      throw new Error(`${def.id}: atlas ${String(width)}×${String(height)} exceeds ${String(MAX_ATLAS_SIDE)}²`);
    }
    placeOf = (_name, row) => ({ x: 0, y: row * h });
  }
  const data = new Uint8Array(width * height * 4);
  const frames = new Map<string, RgbaImage[]>();
  const fx = new Map<string, (readonly [number, number])[]>();
  const animations: Record<string, unknown> = {};
  names.forEach((name, row) => {
    const anim = def.animations[name];
    if (!anim) return;
    const origin = placeOf(name, row);
    const list: RgbaImage[] = [];
    for (let f = 0; f < anim.frames; f++) {
      const image = def.render(name, f, ctx);
      checkFrame(def, name, f, image, ctx.palette);
      list.push(image);
      for (let y = 0; y < h; y++) {
        const src = image.data.subarray(y * w * 4, (y + 1) * w * 4);
        data.set(src, ((origin.y + y) * width + origin.x + f * w) * 4);
      }
    }
    frames.set(name, list);
    if (def.fxAnchor)
      fx.set(
        name,
        list.map((_, f) => def.fxAnchor?.(name, f) ?? [0, 0]),
      );
    animations[name] = {
      file: ATLAS_FILE,
      frames: anim.frames,
      fps: anim.fps,
      loop: anim.loop,
      origin,
      ...(anim.anchor ? { anchor: anim.anchor } : {}),
      ...(anim.facing ? { facing: anim.facing } : {}),
    };
  });
  const atlas = encodePng({ width, height, data });
  const hash = sha256(atlas);
  const manifest = {
    id: def.id,
    name: def.name,
    version: def.version,
    author: def.author,
    frameSize: def.frameSize,
    anchor: def.anchor,
    ...(def.scaleRef === undefined ? {} : { scaleRef: def.scaleRef }),
    animations,
    fallbacks: def.fallbacks,
    ...(def.emotions === undefined ? {} : { emotions: [...def.emotions] }),
    files: { [ATLAS_FILE]: hash },
  };
  return { manifest, atlas, atlasSize: { width, height }, sha256: hash, frames, fx };
}

export interface BuiltFx {
  readonly manifest: Record<string, unknown>;
  readonly atlas: Buffer;
  readonly atlasSize: Size;
  readonly sha256: string;
  readonly frames: ReadonlyMap<string, readonly RgbaImage[]>;
}

const N4: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Renders one FX frame: stamps (mask legend through FX_OUTFIT), then a 1-px outline in the mark's outline tone. */
export function renderFxFrame(mark: (typeof FX_MARKS)[number], frame: number, ctx: RenderContext): RgbaImage {
  const size = FX_FRAME;
  const data = new Uint8Array(size * size * 4);
  const color = (ramp: RampName, shade: number): number => {
    const ramps = ctx.palette.ramps.get(ramp) ?? [];
    return ramps[Math.min(Math.max(0, shade), ramps.length - 1)] ?? 0;
  };
  const put = (x: number, y: number, rgb: number): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    data.set([(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, 255], (y * size + x) * 4);
  };
  for (const s of mark.frames[frame] ?? []) {
    s.mask.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const entry = LEGEND[row.charAt(c)];
        if (!entry) continue;
        const swatch = FX_OUTFIT[entry[0]];
        put(s.x + c, s.y + r, color(swatch.ramp, swatch.tones[entry[1]]));
      }
    });
  }
  const filled = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < size && y < size && (data[(y * size + x) * 4 + 3] ?? 0) > 0;
  const ring: [number, number][] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!filled(x, y) && N4.some(([dx, dy]) => filled(x + dx, y + dy))) ring.push([x, y]);
    }
  }
  if (mark.outline) {
    const swatch = FX_OUTFIT[mark.outline[0]];
    const rgb = color(swatch.ramp, swatch.tones[mark.outline[1]]);
    for (const [x, y] of ring) put(x, y, rgb);
  }
  return { width: size, height: size, data };
}

/** FX marks atlas: one row per mark, frames left to right (plan MA-26; loaded from M1). */
export function buildFx(ctx: RenderContext): BuiltFx {
  const size = FX_FRAME;
  const width = Math.max(...FX_MARKS.map((m) => m.frames.length)) * size;
  const height = FX_MARKS.length * size;
  if (width > MAX_FX_SIDE || height > MAX_FX_SIDE) throw new Error(`fx atlas ${String(width)}×${String(height)}`);
  for (const m of FX_MARKS) {
    for (const f of m.frames)
      for (const s of f)
        if (!s.mask.every((r) => r.split('').every((ch) => ch === '.' || LEGEND[ch]))) {
          throw new Error(`fx/${m.name}: unknown mask char`);
        }
  }
  const data = new Uint8Array(width * height * 4);
  const frames = new Map<string, RgbaImage[]>();
  const marks: Record<string, unknown> = {};
  FX_MARKS.forEach((m, row) => {
    const list: RgbaImage[] = [];
    m.frames.forEach((_, f) => {
      const image = renderFxFrame(m, f, ctx);
      checkPixels(`fx/${m.name}/${String(f).padStart(2, '0')}`, image, ctx.palette);
      list.push(image);
      for (let y = 0; y < size; y++) {
        data.set(image.data.subarray(y * size * 4, (y + 1) * size * 4), ((row * size + y) * width + f * size) * 4);
      }
    });
    frames.set(m.name, list);
    marks[m.name] = { frames: m.frames.length, fps: m.fps, loop: m.loop, origin: { x: 0, y: row * size } };
  });
  const atlas = encodePng({ width, height, data });
  const hash = sha256(atlas);
  const manifest = { version: '0.1.0', frameSize: { w: size, h: size }, marks, files: { [FX_FILE]: hash } };
  return { manifest, atlas, atlasSize: { width, height }, sha256: hash, frames };
}

/**
 * Horizontal mirror about the frame centre (x → w − 1 − x): the runtime flip of a `facing: 'right'` strip for walking
 * left (ADR 010). The rig keeps the body axis at x = 24 of the 48-px frame, so the feet pivot stays put.
 */
export function mirrorFrame(img: RgbaImage): RgbaImage {
  const data = new Uint8Array(img.data.length);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const src = (y * img.width + x) * 4;
      data.set(img.data.subarray(src, src + 4), (y * img.width + (img.width - 1 - x)) * 4);
    }
  }
  return { width: img.width, height: img.height, data };
}
