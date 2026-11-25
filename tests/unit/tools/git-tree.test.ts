import { describe, expect, it } from 'vitest';
import { parseCatFileBatch, parseLsTree } from '../../../tools/lib/git-tree.ts';

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
