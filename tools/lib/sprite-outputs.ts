// What `pnpm sprites` writes, built in memory (packs from assets-src/packs.ts, then FX), and the committed fingerprint
// of it: assets-src/sprites.lock.json (pack id → file → SHA-256). The outputs are git-ignored, so the lock is how a
// pack change shows up in review; tests/unit/tools/sprites-lock.test.ts fails when they drift, `pnpm sprites:lock`
// rewrites the lock on purpose.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { PACKS } from '../../assets-src/packs.ts';
import type { PackDef, RenderContext } from '../../assets-src/lib/types.ts';
import { fxManifestSchema, manifestSchema } from '../../src/shared/pack.ts';
import { ATLAS_FILE, buildFx, buildPack, FX_FILE, ROOT, sha256 } from './sprites.ts';

/** One generated file, `path` relative to its pack directory (resources/characters/<id>/ or resources/fx/). */
export interface OutputFile {
  readonly path: string;
  readonly bytes: Buffer;
}

/** Everything `pnpm sprites` writes for one pack (`id` is the pack id, or `fx` for the FX atlas). */
export interface PackOutput {
  readonly id: string;
  /** Output directory relative to ROOT. */
  readonly dir: string;
  readonly files: readonly OutputFile[];
}

export const FX_ID = 'fx';

const manifestBytes = (manifest: unknown): Buffer => Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);

/** The files of one pack; the manifest is checked by the same schema the app reads it with (fail the build, not the app). */
export function packOutput(def: PackDef, ctx: RenderContext): PackOutput {
  const pack = buildPack(def, ctx);
  manifestSchema.parse(pack.manifest);
  return {
    id: def.id,
    dir: join('resources', 'characters', def.id),
    files: [
      { path: ATLAS_FILE, bytes: pack.atlas },
      { path: 'manifest.json', bytes: manifestBytes(pack.manifest) },
    ],
  };
}

export function fxOutput(ctx: RenderContext): PackOutput {
  const fx = buildFx(ctx);
  fxManifestSchema.parse(fx.manifest);
  return {
    id: FX_ID,
    dir: join('resources', 'fx'),
    files: [
      { path: FX_FILE, bytes: fx.atlas },
      { path: 'manifest.json', bytes: manifestBytes(fx.manifest) },
    ],
  };
}

/** Every output id of `pnpm sprites`, in build order: the packs of assets-src/packs.ts, then the FX atlas. */
export const OUTPUT_IDS: readonly string[] = [...PACKS.map((def) => def.id), FX_ID];

/** Builds one output by id (a pack id or `fx`). */
export function buildOutput(id: string, ctx: RenderContext): PackOutput {
  if (id === FX_ID) return fxOutput(ctx);
  const def = PACKS.find((p) => p.id === id);
  if (!def) throw new Error(`unknown pack '${id}' (known: ${OUTPUT_IDS.join(', ')})`);
  return packOutput(def, ctx);
}

/** Every output of `pnpm sprites`, in build order. */
export const buildAllOutputs = (ctx: RenderContext): PackOutput[] => OUTPUT_IDS.map((id) => buildOutput(id, ctx));

const lockSchema = z.record(z.string(), z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/)));

/** Committed fingerprint of the git-ignored outputs: pack id → file path → SHA-256. */
export type SpritesLock = z.infer<typeof lockSchema>;

export const LOCK_FILE = join(ROOT, 'assets-src', 'sprites.lock.json');
export const LOCK_UPDATE_COMMAND = 'pnpm sprites:lock';

/** The committed lock (empty when the file does not exist yet); throws on a malformed file. */
export function readLock(file = LOCK_FILE): SpritesLock {
  if (!existsSync(file)) return {};
  return lockSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

export function lockOf(outputs: readonly PackOutput[]): SpritesLock {
  return Object.fromEntries(
    outputs.map((o) => [o.id, Object.fromEntries(o.files.map((f) => [f.path, sha256(f.bytes)] as const))]),
  );
}

/** Lock file bytes: 2-space JSON plus a newline (Prettier-stable). */
export const lockBytes = (lock: SpritesLock): string => `${JSON.stringify(lock, null, 2)}\n`;

/** null when `actual` matches `committed`; otherwise one line per differing pack plus the update command. */
export function lockMismatch(committed: SpritesLock, actual: SpritesLock): string | null {
  const lines: string[] = [];
  for (const [id, files] of Object.entries(actual)) {
    const locked = committed[id];
    if (!locked) {
      lines.push(`  ${id}: not in the lock`);
      continue;
    }
    const paths = [...new Set([...Object.keys(files), ...Object.keys(locked)])].sort();
    const changed = paths.filter((p) => files[p] !== locked[p]);
    if (changed.length > 0) lines.push(`  ${id}: ${changed.join(', ')} changed`);
  }
  for (const id of Object.keys(committed)) if (!(id in actual)) lines.push(`  ${id}: in the lock but no longer built`);
  if (lines.length === 0) return null;
  return [
    `assets-src/sprites.lock.json does not match the packs built from assets-src:`,
    ...lines,
    `If the change is intended, run \`${LOCK_UPDATE_COMMAND}\` and commit the lock diff.`,
  ].join('\n');
}
