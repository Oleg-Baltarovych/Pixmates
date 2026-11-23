// M-ART phase 2 MA-23/24/25: rig composer (joints, squash, shelf atlas, headroom, seams), face library validator and
// the 15 shared poses, checked on two dummy bodies (biped; biped + fox tail + ears).
import { describe, expect, it } from 'vitest';
import { FIGURE_H, resolveJoints, REST } from '../../../assets-src/rig/body.ts';
import {
  chooseFrameH,
  closeSeams,
  createRigPack,
  createRigRenderer,
  ARM_LABEL,
  RIG_H,
  squashRows,
} from '../../../assets-src/rig/compose.ts';
import { EXPRESSIONS, validateFace, type FaceLibrary } from '../../../assets-src/rig/face.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { frame } from '../../../assets-src/rig/anims/kit.ts';
import { DUMMY_A, DUMMY_B, DUMMY_FACE, DUMMY_HEAD, MAID_PREVIEW } from '../../../assets-src/rig/dummies.ts';
import { MAID } from '../../../assets-src/characters/maid/body.ts';
import { ARM_TORSO_RULE, armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { JOINTS, type RigAnim } from '../../../assets-src/rig/types.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import {
  buildPack,
  checkFrame,
  deepestTones,
  loadMasterPalette,
  renderContext,
  shelfPack,
} from '../../../tools/lib/sprites.ts';
import type { PackDef } from '../../../assets-src/lib/types.ts';
import { checkStrips, manifestSchema } from '../../../src/shared/pack.ts';

const ctx = renderContext(loadMasterPalette());
const opaque = (img: RgbaImage, x: number, y: number): boolean => (img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0;

/** Sizes of transparent regions that do not touch the frame border (4-connected). */
function holes(img: RgbaImage): number[] {
  const seen = new Uint8Array(img.width * img.height);
  const sizes: number[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] === 1 || opaque(img, start % img.width, Math.floor(start / img.width))) continue;
    const stack = [start];
    seen[start] = 1;
    let size = 0;
    let border = false;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      const x = i % img.width;
      const y = Math.floor(i / img.width);
      size++;
      if (x === 0 || y === 0 || x === img.width - 1 || y === img.height - 1) border = true;
      const next: readonly (readonly [number, number])[] = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      for (const [nx, ny] of next) {
        if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height) continue;
        const n = ny * img.width + nx;
        if (seen[n] === 1 || opaque(img, nx, ny)) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (!border) sizes.push(size);
  }
  return sizes;
}

const topRow = (img: RgbaImage): number => {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) return y;
  return img.height;
};

describe('joints (MA-23)', () => {
  const still = frame({});
  it('rests at the RIG table, shifted down by the headroom', () => {
    const j = resolveJoints(DUMMY_A, still, RIG_H);
    expect(j.head).toEqual([REST.head[0], REST.head[1] + RIG_H - FIGURE_H]);
    expect(j.root[1]).toBe(REST.root[1] + RIG_H - FIGURE_H);
  });
  it('children follow parent offsets; grounded feet stay planted, airborne feet follow the body', () => {
    const up = resolveJoints(DUMMY_A, frame({ root: { dx: 1, dy: -3 }, joints: { chest: { dx: 0, dy: -1 } } }), RIG_H);
    const rest = resolveJoints(DUMMY_A, still, RIG_H);
    expect(up.head[1] - rest.head[1]).toBe(-4);
    expect(up.hip[1] - rest.hip[1]).toBe(-3);
    expect(up.footL).toEqual(rest.footL);
    const air = resolveJoints(DUMMY_A, frame({ root: { dx: 0, dy: -3 }, legs: 'dangle' }), RIG_H);
    expect(air.footL[1] - rest.footL[1]).toBeCloseTo(-3, 5);
  });
});

