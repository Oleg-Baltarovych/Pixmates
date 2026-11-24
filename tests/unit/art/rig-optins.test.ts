// Behaviour of the rig's per-body opt-ins on the dummy bodies and small hand-built inputs (not through a character
// pack): each test fails when the opt-in's code is removed.
import { describe, expect, it } from 'vitest';
import { createIndexBuffer } from '../../../assets-src/lib/buffer.ts';
import { LEGEND } from '../../../assets-src/lib/mask.ts';
import { MAT } from '../../../assets-src/lib/materials.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { buildShorts, buildTorso } from '../../../assets-src/rig/chains.ts';
import { createRigPack, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { DUMMY_A, DUMMY_B } from '../../../assets-src/rig/dummies.ts';
import { ARM_LABEL, PART_ID } from '../../../assets-src/rig/part-ids.ts';
import { farLegGap, squashSeparator, type Locked } from '../../../assets-src/rig/passes.ts';
import type { Body, RigAnim } from '../../../assets-src/rig/types.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const idle = anim('idle_a');
const walk = anim('walk');
const same = (a: RgbaImage, b: RgbaImage): boolean => Buffer.from(a.data).equals(Buffer.from(b.data));
const rgb = (img: RgbaImage, x: number, y: number): number => {
  const i = (y * img.width + x) * 4;
  return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
};
/** Opaque px whose colour is on `ramp`. */
const pxOn = (img: RgbaImage, ramp: string): [number, number][] => {
  const tones = new Set(palette.ramps.get(ramp) ?? []);
  const out: [number, number][] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if ((img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0 && tones.has(rgb(img, x, y))) out.push([x, y]);
    }
  }
  return out;
};
const render = (body: Body, a: RigAnim = idle, f = 0): RgbaImage => createRigRenderer(body).render(a, f, ctx);
const q34Of = (body: Body) => {
  const q = body.views?.q34;
  if (!q) throw new Error(`${body.id}: no q34 view`);
  return q;
};

describe('rig opt-in: hairBackStretch', () => {
  it('shortens the back hair below the temples (lowest hair px moves up)', () => {
    const lowest = (b: Body): number => Math.max(...pxOn(render(b), b.ramps.hair).map(([, y]) => y));
    expect(lowest({ ...DUMMY_B, hairBackStretch: 0.5 })).toBeLessThan(lowest(DUMMY_B));
  });
});

describe('rig opt-in: sideLocks', () => {
  it('false drops the procedural lock chains (fewer hair px); true is the default', () => {
    const hair = (b: Body): number => pxOn(render(b), b.ramps.hair).length;
    expect(hair({ ...DUMMY_B, sideLocks: false })).toBeLessThan(hair(DUMMY_B));
    expect(same(render({ ...DUMMY_B, sideLocks: true }), render(DUMMY_B))).toBe(true);
  });
});

describe('rig opt-in: farLegShade', () => {
  it('gives far-leg px touching the near leg shade 0 (locked); far px away from it keep their tone', () => {
    const buf = createIndexBuffer(4, 1, palette);
    const ramp = DUMMY_B.ramps.legs;
    buf.set(0, 0, { ramp, shade: 3, material: MAT.fur, depth: 1, partId: PART_ID.legs });
    buf.set(1, 0, { ramp, shade: 3, material: MAT.fur, depth: 1, partId: PART_ID.farLeg });
    buf.set(2, 0, { ramp, shade: 3, material: MAT.fur, depth: 1, partId: PART_ID.farLeg });
    const locked: Locked = new Map();
    farLegGap(buf, locked);
    expect([buf.shade[0], buf.shade[1], buf.shade[2]]).toEqual([3, 0, 3]);
    expect([...locked.keys()]).toEqual([1]);
  });

  it('changes only q34 frames, and only when set', () => {
    const q = q34Of(DUMMY_B);
    const shaded: Body = { ...DUMMY_B, views: { q34: { ...q, farLegShade: 4 } } };
    expect(same(render(shaded, walk), render(DUMMY_B, walk))).toBe(false);
    expect(same(render(shaded, idle), render(DUMMY_B, idle))).toBe(true);
  });
});

describe('rig opt-in: tailored shorts', () => {
  const j = createRigRenderer(DUMMY_A).joints(idle, 0);
  const p = idle.frames[0];
  if (!p) throw new Error('idle f0');
  const rows = (b: Body, q = false): Map<number, number[]> => {
    const out = new Map<number, number[]>();
    for (const f of buildShorts(b, p, j.hip, q).shape.fragments) out.set(f.y, [...(out.get(f.y) ?? []), f.x]);
    return out;
  };
  const plain = rows(DUMMY_A);
  const tailored = rows({ ...DUMMY_A, shorts: { shade: 3, raise: 2 } });
  const bottom = (m: Map<number, number[]>): number => Math.max(...m.keys());

  it('raises the hem by `raise` rows', () => {
    expect(bottom(tailored)).toBe(bottom(plain) - 2);
  });
  it('notches the hem between the legs and flares each leg hem outward (front only)', () => {
    const hem = tailored.get(bottom(tailored)) ?? [];
    const gaps = (xs: readonly number[]): number => Math.max(...xs) - Math.min(...xs) + 1 - xs.length;
    expect(gaps(hem)).toBeGreaterThan(0);
    expect(gaps(plain.get(bottom(plain)) ?? [])).toBe(0);
    const width = (xs: readonly number[]): number => Math.max(...xs) - Math.min(...xs);
    const plainAtSameRow = plain.get(bottom(tailored)) ?? [];
    expect(width(hem)).toBeGreaterThan(width(plainAtSameRow));
    // q34: raised, but no notch/flare.
    const q = rows({ ...DUMMY_A, shorts: { shade: 3, raise: 2 } }, true);
    expect(width(q.get(bottom(q)) ?? [])).toBeLessThan(width(hem));
  });
});

