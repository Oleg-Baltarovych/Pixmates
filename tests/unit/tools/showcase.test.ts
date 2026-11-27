import { describe, expect, it } from 'vitest';
import { DARK, LIGHT } from '../../../tools/lib/canvas.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import {
  CAST_COLUMNS,
  CAST_GIF_SCALE,
  CAST_SCALE,
  castBeats,
  castGif,
  castSheet,
  CHARACTER_GIF_SCALE,
  characterGif,
  delayCs,
  grid,
  GRID_GAP,
  paletteOf,
  sequenceBeats,
  SHOWCASE_SEQUENCE,
  sliceFrame,
  toIndices,
  TRANSPARENT_INDEX,
  upscale,
  type ShowcasePack,
  type Strip,
} from '../../../tools/lib/showcase.ts';
import { decodeGif } from '../../fixtures/gif-decode.ts';

const W = 3;
const H = 4;

const px = (img: RgbaImage, x: number, y: number): number[] => [
  ...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4),
];

/**
 * A fake pack: every animation is a strip on its own atlas row; frame f of row r has one opaque px at (f % W, 0)
 * coloured (r, f, `tint`) and is transparent elsewhere, so each frame is identifiable.
 */
function makePack(id: string, strips: Record<string, Omit<Strip, 'origin'>>, tint = 9): ShowcasePack {
  const names = Object.keys(strips);
  const width = Math.max(...Object.values(strips).map((s) => s.frames)) * W;
  const data = new Uint8Array(width * names.length * H * 4);
  const animations: Record<string, Strip> = {};
  names.forEach((name, r) => {
    const s = strips[name];
    if (!s) return;
    animations[name] = { ...s, origin: { x: 0, y: r * H } };
    for (let f = 0; f < s.frames; f++) data.set([r, f, tint, 255], (r * H * width + f * W + (f % W)) * 4);
  });
  return { id, frameSize: { w: W, h: H }, animations, atlas: { width, height: names.length * H, data } };
}

const STRIPS = { idle_a: { frames: 2, fps: 6 }, walk: { frames: 3, fps: 10 }, happy: { frames: 2, fps: 8 } };

describe('sliceFrame', () => {
  it('cuts frame n of an animation from its strip', () => {
    const pack = makePack('p', STRIPS);
    const frame = sliceFrame(pack, 'walk', 2);
    expect([frame.width, frame.height]).toEqual([W, H]);
    expect(px(frame, 2, 0)).toEqual([1, 2, 9, 255]);
    expect(px(frame, 0, 0)[3]).toBe(0);
  });

  it('throws for an unknown animation, a frame outside the strip or a strip outside the atlas', () => {
    const pack = makePack('p', STRIPS);
    expect(() => sliceFrame(pack, 'sleep', 0)).toThrow(/no animation 'sleep'/);
    expect(() => sliceFrame(pack, 'walk', 3)).toThrow(RangeError);
    const shifted = {
      ...pack,
      animations: { ...pack.animations, walk: { frames: 3, fps: 10, origin: { x: 3, y: 4 } } },
    };
    expect(() => sliceFrame(shifted, 'walk', 2)).toThrow(/outside the atlas/);
  });
});

describe('upscale', () => {
  it('repeats every pixel into a scale × scale block (nearest neighbour)', () => {
    const src: RgbaImage = { width: 2, height: 1, data: Uint8Array.of(1, 2, 3, 255, 4, 5, 6, 0) };
    const out = upscale(src, 3);
    expect([out.width, out.height]).toEqual([6, 3]);
    for (let y = 0; y < 3; y++) {
      expect(px(out, 2, y)).toEqual([1, 2, 3, 255]);
      expect(px(out, 3, y)).toEqual([4, 5, 6, 0]);
    }
  });

  it.each([0, 1.5, -2])('rejects the factor %d', (k) => {
    expect(() => upscale({ width: 1, height: 1, data: new Uint8Array(4) }, k)).toThrow(RangeError);
  });
});

