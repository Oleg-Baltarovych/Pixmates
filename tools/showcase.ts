// `pnpm showcase`: the README media in docs/media/ (usage in tools/lib/showcase.ts), built from the packs `pnpm sprites`
// wrote to resources/characters/. Every atlas must match the committed fingerprint, so the media always shows the art
// in the repo. Deterministic: rerunning on the same packs rewrites the same bytes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PACKS } from '../assets-src/packs.ts';
import { manifestSchema } from '../src/shared/pack.ts';
import { DARK, LIGHT } from './lib/canvas.ts';
import { parseCli, runCli, wantsHelp } from './lib/cli.ts';
import { decodePng, encodePng } from './lib/png.ts';
import { castGif, castSheet, characterGif, SHOWCASE_USAGE, type ShowcasePack } from './lib/showcase.ts';
import { readLock } from './lib/sprite-outputs.ts';
import { ATLAS_FILE, ROOT, sha256 } from './lib/sprites.ts';

const OUT = join(ROOT, 'docs', 'media');

/** Reads one generated pack; throws when it is missing, malformed or differs from the lock. */
function loadPack(id: string, locked: string | undefined): ShowcasePack {
  const dir = join(ROOT, 'resources', 'characters', id);
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')));
  const bytes = readFileSync(join(dir, ATLAS_FILE));
  if (sha256(bytes) !== locked) {
    throw new Error(`${id}: ${ATLAS_FILE} does not match assets-src/sprites.lock.json (run \`pnpm sprites\`)`);
  }
  return { id, frameSize: manifest.frameSize, animations: manifest.animations, atlas: decodePng(bytes) };
}

function write(name: string, bytes: Buffer): void {
  const file = join(OUT, name);
  writeFileSync(file, bytes);
  console.log(`${relative(ROOT, file)}  ${(bytes.length / 1024).toFixed(1)} KiB`);
}

await runCli(SHOWCASE_USAGE, () => {
  if (wantsHelp(parseCli({ usage: SHOWCASE_USAGE, options: {} }, process.argv.slice(2)))) {
    console.log(SHOWCASE_USAGE);
    return;
  }
  const lock = readLock();
  const packs = PACKS.map((def) => loadPack(def.id, lock[def.id]?.[ATLAS_FILE]));
  mkdirSync(OUT, { recursive: true });
  write('cast.png', encodePng(castSheet(packs, LIGHT)));
  write('cast-dark.png', encodePng(castSheet(packs, DARK)));
  write('cast.gif', castGif(packs));
  for (const pack of packs) write(`${pack.id.replace(/^pixmates\./, '')}.gif`, characterGif(pack));
});
