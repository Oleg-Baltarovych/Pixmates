// Review images for the art gate (plan M-ART MA-08), written to reports/ (git-ignored):
//   pnpm sprites:sheet [<id>…]    contact sheet ×4 per pack on light + dark → reports/sprites/<id>-sheet.png
//   pnpm sprites:preview [<id>…]  APNG per animation at the real M scale over 4 backdrops (light, dark, white
//                                 "browser", dark "IDE") → reports/sprites/<id>-<anim>.apng.png
//   pnpm sprites:sheet --lineup   all packs side by side (idle, walk, happy frame strips) → reports/art-spike/
//   pnpm sprites:sheet --swatch   master palette swatch → docs/art/palette.png
//   pnpm sprites:sheet --review   the rig review bodies (dummies + maid preview, never built into resources/)
//   pnpm sprites:sheet --fx       FX marks sheet on light + dark, and marks composited at the rig fx anchor
//                                 → reports/sprites/fx-sheet.png, fx-on-<id>.png
//   pnpm sprites:sheet --real     real M size on the 4 backdrops: first frame of every animation + the walk cycle
//                                 and its runtime mirror (walking left) → reports/sprites/<id>-real.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FX_MARKS } from '../assets-src/fx/marks.ts';
import { PACKS } from '../assets-src/packs.ts';
import { MAID_PREVIEW, reviewPacks } from '../assets-src/rig/dummies.ts';
import { encodeApng, encodePng, type RgbaImage } from './lib/png.ts';
import { buildFx, buildPack, loadMasterPalette, renderContext, ROOT } from './lib/sprites.ts';

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

/** Horizontal mirror (the runtime flip for walking left). */
function mirror(img: RgbaImage): RgbaImage {
  const data = new Uint8Array(img.data.length);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const src = (y * img.width + x) * 4;
      data.set(img.data.subarray(src, src + 4), (y * img.width + (img.width - 1 - x)) * 4);
    }
  }
  return { width: img.width, height: img.height, data };
}

/** Real M-preset scale at 1080p / 125 % (plan scale table): 48 → ×4, 64 → ×3. */
const realScale = (frameH: number, scaleRef = frameH): number => Math.max(2, Math.round((136 * 1.25) / scaleRef));

const reports = join(ROOT, 'reports');
const args = process.argv.slice(2);
const ids = args.filter((a) => !a.startsWith('--'));
const ctx = renderContext(loadMasterPalette());
const review = args.includes('--review') || args.includes('--fx');
const sources = args.includes('--fx') ? [...reviewPacks(), ...PACKS] : review ? reviewPacks() : PACKS;
const packs = sources
  .filter((p) => ids.length === 0 || ids.includes(p.id))
  .map((def) => ({
    def,
    built: buildPack(def, ctx),
  }));

