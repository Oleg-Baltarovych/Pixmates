// Pack builder core for `pnpm sprites` (plan M-ART MA-08): renders every frame of a PackDef, checks it (size,
// palette conformance, binary alpha, non-empty), packs one row atlas (row = animation, `origin` per animation) and
// writes the manifest with a SHA-256 per file. Pure apart from reading the master palette, so the determinism test
// can build twice in memory and compare hashes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPalette, type Palette } from '../../assets-src/lib/palette.ts';
import type { RampName } from '../../assets-src/lib/buffer.ts';
import type { PackDef, RenderContext } from '../../assets-src/lib/types.ts';
import { encodePng, type RgbaImage } from './png.ts';

export const ATLAS_FILE = 'sprites/atlas.png';
/** rules/render.md: one atlas per character ≤ 2048². */
export const MAX_ATLAS_SIDE = 2048;

export const ROOT = join(import.meta.dirname, '..', '..');

export function loadMasterPalette(): Palette {
  return loadPalette(JSON.parse(readFileSync(join(ROOT, 'assets-src', 'palettes', 'master.json'), 'utf8')));
}

export function renderContext(palette: Palette): RenderContext {
  return { palette, rampSize: (ramp: RampName) => palette.ramps.get(ramp)?.length ?? 1 };
}

export interface BuiltPack {
  readonly manifest: Record<string, unknown>;
  readonly atlas: Buffer;
  readonly sha256: string;
  /** Rendered frames per animation (for sheets and previews). */
  readonly frames: ReadonlyMap<string, readonly RgbaImage[]>;
}

export const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** Throws with the pack, animation and frame when a frame breaks a rule. */
export function checkFrame(def: PackDef, anim: string, index: number, image: RgbaImage, palette: Palette): void {
  const at = `${def.id}/${anim}/${String(index).padStart(2, '0')}`;
  if (image.width !== def.frameSize.w || image.height !== def.frameSize.h) {
    throw new Error(`${at}: frame is ${String(image.width)}×${String(image.height)}, expected frameSize`);
  }
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

export function buildPack(def: PackDef, ctx: RenderContext): BuiltPack {
  const { w, h } = def.frameSize;
  const names = Object.keys(def.animations);
  const maxFrames = Math.max(...names.map((n) => def.animations[n]?.frames ?? 0));
  const width = maxFrames * w;
  const height = names.length * h;
  if (width > MAX_ATLAS_SIDE || height > MAX_ATLAS_SIDE) {
    throw new Error(`${def.id}: atlas ${String(width)}×${String(height)} exceeds ${String(MAX_ATLAS_SIDE)}²`);
  }
  const data = new Uint8Array(width * height * 4);
  const frames = new Map<string, RgbaImage[]>();
  const animations: Record<string, unknown> = {};
  names.forEach((name, row) => {
    const anim = def.animations[name];
    if (!anim || !Number.isInteger(anim.frames) || anim.frames < 1)
      throw new Error(`${def.id}/${name}: bad frame count`);
    const list: RgbaImage[] = [];
    for (let f = 0; f < anim.frames; f++) {
      const image = def.render(name, f, ctx);
      checkFrame(def, name, f, image, ctx.palette);
      list.push(image);
      for (let y = 0; y < h; y++) {
        const src = image.data.subarray(y * w * 4, (y + 1) * w * 4);
        data.set(src, ((row * h + y) * width + f * w) * 4);
      }
    }
    frames.set(name, list);
    animations[name] = {
      file: ATLAS_FILE,
      frames: anim.frames,
      fps: anim.fps,
      loop: anim.loop,
      origin: { x: 0, y: row * h },
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
    animations,
    fallbacks: def.fallbacks,
    files: { [ATLAS_FILE]: hash },
  };
  return { manifest, atlas, sha256: hash, frames };
}
