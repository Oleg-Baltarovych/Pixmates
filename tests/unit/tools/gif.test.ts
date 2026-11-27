import { describe, expect, it } from 'vitest';
import { encodeGif, lzwEncode } from '../../../tools/lib/gif.ts';
import { decodeGif, lzwDecode } from '../../fixtures/gif-decode.ts';

/** Deterministic pseudo-random indices in 0..colours-1 (xorshift), with runs so the dictionary grows both ways. */
function indices(length: number, colours: number, seed: number): Uint8Array {
  const out = new Uint8Array(length);
  let s = seed;
  for (let i = 0; i < length; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    out[i] = (s >>> 0) % 7 === 0 ? (out[i - 1] ?? 0) : (s >>> 0) % colours;
  }
  return out;
}

describe('lzwEncode', () => {
  it.each([
    [2, 4, 1],
    [2, 4, 50_000],
    [8, 256, 50_000],
    [5, 32, 9_000],
  ])('round-trips with min code size %i (%i colours, %i px)', (minCodeSize, colours, length) => {
    const src = indices(length, colours, 0x9e3779b9);
    expect(Buffer.from(lzwDecode(lzwEncode(src, minCodeSize), minCodeSize, length)).equals(Buffer.from(src))).toBe(
      true,
    );
  });

  it('round-trips a long flat run and a single pixel', () => {
    for (const src of [new Uint8Array(100_000), Uint8Array.of(3)]) {
      expect(lzwDecode(lzwEncode(src, 2), 2, src.length)).toEqual(src);
    }
  });
});

describe('encodeGif', () => {
  const palette = [0x000000, 0xff0000, 0x00ff00];
  const frames = [
    { indices: Uint8Array.of(0, 1, 2, 1, 0, 2), delayCs: 17 },
    { indices: Uint8Array.of(2, 2, 2, 0, 0, 1), delayCs: 10 },
  ];

  it('writes a looping GIF89a whose frames, delays, palette and transparency read back', () => {
    const gif = decodeGif(encodeGif(frames, { width: 3, height: 2, palette, transparentIndex: 0 }));
    expect(gif).toMatchObject({ width: 3, height: 2, loops: true });
    expect(gif.palette.slice(0, 3)).toEqual(palette);
    expect(gif.palette).toHaveLength(4);
    expect(gif.frames.map((f) => [...f.indices])).toEqual(frames.map((f) => [...f.indices]));
    expect(gif.frames.map((f) => f.delayCs)).toEqual([17, 10]);
    expect(gif.frames.every((f) => f.transparentIndex === 0 && f.disposal === 2)).toBe(true);
  });

  it('leaves transparency off when no index is given', () => {
    const gif = decodeGif(encodeGif(frames, { width: 3, height: 2, palette }));
    expect(gif.frames.every((f) => f.transparentIndex === null)).toBe(true);
  });

  it('gives the same bytes for the same input', () => {
    const a = encodeGif(frames, { width: 3, height: 2, palette, transparentIndex: 0 });
    const b = encodeGif(frames, { width: 3, height: 2, palette, transparentIndex: 0 });
    expect(a.equals(b)).toBe(true);
  });

  it('rejects no frames, a bad palette, a wrong frame size, an index outside the palette and a bad delay', () => {
    const opts = { width: 3, height: 2, palette };
    expect(() => encodeGif([], opts)).toThrow(RangeError);
    expect(() => encodeGif(frames, { ...opts, palette: [] })).toThrow(RangeError);
    expect(() => encodeGif(frames, { ...opts, palette: new Array<number>(257).fill(0) })).toThrow(RangeError);
    expect(() => encodeGif([{ indices: new Uint8Array(5), delayCs: 1 }], opts)).toThrow(RangeError);
    expect(() => encodeGif([{ indices: Uint8Array.of(0, 0, 0, 0, 0, 3), delayCs: 1 }], opts)).toThrow(RangeError);
    expect(() => encodeGif([{ indices: new Uint8Array(6), delayCs: 1.5 }], opts)).toThrow(RangeError);
  });
});