if (args.includes('--fx')) {
  // FX sheet: every mark frame ×6 on light and dark; then marks composited on the review bodies at the fx anchor.
  const fx = buildFx(ctx);
  const s = 6;
  const cols = Math.max(...FX_MARKS.map((m) => m.frames.length));
  const cell = 16 * s + 8;
  const half = FX_MARKS.length * cell + 8;
  const sheet = new Canvas(cols * cell + 8, half * 2);
  sheet.fill(0, 0, sheet.width, half, LIGHT);
  sheet.fill(0, half, sheet.width, half, DARK);
  for (const y0 of [0, half]) {
    FX_MARKS.forEach((m, row) => {
      (fx.frames.get(m.name) ?? []).forEach((img, col) => {
        sheet.blit(img, 8 + col * cell, y0 + 8 + row * cell, s);
      });
    });
  }
  mkdirSync(join(reports, 'sprites'), { recursive: true });
  const sheetFile = join(reports, 'sprites', 'fx-sheet.png');
  writeFileSync(sheetFile, encodePng(sheet.image()));
  console.log(`${sheetFile}  (rows: ${FX_MARKS.map((m) => m.name).join(', ')})`);
  // [anim, frame, mark, mark frame, offsets of the 16² mark frame centre from the fx anchor]
  const cases: readonly (readonly [string, number, string, number, readonly (readonly [number, number])[]])[] = [
    ['worried', 2, 'sweat', 2, [[0, 2]]],
    ['idle_a', 0, 'vein', 1, [[1, 5]]],
    [
      'petted',
      1,
      'blush',
      0,
      [
        [-15, 16],
        [-3, 16],
      ],
    ],
    ['happy', 5, 'heart', 2, [[1, -1]]],
    ['think', 3, 'question', 2, [[1, -2]]],
    ['startle', 1, 'exclaim', 2, [[0, -2]]],
    ['sleep', 2, 'zzz', 2, [[2, -3]]],
    // Smoke (switch puff) sits above and beside the head, clear of the eye and cheek.
    ['idle_a', 0, 'smoke', 2, [[9, -5]]],
  ];
  const r = 4;
  const onFx = new Set([MAID_PREVIEW.id, 'rig-dummy-b', 'pixmates.maid']);
  for (const { def, built } of packs.filter((p) => onFx.has(p.def.id))) {
    const pw = def.frameSize.w * r + 16;
    const ph = def.frameSize.h * r + 16;
    const c = new Canvas(cases.length * pw, ph * 2);
    cases.forEach(([anim, f, mark, mf, offsets], i) => {
      for (const [row, kind] of [
        [0, 'light'],
        [1, 'dark'],
      ] as const) {
        backdrop(c, i * pw, row * ph, pw, ph, kind);
        const frame = built.frames.get(anim)?.[f];
        const anchor = built.fx.get(anim)?.[f];
        const markImg = fx.frames.get(mark)?.[mf];
        if (!frame || !anchor || !markImg) continue;
        c.blit(frame, i * pw + 8, row * ph + 8, r);
        for (const [dx, dy] of offsets) {
          c.blit(markImg, i * pw + 8 + (anchor[0] + dx - 8) * r, row * ph + 8 + (anchor[1] + dy - 8) * r, r);
        }
      }
    });
    const file = join(reports, 'sprites', `fx-on-${def.id}.png`);
    writeFileSync(file, encodePng(c.image()));
    console.log(`${file}  (${cases.map(([a, , m]) => `${a}+${m}`).join(', ')})`);
  }
} else if (args.includes('--real')) {
  const kinds = ['light', 'dark', 'browser', 'ide'] as const;
  mkdirSync(join(reports, 'sprites'), { recursive: true });
  for (const { def, built } of packs.filter((p) => p.def.headroom === true)) {
    const { w, h } = def.frameSize;
    const s = realScale(h, def.scaleRef);
    const walk = built.frames.get('walk') ?? [];
    const firsts = [...built.frames.values()].map((f) => f[0]).filter((f): f is RgbaImage => f !== undefined);
    const cellW = w * s + 4;
    const cols = Math.max(firsts.length, walk.length * 2 + 1);
    const bandH = h * s * 2 + 24;
    const c = new Canvas(cols * cellW + 16, kinds.length * bandH);
    kinds.forEach((kind, k) => {
      const y0 = k * bandH;
      backdrop(c, 0, y0, c.width, bandH, kind);
      firsts.forEach((f, i) => {
        c.blit(f, 8 + i * cellW, y0 + 8, s);
      });
      walk.forEach((f, i) => {
        c.blit(f, 8 + i * cellW, y0 + 16 + h * s, s);
        c.blit(mirror(f), 8 + (walk.length + 1 + i) * cellW, y0 + 16 + h * s, s);
      });
    });
    const file = join(reports, 'sprites', `${def.id}-real.png`);
    writeFileSync(file, encodePng(c.image()));
    console.log(`${file}  (×${String(s)}; row 1: ${[...built.frames.keys()].join(', ')}; row 2: walk | mirrored walk)`);
  }
} else if (args.includes('--swatch')) {
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
    const s = realScale(h, def.scaleRef);
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
