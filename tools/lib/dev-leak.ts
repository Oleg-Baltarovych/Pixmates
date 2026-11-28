// Production-build guard (M1-02 security review M1): dev-only main code (`src/main/dev/*`, dev switches) must be
// tree-shaken out of `out/main` by the build-time gate (`src/main/app/dev-build.ts`). Rolldown keeps a
// `// src/main/<path>.ts` comment line per bundled module and the switch names are plain string literals, so a leak
// shows up as one of these markers in the emitted JS.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Text that only dev-only code puts into a main bundle. */
export const DEV_MARKERS = ['// src/main/dev/', 'desktop-spike', 'capture-stage', 'dev-windows'] as const;

/** Every `<file>: <marker>` hit under `dir` (all files, recursively; paths relative to `dir`, `/`-separated). */
export function findDevLeaks(dir: string): string[] {
  const hits: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const text = readFileSync(path, 'utf8');
    const file = relative(dir, path).replaceAll('\\', '/');
    for (const marker of DEV_MARKERS) if (text.includes(marker)) hits.push(`${file}: ${marker}`);
  }
  return hits;
}
