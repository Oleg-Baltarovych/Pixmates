// Face library format + validator (plan M-ART MA-24, docs/art/RIG.md §Face library). A character authors reusable
// parts (≈ 8 eye masks, 6 mouths, brows, cheeks) placed on the face anchor; an expression picks one of each. The
// validator fails the build when an expression is missing, a part id is unknown, a mask uses a non-face slot or a
// face px would land on a hair px of the head mask or outside it (ART-BIBLE §11: a face px never covers hair).
import type { Point } from '../lib/chain.ts';
import { LEGEND, type Mask, type Slot } from '../lib/mask.ts';

export const EXPRESSIONS = [
  'neutral',
  'blink',
  'half',
  'talk_a',
  'talk_b',
  'talk_c',
  'happy',
  'worried',
  'think',
  'sleep',
  'startle',
  'petted',
  'wince',
  /** idle_a micro-variation: neutral with the irises 1 px toward the facing side (screen-right). */
  'glance',
] as const;
export type ExpressionId = (typeof EXPRESSIONS)[number];

/** Slots a face layer may paint: ink lines, iris, blush, skin (lids, cheek light) and trim (tongue). */
export const FACE_SLOTS: ReadonlySet<Slot> = new Set<Slot>(['ink', 'eye', 'blush', 'skin', 'trim', 'apron']);

export interface FacePart {
  readonly mask: Mask;
  /** Top-left relative to the face anchor. */
  readonly at: Point;
}

export interface Expression {
  readonly eyes: string;
  readonly brows?: string;
  readonly mouth: string;
  /** Mouth on frames with both arms `up` (happy: the open D-mouth on the jump); default `mouth`. */
  readonly raisedMouth?: string;
  readonly cheeks: string;
}

export interface FaceLibrary {
  readonly eyes: Readonly<Record<string, FacePart>>;
  readonly brows?: Readonly<Record<string, FacePart>>;
  readonly mouths: Readonly<Record<string, FacePart>>;
  readonly cheeks: Readonly<Record<string, FacePart>>;
  readonly expressions: Readonly<Record<ExpressionId, Expression>>;
}

/** q34 expressions every body authors (Q-D16-2): M1 travel blinks on its own timer, so `blink` is required too. */
export const Q34_EXPRESSIONS: readonly ExpressionId[] = ['neutral', 'blink'];

/** A face library of a non-front view: only the expressions its poses use (ADR 010; q34 = neutral + blink). */
export type ViewFaceLibrary = Omit<FaceLibrary, 'expressions'> & {
  readonly expressions: Partial<Readonly<Record<ExpressionId, Expression>>>;
};

const IRIS = new Set(['c', 'C', 'i', 'I', 'k', 'K', 'X']);

/**
 * Glance (art round MA-27c-2): the irises and pupils move 1 px toward screen-right inside each eye; the lash row,
 * the eye outline and the shine stay put. Only rows with a 2-px pupil (`XX`) below the lash row change, and in each
 * eye half (cols < 10, ≥ 10) the iris/pupil px rotate one position right among themselves (same px count).
 */
export function irisShift(mask: Mask, half = 10): Mask {
  return mask.map((row, y) => {
    if (y === 0 || !row.includes('XX')) return row;
    const out = row.split('');
    for (const [from, to] of [
      [0, half],
      [half, row.length],
    ] as const) {
      const pos: number[] = [];
      for (let x = from; x < to; x++) if (IRIS.has(row.charAt(x))) pos.push(x);
      if (pos.length < 2) continue;
      pos.forEach((x, k) => {
        out[x] = row.charAt(pos[(k - 1 + pos.length) % pos.length] ?? x);
      });
    }
    return out.join('');
  });
}

