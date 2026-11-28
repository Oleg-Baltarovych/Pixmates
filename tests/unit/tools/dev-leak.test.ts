import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findDevLeaks } from '../../../tools/lib/dev-leak.ts';

const root = join(import.meta.dirname, '..', '..', '..');
let dir: string | undefined;

function outDir(files: Record<string, string>): string {
  dir = mkdtempSync(join(tmpdir(), 'pixmates-dev-leak-'));
  for (const [name, text] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return dir;
}

afterEach(() => {
  if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('findDevLeaks', () => {
  it('passes a bundle without dev code', () => {
    expect(findDevLeaks(outDir({ 'index.js': '// src/main/index.ts\nmain();\n' }))).toEqual([]);
  });

  it('names a dev chunk and a dev switch left in the entry', () => {
    const leaks = findDevLeaks(
      outDir({
        'index.js': 'const dir = argValue("capture-stage");\n',
        'chunks/desktop-spike-abc.js': '// src/main/dev/desktop-spike.ts\n',
      }),
    );
    expect(leaks).toEqual(
      expect.arrayContaining([
        'index.js: capture-stage',
        'chunks/desktop-spike-abc.js: // src/main/dev/',
        'chunks/desktop-spike-abc.js: desktop-spike',
      ]),
    );
  });

  // The markers must be what the dev code really contains, or the check would pass on a real leak.
  it('matches the dev block in src/main/index.ts', () => {
    const index = readFileSync(join(root, 'src', 'main', 'index.ts'), 'utf8');
    const bundle = outDir({ 'index.js': index });
    expect(findDevLeaks(bundle)).toEqual(
      expect.arrayContaining(['index.js: desktop-spike', 'index.js: capture-stage', 'index.js: dev-windows']),
    );
  });
});
