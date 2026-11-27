import { describe, expect, it } from 'vitest';
import {
  idleFrameRect,
  TRAY_ICON_DIP,
  TRAY_ICON_PX,
  trayIconCrop,
  trayIconProblem,
  type IconFrames,
  type IconRect,
} from '../../../src/main/services/tray-icon.ts';

const frames = (over: Partial<IconFrames> = {}): IconFrames => ({
  frameSize: { w: 48, h: 56 },
  animations: {
    walk: { origin: { x: 0, y: 0 } },
    idle_a: { origin: { x: 96, y: 112 } },
  },
  fallbacks: { '*': 'idle_a' },
  ...over,
});

/** A transparent BGRA/RGBA image with opaque boxes (alpha at byte 3 of each px, as in both layouts). */
function image(width: number, height: number, boxes: readonly IconRect[]) {
  const data = new Uint8Array(width * height * 4);
  for (const box of boxes) {
    for (let y = box.y; y < box.y + box.height; y++) {
      for (let x = box.x; x < box.x + box.width; x++) data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}

const FRAME: IconRect = { x: 96, y: 112, width: 48, height: 56 };

describe('tray icon source frame (MA-30)', () => {
  it('is frame 0 of idle_a', () => {
    expect(idleFrameRect(frames())).toEqual(FRAME);
  });

  it('follows the pack idle when there is no idle_a (fallback branch)', () => {
    const plainIdle = frames({ animations: { idle: { origin: { x: 48, y: 0 } } }, fallbacks: {} });
    expect(idleFrameRect(plainIdle)).toEqual({ x: 48, y: 0, width: 48, height: 56 });
  });

  it('reads a missing origin as the atlas corner (SPEC §5.1)', () => {
    expect(idleFrameRect(frames({ animations: { idle_a: {} } }))).toEqual({ x: 0, y: 0, width: 48, height: 56 });
  });

  it('gives no frame when the pack has no idle animation at all', () => {
    expect(idleFrameRect(frames({ animations: { walk: { origin: { x: 0, y: 0 } } }, fallbacks: {} }))).toBeUndefined();
  });
});

describe('tray icon crop (owner: headwear must not be clipped)', () => {
  it('starts at the top opaque row of the figure and centres on it', () => {
    // Head 20 wide at frame rows 7.., body below: the crop's top row is the figure's top row.
    const img = image(256, 256, [
      { x: 96 + 14, y: 112 + 7, width: 20, height: 26 },
      { x: 96 + 12, y: 112 + 33, width: 24, height: 23 },
    ]);
    const crop = trayIconCrop(FRAME, img);
    expect(crop).toEqual({
      rect: { x: 96 + 8, y: 112 + 7, width: TRAY_ICON_PX, height: TRAY_ICON_PX },
      scaleFactor: TRAY_ICON_PX / TRAY_ICON_DIP,
    });
  });

  it('keeps a tall hat that starts above the old fixed figure-top row', () => {
    const img = image(256, 256, [
      { x: 96 + 20, y: 112 + 2, width: 10, height: 6 }, // hat tip
      { x: 96 + 12, y: 112 + 8, width: 24, height: 48 },
    ]);
    expect(trayIconCrop(FRAME, img)?.rect.y).toBe(112 + 2);
  });

  it('widens the square past 32 px for wide headwear (ears) and scales it back to 16 DIP', () => {
    // Ears span 34 columns (8..41) in the head rows: the crop grows to 34 and keeps both tips.
    const img = image(256, 256, [
      { x: 96 + 8, y: 112 + 7, width: 34, height: 3 },
      { x: 96 + 11, y: 112 + 10, width: 26, height: 46 },
    ]);
    const crop = trayIconCrop(FRAME, img);
    expect(crop?.rect).toEqual({ x: 96 + 8, y: 112 + 7, width: 34, height: 34 });
    expect(crop?.scaleFactor).toBe(34 / TRAY_ICON_DIP);
  });

  it('ignores opaque px of neighbouring frames and keeps the crop inside the frame', () => {
    // Neighbour frame fully opaque; figure hugs the frame's right edge near the bottom.
    const img = image(256, 256, [
      { x: 96 + 48, y: 112, width: 48, height: 56 },
      { x: 96 + 30, y: 112 + 40, width: 18, height: 16 },
    ]);
    expect(trayIconCrop(FRAME, img)?.rect).toEqual({ x: 96 + 16, y: 112 + 24, width: 32, height: 32 });
  });

  it('gives no crop for an empty frame or a frame outside the image', () => {
    expect(trayIconCrop(FRAME, image(256, 256, []))).toBeUndefined();
    expect(trayIconCrop(FRAME, image(100, 100, [{ x: 0, y: 0, width: 100, height: 100 }]))).toBeUndefined();
  });
});

describe('tray icon guards (security review: privileged decode of pack bytes in main)', () => {
  const pack = { id: 'pixmates.maid', atlasSize: { width: 256, height: 128 } };

  it('accepts a built-in pack whose decoded atlas matches the header size the registry checked', () => {
    expect(trayIconProblem(pack, { width: 256, height: 128 })).toBeUndefined();
  });

  it('refuses a pack that is not a built-in (no imports yet)', () => {
    expect(trayIconProblem({ ...pack, id: 'spike-maid-48soft' }, { width: 256, height: 128 })).toMatch(/built-in/);
  });

  it('refuses a decode whose size differs from the validated header (swapped or odd file)', () => {
    expect(trayIconProblem(pack, { width: 256, height: 127 })).toMatch(/256×127.*256×128/);
    expect(trayIconProblem(pack, { width: 0, height: 0 })).toMatch(/0×0/);
  });
});
