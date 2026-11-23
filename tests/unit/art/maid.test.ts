// M-ART MA-27: the built-in `pixmates.maid` pack (assets-src/characters/maid/) — manifest, gates and the art-director
// LATER items that code can check (D-mouth on arms-up frames, hair lift, shoulder seam vs trim, tail lag).
import { describe, expect, it } from 'vitest';
import { createMaidPack, MAID, MAID_EMOTIONS } from '../../../assets-src/characters/maid/body.ts';
import { MAID_FACE } from '../../../assets-src/characters/maid/face.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, createRigRenderer, RIG_H, stampMask } from '../../../assets-src/rig/compose.ts';
import { createIndexBuffer } from '../../../assets-src/lib/buffer.ts';
import { EXPRESSIONS, expressionParts, Q34_EXPRESSIONS, validateFace } from '../../../assets-src/rig/face.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { HEAD } from '../../../assets-src/characters/maid/masks.ts';
import { deriveQ34Head } from '../../../assets-src/rig/q34.ts';
import type { Body, PoseFrame, RigAnim } from '../../../assets-src/rig/types.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';
import { checkStrips, manifestSchema } from '../../../src/shared/pack.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const same = (a: RgbaImage, b: RgbaImage): boolean => Buffer.from(a.data).equals(Buffer.from(b.data));

