// Built-in id normalization shared by `--character` (pnpm perf) and `--art-lineup` (dev stage), MA-31 review.
import { describe, expect, it } from 'vitest';
import { toBuiltinId } from '../../../src/shared/pack.ts';

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
