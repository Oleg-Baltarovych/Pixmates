import { describe, expect, it } from 'vitest';
import {
  SPRITE_FRAME_HEIGHT_ART,
  SURFACE_MIN_WIDTH_ART,
  SURFACE_MOVED_TOLERANCE_DIP,
} from '../../../src/content/desktop.ts';
import { surfaceUnder, visibleTops, type WindowTop } from '../../../src/core/surfaces.ts';
import type { Placement } from '../../../src/core/types.ts';
import { makeWindow } from '../../fixtures/core-state.ts';

const WORK_AREA = { width: 1920, height: 1032 } as const;
/** ×4 at 125 %: 3.2 DIP per art px. */
const ART_PX_DIP = 3.2;
/** The 56-px frame at that size: 179.2 DIP of headroom. */
const HEADROOM = SPRITE_FRAME_HEIGHT_ART * ART_PX_DIP;
const MIN_WIDTH = SURFACE_MIN_WIDTH_ART * ART_PX_DIP;

const top = (id: string, left: number, right: number, y: number) => ({ kind: 'window_top', id, left, right, y });

/**
 * A front window clear of every case below: a refusing case still has to return its edge, so an empty result never
 * passes for the wrong reason.
 */
const KEEP = makeWindow('keep', 1500, 700, 200, 100);
const KEPT = top('keep', 1500, 1700, 700);
const only = (...windows: Parameters<typeof makeWindow>[]) => [KEEP, ...windows.map((w) => makeWindow(...w))];

