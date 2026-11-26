// M-ART MA-66 (D-20, docs/art/coder.md §4, ART-BIBLE §11.9): the coder's stern faces on his own heads — the stern
// validator in both views, the eye bags, blush only on happy / petted, and the owner's q34 head rules (monotonic
// facing contour, no cheek bump, q34 never wider than the front).
import { describe, expect, it } from 'vitest';
import { CODER_FACE, CODER_FACE_Q34 } from '../../../assets-src/characters/coder/face.ts';
import { HEAD, HEAD_Q34 } from '../../../assets-src/characters/coder/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { type ExpressionId, validateFace } from '../../../assets-src/rig/face.ts';

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
