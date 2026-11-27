// M-ART MA-65 (D-20, docs/art/ronin.md): `pixmates.ronin` as the armoured chibi samurai — pack build, stern faces per
// view, the menpō (mouth hidden on mask-up frames, down on happy / petted / sleep), tuft bounds and headroom, armour
// present on every frame, red only where listed, arm-over-torso gate. The ramp gates live in ronin-palette.test.ts.
import { describe, expect, it } from 'vitest';
import { createRoninPack, RONIN } from '../../../assets-src/characters/ronin/body.ts';
import { TUFT } from '../../../assets-src/characters/ronin/masks.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { bodyViewOf, createRigRenderer } from '../../../assets-src/rig/compose.ts';
import { ARM_LABEL } from '../../../assets-src/rig/part-ids.ts';
import type { ExpressionId } from '../../../assets-src/rig/face.ts';
import type { Body, RigAnim } from '../../../assets-src/rig/types.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const renderer = createRigRenderer(RONIN);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const frameWith = (name: string, face: ExpressionId): number => {
  const i = anim(name).frames.findIndex((f) => f.face === face);
  if (i < 0) throw new Error(`${name} has no ${face}`);
  return i;
};
const pixels = (body: Body, name: string, f: number): Buffer =>
  Buffer.from(createRigRenderer(body).renderLabeled(anim(name), f, ctx).image.data);
const withMouth = (id: ExpressionId, mouth: string): Body => ({
  ...RONIN,
  face: { ...RONIN.face, expressions: { ...RONIN.face.expressions, [id]: { ...RONIN.face.expressions[id], mouth } } },
});
const tones = (ramp: string): Set<number> => new Set(palette.ramps.get(ramp) ?? []);
const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i * 4] ?? 0) << 16) | ((data[i * 4 + 1] ?? 0) << 8) | (data[i * 4 + 2] ?? 0);

describe('pixmates.ronin pack (D-20 armoured chibi)', () => {
  it('builds all 16 shared animations at 48 × 56 within 1024², walk facing right, deterministically', () => {
    const built = buildPack(createRoninPack(), ctx);
    const m = manifestSchema.parse(built.manifest);
    expect(m.frameSize).toEqual({ w: 48, h: 56 });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(buildPack(createRoninPack(), ctx).sha256).toBe(built.sha256);
  });
  it('uses the stern face option in both views and the menpō slot', () => {
    expect(RONIN.face.style).toBe('stern');
    expect(RONIN.views?.q34?.face.style).toBe('stern');
    expect(RONIN.mask?.downExpressions).toEqual(['happy', 'petted', 'sleep']);
  });
  it('passes the arm-over-torso gate on every frame', () => {
    const deepest = deepestTones(palette);
    const problems = ANIMS.flatMap((a) =>
      a.frames.flatMap((_, f) => {
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
        const far = bodyViewOf(a, f) === 'q34' ? ('R' as const) : undefined;
        return armTorsoProblems(armTorsoContrast(image, labels, deepest), far ? { far } : undefined).map(
          (p) => `${a.name}/${String(f)}: ${p}`,
        );
      }),
    );
    expect(problems).toEqual([]);
  });
});

