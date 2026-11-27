// MA-32: content integrity of every built-in pack, read back through the app's own registry (manifest schema + strip
// check). Every animation, fallback target and `emotions` entry must exist as an animation of the pack (not merely
// fall through to idle), emotions are the shared four, only the q34 `walk`/`turn` face right, and the roster,
// assets-src/characters/ and assets-src/packs.ts name the same characters.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKS } from '../../../assets-src/packs.ts';
import { CLICK_REACTIONS, DEFAULT_CHARACTER, type CoreAnimation } from '../../../src/content/stage.ts';
import { loadRegistry } from '../../../src/main/characters/registry.ts';
import { builtinPackId, facingOf, resolveAnim, type Manifest } from '../../../src/shared/pack.ts';
import { ROOT } from '../../../tools/lib/sprites.ts';
import { ROSTER, writeBuiltinPacks } from '../../fixtures/builtin-packs.ts';

const EMOTIONS = ['happy', 'think', 'worried', 'startle'];
const RIGHT_FACING = new Set(['walk', 'turn']);
/** Every animation the M0 core asks for; the record forces a key per `CoreAnimation` member. */
const CORE_ANIMS = Object.keys({ idle_a: true, drag: true, happy: true, wave: true } satisfies Record<
  CoreAnimation,
  true
>);

const registry = loadRegistry(writeBuiltinPacks());
const manifestOf = (rosterId: string): Manifest => {
  const pack = registry.packs.get(builtinPackId(rosterId));
  if (!pack) throw new Error(`no pack for ${rosterId}: ${registry.errors.join('; ')}`);
  return pack.manifest;
};
const has = (m: Manifest, name: string): boolean => Object.hasOwn(m.animations, name);

describe('built-in pack content integrity (MA-32)', () => {
  it('the roster, the character sources and the pack list name the same characters', () => {
    expect(registry.errors).toEqual([]);
    const sources = readdirSync(join(ROOT, 'assets-src', 'characters'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(sources.sort()).toEqual([...ROSTER].sort());
    expect(PACKS.map((p) => p.id).sort()).toEqual(ROSTER.map((id) => builtinPackId(id)).sort());
    expect([...registry.packs.keys()].sort()).toEqual(ROSTER.map((id) => builtinPackId(id)).sort());
    expect(registry.packs.has(DEFAULT_CHARACTER)).toBe(true);
  });

  describe.each(ROSTER)('pixmates.%s', (id) => {
    const m = manifestOf(id);

    it('every animation resolves to itself and every animation src/content asks for exists', () => {
      for (const name of Object.keys(m.animations)) expect(resolveAnim(name, m)).toBe(name);
      for (const name of [...CORE_ANIMS, ...CLICK_REACTIONS]) expect(has(m, name), name).toBe(true);
    });

    it('every fallback targets an animation of the pack', () => {
      expect(Object.keys(m.fallbacks).length).toBeGreaterThan(0);
      for (const [key, target] of Object.entries(m.fallbacks)) expect(has(m, target), `${key} → ${target}`).toBe(true);
    });

    it('emotions are exactly happy, think, worried, startle and each is an animation', () => {
      expect(m.emotions).toEqual(EMOTIONS);
      for (const name of EMOTIONS) expect(has(m, name), name).toBe(true);
    });

    it('walk and turn face right, every other animation faces front', () => {
      for (const name of RIGHT_FACING) expect(has(m, name), name).toBe(true);
      for (const [name, anim] of Object.entries(m.animations)) {
        expect(facingOf(anim), name).toBe(RIGHT_FACING.has(name) ? 'right' : 'front');
      }
    });
  });
});
