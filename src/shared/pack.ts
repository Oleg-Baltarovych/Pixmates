// Character pack manifest (SPEC §5.1 + plan M-ART MA-09): one zod schema for built-in packs (validated by main at
// load, dogfooding) and, from M5, imported ones. `origin` per animation = top-left of a horizontal strip of `frames`
// frames in `file` (default 0,0), so a built-in pack can keep every animation in one atlas (owner decision Q1).
// Pure: no Node, no Electron. Texture sizes are checked separately once the images are known (`checkStrips`).
import { z } from 'zod';
import { IDLE_NAMES, resolveAnim } from './anim.ts';

export { IDLE_NAMES, resolveAnim };

export const PACK_LIMITS = {
  idMax: 64,
  textMax: 64,
  personaMax: 2000,
  frameMin: 8,
  frameMax: 256,
  framesMax: 64,
  fpsMax: 30,
  animationsMax: 64,
  fallbacksMax: 64,
  /** SPEC §5.1: ≤ 4096 px per texture side. */
  textureMax: 4096,
  /** `scaleRef` ≥ ¾ of the frame height (ADR 009 headroom ≈ 17 %; a tiny scaleRef would blow the sprite up). */
  scaleRefMinRatio: 0.75,
} as const;

/** Animation names: `idle_a`, `walk`, `react:wave` style namespaces. */
export const ANIM_NAME = /^[a-z][a-z0-9_]{0,31}(?::[a-z0-9_*]{1,32})?$/;
const FALLBACK_KEY = /^(?:\*|[a-z][a-z0-9_]{0,31}(?::(?:\*|[a-z0-9_]{1,32}))?)$/;
export const PACK_ID = /^[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?$/;
/** Sprite files live under `sprites/` with a plain name and an image extension. */
const SPRITE_FILE = /^sprites\/[a-z0-9_-]{1,64}\.(?:png|webp|gif)$/;

/** Built-in packs (rules/characters.md): `pixmates.<rosterId>`, folder = id; imports may never use the prefix. */
export const BUILTIN_PREFIX = 'pixmates.';
const ROSTER_ID = /^[a-z][a-z0-9-]{0,31}$/;

export function builtinPackId(rosterId: string): string {
  if (!ROSTER_ID.test(rosterId)) throw new Error(`bad roster id "${rosterId}"`);
  return `${BUILTIN_PREFIX}${rosterId}`;
}

export const isBuiltinPackId = (id: string): boolean =>
  id.startsWith(BUILTIN_PREFIX) && ROSTER_ID.test(id.slice(BUILTIN_PREFIX.length));

export const unitPoint = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();

const point = z.object({
  x: z.int().min(0).max(PACK_LIMITS.textureMax),
  y: z.int().min(0).max(PACK_LIMITS.textureMax),
});

/** Screen direction an animation is authored for (ADR 010); `front` never mirrors, M1 mirrors `right`/`left` to travel. */
export const FACINGS = ['front', 'right', 'left'] as const;
export type Facing = (typeof FACINGS)[number];
export const facingSchema = z.enum(FACINGS);

export const animationSchema = z
  .object({
    file: z.string().regex(SPRITE_FILE),
    frames: z.int().min(1).max(PACK_LIMITS.framesMax),
    fps: z.number().min(1).max(PACK_LIMITS.fpsMax),
    loop: z.boolean(),
    origin: point.strict().optional(),
    /** Pivot of this animation (e.g. `sit_edge` on the seat), overrides the pack `anchor` (SPEC §5.1). */
    anchor: unitPoint.optional(),
    /** Authored facing (SPEC §5.1, ADR 010); absent = `front`. */
    facing: facingSchema.optional(),
  })
  .strict();

/** The facing of an animation entry, `front` when the manifest omits it. */
export const facingOf = (a: { facing?: Facing | undefined }): Facing => a.facing ?? 'front';

export const manifestSchema = z
  .object({
    id: z.string().regex(PACK_ID),
    name: z.string().min(1).max(PACK_LIMITS.textMax),
    version: z.string().min(1).max(32),
    author: z.string().max(PACK_LIMITS.textMax).optional(),
    frameSize: z
      .object({
        w: z.int().min(PACK_LIMITS.frameMin).max(PACK_LIMITS.frameMax),
        h: z.int().min(PACK_LIMITS.frameMin).max(PACK_LIMITS.frameMax),
      })
      .strict(),
    anchor: unitPoint,
    /** Standing-figure height (px) used for sizing; default `frameSize.h` (ADR 009 headroom). */
    scaleRef: z.int().min(PACK_LIMITS.frameMin).max(PACK_LIMITS.frameMax).optional(),
    animations: z
      .record(z.string().regex(ANIM_NAME), animationSchema)
      .refine((a) => Object.keys(a).length <= PACK_LIMITS.animationsMax, 'too many animations'),
    fallbacks: z
      .record(z.string().regex(FALLBACK_KEY), z.string().regex(ANIM_NAME))
      .refine((f) => Object.keys(f).length <= PACK_LIMITS.fallbacksMax, 'too many fallbacks')
      .default({}),
    emotions: z.array(z.string().regex(ANIM_NAME)).max(32).optional(),
    persona: z.string().max(PACK_LIMITS.personaMax).optional(),
    /** SHA-256 per file, written by `pnpm sprites` (built-ins). */
    files: z.record(z.string().regex(SPRITE_FILE), z.string().regex(/^[0-9a-f]{64}$/)).optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.scaleRef !== undefined && m.scaleRef > m.frameSize.h) {
      ctx.addIssue({ code: 'custom', message: 'scaleRef is taller than the frame' });
    }
    if (m.scaleRef !== undefined && m.scaleRef < m.frameSize.h * PACK_LIMITS.scaleRefMinRatio) {
      ctx.addIssue({ code: 'custom', message: 'scaleRef is below 3/4 of the frame height' });
    }
    if (!('walk' in m.animations)) ctx.addIssue({ code: 'custom', message: 'missing required animation "walk"' });
    if (!IDLE_NAMES.some((n) => n in m.animations)) {
      ctx.addIssue({ code: 'custom', message: 'missing required animation "idle" (or "idle_a")' });
    }
    for (const [key, target] of Object.entries(m.fallbacks)) {
      if (resolveAnim(target, m) === undefined) {
        ctx.addIssue({ code: 'custom', message: `fallback "${key}" → "${target}" resolves to no animation` });
      }
    }
  });

