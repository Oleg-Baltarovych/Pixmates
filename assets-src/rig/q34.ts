// q34 (three-quarter, facing screen-right) derivations from front masks (ADR 010, RIG.md «Views»), plus the q34 shoe
// helpers the composer uses. The derivations serve only the rig test bodies (dummies); characters ship authored q34
// masks (maid: assets-src/characters/maid/, MA-27d).
import { LEGEND, type Mask } from '../lib/mask.ts';
import type { ExpressionId, FacePart, ViewFaceLibrary } from './face.ts';

/** Front head mask layout (the dummies' spike-derived head): 30 wide, face anchor at col 5. */
const HEAD_W = 30;
const FACE_COL = 5;
/** q34 shift of the head content toward the facing (with the +1 head-joint lean the face sits +3). */
const SHIFT = 2;
/** Far side lock columns (25–26) disappear behind the cheek; cols from 27 on (horn tips) stay in place. */
const FAR_LOCK_COL = 25;
const KEEP_FROM_COL = 27;
/** Face masks: 20 wide, symmetric about cols 9|10; the far (right) eye spans cols 13–17. */
const FACE_W = 20;
const FACE_HALF = 10;
const FAR_EYE_INNER_COL = 14;
/** q34 face centre in the head mask (face anchor col 7 + half a face) and the chin point 1 px in front of it. */
const Q34_CHIN_COL = FACE_COL + SHIFT + FACE_HALF + 1;
/** Jaw taper on the facing side: rows from the bottom and px cleared on each. */
const JAW_TAPER = [3, 2, 1] as const;
/** Front shoe width (the side shoe adds a toe column). */
const SHOE_W = 4;

const isHair = (ch: string): boolean => LEGEND[ch]?.[0] === 'hair';
const isSkin = (ch: string): boolean => LEGEND[ch]?.[0] === 'skin';

/** Every row exactly `w` wide (an empty row = no px, allowed where `blankRows`). */
const assertWidth = (mask: Mask, w: number, what: string, blankRows = false): void => {
  mask.forEach((row, y) => {
    if (row.length !== w && !(blankRows && row.length === 0))
      throw new Error(`${what}: row ${String(y)} is ${String(row.length)} wide, expected ${String(w)}`);
  });
};

/**
 * q34 head from a front head: the content from the face anchor column moves 2 px toward the facing, the far side
 * lock disappears behind the cheek, and 2 px of hair fill in on the near side (fuller near lock, back of the head).
 * The jaw on the facing side tapers 1 px per row over the last 3 skin rows and ends in a 1-px chin point 1 px in
 * front of the face centre (art round MA-27c-1 A7).
 */
export function deriveQ34Head(front: Mask): Mask {
  assertWidth(front, HEAD_W, 'deriveQ34Head');
  const rows = front.map((row) => {
    const c = row.charAt(FACE_COL);
    let fill: string;
    if (c === '.') fill = '..';
    else if (isSkin(c) || isHair(c)) fill = 'Hh';
    else fill = c + c;
    return (row.slice(0, FACE_COL) + fill + row.slice(FACE_COL, FAR_LOCK_COL) + row.slice(KEEP_FROM_COL)).split('');
  });
  const skinRows = rows.map((r, y) => (r.some(isSkin) ? y : -1)).filter((y) => y >= 0);
  const last = skinRows[skinRows.length - 1];
  if (last === undefined) throw new Error('deriveQ34Head: no skin rows');
  JAW_TAPER.forEach((cut, k) => {
    const row = rows[last - k];
    if (!row) return;
    for (let n = 0, x = row.length - 1; x >= 0 && n < cut; x--) {
      if (!isSkin(row[x] ?? '.')) continue;
      row[x] = '.';
      n++;
    }
  });
  const chin = rows[last + 1] ?? Array.from({ length: HEAD_W }, () => '.');
  chin[Q34_CHIN_COL] = 's';
  if (last + 1 >= rows.length) rows.push(chin);
  return rows.map((r) => r.join(''));
}

