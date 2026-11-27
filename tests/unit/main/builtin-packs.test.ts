// MA-30: what a packaged build ships. Every built-in pack `pnpm sprites` produces is written to a temp folder exactly
// as `pnpm build` writes resources/characters/, then read back by the registry (`pixmates.*` only).
// A packaged app with no valid default character must fail here, not show an empty stage.
import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER } from '../../../src/content/stage.ts';
import { loadRegistry } from '../../../src/main/characters/registry.ts';
import { selectCharacters } from '../../../src/main/characters/selection.ts';
import { builtinPackId, isBuiltinPackId } from '../../../src/shared/pack.ts';
import { ROSTER, writeBuiltinPacks } from '../../fixtures/builtin-packs.ts';

describe('packaged built-in packs (MA-30)', () => {
  const registry = loadRegistry(writeBuiltinPacks());

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
