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
  /** Stern-look option (D-20, ART-BIBLE §11.9): validated by `sternProblems`; kit in rig/faces/stern.ts. */
  readonly style?: 'stern';
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
): string[] {
  const problems: string[] = [];
  const groups = {
    eyes: lib.eyes,
    brows: lib.brows ?? {},
    mouths: lib.mouths,
    cheeks: lib.cheeks,
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
  if (lib.style === 'stern') problems.push(...sternProblems(lib, name, required));
  return problems;
}

// ---- Stern look (D-20, ART-BIBLE §11.9; kit in rig/faces/stern.ts) -------------------------------------------------

/** Expressions that keep the stern read (set brows); the eye rule skips the closing frames `blink` / `half`. */
const STERN_SET: readonly ExpressionId[] = [
  'neutral',
  'blink',
  'half',
  'talk_a',
  'talk_b',
  'talk_c',
  'think',
  'wince',
  'glance',
];
const STERN_EYES: readonly ExpressionId[] = STERN_SET.filter((id) => id !== 'blink' && id !== 'half');
/** Emotions that must break both the brow angle and the lid. */
const STERN_BREAK: readonly ExpressionId[] = ['happy', 'worried', 'startle', 'petted', 'sleep'];
const STERN_IRIS_ROWS = [3, 4] as const;

const slotOf = (ch: string): Slot | undefined => LEGEND[ch]?.[0];
const maskW = (mask: Mask): number => Math.max(0, ...mask.map((r) => r.length));
const halves = (mask: Mask): readonly (readonly [number, number])[] => {
  const w = maskW(mask);
  return [
    [0, Math.floor(w / 2)],
    [Math.floor(w / 2), w],
  ];
};

interface EyeHalf {
  /** Rows holding iris (eye-slot) px. */
  readonly rows: number;
  /** Every iris px of the top iris row has an ink px right above it. */
  readonly lid: boolean;
  /** Mask row of the lid top (the top of the ink run over the top iris row; a thick lash counts as one lid). */
  readonly lidRow: number;
}

/** Per eye half with iris px: iris row count and whether an ink lid runs over the top iris row. */
function eyeHalves(mask: Mask): EyeHalf[] {
  const out: EyeHalf[] = [];
  for (const [from, to] of halves(mask)) {
    const irisCols = (y: number): number[] => {
      const xs: number[] = [];
      for (let x = from; x < to; x++) if (slotOf(mask[y]?.charAt(x) ?? '.') === 'eye') xs.push(x);
      return xs;
    };
    const rows = mask.map((_, y) => y).filter((y) => irisCols(y).length > 0);
    const top = rows[0];
    if (top === undefined) continue;
    const lid = top > 0 && irisCols(top).every((x) => slotOf(mask[top - 1]?.charAt(x) ?? '.') === 'ink');
    let lidRow = top - 1;
    const x0 = irisCols(top)[0] ?? from;
    while (lid && lidRow > 0 && slotOf(mask[lidRow - 1]?.charAt(x0) ?? '.') === 'ink') lidRow--;
    out.push({ rows: rows.length, lid, lidRow });
  }
  return out;
}

const isSternEye = (h: EyeHalf): boolean => h.lid && h.rows >= STERN_IRIS_ROWS[0] && h.rows <= STERN_IRIS_ROWS[1];

/** Per brow half: the lowest row, or undefined when the half's inner end is not exactly 1 row below its outer end. */
function setBrowLows(mask: Mask): (number | undefined)[] {
  const centre = (maskW(mask) - 1) / 2;
  return halves(mask).map(([from, to]) => {
    const px: [number, number][] = [];
    mask.forEach((row, y) => {
      for (let x = from; x < to; x++) if (!['.', ' ', ''].includes(row.charAt(x))) px.push([x, y]);
    });
    if (px.length === 0) return undefined;
    const dist = (p: [number, number]): number => Math.abs(p[0] - centre);
    const outer = px.reduce((a, b) => (dist(b) > dist(a) ? b : a));
    const inner = px.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    return inner[1] - outer[1] === 1 ? Math.max(...px.map(([, y]) => y)) : undefined;
  });
}

const blushPx = (part: FacePart | undefined): boolean =>
  part !== undefined && part.mask.some((row) => row.split('').some((ch) => slotOf(ch) === 'blush'));

/** Stern-look rules (ART-BIBLE §11.9) for the expressions in `required`. */
function sternProblems(lib: ViewFaceLibrary, name: string, required: readonly ExpressionId[]): string[] {
  const problems: string[] = [];
  for (const id of required) {
    const e = lib.expressions[id];
    if (!e) continue;
    const at = `${name}/${id}`;
    const eyes = lib.eyes[e.eyes];
    const brows = e.brows === undefined ? undefined : lib.brows?.[e.brows];
    const eyeHalfs = eyes ? eyeHalves(eyes.mask) : [];
    const browLows = brows ? setBrowLows(brows.mask) : [];
    const setBrows = browLows.length > 0 && browLows.every((y) => y !== undefined);
    if (STERN_EYES.includes(id) && eyes) {
      for (const h of eyeHalfs) {
        if (!h.lid) problems.push(`${at}: stern lid must run over the iris top row (ink right above it)`);
        if (h.rows < STERN_IRIS_ROWS[0] || h.rows > STERN_IRIS_ROWS[1]) {
          problems.push(`${at}: stern lid needs 3–4 iris rows (has ${String(h.rows)})`);
        }
      }
      if (setBrows && brows) {
        const lidRows = eyeHalfs.map((h) => eyes.at[1] + h.lidRow);
        browLows.forEach((low, k) => {
          const lid = lidRows[k];
          if (lid !== undefined && lid - (brows.at[1] + low) !== 2) {
            problems.push(`${at}: stern brow needs exactly 1 skin row above the lid`);
          }
        });
      }
    }
    if (STERN_SET.includes(id) && !setBrows) {
      problems.push(`${at}: stern brows must be set (both inner ends 1 row lower than the outer ends)`);
    }
    if (STERN_BREAK.includes(id)) {
      if (setBrows) problems.push(`${at}: brows must break the stern angle (flat, up or none)`);
      if (eyeHalfs.some(isSternEye)) problems.push(`${at}: the stern lid must break (closed, lifted or off the iris)`);
    }
    if (id !== 'petted') {
      // Cheeks only: an open mouth may use the blush ramp for the tongue.
      if (blushPx(lib.cheeks[e.cheeks])) problems.push(`${at}: stern faces show blush only on petted`);
    }
  }
  return problems;
}
