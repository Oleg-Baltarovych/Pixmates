import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

// The ESLint boundary for src/core must match .claude/hooks/core-purity.mjs 1:1 (plan M0-05).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixturePath = path.join(root, 'tests/fixtures/lint/core-violations.ts');
const HOOK_RULES = [
  'platform-package',
  'node-builtin',
  'outer-layer',
  'clock',
  'random',
  'browser-global',
  'timer',
  'require',
] as const;

// The linted paths are virtual (not on disk), so typescript-eslint's project service cannot type them.
// The core-purity rules are syntactic: lint with the real config, minus the type-aware rules.
const eslint = new ESLint({ cwd: root, overrideConfig: tseslint.configs.disableTypeChecked });

async function lintAsCore(code: string, fileName: string) {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, 'src/core', fileName) });
  if (!result) throw new Error('ESLint returned no result');
  return result.messages;
}

function expectedByLine(code: string): Map<number, string> {
  const expected = new Map<number, string>();
  code.split(/\r?\n/).forEach((line, index) => {
    const tag = /\/\/ expect: ([a-z-]+)/.exec(line)?.[1];
    if (tag) expected.set(index + 1, tag);
  });
  return expected;
}

describe('ESLint core-purity boundary', () => {
  it('reports every hook rule on its tagged line and nothing else', async () => {
    const code = readFileSync(fixturePath, 'utf8');
    const expected = expectedByLine(code);
    const messages = await lintAsCore(code, '__lint-fixture__.ts');

    const actual = new Map<number, string[]>();
    for (const message of messages) {
      const tag = /core-purity\[([a-z-]+)\]/.exec(message.message)?.[1] ?? `other:${message.ruleId ?? 'fatal'}`;
      actual.set(message.line, [...(actual.get(message.line) ?? []), tag]);
    }

    expect(Object.fromEntries(actual)).toEqual(Object.fromEntries([...expected].map(([line, tag]) => [line, [tag]])));
    expect(new Set(expected.values())).toEqual(new Set(HOOK_RULES));
    expect(messages.every((message) => message.severity === 2)).toBe(true);
  });

  it('passes a clean core file with zero messages', async () => {
    const clean = [
      'export function advance(seconds: number, now: number): number {',
      '  return seconds + now;',
      '}',
      '',
    ].join('\n');
    expect(await lintAsCore(clean, '__lint-clean__.ts')).toEqual([]);
  });
});
