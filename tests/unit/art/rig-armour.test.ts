// M-ART MA-65 (D-20, RIG.md «D-20»): armour opt-ins — `Body.torsoMask` (dō), `Body.tassets` (kusazuri, seated
// variant), `Body.sode` (square shoulder plates, mirrored in front) and `kote.both`. Unset = byte-identical (the
// `pnpm sprites` SHA-256 gate covers every pack).
import { describe, expect, it } from 'vitest';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_B } from '../../../assets-src/rig/dummies.ts';
import type { Body, RigAnim } from '../../../assets-src/rig/types.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const ctx = renderContext(loadMasterPalette());
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const TORSO = { mask: ['ggggggg', 'gGGGGGg', 'ggggggg'], at: [-3, 2] as const };
const FRONT_PLATES = { mask: ['gggggggggg', 'g.gg.gg.gg'], at: [-5, -1] as const };
const TASSETS = { front: FRONT_PLATES, seated: { mask: ['gggggg'], at: [-3, -1] as const } };
const SODE = { mask: ['gggg', 'gGGg', 'gggg'], at: [-3, -1] as const };
const ARMOURED: Body = { ...DUMMY_B, torsoMask: TORSO, tassets: TASSETS, sode: SODE };
const image = (body: Body, name: string, f: number) => createRigRenderer(body).renderLabeled(anim(name), f, ctx).image;
const pixels = (body: Body, name: string, f: number): Buffer => Buffer.from(image(body, name, f).data);

describe('armour opt-ins (MA-65)', () => {
  it('builds every shared animation with dō, kusazuri and sode', () => {
    expect(() => createRigPack(ARMOURED, ANIMS)).not.toThrow();
  });
  it.each([
    ['torsoMask', { torsoMask: TORSO }],
    ['tassets', { tassets: TASSETS }],
    ['sode', { sode: SODE }],
  ] as const)('%s changes the standing frame', (_, extra) => {
    expect(pixels({ ...DUMMY_B, ...extra }, 'idle_a', 0)).not.toEqual(pixels(DUMMY_B, 'idle_a', 0));
  });
  it('uses the seated kusazuri on sit_edge (differs from the standing plates there)', () => {
    const standingOnly = { ...ARMOURED, tassets: { front: FRONT_PLATES } };
    expect(pixels(ARMOURED, 'sit_edge', 0)).not.toEqual(pixels(standingOnly, 'sit_edge', 0));
  });
  it('mirrors the sode onto both shoulders in front', () => {
    const img = image({ ...DUMMY_B, sode: SODE }, 'idle_a', 0);
    const base = image(DUMMY_B, 'idle_a', 0);
    const changed: number[] = [];
    for (let i = 0; i < img.width * img.height; i++) {
      if (img.data[i * 4] !== base.data[i * 4] || img.data[i * 4 + 3] !== base.data[i * 4 + 3]) {
        changed.push(i % img.width);
      }
    }
    expect(changed.some((x) => x < 20)).toBe(true);
    expect(changed.some((x) => x > 27)).toBe(true);
  });
  it('kote.both guards the other forearm too', () => {
    const kote = {
      side: 'L',
      rows: 2,
      ramp: 'lacquer_black',
      shade: 1,
      stud: { ramp: 'cloth_ochre', shade: 4, count: 2 },
    } as const;
    expect(pixels({ ...DUMMY_B, kote: { ...kote, both: true } }, 'idle_a', 0)).not.toEqual(
      pixels({ ...DUMMY_B, kote }, 'idle_a', 0),
    );
  });
});
