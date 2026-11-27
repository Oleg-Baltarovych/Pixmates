// M-ART MA-66 (D-20, docs/art/coder.md, ART-BIBLE §11.9; owner redesign 2026-11-27): the coder's stern faces on his
// own hooded heads — the stern validator in both views, the glasses (and no face part ever painting over them), blush
// only on happy / petted, the hood that is never down in any frame, and the owner's q34 head rules (monotonic facing
// contour, no cheek bump, q34 never wider than the front) measured on the head outline.
import { describe, expect, it } from 'vitest';
import { CODER } from '../../../assets-src/characters/coder/body.ts';
import { CODER_FACE, CODER_FACE_Q34 } from '../../../assets-src/characters/coder/face.ts';
import { HEAD, HEAD_Q34 } from '../../../assets-src/characters/coder/masks.ts';
import { LEGEND, type Mask, type Slot } from '../../../assets-src/lib/mask.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { type ExpressionId, type ViewFaceLibrary, validateFace } from '../../../assets-src/rig/face.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const slotOf = (ch: string): Slot | undefined => LEGEND[ch]?.[0];
const VIEWS = [
  ['front', CODER_FACE, HEAD, [5, 12]],
  ['q34', CODER_FACE_Q34, HEAD_Q34, [7, 12]],
] as const;

describe('stern faces on the coder heads', () => {
  it('uses the stern face option in both views and passes the stern validator on its heads', () => {
    expect(CODER_FACE.style).toBe('stern');
    expect(CODER_FACE_Q34.style).toBe('stern');
    expect(validateFace(CODER_FACE, 'coder', { mask: HEAD, faceAt: [5, 12] })).toEqual([]);
    expect(
      validateFace(CODER_FACE_Q34, 'coder/q34', { mask: HEAD_Q34, faceAt: [7, 12] }, ['neutral', 'blink']),
    ).toEqual([]);
  });
  it('blushes only on happy and petted', () => {
    const blushing = (Object.entries(CODER_FACE.expressions) as [ExpressionId, { cheeks: string }][])
      .filter(([, e]) => (CODER_FACE.cheeks[e.cheeks]?.mask ?? []).some((r) => /[fF]/.test(r)))
      .map(([id]) => id)
      .sort();
    expect(blushing).toEqual(['happy', 'petted']);
  });
});

