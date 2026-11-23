// Every pack `pnpm sprites` builds, in build order. M-ART phase 1: the four `maid` spike variants (pixel anime, D-13: 48/64 × anime cel / anime soft) (A–D are assigned
// blind by the lineup, not here). Phase 2 replaces these with the rigged built-ins.
import { RIG_48 } from './spike/maid-48/rig.ts';
import { RIG_64 } from './spike/maid-64/rig.ts';
import { createMaidPack, STYLES } from './spike/maid.ts';
import type { PackDef } from './lib/types.ts';

export const PACKS: readonly PackDef[] = [
  createMaidPack(RIG_48, STYLES.cel),
  createMaidPack(RIG_48, STYLES.soft),
  createMaidPack(RIG_64, STYLES.cel),
  createMaidPack(RIG_64, STYLES.soft),
];
