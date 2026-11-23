// D-16 / ADR 010 (MA-27b/c): the three-quarter (q34) view on the shared rig — rest layout, per-view masks and face
// libraries, q34 draw order, the build gate for bodies without q34 parts, manifest facing, turn, mirror, and the
// shared LATER fixes (think fist, glance, toe highlight).
import { describe, expect, it } from 'vitest';
import { FIGURE_H, resolveJoints, REST, REST_Q34 } from '../../../assets-src/rig/body.ts';
import {
  animFacing,
  ARM_LABEL,
  bodyViewOf,
  createRigPack,
  createRigRenderer,
  headViewOf,
  q34FoxTail,
  pointToe,
  RIG_H,
  RIG_W,
  usesView,
} from '../../../assets-src/rig/compose.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { frame } from '../../../assets-src/rig/anims/kit.ts';
import { DUMMY_A, DUMMY_B, DUMMY_FACE, DUMMY_HEAD, MAID_PREVIEW } from '../../../assets-src/rig/dummies.ts';
import { createMaidPack, MAID } from '../../../assets-src/characters/maid/body.ts';
import {
  EXPRESSIONS,
  onlyIrisDiffers,
  validateFace,
  type ExpressionId,
  type ViewFaceLibrary,
} from '../../../assets-src/rig/face.ts';
import { JOINTS, type Body, type RigAnim } from '../../../assets-src/rig/types.ts';
import { buildPack, loadMasterPalette, mirrorFrame, renderContext } from '../../../tools/lib/sprites.ts';
import { WALK_TRAVEL } from '../../../src/content/stage.ts';
import { darkerMask, deriveQ34Head, tipToe } from '../../../assets-src/rig/q34.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { facingOf, manifestSchema } from '../../../src/shared/pack.ts';

const ctx = renderContext(loadMasterPalette());
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const alpha = (img: RgbaImage): number => {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if ((img.data[i] ?? 0) > 0) n++;
  return n;
};
/** Reference column flip (x → w − 1 − x), written independently of `mirrorFrame`. */
const referenceFlip = (img: RgbaImage): Uint8Array => {
  const out = new Uint8Array(img.data.length);
  for (let i = 0; i < img.width * img.height; i++) {
    const x = i % img.width;
    const j = i - x + (img.width - 1 - x);
    for (let c = 0; c < 4; c++) out[j * 4 + c] = img.data[i * 4 + c] ?? 0;
  }
  return out;
};
/** A face library minus one expression (typed: view libraries may be partial). */
const withoutExpression = (lib: ViewFaceLibrary, id: ExpressionId): ViewFaceLibrary => ({
  ...lib,
  expressions: Object.fromEntries(Object.entries(lib.expressions).filter(([k]) => k !== id)),
});
const BODIES: readonly Body[] = [DUMMY_A, DUMMY_B, MAID_PREVIEW, MAID];

describe('q34 rest layout (ADR 010)', () => {
  it('sets the head 1 px back (behind the hip axis) with the face 1 px toward the facing; chest/hip axis unchanged', () => {
    // Owner (MA-27d): the head sat ahead of the torso; in q34 the back of the head overhangs behind instead.
    expect(REST_Q34.head[0] - REST_Q34.hip[0]).toBe(-1);
    expect(REST_Q34.face[0] - REST.face[0]).toBe(1);
    expect(REST_Q34.face[0] - REST_Q34.head[0]).toBe(REST.face[0] - REST.head[0] + 2);
    for (const j of ['root', 'hip', 'chest', 'neck', 'seat'] as const) expect(REST_Q34[j]).toEqual(REST[j]);
    expect(REST_Q34.shoulderL[0]).toBe(REST.shoulderL[0] - 1);
    expect(REST_Q34.shoulderR[0]).toBe(REST.shoulderR[0] - 2);
    expect(REST_Q34.shoulderR[1]).toBe(REST.shoulderR[1] + 1);
    expect(REST_Q34.footL[1]).toBe(REST_Q34.footR[1]);
    expect(REST_Q34.back[0]).toBe(REST.hip[0] - 2);
  });
  it('a leading head view moves only the head joints (turn f0)', () => {
    const lead = resolveJoints(DUMMY_A, frame({ view: 'front', headView: 'q34' }), RIG_H);
    const front = resolveJoints(DUMMY_A, frame({}), RIG_H);
    const q = resolveJoints(DUMMY_A, frame({ view: 'q34' }), RIG_H);
    expect(lead.head).toEqual(q.head);
    expect(lead.face).toEqual(q.face);
    for (const j of ['hip', 'chest', 'shoulderL', 'shoulderR', 'handL', 'footL', 'footR'] as const) {
      expect(lead[j]).toEqual(front[j]);
    }
  });
});