describe('glasses (owner 2026-11-27: rectangular steel frames, no tint, no glow)', () => {
  /** Head-mask px of one face part placed on the face anchor. */
  const placed = (faceAt: readonly [number, number], at: readonly [number, number], mask: Mask) =>
    mask.flatMap((row, y) =>
      row.split('').flatMap((c, x) => (c === '.' ? [] : [{ c, x: faceAt[0] + at[0] + x, y: faceAt[1] + at[1] + y }])),
    );

  it.each(VIEWS)(
    '%s: each neutral iris sits in a steel frame — posts either side, a lower rim under it',
    (_, lib, head, faceAt) => {
      const eye = lib.eyes[lib.expressions.neutral?.eyes ?? ''];
      if (!eye) throw new Error('neutral eyes');
      const iris = placed(faceAt, eye.at, eye.mask).filter((p) => slotOf(p.c) === 'eye');
      const metal = (x: number, y: number): boolean => slotOf(head[y]?.charAt(x) ?? '.') === 'horn';
      for (const half of [iris.filter((p) => p.x < faceAt[0] + 10), iris.filter((p) => p.x >= faceAt[0] + 10)]) {
        expect(half.length).toBeGreaterThan(0);
        const xs = half.map((p) => p.x);
        const ys = half.map((p) => p.y);
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        // Lower rim: the row right under the iris is steel across the iris width.
        for (let x = x0; x <= x1; x++) expect(metal(x, y1 + 1), `rim ${String(x)}`).toBe(true);
        // Posts: on every iris row a steel px left and right of the iris, within 3 px.
        for (let y = y0; y <= y1; y++) {
          const left = [1, 2, 3].some((d) => metal(x0 - d, y));
          const right = [1, 2, 3].some((d) => metal(x1 + d, y));
          expect(left && right, `posts row ${String(y)}`).toBe(true);
        }
      }
    },
  );
  it.each(VIEWS)(
    '%s: the steel px are only the glasses — none above the brows or below the rim row',
    (_, lib, head, faceAt) => {
      const rows = head.flatMap((r, y) => (r.split('').some((c) => slotOf(c) === 'horn') ? [y] : []));
      const brows = lib.brows?.['set'];
      if (!brows) throw new Error('set brows');
      expect(Math.min(...rows)).toBeGreaterThan(faceAt[1] + brows.at[1] + brows.mask.length - 1);
      expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(5);
    },
  );
  it.each(VIEWS)('%s: no face part of any expression paints over a frame px', (_, lib, head, faceAt) => {
    for (const [id, e] of Object.entries(lib.expressions)) {
      const parts = [
        lib.eyes[e.eyes],
        e.brows === undefined ? undefined : lib.brows?.[e.brows],
        lib.mouths[e.mouth],
        e.raisedMouth === undefined ? undefined : lib.mouths[e.raisedMouth],
        lib.cheeks[e.cheeks],
      ];
      for (const part of parts) {
        for (const p of part ? placed(faceAt, part.at, part.mask) : []) {
          expect(slotOf(head[p.y]?.charAt(p.x) ?? '.'), `${id} at ${String(p.x)},${String(p.y)}`).not.toBe('horn');
        }
      }
    }
  });
  it('lenses are clear: the head px inside each front frame are skin, never tinted', () => {
    const rim = HEAD.findIndex((r) => (r.match(/n/g) ?? []).length >= 12);
    for (let y = rim - 5; y < rim; y++) {
      const row = HEAD[y] ?? '';
      const posts = row.split('').flatMap((c, x) => (slotOf(c) === 'horn' ? [x] : []));
      const [a, b, c, d] = [posts[0] ?? 0, posts[1] ?? 0, posts.at(-2) ?? 0, posts.at(-1) ?? 0];
      for (const [lo, hi] of [
        [a, b],
        [c, d],
      ] as const) {
        for (let x = lo + 1; x < hi; x++) expect(slotOf(row.charAt(x)), `${String(x)},${String(y)}`).toBe('skin');
      }
    }
  });
});

