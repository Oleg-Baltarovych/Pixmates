// M-ART MA-62 (D-20, ADR 012): the stern-look face option `FaceLibrary.style: 'stern'` — shared kit
// `rig/faces/stern.ts` + `validateFace` stern rules (ART-BIBLE §11.9, RIG.md «D-20»): lid over the iris top row with
// 3–4 iris rows on the stern set, brows present with the inner end 1 row lower and 1 skin row above the lid, emotions
// (happy / worried / startle / petted / sleep) break both the brow angle and the lid, no blush outside petted.
import { describe, expect, it } from 'vitest';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_B, DUMMY_FACE, DUMMY_HEAD, DUMMY_STERN } from '../../../assets-src/rig/dummies.ts';
import { validateFace, type FaceLibrary } from '../../../assets-src/rig/face.ts';
import { STERN_FACE, sternFace } from '../../../assets-src/rig/faces/stern.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const check = (lib: FaceLibrary): string[] => validateFace(lib, 'k', DUMMY_HEAD);
const has = (problems: string[], re: RegExp): boolean => problems.some((p) => re.test(p));

describe('stern kit (rig/faces/stern.ts)', () => {
  it('is a stern library that passes every rule on the dummy head', () => {
    expect(STERN_FACE.style).toBe('stern');
    expect(check(STERN_FACE)).toEqual([]);
  });
  it('lets a body override a part while the rules still hold', () => {
    const lib = sternFace({ mouths: { set: { mask: ['..........XX........'], at: [0, 11] } } });
    expect(lib.mouths.set?.mask).toEqual(['..........XX........']);
    expect(check(lib)).toEqual([]);
  });
});

describe('validateFace stern rules', () => {
  const open = STERN_FACE.eyes.stern;
  if (!open) throw new Error('kit has no stern eyes');
  const withEyes = (id: string, mask: readonly string[], dy = 0): FaceLibrary => ({
    ...STERN_FACE,
    eyes: { ...STERN_FACE.eyes, [id]: { mask, at: [open.at[0], open.at[1] + dy] } },
  });

  it('leaves non-stern libraries alone (DUMMY_FACE has no style)', () => {
    expect(check(DUMMY_FACE)).toEqual([]);
  });
  it('fails a cute face marked stern: no lid over the iris, no set brows, blush on neutral', () => {
    const p = check({ ...DUMMY_FACE, style: 'stern' });
    expect(has(p, /neutral.*lid/)).toBe(true);
    expect(has(p, /neutral.*brows/)).toBe(true);
    expect(has(p, /neutral.*blush/)).toBe(true);
  });
  it('needs the ink lid line over the iris top row', () => {
    const noLid = ['....................', ...open.mask.slice(1)];
    expect(has(check(withEyes('stern', noLid)), /neutral.*lid/)).toBe(true);
  });
  it('needs ≥ 3 visible iris rows (a slit reads asleep)', () => {
    const slit = open.mask.slice(0, 3);
    expect(has(check(withEyes('stern', slit)), /neutral.*iris rows/)).toBe(true);
  });
  it('needs exactly 1 skin row between the brow and the lid', () => {
    expect(has(check(withEyes('stern', open.mask, -1)), /neutral.*skin row/)).toBe(true);
    expect(has(check(withEyes('stern', open.mask, 1)), /neutral.*skin row/)).toBe(true);
  });
  it('needs set brows (inner end 1 row lower) on the stern set', () => {
    const flat = { ...STERN_FACE.expressions.talk_a, brows: 'flat' };
    expect(
      has(check({ ...STERN_FACE, expressions: { ...STERN_FACE.expressions, talk_a: flat } }), /talk_a.*brows/),
    ).toBe(true);
    const none = { eyes: 'stern', mouth: 'set', cheeks: 'none' };
    expect(has(check({ ...STERN_FACE, expressions: { ...STERN_FACE.expressions, think: none } }), /think.*brows/)).toBe(
      true,
    );
  });
  it.each(['happy', 'worried', 'startle', 'petted', 'sleep'] as const)(
    '%s must break the stern read: set brows or the stern lid fail',
    (id) => {
      const e = STERN_FACE.expressions[id];
      const setBrows = check({
        ...STERN_FACE,
        expressions: { ...STERN_FACE.expressions, [id]: { ...e, brows: 'set' } },
      });
      expect(has(setBrows, new RegExp(`${id}.*brow`))).toBe(true);
      const sternEyes = check({
        ...STERN_FACE,
        expressions: { ...STERN_FACE.expressions, [id]: { ...e, eyes: 'stern' } },
      });
      expect(has(sternEyes, new RegExp(`${id}.*lid`))).toBe(true);
    },
  );
  it('allows blush only on petted', () => {
    const blushTalk = { ...STERN_FACE.expressions.talk_b, cheeks: 'blush' };
    const p = check({ ...STERN_FACE, expressions: { ...STERN_FACE.expressions, talk_b: blushTalk } });
    expect(has(p, /talk_b.*blush/)).toBe(true);
    expect(STERN_FACE.expressions.petted.cheeks).toBe('blush');
  });
});

describe('stern dummy (rig-dummy-stern)', () => {
  it('builds a pack with the stern face and differs from DUMMY_B only on the face', () => {
    const pack = createRigPack(DUMMY_STERN, ANIMS);
    expect(pack.id).toBe('rig-dummy-stern');
    const ctx = renderContext(loadMasterPalette());
    const idle = ANIMS.find((a) => a.name === 'idle_a');
    if (!idle) throw new Error('no idle_a');
    const a = createRigRenderer(DUMMY_B).renderLabeled(idle, 0, ctx).image;
    const b = createRigRenderer(DUMMY_STERN).renderLabeled(idle, 0, ctx).image;
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
  });
});
