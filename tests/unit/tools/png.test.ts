import { describe, expect, it } from 'vitest';
import { decodePng, encodeApng, encodePng, type RgbaImage } from '../../../tools/lib/png.ts';

function image(w: number, h: number, seed: number): RgbaImage {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 31 + seed * 7) & 0xff;
  return { width: w, height: h, data };
}

function chunks(png: Buffer): { type: string; body: Buffer }[] {
  const out: { type: string; body: Buffer }[] = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    out.push({ type: png.toString('latin1', at + 4, at + 8), body: png.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
  }
  return out;
}

describe('png codec (ported from Cossack Kin)', () => {
  it('round-trips RGBA for every filter type', () => {
    const src = image(7, 5, 1);
    for (const filters of [[0], [1], [2], [3], [4], [0, 1, 2, 3, 4]] as const) {
      const out = decodePng(encodePng(src, { filters }));
      expect(out.width).toBe(7);
      expect(Buffer.from(out.data).equals(Buffer.from(src.data))).toBe(true);
    }
  });

  it('is deterministic and writes only IHDR/IDAT/IEND', () => {
    const a = encodePng(image(9, 9, 2));
    expect(a.equals(encodePng(image(9, 9, 2)))).toBe(true);
    expect(chunks(a).map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('rejects bad sizes and corrupt data', () => {
    expect(() => encodePng({ width: 0, height: 1, data: new Uint8Array(0) })).toThrow(RangeError);
    const png = encodePng(image(4, 4, 3));
    png[png.length - 20] = (png[png.length - 20] ?? 0) ^ 0xff;
    expect(() => decodePng(png)).toThrow();
  });
});

describe('apng encoder', () => {
  const frames = [0, 1, 2].map((s) => ({ image: image(6, 4, s), delayMs: 100 }));

  it('writes acTL, a fcTL per frame, IDAT for frame 0, fdAT after, with consecutive sequence numbers', () => {
    const list = chunks(encodeApng(frames));
    expect(list.map((c) => c.type)).toEqual(['IHDR', 'acTL', 'fcTL', 'IDAT', 'fcTL', 'fdAT', 'fcTL', 'fdAT', 'IEND']);
    expect(list[1]?.body.readUInt32BE(0)).toBe(3);
    const seqs = list.filter((c) => c.type === 'fcTL' || c.type === 'fdAT').map((c) => c.body.readUInt32BE(0));
    expect(seqs).toEqual([0, 1, 2, 3, 4]);
    expect(list[2]?.body.readUInt16BE(20)).toBe(100);
    expect(list[2]?.body.readUInt16BE(22)).toBe(1000);
  });

  it('decodes as its first frame with a plain PNG decoder and is deterministic', () => {
    const apng = encodeApng(frames);
    expect(Buffer.from(decodePng(apng).data).equals(Buffer.from(frames[0]?.image.data ?? []))).toBe(true);
    expect(apng.equals(encodeApng(frames))).toBe(true);
  });

  it('rejects empty input, mixed sizes and bad delays', () => {
    expect(() => encodeApng([])).toThrow(RangeError);
    expect(() => encodeApng([...frames, { image: image(5, 4, 9), delayMs: 100 }])).toThrow(RangeError);
    expect(() => encodeApng([{ image: image(2, 2, 0), delayMs: 0 }])).toThrow(RangeError);
  });
});
