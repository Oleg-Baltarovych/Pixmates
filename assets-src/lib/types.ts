// Pack generator contract for `pnpm sprites` (plan M-ART MA-07/MA-08, ADR 004). A generator describes one character
// pack (frame size, anchor, animations, fallbacks) and renders each frame from ramp indices; tools/lib/sprites.ts
// packs the frames into one row atlas (one row per animation, `origin` per animation) plus manifest.json.
// Determinism rules (Cossack Kin types.ts): only seeded hashes, integer math and + − × ÷ / sqrt feed the output.
import type { RgbaImage } from '../../tools/lib/png.ts';
import type { Palette } from './palette.ts';
import type { RampSize } from './passes.ts';

export interface AnimDef {
  readonly frames: number;
  readonly fps: number;
  readonly loop: boolean;
}

export interface RenderContext {
  readonly palette: Palette;
  readonly rampSize: RampSize;
}

export interface PackDef {
  /** Pack id = folder name under resources/characters (`spike-*` = dev-only spike packs). */
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly frameSize: { readonly w: number; readonly h: number };
  readonly anchor: { readonly x: number; readonly y: number };
  /** In atlas row order. */
  readonly animations: Readonly<Record<string, AnimDef>>;
  readonly fallbacks: Readonly<Record<string, string>>;
  /** Renders frame `frame` of `anim` as RGBA (palette colours, alpha 0 or 255). */
  render(anim: string, frame: number, ctx: RenderContext): RgbaImage;
}
