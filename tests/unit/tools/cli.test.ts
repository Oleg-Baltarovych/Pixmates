import { describe, expect, it } from 'vitest';
import { parseCli, UsageError, wantsHelp } from '../../../tools/lib/cli.ts';

const spec = {
  usage: 'Usage: tool <id> [--base <ref>]',
  options: { base: { type: 'string' }, close: { type: 'boolean' } },
  positionals: true,
} as const;

describe('parseCli', () => {
  it('returns typed flags and positionals', () => {
    const parsed = parseCli(spec, ['pixmates.goth', '--base', 'HEAD~2', '--close']);
    expect(parsed.positionals).toEqual(['pixmates.goth']);
    expect(parsed.values.base).toBe('HEAD~2');
    expect(parsed.values.close).toBe(true);
    expect(wantsHelp(parsed)).toBe(false);
  });

  it('recognises --help and -h', () => {
    expect(wantsHelp(parseCli(spec, ['--help']))).toBe(true);
    expect(wantsHelp(parseCli(spec, ['-h']))).toBe(true);
  });

  it('turns an unknown flag or a missing value into a UsageError naming it', () => {
    expect(() => parseCli(spec, ['--bsae', 'x'])).toThrow(UsageError);
    expect(() => parseCli(spec, ['--bsae', 'x'])).toThrow(/--bsae/);
    expect(() => parseCli(spec, ['--base'])).toThrow(UsageError);
  });

  it('rejects positionals when the tool takes none', () => {
    expect(() => parseCli({ usage: '', options: {} }, ['stray'])).toThrow(/stray/);
  });
});
