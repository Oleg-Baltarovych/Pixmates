// Stern-look face kit (D-20, ADR 012, ART-BIBLE §11.9; rules in rig/face.ts `sternProblems`). Shared by the stern
// bodies (goth, ronin, coder): slot letters only, so each body keeps its own eye / hair / skin ramps. Parts sit on the
// face anchor of the 48 head (masks 20 px wide, the eyes at cols 3–6 | 13–16, the axis between cols 9 and 10):
// brows rows 2–3, the ink lid row 5, a 4-col iris under it (3 rows show), cheeks row 9, mouth rows 10–12.
// A body overrides any part with `sternFace({...})`; the validator rules still hold.
import type { Mask } from '../../lib/mask.ts';
import { irisShift, type Expression, type ExpressionId, type FaceLibrary, type FacePart } from '../face.ts';

const part = (mask: Mask, x: number, y: number): FacePart => ({ mask, at: [x, y] });

/**
 * Stern eye: a flat 1-row ink lid that covers the iris top row and runs 1 px past the outer corner (square tick, no
 * flick); 4 × 3 of iris shows; a 2 × 2 pupil touching the lid; a 1 × 1 highlight top-left (`K`) in both eyes.
 */
const STERN: Mask = ['.XXXXXX......XXXXXX.', '...KXXc......KXXc...', '...iXXi......iXXi...', '...ckkc......ckkc...'];
/** Wince: the screen-left eye stern, the screen-right one squeezed shut (`<`). */
const WINCE: Mask = ['.XXXXXX.............', '...KXXc.......XX....', '...iXXi.........XX..', '...ckkc.......XX....'];
/** Worried: the lid lifts off the iris — the full 5-row iris shows. */
const WORRIED: Mask = [
  '...XXXX......XXXX...',
  '...KXXc......KXXc...',
  '...iXXi......iXXi...',
  '...cikc......cikc...',
  '...ckkc......ckkc...',
  '....kk........kk....',
];
/** Startle: lid fully up, sclera (`p`) on both sides of the full iris. */
const STARTLE: Mask = [
  '..XXXXXX....XXXXXX..',
  '..pKXXcp....pKXXcp..',
  '..piXXip....piXXip..',
  '..pcikcp....pcikcp..',
  '..pckkcp....pckkcp..',
  '...pkkp......pkkp...',
];

const EYES: Readonly<Record<string, FacePart>> = {
  stern: part(STERN, 0, 5),
  /** idle_a glance: irises/pupils 1 px toward screen-right under the same lid. */
  side: part(irisShift(STERN), 0, 5),
  /** Half (blink in-between): the lid one row lower. */
  half: part(['.XXXXXX......XXXXXX.', '...iXXi......iXXi...', '...ckkc......ckkc...'], 0, 6),
  closed: part(['..XXXXX......XXXXX..'], 0, 7),
  /** Happy: closed arcs bowing up. */
  happy: part(['...XXX........XXX...', '..X...X......X...X..'], 0, 6),
  worried: part(WORRIED, 0, 4),
  startle: part(STARTLE, 0, 4),
  wince: part(WINCE, 0, 5),
};

/** Brows: hair ramp shade 0 (`J`), 4 px × 1 row with one step. */
const BROWS: Readonly<Record<string, FacePart>> = {
  /** Set: the inner end 1 row lower (one 1-px step over 4 px) — the stern read. */
  set: part(['...JJJ........JJJ...', '......J......J......'], 0, 2),
  /** Flat (happy, startle, petted). */
  flat: part(['...JJJJ......JJJJ...'], 0, 2),
  /** Inner ends up (worried): the reverse angle. */
  up: part(['......J......J......', '...JJJ........JJJ...'], 0, 2),
};

const MOUTHS: Readonly<Record<string, FacePart>> = {
  /** Set flat 3-px line. */
  set: part(['.........XXX........'], 0, 11),
  /** Grim: short `XX` with a skin-2 corner pulled down on one side. */
  grim: part(['.........XX.........', '...........s........'], 0, 11),
  /** Smirk: the corner up on one side. */
  smirk: part(['...........s........', '.........XX.........'], 0, 10),
  talk_a: part(['.........XX.........'], 0, 11),
  talk_b: part(['.........XXX........', '.........XtX........'], 0, 11),
  talk_c: part(['.........XX.........', '........XttX........', '.........XX.........'], 0, 10),
  happy: part(['........x..x........', '.........XX.........'], 0, 11),
  worried: part(['.........XXX........', '.........XtX........', '.........XXX........'], 0, 10),
  small_o: part(['.........xx.........', '.........xx.........'], 0, 11),
  sleep: part(['..........x.........'], 0, 11),
  gritted: part(['........XXXX........'], 0, 11),
};

const CHEEKS: Readonly<Record<string, FacePart>> = {
  none: part([], 0, 9),
  /** Petted only. */
  blush: part(['..FFFF........FFFF..', '..fFFf........fFFf..'], 0, 9),
};

const EXPRESSIONS_STERN: Readonly<Record<ExpressionId, Expression>> = {
  neutral: { eyes: 'stern', brows: 'set', mouth: 'set', cheeks: 'none' },
  blink: { eyes: 'closed', brows: 'set', mouth: 'set', cheeks: 'none' },
  half: { eyes: 'half', brows: 'set', mouth: 'talk_a', cheeks: 'none' },
  talk_a: { eyes: 'stern', brows: 'set', mouth: 'talk_a', cheeks: 'none' },
  talk_b: { eyes: 'stern', brows: 'set', mouth: 'talk_b', cheeks: 'none' },
  talk_c: { eyes: 'stern', brows: 'set', mouth: 'talk_c', cheeks: 'none' },
  happy: { eyes: 'happy', brows: 'flat', mouth: 'happy', cheeks: 'none' },
  worried: { eyes: 'worried', brows: 'up', mouth: 'worried', cheeks: 'none' },
  think: { eyes: 'stern', brows: 'set', mouth: 'grim', cheeks: 'none' },
  sleep: { eyes: 'closed', mouth: 'sleep', cheeks: 'none' },
  startle: { eyes: 'startle', brows: 'flat', mouth: 'small_o', cheeks: 'none' },
  petted: { eyes: 'closed', brows: 'flat', mouth: 'happy', cheeks: 'blush' },
  wince: { eyes: 'wince', brows: 'set', mouth: 'gritted', cheeks: 'none' },
  glance: { eyes: 'side', brows: 'set', mouth: 'set', cheeks: 'none' },
};

/** Part / expression overrides for a stern body (merged over the kit per group). */
export interface SternOverrides {
  readonly eyes?: Readonly<Record<string, FacePart>>;
  readonly brows?: Readonly<Record<string, FacePart>>;
  readonly mouths?: Readonly<Record<string, FacePart>>;
  readonly cheeks?: Readonly<Record<string, FacePart>>;
  readonly expressions?: Partial<Readonly<Record<ExpressionId, Expression>>>;
}

/** A stern face library: the shared kit with a body's overrides. */
export function sternFace(o: SternOverrides = {}): FaceLibrary {
  return {
    style: 'stern',
    eyes: { ...EYES, ...o.eyes },
    brows: { ...BROWS, ...o.brows },
    mouths: { ...MOUTHS, ...o.mouths },
    cheeks: { ...CHEEKS, ...o.cheeks },
    expressions: { ...EXPRESSIONS_STERN, ...o.expressions },
  };
}

export const STERN_FACE: FaceLibrary = sternFace();