describe('sequenceBeats', () => {
  it('plays each step `loops` times in order, with the delay from its fps', () => {
    const beats = sequenceBeats(makePack('p', STRIPS), SHOWCASE_SEQUENCE);
    expect(beats.map((b) => `${b.anim}:${String(b.frame)}`)).toEqual([
      'idle_a:0',
      'idle_a:1',
      ...['walk:0', 'walk:1', 'walk:2', 'walk:0', 'walk:1', 'walk:2'],
      ...['happy:0', 'happy:1', 'happy:0', 'happy:1'],
    ]);
    expect(new Set(beats.filter((b) => b.anim === 'walk').map((b) => b.delayCs))).toEqual(new Set([10]));
  });

  it('rounds the delay to whole centiseconds', () => {
    expect([6, 8, 10, 3].map(delayCs)).toEqual([17, 13, 10, 33]);
  });
});

describe('castBeats', () => {
  it('returns the shared beats when every pack plays the sequence alike', () => {
    const packs = [makePack('a', STRIPS), makePack('b', STRIPS, 7)];
    expect(castBeats(packs, SHOWCASE_SEQUENCE)).toEqual(
      sequenceBeats(packs[0] ?? makePack('x', STRIPS), SHOWCASE_SEQUENCE),
    );
  });

  it('throws when a pack has other frame counts or fps, or there is no pack', () => {
    const odd = makePack('odd', { ...STRIPS, walk: { frames: 4, fps: 10 } });
    const slow = makePack('slow', { ...STRIPS, happy: { frames: 2, fps: 4 } });
    expect(() => castBeats([makePack('a', STRIPS), odd], SHOWCASE_SEQUENCE)).toThrow(/odd/);
    expect(() => castBeats([makePack('a', STRIPS), slow], SHOWCASE_SEQUENCE)).toThrow(/slow/);
    expect(() => castBeats([], SHOWCASE_SEQUENCE)).toThrow();
  });
});

describe('grid', () => {
  const dot = (rgb: [number, number, number]): RgbaImage => ({ width: 1, height: 1, data: Uint8Array.of(...rgb, 255) });

  it('lays images out row by row with the gap, scaled, over the backdrop', () => {
    const out = grid([dot([1, 0, 0]), dot([2, 0, 0]), dot([3, 0, 0])], 2, 2, 1, LIGHT);
    // 2 columns × (2 px cell + 2 px gap) + 2 px gap = 10; 2 rows likewise.
    expect([out.width, out.height]).toEqual([10, 10]);
    expect(px(out, 0, 0)).toEqual([...LIGHT, 255]);
    expect(px(out, 2, 2)).toEqual([1, 0, 0, 255]);
    expect(px(out, 6, 3)).toEqual([2, 0, 0, 255]);
    expect(px(out, 3, 7)).toEqual([3, 0, 0, 255]);
    expect(px(out, 7, 7)).toEqual([...LIGHT, 255]);
  });

  it('stays transparent without a backdrop and rejects mixed sizes', () => {
    expect(px(grid([dot([1, 0, 0])], 4, 1, 1), 0, 0)[3]).toBe(0);
    expect(() => grid([dot([1, 0, 0]), upscale(dot([1, 0, 0]), 2)], 2, 1, 0)).toThrow(/one size/);
    expect(() => grid([], 2, 1, 0)).toThrow();
  });
});

