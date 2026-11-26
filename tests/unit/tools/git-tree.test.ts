import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UsageError } from '../../../tools/lib/cli.ts';
import {
  containedPath,
  exportTree,
  parseCatFileBatch,
  parseLsTree,
  resolveCommit,
} from '../../../tools/lib/git-tree.ts';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

describe('parseLsTree', () => {
  it('reads NUL-separated entries, keeping tabs and spaces in paths', () => {
    const out = [
      `100644 blob ${A}\tassets-src/packs.ts`,
      `120000 blob ${B}\tassets-src/odd name\twith tab.ts`,
      '',
    ].join('\0');
    expect(parseLsTree(out)).toEqual([
      { mode: '100644', type: 'blob', object: A, path: 'assets-src/packs.ts' },
      { mode: '120000', type: 'blob', object: B, path: 'assets-src/odd name\twith tab.ts' },
    ]);
  });

  it('throws on a line it does not understand', () => {
    expect(() => parseLsTree('garbage\0')).toThrow(/ls-tree/);
  });
});

describe('parseCatFileBatch', () => {
  it('splits contents by the declared sizes, binary and newlines included', () => {
    const body = Buffer.from([0x0a, 0x00, 0xff, 0x0a]);
    const out = Buffer.concat([Buffer.from(`${A} blob 3\nabc\n${B} blob 4\n`), body, Buffer.from('\n')]);
    expect(parseCatFileBatch(out)).toEqual([Buffer.from('abc'), body]);
  });

  it('throws on a missing object or a truncated body', () => {
    expect(() => parseCatFileBatch(Buffer.from(`${A} missing\n`))).toThrow(/missing/);
    expect(() => parseCatFileBatch(Buffer.from(`${A} blob 10\nabc\n`))).toThrow(/truncated/);
  });
});

describe('containedPath', () => {
  const root = join(tmpdir(), 'pixmates-root');

  it('resolves a repository-relative path inside root', () => {
    expect(containedPath(root, 'assets-src/a b.ts')).toBe(join(root, 'assets-src', 'a b.ts'));
  });

  it.each(['../x', 'a/../../x', '/etc/x', '\\\\server\\share', 'C:/x', 'C:x', 'c:\\x'])('refuses %j', (path) => {
    expect(() => containedPath(root, path)).toThrow(/refusing/);
  });
});

describe('exportTree / resolveCommit on a temp repository', () => {
  const TEXT = 'line one\nline two\n';
  const binary = Buffer.from([0x00, 0xff, 0x0d, 0x0a, 0x89, 0x50, 0x4e, 0x47, 0x0a]);
  let repo = '';
  let dest = '';
  let commit = '';
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: repo, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      .toString('utf8')
      .trim();

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'pixmates-git-tree-repo-'));
    dest = mkdtempSync(join(tmpdir(), 'pixmates-git-tree-out-'));
    git('init', '-q');
    git('config', 'core.autocrlf', 'false');
    mkdirSync(join(repo, 'assets-src', 'sub'), { recursive: true });
    writeFileSync(join(repo, 'assets-src', 'a b.txt'), TEXT);
    writeFileSync(join(repo, 'assets-src', 'sub', 'atlas.bin'), binary);
    writeFileSync(join(repo, 'outside.txt'), 'not exported');
    git('add', '-A');
    git(
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-qm',
      'x',
    );
    commit = git('rev-parse', 'HEAD');
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(dest, { recursive: true, force: true });
  });

  it('resolves HEAD and round-trips text with spaces in the name and binary bytes', () => {
    expect(resolveCommit('HEAD', repo)).toBe(commit);
    expect(exportTree(commit, 'assets-src', dest, repo)).toBe(2);
    expect(readFileSync(join(dest, 'assets-src', 'a b.txt'), 'utf8')).toBe(TEXT);
    expect(readFileSync(join(dest, 'assets-src', 'sub', 'atlas.bin'))).toEqual(binary);
    expect(() => readFileSync(join(dest, 'outside.txt'))).toThrow();
  });

  it('refuses option-like refs and reports unknown refs as usage errors', () => {
    expect(() => resolveCommit('--evil', repo)).toThrow(UsageError);
    expect(() => resolveCommit('no-such-branch', repo)).toThrow(UsageError);
    expect(() => resolveCommit('no-such-branch', repo)).toThrow(/unknown git ref/);
  });

  it('lets failures other than an unknown ref through (not a repository)', () => {
    const notRepo = join(dest, `not-a-repo${sep}`);
    mkdirSync(notRepo, { recursive: true });
    let error: unknown;
    try {
      resolveCommit('HEAD', notRepo);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UsageError);
  });
});
