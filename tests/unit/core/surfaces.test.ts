import { describe, expect, it } from 'vitest';
import { SURFACE_MIN_WIDTH_ART } from '../../../src/content/desktop.ts';
import { visibleTops, type SpriteRoom } from '../../../src/core/surfaces.ts';
import { makeWindow } from '../../fixtures/core-state.ts';

const WORK_AREA = { width: 1920, height: 1032 } as const;
/** ×4 at 125 %: 3.2 DIP per art px, a 56-px frame = 179.2 DIP tall. */
const ROOM: SpriteRoom = { heightDip: 179.2, artPxDip: 3.2 };
const MIN_WIDTH = SURFACE_MIN_WIDTH_ART * ROOM.artPxDip;

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
    expect(visibleTops([makeWindow('a', 300, 400, 800, 500)], WORK_AREA, ROOM)).toEqual([top('a', 300, 1100, 400)]);
  });

  describe('occlusion by windows in front', () => {
    it('a front window over the middle of the edge splits it into two segments', () => {
      const front = makeWindow('front', 600, 200, 300, 600);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ROOM)).toEqual([
        top('front', 600, 900, 200),
        top('back', 300, 600, 400),
        top('back', 900, 1100, 400),
      ]);
    });

    it('a window behind never covers one in front', () => {
      const front = makeWindow('front', 300, 400, 800, 500);
      const back = makeWindow('back', 600, 200, 300, 600);
      expect(visibleTops([front, back], WORK_AREA, ROOM)).toEqual([
        top('front', 300, 1100, 400),
        top('back', 600, 900, 200),
      ]);
    });

    it('an edge fully under a front window is gone', () => {
      const front = makeWindow('front', 200, 300, 1200, 600);
      const back = makeWindow('back', 400, 500, 600, 300);
      expect(visibleTops([front, back], WORK_AREA, ROOM)).toEqual([top('front', 200, 1400, 300)]);
    });

    it('a front window that ends exactly at the edge does not cover it', () => {
      const front = makeWindow('front', 300, 200, 800, 200);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ROOM)).toEqual([
        top('front', 300, 1100, 200),
        top('back', 300, 1100, 400),
      ]);
    });

    it('a front window starting at the same height hides the shared part of the edge', () => {
      const front = makeWindow('front', 700, 400, 800, 500);
      const back = makeWindow('back', 300, 400, 800, 500);
      expect(visibleTops([front, back], WORK_AREA, ROOM)).toEqual([
        top('front', 700, 1500, 400),
        top('back', 300, 700, 400),
      ]);
    });

    it('several front windows cut several gaps (multi-segment), left to right', () => {
      const a = makeWindow('a', 400, 100, 200, 400);
      const b = makeWindow('b', 1000, 300, 200, 400);
      const back = makeWindow('back', 100, 350, 1700, 400);
      const tops = visibleTops([a, b, back], WORK_AREA, ROOM).filter((surface) => surface.id === 'back');
      expect(tops).toEqual([top('back', 100, 400, 350), top('back', 600, 1000, 350), top('back', 1200, 1800, 350)]);
    });

    it('overlapping front windows merge into one gap', () => {
      const a = makeWindow('a', 400, 100, 400, 400);
      const b = makeWindow('b', 600, 250, 400, 400);
      const back = makeWindow('back', 100, 300, 1200, 400);
      const tops = visibleTops([a, b, back], WORK_AREA, ROOM).filter((surface) => surface.id === 'back');
      expect(tops).toEqual([top('back', 100, 400, 300), top('back', 1000, 1300, 300)]);
    });
  });

  describe('inside the work area', () => {
    it('clips an edge that runs past the left and right sides', () => {
      expect(visibleTops([makeWindow('a', -200, 400, 2400, 500)], WORK_AREA, ROOM)).toEqual([top('a', 0, 1920, 400)]);
    });

    it('drops a window that lies off the work area sideways', () => {
      expect(visibleTops(only(['a', 1920, 400, 600, 500]), WORK_AREA, ROOM)).toEqual([KEPT]);
      expect(visibleTops(only(['b', -700, 400, 600, 500]), WORK_AREA, ROOM)).toEqual([KEPT]);
    });

    it('drops an edge at or below the floor (the taskbar edge is the floor)', () => {
      expect(visibleTops(only(['a', 300, 1032, 600, 200]), WORK_AREA, ROOM)).toEqual([KEPT]);
      expect(visibleTops(only(['b', 300, 1100, 600, 200]), WORK_AREA, ROOM)).toEqual([KEPT]);
    });
  });

  describe('sprite headroom', () => {
    it('keeps an edge with exactly the sprite height above it', () => {
      expect(visibleTops([makeWindow('a', 300, ROOM.heightDip, 800, 500)], WORK_AREA, ROOM)).toEqual([
        top('a', 300, 1100, ROOM.heightDip),
      ]);
    });

    it('drops an edge too close to the top of the work area', () => {
      expect(visibleTops(only(['a', 300, ROOM.heightDip - 1, 800, 500]), WORK_AREA, ROOM)).toEqual([KEPT]);
    });

    it('the headroom follows the sprite size', () => {
      const small: SpriteRoom = { heightDip: 89.6, artPxDip: 1.6 };
      expect(visibleTops(only(['a', 300, 120, 800, 500]), WORK_AREA, ROOM)).toEqual([KEPT]);
      expect(visibleTops([makeWindow('a', 300, 120, 800, 500)], WORK_AREA, small)).toEqual([top('a', 300, 1100, 120)]);
    });
  });

  describe('maximised windows', () => {
    it('a maximised window has no top to stand on and hides every window behind it', () => {
      const maximised = makeWindow('max', 0, 0, 1920, 1032);
      const behind = makeWindow('behind', 300, 400, 800, 500);
      expect(visibleTops([KEEP, maximised, behind], WORK_AREA, ROOM)).toEqual([KEPT]);
    });

    it('DWM bounds of a maximised window may overhang the work area a little: still excluded', () => {
      expect(visibleTops(only(['max', -8, -8, 1936, 1048]), WORK_AREA, ROOM)).toEqual([KEPT]);
    });

    it('a window in front of a maximised one keeps its edge', () => {
      const front = makeWindow('front', 300, 400, 800, 500);
      const maximised = makeWindow('max', 0, 0, 1920, 1032);
      expect(visibleTops([front, maximised], WORK_AREA, ROOM)).toEqual([top('front', 300, 1100, 400)]);
    });
  });

  describe('minimum width', () => {
    it('keeps a segment exactly the minimum width', () => {
      // At x = 0 the width is exact in floating point (300 + 102.4 − 300 is not).
      expect(visibleTops([makeWindow('a', 0, 400, MIN_WIDTH, 500)], WORK_AREA, ROOM)).toEqual([
        top('a', 0, MIN_WIDTH, 400),
      ]);
    });

    it('drops a window narrower than the minimum', () => {
      expect(visibleTops(only(['a', 300, 400, MIN_WIDTH - 1, 500]), WORK_AREA, ROOM)).toEqual([KEPT]);
    });

    it('drops a sliver left between front windows, keeps the wide parts', () => {
      const a = makeWindow('a', 400, 100, 300, 400);
      const b = makeWindow('b', 750, 100, 300, 400);
      const back = makeWindow('back', 100, 300, 1500, 400);
      const tops = visibleTops([a, b, back], WORK_AREA, ROOM).filter((surface) => surface.id === 'back');
      expect(tops).toEqual([top('back', 100, 400, 300), top('back', 1050, 1600, 300)]);
    });

    it('drops a sliver left by clipping at the screen side', () => {
      expect(visibleTops(only(['a', 1900, 400, 600, 500]), WORK_AREA, ROOM)).toEqual([KEPT]);
    });

    it('the minimum follows the sprite size', () => {
      const big: SpriteRoom = { heightDip: 224, artPxDip: 4 };
      const window = makeWindow('a', 300, 400, 110, 500);
      expect(visibleTops([window], WORK_AREA, ROOM)).toEqual([top('a', 300, 410, 400)]);
      expect(visibleTops([KEEP, window], WORK_AREA, big)).toEqual([KEPT]);
    });
  });

  it('is deterministic and leaves its input unchanged', () => {
    const windows = [makeWindow('front', 600, 200, 300, 600), makeWindow('back', 300, 400, 800, 500)];
    const copy = structuredClone(windows);
    const tops = visibleTops(windows, WORK_AREA, ROOM);
    expect(tops).toHaveLength(3);
    expect(visibleTops(windows, WORK_AREA, ROOM)).toEqual(tops);
    expect(windows).toEqual(copy);
  });
});