describe('glasses tones and the closed eyes (art-director MA-66 round 2)', () => {
  const shadeOf = (ch: string): number | undefined => {
    const e = LEGEND[ch];
    return e?.[0] === 'horn' ? CODER.outfit.horn.tones[e[1]] : undefined;
  };
  it.each(VIEWS)('%s: posts and bridge are metal 1, only the lower rim is metal 2', (_, _lib, head) => {
    const steel = head.flatMap((r, y) => r.split('').flatMap((c, x) => (slotOf(c) === 'horn' ? [{ c, x, y }] : [])));
    const rimRow = Math.max(...steel.map((p) => p.y));
    for (const p of steel) {
      expect(shadeOf(p.c), `${String(p.x)},${String(p.y)}`).toBe(p.y === rimRow ? 2 : 1);
    }
  });
  it.each(VIEWS)(
    '%s: the closed eyes sit in the lower lens, ≥ 3 rows under the bridge (no bridge / lid / rim «≡»)',
    (_, lib, head, faceAt) => {
      const closed = lib.eyes['closed'];
      if (!closed) throw new Error('closed eyes');
      const rows = new Set(closed.mask.flatMap((r, y) => (/X/.test(r) ? [faceAt[1] + closed.at[1] + y] : [])));
      expect(rows.size).toBe(1);
      const lidRow = [...rows][0] ?? -1;
      const horn = (y: number): number => (head[y] ?? '').split('').filter((c) => slotOf(c) === 'horn').length;
      const rimRow = head.findIndex((_r, y) => horn(y) >= 12);
      // The bridge: the steel row with the most px above the rim.
      const bridgeRow = head
        .map((_r, y) => y)
        .filter((y) => y < rimRow)
        .reduce((a, b) => (horn(b) > horn(a) ? b : a));
      expect(lidRow).toBe(rimRow - 1);
      expect(lidRow - bridgeRow).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('hood rim (art-director MA-66 round 2: soft corners, never a TV frame or visor)', () => {
  const rim = (head: Mask): { x: number; y: number; c: string }[] =>
    head.flatMap((r, y) => r.split('').flatMap((c, x) => (slotOf(c) === 'trim' ? [{ c, x, y }] : [])));
  const trimTone = (c: string): number | undefined => LEGEND[c]?.[1];

  it('front: both top corners bevel in 2 diagonal steps — corner px empty of mustard, lit 4 / shade 3', () => {
    const px = rim(HEAD);
    const has = (x: number, y: number): boolean => px.some((p) => p.x === x && p.y === y);
    const top = Math.min(...px.map((p) => p.y));
    const [xl, xr] = [Math.min(...px.map((p) => p.x)), Math.max(...px.map((p) => p.x))];
    for (const [side, edge] of [
      [1, xl],
      [-1, xr],
    ] as const) {
      // In the 4 × 4 corner box the rim is exactly: top row from 3 cols in, two diagonal px, the side from 3 rows down.
      const diag = [
        [edge + side * 2, top + 1],
        [edge + side, top + 2],
      ] as const;
      for (let dy = 0; dy < 4; dy++) {
        for (let k = 0; k < 4; k++) {
          const x = edge + side * k;
          const y = top + dy;
          const want =
            (dy === 0 && k === 3) || (k === 0 && dy === 3) || diag.some(([dx, dyy]) => dx === x && dyy === y);
          expect(has(x, y), `corner ${String(x)},${String(y)}`).toBe(want);
        }
      }
      for (const [x, y] of diag) {
        expect(trimTone(HEAD[y]?.charAt(x) ?? '.'), `diagonal ${String(x)},${String(y)}`).toBe(side > 0 ? 4 : 3);
      }
    }
  });
  it('front: the last rim px of each side bends 1 col in toward the jaw', () => {
    const px = rim(HEAD);
    const bottom = Math.max(...px.map((p) => p.y));
    const [xl, xr] = [Math.min(...px.map((p) => p.x)), Math.max(...px.map((p) => p.x))];
    expect(px.filter((p) => p.y === bottom).map((p) => p.x)).toEqual([xl + 1, xr - 1]);
    expect(px.filter((p) => p.y === bottom - 1).map((p) => p.x)).toEqual([xl, xr]);
  });
  it('q34: the facing-side top corner bevels — one mustard-3 diagonal px, no corner px', () => {
    const px = rim(HEAD_Q34);
    const has = (x: number, y: number): boolean => px.some((p) => p.x === x && p.y === y);
    const top = Math.min(...px.map((p) => p.y));
    const xr = Math.max(...px.map((p) => p.x));
    expect(has(xr, top)).toBe(false);
    expect(has(xr, top + 1)).toBe(false);
    expect(has(xr - 1, top)).toBe(false);
    expect(has(xr - 2, top)).toBe(true);
    expect(has(xr - 1, top + 1)).toBe(true);
    expect(trimTone(HEAD_Q34[top + 1]?.charAt(xr - 1) ?? '.')).toBe(3);
    expect(has(xr, top + 2)).toBe(true);
  });
});

describe('hood edge on dark wallpapers (art-director MA-66 round 2, rendered)', () => {
  const palette = loadMasterPalette();
  const ctx = renderContext(palette);
  const renderer = createRigRenderer(CODER);
  const onyx = palette.ramps.get('cloth_onyx') ?? [];
  const step = (c: number | undefined): number => (c === undefined ? -1 : onyx.indexOf(c));
  const idle = ANIMS.find((a) => a.name === 'idle_a');
  if (!idle) throw new Error('idle_a');
  const { image } = renderer.renderLabeled(idle, 0, ctx);
  const w = image.width;
  const rgb = (x: number, y: number): number | undefined => {
    const i = (y * w + x) * 4;
    if (x < 0 || x >= w || !image.data[i + 3]) return undefined;
    return ((image.data[i] ?? 0) << 16) | ((image.data[i + 1] ?? 0) << 8) | (image.data[i + 2] ?? 0);
  };
  const MUSTARD = new Set(palette.ramps.get('cloth_mustard') ?? []);
  const rows = Array.from({ length: image.height }, (_, y) => y);
  /** The hood: from its first row down to the last row that still has a mustard rim px. */
  const top = rows.find((y) => Array.from({ length: w }, (_, x) => rgb(x, y)).some((c) => c !== undefined)) ?? 0;
  const rimRows = rows.filter((y) => Array.from({ length: w }, (_, x) => rgb(x, y)).some((c) => MUSTARD.has(c ?? -1)));
  const firstRim = Math.min(...rimRows);
  // The hood rim's own rows: the first unbroken run (the drawstrings and badge mark below are mustard too).
  let lastRim = firstRim;
  while (rimRows.includes(lastRim + 1)) lastRim++;
  /** The shade-side outline px of a row: the rightmost px that is not a top-facing lit (onyx 5) outline step. */
  const right = (y: number): number => {
    for (let x = w - 1; x >= 0; x--) if (rgb(x, y) !== undefined && step(rgb(x, y)) !== 5) return x;
    return -1;
  };

  it('shade side: an onyx-4 edge just inside the outline from the crown down to the jaw', () => {
    for (let y = top + 1; y <= lastRim; y++) expect(step(rgb(right(y) - 1, y)), `row ${String(y)}`).toBe(4);
  });
  it('dome shade side: onyx 0–1 just inside that edge (the dark edge still reads on white)', () => {
    for (let y = top + 2; y < firstRim + 2; y++) {
      const s = step(rgb(right(y) - 2, y));
      expect(s >= 0 && s <= 1, `row ${String(y)}`).toBe(true);
    }
  });
  it('lit top-left: an unbroken onyx-5 outline arc ≥ 6 px and a 3–4 px onyx-4 sheen right inside it', () => {
    const cx = Math.round(renderer.joints(idle, 0).head[0]);
    const arc: [number, number][] = [];
    const sheen: [number, number][] = [];
    for (let y = top; y < firstRim; y++) {
      for (let x = 0; x <= cx; x++) {
        const s = step(rgb(x, y));
        const outer = rgb(x - 1, y) === undefined || rgb(x, y - 1) === undefined;
        if (outer && s === 5) arc.push([x, y]);
        const inner = [rgb(x - 1, y), rgb(x, y - 1)].some((c) => step(c) === 5);
        if (!outer && inner && s === 4) sheen.push([x, y]);
      }
    }
    expect(arc.length).toBeGreaterThanOrEqual(6);
    // Unbroken: every arc px has an 8-neighbour on the arc.
    for (const [x, y] of arc) {
      expect(
        arc.some(([u, v]) => (u !== x || v !== y) && Math.abs(u - x) <= 1 && Math.abs(v - y) <= 1),
        `arc ${String(x)},${String(y)}`,
      ).toBe(true);
    }
    expect(sheen.length).toBeGreaterThanOrEqual(3);
    expect(sheen.length).toBeLessThanOrEqual(4);
    // One arc, not scattered stair-corner lights: every sheen px touches another (8-neighbour).
    for (const [x, y] of sheen) {
      expect(
        sheen.some(([u, v]) => (u !== x || v !== y) && Math.abs(u - x) <= 1 && Math.abs(v - y) <= 1),
        `sheen ${String(x)},${String(y)}`,
      ).toBe(true);
    }
  });
});

describe('q34 head (owner rules, RIG.md) — on the head outline, so the glasses never skew it', () => {
  const outline = (row: string): [number, number] | undefined => {
    const xs = row.split('').flatMap((c, x) => (c === '.' ? [] : [x]));
    return xs.length === 0 ? undefined : [Math.min(...xs), Math.max(...xs)];
  };
  /** Head-mask row of the q34 lid (face anchor row 12 + the stern eye at face row 4). */
  const LID_ROW = 16;

  it('tapers the facing-side contour monotonically from the lid row: never out, in ≤ 1 px per row (no cheek bump)', () => {
    const rights = HEAD_Q34.slice(LID_ROW).flatMap((r) => outline(r)?.[1] ?? []);
    expect(rights.length).toBeGreaterThan(8);
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(LID_ROW + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(LID_ROW + k)}`).toBeLessThanOrEqual(1);
    }
  });
  it('keeps the q34 head no wider than the front head', () => {
    const width = (mask: Mask): number =>
      Math.max(...mask.map((r) => outline(r)).flatMap((o) => (o ? [o[1] - o[0] + 1] : [])));
    expect(width(HEAD_Q34)).toBeLessThanOrEqual(width(HEAD));
  });
});

describe('stern eyes (art-director MA-66 round 1: dark, hooded, "unimpressed")', () => {
  const eyeShade = (ch: string): number | undefined => {
    const e = LEGEND[ch];
    return e?.[0] === 'eye' ? CODER.outfit.eye.tones[e[1]] : undefined;
  };
  const isInk = (ch: string): boolean => LEGEND[ch]?.[0] === 'ink';
  const eyesOf = (lib: ViewFaceLibrary, id: ExpressionId): Mask => {
    const e = lib.expressions[id];
    const part = e ? lib.eyes[e.eyes] : undefined;
    if (!part) throw new Error(id);
    return part.mask;
  };
  /** Per eye half (cols < 10, ≥ 10): the rows holding iris px, top to bottom. */
  const irisRows = (m: Mask): string[][] =>
    [
      [0, 10],
      [10, 20],
    ].map(([a, b]) => m.map((r) => r.slice(a, b)).filter((r) => r.split('').some((c) => eyeShade(c) !== undefined)));
  const lit = (row: string | undefined): boolean => (row ?? '').split('').some((c) => (eyeShade(c) ?? 0) >= 4);
  const STERN: readonly ExpressionId[] = ['neutral', 'talk_a', 'talk_b', 'talk_c'];

  it('drops the lower highlight on neutral and talk (both views), keeps it on happy and startle', () => {
    for (const id of STERN)
      for (const rows of irisRows(eyesOf(CODER_FACE, id))) expect(lit(rows.at(-1)), id).toBe(false);
    for (const rows of irisRows(eyesOf(CODER_FACE_Q34, 'neutral'))) expect(lit(rows.at(-1)), 'q34').toBe(false);
    for (const id of ['happy', 'startle'] as const) {
      for (const rows of irisRows(eyesOf(CODER_FACE, id))) expect(lit(rows.at(-1)), id).toBe(true);
    }
  });
  it('keeps the visible stern iris dark: one highlight per eye, every other iris px at hair_ash 1 or darker', () => {
    for (const [lib, id] of [...STERN.map((s) => [CODER_FACE, s] as const), [CODER_FACE_Q34, 'neutral'] as const]) {
      for (const rows of irisRows(eyesOf(lib, id))) {
        const shades = rows.flatMap((r) => r.split('').flatMap((c) => eyeShade(c) ?? []));
        expect(
          shades.filter((s) => s >= 4),
          id,
        ).toHaveLength(1);
        expect(Math.max(...shades.filter((s) => s < 4)), id).toBeLessThanOrEqual(1);
      }
    }
  });
  it('runs both lid rows past the outer corner and drops the lid inner end 1 px (brow–lid wedge)', () => {
    for (const m of [eyesOf(CODER_FACE, 'neutral'), eyesOf(CODER_FACE_Q34, 'neutral')]) {
      const top = m.findIndex((r) => r.split('').some((c) => eyeShade(c) !== undefined));
      for (const [a, b, outer] of [
        [0, 10, -1],
        [10, 20, 1],
      ] as const) {
        const cols = (y: number, f: (c: string) => boolean): number[] =>
          (m[y] ?? '').split('').flatMap((c, x) => (x >= a && x < b && f(c) ? [x] : []));
        const iris = m.flatMap((_, y) => cols(y, (c) => eyeShade(c) !== undefined));
        const irisOuter = outer < 0 ? Math.min(...iris) : Math.max(...iris);
        for (const y of [top - 2, top - 1]) {
          const ink = cols(y, isInk);
          const lidOuter = outer < 0 ? Math.min(...ink) : Math.max(...ink);
          expect((lidOuter - irisOuter) * outer, `lid row ${String(y)}`).toBeGreaterThanOrEqual(1);
        }
        const lidInner = outer < 0 ? Math.max(...cols(top - 1, isInk)) : Math.min(...cols(top - 1, isInk));
        expect(isInk(m[top]?.charAt(lidInner) ?? '.'), `wedge ${String(a)}`).toBe(true);
      }
    }
  });
  it('draws the set brows in hair_cocoa 0 with a clean skin row above them on the head', () => {
    for (const [, lib, head, faceAt] of VIEWS) {
      const brows = lib.brows?.['set'];
      if (!brows) throw new Error('set brows');
      brows.mask.forEach((row, y) => {
        row.split('').forEach((c, x) => {
          if (c === '.') return;
          expect(LEGEND[c], c).toEqual(['hair', 0]);
          const hx = faceAt[0] + brows.at[0] + x;
          const hy = faceAt[1] + brows.at[1] + y;
          const above = brows.mask[y - 1]?.charAt(x) ?? '.';
          if (above === '.') expect(slotOf(head[hy - 1]?.charAt(hx) ?? '.'), `above ${String(x)}`).toBe('skin');
        });
      });
    }
  });
});

describe('hood (owner 2026-11-27: always up, never down — no emotion, pose or sleep removes it)', () => {
  const palette = loadMasterPalette();
  const ctx = renderContext(palette);
  const renderer = createRigRenderer(CODER);
  const tones = (ramp: string): Set<number> => new Set(palette.ramps.get(ramp) ?? []);
  const [ONYX, MUSTARD, HAIR, SKIN] = ['cloth_onyx', 'cloth_mustard', 'hair_cocoa', 'skin'].map(tones);
  const frames = ANIMS.flatMap((a) => a.frames.map((_, f) => [a, f] as const));

  it.each(frames.map(([a, f]) => [`${a.name}/${String(f)}`, a, f] as const))(
    '%s: the crown is hood (top 3 head rows onyx only) and every hair px sits under the mustard hood edge',
    (_, a, f) => {
      const { image } = renderer.renderLabeled(a, f, ctx);
      const hx = Math.round(renderer.joints(a, f).head[0]);
      const w = image.width;
      const rgb = (x: number, y: number): number | undefined => {
        const i = (y * w + x) * 4;
        if (!image.data[i + 3]) return undefined;
        return ((image.data[i] ?? 0) << 16) | ((image.data[i + 1] ?? 0) << 8) | (image.data[i + 2] ?? 0);
      };
      const cols = Array.from({ length: 21 }, (_, k) => hx - 10 + k).filter((x) => x >= 0 && x < w);
      const top = Math.min(
        ...cols.map((x) => {
          for (let y = 0; y < image.height; y++) if (rgb(x, y) !== undefined) return y;
          return image.height;
        }),
      );
      let hood = 0;
      for (let y = top; y < top + 3; y++) {
        for (const x of cols) {
          const c = rgb(x, y);
          if (c === undefined) continue;
          expect(HAIR?.has(c) || SKIN?.has(c), `${String(x)},${String(y)}`).toBe(false);
          if (ONYX?.has(c)) hood++;
        }
      }
      expect(hood).toBeGreaterThan(10);
      let hair = 0;
      for (const x of cols) {
        for (let y = top; y < top + 20; y++) {
          const c = rgb(x, y);
          if (c === undefined || !HAIR?.has(c)) continue;
          hair++;
          const framed = Array.from({ length: y - top }, (_, k) => rgb(x, top + k)).some(
            (u) => u !== undefined && MUSTARD?.has(u),
          );
          expect(framed, `hair ${String(x)},${String(y)}`).toBe(true);
        }
      }
      expect(hair, 'the fringe shows').toBeGreaterThan(0);
    },
  );
});
