// Minimal GIF89a encoder for the README showcase (`pnpm showcase`): one global palette, full-size indexed frames,
// binary transparency, LZW per the GIF spec. No dependency (same reason as tools/lib/png.ts: small supply chain).
// Fixed structure and no metadata, so the same frames always give the same bytes.

/** One full-size frame as palette indices (row-major, one byte per px). */
export interface GifFrame {
  readonly indices: Uint8Array;
  /** Frame duration in centiseconds (the GIF delay unit). */
  readonly delayCs: number;
}

export interface GifOptions {
  readonly width: number;
  readonly height: number;
  /** Colours as 0xRRGGBB, at most 256; padded to a power of two in the file. */
  readonly palette: readonly number[];
  /** Palette index drawn as transparent (omit for opaque frames). */
  readonly transparentIndex?: number;
}

/** Largest LZW code (12-bit codes, GIF spec). */
const MAX_CODE = 4096;
/** Restore to background before the next frame, so transparent pixels never show the previous frame. */
const DISPOSE_BACKGROUND = 2;
/** Data sub-blocks hold at most 255 bytes. */
const SUB_BLOCK = 255;

/** Bits needed to index `n` colours in the colour table (1..8). */
const tableBits = (n: number): number => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));

const u16 = (n: number): number[] => [n & 0xff, (n >> 8) & 0xff];

/** LSB-first bit writer for LZW codes. */
class BitWriter {
  private readonly bytes: number[] = [];
  private acc = 0;
  private bits = 0;
  write(code: number, size: number): void {
    this.acc |= code << this.bits;
    this.bits += size;
    while (this.bits >= 8) {
      this.bytes.push(this.acc & 0xff);
      this.acc >>>= 8;
      this.bits -= 8;
    }
  }
  finish(): number[] {
    if (this.bits > 0) this.bytes.push(this.acc & 0xff);
    return this.bytes;
  }
}

/** GIF LZW of `indices` with `minCodeSize` (2..8): clear code first, table reset at 4096 codes, end code last. */
export function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const out = new BitWriter();
  let codeSize = minCodeSize + 1;
  let next = end + 1;
  const table = new Map<number, number>();
  out.write(clear, codeSize);
  let prefix = indices[0] ?? 0;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i] ?? 0;
    const key = (prefix << 8) | k;
    const known = table.get(key);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    out.write(prefix, codeSize);
    if (next === MAX_CODE) {
      out.write(clear, codeSize);
      table.clear();
      codeSize = minCodeSize + 1;
      next = end + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      table.set(key, next++);
    }
    prefix = k;
  }
  if (indices.length > 0) out.write(prefix, codeSize);
  out.write(end, codeSize);
  return Uint8Array.from(out.finish());
}

/** Splits LZW bytes into length-prefixed sub-blocks plus the zero terminator. */
function subBlocks(data: Uint8Array): number[] {
  const out: number[] = [];
  for (let at = 0; at < data.length; at += SUB_BLOCK) {
    const part = data.subarray(at, at + SUB_BLOCK);
    out.push(part.length, ...part);
  }
  out.push(0);
  return out;
}

/** Encodes looping (forever) GIF89a frames; throws on a bad palette, index or frame size. */
export function encodeGif(frames: readonly GifFrame[], options: GifOptions): Buffer {
  const { width, height, palette, transparentIndex } = options;
  if (frames.length === 0) throw new RangeError('GIF needs at least one frame');
  if (palette.length < 1 || palette.length > 256) throw new RangeError('GIF palette needs 1..256 colours');
  if (width < 1 || height < 1 || width > 0xffff || height > 0xffff) throw new RangeError('bad GIF size');
  const bits = tableBits(palette.length);
  const minCodeSize = Math.max(2, bits);
  const table: number[] = [];
  for (let i = 0; i < 1 << bits; i++) {
    const c = palette[i] ?? 0;
    table.push((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff);
  }
  const bytes: number[] = [
    ...Buffer.from('GIF89a', 'latin1'),
    ...u16(width),
    ...u16(height),
    0x80 | (7 << 4) | (bits - 1), // global colour table, 8-bit colour resolution, unsorted
    0, // background colour index
    0, // no aspect ratio
    ...table,
    // NETSCAPE2.0 application extension: loop forever.
    0x21,
    0xff,
    11,
    ...Buffer.from('NETSCAPE2.0', 'latin1'),
    3,
    1,
    ...u16(0),
    0,
  ];
  for (const frame of frames) {
    if (frame.indices.length !== width * height) throw new RangeError('GIF frame size does not match the image');
    if (frame.indices.some((i) => i >= palette.length)) throw new RangeError('GIF frame index outside the palette');
    if (!Number.isInteger(frame.delayCs) || frame.delayCs < 0 || frame.delayCs > 0xffff) {
      throw new RangeError('GIF delay must be an integer number of centiseconds');
    }
    const transparent = transparentIndex !== undefined;
    bytes.push(0x21, 0xf9, 4, (DISPOSE_BACKGROUND << 2) | (transparent ? 1 : 0), ...u16(frame.delayCs));
    bytes.push(transparentIndex ?? 0, 0);
    bytes.push(0x2c, ...u16(0), ...u16(0), ...u16(width), ...u16(height), 0);
    bytes.push(minCodeSize, ...subBlocks(lzwEncode(frame.indices, minCodeSize)));
  }
  bytes.push(0x3b);
  return Buffer.from(bytes);
}
