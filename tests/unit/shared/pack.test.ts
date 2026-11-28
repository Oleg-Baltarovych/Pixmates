// Built-in id normalization shared by `--character` (pnpm perf) and `--art-lineup` (dev stage), MA-31 review.
import { describe, expect, it } from 'vitest';
import { ANIM_NAME, ANIM_NAME_MAX, toBuiltinId } from '../../../src/shared/pack.ts';

describe('toBuiltinId', () => {
  it('maps a roster id or a built-in pack id to the pack id', () => {
    expect(toBuiltinId('maid')).toBe('pixmates.maid');
    expect(toBuiltinId('pixmates.goth')).toBe('pixmates.goth');
    expect(toBuiltinId('dummy-a')).toBe('pixmates.dummy-a');
  });
  it('is undefined for anything that cannot be a built-in', () => {
    for (const bad of [
      '',
      'Maid',
      'pixmates.',
      'pixmates.pixmates.maid',
      '../maid',
      'maid;rm',
      'spike.maid',
      ' maid',
    ]) {
      expect(toBuiltinId(bad)).toBeUndefined();
    }
  });
});

describe('ANIM_NAME_MAX', () => {
  it('is the longest name the manifest pattern admits', () => {
    const longest = `a${'b'.repeat(31)}:${'c'.repeat(32)}`;
    expect(longest).toHaveLength(ANIM_NAME_MAX);
    expect(ANIM_NAME.test(longest)).toBe(true);
    expect(ANIM_NAME.test(`${longest}c`)).toBe(false);
    expect(ANIM_NAME.test(`a${'b'.repeat(32)}`)).toBe(false);
  });
});