/** Far eye (right half) 1 px narrower with its inner edge 1 px toward the profile. */
const q34Eyes = (mask: Mask): Mask =>
  mask.map((r) => r.slice(0, FACE_HALF) + '.' + r.slice(FACE_HALF, FAR_EYE_INNER_COL) + r.slice(FAR_EYE_INNER_COL + 1));
/** Mouth 2 px toward the facing (the 2 rightmost columns must be empty). */
const q34Mouth = (mask: Mask): Mask =>
  mask.map((r) => {
    if (r.length === 0) return r;
    if (r.slice(-SHIFT) !== '.'.repeat(SHIFT))
      throw new Error(`q34 mouth: "${r}" has px in the last ${String(SHIFT)} cols`);
    return '.'.repeat(SHIFT) + r.slice(0, -SHIFT);
  });
/** Blush on the near cheek only. */
const q34Cheeks = (mask: Mask): Mask =>
  mask.map((r) => (r.length === 0 ? r : r.slice(0, FACE_HALF) + '.'.repeat(FACE_W - FACE_HALF)));

/** q34 face library (only `ids`) from a front one: same part names, transformed masks. */
export function deriveQ34Face(
  front: ViewFaceLibrary,
  ids: readonly ExpressionId[] = ['neutral', 'blink'],
): ViewFaceLibrary {
  const eyes: Record<string, FacePart> = {};
  const mouths: Record<string, FacePart> = {};
  const cheeks: Record<string, FacePart> = {};
  const expressions: Partial<Record<ExpressionId, NonNullable<ViewFaceLibrary['expressions'][ExpressionId]>>> = {};
  const pick = (group: Readonly<Record<string, FacePart>>, key: string): FacePart => {
    const p = group[key];
    if (!p) throw new Error(`deriveQ34Face: no part "${key}"`);
    assertWidth(p.mask, FACE_W, `deriveQ34Face/${key}`, true);
    return p;
  };
  for (const id of ids) {
    const e = front.expressions[id];
    if (!e) throw new Error(`deriveQ34Face: no front "${id}"`);
    const ep = pick(front.eyes, e.eyes);
    const mp = pick(front.mouths, e.mouth);
    const cp = pick(front.cheeks, e.cheeks);
    eyes[e.eyes] = { mask: q34Eyes(ep.mask), at: ep.at };
    mouths[e.mouth] = { mask: q34Mouth(mp.mask), at: mp.at };
    cheeks[e.cheeks] = { mask: q34Cheeks(cp.mask), at: cp.at };
    expressions[id] = { eyes: e.eyes, mouth: e.mouth, cheeks: e.cheeks };
  }
  return { eyes, mouths, cheeks, expressions };
}

/** Side shoe (5 px, toe forward = screen-right) from a 4-px front shoe: the toe column repeats once. */
export function deriveQ34Shoe(front: Mask): Mask {
  assertWidth(front, SHOE_W, 'deriveQ34Shoe');
  return front.map((r, y) => (y === 0 ? r + '.' : r.slice(0, -1) + r.charAt(SHOE_W - 2) + r.slice(-1)));
}

/** Shoe chars one ramp step darker (q34 far shoe, A2): L→l, l→B, B→b, b→m, m→M; M stays the floor. */
const DARKER: Readonly<Record<string, string>> = { L: 'l', l: 'B', B: 'b', b: 'm', m: 'M', M: 'M' };
export const darkerMask = (mask: Mask): Mask =>
  mask.map((r) =>
    r
      .split('')
      .map((ch) => DARKER[ch] ?? ch)
      .join(''),
  );

/** A lifted side shoe tipping its toe down 1 px (q34 passing frames, A1): the sole's front px drops a row. */
export function tipToe(mask: Mask): Mask {
  const sole = mask[mask.length - 1] ?? '';
  let toe = -1;
  for (let i = sole.length - 1; i >= 0; i--) {
    if (sole.charAt(i) !== '.') {
      toe = i;
      break;
    }
  }
  if (toe < 0) return mask;
  const ch = sole.charAt(toe);
  return [
    ...mask.slice(0, -1),
    sole.slice(0, toe) + '.' + sole.slice(toe + 1),
    '.'.repeat(toe) + ch + '.'.repeat(sole.length - toe - 1),
  ];
}
