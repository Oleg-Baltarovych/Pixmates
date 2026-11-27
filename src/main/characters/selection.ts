// Which packs go on stage (plan M-ART MA-11, MA-30). Product: one character (D-8), `--character=pixmates.<id>` or
// the default; no valid pack → an error and an empty stage. Dev art lineup: the four spike variants,
// blind-labelled A–D in the order of the key (reports/art-spike/key.txt, see dev/lineup.ts).
import { DEFAULT_CHARACTER } from '../../content/stage.ts';
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
  /** Dev lineup: pack ids in label order A, B, C, D. */
  readonly lineup?: readonly string[] | undefined;
}

export const LINEUP_LABELS = ['A', 'B', 'C', 'D'] as const;
export type LineupLabel = (typeof LINEUP_LABELS)[number];

export interface Selection {
  /** On stage, in order; empty when no valid pack is left (the stage then stays empty, MA-30). */
  readonly characters: StageCharacter[];
  /** A requested pack was not found and the default stands in. */
  readonly warning?: string;
  /** Nothing to show. Packaged builds cannot get here: tests/unit/main/builtin-packs.test.ts fails the build first. */
  readonly error?: string;
}

/** Longest `--character` value echoed into a log line. */
const LOG_ID_MAX = 64;

export function selectCharacters({ packs, requested, lineup }: SelectionInput): Selection {
  const characters = lineup ? lineupCharacters(packs, lineup) : soloCharacter(packs, requested);
  if (characters.length === 0) {
    const missing = lineup ? 'none of the lineup packs' : `not even the default ${DEFAULT_CHARACTER}`;
    return { characters, error: `no valid character pack (${missing}): the stage stays empty` };
  }
  if (!lineup && requested !== undefined && !packs.has(requested)) {
    const shown = JSON.stringify(requested.slice(0, LOG_ID_MAX));
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
