// Face library format + validator (plan M-ART MA-24, docs/art/RIG.md §Face library). A character authors reusable
// parts (≈ 8 eye masks, 6 mouths, brows, cheeks) placed on the face anchor; an expression picks one of each. The
// validator fails the build when an expression is missing, a part id is unknown, a mask uses a non-face slot or a
// face px would land on a hair px of the head mask or outside it (ART-BIBLE §11: a face px never covers hair).
import type { Point } from '../lib/chain.ts';
import { LEGEND, maskSize, type Mask, type Slot } from '../lib/mask.ts';
import type { FaceRules } from './layout.ts';

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
  /**
   * Eye masks with a 1-px pupil: the rows `irisShift` moves (the pupil's ink `x`/`X` moves with the
   * iris px). Default: the rows holding a 2-px pupil `XX`.
   */
  readonly irisRows?: readonly number[];
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
  /** Nose shadow (adult faces, ADR 011): stamped on every expression after the cheeks. */
  readonly nose?: FacePart;
  readonly expressions: Readonly<Record<ExpressionId, Expression>>;
}

/** q34 expressions every body authors (Q-D16-2): M1 travel blinks on its own timer, so `blink` is required too. */
export const Q34_EXPRESSIONS: readonly ExpressionId[] = ['neutral', 'blink'];

/** A face library of a non-front view: only the expressions its poses use (ADR 010; q34 = neutral + blink). */
export type ViewFaceLibrary = Omit<FaceLibrary, 'expressions'> & {
  readonly expressions: Partial<Readonly<Record<ExpressionId, Expression>>>;
};

const IRIS = new Set(['c', 'C', 'i', 'I', 'k', 'K', 'X']);
/** With `irisRows`: the 1-px pupil's lighter ink end (`x`) moves with the iris too. */
const IRIS_1PX = new Set([...IRIS, 'x']);

/**
 * Glance: the irises and pupils move 1 px toward screen-right inside each eye; the lash row, the eye outline and
 * the shine stay put. In each eye half (cols < `half`, ≥ `half`) the iris/pupil px rotate one position right among
 * themselves (same px count). Two modes: without `rows`, every row below row 0 holding a 2-px pupil (`XX`) shifts
 * (iris letters + `X`); with `rows` (1-px pupils, `FacePart.irisRows`), exactly those rows shift and the pupil's
 * lighter ink end `x` moves with the iris too.
 */
export function irisShift(mask: Mask, half = 10, rows?: readonly number[]): Mask {
  return mask.map((row, y) => {
    const set = rows ? IRIS_1PX : IRIS;
    if (rows ? !rows.includes(y) : y === 0 || !row.includes('XX')) return row;
    const out = row.split('');
    for (const [from, to] of [
      [0, half],
      [half, row.length],
    ] as const) {
      const pos: number[] = [];
      for (let x = from; x < to; x++) if (set.has(row.charAt(x))) pos.push(x);
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
export function expressionParts(
  lib: ViewFaceLibrary,
  id: ExpressionId,
  armsUp = false,
  irisDx = false,
  irisHalf = 10,
): FacePart[] {
  const e = lib.expressions[id];
  if (!e) throw new Error(`face library has no expression "${id}"`);
  const mouth = armsUp && e.raisedMouth !== undefined ? e.raisedMouth : e.mouth;
  const eyes = lib.eyes[e.eyes];
  const parts = [
    lib.cheeks[e.cheeks],
    lib.nose,
    irisDx && eyes ? { ...eyes, mask: irisShift(eyes.mask, irisHalf, eyes.irisRows) } : eyes,
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
  rules?: FaceRules,
): string[] {
  const problems: string[] = [];
  const groups = {
    eyes: lib.eyes,
    brows: lib.brows ?? {},
    mouths: lib.mouths,
    cheeks: lib.cheeks,
    nose: lib.nose ? { nose: lib.nose } : {},
  } as const;
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
          // Brows may also use hair tones: a brow end fading into the fringe gap it shows through.
          if (!FACE_SLOTS.has(entry[0]) && !(group === 'brows' && entry[0] === 'hair')) {
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
  if (rules) problems.push(...adultFaceProblems(lib, name, required, rules, head?.mask));
  return problems;
}

const slotOf = (ch: string): Slot | undefined => LEGEND[ch]?.[0];
const countSlot = (mask: Mask, slot: Slot): number =>
  mask.reduce((n, row) => n + row.split('').filter((ch) => slotOf(ch) === slot).length, 0);
/** Rows of a mask holding any px. */
const paintedRows = (mask: Mask): number => mask.filter((row) => /[^. ]/.test(row)).length;

/**
 * Adult face rules (ADR 011, ART-BIBLE §11.0): open eyes 2–3 rows and ¼–⅕ of the face height (neutral), no eye
 * taller than the max, brows on every expression but the listed browless ones, a 1–3 px skin nose shadow, blush only
 * on the listed expressions, and a jaw (the head mask's chin row narrower than its widest skin row).
 */
function adultFaceProblems(
  lib: ViewFaceLibrary,
  name: string,
  required: readonly ExpressionId[],
  rules: FaceRules,
  head: Mask | undefined,
): string[] {
  const problems: string[] = [];
  const [minRows, maxRows] = rules.eyeRows;
  for (const [id, part] of Object.entries(lib.eyes)) {
    const rows = paintedRows(part.mask);
    if (rows > maxRows) problems.push(`${name}/eyes.${id}: ${String(rows)} rows, adult eyes are ≤ ${String(maxRows)}`);
  }
  const open = lib.eyes[lib.expressions.neutral?.eyes ?? ''];
  if (open) {
    const rows = paintedRows(open.mask);
    const lo = Math.max(minRows, rules.faceH / 5);
    const hi = Math.min(maxRows, rules.faceH / 4);
    if (rows < Math.floor(lo) || rows > Math.ceil(hi)) {
      problems.push(`${name}: neutral eyes ${String(rows)} rows, need ¼–⅕ of a ${String(rules.faceH)}-row face`);
    }
  }
  if (rules.nose) {
    const px = lib.nose ? countSlot(lib.nose.mask, 'skin') : 0;
    if (px < 1 || px > 3) problems.push(`${name}: adult faces need a 1–3 px skin nose shadow (has ${String(px)})`);
  }
  for (const id of required) {
    const e = lib.expressions[id];
    if (!e) continue;
    if (!rules.browless.includes(id) && e.brows === undefined) problems.push(`${name}/${id}: adult faces need brows`);
    const parts = [lib.cheeks[e.cheeks], lib.eyes[e.eyes], lib.mouths[e.mouth]];
    const blush = parts.some((p) => p !== undefined && countSlot(p.mask, 'blush') > 0);
    if (blush && !rules.blushOnly.includes(id))
      problems.push(`${name}/${id}: blush only on ${rules.blushOnly.join(', ')}`);
  }
  if (head) {
    const skinW = head.map((row) => row.split('').filter((ch) => slotOf(ch) === 'skin').length);
    const chin = [...skinW].reverse().find((w) => w > 0) ?? 0;
    const widest = Math.max(0, ...skinW);
    if (widest - chin < rules.jawTaper) {
      problems.push(
        `${name}: jaw — chin row ${String(chin)} px vs widest ${String(widest)} (taper ≥ ${String(rules.jawTaper)})`,
      );
    }
    if (maskSize(head).h === 0) problems.push(`${name}: empty head mask`);
  }
  return problems;
}
