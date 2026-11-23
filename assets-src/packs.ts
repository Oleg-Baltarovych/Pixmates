// Every pack `pnpm sprites` builds, in build order. M-ART phase 2: the two anime-soft `maid` spike packs (ADR 009
// picked 48 soft; the cel packs were deleted in MA-22) stay dev-only until MA-31; the rigged built-ins join from MA-27
// (`pixmates.maid` first).
import { createMaidPack } from './characters/maid/body.ts';
import { RIG_48 } from './spike/maid-48/rig.ts';
import { RIG_64 } from './spike/maid-64/rig.ts';
import { createMaidPack as createSpikePack } from './spike/maid.ts';
import type { PackDef } from './lib/types.ts';

export const PACKS: readonly PackDef[] = [createMaidPack(), createSpikePack(RIG_48), createSpikePack(RIG_64)];
