// Test-only GIF89a reader for the subset tools/lib/gif.ts writes (global palette, full-size frames, no interlace):
// an independent LZW decoder, so the encoder is checked by a round trip instead of by its own bytes.

export interface DecodedGif {
  readonly width: number;
  readonly height: number;
  readonly palette: readonly number[];
  readonly loops: boolean;
  readonly frames: readonly {
    readonly indices: Uint8Array;
    readonly delayCs: number;
    readonly transparentIndex: number | null;
    readonly disposal: number;
  }[];
}

/** Standard GIF LZW decoder (variable code size up to 12 bits, clear and end codes). */
export function lzwDecode(data: Uint8Array, minCodeSize: number, expected: number): Uint8Array {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const out: number[] = [];
  let dict: number[][] = [];
  const reset = (): void => {
    dict = Array.from({ length: clear }, (_, i) => [i]);
    dict.push([], []);
  };
  reset();
  let codeSize = minCodeSize + 1;
  let prev: number[] | null = null;
  let bit = 0;
  const read = (): number => {
    let code = 0;
    for (let i = 0; i < codeSize; i++, bit++) {
      const byte = data[bit >> 3];
      if (byte === undefined) throw new Error('LZW stream ended without an end code');
      code |= ((byte >> (bit & 7)) & 1) << i;
    }
    return code;
  };
  for (;;) {
    const code = read();
    if (code === clear) {
      reset();
      codeSize = minCodeSize + 1;
      prev = null;
      continue;
    }
    if (code === end) break;
    let entry: number[];
    const known = dict[code];
    if (known !== undefined && code < dict.length) entry = known;
    else if (code === dict.length && prev) entry = [...prev, prev[0] ?? 0];
    else throw new Error(`bad LZW code ${String(code)}`);
    out.push(...entry);
    if (prev) dict.push([...prev, entry[0] ?? 0]);
    prev = entry;
    if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
  }
  if (out.length !== expected) throw new Error(`LZW gave ${String(out.length)} px, expected ${String(expected)}`);
  return Uint8Array.from(out);
}

export function decodeGif(buf: Buffer): DecodedGif {
  if (buf.toString('latin1', 0, 6) !== 'GIF89a') throw new Error('not a GIF89a');
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  const packed = buf[10] ?? 0;
  if ((packed & 0x80) === 0) throw new Error('no global colour table');
  const size = 1 << ((packed & 7) + 1);
  const palette: number[] = [];
  let at = 13;
  for (let i = 0; i < size; i++, at += 3) palette.push(((buf[at] ?? 0) << 16) | ((buf[at + 1] ?? 0) << 8) | (buf[at + 2] ?? 0));
  const frames: DecodedGif['frames'][number][] = [];
  let loops = false;
  let gce = { delayCs: 0, transparentIndex: null as number | null, disposal: 0 };
  const blocks = (): Buffer => {
    const parts: Buffer[] = [];
    for (let n = buf[at++] ?? 0; n > 0; n = buf[at++] ?? 0) {
      parts.push(buf.subarray(at, at + n));
      at += n;
    }
    return Buffer.concat(parts);
  };
  for (;;) {
    const tag = buf[at++];
    if (tag === 0x3b) break;
    if (tag === 0x21) {
      const label = buf[at++];
      const body = blocks();
      if (label === 0xf9) {
        const flags = body[0] ?? 0;
        gce = {
          delayCs: body.readUInt16LE(1),
          transparentIndex: (flags & 1) === 1 ? (body[3] ?? 0) : null,
          disposal: (flags >> 2) & 7,
        };
      } else if (label === 0xff && body.toString('latin1', 0, 11) === 'NETSCAPE2.0') loops = true;
      continue;
    }
    if (tag !== 0x2c) throw new Error(`unexpected block 0x${(tag ?? 0).toString(16)}`);
    const w = buf.readUInt16LE(at + 4);
    const h = buf.readUInt16LE(at + 6);
    if (w !== width || h !== height || (buf[at + 8] ?? 0) !== 0) throw new Error('only full-size, plain frames');
    at += 9;
    const minCodeSize = buf[at++] ?? 0;
    frames.push({ indices: lzwDecode(blocks(), minCodeSize, w * h), ...gce });
  }
  return { width, height, palette, loops, frames };
}
