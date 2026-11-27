// `pnpm perf -- --character=<id>` (MA-31): which built-in the packaged app measures. Built-ins ship in the unpacked
// build, so the id is only passed through as the app's own `--character=pixmates.<id>`. Anything else is a usage
// error, so a typo never measures the default character under another name.
import { toBuiltinId } from '../../src/shared/pack.ts';
import { UsageError } from './cli.ts';

const FLAG = '--character=';

/** The built-in pack id named by `--character=` (roster id `maid` or pack id `pixmates.maid`), or undefined. */
export function perfCharacter(argv: readonly string[]): string | undefined {
  const values = argv.filter((a) => a.startsWith(FLAG)).map((a) => a.slice(FLAG.length));
  if (values.length > 1) throw new UsageError('--character may be given once');
  const [value] = values;
  if (value === undefined) return undefined;
  const id = toBuiltinId(value);
  if (id === undefined) throw new UsageError(`--character=${JSON.stringify(value)} is not a built-in id`);
  return id;
}

/** After the build: the measured pack must be one the unpacked app ships (`shipped` = its characters folders). */
export function checkShipped(id: string, shipped: readonly string[]): void {
  if (!shipped.includes(id)) {
    throw new UsageError(`--character=${id}: the unpacked build ships no such pack (has: ${shipped.join(', ')})`);
  }
}
