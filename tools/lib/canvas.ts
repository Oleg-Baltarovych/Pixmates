// Minimal RGBA drawing surface for the review images in reports/ (sheets, previews, before/after comparisons):
// solid fills and nearest-neighbour sprite blits at an integer scale. Review backdrop colours live here too.
import type { RgbaImage } from './png.ts';

export type Rgb = readonly [number, number, number];
export const LIGHT: Rgb = [236, 240, 244];
export const DARK: Rgb = [27, 31, 42];
export const WHITE: Rgb = [255, 255, 255];
export const IDE: Rgb = [30, 30, 30];

export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  fill(x: number, y: number, w: number, h: number, [r, g, b]: Rgb): void {
    for (let yy = Math.max(0, y); yy < Math.min(this.height, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.width, x + w); xx++) {
        this.data.set([r, g, b, 255], (yy * this.width + xx) * 4);
      }
    }
  }
  /** Nearest-neighbour blit of an RGBA sprite (alpha 0/255) at integer scale. */
  blit(src: RgbaImage, x: number, y: number, scale: number): void {
    for (let sy = 0; sy < src.height; sy++) {
      for (let sx = 0; sx < src.width; sx++) {
        const i = (sy * src.width + sx) * 4;
        if ((src.data[i + 3] ?? 0) === 0) continue;
        const px = src.data.subarray(i, i + 4);
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const X = x + sx * scale + dx;
            const Y = y + sy * scale + dy;
            if (X >= 0 && Y >= 0 && X < this.width && Y < this.height) this.data.set(px, (Y * this.width + X) * 4);
          }
        }
      }
    }
  }
  image(): RgbaImage {
    return { width: this.width, height: this.height, data: this.data };
  }
}
