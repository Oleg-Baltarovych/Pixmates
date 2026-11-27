// M-ART MA-66 (D-20, docs/art/coder.md §4, ART-BIBLE §11.9): the coder's stern faces on his own heads — the stern
// validator in both views, the eye bags, blush only on happy / petted, and the owner's q34 head rules (monotonic
// facing contour, no cheek bump, q34 never wider than the front).
import { describe, expect, it } from 'vitest';
import { CODER } from '../../../assets-src/characters/coder/body.ts';
import { CODER_FACE, CODER_FACE_Q34 } from '../../../assets-src/characters/coder/face.ts';
import { HEAD, HEAD_Q34 } from '../../../assets-src/characters/coder/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { type ExpressionId, type ViewFaceLibrary, validateFace } from '../../../assets-src/rig/face.ts';

describe('stern faces on the coder heads', () => {
  it('uses the stern face option in both views and passes the stern validator on its heads', () => {
    expect(CODER_FACE.style).toBe('stern');
    expect(CODER_FACE_Q34.style).toBe('stern');
    expect(validateFace(CODER_FACE, 'coder', { mask: HEAD, faceAt: [5, 12] })).toEqual([]);
    expect(
      validateFace(CODER_FACE_Q34, 'coder/q34', { mask: HEAD_Q34, faceAt: [7, 12] }, ['neutral', 'blink']),
    ).toEqual([]);
  });
});

describe('face (coder.md §4, ART-BIBLE §11.9)', () => {
  const eyeBags = (id: string): boolean =>
    (CODER_FACE.eyes[id]?.mask ?? []).some((row) => /^\.\.\.ss\.+ss\.\.\.$/.test(row));
  it('keeps the eye bags (2 px of skin 2, never ink) on the stern, glance, half and blink eyes', () => {
    for (const id of ['stern', 'side', 'half', 'closed']) expect(eyeBags(id), id).toBe(true);
  });
  it('drops them when the face relaxes or opens (happy, petted, sleep)', () => {
    const e = CODER_FACE.expressions;
    for (const id of ['happy', 'petted', 'sleep'] as const) expect(eyeBags(e[id].eyes), id).toBe(false);
  });
  it('blushes only on happy and petted', () => {
    const blushing = (Object.entries(CODER_FACE.expressions) as [ExpressionId, { cheeks: string }][])
      .filter(([, e]) => (CODER_FACE.cheeks[e.cheeks]?.mask ?? []).some((r) => /[fF]/.test(r)))
      .map(([id]) => id)
      .sort();
    expect(blushing).toEqual(['happy', 'petted']);
  });
});

describe('q34 head (owner rules, RIG.md)', () => {
  const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (LEGEND[c]?.[0] === 'skin' ? [x] : []));
  /** Head-mask row of the q34 lid (face anchor row 12 + the stern eye at face row 4). */
  const LID_ROW = 16;

  it('tapers the facing-side contour monotonically from the lid row: never out, in ≤ 1 px per row (no cheek bump)', () => {
    const rights = HEAD_Q34.slice(LID_ROW).map((r) => Math.max(...skinCols(r)));
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(LID_ROW + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(LID_ROW + k)}`).toBeLessThanOrEqual(1);
    }
  });
  it('keeps the q34 skin no wider than the front skin', () => {
    const width = (mask: Mask): number =>
      Math.max(
        ...mask
          .map(skinCols)
          .filter((c) => c.length > 0)
          .map((c) => Math.max(...c) - Math.min(...c) + 1),
      );
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
    for (const [lib, faceAt, head] of [
      [CODER_FACE, [5, 12], HEAD],
      [CODER_FACE_Q34, [7, 12], HEAD_Q34],
    ] as const) {
      const brows = lib.brows?.['set'];
      if (!brows) throw new Error('set brows');
      brows.mask.forEach((row, y) => {
        row.split('').forEach((c, x) => {
          if (c === '.') return;
          expect(LEGEND[c], c).toEqual(['hair', 0]);
          const hx = faceAt[0] + brows.at[0] + x;
          const hy = faceAt[1] + brows.at[1] + y;
          const above = brows.mask[y - 1]?.charAt(x) ?? '.';
          if (above === '.') expect(LEGEND[head[hy - 1]?.charAt(hx) ?? '.']?.[0], `above ${String(x)}`).toBe('skin');
        });
      });
    }
  });
});

describe('crown (art-director MA-66 round 1: originality, never spiky-up)', () => {
  /** Head-mask col of the head joint (the axis); both views share the crown. */
  const AXIS = 15;
  const hairCols = (row: string): number[] => row.split('').flatMap((c, x) => (LEGEND[c]?.[0] === 'hair' ? [x] : []));
  it.each([
    ['front', HEAD],
    ['q34', HEAD_Q34],
  ])('%s: the cowlick is not the highest point — a crown tuft left of the axis matches its height', (_, head) => {
    const top = head.findIndex((r) => hairCols(r).length > 0);
    const cols = hairCols(head[top] ?? '');
    expect(Math.min(...cols), 'crown tuft on the top row').toBeLessThan(AXIS - 2);
    // The cowlick (top-row hair right of the axis) lies sideways from 2 px right of it, at most 3 px long.
    const right = cols.filter((x) => x >= AXIS);
    expect(Math.min(...right)).toBeGreaterThanOrEqual(AXIS + 2);
    expect(right.length).toBeLessThanOrEqual(3);
  });
});