describe('squash rows (MA-23)', () => {
  const img: RgbaImage = {
    width: 1,
    height: 6,
    data: new Uint8Array([1, 2, 3, 4, 5, 6].flatMap((v) => [v, 0, 0, 255])),
  };
  const col = (i: RgbaImage): number[] => Array.from({ length: i.height }, (_, y) => i.data[y * 4] ?? 0);
  it('removes whole rows above the cut (squash) and duplicates the row above it (stretch), never resamples', () => {
    expect(col(squashRows(img, 4, 1))).toEqual([0, 1, 2, 3, 5, 6]);
    expect(col(squashRows(img, 4, -1))).toEqual([2, 3, 4, 4, 5, 6]);
    expect(col(squashRows(img, 4, 0))).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('seam closer (MA-23)', () => {
  it('fills enclosed pinholes ≤ 3 px with the darkest neighbour and keeps larger negative space', () => {
    const W = 7;
    const ring = (x: number, y: number): boolean => x >= 1 && x <= 5 && y >= 1 && y <= 5;
    const data = new Uint8Array(W * W * 4);
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        const hole = (x === 3 && y === 3) || (x >= 2 && x <= 4 && y === 2);
        if (ring(x, y) && !hole) data.set([x === 2 ? 10 : 200, 0, 0, 255], (y * W + x) * 4);
      }
    }
    const img: RgbaImage = { width: W, height: W, data };
    const pin = { ...img, data: new Uint8Array(data) };
    pin.data.set([200, 0, 0, 255], (2 * W + 2) * 4);
    pin.data.set([200, 0, 0, 255], (2 * W + 3) * 4);
    pin.data.set([200, 0, 0, 255], (2 * W + 4) * 4);
    expect(holes(pin)).toEqual([1]);
    expect(holes(closeSeams(pin))).toEqual([]);
    expect(holes(closeSeams(img))).toEqual([4]);
  });
});

describe('shelf packer (MA-23)', () => {
  it('fits strips into shelves ≤ maxW without overlap, longest first, deterministically', () => {
    const strips = ANIMS.map((a) => ({ name: a.name, frames: a.frames.length }));
    const { placements, width, height } = shelfPack(strips, 48, RIG_H, 1024);
    expect(width).toBeLessThanOrEqual(1024);
    const boxes = strips.map((s) => {
      const p = placements.get(s.name);
      if (!p) throw new Error(s.name);
      expect(p.x + s.frames * 48).toBeLessThanOrEqual(width);
      expect(p.y + RIG_H).toBeLessThanOrEqual(height);
      return { ...p, w: s.frames * 48 };
    });
    for (const a of boxes) {
      for (const b of boxes) {
        if (a === b) continue;
        expect(a.y === b.y && a.x < b.x + b.w && b.x < a.x + a.w).toBe(false);
      }
    }
    expect(shelfPack(strips, 48, RIG_H, 1024)).toEqual({ placements, width, height });
  });
});

describe('face library (MA-24)', () => {
  const head = { mask: DUMMY_HEAD.mask, faceAt: DUMMY_HEAD.faceAt };
  it('accepts the complete dummy library', () => {
    expect(validateFace(DUMMY_FACE, 'dummy', head)).toEqual([]);
  });
  it('fails on a missing expression or an unknown part', () => {
    const { wince, ...rest } = DUMMY_FACE.expressions;
    expect(wince.eyes).toBe('wince');
    const missing = { ...DUMMY_FACE, expressions: rest } as unknown as FaceLibrary;
    expect(validateFace(missing, 'dummy').join()).toMatch(/wince/);
    const unknown: FaceLibrary = {
      ...DUMMY_FACE,
      expressions: { ...DUMMY_FACE.expressions, blink: { eyes: 'nope', mouth: 'smile', cheeks: 'soft' } },
    };
    expect(validateFace(unknown, 'dummy').join()).toMatch(/nope/);
  });
  it('fails when a face px would cover hair, or uses a non-face slot', () => {
    const high: FaceLibrary = { ...DUMMY_FACE, eyes: { ...DUMMY_FACE.eyes, open: { mask: ['X'], at: [7, 0] } } };
    expect(validateFace(high, 'dummy', head).join()).toMatch(/covers hair/);
    const dress: FaceLibrary = {
      ...DUMMY_FACE,
      mouths: { ...DUMMY_FACE.mouths, smile: { mask: ['d'], at: [9, 11] } },
    };
    expect(validateFace(dress, 'dummy').join()).toMatch(/slot/);
  });
  it('fails the pack build when a pose references an expression the body lacks', () => {
    const { wince, ...rest } = DUMMY_FACE.expressions;
    expect(wince.eyes).toBe('wince');
    const body = { ...DUMMY_A, face: { ...DUMMY_FACE, expressions: rest } as unknown as FaceLibrary };
    expect(() => createRigPack(body, ANIMS)).toThrow(/wince/);
  });
});

describe('the 15 shared poses (MA-25)', () => {
  const budget: Record<string, readonly [number, number]> = {
    idle_a: [8, 6],
    idle_b: [12, 6],
    walk: [8, 10],
    sit_edge: [6, 6],
    sleep: [8, 3],
    drag: [4, 8],
    fall: [4, 10],
    land: [4, 10],
    talk: [6, 8],
    think: [8, 6],
    happy: [6, 8],
    worried: [8, 6],
    wave: [8, 8],
    petted: [8, 8],
    startle: [5, 10],
  };
  // The plan's table sums to 103 frames (its "111" total was an arithmetic slip).
  it('matches the frame budget (103 frames) and only uses library expressions', () => {
    expect(Object.fromEntries(ANIMS.map((a) => [a.name, [a.frames.length, a.fps]]))).toEqual(budget);
    expect(ANIMS.reduce((n, a) => n + a.frames.length, 0)).toBe(103);
    for (const a of ANIMS) for (const f of a.frames) expect(EXPRESSIONS).toContain(f.face);
  });
  it('loops wrap without jumps (body joints move ≤ 2 px, hands ≤ 5 px, from the last frame to the first)', () => {
    for (const a of ANIMS.filter((x) => x.loop)) {
      const first = resolveJoints(DUMMY_B, a.frames[0] ?? frame({}), RIG_H);
      const last = resolveJoints(DUMMY_B, a.frames[a.frames.length - 1] ?? frame({}), RIG_H);
      for (const k of Object.keys(first) as (keyof typeof first)[]) {
        const limit = k === 'handL' || k === 'handR' ? 5 : 2;
        expect(Math.abs(first[k][0] - last[k][0]), `${a.name}/${k}`).toBeLessThanOrEqual(limit);
        expect(Math.abs(first[k][1] - last[k][1]), `${a.name}/${k}`).toBeLessThanOrEqual(limit);
      }
    }
  });
  const walk = ANIMS.find((a) => a.name === 'walk')?.frames ?? [];
  const at = (i: number) => resolveJoints(DUMMY_A, walk[(i + walk.length) % walk.length] ?? frame({}), RIG_H);
  it('walk: 1-px bob, 3–4 px stride on contact, 1-px head drop on passing, no sideways head/body sway', () => {
    const hipY = walk.map((_, i) => at(i).hip[1]);
    expect(Math.max(...hipY) - Math.min(...hipY)).toBe(1);
    const gap = (i: number): number => at(i).footR[0] - at(i).footL[0];
    const rest = REST.footR[0] - REST.footL[0];
    for (const contact of [0, 4]) {
      expect(gap(contact) - rest).toBeGreaterThanOrEqual(3);
      expect(gap(contact) - rest).toBeLessThanOrEqual(4);
      expect(at(contact).footL[1]).toBe(at(contact).footR[1]);
    }
    for (const foot of ['footL', 'footR'] as const) {
      const planted = walk.filter((_, i) => at(i)[foot][1] === at(0)[foot][1]);
      expect(planted.length).toBeGreaterThanOrEqual(4);
    }
    const passing = new Set([2, 6]);
    walk.forEach((f, i) => {
      // The head sits where the body was one frame earlier (1-frame lag) and dips 1 px on the passing frames.
      const drop = passing.has(i) ? 1 : 0;
      expect(at(i).head[1] - at(i).hip[1]).toBe(REST.head[1] - REST.hip[1] + at(i - 1).hip[1] - at(i).hip[1] + drop);
      // Owner feedback: the head must not rock side to side — no lateral root or head offset in any frame.
      expect(f.root.dx).toBe(0);
      expect(at(i).head[0] - at(i).hip[0]).toBe(REST.head[0] - REST.hip[0]);
      // The hip shift is carried by the hem alone: 1 px, only on the passing frames.
      expect(Math.abs(f.parts.hem?.dx ?? 0)).toBe(passing.has(i) ? 1 : 0);
      expect([f.parts.armL, f.parts.armR]).not.toContain('chest');
    });
  });
  it('happy: anticipation squash → apex → landing squash', () => {
    const h = ANIMS.find((a) => a.name === 'happy')?.frames ?? [];
    const dy = h.map((f) => f.root.dy);
    const apex = dy.indexOf(Math.min(...dy));
    expect(h[0]?.squash).toBeGreaterThan(0);
    expect(apex).toBeGreaterThan(0);
    expect(h.slice(apex + 1).some((f) => f.squash > 0)).toBe(true);
  });
});

describe('dummy packs (MA-23 headroom, seams, determinism)', () => {
  const packs = [DUMMY_A, DUMMY_B].map((body) => createRigPack(body, ANIMS));
  const built = packs.map((def) => buildPack(def, ctx));
  it('builds palette-only frames with valid manifests, atlas ≤ 1024², scaleRef 48 and the sit_edge seat anchor', () => {
    built.forEach((b, i) => {
      const m = manifestSchema.parse(b.manifest);
      expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
      expect(m.scaleRef).toBe(48);
      expect(m.animations['sit_edge']?.anchor?.y).toBeLessThan(1);
      expect(Object.keys(m.animations)).toHaveLength(15);
      expect(b.atlasSize.width).toBeLessThanOrEqual(1024);
      expect(b.atlasSize.height).toBeLessThanOrEqual(1024);
      expect(checkStrips(m, new Map([['sprites/atlas.png', b.atlasSize]]), 1024)).toEqual([]);
      expect(packs[i]?.id).toMatch(/^rig-dummy-/);
    });
  });
  it('keeps row 0 transparent in every frame, and H is the smallest of 52/56/60 that does', () => {
    let lowest = Infinity;
    for (const b of built) {
      for (const [name, frames] of b.frames) {
        frames.forEach((img, f) => {
          expect(topRow(img), `${name}/${String(f)}`).toBeGreaterThanOrEqual(1);
          lowest = Math.min(lowest, topRow(img) - (RIG_H - FIGURE_H));
        });
      }
    }
    expect(chooseFrameH(lowest)).toBe(RIG_H);
  });
  it('has no seams: no enclosed transparent gap of ≤ 3 px inside the silhouette', () => {
    for (const b of built) {
      for (const [name, frames] of b.frames) {
        frames.forEach((img, f) => {
          expect(
            holes(img).filter((s) => s <= 3),
            `${name}/${String(f)}`,
          ).toEqual([]);
        });
      }
    }
  });
  it('is deterministic and the walk frames all differ', () => {
    for (const def of packs) expect(buildPack(def, ctx).sha256).toBe(buildPack(def, ctx).sha256);
    const walk = built[1]?.frames.get('walk') ?? [];
    expect(new Set(walk.map((f) => Buffer.from(f.data).toString('base64'))).size).toBe(8);
  });
});

describe('review round 4: seams, lag, frame checks, face placement (S5–S7)', () => {
  const dist = (a: readonly [number, number], b: readonly [number, number]): number =>
    Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  it.each([DUMMY_A, DUMMY_B])('$id: the loop-seam step of every joint is ≤ its largest in-clip step', (body) => {
    for (const anim of ANIMS.filter((a) => a.loop && a.frames.length > 1)) {
      const js = anim.frames.map((f) => resolveJoints(body, f, RIG_H));
      const last = js[js.length - 1];
      const first = js[0];
      if (!last || !first) continue;
      for (const joint of JOINTS) {
        const inClip = Math.max(...js.slice(1).map((j, i) => dist(j[joint], js[i]?.[joint] ?? j[joint])));
        expect(dist(last[joint], first[joint]), `${anim.name}/${joint}`).toBeLessThanOrEqual(inClip + 1e-9);
      }
    }
  });
  it('hair lags from the previous frame joints (two-frame loop vs the same pose held)', () => {
    const moved = frame({ root: { dx: 2, dy: 0 } });
    const loopAnim: RigAnim = { name: 'lag_a', fps: 8, loop: true, frames: [frame({}), moved] };
    const held: RigAnim = { name: 'lag_b', fps: 8, loop: true, frames: [moved, moved] };
    const r = createRigRenderer(DUMMY_A);
    const a = r.render(loopAnim, 1, ctx);
    const b = r.render(held, 1, ctx);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
    // A one-shot clip has no previous frame at frame 0: it renders like the pose held still at rest.
    const once: RigAnim = { name: 'once', fps: 8, loop: false, frames: [moved, frame({})] };
    const still: RigAnim = { name: 'still', fps: 8, loop: false, frames: [moved] };
    expect(Buffer.from(r.render(once, 0, ctx).data).equals(Buffer.from(r.render(still, 0, ctx).data))).toBe(true);
  });
  it('checkFrame throws on an opaque px in row 0 with headroom, not without', () => {
    const rgb = [...ctx.palette.colors.keys()][0] ?? 0;
    const data = new Uint8Array(4 * 4 * 4);
    data.set([(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, 255], 1 * 4);
    const image = { width: 4, height: 4, data };
    const def = (headroom?: boolean) =>
      ({ id: 't', frameSize: { w: 4, h: 4 }, ...(headroom ? { headroom } : {}) }) as unknown as PackDef;
    expect(() => {
      checkFrame(def(true), 'idle_a', 0, image, ctx.palette);
    }).toThrow(/row 0/);
    expect(() => {
      checkFrame(def(), 'idle_a', 0, image, ctx.palette);
    }).not.toThrow();
  });
  it('face placement follows head/face tweaks: a face px on hair or outside the head fails the pack', () => {
    expect(() => createRigPack({ ...DUMMY_A, tweaks: { head: { dx: 1, dy: -1 } } }, ANIMS)).not.toThrow();
    expect(() => createRigPack({ ...DUMMY_A, tweaks: { face: { dx: 0, dy: -6 } } }, ANIMS)).toThrow(/covers hair/);
    expect(() => createRigPack({ ...DUMMY_A, tweaks: { face: { dx: -9, dy: 0 } } }, ANIMS)).toThrow(/outside the head/);
    const outside = validateFace(DUMMY_FACE, 'x', { mask: DUMMY_HEAD.mask, faceAt: [-6, DUMMY_HEAD.faceAt[1]] });
    expect(outside.join(' | ')).toMatch(/outside the head/);
  });
});

describe('arm over torso (RIG.md rule, art round 5 c1/c2)', () => {
  const deepest = deepestTones(loadMasterPalette());
  const bodies = [MAID, DUMMY_A, DUMMY_B, MAID_PREVIEW];

  it('every frame of every pose: value step, 1-px deepest-tone separator, ≥ 2 px arm end on each crossing arm', () => {
    const problems: string[] = [];
    let measured = 0;
    for (const body of bodies) {
      const r = createRigRenderer(body);
      for (const anim of ANIMS) {
        anim.frames.forEach((_, f) => {
          const { image, labels } = r.renderLabeled(anim, f, ctx);
          const report = armTorsoContrast(image, labels, deepest);
          if (report.edge > 0) measured++;
          for (const p of armTorsoProblems(report)) problems.push(`${body.id}/${anim.name}/${String(f)}: ${p}`);
        });
      }
    }
    expect(problems).toEqual([]);
    expect(measured).toBeGreaterThan(200);
  });

  it('dummy-b (long same-ramp sleeves) crosses the torso in hug/chest/fold/chin poses and still passes', () => {
    const r = createRigRenderer(DUMMY_B);
    for (const name of ['petted', 'worried', 'think', 'talk', 'idle_a']) {
      const anim = ANIMS.find((a) => a.name === name);
      if (!anim) throw new Error(name);
      const { image, labels } = r.renderLabeled(anim, 0, ctx);
      const report = armTorsoContrast(image, labels, deepest);
      expect(report.edge, name).toBeGreaterThan(0);
      expect(report.p10, name).toBeGreaterThanOrEqual(ARM_TORSO_RULE.minDeltaL);
    }
  });

  it('fails when the sleeve takes the bodice tone (the check is not vacuous)', () => {
    const anim = ANIMS.find((a) => a.name === 'worried');
    if (!anim) throw new Error('worried');
    const { image, labels } = createRigRenderer(DUMMY_B).renderLabeled(anim, 0, ctx);
    const data = new Uint8Array(image.data);
    let torso = -1;
    for (let i = 0; i < labels.data.length / 4; i++) if (labels.data[i * 4] === ARM_LABEL.torso) torso = i;
    for (let i = 0; i < labels.data.length / 4; i++) {
      const l = labels.data[i * 4];
      if (l === ARM_LABEL.sleeveL || l === ARM_LABEL.sleeveR) data.set(data.subarray(torso * 4, torso * 4 + 4), i * 4);
    }
    const report = armTorsoContrast({ ...image, data }, labels, deepest);
    expect(armTorsoProblems(report).length).toBeGreaterThan(0);
  });

  it('a body whose sleeves sit on the bodice tone fails the build', () => {
    expect(() => createRigRenderer({ ...DUMMY_B, sleeve: { shade: 3 } })).toThrow(/arm-over-torso/);
  });

  it.each([
    ['dummy-b (long sleeves)', DUMMY_B],
    ['dummy-a', DUMMY_A],
    ['maid', MAID],
  ] as const)('think on %s: fist + cuff under the chin, nothing of the hand on the face', (_, body) => {
    const anim = ANIMS.find((a) => a.name === 'think');
    if (!anim) throw new Error('think');
    const { labels } = createRigRenderer(body).renderLabeled(anim, 0, ctx);
    const j = resolveJoints(body, anim.frames[0] ?? frame({}), RIG_H);
    const at = (x: number, y: number): number => labels.data[(y * labels.width + x) * 4] ?? 0;
    const hx = Math.round(j.handR[0]);
    const hy = Math.round(j.handR[1]);
    // Under the mouth: the fist centre sits within 2 px of the head's centre line, below the face.
    expect(Math.abs(hx - j.head[0])).toBeLessThanOrEqual(2);
    expect(hy).toBeGreaterThan(j.face[1] + 11);
    let fist = 0;
    for (let y = hy - 1; y <= hy + 2; y++)
      for (let x = hx - 2; x <= hx + 3; x++) if (at(x, y) === ARM_LABEL.endR) fist++;
    expect(fist).toBeGreaterThanOrEqual(12);
    // No arm px above the fist's top row (the old cheek fist read as a scar).
    for (let y = 0; y < hy - 1; y++) for (let x = 0; x < labels.width; x++) expect(at(x, y)).not.toBe(ARM_LABEL.endR);
  });
});
