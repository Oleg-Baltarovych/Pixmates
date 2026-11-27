// Dev-only (unpackaged + `--capture-stage=<dir>`): captures the stage page, crops to the sprite and composites it
// over a light and a dark backdrop, so agents can check the render without screenshotting the user's desktop.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nativeImage, type BrowserWindow } from 'electron';

const DELAY_MS = 4000;
const PAD = 24;
const BACKDROPS = { light: [236, 240, 244], dark: [27, 31, 42] } as const;

export function captureStageForDev(stage: () => BrowserWindow | undefined, dir: string): void {
  setTimeout(() => {
    const win = stage();
    if (!win) return;
    void win.webContents.capturePage().then((image) => {
      const page = image.getSize();
      // The bitmap is in device px (125 % → 1.25× the DIP size): crop and scan in device px, never resample.
      const scaleFactor = image.getScaleFactors()[0] ?? 1;
      const bgra = image.toBitmap({ scaleFactor });
      const height = Math.round(page.height * scaleFactor);
      const w = Math.round(bgra.length / 4 / height);
      let minX = w;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < w; x++) {
          if ((bgra[(y * w + x) * 4 + 3] ?? 0) === 0) continue;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      mkdirSync(dir, { recursive: true });
      const info = { pageDip: page, scaleFactor, bitmap: { width: w, height }, sprite: { minX, minY, maxX, maxY } };
      writeFileSync(join(dir, 'stage-capture.json'), JSON.stringify(info, null, 2));
      if (maxX < 0) return;
      const x0 = Math.max(0, minX - PAD);
      const y0 = Math.max(0, minY - PAD);
      const cw = Math.min(w, maxX + PAD + 1) - x0;
      const ch = Math.min(height, maxY + PAD + 1) - y0;
      for (const [name, [r, g, b]] of Object.entries(BACKDROPS)) {
        const out = Buffer.alloc(cw * ch * 4);
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const s = ((y + y0) * w + (x + x0)) * 4;
            const d = (y * cw + x) * 4;
            const a = (bgra[s + 3] ?? 0) / 255;
            // Captured pixels are premultiplied BGRA.
            out[d] = Math.round((bgra[s] ?? 0) + b * (1 - a));
            out[d + 1] = Math.round((bgra[s + 1] ?? 0) + g * (1 - a));
            out[d + 2] = Math.round((bgra[s + 2] ?? 0) + r * (1 - a));
            out[d + 3] = 255;
          }
        }
        const png = nativeImage.createFromBitmap(out, { width: cw, height: ch }).toPNG();
        writeFileSync(join(dir, `stage-${name}.png`), png);
      }
      console.log(`[dev] stage captured to ${dir}`);
    });
  }, DELAY_MS);
}
