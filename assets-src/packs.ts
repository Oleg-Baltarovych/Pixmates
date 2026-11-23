// Every pack `pnpm sprites` builds, in build order. M-ART phase 2: the two anime-soft `maid` spike packs (ADR 009
// picked 48 soft; the cel packs were deleted in MA-22) stay dev-only until MA-31; the rigged built-ins join from MA-27.
import { RIG_48 } from './spike/maid-48/rig.ts';
import { RIG_64 } from './spike/maid-64/rig.ts';
import { createMaidPack } from './spike/maid.ts';
import type { PackDef } from './lib/types.ts';

export const PACKS: readonly PackDef[] = [createMaidPack(RIG_48), createMaidPack(RIG_64)];
