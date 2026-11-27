// MA-30: what a packaged build ships. Every built-in pack `pnpm sprites` produces is written to a temp folder exactly
// as `pnpm build` writes resources/characters/, then read back by the registry (`pixmates.*` only).
// A packaged app with no valid default character must fail here, not show an empty stage.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER } from '../../../src/content/stage.ts';
import { loadRegistry } from '../../../src/main/characters/registry.ts';
import { selectCharacters } from '../../../src/main/characters/selection.ts';
import { builtinPackId, isBuiltinPackId } from '../../../src/shared/pack.ts';
import { buildOutput, OUTPUT_IDS } from '../../../tools/lib/sprite-outputs.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

/** Roster v1 (D-18): 4 female + 4 male. */
const ROSTER = ['maid', 'kitsune', 'witch', 'goth', 'ronin', 'coder', 'knight', 'vampire'] as const;

const root = mkdtempSync(join(tmpdir(), 'pixmates-packaged-'));
const ctx = renderContext(loadMasterPalette());
for (const id of OUTPUT_IDS) {
  const output = buildOutput(id, ctx);
  // Same layout as resources/characters/<id>/.
  if (!output.dir.startsWith(join('resources', 'characters'))) continue;
  for (const file of output.files) {
    const target = join(root, id, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.bytes);
  }
}

describe('packaged built-in packs (MA-30)', () => {
  const registry = loadRegistry(root);

  it('every built-in pack is valid and the packaged registry lists exactly the roster', () => {
    expect(registry.errors).toEqual([]);
    expect([...registry.packs.keys()].sort()).toEqual(ROSTER.map((id) => builtinPackId(id)).sort());
    for (const id of registry.packs.keys()) expect(isBuiltinPackId(id)).toBe(true);
  });

  it('the default character is among them, so the packaged stage is never empty', () => {
    expect(DEFAULT_CHARACTER).toBe(builtinPackId('maid'));
    const selection = selectCharacters({ packs: registry.packs });
    expect(selection.error).toBeUndefined();
    expect(selection.characters.map((c) => c.pack.id)).toEqual([DEFAULT_CHARACTER]);
  });

  it.each(ROSTER)('--character=pixmates.%s puts that pack on stage', (id) => {
    const selection = selectCharacters({ packs: registry.packs, requested: builtinPackId(id) });
    expect(selection.warning).toBeUndefined();
    expect(selection.characters.map((c) => c.pack.id)).toEqual([builtinPackId(id)]);
  });
});