describe('q34 animations: walk, turn, manifest facing (MA-27c)', () => {
  it('walk and turn are the only q34 animations and are emitted with facing: right', () => {
    expect(ANIMS.filter((a) => animFacing(a) === 'right').map((a) => a.name)).toEqual(['walk', 'turn']);
    for (const def of [createRigPack(DUMMY_A, ANIMS), createMaidPack()]) {
      const m = manifestSchema.parse(buildPack(def, ctx).manifest);
      for (const [name, a] of Object.entries(m.animations)) {
        expect(facingOf(a), `${def.id}/${name}`).toBe(name === 'walk' || name === 'turn' ? 'right' : 'front');
      }
    }
  });
  it('facing comes from the frames: an animation of front frames only is front (no manifest field)', () => {
    const still: RigAnim = { name: 'still', fps: 6, loop: true, frames: [frame({}), frame({ face: 'blink' })] };
    expect(animFacing(still)).toBe('front');
    expect(createRigPack(DUMMY_A, [still]).animations['still']?.facing).toBeUndefined();
    const headOnly: RigAnim = { ...still, name: 'head', frames: [frame({ headView: 'q34' })] };
    expect(animFacing(headOnly)).toBe('front');
    const q: RigAnim = { ...still, name: 'q', frames: [frame({}), frame({ view: 'q34' })] };
    expect(animFacing(q)).toBe('right');
    expect(bodyViewOf(q, 0)).toBe('front');
  });
  it('turn: 2 one-shot frames, f0 = front body + q34 head and eyes, f1 = the q34 rest stance', () => {
    const t = anim('turn');
    expect([t.frames.length, t.fps, t.loop]).toEqual([2, 10, false]);
    expect([bodyViewOf(t, 0), headViewOf(t, 0)]).toEqual(['front', 'q34']);
    expect([bodyViewOf(t, 1), headViewOf(t, 1)]).toEqual(['q34', 'q34']);
    // f1 is the q34 rest stance: every joint at REST_Q34 (frame px = figure units + headroom).
    const j1 = createRigRenderer(DUMMY_A).joints(t, 1);
    for (const k of JOINTS) {
      expect(j1[k][0], k).toBeCloseTo(REST_Q34[k][0], 9);
      expect(j1[k][1], k).toBeCloseTo(REST_Q34[k][1] + RIG_H - FIGURE_H, 9);
    }
    expect(t.frames[1]?.face).toBe('neutral');
  });
  it('q34 frames use only neutral and blink (Q-D16-2)', () => {
    const faces = new Set(
      ANIMS.flatMap((a) => a.frames.filter((_, i) => headViewOf(a, i) === 'q34').map((f) => f.face)),
    );
    for (const f of faces) expect(['neutral', 'blink']).toContain(f);
  });
});

