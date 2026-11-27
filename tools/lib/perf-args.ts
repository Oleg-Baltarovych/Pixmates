// `pnpm perf` command line (MA-31 + review): strict, so an unknown flag, a bad value or the space-separated form is a
// usage error (exit 2) and never measures the default character under another name. `--character=<id>` names a
// built-in (they ship in the unpacked build); its pack id is passed through as the app's own `--character`.
import { BUILTIN_PREFIX, toBuiltinId } from '../../src/shared/pack.ts';
import { parseCli, UsageError, wantsHelp } from './cli.ts';

export const PERF_USAGE =
  'Usage: pnpm perf [-- --character=<id>] [--skip-build] [--warmup=<s>] [--duration=<s>]\n\n' +
  '  --character=<id>  built-in to measure (maid or pixmates.maid); default = the app default character\n' +
  '  --skip-build      reuse release/win-unpacked (rebuild first if it predates your change)\n' +
  '  --warmup=<s>      seconds before sampling (default 30)\n' +
  '  --duration=<s>    seconds sampled at 1 Hz (default 120)\n' +
  'Values use the = form only.';

export interface PerfArgs {
  readonly help: boolean;
  readonly skipBuild: boolean;
  readonly warmupS: number;
  readonly durationS: number;
  /** Built-in pack id; absent = the app's default character. */
  readonly character?: string;
}

const DEFAULTS = { warmupS: 30, durationS: 120 } as const;
/** Longest seconds value accepted (one hour). */
const MAX_SECONDS = 3600;
/** Longest piece of an argv value echoed into an error. */
const ECHO_MAX = 64;
const VALUE_FLAGS = ['character', 'warmup', 'duration'] as const;
const KNOWN_FLAGS: ReadonlySet<string> = new Set([...VALUE_FLAGS.map((f) => `--${f}`), '--skip-build', '--help', '-h']);

const shown = (value: string): string => JSON.stringify(value.slice(0, ECHO_MAX));

function seconds(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = /^\d{1,4}$/.test(raw) ? Number(raw) : NaN;
  if (!(value >= 1 && value <= MAX_SECONDS)) {
    throw new UsageError(`--${name}=${shown(raw)}: needs whole seconds 1–${String(MAX_SECONDS)}`);
  }
  return value;
}

/** Parses `pnpm perf` arguments (`process.argv.slice(2)`); throws a UsageError on anything it does not accept. */
export function parsePerfArgs(argv: readonly string[]): PerfArgs {
  // pnpm forwards the `--` of `pnpm perf -- --character=maid` to the script.
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  for (const name of VALUE_FLAGS) {
    if (args.includes(`--${name}`)) throw new UsageError(`use --${name}=<value> (the = form only)`);
  }
  // Checked here rather than by parseArgs, whose messages echo the whole (untrusted) argument.
  const unknown = args.find((a) => !KNOWN_FLAGS.has(a.split('=', 1)[0] ?? ''));
  if (unknown !== undefined) throw new UsageError(`unknown argument ${shown(unknown)}`);
  const { values } = parseCli(
    {
      usage: PERF_USAGE,
      options: {
        character: { type: 'string', multiple: true },
        warmup: { type: 'string', multiple: true },
        duration: { type: 'string', multiple: true },
        'skip-build': { type: 'boolean', multiple: true },
      },
    },
    args,
  );
  const once = (name: string, list: readonly unknown[] | undefined): void => {
    if (list !== undefined && list.length > 1) throw new UsageError(`--${name} may be given once`);
  };
  once('character', values.character);
  once('warmup', values.warmup);
  once('duration', values.duration);
  once('skip-build', values['skip-build']);
  const [rawCharacter] = values.character ?? [];
  const character = rawCharacter === undefined ? undefined : toBuiltinId(rawCharacter);
  if (rawCharacter !== undefined && character === undefined) {
    throw new UsageError(`--character=${shown(rawCharacter)} is not a built-in id`);
  }
  return {
    help: wantsHelp({ values }),
    skipBuild: values['skip-build']?.[0] === true,
    warmupS: seconds('warmup', values.warmup?.[0], DEFAULTS.warmupS),
    durationS: seconds('duration', values.duration?.[0], DEFAULTS.durationS),
    ...(character === undefined ? {} : { character }),
  };
}

/** Report file name: one per date and character (`2026-11-27-maid.md`), so same-day runs do not overwrite. */
export function perfReportName(date: string, character: string | undefined): string {
  return `${date}-${character === undefined ? 'default' : character.slice(BUILTIN_PREFIX.length)}.md`;
}

/** After the build: the measured pack must be one the unpacked app ships (`shipped` = its characters folders). */
export function checkShipped(id: string, shipped: readonly string[]): void {
  if (!shipped.includes(id)) {
    throw new UsageError(`--character=${id}: the unpacked build ships no such pack (has: ${shipped.join(', ')})`);
  }
}
