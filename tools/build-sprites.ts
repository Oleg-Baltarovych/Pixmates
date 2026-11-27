// `pnpm sprites` (plan M-ART MA-08): builds every pack in assets-src/packs.ts into resources/characters/<id>/
// (manifest.json + sprites/atlas.png; generated, git-ignored, never edited) plus the FX marks atlas into
// resources/fx/ (MA-26; not shipped or loaded until M1; `pnpm sprites fx` builds only it), and prints a SHA-256 per file.
// Same input → same bytes; assets-src/sprites.lock.json fingerprints the result (tests/unit/tools/sprites-lock.test.ts).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseCli, runCli, UsageError, wantsHelp } from './lib/cli.ts';
import { buildOutput, OUTPUT_IDS } from './lib/sprite-outputs.ts';
import { loadMasterPalette, renderContext, ROOT, sha256 } from './lib/sprites.ts';

const USAGE = `Usage: pnpm sprites [<id>…]

Builds the listed outputs (default: all) into resources/characters/<id>/ and resources/fx/.
Ids: ${OUTPUT_IDS.join(', ')}`;

await runCli(USAGE, () => {
  const args = parseCli({ usage: USAGE, options: {}, positionals: true }, process.argv.slice(2));
  if (wantsHelp(args)) {
    console.log(USAGE);
    return;
  }
  const unknown = args.positionals.filter((id) => !OUTPUT_IDS.includes(id));
  if (unknown.length > 0) throw new UsageError(`unknown id ${unknown.map((id) => `'${id}'`).join(', ')}`);
  const ctx = renderContext(loadMasterPalette());
  for (const id of OUTPUT_IDS.filter((i) => args.positionals.length === 0 || args.positionals.includes(i))) {
    const started = performance.now();
    const pack = buildOutput(id, ctx);
    const dir = join(ROOT, pack.dir);
    rmSync(dir, { recursive: true, force: true });
    for (const file of pack.files) {
      mkdirSync(dirname(join(dir, file.path)), { recursive: true });
      writeFileSync(join(dir, file.path), file.bytes);
    }
    const hashes = pack.files.map((f) => `${f.path} ${sha256(f.bytes).slice(0, 16)}`).join('  ');
    console.log(`${id}  ${hashes}  (${String(Math.round(performance.now() - started))} ms)`);
  }
});
