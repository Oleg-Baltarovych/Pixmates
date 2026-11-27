// Every pack `pnpm sprites` builds, in build order: the 8 rigged built-ins (art-spike packs deleted in MA-31)
// (`pixmates.maid` first, `pixmates.kitsune` MA-28, `pixmates.goth` MA-29, `pixmates.witch` MA-29a, `pixmates.ronin` MA-29b, `pixmates.coder` MA-66, `pixmates.knight` MA-67, `pixmates.vampire` MA-68).
import { createCoderPack } from './characters/coder/body.ts';
import { createGothPack } from './characters/goth/body.ts';
import { createKitsunePack } from './characters/kitsune/body.ts';
import { createKnightPack } from './characters/knight/body.ts';
import { createMaidPack } from './characters/maid/body.ts';
import { createRoninPack } from './characters/ronin/body.ts';
import { createVampirePack } from './characters/vampire/body.ts';
import { createWitchPack } from './characters/witch/body.ts';
import type { PackDef } from './lib/types.ts';

export const PACKS: readonly PackDef[] = [
  createMaidPack(),
  createKitsunePack(),
  createGothPack(),
  createWitchPack(),
  createRoninPack(),
  createCoderPack(),
  createKnightPack(),
  createVampirePack(),
];