export type Manifest = z.infer<typeof manifestSchema>;

/** FX marks atlas (plan M-ART MA-26): built by `pnpm sprites` into resources/fx/, loaded from M1. */
export const FX_LIMITS = { frameMax: 16, framesMax: 6, marksMax: 32, atlasMax: 512 } as const;

export const fxManifestSchema = z
  .object({
    version: z.string().min(1).max(32),
    frameSize: z
      .object({ w: z.int().min(4).max(FX_LIMITS.frameMax), h: z.int().min(4).max(FX_LIMITS.frameMax) })
      .strict(),
    marks: z
      .record(
        z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),
        z
          .object({
            frames: z.int().min(1).max(FX_LIMITS.framesMax),
            fps: z.number().min(1).max(PACK_LIMITS.fpsMax),
            loop: z.boolean(),
            origin: z
              .object({ x: z.int().min(0).max(FX_LIMITS.atlasMax), y: z.int().min(0).max(FX_LIMITS.atlasMax) })
              .strict(),
          })
          .strict(),
      )
      .refine((m) => Object.keys(m).length <= FX_LIMITS.marksMax, 'too many marks'),
    files: z.record(z.string().regex(SPRITE_FILE), z.string().regex(/^[0-9a-f]{64}$/)),
  })
  .strict()
  .superRefine((m, ctx) => {
    // Strip check against the atlas bound; the loader (M1) also checks strips against the real PNG size.
    for (const [name, mark] of Object.entries(m.marks)) {
      const right = mark.origin.x + mark.frames * m.frameSize.w;
      const bottom = mark.origin.y + m.frameSize.h;
      if (right > FX_LIMITS.atlasMax || bottom > FX_LIMITS.atlasMax) {
        ctx.addIssue({
          code: 'custom',
          message: `fx mark "${name}" strip leaves the ${String(FX_LIMITS.atlasMax)}² atlas`,
        });
      }
    }
  });

export type FxManifest = z.infer<typeof fxManifestSchema>;

export interface TextureSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Every animation strip must lie inside its texture, and every texture must be ≤ `maxSide` (SPEC §5.1 4096;
 * built-ins use 2048). Returns the problems (empty = fine).
 */
export function checkStrips(
  manifest: Pick<Manifest, 'animations' | 'frameSize'>,
  textures: ReadonlyMap<string, TextureSize>,
  maxSide: number = PACK_LIMITS.textureMax,
): string[] {
  const problems: string[] = [];
  for (const [file, size] of textures) {
    if (size.width > maxSide || size.height > maxSide) {
      problems.push(`${file}: ${String(size.width)}×${String(size.height)} exceeds ${String(maxSide)} px`);
    }
  }
  for (const [name, anim] of Object.entries(manifest.animations)) {
    const size = textures.get(anim.file);
    if (!size) {
      problems.push(`${name}: texture ${anim.file} is missing`);
      continue;
    }
    const x = anim.origin?.x ?? 0;
    const y = anim.origin?.y ?? 0;
    if (x + anim.frames * manifest.frameSize.w > size.width || y + manifest.frameSize.h > size.height) {
      problems.push(`${name}: strip at ${String(x)},${String(y)} × ${String(anim.frames)} frames leaves ${anim.file}`);
    }
  }
  return problems;
}