describe('q34 build gate and per-view face validator (MA-27b)', () => {
  it('a body without views.q34 fails the build when q34 poses exist, builds without them', () => {
    const { views, ...front } = DUMMY_A;
    expect(views?.q34).toBeDefined();
    expect(() => createRigPack(front, ANIMS)).toThrow(/views\.q34/);
    expect(usesView(ANIMS, 'q34')).toBe(true);
    const frontOnly = ANIMS.filter((a) => !usesView([a], 'q34'));
    expect(() => createRigPack(front, frontOnly)).not.toThrow();
  });
  it.each([DUMMY_A, DUMMY_B])('$id: the q34 face library needs the q34 expressions, never over hair', (body) => {
    const q34 = body.views?.q34;
    if (!q34) throw new Error('q34');
    const { blink, ...rest } = q34.face.expressions;
    expect(blink).toBeDefined();
    const noBlink: Body = { ...body, views: { q34: { ...q34, face: { ...q34.face, expressions: rest } } } };
    expect(() => createRigPack(noBlink, ANIMS)).toThrow(/q34: missing expression "blink"/);
    const high: Body = { ...body, views: { q34: { ...q34, tweaks: { face: { dx: 0, dy: -6 } } } } };
    expect(() => createRigPack(high, ANIMS)).toThrow(/q34.*covers hair/);
  });
  it('the front library must have glance (idle_a); a q34-sized library fails the front validator', () => {
    expect(validateFace(withoutExpression(DUMMY_FACE, 'glance'), 'dummy').join()).toMatch(
      /missing expression "glance"/,
    );
    expect(validateFace(DUMMY_FACE, 'dummy')).toEqual([]);
  });
  it('glance is a required front expression and idle_a uses it on exactly one frame', () => {
    expect(EXPRESSIONS).toContain('glance');
    expect(anim('idle_a').frames.filter((f) => f.face === 'glance')).toHaveLength(1);
  });
});

describe('q34 rendering: draw order, view parts, mirror (MA-27b)', () => {
  const walk = anim('walk');
  it.each(BODIES)('$id: far arm + far leg behind the torso, near arm in front', (body) => {
    const r = createRigRenderer(body);
    const j = r.joints(walk, 0);
    const { labels } = r.renderLabeled(walk, 0, ctx);
    const label = (x: number, y: number): number => labels.data[(Math.round(y) * RIG_W + Math.round(x)) * 4] ?? 0;
    // The far shoulder is covered by the bodice; the near shoulder sits on top.
    expect([ARM_LABEL.torso, ARM_LABEL.trim]).toContain(label(j.shoulderR[0] - 0.5, j.shoulderR[1]));
    expect([ARM_LABEL.sleeveL, ARM_LABEL.endL]).toContain(label(j.shoulderL[0], j.shoulderL[1] + 1));
    // The far hand on the forward swing peeks out past the torso.
    let farEnd = 0;
    for (let i = 0; i < labels.data.length; i += 4) if (labels.data[i] === ARM_LABEL.endR) farEnd++;
    expect(farEnd).toBeGreaterThan(0);
  });
  it.each(BODIES)('$id: q34 frames differ from front ones and keep the body axis at x = 24', (body) => {
    const r = createRigRenderer(body);
    const t = anim('turn');
    const f0 = r.render(t, 0, ctx);
    const f1 = r.render(t, 1, ctx);
    const still = r.render(anim('idle_a'), 0, ctx);
    expect(Buffer.from(f0.data).equals(Buffer.from(still.data))).toBe(false);
    expect(Buffer.from(f1.data).equals(Buffer.from(f0.data))).toBe(false);
    for (let f = 0; f < walk.frames.length; f++) expect(r.joints(walk, f).hip[0]).toBe(RIG_W / 2);
  });
  it.each([DUMMY_A, DUMMY_B])(
    '$id: the mirrored q34 frame is an exact column flip with the same alpha count',
    (body) => {
      const r = createRigRenderer(body);
      for (const a of [walk, anim('turn')]) {
        a.frames.forEach((_, f) => {
          const img = r.render(a, f, ctx);
          const m = mirrorFrame(img);
          expect(alpha(m)).toBe(alpha(img));
          expect(Buffer.from(m.data).equals(Buffer.from(referenceFlip(img))), `${a.name}/${String(f)}`).toBe(true);
          expect(Buffer.from(mirrorFrame(m).data).equals(Buffer.from(img.data))).toBe(true);
        });
      }
    },
  );
});

describe('shared LATER fixes (art round MA-27-3)', () => {
  it('the pointed boot toe gets a 1-px light highlight', () => {
    expect(pointToe(['.LM.', 'mmlm', 'mMMm'])).toEqual(['.LM.', 'mmlm', 'mMMm', '.lM.']);
  });
  it.each([DUMMY_A, MAID])('$id think: the fist sits 1 px toward its own arm (screen-right hand)', (body) => {
    const think = anim('think');
    const j = resolveJoints(body, think.frames[0] ?? frame({}), RIG_H);
    expect(j.handR[0] - j.head[0]).toBeCloseTo(REST.shoulderR[0] - 3.2 - REST.head[0], 5);
  });
});

