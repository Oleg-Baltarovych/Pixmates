// Shared by the built-in pack tests (MA-30, MA-32): the v1 roster and a temp folder holding every built-in pack exactly
// as `pnpm build` writes resources/characters/, so tests read them back through the app's own registry.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildOutput, OUTPUT_IDS } from '../../tools/lib/sprite-outputs.ts';
import { loadMasterPalette, renderContext } from '../../tools/lib/sprites.ts';

/** Roster v1 (D-18): 4 female + 4 male. */
export const ROSTER = ['maid', 'kitsune', 'witch', 'goth', 'ronin', 'coder', 'knight', 'vampire'] as const;

/** Builds every `pnpm sprites` character output into a new temp folder (one sub-folder per pack id) and returns it. */
export function writeBuiltinPacks(): string {
  const root = mkdtempSync(join(tmpdir(), 'pixmates-packaged-'));
  const ctx = renderContext(loadMasterPalette());
  for (const id of OUTPUT_IDS) {
    const output = buildOutput(id, ctx);
    // Same layout as resources/characters/<id>/ (the FX atlas goes elsewhere).
    if (!output.dir.startsWith(join('resources', 'characters'))) continue;
    for (const file of output.files) {
      const target = join(root, id, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.bytes);
    }
  }
  return root;
}
