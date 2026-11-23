// `pnpm sprites` (plan M-ART MA-08): builds every pack in assets-src/packs.ts into resources/characters/<id>/
// (manifest.json + sprites/atlas.png; generated, git-ignored, never edited) plus the FX marks atlas into
// resources/fx/ (MA-26; not shipped or loaded until M1; `pnpm sprites fx` builds only it), and prints a SHA-256 per file.
// Same input → same bytes; tests/unit/art/determinism.test.ts checks it in CI.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS } from '../assets-src/packs.ts';
import { fxManifestSchema, manifestSchema } from '../src/shared/pack.ts';
import {
  ATLAS_FILE,
  buildFx,
  buildPack,
  FX_FILE,
  loadMasterPalette,
  renderContext,
  ROOT,
  sha256,
} from './lib/sprites.ts';

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
  // The app reads the manifest through the same schema: fail the build, not the app (bytes stay as written).
  manifestSchema.parse(pack.manifest);
  const manifest = Buffer.from(`${JSON.stringify(pack.manifest, null, 2)}\n`);
  writeFileSync(join(dir, 'manifest.json'), manifest);
  const ms = Math.round(performance.now() - started);
  console.log(
    `${def.id}  atlas ${pack.sha256.slice(0, 16)}  manifest ${sha256(manifest).slice(0, 16)}  (${String(ms)} ms)`,
  );
}

if (only.length === 0 || only.includes('fx')) {
  const started = performance.now();
  const fx = buildFx(ctx);
  const dir = join(ROOT, 'resources', 'fx');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'sprites'), { recursive: true });
  writeFileSync(join(dir, FX_FILE), fx.atlas);
  fxManifestSchema.parse(fx.manifest);
  const manifest = Buffer.from(`${JSON.stringify(fx.manifest, null, 2)}\n`);
  writeFileSync(join(dir, 'manifest.json'), manifest);
  const ms = Math.round(performance.now() - started);
  console.log(`fx  atlas ${fx.sha256.slice(0, 16)}  manifest ${sha256(manifest).slice(0, 16)}  (${String(ms)} ms)`);
}