describe('menpō (ronin.md §1, ART-BIBLE §11.10)', () => {
  it.each([
    ['idle_a', 'neutral'],
    ['talk', 'talk_b'],
  ] as const)('%s / %s: mask up — changing the mouth changes no px', (name, face) => {
    const f = frameWith(name, face);
    expect(pixels(withMouth(face, 'talk_c'), name, f)).toEqual(pixels(RONIN, name, f));
  });
  it.each([
    ['happy', 'happy'],
    ['petted', 'petted'],
  ] as const)('%s: mask down — the mouth shows', (name, face) => {
    const f = frameWith(name, face);
    expect(pixels(withMouth(face, 'talk_c'), name, f)).not.toEqual(pixels(RONIN, name, f));
  });
  it('wraps the lower face: no face skin beside or under the mask-up menpō in any frame, front or q34 (owner 2026-11-27)', () => {
    // The menpō starts 2 rows under the lowest iris row (1 lit skin row between). In its 5 rows every skin px must be
    // a hand (arm-end label 3–4); face skin there means the shell is narrower than the head or ends above the chin.
    const skin = tones('skin');
    const jade = tones('jade');
    const down = new Set(RONIN.mask?.downExpressions ?? []);
    const problems: string[] = [];
    let checked = 0;
    for (const a of ANIMS) {
      a.frames.forEach((fr, f) => {
        if (down.has(fr.face)) return;
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
        const w = image.width;
        let eyeBottom = -1;
        for (let i = 0; i < w * image.height; i++) {
          if (image.data[i * 4 + 3] && jade.has(rgbAt(image.data, i))) eyeBottom = Math.floor(i / w);
        }
        if (eyeBottom < 0) return; // closed eyes: no iris to anchor on (the same mask as the open frames)
        checked++;
        // Hand = skin 4-connected to a skin px labelled arm end (the chin fist on `think` is stamped unlabelled).
        // Only skin seeds: the lacquer sode is labelled an arm end too and touches the jaw.
        const isSkin = (i: number): boolean => Boolean(image.data[i * 4 + 3]) && skin.has(rgbAt(image.data, i));
        const hand = new Set<number>();
        const todo: number[] = [];
        for (let i = 0; i < w * image.height; i++) {
          const l = labels.data[i * 4] ?? 0;
          if ((l === ARM_LABEL.endL || l === ARM_LABEL.endR) && isSkin(i)) todo.push(i);
        }
        while (todo.length > 0) {
          const i = todo.pop() ?? 0;
          hand.add(i);
          for (const n of [i - 1, i + 1, i - w, i + w]) {
            if (n >= 0 && n < w * image.height && !hand.has(n) && isSkin(n)) {
              hand.add(n);
              todo.push(n);
            }
          }
        }
        for (let y = eyeBottom + 2; y < eyeBottom + 7; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (isSkin(i) && !hand.has(i)) {
              problems.push(`${a.name}/${String(f)} (${String(x)},${String(y)})`);
            }
          }
        }
      });
    }
    expect(checked).toBeGreaterThan(20);
    expect(problems).toEqual([]);
  });
  it('talks with the eyes: talk_a / talk_b / talk_c frames differ while the mask is up', () => {
    const talk = anim('talk');
    const faces = new Set(talk.frames.map((f) => f.face));
    expect(faces.size).toBeGreaterThan(1);
    const imgs = talk.frames.map((_, f) => pixels(RONIN, 'talk', f).toString('hex'));
    expect(new Set(imgs).size).toBeGreaterThan(1);
  });
});

describe('crown tuft and colour discipline', () => {
  it('keeps the tuft ≤ 2 px wide and ≤ 2 rows above the crown, with a 1-px red cord row', () => {
    expect(Math.max(...TUFT.map((r) => r.replace(/\./g, '').length))).toBeLessThanOrEqual(2);
    expect(TUFT.length - 1).toBeLessThanOrEqual(2);
  });
  it('keeps row 0 clear in every frame (headroom with the tuft)', () => {
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image } = renderer.renderLabeled(a, f, ctx);
        const row0 = Array.from({ length: image.width }, (_, x) => image.data[x * 4 + 3] ?? 0);
        expect(Math.max(...row0), `${a.name}/${String(f)}`).toBe(0);
      });
    }
  });
  it('shows black lacquer and vermilion on every frame, red less than the black (≈ 1 : 3 target)', () => {
    const black = tones('lacquer_black');
    const red = tones('lacquer_red');
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image } = renderer.renderLabeled(a, f, ctx);
        let nb = 0;
        let nr = 0;
        for (let i = 0; i < image.width * image.height; i++) {
          if (!image.data[i * 4 + 3]) continue;
          const h = rgbAt(image.data, i);
          if (black.has(h)) nb++;
          if (red.has(h)) nr++;
        }
        expect(nr, `${a.name}/${String(f)} red`).toBeGreaterThan(0);
        expect(nr, `${a.name}/${String(f)} red < black`).toBeLessThan(nb);
      });
    }
  });
});