/** True when `b` differs from `a` only in iris/pupil px below the lash row (the glance rule). */
export function onlyIrisDiffers(a: Mask, b: Mask): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, y) => {
    const other = b[y] ?? '';
    if (row.length !== other.length) return false;
    for (let x = 0; x < row.length; x++) {
      const p = row.charAt(x);
      const q = other.charAt(x);
      if (p !== q && (y === 0 || !IRIS.has(p) || !IRIS.has(q))) return false;
    }
    return true;
  });
}

/** The parts of an expression in stamp order (cheeks under everything, then eyes, brows, mouth). */
export function expressionParts(lib: ViewFaceLibrary, id: ExpressionId, armsUp = false, irisDx = false): FacePart[] {
  const e = lib.expressions[id];
  if (!e) throw new Error(`face library has no expression "${id}"`);
  const mouth = armsUp && e.raisedMouth !== undefined ? e.raisedMouth : e.mouth;
  const eyes = lib.eyes[e.eyes];
  const parts = [
    lib.cheeks[e.cheeks],
    irisDx && eyes ? { ...eyes, mask: irisShift(eyes.mask) } : eyes,
    e.brows === undefined ? undefined : lib.brows?.[e.brows],
    lib.mouths[mouth],
  ];
  return parts.filter((p): p is FacePart => p !== undefined);
}

const HAIR = new Set(['j', 'J', 'h', 'H', 'y', 'Y']);

/**
 * Problems with a face library (empty = fine). With `head`, every face px is also checked against the head mask:
 * `faceAt` is the face anchor in head-mask coordinates.
 */
export function validateFace(
  lib: ViewFaceLibrary,
  name: string,
  head?: { readonly mask: Mask; readonly faceAt: Point },
  required: readonly ExpressionId[] = EXPRESSIONS,
): string[] {
  const problems: string[] = [];
  const groups = { eyes: lib.eyes, brows: lib.brows ?? {}, mouths: lib.mouths, cheeks: lib.cheeks } as const;
  for (const [group, parts] of Object.entries(groups)) {
    for (const [id, part] of Object.entries(parts)) {
      part.mask.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row.charAt(x);
          if (ch === '.' || ch === ' ') continue;
          const entry = LEGEND[ch];
          if (!entry) {
            problems.push(`${name}/${group}.${id}: unknown mask char "${ch}" at ${String(x)},${String(y)}`);
            continue;
          }
          if (!FACE_SLOTS.has(entry[0])) {
            problems.push(`${name}/${group}.${id}: slot "${entry[0]}" is not a face slot ("${ch}")`);
          }
          if (head) {
            const hx = head.faceAt[0] + part.at[0] + x;
            const hy = head.faceAt[1] + part.at[1] + y;
            const under = hy >= 0 && hx >= 0 ? (head.mask[hy]?.charAt(hx) ?? '') : '';
            if (under === '' || under === '.' || under === ' ') {
              problems.push(`${name}/${group}.${id}: px ${String(x)},${String(y)} is outside the head`);
            } else if (HAIR.has(under)) {
              problems.push(`${name}/${group}.${id}: px ${String(x)},${String(y)} covers hair`);
            }
          }
        }
      });
    }
  }
  for (const id of required) {
    const e = lib.expressions[id];
    if (!e) {
      problems.push(`${name}: missing expression "${id}"`);
      continue;
    }
    if (!(e.eyes in lib.eyes)) problems.push(`${name}/${id}: unknown eyes "${e.eyes}"`);
    if (!(e.mouth in lib.mouths)) problems.push(`${name}/${id}: unknown mouth "${e.mouth}"`);
    if (e.raisedMouth !== undefined && !(e.raisedMouth in lib.mouths)) {
      problems.push(`${name}/${id}: unknown raised mouth "${e.raisedMouth}"`);
    }
    if (!(e.cheeks in lib.cheeks)) problems.push(`${name}/${id}: unknown cheeks "${e.cheeks}"`);
    if (e.brows !== undefined && !(e.brows in (lib.brows ?? {}))) {
      problems.push(`${name}/${id}: unknown brows "${e.brows}"`);
    }
  }
  return problems;
}
