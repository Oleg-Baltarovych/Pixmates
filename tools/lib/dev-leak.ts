// Production-build guard (M1-02 security review M1): dev-only main code (`src/main/dev/*`, dev switches) must be
// tree-shaken out of `out/main` by the build-time gate (`src/main/app/dev-build.ts`). Two independent checks, so a
// leak is caught even if a bundler default starts stripping comments or mangling names:
// - shape: the production main bundle is one file; any other file (a chunk emitted for an ungated `import()`) fails;
// - text: rolldown keeps a `// src/main/<path>.ts` comment per bundled module, the dev switch names are string
//   literals, and the dev modules' exported names survive in a chunk's export list.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** The only files a production `out/main` may contain (paths relative to it, `/`-separated). */
export const MAIN_BUNDLE_FILES: readonly string[] = ['index.js'];

/** Text that only dev-only code puts into a main bundle. */
export const DEV_MARKERS = [
  '// src/main/dev/',
  'desktop-spike',
  'capture-stage',
  'dev-windows',
  // Exported names of src/main/dev/capture.ts and desktop-spike.ts.
  'captureStageForDev',
  'startDesktopSpike',
  'SPIKE_MODES',
] as const;

/**
 * Every problem under `dir` (recursively; paths relative to `dir`, `/`-separated): `<file>: not in the main bundle`
 * for a file outside {@link MAIN_BUNDLE_FILES}, `<file>: <marker>` for each dev marker it contains.
 */
export function findDevLeaks(dir: string): string[] {
  const hits: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const file = relative(dir, path).replaceAll('\\', '/');
    if (!MAIN_BUNDLE_FILES.includes(file)) hits.push(`${file}: not in the main bundle`);
    const text = readFileSync(path, 'utf8');
    for (const marker of DEV_MARKERS) if (text.includes(marker)) hits.push(`${file}: ${marker}`);
  }
  return hits;
}
