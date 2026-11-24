// Style spike (adult proportions, owner request 2026-11-24): renders assets-src/spike/style/ figures into
// reports/sprites/style-spike/ (git-ignored). Never touches resources/. Run: node tools/style-spike.ts
//   blind lineup (6 figures incl. the current ronin + goth, dot-coded; key in key.txt) at 1×, real M scale and ×4
//   on white / dark IDE / browser grey; a 3× face crop; APNGs per variant per animation; metrics on stdout.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPIKE_ANIMS } from '../assets-src/spike/style/anims.ts';
import { PROPS, renderFigure, setRampSizes, type Frame, type Variant } from '../assets-src/spike/style/figure.ts';
import type { CharId } from '../assets-src/spike/style/heads.ts';
import { Paint } from '../assets-src/spike/style/paint.ts';
import { toOklab } from '../assets-src/lib/palette.ts';
import { decodePng, encodeApng, encodePng, type RgbaImage } from './lib/png.ts';
import { loadMasterPalette, ROOT } from './lib/sprites.ts';

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const IDE: Rgb = [30, 30, 30];
const GREY: Rgb = [222, 225, 230];
const BACKDROPS: readonly Rgb[] = [WHITE, IDE, GREY];

const palette = loadMasterPalette();
setRampSizes(Object.fromEntries([...palette.ramps].map(([k, v]) => [k, v.length])));
const out = join(ROOT, 'reports', 'sprites', 'style-spike');
mkdirSync(out, { recursive: true });

