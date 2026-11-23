// Review images for the art gate (plan M-ART MA-08), written to reports/ (git-ignored):
//   pnpm sprites:sheet [<id>…]    contact sheet ×4 per pack on light + dark → reports/sprites/<id>-sheet.png
//   pnpm sprites:preview [<id>…]  APNG per animation at the real M scale over 4 backdrops (light, dark, white
//                                 "browser", dark "IDE") → reports/sprites/<id>-<anim>.apng.png
//   pnpm sprites:sheet --lineup   all packs side by side (idle, walk, happy frame strips) → reports/art-spike/
//   pnpm sprites:sheet --swatch   master palette swatch → docs/art/palette.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS } from '../assets-src/packs.ts';
import { encodeApng, encodePng, type RgbaImage } from './lib/png.ts';
import { buildPack, loadMasterPalette, renderContext, ROOT } from './lib/sprites.ts';

type Rgb = readonly [number, number, number];
const LIGHT: Rgb = [236, 240, 244];
const DARK: Rgb = [27, 31, 42];
const WHITE: Rgb = [255, 255, 255];
const IDE: Rgb = [30, 30, 30];

class Canvas {
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

/** A backdrop panel; "browser" and "IDE" get a title bar and text-like stripes so contrast reads as in real use. */
function backdrop(
  c: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: 'light' | 'dark' | 'browser' | 'ide',
): void {
  const base = kind === 'light' ? LIGHT : kind === 'dark' ? DARK : kind === 'browser' ? WHITE : IDE;
  c.fill(x, y, w, h, base);
  if (kind === 'browser') {
    c.fill(x, y, w, 10, [222, 225, 230]);
    for (let row = 20; row < h - 8; row += 9) c.fill(x + 8, y + row, ((row * 37) % (w - 40)) + 20, 3, [60, 64, 72]);
  } else if (kind === 'ide') {
    c.fill(x, y, w, 10, [45, 45, 48]);
    const tones: Rgb[] = [
      [86, 156, 214],
      [206, 145, 120],
      [106, 153, 85],
      [212, 212, 212],
    ];
    for (let row = 20, n = 0; row < h - 8; row += 9, n++) {
      c.fill(x + 8 + (n % 3) * 8, y + row, ((row * 53) % (w - 60)) + 16, 3, tones[n % tones.length] ?? WHITE);
    }
  }
}

/** Real M-preset scale at 1080p / 125 % (plan scale table): 48 → ×4, 64 → ×3. */
const realScale = (frameH: number): number => Math.max(2, Math.round((136 * 1.25) / frameH));

const reports = join(ROOT, 'reports');
const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith('--'));
const ctx = renderContext(loadMasterPalette());
const packs = PACKS.filter((p) => ids.length === 0 || ids.includes(p.id)).map((def) => ({
  def,
  built: buildPack(def, ctx),
}));

if (args.includes('--swatch')) {
  const palette = ctx.palette;
  const cell = 16;
  const longest = Math.max(...[...palette.ramps.values()].map((r) => r.length));
  const c = new Canvas(longest * cell + 8, palette.rampNames.length * cell + 8);
  c.fill(0, 0, c.width, c.height, [128, 128, 128]);
  palette.rampNames.forEach((name, row) => {
    (palette.ramps.get(name) ?? []).forEach((rgb, i) => {
      c.fill(4 + i * cell, 4 + row * cell, cell, cell, [(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff]);
    });
  });
  mkdirSync(join(ROOT, 'docs', 'art'), { recursive: true });
  writeFileSync(join(ROOT, 'docs', 'art', 'palette.png'), encodePng(c.image()));
  console.log('docs/art/palette.png');
} else if (args.includes('--lineup')) {
  const pad = 12;
  const scaleOf = (h: number): number => realScale(h);
  const cellW = Math.max(...packs.map(({ def }) => def.frameSize.w * scaleOf(def.frameSize.h))) + pad;
  const cellH = Math.max(...packs.map(({ def }) => def.frameSize.h * scaleOf(def.frameSize.h))) + pad;
  const kinds = ['light', 'dark', 'browser', 'ide'] as const;
  const c = new Canvas(packs.length * cellW + pad, kinds.length * cellH + pad);
  c.fill(0, 0, c.width, c.height, [96, 96, 104]);
  kinds.forEach((kind, row) => {
    packs.forEach(({ def, built }, col) => {
      const s = scaleOf(def.frameSize.h);
      backdrop(c, pad + col * cellW, pad + row * cellH, cellW - pad, cellH - pad, kind);
      const frame = built.frames.get(row === 3 ? 'happy' : 'idle_a')?.[row === 3 ? 2 : 0];
      if (frame)
        c.blit(
          frame,
          pad + col * cellW + (cellW - pad - frame.width * s) / 2,
          pad + row * cellH + (cellH - pad - frame.height * s),
          s,
        );
    });
  });
  mkdirSync(join(reports, 'art-spike'), { recursive: true });
  const file = join(reports, 'art-spike', 'lineup-real-size.png');
  writeFileSync(file, encodePng(c.image()));
  console.log(`${file}  (columns in build order: ${packs.map((p) => p.def.id).join(', ')})`);
} else {
  mkdirSync(join(reports, 'sprites'), { recursive: true });
  const preview = args.includes('--preview');
  for (const { def, built } of packs) {
    const { w, h } = def.frameSize;
    if (!preview) {
      const s = 4;
      const anims = [...built.frames.entries()];
      const cols = Math.max(...anims.map(([, f]) => f.length));
      const half = anims.length * (h * s + 8) + 8;
      const c = new Canvas(cols * (w * s + 8) + 8, half * 2);
      c.fill(0, 0, c.width, half, LIGHT);
      c.fill(0, half, c.width, half, DARK);
      for (const [y0] of [[0], [half]] as const) {
        anims.forEach(([, frames], row) => {
          frames.forEach((frame, col) => {
            c.blit(frame, 8 + col * (w * s + 8), y0 + 8 + row * (h * s + 8), s);
          });
        });
      }
      const file = join(reports, 'sprites', `${def.id}-sheet.png`);
      writeFileSync(file, encodePng(c.image()));
      console.log(file);
      continue;
    }
    const s = realScale(h);
    const panelW = w * s + 32;
    const panelH = h * s + 28;
    const kinds = ['light', 'dark', 'browser', 'ide'] as const;
    for (const [name, frames] of built.frames) {
      const fps = def.animations[name]?.fps ?? 8;
      const apng = encodeApng(
        frames.map((frame) => {
          const c = new Canvas(panelW * kinds.length, panelH);
          kinds.forEach((kind, i) => {
            backdrop(c, i * panelW, 0, panelW, panelH, kind);
            c.blit(frame, i * panelW + 16, panelH - h * s - 4, s);
          });
          return { image: c.image(), delayMs: Math.round(1000 / fps) };
        }),
      );
      const file = join(reports, 'sprites', `${def.id}-${name}.apng.png`);
      writeFileSync(file, apng);
      console.log(file);
    }
  }
}
