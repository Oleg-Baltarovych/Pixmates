// Last step of `pnpm build` (and so of `pnpm dist:dir`, `pnpm perf` and CI): fails when the production main bundle
// in out/main contains dev-only code (tools/lib/dev-leak.ts).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCli, runCli, wantsHelp } from './lib/cli.ts';
import { findDevLeaks } from './lib/dev-leak.ts';

const USAGE = `Usage: node tools/check-build.ts

Scans out/main (run after electron-vite build) for dev-only code; exits 1 when any is found.`;

await runCli(USAGE, () => {
  if (wantsHelp(parseCli({ usage: USAGE, options: {} }, process.argv.slice(2)))) {
    console.log(USAGE);
    return;
  }
  const dir = join(import.meta.dirname, '..', 'out', 'main');
  if (!existsSync(dir)) throw new Error(`${dir} is missing: run electron-vite build first`);
  const leaks = findDevLeaks(dir);
  if (leaks.length > 0) {
    console.error(`check-build: dev-only code in the production main bundle:\n  ${leaks.join('\n  ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('check-build: out/main has no dev-only code');
});
