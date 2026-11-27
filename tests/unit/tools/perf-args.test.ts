// MA-31 + review: `pnpm perf` parses its command line strictly (a bad flag never measures the default character
// silently), measures a built-in with `--character=<id>`, and names the report per character.
import { describe, expect, it } from 'vitest';
import { UsageError } from '../../../tools/lib/cli.ts';
import { checkShipped, parsePerfArgs, perfReportName } from '../../../tools/lib/perf-args.ts';

/** The UsageError message parsePerfArgs throws for `argv` ('' when it does not throw one). */
function usageMessage(argv: readonly string[]): string {
  try {
    parsePerfArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) return error.message;
    throw error;
  }
  return '';
}

describe('parsePerfArgs', () => {
  it('defaults: build, 30 s warm-up, 120 s measured, the app default character', () => {
    expect(parsePerfArgs([])).toEqual({ help: false, skipBuild: false, warmupS: 30, durationS: 120 });
  });
  it('reads every flag in the = form, after an optional pnpm `--` separator', () => {
    expect(parsePerfArgs(['--', '--character=knight', '--skip-build', '--warmup=10', '--duration=60'])).toEqual({
      help: false,
      skipBuild: true,
      warmupS: 10,
      durationS: 60,
      character: 'pixmates.knight',
    });
    expect(parsePerfArgs(['--character=pixmates.goth']).character).toBe('pixmates.goth');
    expect(parsePerfArgs(['--help']).help).toBe(true);
  });
  it('rejects unknown flags and stray arguments', () => {
    for (const argv of [['--scenario=idle'], ['--skipbuild'], ['maid'], ['--', '--', '--skip-build']]) {
      expect(() => parsePerfArgs(argv)).toThrow(UsageError);
    }
  });
  it('rejects the space-separated form, so `--character maid` never measures the default', () => {
    expect(() => parsePerfArgs(['--character', 'maid'])).toThrow(/--character=<value>/);
    expect(() => parsePerfArgs(['--warmup', '10'])).toThrow(/--warmup=<value>/);
    expect(() => parsePerfArgs(['--character'])).toThrow(UsageError);
  });
  it('rejects bad seconds', () => {
    for (const bad of ['abc', '0', '-5', '1.5', '', '1e3', '3601']) {
      expect(() => parsePerfArgs([`--duration=${bad}`])).toThrow(/--duration/);
    }
    expect(() => parsePerfArgs(['--warmup=0'])).toThrow(/--warmup/);
  });
  it('rejects repeated flags', () => {
    expect(() => parsePerfArgs(['--character=maid', '--character=goth'])).toThrow(/once/);
    expect(() => parsePerfArgs(['--warmup=5', '--warmup=6'])).toThrow(/once/);
  });
  it('rejects anything that is not a built-in id, echoing at most 64 chars of it', () => {
    for (const bad of ['Maid', '', 'pixmates.', '../maid', 'pixmates.maid;rm']) {
      expect(() => parsePerfArgs([`--character=${bad}`])).toThrow(/not a built-in id/);
    }
    const idMessage = usageMessage([`--character=${'x'.repeat(200)}`]);
    expect(idMessage).toContain('x'.repeat(64));
    expect(idMessage).not.toContain('x'.repeat(65));
    const unknownMessage = usageMessage([`--${'u'.repeat(200)}`]);
    expect(unknownMessage).toMatch(/unknown argument/);
    expect(unknownMessage).not.toContain('u'.repeat(65));
    const secondsMessage = usageMessage([`--duration=${'9'.repeat(200)}`]);
    expect(secondsMessage).toMatch(/--duration/);
    expect(secondsMessage).not.toContain('9'.repeat(65));
  });
});

describe('perfReportName', () => {
  it('is per date and character, so same-day runs of different characters keep their reports', () => {
    expect(perfReportName('2026-11-27', 'pixmates.maid')).toBe('2026-11-27-maid.md');
    expect(perfReportName('2026-11-27', 'pixmates.goth')).toBe('2026-11-27-goth.md');
    expect(perfReportName('2026-11-27', undefined)).toBe('2026-11-27-default.md');
  });
});

describe('checkShipped', () => {
  it('after the build, accepts only a pack the unpacked app ships (a stale art-spike id fails)', () => {
    const shipped = ['pixmates.goth', 'pixmates.maid'];
    expect(() => {
      checkShipped('pixmates.goth', shipped);
    }).not.toThrow();
    expect(() => {
      checkShipped('pixmates.knight', shipped);
    }).toThrow(/ships no such pack.*pixmates\.goth, pixmates\.maid/);
  });
});
