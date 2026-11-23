// Which packs go on stage (plan M-ART MA-11). Product: one character (D-8). Dev art lineup: the four spike variants,
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

export function selectCharacters({ packs, requested, lineup }: SelectionInput): StageCharacter[] {
  if (lineup) {
    return lineup.slice(0, LINEUP_LABELS.length).flatMap((id, i) => {
      const pack = packs.get(id);
      const label = LINEUP_LABELS[i];
      return pack && label ? [{ key: label, label, pack }] : [];
    });
  }
  const pack = (requested !== undefined ? packs.get(requested) : undefined) ?? packs.get(DEFAULT_CHARACTER);
  return pack ? [{ key: pack.id, pack }] : [];
}
