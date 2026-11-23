// `pnpm sprites` (plan M-ART MA-08): builds every pack in assets-src/packs.ts into resources/characters/<id>/
// (manifest.json + sprites/atlas.png; generated, git-ignored, never edited) and prints a SHA-256 per file.
// Same input → same bytes; tests/unit/art/determinism.test.ts checks it in CI.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS } from '../assets-src/packs.ts';
import { ATLAS_FILE, buildPack, loadMasterPalette, renderContext, ROOT, sha256 } from './lib/sprites.ts';

const out = join(ROOT, 'resources', 'characters');
const ctx = renderContext(loadMasterPalette());
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

for (const def of PACKS) {
  if (only.length > 0 && !only.includes(def.id)) continue;
  const started = performance.now();
  const pack = buildPack(def, ctx);
  const dir = join(out, def.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'sprites'), { recursive: true });
  writeFileSync(join(dir, ATLAS_FILE), pack.atlas);
  const manifest = Buffer.from(`${JSON.stringify(pack.manifest, null, 2)}\n`);
  writeFileSync(join(dir, 'manifest.json'), manifest);
  const ms = Math.round(performance.now() - started);
  console.log(
    `${def.id}  atlas ${pack.sha256.slice(0, 16)}  manifest ${sha256(manifest).slice(0, 16)}  (${String(ms)} ms)`,
  );
}