class Canvas {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
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
  blit(src: RgbaImage, x: number, y: number, s: number, crop?: readonly [number, number, number, number]): void {
    const [cx, cy, cw, ch] = crop ?? [0, 0, src.width, src.height];
    for (let sy = cy; sy < cy + ch; sy++) {
      for (let sx = cx; sx < cx + cw; sx++) {
        const i = (sy * src.width + sx) * 4;
        if ((src.data[i + 3] ?? 0) === 0) continue;
        const px = src.data.subarray(i, i + 4);
        for (let dy = 0; dy < s; dy++) {
          for (let dx = 0; dx < s; dx++) {
            const X = x + (sx - cx) * s + dx;
            const Y = y + (sy - cy) * s + dy;
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

interface Fig {
  readonly key: string;
  readonly frameH: number;
  /** Standing-figure height for the M preset scale (scaleRef). */
  readonly ref: number;
  readonly idle: RgbaImage;
  /** Face crop rect in frame px. */
  readonly face: readonly [number, number, number, number];
}

const render = (char: CharId, v: Variant, f: Frame, tuft = true): RgbaImage =>
  renderFigure(char, PROPS[v], f, { tuft }).toImage(palette);

/** Manifest scaleRef a pack would declare: B keeps 48 (as today), C = the 58-row standing figure. */
const SCALE_REF: Readonly<Record<Variant, number>> = { B: 48, C: 58, 'C+': 66 };
const realScale = (ref: number): number => Math.max(2, Math.round((136 * 1.25) / ref));

function bbox(img: RgbaImage): { top: number; bottom: number; left: number; right: number } {
  let top = img.height;
  let bottom = -1;
  let left = img.width;
  let right = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if ((img.data[(y * img.width + x) * 4 + 3] ?? 0) === 0) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  return { top, bottom, left, right };
}

/** Darkest OKLab L and the most saturated chroma used (gate: dark anchor L ≤ 0.28, accent C ≥ 0.12). */
function lc(img: RgbaImage): { minL: number; maxC: number } {
  let minL = 1;
  let maxC = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if ((img.data[i + 3] ?? 0) === 0) continue;
    const rgb = ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
    const [L, a, b] = toOklab(rgb);
    minL = Math.min(minL, L);
    maxC = Math.max(maxC, Math.sqrt(a * a + b * b));
  }
  return { minL, maxC };
}

// ── current packs (reference): first idle_a frame from the generated atlas (read only) ─────────────────────────
function currentIdle(id: string): RgbaImage {
  const dir = join(ROOT, 'resources', 'characters', id);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
    frameSize: { w: number; h: number };
    animations: Record<string, { origin: { x: number; y: number } }>;
  };
  const atlas = decodePng(readFileSync(join(dir, 'sprites', 'atlas.png')));
  const { w, h } = manifest.frameSize;
  const o = manifest.animations['idle_a']?.origin ?? { x: 0, y: 0 };
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const s = ((o.y + y) * atlas.width + o.x) * 4;
    data.set(atlas.data.subarray(s, s + w * 4), y * w * 4);
  }
  return { width: w, height: h, data };
}

const first = SPIKE_ANIMS[0]?.frames[0];
if (!first) throw new Error('no idle frame');
const figs: Fig[] = [];
for (const char of ['ronin', 'goth'] as const) {
  for (const v of ['B', 'C', 'C+'] as const) {
    const img = render(char, v, first);
    const bb = bbox(img);
    const hy = bb.top;
    figs.push({
      key: `${char}-${v}`,
      frameH: PROPS[v].h,
      ref: SCALE_REF[v],
      idle: img,
      face: [Math.floor(PROPS[v].w / 2) - 10, hy, 20, 18],
    });
  }
}
for (const id of ['pixmates.ronin', 'pixmates.goth']) {
  const img = currentIdle(id);
  const bb = bbox(img);
  figs.push({ key: `${id} (current)`, frameH: img.height, ref: 48, idle: img, face: [12, bb.top, 24, 22] });
}

// Blind order: fixed permutation (not alphabetical, not grouped by variant).
const ORDER = [4, 0, 6, 2, 5, 7, 1, 3] as const;
const blind = ORDER.map((i) => figs[i]).filter((f): f is Fig => f !== undefined);
writeFileSync(
  join(out, 'key.txt'),
  `${blind.map((f, i) => `${String(i + 1)} dot${i === 0 ? '' : 's'} = ${f.key}`).join('\n')}\n`,
);

function lineup(scaleOf: (f: Fig) => number, file: string): void {
  const pad = 12;
  const cellW = Math.max(...blind.map((f) => f.idle.width * scaleOf(f))) + pad;
  const cellH = Math.max(...blind.map((f) => f.frameH * scaleOf(f))) + pad + 10;
  const c = new Canvas(cellW * blind.length + pad, (cellH + pad) * BACKDROPS.length + pad);
  BACKDROPS.forEach((bg, row) => {
    const y0 = pad + row * (cellH + pad);
    c.fill(0, y0 - pad / 2, c.width, cellH + pad, bg);
    blind.forEach((f, i) => {
      const s = scaleOf(f);
      const x = pad + i * cellW + Math.floor((cellW - pad - f.idle.width * s) / 2);
      // feet on one baseline: align the frame bottoms (all figures stand 2 rows above their frame bottom).
      const y = y0 + (cellH - 10 - f.frameH * s);
      c.blit(f.idle, x, y, s);
      const ink: Rgb = bg === IDE ? [200, 200, 200] : [60, 64, 72];
      for (let d = 0; d <= i; d++) c.fill(pad + i * cellW + d * 6, y0 + cellH - 6, 3, 3, ink);
    });
  });
  writeFileSync(join(out, file), encodePng(c.image()));
  console.log(join(out, file));
}

lineup(() => 1, 'lineup-1x.png');
lineup((f) => realScale(f.ref), 'lineup-real-M.png');
lineup(() => 4, 'lineup-x4.png');

// 3× face crop (same blind order), white + IDE.
{
  const s = 3;
  const c = new Canvas(blind.length * (24 * s + 8) + 8, 2 * (22 * s + 8) + 8);
  [WHITE, IDE].forEach((bg, row) => {
    c.fill(0, row * (22 * s + 8), c.width, 22 * s + 16, bg);
    blind.forEach((f, i) => {
      const [x, y, w, h] = f.face;
      c.blit(f.idle, 8 + i * (24 * s + 8), 8 + row * (22 * s + 8), s, [x, y, Math.min(w, f.idle.width - x), h]);
    });
  });
  writeFileSync(join(out, 'faces-x3.png'), encodePng(c.image()));
}

// APNGs per figure per animation: real M scale over white | IDE, plus the mirrored walk (walking left).
function apng(frames: readonly RgbaImage[], fps: number, s: number, file: string): void {
  const w = (frames[0]?.width ?? 0) * s;
  const h = (frames[0]?.height ?? 0) * s;
  const images = frames.map((img) => {
    const c = new Canvas(w * 2 + 8, h + 8);
    c.fill(0, 0, w + 4, h + 8, WHITE);
    c.fill(w + 4, 0, w + 4, h + 8, IDE);
    c.blit(img, 2, 4, s);
    c.blit(img, w + 6, 4, s);
    return { image: c.image(), delayMs: Math.round(1000 / fps) };
  });
  writeFileSync(join(out, file), encodeApng(images));
}

const metrics: string[] = [];
for (const char of ['ronin', 'goth'] as const) {
  for (const v of ['B', 'C', 'C+'] as const) {
    const idleImg = render(char, v, first);
    const bb = bbox(idleImg);
    const s = realScale(SCALE_REF[v]);
    for (const a of SPIKE_ANIMS) {
      const frames = a.frames.map((f) => render(char, v, f));
      apng(frames, a.fps, s, `${char}-${v}-${a.name}.apng.png`);
      if (a.name === 'walk')
        apng(
          frames.map((img) => Paint.mirror(img)),
          a.fps,
          s,
          `${char}-${v}-walk_left.apng.png`,
        );
    }
    if (char === 'ronin') {
      apng(
        SPIKE_ANIMS[0]?.frames.map((f) => render(char, v, f, false)) ?? [],
        6,
        s,
        `${char}-${v}-idle_a-notuft.apng.png`,
      );
    }
    // contact sheet ×4: first frame of every anim (+ no-tuft idle for ronin)
    const sheetFrames = SPIKE_ANIMS.map((a) => a.frames[Math.min(2, a.frames.length - 1)] ?? first).map((f) =>
      render(char, v, f),
    );
    if (char === 'ronin') sheetFrames.push(render(char, v, first, false));
    const c = new Canvas(sheetFrames.length * PROPS[v].w * 4, PROPS[v].h * 4 * 2);
    c.fill(0, 0, c.width, PROPS[v].h * 4, WHITE);
    c.fill(0, PROPS[v].h * 4, c.width, PROPS[v].h * 4, IDE);
    sheetFrames.forEach((img, i) => {
      c.blit(img, i * PROPS[v].w * 4, 0, 4);
      c.blit(img, i * PROPS[v].w * 4, PROPS[v].h * 4, 4);
    });
    writeFileSync(join(out, `${char}-${v}-sheet-x4.png`), encodePng(c.image()));
    const { minL, maxC } = lc(idleImg);
    metrics.push(
      `${char}-${v}: frame ${String(PROPS[v].w)}×${String(PROPS[v].h)}, figure rows ${String(bb.top)}–${String(bb.bottom)} (${String(
        bb.bottom - bb.top + 1,
      )}), width ${String(bb.right - bb.left + 1)}, M scale ×${String(s)}, min L ${minL.toFixed(3)}, max C ${maxC.toFixed(3)}`,
    );
  }
}
console.log(metrics.join('\n'));
