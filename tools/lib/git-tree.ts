// Exports one directory of a past revision into a scratch folder without touching the working tree or the index:
// `git ls-tree -r -z` lists the blobs, a single `git cat-file --batch` streams their contents. Used by
// `pnpm sprites:compare` to build the "before" pack from the base revision's assets-src.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
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

const git = (args: readonly string[], input?: string): Buffer =>
  execFileSync('git', args, { cwd: ROOT, input, maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });

/** Resolves `ref` to a commit id; throws a readable error for an unknown ref (refs starting with `-` are refused). */
export function resolveCommit(ref: string): string {
  if (ref.startsWith('-')) throw new Error(`invalid git ref '${ref}'`);
  try {
    return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
      .toString('utf8')
      .trim();
  } catch {
    throw new Error(`unknown git ref '${ref}'`);
  }
}

/** Writes every regular file under `dir` at `commit` to `<dest>/<dir>/…`; returns the number of files written. */
export function exportTree(commit: string, dir: string, dest: string): number {
  const entries = parseLsTree(git(['ls-tree', '-r', '-z', commit, '--', dir]).toString('utf8')).filter(
    (e) => e.type === 'blob' && e.mode !== '120000',
  );
  if (entries.length === 0) throw new Error(`'${dir}' does not exist at ${commit.slice(0, 12)}`);
  const blobs = parseCatFileBatch(git(['cat-file', '--batch'], `${entries.map((e) => e.object).join('\n')}\n`));
  if (blobs.length !== entries.length)
    throw new Error(`git cat-file returned ${String(blobs.length)} of ${String(entries.length)} blobs`);
  const root = resolve(dest);
  entries.forEach((entry, i) => {
    const file = resolve(root, entry.path);
    if (relative(root, file).split(sep).includes('..')) throw new Error(`refusing path outside dest: ${entry.path}`);
    mkdirSync(dirname(file), { recursive: true });
    // Same length as entries (checked above); the fallback only satisfies noUncheckedIndexedAccess.
    writeFileSync(file, blobs[i] ?? Buffer.alloc(0));
  });
  return entries.length;
}
