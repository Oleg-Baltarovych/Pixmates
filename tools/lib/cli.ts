// Shared CLI plumbing for the tools/ scripts: typed flags on top of node:util parseArgs (strict, so a typo is an
// error, not a silently ignored flag), a `--help` that prints the usage, and one exit path for usage errors.
import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';

/** A bad command line: printed with the usage, exit code 2. */
export class UsageError extends Error {
  override readonly name = 'UsageError';
}

export interface CliSpec<O extends ParseArgsOptionsConfig> {
  /** Usage text printed for `--help` and after a usage error. */
  readonly usage: string;
  readonly options: O;
  readonly positionals?: boolean;
}

const HELP = { help: { type: 'boolean', short: 'h' } } as const;

export type ParsedCli<O extends ParseArgsOptionsConfig> = ReturnType<
  typeof parseArgs<{ options: O & typeof HELP; allowPositionals: true; strict: true }>
>;

/** Parses `argv` against `spec`; unknown flags, missing values and stray positionals become a UsageError. */
export function parseCli<O extends ParseArgsOptionsConfig>(spec: CliSpec<O>, argv: readonly string[]): ParsedCli<O> {
  let parsed: ParsedCli<O>;
  try {
    parsed = parseArgs({
      args: [...argv],
      options: { ...spec.options, ...HELP },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
  if (spec.positionals !== true && parsed.positionals.length > 0) {
    throw new UsageError(`Unexpected argument '${parsed.positionals.join(' ')}'`);
  }
  return parsed;
}

/** True when the command line asks for help. */
export const wantsHelp = (parsed: { readonly values: { readonly help?: unknown } }): boolean =>
  parsed.values.help === true;

/** Runs a tool's main: a UsageError prints the message and the usage (exit 2); any other error propagates (exit 1). */
export async function runCli(usage: string, main: () => void | Promise<void>): Promise<void> {
  try {
    await main();
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`error: ${error.message}\n\n${usage}`);
      process.exitCode = 2;
      return;
    }
    throw error;
  }
}
