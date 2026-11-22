// The M0 placeholder: one original 32×32 blob frame drawn by code (no asset files). Replaced by the rig in M-ART.
// Shared by the stage sprite and the tray icon. Transparent margins around the body exercise the alpha hit-test.
/** One alpha byte per art pixel, row-major (what the stage hit-test reads). */
export interface AlphaMask {
  readonly width: number;
  readonly height: number;
  readonly alpha: Uint8Array;
}

const SIZE = 32;
type Rgba = readonly [number, number, number, number];
const CLEAR: Rgba = [0, 0, 0, 0];
const OUTLINE: Rgba = [38, 30, 58, 255];
const BODY: Rgba = [122, 196, 168, 255];
const SHADE: Rgba = [84, 150, 132, 255];
const LIGHT: Rgba = [196, 236, 214, 255];
const EYE: Rgba = [38, 30, 58, 255];
const CHEEK: Rgba = [236, 140, 150, 255];

function colorAt(x: number, y: number): Rgba {
  // Body: an ellipse centred at (15.5, 18) with a one-pixel outline; two little feet.
  const dx = (x - 15.5) / 11.5;
  const dy = (y - 18) / 11;
  const d = dx * dx + dy * dy;
  const foot = y >= 28 && y <= 29 && ((x >= 8 && x <= 12) || (x >= 19 && x <= 23));
  if (d > 1.18) return foot ? OUTLINE : CLEAR;
  if (d > 0.92) return OUTLINE;
  if ((x === 11 || x === 12 || x === 19 || x === 20) && y >= 15 && y <= 18) return EYE;
  if ((x === 9 || x === 10 || x === 21 || x === 22) && y === 20) return CHEEK;
  if (dx < -0.35 && dy < -0.45) return LIGHT;
  if (dy > 0.55) return SHADE;
  return BODY;
}

export interface PixelFrame extends AlphaMask {
  /** RGBA bytes, row-major. */
  readonly rgba: Uint8Array;
}

export function placeholderFrame(): PixelFrame {
  const rgba = new Uint8Array(SIZE * SIZE * 4);
  const alpha = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const color = colorAt(x, y);
      rgba.set(color, (y * SIZE + x) * 4);
      alpha[y * SIZE + x] = color[3];
    }
  }
  return { width: SIZE, height: SIZE, rgba, alpha };
}