describe('palette', () => {
  const img = (...pixels: number[][]): RgbaImage => ({
    width: pixels.length,
    height: 1,
    data: Uint8Array.from(pixels.flat()),
  });

  it('puts transparency first, then each opaque colour once in ascending order', () => {
    const palette = paletteOf([img([0, 0, 9, 255], [5, 0, 0, 255]), img([0, 0, 9, 255], [7, 7, 7, 0])]);
    expect(palette).toEqual([0, 0x000009, 0x050000]);
    expect(palette[TRANSPARENT_INDEX]).toBe(0);
  });

  it('is independent of image order', () => {
    const a = img([1, 2, 3, 255]);
    const b = img([9, 9, 9, 255]);
    expect(paletteOf([a, b])).toEqual(paletteOf([b, a]));
  });

  it('maps pixels to their slots and transparent pixels to the transparent index', () => {
    const image = img([5, 0, 0, 255], [1, 1, 1, 0], [0, 0, 9, 255]);
    expect([...toIndices(image, paletteOf([image]))]).toEqual([2, TRANSPARENT_INDEX, 1]);
  });

  it('rejects partial alpha, more than 255 colours and a colour missing from the palette', () => {
    expect(() => paletteOf([img([1, 1, 1, 128])])).toThrow(/binary alpha/);
    const many = img(...Array.from({ length: 256 }, (_, i) => [i, 0, 1, 255]));
    expect(() => paletteOf([many])).toThrow(/256 colours/);
    expect(() => toIndices(img([3, 3, 3, 255]), [0])).toThrow(/missing/);
  });
});

describe('showcase media', () => {
  const packs = [
    makePack('pixmates.a', STRIPS, 1),
    makePack('pixmates.b', STRIPS, 2),
    makePack('pixmates.c', STRIPS, 3),
  ];

  it('characterGif plays the sequence at the GIF scale with transparent background', () => {
    const gif = decodeGif(characterGif(packs[0] ?? makePack('x', STRIPS)));
    expect([gif.width, gif.height]).toEqual([W * CHARACTER_GIF_SCALE, H * CHARACTER_GIF_SCALE]);
    expect(gif.frames).toHaveLength(12);
    expect(gif.frames.map((f) => f.delayCs).slice(0, 3)).toEqual([17, 17, 10]);
    // walk:2 (third walk frame) has its one px at x = 2 → a 4×4 block at x 8..11.
    const walk2 = gif.frames[4];
    const at = (x: number, y: number): number => walk2?.indices[y * gif.width + x] ?? -1;
    expect(gif.palette[at(8, 0)]).toBe(0x010201);
    expect(at(0, 0)).toBe(TRANSPARENT_INDEX);
  });

  it('castGif puts every pack in one row and plays them in step', () => {
    const gif = decodeGif(castGif(packs));
    const g = GRID_GAP * CAST_GIF_SCALE;
    expect(gif.width).toBe(packs.length * (W * CAST_GIF_SCALE + g) + g);
    expect(gif.frames).toHaveLength(12);
    const first = gif.frames[0];
    // Pack b's idle_a:0 px sits at its cell origin.
    const x = g + (W * CAST_GIF_SCALE + g);
    expect(gif.palette[first?.indices[g * gif.width + x] ?? -1]).toBe(0x000002);
  });

  it('castSheet shows idle frame 0 of every pack, CAST_COLUMNS wide, at CAST_SCALE over the backdrop', () => {
    const many = Array.from({ length: 6 }, (_, i) => makePack(`pixmates.p${String(i)}`, STRIPS, i + 1));
    const sheet = castSheet(many, DARK);
    const g = GRID_GAP * CAST_SCALE;
    expect(sheet.width).toBe(CAST_COLUMNS * (W * CAST_SCALE + g) + g);
    expect(sheet.height).toBe(2 * (H * CAST_SCALE + g) + g);
    expect(px(sheet, 0, 0)).toEqual([...DARK, 255]);
    // Pack 5 is row 1, column 1.
    expect(px(sheet, g + (W * CAST_SCALE + g), g + (H * CAST_SCALE + g))).toEqual([0, 0, 6, 255]);
  });

  it('is deterministic: the same packs give the same bytes', () => {
    expect(castGif(packs).equals(castGif(packs))).toBe(true);
    expect(
      characterGif(makePack('pixmates.a', STRIPS, 1)).equals(characterGif(makePack('pixmates.a', STRIPS, 1))),
    ).toBe(true);
  });
});