describe('rig opt-in: shinWrap', () => {
  it('paints the row `row` above each foot in the legs-ramp `shade`; only on that row', () => {
    const wrapped: Body = { ...DUMMY_A, shinWrap: { row: 3, shade: 1 } };
    const r = createRigRenderer(wrapped);
    const j = r.joints(idle, 0);
    const img = r.render(idle, 0, ctx);
    const tone = palette.ramps.get(DUMMY_A.ramps.legs)?.[1];
    const plain = render(DUMMY_A);
    const count = (im: RgbaImage, foot: readonly [number, number], dy: number): number => {
      let n = 0;
      for (let x = Math.round(foot[0]) - 2; x <= Math.round(foot[0]) + 2; x++) {
        if (rgb(im, x, Math.round(foot[1]) - dy) === tone) n++;
      }
      return n;
    };
    for (const foot of [j.footL, j.footR]) {
      expect(count(img, foot, 3)).toBeGreaterThanOrEqual(2);
      expect(count(img, foot, 3)).toBeGreaterThan(count(plain, foot, 3));
      // Only that row: the rows next to it match the plain frame.
      expect(count(img, foot, 2)).toBe(count(plain, foot, 2));
    }
  });
});

describe('rig opt-in: sash', () => {
  const j = createRigRenderer(DUMMY_A).joints(idle, 0);
  const bandRows = (b: Body): number => new Set(buildTorso(b, j, false, 0)[2]?.shape.fragments.map((f) => f.y)).size;

  it('makes the waist band `rows` rows high (default 1)', () => {
    const knot = { mask: ['tt'], at: [0, 0] as const };
    expect(bandRows(DUMMY_A)).toBe(1);
    expect(bandRows({ ...DUMMY_A, sash: { rows: 2, knot } })).toBe(2);
  });
  it('stamps the knot mask on the near hip', () => {
    const sashed: Body = { ...DUMMY_A, sash: { rows: 1, knot: { mask: ['TT', 'TT'], at: [-4, -3] } } };
    const img = render(sashed);
    const letter = LEGEND['T'];
    if (!letter) throw new Error('legend T');
    const tone = palette.ramps.get(DUMMY_A.outfit.trim.ramp)?.[DUMMY_A.outfit.trim.tones[letter[1]]];
    const [x, y] = [Math.round(j.hip[0] - 4), Math.round(j.hip[1] - 3)];
    expect(rgb(img, x, y)).toBe(tone);
    expect(rgb(render(DUMMY_A), x, y)).not.toBe(tone);
  });
});

describe('createRigPack part validation', () => {
  const bad = ['T?'];
  it.each([
    ['front sash knot', { ...DUMMY_A, sash: { rows: 1, knot: { mask: bad, at: [0, 0] } } }],
    ['q34 sash knot', { ...DUMMY_A, views: { q34: { ...q34Of(DUMMY_A), sashKnot: { mask: bad, at: [0, 0] } } } }],
    ['front bib', { ...DUMMY_A, apron: { bib: { mask: bad, at: [0, 0] }, panelW: 6 } }],
  ] as const)('rejects a bad %s mask', (_, body) => {
    expect(() => createRigPack(body, ANIMS)).toThrow();
  });
  it.each([
    ['shorts.shade', { ...DUMMY_A, shorts: { shade: 6, raise: 0 } }],
    ['shinWrap.shade', { ...DUMMY_A, shinWrap: { row: 2, shade: -1 } }],
    ['farLegShade', { ...DUMMY_A, views: { q34: { ...q34Of(DUMMY_A), farLegShade: 9 } } }],
  ] as const)('rejects %s outside 0..5', (name, body) => {
    expect(() => createRigPack(body, ANIMS)).toThrow(name);
  });
});

describe('squashSeparator', () => {
  it('gives a sleeve px newly touching the torso the deep tone; other px stay', () => {
    // Row: sleeveL | torso | none | sleeveR (the last sleeve px touches no torso px).
    const img: RgbaImage = { width: 4, height: 1, data: new Uint8Array(16).fill(200) };
    const labels: RgbaImage = {
      width: 4,
      height: 1,
      data: Uint8Array.from([
        ...[ARM_LABEL.sleeveL, 0, 0, 255],
        ...[ARM_LABEL.torso, 0, 0, 255],
        ...[ARM_LABEL.none, 0, 0, 0],
        ...[ARM_LABEL.sleeveR, 0, 0, 255],
      ]),
    };
    const out = squashSeparator(img, labels, 0x102030);
    expect(rgb(out, 0, 0)).toBe(0x102030);
    expect([rgb(out, 1, 0), rgb(out, 2, 0), rgb(out, 3, 0)]).toEqual([0xc8c8c8, 0xc8c8c8, 0xc8c8c8]);
  });
});
