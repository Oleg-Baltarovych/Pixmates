// Which packs go on stage (plan M-ART MA-11, MA-30). Product: one character (D-8), `--character=pixmates.<id>` or
// the default; no valid pack → an error and an empty stage. Dev art lineup (MA-31): `--art-lineup=<ids>` puts up to 4
// built-ins side by side, labelled A–D in the given order (unpackaged builds only).
import { DEFAULT_CHARACTER } from '../../content/stage.ts';
import { toBuiltinId } from '../../shared/pack.ts';
import type { CharacterPack } from './registry.ts';

export interface StageCharacter {
  readonly key: string;
  readonly label?: LineupLabel;
  readonly pack: CharacterPack;
}

export interface SelectionInput {
  readonly packs: ReadonlyMap<string, CharacterPack>;
  /** `--character=<id>` (dev / perf); else the default character. */
  readonly requested?: string | undefined;
  /** Dev lineup (`parseArtLineup`): pack ids in label order A, B, C, D. */
  readonly lineup?: readonly string[] | undefined;
}

export const LINEUP_LABELS = ['A', 'B', 'C', 'D'] as const;
export type LineupLabel = (typeof LINEUP_LABELS)[number];

export interface Selection {
  /** On stage, in order; empty when no valid pack is left (the stage then stays empty, MA-30). */
  readonly characters: readonly StageCharacter[];
  /** A requested pack was not found and the default stands in. */
  readonly warning?: string;
  /** Nothing to show. Packaged builds cannot get here: tests/unit/main/builtin-packs.test.ts fails the build first. */
  readonly error?: string;
}

/** What `--art-lineup` asked for: nothing, a valid lineup, or why it was rejected (the stage then shows the solo pick). */
export type ArtLineup =
  | { readonly kind: 'none' }
  | { readonly kind: 'lineup'; readonly ids: readonly string[] }
  | { readonly kind: 'error'; readonly error: string };

const LINEUP_FLAG = '--art-lineup';

/** Longest `--character` value echoed into a log line. */
const LOG_ID_MAX = 64;

/** Untrusted argv text → printable ASCII only (no newlines, escapes or bidi controls in a log line). */
const printable = (text: string): string => text.replace(/[^ -~]/gu, '?');

export function selectCharacters({ packs, requested, lineup }: SelectionInput): Selection {
  // A dev lineup overrides `requested` (`--character` is ignored while `--art-lineup` runs).
  const characters = lineup ? lineupCharacters(packs, lineup) : soloCharacter(packs, requested);
  if (characters.length === 0) {
    const missing = lineup ? 'none of the lineup packs' : `not even the default ${DEFAULT_CHARACTER}`;
    return { characters, error: `no valid character pack (${missing}): the stage stays empty` };
  }
  if (!lineup && requested !== undefined && !packs.has(requested)) {
    const shown = JSON.stringify(printable(requested.slice(0, LOG_ID_MAX)));
    return { characters, warning: `--character=${shown}: no valid pack with that id, showing ${DEFAULT_CHARACTER}` };
  }
  return { characters };
}

function lineupCharacters(packs: ReadonlyMap<string, CharacterPack>, lineup: readonly string[]): StageCharacter[] {
  return lineup.slice(0, LINEUP_LABELS.length).flatMap((id, i) => {
    const pack = packs.get(id);
    const label = LINEUP_LABELS[i];
    return pack && label ? [{ key: label, label, pack }] : [];
  });
}

function soloCharacter(packs: ReadonlyMap<string, CharacterPack>, requested: string | undefined): StageCharacter[] {
  const pack = (requested !== undefined ? packs.get(requested) : undefined) ?? packs.get(DEFAULT_CHARACTER);
  return pack ? [{ key: pack.id, pack }] : [];
}

/**
 * `--art-lineup=<ids>` (comma-separated roster ids `maid` or pack ids `pixmates.maid`) → up to 4 built-in pack ids
 * from `packs`, in order. Dev-only: a packaged build rejects the flag. Ids are untrusted argv text: errors echo them
 * printable and length-capped.
 */
export function parseArtLineup(
  argv: readonly string[],
  packs: ReadonlyMap<string, CharacterPack>,
  packaged: boolean,
): ArtLineup {
  const arg = argv.find((a) => a === LINEUP_FLAG || a.startsWith(`${LINEUP_FLAG}=`));
  if (arg === undefined) return { kind: 'none' };
  const fail = (why: string): ArtLineup => ({ kind: 'error', error: `${LINEUP_FLAG}: ${why}; no lineup` });
  if (packaged) return fail('dev-only, ignored in a packaged build');
  const value = arg.slice(LINEUP_FLAG.length + 1);
  const usage = `needs 1–${String(LINEUP_LABELS.length)} built-in ids, e.g. ${LINEUP_FLAG}=maid,goth,kitsune,witch`;
  if (value === '') return fail(usage);
  const raw = value.split(',');
  if (raw.length > LINEUP_LABELS.length) {
    return fail(`at most ${String(LINEUP_LABELS.length)} characters per view, got ${String(raw.length)}`);
  }
  const ids: string[] = [];
  for (const entry of raw) {
    if (entry === '') return fail(`empty id in the list (${usage})`);
    const id = toBuiltinId(entry);
    if (id === undefined || !packs.has(id)) {
      const shown = JSON.stringify(printable(entry.slice(0, LOG_ID_MAX)));
      return fail(`${shown} is not a built-in character (known: ${[...packs.keys()].join(', ')})`);
    }
    if (ids.includes(id)) return fail(`${id} is listed twice`);
    ids.push(id);
  }
  return { kind: 'lineup', ids };
}
