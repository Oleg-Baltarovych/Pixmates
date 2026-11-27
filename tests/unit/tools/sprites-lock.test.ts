// Sprite fingerprint: resources/characters/ and resources/fx/ are git-ignored, so the committed
// assets-src/sprites.lock.json holds a SHA-256 per output file. Every pack is built in memory exactly as
// `pnpm sprites` writes it; a change to any pack must arrive as a reviewable lock diff (`pnpm sprites:lock`).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildAllOutputs,
  LOCK_UPDATE_COMMAND,
  lockMismatch,
  lockOf,
  readLock,
  type SpritesLock,
} from '../../../tools/lib/sprite-outputs.ts';
import { loadMasterPalette, renderContext, ROOT } from '../../../tools/lib/sprites.ts';

const actual = lockOf(buildAllOutputs(renderContext(loadMasterPalette())));

describe('sprites.lock.json', () => {
  it('matches every pack built from assets-src (run the printed command if the change is intended)', () => {
    expect(lockMismatch(readLock(), actual), 'sprite packs differ from the lock').toBeNull();
  });

  it('names the changed pack and file and prints the update command for a wrong lock', () => {
    const wrong: SpritesLock = structuredClone(actual);
    const ronin = wrong['pixmates.ronin'];
    if (!ronin) throw new Error('pixmates.ronin is not built');
    ronin['sprites/atlas.png'] = '0'.repeat(64);
    const message = lockMismatch(wrong, actual) ?? '';
    expect(message).toContain('pixmates.ronin');
    expect(message).toContain('sprites/atlas.png');
    expect(message).toContain(LOCK_UPDATE_COMMAND);
    expect(message).not.toContain('pixmates.maid');
  });

  it('reports packs missing from or extra in the lock', () => {
    const noFx = Object.fromEntries(Object.entries(actual).filter(([id]) => id !== 'fx'));
    expect(lockMismatch(noFx, actual)).toContain('fx');
    expect(lockMismatch({ ...actual, 'pixmates.ghost': {} }, actual)).toContain('pixmates.ghost');
  });

  it('prints an update command that package.json actually defines', () => {
    const script = LOCK_UPDATE_COMMAND.replace(/^pnpm /, '');
    const { scripts } = z
      .object({ scripts: z.record(z.string(), z.string()) })
      .parse(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')));
    expect(scripts[script]).toContain('tools/sprites-lock.ts');
  });
});
