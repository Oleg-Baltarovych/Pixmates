// Dev-only blind lineup key (plan M-ART phase 1, owner decision Q5): which spike pack hides behind A–D. Kept in
// reports/art-spike/key.txt (git-ignored) so every launch shows the same mapping until the file is deleted.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { LINEUP_LABELS } from '../characters/selection.ts';

const LINE = /^([A-D]) = (spike-[a-z0-9-]{1,48})$/;

/** Parses `A = spike-maid-48soft` lines; undefined unless they are exactly a permutation of `ids` in A–D order. */
export function parseKey(text: string, ids: readonly string[]): string[] | undefined {
  const order: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = LINE.exec(line);
    if (!match || match[1] !== LINEUP_LABELS[order.length]) return undefined;
    order.push(match[2] ?? '');
  }
  const same = order.length === ids.length && [...order].sort().join() === [...ids].sort().join();
  return same ? order : undefined;
}

export function formatKey(order: readonly string[], now: Date): string {
  const lines = order.map((id, i) => `${LINEUP_LABELS[i] ?? '?'} = ${id}`);
  return `# Pixmates art spike, blind key (${now.toISOString()}). Delete this file to reshuffle.\n${lines.join('\n')}\n`;
}

/** Fisher–Yates with an injected integer source (crypto randomInt in main). */
export function shuffle<T>(items: readonly T[], randomInt: (max: number) => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

/** Reads the key if it still matches `ids`, otherwise shuffles and writes a new one. */
export function lineupOrder(file: string, ids: readonly string[], randomInt: (max: number) => number): string[] {
  try {
    const existing = parseKey(readFileSync(file, 'utf8'), ids);
    if (existing) return existing;
  } catch {
    // no key yet
  }
  const order = shuffle(ids, randomInt);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, formatKey(order, new Date()));
  return order;
}
