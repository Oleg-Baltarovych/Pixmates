import { describe, expect, it } from 'vitest';
import { LAND } from '../../../assets-src/rig/anims/land.ts';
import { LAND_PLAY } from '../../../src/content/physics.ts';

describe('land timing (core/physics.ts reads LAND_PLAY, never the manifest)', () => {
  it('LAND_PLAY = the authored land: same frame count and fps, played once (a hard landing holds its last frame)', () => {
    expect({ frames: LAND.frames.length, fps: LAND.fps }).toEqual(LAND_PLAY);
    expect(LAND.loop).toBe(false);
  });
});
