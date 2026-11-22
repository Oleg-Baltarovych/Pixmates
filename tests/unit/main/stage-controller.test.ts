import { describe, expect, it } from 'vitest';
import { StageController } from '../../../src/main/stage/controller.ts';

const controllerOn = (height: number, scaleFactor = 1): StageController => {
  const display = { workArea: { x: 0, y: 0, width: 1920, height }, scaleFactor };
  return new StageController({ stage: () => undefined, display: () => display, now: () => 0, seed: 1 });
};

describe('StageController scale on small displays', () => {
  it.each([
    [200, 2],
    [400, 3],
    [600, 4],
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
