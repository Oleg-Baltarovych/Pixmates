// Pack generator contract for `pnpm sprites` (plan M-ART MA-07/MA-08, ADR 004). A generator describes one character
// pack (frame size, anchor, animations, fallbacks) and renders each frame from ramp indices; tools/lib/sprites.ts
// packs the frames into one row atlas (one row per animation, `origin` per animation) plus manifest.json.
// Determinism rules (Cossack Kin types.ts): only seeded hashes, integer math and + − × ÷ / sqrt feed the output.
import type { RgbaImage } from '../../tools/lib/png.ts';
import type { Palette } from './palette.ts';
import type { RampSize } from './passes.ts';

import type { Facing } from '../../src/shared/pack.ts';

export type { Facing };

export interface AnimDef {
  readonly frames: number;
  readonly fps: number;
  readonly loop: boolean;
  /** Per-animation pivot (e.g. `sit_edge` on the seat), emitted into the manifest. */
  readonly anchor?: { readonly x: number; readonly y: number };
  /** Authored facing (ADR 010), emitted into the manifest; absent = front. */
  readonly facing?: Facing;
}

export interface RenderContext {
  readonly palette: Palette;
  readonly rampSize: RampSize;
}

export interface PackDef {
  /** Pack id = folder name under resources/characters (built-ins: `pixmates.<id>`). */
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly frameSize: { readonly w: number; readonly h: number };
  readonly anchor: { readonly x: number; readonly y: number };
  /** In atlas row order. */
  readonly animations: Readonly<Record<string, AnimDef>>;
  readonly fallbacks: Readonly<Record<string, string>>;
  /** Standing-figure height for sizing (manifest `scaleRef`); omitted = frame height. */
  readonly scaleRef?: number;
  /** Manifest `emotions`: animation names the LLM layer may pick (M1); each must be an animation of the pack. */
  readonly emotions?: readonly string[];
  /** `rows` (default): one atlas row per animation. `shelf`: strips packed into shelves ≤ 1024 wide. */
  readonly layout?: 'rows' | 'shelf';
  /** Built-ins with headroom (ADR 009): the builder fails when a frame has an opaque px on row 0. */
  readonly headroom?: boolean;
  /** FX mark anchor per frame (frame px), for previews; reaches the manifest/IPC in M1. */
  fxAnchor?(anim: string, frame: number): readonly [number, number];
  /** Renders frame `frame` of `anim` as RGBA (palette colours, alpha 0 or 255). */
  render(anim: string, frame: number, ctx: RenderContext): RgbaImage;
}
