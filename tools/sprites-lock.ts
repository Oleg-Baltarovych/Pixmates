// `pnpm sprites:lock`: rewrites assets-src/sprites.lock.json from the packs built in memory (nothing is written to
// resources/). Run it only when a pack is meant to change; the lock diff is what review sees (tools/lib/sprite-outputs.ts).
import { writeFileSync } from 'node:fs';
import { parseCli, runCli, wantsHelp } from './lib/cli.ts';
import { buildAllOutputs, LOCK_FILE, lockBytes, lockOf, readLock } from './lib/sprite-outputs.ts';
import { loadMasterPalette, renderContext } from './lib/sprites.ts';

const USAGE = `Usage: pnpm sprites:lock

Builds every pack and the FX atlas in memory and writes their SHA-256s to assets-src/sprites.lock.json.
Commit the lock diff together with the asset change that caused it.`;

runCli(USAGE, () => {
  if (wantsHelp(parseCli({ usage: USAGE, options: {} }, process.argv.slice(2)))) {
    console.log(USAGE);
    return;
  }
  const before = readLock();
  const lock = lockOf(buildAllOutputs(renderContext(loadMasterPalette())));
  writeFileSync(LOCK_FILE, lockBytes(lock));
  for (const [id, files] of Object.entries(lock)) {
    const changed = JSON.stringify(files) !== JSON.stringify(before[id]);
    console.log(`${changed ? 'updated  ' : 'unchanged'}  ${id}`);
  }
  for (const id of Object.keys(before)) if (!(id in lock)) console.log(`removed    ${id}`);
});