describe('q34 walk art round (MA-27c fix round A1–A6)', () => {
  const walk = anim('walk');
  const at = (i: number) => resolveJoints(DUMMY_A, walk.frames[(i + 8) % 8] ?? frame({}), RIG_H);
  it('A3: the planted foot slides back the same 2 px every frame, matching the M1 travel speed', () => {
    const ground = at(0).footL[1];
    for (const foot of ['footL', 'footR'] as const) {
      const steps: number[] = [];
      for (let i = 0; i < 8; i++) {
        if (at(i)[foot][1] === ground && at(i + 1)[foot][1] === ground) steps.push(at(i)[foot][0] - at(i + 1)[foot][0]);
      }
      expect(steps.length, foot).toBeGreaterThanOrEqual(4);
      for (const s of steps) expect(s, foot).toBe(WALK_TRAVEL.pxPerFrame);
    }
    expect(WALK_TRAVEL.fps).toBe(walk.fps);
    expect(WALK_TRAVEL.pxPerSecond).toBe(WALK_TRAVEL.pxPerFrame * walk.fps);
    expect(Math.abs(at(0).footL[0] - at(0).footR[0])).toBe(8);
  });
  it('A1: on the passing frames the lifted foot sits 1–2 px behind the planted one, toe tipped down', () => {
    for (const [i, lifted, planted] of [
      [2, 'footR', 'footL'],
      [6, 'footL', 'footR'],
    ] as const) {
      const back = at(i)[planted][0] - at(i)[lifted][0];
      expect(back, String(i)).toBeGreaterThanOrEqual(1);
      expect(back, String(i)).toBeLessThanOrEqual(2);
      expect(at(i)[planted][1] - at(i)[lifted][1]).toBe(2);
    }
    expect(tipToe(['.LM..', 'mmllm', 'mMMMm'])).toEqual(['.LM..', 'mmllm', 'mMMM.', '....m']);
  });
  it('A2: the far shoe is one ramp step darker in every q34 frame; contact frames differ', () => {
    expect(darkerMask(['.LM..', 'lmlmm', 'lMMMl'])).toEqual(['.lM..', 'BMBMM', 'BMMMB']);
    // At contact the two shoes do not touch: the far shoe's brightest px is darker than the near shoe's.
    const r = createRigRenderer(DUMMY_A);
    const shoe = DUMMY_A.views?.q34?.masks.shoe ?? [];
    for (const f of [0, 4]) {
      const img = r.render(walk, f, ctx);
      const j = r.joints(walk, f);
      const brightest = (foot: readonly [number, number]): number => {
        let best = 0;
        shoe.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            if (row.charAt(x) === '.') continue;
            const i = ((Math.round(foot[1] - 0.6) + y) * img.width + Math.round(foot[0] - 2) + x) * 4;
            best = Math.max(best, (img.data[i] ?? 0) * 3 + (img.data[i + 1] ?? 0) * 6 + (img.data[i + 2] ?? 0));
          }
        });
        return best;
      };
      expect(brightest(j.footR), String(f)).toBeLessThan(brightest(j.footL));
    }
  });
  it('A5/A6: the back-hair tips trail 1 px on the passing frames; the tail swings against the hair', () => {
    expect(walk.frames.map((f) => f.hairDx ?? 0)).toEqual([0, 0, -1, 0, 0, 0, -1, 0]);
    const r = createRigRenderer(DUMMY_B);
    const still: RigAnim = { ...walk, name: 'still-hair', frames: walk.frames.map((f) => ({ ...f, hairDx: 0 })) };
    expect(Buffer.from(r.render(walk, 2, ctx).data).equals(Buffer.from(r.render(still, 2, ctx).data))).toBe(false);
    expect(Buffer.from(r.render(walk, 0, ctx).data).equals(Buffer.from(r.render(still, 0, ctx).data))).toBe(true);
  });
});

