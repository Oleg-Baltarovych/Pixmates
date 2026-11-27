import { describe, expect, it } from 'vitest';
import type { CharacterPack } from '../../../src/main/characters/registry.ts';
import { StageController } from '../../../src/main/stage/controller.ts';
import type { Manifest } from '../../../src/shared/pack.ts';

/** A built-in-shaped pack: 48 × 56 frame with headroom, sized by `scaleRef` 48 (ADR 012). */
const chibi = (): CharacterPack => {
  const manifest = { frameSize: { w: 48, h: 56 }, scaleRef: 48, animations: {} } as unknown as Manifest; // test stub: the controller reads only the sizing fields
  return { id: 'pixmates.maid', dir: '', manifest, atlas: 'sprites/atlas.png' };
};

const controllerOn = (
  height: number,
  scaleFactor = 1,
  packs: readonly CharacterPack[] = [chibi()],
): StageController => {
  const display = { workArea: { x: 0, y: 0, width: 1920, height }, scaleFactor };
  return new StageController({
    stage: () => undefined,
    display: () => display,
    now: () => 0,
    seed: 1,
    characters: () => packs.map((pack) => ({ key: pack.id, pack })),
  });
};

describe('StageController scale on small displays', () => {
  it.each([
    [200, 2],
    [600, 3],
    [800, 4],
  ])('work area %s DIP: L stays within the clamp %s and «Більше» never shrinks', (height, clamp) => {
    const stage = controllerOn(height);
    stage.setPreset('l');
    expect(stage.scale).toBe(clamp);
    stage.nudge(1);
    expect(stage.scale).toBe(clamp);
    stage.nudge(-1);
    expect(stage.scale).toBeLessThanOrEqual(clamp);
    expect(stage.scale).toBeGreaterThanOrEqual(2);
  });

  it('a tiny display collapses every preset to the minimum scale', () => {
    const stage = controllerOn(120);
    for (const preset of ['s', 'm', 'l'] as const) {
      stage.setPreset(preset);
      expect(stage.scale).toBe(2);
    }
  });
});

describe('StageController fine steps with headroom (S1)', () => {
  it('«Більше» from M reaches L on a 48×56 / scaleRef 48 pack at 1080p / 125 %', () => {
    const stage = controllerOn(816, 1.25);
    stage.setPreset('l');
    const l = stage.scale;
    stage.setPreset('m');
    expect(stage.scale).toBeLessThan(l);
    stage.nudge(1);
    expect(stage.scale).toBe(l);
  });
});

describe('StageController without a valid pack (MA-30)', () => {
  it('stays at the minimum scale and ignores size changes, without throwing', () => {
    const stage = controllerOn(816, 1.25, []);
    stage.setPreset('l');
    expect(stage.scale).toBe(2);
    stage.nudge(1);
    expect(stage.scale).toBe(2);
    stage.onDisplayChanged();
    expect(stage.scale).toBe(2);
  });
});
