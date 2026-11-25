// `pnpm sprites:compare <pack-id> [--base <git-ref>] [--frames …]`: before/after review sheets of one pack
// (usage in tools/lib/sprite-compare.ts). The "before" pack is built from the base revision's assets-src, exported
// into an OS temp folder with git plumbing and imported from there; the working tree and index are never touched.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKS } from '../assets-src/packs.ts';
import type { Palette } from '../assets-src/lib/palette.ts';
import type { PackDef, RenderContext } from '../assets-src/lib/types.ts';
import { runCli, UsageError } from './lib/cli.ts';
import { exportTree, resolveCommit } from './lib/git-tree.ts';
import { encodePng } from './lib/png.ts';
import {
  COMPARE_SCALES,
  COMPARE_USAGE,
  compareSheet,
  parseCompareArgs,
  renderShots,
  type Shot,
} from './lib/sprite-compare.ts';
import { loadMasterPalette, renderContext, ROOT } from './lib/sprites.ts';

const ASSETS = 'assets-src';

interface Side {
  readonly def: PackDef;
  readonly ctx: RenderContext;
}

/** Dynamic import of a module from the exported revision, with a named export checked to exist. */
async function importExport(url: string, name: string, check: (value: unknown) => boolean): Promise<unknown> {
  const mod: unknown = await import(url);
  const value: unknown = typeof mod === 'object' && mod !== null ? Reflect.get(mod, name) : undefined;
  if (!check(value)) throw new Error(`${url}: missing export '${name}'`);
  return value;
}

/** Builds the pack `id` as it was at `commit`, from a temp export of that revision's assets-src. */
async function sideAt(commit: string, id: string): Promise<Side> {
  const dir = mkdtempSync(join(tmpdir(), 'pixmates-compare-'));
  try {
    exportTree(commit, ASSETS, dir);
    // Node's type stripping needs to know the copied .ts files are ES modules.
    writeFileSync(join(dir, 'package.json'), '{ "type": "module" }\n');
    const url = (file: string): string => pathToFileURL(join(dir, ASSETS, file)).href;
    // Both exports are that revision's own PackDef[] and loadPalette: the same contracts one revision earlier.
    const packs = (await importExport(url('packs.ts'), 'PACKS', Array.isArray)) as readonly PackDef[];
    const loadPalette = (await importExport(url('lib/palette.ts'), 'loadPalette', (v) => typeof v === 'function')) as (
      json: unknown,
    ) => Palette;
    const def = packs.find((p) => p.id === id);
    if (!def) throw new UsageError(`pack '${id}' does not exist at ${commit.slice(0, 12)}`);
    const master: unknown = JSON.parse(readFileSync(join(dir, ASSETS, 'palettes', 'master.json'), 'utf8'));
    return { def, ctx: renderContext(loadPalette(master)) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeSheets(id: string, shots: readonly Shot[], old: Side, next: Side): void {
  const before = renderShots(old.def, shots, old.ctx);
  const after = renderShots(next.def, shots, next.ctx);
  shots.forEach((s, i) => {
    const where = before[i] ? (after[i] ? null : 'new pack') : after[i] ? 'old pack' : 'both packs';
    if (where) console.warn(`note: '${s.anim}' is missing in the ${where} (empty cell)`);
  });
  const out = join(ROOT, 'reports', 'sprites');
  mkdirSync(out, { recursive: true });
  for (const scale of COMPARE_SCALES) {
    const file = join(out, `${id}-compare-x${String(scale)}.png`);
    writeFileSync(file, encodePng(compareSheet(before, after, scale)));
    console.log(file);
  }
  console.log(
    `rows: old/white, new/white, old/dark, new/dark; columns: ${shots.map((s) => `${s.anim}:${String(s.frame)}`).join(' ')}`,
  );
}

await runCli(COMPARE_USAGE, async () => {
  const options = parseCompareArgs(process.argv.slice(2));
  if (options === 'help') {
    console.log(COMPARE_USAGE);
    return;
  }
  const def = PACKS.find((p) => p.id === options.id);
  if (!def) throw new UsageError(`unknown pack '${options.id}' (known: ${PACKS.map((p) => p.id).join(', ')})`);
  let commit: string;
  try {
    commit = resolveCommit(options.base);
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
  const old = await sideAt(commit, options.id);
  console.log(`base ${options.base} (${commit.slice(0, 12)}) vs working tree`);
  writeSheets(options.id, options.shots, old, { def, ctx: renderContext(loadMasterPalette()) });
});
