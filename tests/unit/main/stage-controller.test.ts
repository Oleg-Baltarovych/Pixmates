import type { BrowserWindow } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterPack } from '../../../src/main/characters/registry.ts';
import { StageController } from '../../../src/main/stage/controller.ts';
import type { Manifest } from '../../../src/shared/pack.ts';

/** A built-in-shaped pack: 48 × 56 frame with headroom, sized by `scaleRef` 48 (ADR 012). */
const chibi = (): CharacterPack => {
  const manifest = { frameSize: { w: 48, h: 56 }, scaleRef: 48, animations: { idle_a: {} } } as unknown as Manifest; // test stub: the controller reads only the sizing fields and animation names
  return { id: 'pixmates.maid', dir: '', manifest, atlas: 'sprites/atlas.png', atlasSize: { width: 48, height: 56 } };
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

/** The window calls `attach` makes; nothing is rendered. */
const fakeWindow = (): BrowserWindow =>
  ({
    setIgnoreMouseEvents: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    webContents: { on: vi.fn() },
  }) as unknown as BrowserWindow; // test stub: attach touches only these members

interface Rig {
  readonly stage: StageController;
  readonly display: { workArea: { x: number; y: number; width: number; height: number }; scaleFactor: number };
  readonly packs: CharacterPack[];
}

function rig(packs: CharacterPack[] = [chibi()]): Rig {
  const display = { workArea: { x: 0, y: 0, width: 1920, height: 1032 }, scaleFactor: 1.25 };
  const stage = new StageController({
    stage: () => undefined,
    display: () => display,
    now: () => 0,
    seed: 1,
    characters: () => packs.map((pack) => ({ key: pack.id, pack })),
  });
  return { stage, display, packs };
}

describe('StageController keeps the core world in sync', () => {
  it('builds the core on attach from the display, scale and layer', () => {
    const { stage } = rig();
    stage.attach(fakeWindow());
    expect(stage.core?.world).toMatchObject({
      workArea: { width: 1920, height: 1032 },
      scale: stage.scale,
      scaleFactor: 1.25,
      layer: 'on-top',
    });
  });

  it('pushes a new world on setLayer, setPreset, nudge and display changes', () => {
    const { stage, display } = rig();
    stage.attach(fakeWindow());
    stage.setLayer('desktop');
    expect(stage.core?.world.layer).toBe('desktop');
    stage.setPreset('s');
    expect(stage.core?.world.scale).toBe(stage.scale);
    stage.nudge(1);
    expect(stage.core?.world.scale).toBe(stage.scale);
    display.workArea = { x: 0, y: 0, width: 2560, height: 1392 };
    display.scaleFactor = 1.5;
    stage.onDisplayChanged();
    expect(stage.core?.world).toMatchObject({ workArea: { width: 2560, height: 1392 }, scaleFactor: 1.5 });
    expect(stage.core?.world.scale).toBe(stage.scale);
  });

  it('has no core without a pack and builds it once a pack appears', () => {
    const { stage, packs } = rig([]);
    stage.attach(fakeWindow());
    expect(stage.core).toBeUndefined();
    stage.setLayer('desktop');
    expect(stage.core).toBeUndefined();
    packs.push(chibi());
    stage.onDisplayChanged();
    expect(stage.core?.character.id).toBe('pixmates.maid');
    expect(stage.core?.world.layer).toBe('desktop');
  });
});

describe('StageController logs rejected events sparingly', () => {
  it('logs the first rejection per event and reason, then only at powers of ten with the count', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const { stage, display } = rig();
      stage.attach(fakeWindow());
      display.workArea = { x: 0, y: 0, width: Number.NaN, height: 1032 };
      for (let i = 0; i < 12; i++) stage.onDisplayChanged();
      expect(warn.mock.calls).toEqual([
        ['[core] rejected world: non-finite'],
        ['[core] rejected world: non-finite (×10)'],
      ]);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('StageController with a pack the core refuses', () => {
  it('logs the refusal once, not on every later event', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const pack = chibi();
      const noIdle: CharacterPack = { ...pack, manifest: { ...pack.manifest, animations: {} } };
      const { stage } = rig([noIdle]);
      stage.attach(fakeWindow());
      stage.setLayer('desktop');
      stage.onDisplayChanged();
      expect(stage.core).toBeUndefined();
      expect(error.mock.calls).toEqual([['[core] initial state rejected: no-idle']]);
    } finally {
      error.mockRestore();
    }
  });
});