describe('pixmates.maid pack (MA-27)', () => {
  const built = buildPack(createMaidPack(), ctx);

  it('builds all 16 shared animations at 48 × 56 with scaleRef 48 and a valid manifest within 1024²', () => {
    const m = manifestSchema.parse(built.manifest);
    expect(m.id).toBe('pixmates.maid');
    expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
    expect(m.scaleRef).toBe(48);
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(built.atlasSize.width).toBeLessThanOrEqual(1024);
    expect(built.atlasSize.height).toBeLessThanOrEqual(1024);
  });

  it('lists the plan emotions, each an animation of the pack', () => {
    expect(built.manifest['emotions']).toEqual(['happy', 'think', 'worried', 'startle']);
    for (const e of MAID_EMOTIONS) expect(Object.keys(built.manifest['animations'] as object)).toContain(e);
  });

  it('is deterministic', () => {
    expect(buildPack(createMaidPack(), ctx).sha256).toBe(built.sha256);
  });

  it('has all 14 expressions and no face px on hair or outside the head', () => {
    expect(Object.keys(MAID_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(MAID_FACE, 'maid', { mask: MAID.head.mask, faceAt: [5, 12] })).toEqual([]);
  });

  it('happy opens the D-mouth only on arms-up frames', () => {
    const open = MAID_FACE.mouths['open_d']?.mask;
    expect(expressionParts(MAID_FACE, 'happy', true).map((p) => p.mask)).toContain(open);
    expect(expressionParts(MAID_FACE, 'happy', false).map((p) => p.mask)).not.toContain(open);
    expect(anim('happy').frames.some((f) => f.parts.armL === 'up' && f.face === 'happy')).toBe(true);
  });

  it('an unknown raised mouth fails the face validator', () => {
    const lib = {
      ...MAID_FACE,
      expressions: { ...MAID_FACE.expressions, happy: { ...MAID_FACE.expressions.happy, raisedMouth: 'nope' } },
    };
    expect(validateFace(lib, 'x').join(' ')).toMatch(/unknown raised mouth/);
  });

  it('hair lift changes the happy apex frame', () => {
    const happy = anim('happy');
    const apex = happy.frames.findIndex((f) => f.hairLift === 1);
    expect(apex).toBeGreaterThan(0);
    const r = createRigRenderer(MAID);
    const noLift = {
      ...happy,
      name: 'happy-nolift',
      frames: happy.frames.map((f): PoseFrame => {
        const rest = { ...f };
        delete rest.hairLift;
        return rest;
      }),
    };
    expect(same(r.render(happy, apex, ctx), r.render(noLift, apex, ctx))).toBe(false);
  });

  it('shoulder seam: pink sleeves next to rose trim keep the ΔL step, and the check is not vacuous', () => {
    const deepest = deepestTones(palette);
    const r = createRigRenderer(MAID);
    let trimFrames = 0;
    let probe: { a: RigAnim; f: number } | undefined;
    const problems: string[] = [];
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image, labels } = r.renderLabeled(a, f, ctx);
        const rep = armTorsoContrast(image, labels, deepest);
        if (rep.trimSamples > 0) {
          trimFrames++;
          probe ??= { a, f };
        }
        for (const p of armTorsoProblems(rep)) problems.push(`${a.name}/${String(f)}: ${p}`);
      });
    }
    expect(problems).toEqual([]);
    expect(trimFrames).toBeGreaterThanOrEqual(4);
    if (!probe) throw new Error('no frame with a sleeve next to trim');
    const { image, labels } = r.renderLabeled(probe.a, probe.f, ctx);
    let trim = -1;
    for (let i = 0; i < labels.data.length / 4; i++) if (labels.data[i * 4] === ARM_LABEL.trim) trim = i;
    expect(trim).toBeGreaterThanOrEqual(0);
    const data = new Uint8Array(image.data);
    for (let i = 0; i < labels.data.length / 4; i++) {
      const l = labels.data[i * 4];
      if (l === ARM_LABEL.sleeveL || l === ARM_LABEL.sleeveR) data.set(data.subarray(trim * 4, trim * 4 + 4), i * 4);
    }
    expect(armTorsoProblems(armTorsoContrast({ ...image, data }, labels, deepest)).join(' ')).toMatch(/shoulder/);
  });

  it('the spade tail lags the hip by one frame', () => {
    const walk = anim('walk');
    const r = createRigRenderer(MAID);
    const pose = walk.frames[2];
    if (!pose) throw new Error('walk/2');
    // The same pose as a one-frame clip has no previous frame, so no lag.
    const single: RigAnim = { ...walk, name: 'walk-single', loop: false, frames: [pose] };
    expect(same(r.render(walk, 2, ctx), r.render(single, 0, ctx))).toBe(false);
  });

  it('turn f0 tucks the tail behind the skirt (no tail beside the front body), the untucked pose would show it', () => {
    const turn = anim('turn');
    const f0 = turn.frames[0];
    if (!f0?.tailTucked) throw new Error('turn f0 is not tail-tucked');
    const rest = { ...f0 };
    delete rest.tailTucked;
    const r = createRigRenderer(MAID);
    const beside = (img: RgbaImage): number => {
      let n = 0;
      // Below the head and the far hair sliver (frame rows ≥ 38), right of the skirt flare.
      for (let y = 38; y < img.height; y++)
        for (let x = 36; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3]) n++;
      return n;
    };
    expect(beside(r.render(turn, 0, ctx))).toBe(0);
    expect(beside(r.render({ ...turn, name: 'turn-untucked', frames: [rest] }, 0, ctx))).toBeGreaterThan(0);
  });

  it('q34 walk: the head overhangs the torso front by no more than its back overhang + 4 px', () => {
    // Head = rows head−6 … head+10 (below the horns, down to the chin); torso = bodice + upper skirt rows
    // hip−9 … hip−1 without arm px. Facing (front) overhang = head right − torso right; trailing = torso left − head left.
    const walk = anim('walk');
    const r = createRigRenderer(MAID);
    walk.frames.forEach((_, f) => {
      const j = r.joints(walk, f);
      const { image, labels } = r.renderLabeled(walk, f, ctx);
      const ext = (y0: number, y1: number, noArms: boolean): [number, number] => {
        let lo = Infinity;
        let hi = -Infinity;
        for (let y = y0; y <= y1; y++) {
          for (let x = 0; x < image.width; x++) {
            const i = (y * image.width + x) * 4;
            if (!image.data[i + 3]) continue;
            const l = labels.data[i];
            if (noArms && l !== ARM_LABEL.none && l !== ARM_LABEL.torso && l !== ARM_LABEL.trim) continue;
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
          }
        }
        return [lo, hi];
      };
      const head = ext(Math.round(j.head[1]) - 6, Math.round(j.head[1]) + 10, false);
      const torso = ext(Math.round(j.hip[1]) - 9, Math.round(j.hip[1]) - 1, true);
      const front = head[1] - torso[1];
      const back = torso[0] - head[0];
      expect(front, `walk/${String(f)}: front ${String(front)} vs back ${String(back)}`).toBeLessThanOrEqual(back + 4);
    });
  });

  describe('authored q34 view (MA-27d)', () => {
    const q34 = MAID.views?.q34;
    if (!q34) throw new Error('maid has no q34 view');
    const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
    /** Rows (top → bottom) holding horn px in mask cols [from, to). */
    const hornRows = (mask: Mask, from: number, to: number): number[] =>
      mask.flatMap((row, y) =>
        row
          .slice(from, to)
          .split('')
          .some((c) => slotOf(c) === 'horn')
          ? [y]
          : [],
      );

    it('has an authored head, not the derived stand-in', () => {
      expect(q34.head.mask).not.toEqual(deriveQ34Head(HEAD));
      expect(q34.head.mask.every((r) => r.length === 30)).toBe(true);
    });

    it('keeps both horns whole inside the mask: near full, far shorter, each a contiguous chain', () => {
      const near = hornRows(q34.head.mask, 0, 15);
      const far = hornRows(q34.head.mask, 15, 30);
      for (const [rows, min] of [
        [near, 4],
        [far, 3],
      ] as const) {
        expect(rows.length).toBeGreaterThanOrEqual(min);
        expect((rows.at(-1) ?? 0) - (rows[0] ?? 0) + 1, 'no gap in the horn').toBe(rows.length);
      }
      expect(far.length).toBeLessThan(near.length);
      // The far horn tip is whole (the derived stand-in dropped its middle columns): a 3-px run on its top row.
      const tip = q34.head.mask[far[0] ?? 0]?.slice(15) ?? '';
      expect(
        tip
          .split('')
          .map((c) => (slotOf(c) === 'horn' ? '#' : '.'))
          .join(''),
      ).toMatch(/###/);
    });

    it('keeps row 0 transparent on every q34 frame (headroom)', () => {
      for (const name of ['walk', 'turn']) {
        const frames = built.frames.get(name) ?? [];
        expect(frames.length).toBeGreaterThan(0);
        frames.forEach((img, f) => {
          for (let x = 0; x < img.width; x++)
            expect(img.data[x * 4 + 3], `${name}/${String(f)} x=${String(x)}`).toBe(0);
        });
      }
    });

    it('tapers the jaw to a 1-px chin point ahead of the face centre', () => {
      const last = q34.head.mask[q34.head.mask.length - 1] ?? '';
      const px = last.split('').flatMap((c, x) => (c === '.' ? [] : [x]));
      expect(px).toHaveLength(1);
      expect(slotOf(last.charAt(px[0] ?? 0))).toBe('skin');
      // q34 face anchor col 7 + half a 20-px face = 17: the chin sits toward the facing (screen-right).
      expect(px[0]).toBeGreaterThan(17);
    });

    const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));
    it('has one smooth facing-side contour: from eye level down it never steps out and steps in by ≤ 1 px per row', () => {
      // Eye rows start at the q34 face anchor row 12 + the eye part's y 3.
      const rights = q34.head.mask.slice(15).map((r) => Math.max(...skinCols(r)));
      for (let k = 1; k < rights.length; k++) {
        const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
        expect(step, `row ${String(15 + k)}`).toBeGreaterThanOrEqual(0);
        expect(step, `row ${String(15 + k)}`).toBeLessThanOrEqual(1);
      }
    });

    it('keeps the q34 skin no wider than the front skin', () => {
      const width = (mask: Mask): number =>
        Math.max(
          ...mask
            .map((r) => skinCols(r))
            .filter((c) => c.length > 0)
            .map((c) => Math.max(...c) - Math.min(...c) + 1),
        );
      expect(width(q34.head.mask)).toBeLessThanOrEqual(width(HEAD));
    });

    it('has a q34 face library of exactly neutral + blink with no px on hair or outside the head', () => {
      expect(Object.keys(q34.face.expressions).sort()).toEqual([...Q34_EXPRESSIONS].sort());
      expect(validateFace(q34.face, 'maid/q34', { mask: q34.head.mask, faceAt: [7, 12] }, Q34_EXPRESSIONS)).toEqual([]);
    });

    it('draws the far eye 1 px narrower than the near eye', () => {
      const open = q34.face.eyes[q34.face.expressions.neutral?.eyes ?? '']?.mask ?? [];
      const width = (from: number, to: number): number => {
        const cols = new Set<number>();
        for (const row of open)
          for (let x = from; x < Math.min(to, row.length); x++) if (row.charAt(x) !== '.') cols.add(x);
        return cols.size;
      };
      expect(width(0, 10)).toBeGreaterThan(0);
      expect(width(10, 20)).toBe(width(0, 10) - 1);
    });

    it('trails apron ties behind the waist (screen-left of the hip) and paints them on q34 frames', () => {
      const ap = q34.apron;
      if (!ap?.ties) throw new Error('no q34 apron ties');
      const r = createRigRenderer(MAID);
      const noTies: Body = { ...MAID, views: { q34: { ...q34, apron: { bib: ap.bib, panelW: ap.panelW } } } };
      const walk = anim('walk');
      expect(same(r.render(walk, 0, ctx), createRigRenderer(noTies).render(walk, 0, ctx))).toBe(false);
    });

    describe('q34 composer passes (MA-27d review)', () => {
      const walk = anim('walk');
      const rampSet = (name: string): ReadonlySet<number> => new Set(palette.ramps.get(name) ?? []);
      const cream = rampSet(MAID.outfit.apron.ramp);
      const lilac = rampSet(MAID.outfit.hair.ramp);
      const rgb = (img: RgbaImage, x: number, y: number): number => {
        if (x < 0 || y < 0 || x >= img.width || y >= img.height) return -1;
        const i = (y * img.width + x) * 4;
        if (!img.data[i + 3]) return -1;
        return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
      };
      const label = (img: RgbaImage, x: number, y: number): number =>
        x < 0 || y < 0 || x >= img.width || y >= img.height ? -1 : (img.data[(y * img.width + x) * 4] ?? -1);
      const n4 = (x: number, y: number): [number, number][] => [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      const tieBox = (f: number): { x0: number; y0: number; x1: number; y1: number } => {
        const ties = q34.apron?.ties;
        if (!ties) throw new Error('no ties');
        const hip = createRigRenderer(MAID).joints(walk, f).hip;
        const x0 = Math.round(hip[0] + ties.at[0]);
        const y0 = Math.round(hip[1] + ties.at[1]);
        return { x0, y0, x1: x0 + (ties.mask[0]?.length ?? 0) - 1, y1: y0 + ties.mask.length - 1 };
      };

      it('never paints ties over the near hand, and the hand gets a skin-tone-1 edge against them', () => {
        const r = createRigRenderer(MAID);
        const skinDark = palette.ramps.get(MAID.outfit.skin.ramp)?.[MAID.outfit.skin.tones[1]];
        let handInBox = 0;
        let edged = 0;
        const ties = q34.apron?.ties;
        if (!ties) throw new Error('no ties');
        for (const f of [0, 1]) {
          const { image, labels } = r.renderLabeled(walk, f, ctx);
          const b = tieBox(f);
          for (let y = b.y0; y <= b.y1; y++) {
            for (let x = b.x0; x <= b.x1; x++) {
              if (label(labels, x, y) !== ARM_LABEL.endL) continue;
              handInBox++;
              expect(cream.has(rgb(image, x, y)), `hand px ${String(x)},${String(y)} has a tie tone`).toBe(false);
              // A tie px = a non-empty px of the ties mask that still shows a cream tone (not the outline around it).
              const tiePx = ([u, v]: [number, number]): boolean =>
                u >= b.x0 && (ties.mask[v - b.y0]?.charAt(u - b.x0) || '.') !== '.' && cream.has(rgb(image, u, v));
              if (n4(x, y).some(tiePx)) {
                if (rgb(image, x, y) === skinDark) edged++;
              }
            }
          }
        }
        expect(handInBox).toBeGreaterThan(0);
        expect(edged).toBeGreaterThan(0);
      });

      it('stampMask paints only px whose part the filter allows and returns them', () => {
        const buf = createIndexBuffer(3, 1, palette);
        buf.partId[1] = 9;
        const locked = new Map<number, readonly [number, number]>();
        const written = stampMask(buf, MAID, ['sss'], 0, 0, 1, 0, locked, { allow: (id) => id !== 9 });
        expect(written).toEqual([0, 2]);
        expect([...locked.keys()]).toEqual([0, 2]);
        expect(buf.ramp[1]).toBeLessThan(0);
        expect(buf.ramp[0]).toBeGreaterThanOrEqual(0);
      });

      it('lines hair next to the near sleeve in the opt-in ramp (no lilac px touch the near sleeve)', () => {
        const r = createRigRenderer(MAID);
        const line = q34.sleeveHairLine;
        if (!line) throw new Error('maid opts in to sleeveHairLine');
        const tone = palette.ramps.get(line)?.[1];
        let lined = 0;
        walk.frames.forEach((_, f) => {
          const { image, labels } = r.renderLabeled(walk, f, ctx);
          for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
              if (label(labels, x, y) !== ARM_LABEL.sleeveL) continue;
              for (const [u, v] of n4(x, y)) {
                if (label(labels, u, v) !== ARM_LABEL.none) continue;
                expect(lilac.has(rgb(image, u, v)), `walk/${String(f)} lilac at ${String(u)},${String(v)}`).toBe(false);
                if (rgb(image, u, v) === tone) lined++;
              }
            }
          }
        });
        expect(lined).toBeGreaterThan(0);
      });

      it('hairFar tucks the back hair off the under-chin area; hideFarShoulder clears the far puff', () => {
        const { hairFar, ...noFarMasks } = q34.masks;
        expect(hairFar).toBeDefined();
        const noFar: Body = { ...MAID, views: { q34: { ...q34, masks: noFarMasks } } };
        const { hideFarShoulder, ...noClipView } = q34;
        expect(hideFarShoulder).toBe(true);
        const noClip: Body = { ...MAID, views: { q34: noClipView } };
        // Under the chin (chin col = head + 6), 1–3 rows below it; the far lock's point lies further right.
        const underChinHair = (body: Body): number => {
          const r = createRigRenderer(body);
          const head = r.joints(walk, 0).head;
          const img = r.render(walk, 0, ctx);
          let n = 0;
          for (let y = Math.round(head[1]) + 13; y <= Math.round(head[1]) + 15; y++)
            for (let x = Math.round(head[0]); x <= Math.round(head[0]) + 6; x++) if (lilac.has(rgb(img, x, y))) n++;
          return n;
        };
        expect(underChinHair(MAID)).toBe(0);
        expect(underChinHair(noFar)).toBeGreaterThan(0);
        const farPuff = (body: Body): number => {
          const r = createRigRenderer(body);
          const top = Math.round(r.joints(walk, 2).shoulderR[1] + 2);
          const { labels } = r.renderLabeled(walk, 2, ctx);
          let n = 0;
          for (let y = 0; y <= top; y++)
            for (let x = 0; x < labels.width; x++) if (label(labels, x, y) === ARM_LABEL.sleeveR) n++;
          return n;
        };
        expect(farPuff(MAID)).toBe(0);
        expect(farPuff(noClip)).toBeGreaterThan(0);
      });
    });
  });
});
