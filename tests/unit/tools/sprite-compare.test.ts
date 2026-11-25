import { describe, expect, it } from 'vitest';
import { PACKS } from '../../../assets-src/packs.ts';
import { DARK, WHITE } from '../../../tools/lib/canvas.ts';
import { UsageError } from '../../../tools/lib/cli.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import {
  compareSheet,
  DEFAULT_SHOTS,
  parseCompareArgs,
  parseShots,
  renderShots,
} from '../../../tools/lib/sprite-compare.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const pixel = (img: RgbaImage, x: number, y: number): number[] => [
  ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 3),
];

/** A w×h sprite filled with one opaque colour. */
function solid(w: number, h: number, rgb: readonly [number, number, number]): RgbaImage {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return { width: w, height: h, data };
}

describe('parseShots', () => {
  it('reads anim and anim:frame entries, frame 0 by default', () => {
    expect(parseShots('idle_a,walk:2, turn:1')).toEqual([
      { anim: 'idle_a', frame: 0 },
      { anim: 'walk', frame: 2 },
      { anim: 'turn', frame: 1 },
    ]);
  });

  it.each(['', 'walk:', 'walk:x', 'Walk', 'walk,,turn', 'walk:1:2'])('rejects %j with a UsageError', (spec) => {
    expect(() => parseShots(spec)).toThrow(UsageError);
  });
});

describe('parseCompareArgs', () => {
  it('defaults the base to HEAD and the columns to the review set', () => {
    expect(parseCompareArgs(['pixmates.goth'])).toEqual({ id: 'pixmates.goth', base: 'HEAD', shots: DEFAULT_SHOTS });
  });

  it('takes --base and --frames', () => {
    expect(parseCompareArgs(['pixmates.ronin', '--base', 'HEAD~3', '--frames', 'walk:1'])).toEqual({
      id: 'pixmates.ronin',
      base: 'HEAD~3',
      shots: [{ anim: 'walk', frame: 1 }],
    });
  });

  it('returns help for --help', () => {
    expect(parseCompareArgs(['--help'])).toBe('help');
  });

  it.each([[[]], [['a', 'b']], [['a', '--base']], [['a', '--base', '']], [['a', '--frame', 'walk']]])(
    'rejects %j with a UsageError',
    (argv) => {
      expect(() => parseCompareArgs(argv)).toThrow(UsageError);
    },
  );
});

describe('renderShots', () => {
  const ctx = renderContext(loadMasterPalette());
  const spike = PACKS.find((p) => p.id === 'spike-maid-48soft');
  if (!spike) throw new Error('spike-maid-48soft is not in PACKS');

  it('clamps the frame to the last one and leaves a gap where the pack lacks the animation', () => {
    const walk = spike.animations.walk;
    if (!walk) throw new Error('spike has no walk');
    const [clamped, missing] = renderShots(
      spike,
      [
        { anim: 'walk', frame: 99 },
        { anim: 'talk', frame: 0 },
      ],
      ctx,
    );
    expect(clamped?.data).toEqual(spike.render('walk', walk.frames - 1, ctx).data);
    expect(missing).toBeNull();
  });
});

describe('compareSheet', () => {
  const red = solid(2, 3, [200, 0, 0]);
  const blue = solid(2, 3, [0, 0, 200]);

  it('lays out old/new on white then old/new on dark, scaled, one column per shot', () => {
    const sheet = compareSheet([red, null], [blue, blue], 4);
    // cells: (2·4 + 8) × (3·4 + 8) = 16 × 20; 2 columns, 4 rows, plus the outer gap.
    expect([sheet.width, sheet.height]).toEqual([2 * 16 + 8, 4 * 20 + 8]);
    expect(pixel(sheet, 0, 0)).toEqual([...WHITE]);
    expect(pixel(sheet, 0, sheet.height - 1)).toEqual([...DARK]);
    expect(pixel(sheet, 8, 8)).toEqual([200, 0, 0]); // old on white
    expect(pixel(sheet, 8 + 7, 8 + 11)).toEqual([200, 0, 0]); // 4× scale fills 8 × 12
    expect(pixel(sheet, 8, 28)).toEqual([0, 0, 200]); // new on white
    expect(pixel(sheet, 8, 48)).toEqual([200, 0, 0]); // old on dark
    expect(pixel(sheet, 24, 48)).toEqual([...DARK]); // missing old frame stays empty
    expect(pixel(sheet, 24, 68)).toEqual([0, 0, 200]); // new on dark, second column
  });
});
