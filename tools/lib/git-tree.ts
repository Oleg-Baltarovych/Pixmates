// Exports one directory of a past revision into a scratch folder without touching the working tree or the index:
// `git ls-tree -r -z` lists the blobs, a single `git cat-file --batch` streams their contents. Used by
// `pnpm sprites:compare` to build the "before" pack from the base revision's assets-src.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { UsageError } from './cli.ts';
import { ROOT } from './sprites.ts';

export interface TreeEntry {
  readonly mode: string;
  readonly type: string;
  readonly object: string;
  readonly path: string;
}

/** Parses `git ls-tree -r -z` output: `<mode> SP <type> SP <object> TAB <path> NUL` per entry. */
export function parseLsTree(out: string): TreeEntry[] {
  return out
    .split('\0')
    .filter((line) => line.length > 0)
    .map((line) => {
      const m = /^(\d{6}) (\w+) ([0-9a-f]{40,64})\t(.+)$/s.exec(line);
      if (!m) throw new Error(`unexpected git ls-tree line: ${JSON.stringify(line)}`);
      const [, mode = '', type = '', object = '', path = ''] = m;
      return { mode, type, object, path };
    });
}

/** Splits `git cat-file --batch` output (`<object> SP <type> SP <size> LF <bytes> LF` per object) into the contents. */
export function parseCatFileBatch(out: Buffer): Buffer[] {
  const blobs: Buffer[] = [];
  let at = 0;
  while (at < out.length) {
    const eol = out.indexOf(0x0a, at);
    if (eol < 0) throw new Error('truncated git cat-file header');
    const header = out.toString('utf8', at, eol);
    const m = /^[0-9a-f]{40,64} \w+ (\d+)$/.exec(header);
    if (!m) throw new Error(`git cat-file: ${header}`);
    const size = Number(m[1]);
    const start = eol + 1;
    if (start + size + 1 > out.length) throw new Error('truncated git cat-file body');
    blobs.push(out.subarray(start, start + size));
    at = start + size + 1;
  }
  return blobs;
}

/** Upper bound for one git command's output: a whole assets-src export is a few MB. */
const GIT_MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

const git = (repo: string, args: readonly string[], input?: string): Buffer =>
  execFileSync('git', args, {
    cwd: repo,
    input,
    maxBuffer: GIT_MAX_OUTPUT_BYTES,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

/** `git rev-parse --verify --quiet` exits 1 (and prints nothing) only when the ref does not resolve. */
const isUnknownRef = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === 1;

/**
 * Resolves `ref` to a commit id in `repo`. An unknown ref, or one starting with `-` (it would read as an option), is a
 * UsageError; anything else (git missing, not a repository) propagates unchanged.
 */
export function resolveCommit(ref: string, repo = ROOT): string {
  if (ref.startsWith('-')) throw new UsageError(`invalid git ref '${ref}'`);
  try {
    return git(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
      .toString('utf8')
      .trim();
  } catch (error) {
    if (isUnknownRef(error)) throw new UsageError(`unknown git ref '${ref}'`);
    throw error;
  }
}

/**
 * `<root>/<path>` for a repository-relative path; throws for anything that could land outside `root`: absolute or
 * drive-letter paths (`/x`, `C:/x`, `C:x`) and `..` escapes.
 */
export function containedPath(root: string, path: string): string {
  const base = resolve(root);
  if (isAbsolute(path) || /^([A-Za-z]:|[\\/])/.test(path)) {
    throw new Error(`refusing absolute path: ${path}`);
  }
  const file = resolve(base, path);
  if (!file.startsWith(base + sep)) throw new Error(`refusing path outside ${base}: ${path}`);
  return file;
}

/** Writes every regular file under `dir` at `commit` to `<dest>/<dir>/…`; returns the number of files written. */
export function exportTree(commit: string, dir: string, dest: string, repo = ROOT): number {
  const entries = parseLsTree(git(repo, ['ls-tree', '-r', '-z', commit, '--', dir]).toString('utf8')).filter(
    (e) => e.type === 'blob' && e.mode !== '120000',
  );
  if (entries.length === 0) throw new Error(`'${dir}' does not exist at ${commit.slice(0, 12)}`);
  const blobs = parseCatFileBatch(git(repo, ['cat-file', '--batch'], `${entries.map((e) => e.object).join('\n')}\n`));
  if (blobs.length !== entries.length) {
    throw new Error(`git cat-file returned ${String(blobs.length)} of ${String(entries.length)} blobs`);
  }
  entries.forEach((entry, i) => {
    const file = containedPath(dest, entry.path);
    mkdirSync(dirname(file), { recursive: true });
    // Same length as entries (checked above); the fallback only satisfies noUncheckedIndexedAccess.
    writeFileSync(file, blobs[i] ?? Buffer.alloc(0));
  });
  return entries.length;
}