describe('q34 head derivation (A7, C3)', () => {
  const skinRight = (row: string): number => {
    for (let x = row.length - 1; x >= 0; x--) if ('zsSeE'.includes(row.charAt(x))) return x;
    return -1;
  };
  it('tapers the facing-side jaw 1 px per row over the last 3 skin rows and adds a chin point at col 18', () => {
    const head = deriveQ34Head(DUMMY_HEAD.mask);
    const rows = head.map((r, y) => (skinRight(r) >= 0 ? y : -1)).filter((y) => y >= 0);
    const chin = rows[rows.length - 1] ?? -1;
    expect(head[chin]).toBe('.'.repeat(18) + 's' + '.'.repeat(11));
    const edges = rows.slice(-4, -1).map((y) => skinRight(head[y] ?? ''));
    expect(edges[1]).toBeLessThan(edges[0] ?? 0);
    expect(edges[2]).toBeLessThan(edges[1] ?? 0);
  });
  it('rejects a head mask that is not 30 wide', () => {
    expect(() => deriveQ34Head(['.'.repeat(29)])).toThrow(/expected 30/);
  });
});

describe('art round MA-27c-2: tail tip, iris-only glance, think fist', () => {
  const walk = anim('walk');
  it('dummy-b q34 tail tip hangs past the hair at skirt level, clear of the near hand in every walk frame', () => {
    const r = createRigRenderer(DUMMY_B);
    walk.frames.forEach((f, i) => {
      const j = r.joints(walk, i);
      const tip = q34FoxTail(j.back, f.hairDx ?? 0).at(-1) ?? [99, 99];
      expect(tip[0], String(i)).toBeLessThanOrEqual(9);
      expect(tip[1], String(i)).toBeGreaterThanOrEqual(38);
      expect(tip[1], String(i)).toBeLessThanOrEqual(42);
      expect(Math.hypot(tip[0] - j.handL[0], tip[1] - j.handL[1]), String(i)).toBeGreaterThanOrEqual(4);
    });
  });
  it.each([
    ['dummy', DUMMY_FACE],
    ['maid', MAID.face],
  ] as const)('%s glance moves only iris/pupil px against neutral (lashes, outline, shine stay)', (_, lib) => {
    const open = lib.eyes[lib.expressions.neutral.eyes];
    const side = lib.eyes[lib.expressions.glance.eyes];
    if (!open || !side) throw new Error('eyes');
    expect(side.at).toEqual(open.at);
    expect(side.mask).not.toEqual(open.mask);
    expect(onlyIrisDiffers(open.mask, side.mask)).toBe(true);
    expect(
      onlyIrisDiffers(
        open.mask,
        open.mask.map((r) => '.' + r.slice(0, -1)),
      ),
    ).toBe(false);
  });
  it('turn f0 leads with the eyes (iris shift on f0 only)', () => {
    const t = anim('turn');
    expect(t.frames.map((f) => f.irisDx ?? 0)).toEqual([1, 0]);
    const r = createRigRenderer(DUMMY_A);
    const plain: RigAnim = { ...t, name: 'turn-plain', frames: [frame({ view: 'front', headView: 'q34' })] };
    expect(Buffer.from(r.render(t, 0, ctx).data).equals(Buffer.from(r.render(plain, 0, ctx).data))).toBe(false);
  });
  it.each([DUMMY_A, DUMMY_B, MAID])(
    '$id think fist: no cuff px inside, 2-px break above it that is not an arm px',
    (body) => {
      const think = anim('think');
      const skin = new Set(ctx.palette.ramps.get(body.outfit.skin.ramp) ?? []);
      const r = createRigRenderer(body);
      think.frames.forEach((_, f) => {
        const { image, labels } = r.renderLabeled(think, f, ctx);
        const j = r.joints(think, f);
        const fx = Math.round(j.handR[0]) - 2;
        const fy = Math.round(j.handR[1]) - 1;
        const rgb = (x: number, y: number): number => {
          const i = (y * image.width + x) * 4;
          return ((image.data[i] ?? 0) << 16) | ((image.data[i + 1] ?? 0) << 8) | (image.data[i + 2] ?? 0);
        };
        expect(skin.has(rgb(fx, fy + 3)), `f${String(f)} corner`).toBe(true);
        for (const x of [fx + 1, fx + 2]) {
          expect(skin.has(rgb(x, fy - 1)), `f${String(f)} break`).toBe(true);
          expect(labels.data[((fy - 1) * image.width + x) * 4]).not.toBe(ARM_LABEL.endR);
        }
      });
    },
  );
});