describe('visibleTops: window top edges the character can stand on', () => {
  it('a lone window gives its whole top edge', () => {
    expect(visibleTops([makeWindow('a', 300, 400, 800, 500)], WORK_AREA, ART_PX_DIP)).toEqual([
      top('a', 300, 1100, 400),
    ]);
  });

  describe('occlusion by windows in front', () => {
    it('a front window over the middle of the edge splits it into two segments', () => {
      const front = makeWindow('front', 600, 200, 300, 600);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([
        top('front', 600, 900, 200),
        top('back', 300, 600, 400),
        top('back', 900, 1100, 400),
      ]);
    });

    it('a window behind never covers one in front', () => {
      const front = makeWindow('front', 300, 400, 800, 500);
      const back = makeWindow('back', 600, 200, 300, 600);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([
        top('front', 300, 1100, 400),
        top('back', 600, 900, 200),
      ]);
    });

    it('an edge fully under a front window is gone', () => {
      const front = makeWindow('front', 200, 300, 1200, 600);
      const back = makeWindow('back', 400, 500, 600, 300);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([top('front', 200, 1400, 300)]);
    });

    it('a front window that ends exactly at the edge does not cover it', () => {
      const front = makeWindow('front', 300, 200, 800, 200);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([
        top('front', 300, 1100, 200),
        top('back', 300, 1100, 400),
      ]);
    });

    it('a front window starting at the same height hides the shared part of the edge', () => {
      const front = makeWindow('front', 700, 400, 800, 500);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([
        top('front', 700, 1500, 400),
        top('back', 300, 700, 400),
      ]);
    });

    it('several front windows cut several gaps (multi-segment), left to right', () => {
      const a = makeWindow('a', 400, 100, 200, 400);
      const b = makeWindow('b', 1000, 300, 200, 400);
      const back = makeWindow('back', 100, 350, 1700, 400);
      const tops = visibleTops([a, b, back], WORK_AREA, ART_PX_DIP).filter((surface) => surface.id === 'back');
      expect(tops).toEqual([top('back', 100, 400, 350), top('back', 600, 1000, 350), top('back', 1200, 1800, 350)]);
    });

    it('overlapping front windows merge into one gap', () => {
      const a = makeWindow('a', 400, 100, 400, 400);
      const b = makeWindow('b', 600, 250, 400, 400);
      const back = makeWindow('back', 100, 300, 1200, 400);
      const tops = visibleTops([a, b, back], WORK_AREA, ART_PX_DIP).filter((surface) => surface.id === 'back');
      expect(tops).toEqual([top('back', 100, 400, 300), top('back', 1000, 1300, 300)]);
    });
  });

  describe('inside the work area', () => {
    it('clips an edge that runs past the left and right sides', () => {
      expect(visibleTops([makeWindow('a', -200, 400, 2400, 500)], WORK_AREA, ART_PX_DIP)).toEqual([
        top('a', 0, 1920, 400),
      ]);
    });

    it('drops a window that lies off the work area sideways', () => {
      expect(visibleTops(only(['a', 1920, 400, 600, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
      expect(visibleTops(only(['b', -700, 400, 600, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });

    it('drops an edge at or below the floor (the taskbar edge is the floor)', () => {
      expect(visibleTops(only(['a', 300, 1032, 600, 200]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
      expect(visibleTops(only(['b', 300, 1100, 600, 200]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });
  });

  describe('sprite headroom', () => {
    it('keeps an edge with exactly the sprite height above it', () => {
      expect(visibleTops([makeWindow('a', 300, HEADROOM, 800, 500)], WORK_AREA, ART_PX_DIP)).toEqual([
        top('a', 300, 1100, HEADROOM),
      ]);
    });

    it('drops an edge too close to the top of the work area', () => {
      expect(visibleTops(only(['a', 300, HEADROOM - 1, 800, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });

    it('the headroom follows the sprite size', () => {
      const small = 1.6; // 56 × 1.6 = 89.6 DIP of headroom
      expect(visibleTops(only(['a', 300, 120, 800, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
      expect(visibleTops([makeWindow('a', 300, 120, 800, 500)], WORK_AREA, small)).toEqual([top('a', 300, 1100, 120)]);
    });
  });

  describe('maximised windows', () => {
    it('a maximised window has no top to stand on and hides every window behind it', () => {
      const maximised = makeWindow('max', 0, 0, 1920, 1032);
      const behind = makeWindow('behind', 300, 400, 800, 500);
      expect(visibleTops([KEEP, maximised, behind], WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });

    it('DWM bounds of a maximised window may overhang the work area a little: still excluded', () => {
      expect(visibleTops(only(['max', -8, -8, 1936, 1048]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });

    it('a window in front of a maximised one keeps its edge', () => {
      const front = makeWindow('front', 300, 400, 800, 500);
      const maximised = makeWindow('max', 0, 0, 1920, 1032);
      expect(visibleTops([front, maximised], WORK_AREA, ART_PX_DIP)).toEqual([top('front', 300, 1100, 400)]);
    });
  });

  describe('minimum width', () => {
    it('keeps a segment exactly the minimum width', () => {
      // At x = 0 the width is exact in floating point. At x = 300, 300 + 102.4 − 300 falls a hair under 102.4 and
      // drops this exact-minimum window: known and harmless.
      expect(visibleTops([makeWindow('a', 0, 400, MIN_WIDTH, 500)], WORK_AREA, ART_PX_DIP)).toEqual([
        top('a', 0, MIN_WIDTH, 400),
      ]);
    });

    it('drops a window narrower than the minimum', () => {
      expect(visibleTops(only(['a', 300, 400, MIN_WIDTH - 1, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });

    it('drops a sliver left between front windows, keeps the wide parts', () => {
      const a = makeWindow('a', 400, 100, 300, 400);
      const b = makeWindow('b', 750, 100, 300, 400);
      const back = makeWindow('back', 100, 300, 1500, 400);
      const tops = visibleTops([a, b, back], WORK_AREA, ART_PX_DIP).filter((surface) => surface.id === 'back');
      expect(tops).toEqual([top('back', 100, 400, 300), top('back', 1050, 1600, 300)]);
    });

    it('drops a sliver left by clipping at the screen side', () => {
      expect(visibleTops(only(['a', 1900, 400, 600, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });

    it('the minimum follows the sprite size', () => {
      const big = 4; // min width 128 DIP
      const window = makeWindow('a', 300, 400, 110, 500);
      expect(visibleTops([window], WORK_AREA, ART_PX_DIP)).toEqual([top('a', 300, 410, 400)]);
      expect(visibleTops([KEEP, window], WORK_AREA, big)).toEqual([KEPT]);
    });
  });

  it('is deterministic and leaves its input unchanged', () => {
    const windows = [makeWindow('front', 600, 200, 300, 600), makeWindow('back', 300, 400, 800, 500)];
    const copy = structuredClone(windows);
    const expected = [top('front', 600, 900, 200), top('back', 300, 600, 400), top('back', 900, 1100, 400)];
    expect(visibleTops(windows, WORK_AREA, ART_PX_DIP)).toEqual(expected);
    expect(visibleTops(windows, WORK_AREA, ART_PX_DIP)).toEqual(expected);
    expect(windows).toEqual(copy);
  });

  describe('more occlusion edges', () => {
    it('a front window partly outside the work area cuts the edge at the screen side', () => {
      const front = makeWindow('front', -300, 200, 700, 600);
      const back = makeWindow('back', 100, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([
        top('front', 0, 400, 200),
        top('back', 400, 900, 400),
      ]);
    });

    it('a taller front window whose bottom is exactly at the edge does not cover it', () => {
      const front = makeWindow('front', 400, 200, 300, 200);
      const back = makeWindow('back', 300, 400, 800, 100);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([
        top('front', 400, 700, 200),
        top('back', 300, 1100, 400),
      ]);
    });

    it('windows with the same top keep front-to-back order', () => {
      const a = makeWindow('a', 1000, 400, 300, 300);
      const b = makeWindow('b', 200, 400, 300, 300);
      expect(visibleTops([a, b], WORK_AREA, ART_PX_DIP)).toEqual([top('a', 1000, 1300, 400), top('b', 200, 500, 400)]);
    });
  });

  describe('degenerate rects', () => {
    it('a zero-width front window inside an edge does not split it', () => {
      const front = makeWindow('front', 600, 200, 0, 600);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([top('back', 300, 1100, 400)]);
    });

    it('a negative-width front window does not produce overlapping segments', () => {
      const front = makeWindow('front', 800, 200, -200, 600);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ART_PX_DIP)).toEqual([top('back', 300, 1100, 400)]);
    });

    it('a window with no width or no height has no top', () => {
      expect(visibleTops(only(['a', 300, 400, 0, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
      expect(visibleTops(only(['b', 300, 400, -800, 500]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
      expect(visibleTops(only(['c', 300, 400, 800, 0]), WORK_AREA, ART_PX_DIP)).toEqual([KEPT]);
    });
  });
});

describe('surfaceUnder: the segment a standing character is still on', () => {
  const on = (id: string, x: number, y: number): Placement => ({
    surface: { kind: 'window_top', id, left: 300, right: 1100, y },
    x,
    y,
  });
  const segment = (id: string, left: number, right: number, y: number): WindowTop => ({
    kind: 'window_top',
    id,
    left,
    right,
    y,
  });

  it('finds the segment of the same window that holds x', () => {
    const tops = [segment('back', 300, 600, 400), segment('back', 900, 1100, 400)];
    expect(surfaceUnder(tops, on('back', 1000, 400))).toEqual(segment('back', 900, 1100, 400));
  });

  it('still finds it after an occluder moved and changed the segment ends', () => {
    // Stood on [300, 1100); a window in front now covers [700, 1000), so the part under x shrank to [300, 700).
    const tops = [segment('front', 700, 1000, 200), segment('back', 300, 700, 400), segment('back', 1000, 1100, 400)];
    expect(surfaceUnder(tops, on('back', 500, 400))).toEqual(segment('back', 300, 700, 400));
  });

  it('left is inside, right is outside (half-open)', () => {
    const tops = [segment('a', 300, 600, 400)];
    expect(surfaceUnder(tops, on('a', 300, 400))).toEqual(segment('a', 300, 600, 400));
    expect(surfaceUnder(tops, on('a', 600, 400))).toBeNull();
  });

  it('x now hidden under a front window: no surface (fall)', () => {
    const tops = [segment('back', 300, 600, 400), segment('back', 900, 1100, 400)];
    expect(surfaceUnder(tops, on('back', 700, 400))).toBeNull();
  });

  it('a window shifted within the tolerance is the same surface', () => {
    const y = 400 + SURFACE_MOVED_TOLERANCE_DIP;
    expect(surfaceUnder([segment('a', 300, 1100, y)], on('a', 500, 400))).toEqual(segment('a', 300, 1100, y));
  });

  it('a window moved vertically beyond the tolerance is not (window moved: fall)', () => {
    const up = 400 - SURFACE_MOVED_TOLERANCE_DIP - 0.5;
    const down = 400 + SURFACE_MOVED_TOLERANCE_DIP + 0.5;
    expect(surfaceUnder([segment('a', 300, 1100, up)], on('a', 500, 400))).toBeNull();
    expect(surfaceUnder([segment('a', 300, 1100, down)], on('a', 500, 400))).toBeNull();
  });

  it('a segment of another window at the same spot does not count', () => {
    expect(surfaceUnder([segment('other', 300, 1100, 400)], on('a', 500, 400))).toBeNull();
  });

  it('a character on the floor has no window top', () => {
    const floor: Placement = { surface: { kind: 'floor' }, x: 500, y: 400 };
    expect(surfaceUnder([segment('a', 300, 1100, 400)], floor)).toBeNull();
  });
});
