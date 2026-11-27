// Dev-only art lineup labels (MA-31: the position in `--art-lineup`): pixel letters A–D, light fill with a dark
// coloured outline so they read on any wallpaper. Not user UI (no i18n).

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
};

const FILL = [246, 240, 226, 255] as const;
const EDGE = [40, 29, 59, 255] as const;

export interface Glyph {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

/** A 7×9 RGBA glyph (5×7 letter + 1-px outline). Unknown letters give an empty glyph. */
export function labelGlyph(letter: string): Glyph {
  const rows = GLYPHS[letter] ?? [];
  const width = 7;
  const height = 9;
  const rgba = new Uint8Array(width * height * 4);
  const on = (x: number, y: number): boolean => rows[y - 1]?.charAt(x - 1) === '#';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (on(x, y)) rgba.set(FILL, (y * width + x) * 4);
      else if ([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => on(x + dx, y + dy))))
        rgba.set(EDGE, (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}
