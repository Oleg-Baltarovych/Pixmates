// MA-31: `pnpm perf -- --character=<id>` measures a built-in character (they ship in the unpacked build).
import { describe, expect, it } from 'vitest';
import { UsageError } from '../../../tools/lib/cli.ts';
import { checkShipped, perfCharacter } from '../../../tools/lib/perf-args.ts';

describe('perfCharacter', () => {
  it('is undefined without --character (the app shows its default)', () => {
    expect(perfCharacter(['--skip-build', '--duration=60'])).toBeUndefined();
  });
  it('takes a built-in pack id or a roster id and returns the pack id', () => {
    expect(perfCharacter(['--character=pixmates.goth'])).toBe('pixmates.goth');
    expect(perfCharacter(['--skip-build', '--character=knight'])).toBe('pixmates.knight');
  });
  it('rejects anything that is not a built-in id, so a typo never measures the default silently', () => {
    for (const bad of ['Maid', '', 'pixmates.', '../maid', 'pixmates.maid;rm']) {
      expect(() => perfCharacter([`--character=${bad}`])).toThrow(UsageError);
    }
    expect(() => perfCharacter(['--character=maid', '--character=goth'])).toThrow(/once/);
  });
  it('after the build, accepts only a pack the unpacked app ships (a stale art-spike id fails)', () => {
    const shipped = ['pixmates.goth', 'pixmates.maid'];
    expect(() => {
      checkShipped('pixmates.goth', shipped);
    }).not.toThrow();
    const stale = perfCharacter(['--character=spike-maid-64soft']) ?? '';
    expect(() => {
      checkShipped(stale, shipped);
    }).toThrow(/ships no such pack.*pixmates\.goth, pixmates\.maid/);
  });
});
