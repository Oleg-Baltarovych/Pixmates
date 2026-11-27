import { describe, expect, it } from 'vitest';
import { trayIconRect, TRAY_ICON_PX } from '../../../src/main/services/tray-icon.ts';
import { manifestSchema } from '../../../src/shared/pack.ts';

const manifest = (over: Record<string, unknown> = {}) =>
  manifestSchema.parse({
    id: 'pixmates.maid',
    name: 'Maid',
    version: '0.0.1',
    frameSize: { w: 48, h: 56 },
    scaleRef: 48,
    anchor: { x: 0.5, y: 1 },
    animations: {
      walk: { file: 'sprites/atlas.png', frames: 8, fps: 10, loop: true, origin: { x: 0, y: 0 } },
      idle_a: { file: 'sprites/atlas.png', frames: 8, fps: 6, loop: true, origin: { x: 96, y: 112 } },
    },
    fallbacks: { '*': 'idle_a' },
    ...over,
  });

describe('tray icon from the active character (MA-30, replaces the placeholder icon)', () => {
  it('crops a 32-px square from the top of the standing figure in idle_a frame 0, centred', () => {
    expect(TRAY_ICON_PX).toBe(32);
    // Figure top = frame h − scaleRef = row 8; centred: (48 − 32) / 2 = 8.
    expect(trayIconRect(manifest())).toEqual({ x: 96 + 8, y: 112 + 8, width: 32, height: 32 });
  });

  it('uses the frame height when there is no scaleRef and clamps the crop to a small frame', () => {
    const small = manifest({
      frameSize: { w: 16, h: 16 },
      scaleRef: undefined,
      animations: {
        walk: { file: 'sprites/atlas.png', frames: 2, fps: 8, loop: true, origin: { x: 0, y: 16 } },
        idle_a: { file: 'sprites/atlas.png', frames: 2, fps: 8, loop: true, origin: { x: 0, y: 0 } },
      },
    });
    expect(trayIconRect(small)).toEqual({ x: 0, y: 0, width: 16, height: 16 });
  });
});
