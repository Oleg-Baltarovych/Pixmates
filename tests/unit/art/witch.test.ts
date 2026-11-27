// M-ART MA-29a: the `pixmates.witch` pack gates — build, headroom, faces per view, arm-over-torso contrast — and the
// design-spec checks labelled "art gate (witch.md)": the moss ramp (R-W4), the hat (headroom, short tip with a notch,
// R-W3 droop never above rest, tonal band), downturned lashes, the vial as the only rose besides the blush, visible
// hands, the q34 contour and near-lock rules. Positions come from masks and joints, not hard-coded frame numbers.
import { describe, expect, it } from 'vitest';
import { createWitchPack, WITCH } from '../../../assets-src/characters/witch/body.ts';
import { WITCH_FACE } from '../../../assets-src/characters/witch/face.ts';
import {
  HAT,
  HAT_Q34,
  HAT_Q34_RISING,
  HAT_RISING,
  HEAD,
  HEAD_Q34,
  VIAL,
  VIAL_Q34,
} from '../../../assets-src/characters/witch/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { frame as poseFrame } from '../../../assets-src/rig/anims/kit.ts';
import { FIGURE_H, resolveJoints } from '../../../assets-src/rig/body.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer, headViewOf, RIG_H } from '../../../assets-src/rig/compose.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace } from '../../../assets-src/rig/face.ts';
import { deriveQ34Head } from '../../../assets-src/rig/q34.ts';
import type { RigAnim, View } from '../../../assets-src/rig/types.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const q34 = WITCH.views?.q34;
if (!q34) throw new Error('witch has no q34 view');
const built = buildPack(createWitchPack(), ctx);
const renderer = createRigRenderer(WITCH);
const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
const rgbAt = (data: Uint8Array, i: number): number =>
  ((data[i * 4] ?? 0) << 16) | ((data[i * 4 + 1] ?? 0) << 8) | (data[i * 4 + 2] ?? 0);
type Img = { width: number; height: number; data: Uint8Array };
const allFrames = (): { a: RigAnim; f: number; img: Img }[] =>
  ANIMS.flatMap((a) => (built.frames.get(a.name) ?? []).map((img, f) => ({ a, f, img })));
const frameOf = (name: string, f: number): Img => {
  const img = built.frames.get(name)?.[f];
  if (!img) throw new Error(`${name}/${String(f)}`);
  return img;
};
/** Top-left of the frame's head mask after the waist squash (moves rows above the cut). */
const headOrigin = (a: RigAnim, f: number): [number, number] => {
  const j = renderer.joints(a, f);
  const [ax, ay] = (headViewOf(a, f) === 'q34' ? q34.head : WITCH.head).at;
  const squash = a.frames[f]?.squash ?? 0;
  return [Math.round(j.head[0] + ax), Math.round(j.head[1] + ay) + squash];
};
const faceAtOf = (view: View): [number, number] => {
  const head = view === 'q34' ? q34.head : WITCH.head;
  const rest = resolveJoints(WITCH, poseFrame({}), RIG_H, view);
  return [rest.face[0] - (rest.head[0] + head.at[0]), rest.face[1] - (rest.head[1] + head.at[1])];
};
const FACE_AT = faceAtOf('front');
const FACE_AT_Q34 = faceAtOf('q34');
const OPEN_EYES = WITCH_FACE.eyes.open;
if (!OPEN_EYES) throw new Error('witch has no open eyes');
/** Head-mask row of the open-eye lash (the eye part's first ink row). */
const LASH_ROW = FACE_AT[1] + OPEN_EYES.at[1] + OPEN_EYES.mask.findIndex((row) => row.includes('X'));
const hue = (rgb: number): number => {
  const [, a, b] = toOklab(rgb);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
};
const hueDist = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const px = (mask: Mask): [number, number][] =>
  mask.flatMap((row, y) => row.split('').flatMap((ch, x) => (LEGEND[ch] ? [[x, y] as [number, number]] : [])));

describe('pixmates.witch pack', () => {
  const m = manifestSchema.parse(built.manifest);

  it('builds all shared animations at 48 × 56 within 1024², walk/turn facing right, deterministically', () => {
    expect(m.id).toBe('pixmates.witch');
    expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(facingOf(m.animations['turn'] ?? {})).toBe('right');
    expect(facingOf(m.animations['idle_a'] ?? {})).toBe('front');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(built.atlasSize.width).toBeLessThanOrEqual(1024);
    expect(built.atlasSize.height).toBeLessThanOrEqual(1024);
    expect(buildPack(createWitchPack(), ctx).sha256).toBe(built.sha256);
  });

  it('has authored heads (not the derived q34 stand-in), 30 px wide', () => {
    expect(HEAD.every((r) => r.length === 30)).toBe(true);
    expect(HEAD_Q34.every((r) => r.length === 30)).toBe(true);
    expect(HEAD_Q34).not.toEqual(deriveQ34Head(HEAD));
  });

  it('passes the face validator per view: all front expressions, q34 neutral + blink', () => {
    expect(Object.keys(WITCH_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(WITCH_FACE, 'witch', { mask: HEAD, faceAt: FACE_AT })).toEqual([]);
    expect(Object.keys(q34.face.expressions).sort()).toEqual([...Q34_EXPRESSIONS].sort());
    expect(validateFace(q34.face, 'witch/q34', { mask: HEAD_Q34, faceAt: FACE_AT_Q34 }, Q34_EXPRESSIONS)).toEqual([]);
  });

  it('passes the arm-over-torso contrast gate on every frame (0 FAIL)', () => {
    const deepest = deepestTones(palette);
    const problems: string[] = [];
    for (const a of ANIMS) {
      a.frames.forEach((_, f) => {
        const { image, labels } = renderer.renderLabeled(a, f, ctx);
        const opts = bodyViewOf(a, f) === 'q34' ? { far: 'R' as const } : undefined;
        for (const p of armTorsoProblems(armTorsoContrast(image, labels, deepest), opts))
          problems.push(`${a.name}/${String(f)}: ${p}`);
      });
    }
    expect(problems).toEqual([]);
  });
});

describe('art gate (witch.md): cloth_moss ramp (R-W4)', () => {
  const moss = ramp('cloth_moss');
  it('has no #000, L rising monotonically and ≥ 15° hue drift', () => {
    // Enough steps for every outfit tone that maps onto it (behavioural, not a pinned palette size).
    const used = Object.values(WITCH.outfit)
      .filter((sw) => sw.ramp === 'cloth_moss')
      .flatMap((sw) => [...sw.tones]);
    expect(moss.length).toBeGreaterThan(Math.max(0, ...used));
    expect(moss).not.toContain(0);
    const ls = moss.map((c) => toOklab(c)[0]);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThan(ls[i - 1] ?? 1);
    expect(hueDist(hue(moss[0] ?? 0), hue(moss[moss.length - 1] ?? 0))).toBeGreaterThanOrEqual(15);
  });
  it('stays ≥ 60° in hue from cloth_teal at every matching step', () => {
    const teal = ramp('cloth_teal');
    moss.forEach((c, i) => {
      const t = teal[i];
      if (t !== undefined) expect(hueDist(hue(c), hue(t)), `step ${String(i)}`).toBeGreaterThanOrEqual(60);
    });
  });
});

describe('art gate (witch.md): the hat', () => {
  /** Rest top of the hat in figure rows, per view (acc joint + placement). */
  const hatTop = (view: View): number => {
    const acc = (view === 'q34' ? q34.masks.headAcc : WITCH.masks.headAcc)?.at ?? [0, 0];
    return Math.round(resolveJoints(WITCH, poseFrame({}), RIG_H, view).acc[1] + acc[1]) - (RIG_H - FIGURE_H);
  };
  it('sits with its top px at figure row −1 at rest in both views (outline −2; the highest pose lifts 3)', () => {
    expect(hatTop('front')).toBe(-1);
    expect(hatTop('q34')).toBe(-1);
    for (const mask of [HAT, HAT_Q34]) expect((mask[0] ?? '').replace(/\./g, '').length).toBeGreaterThan(0);
  });
  it('keeps frame rows 0–2 clear on every frame', () => {
    for (const { a, f, img } of allFrames()) {
      for (let i = 0; i < img.width * 3; i++) expect(img.data[i * 4 + 3], `${a.name}/${String(f)}`).toBe(0);
    }
  });

  /** The tip: px above the band row beyond the band's end on the tip side (front: right, q34: left). */
  const tipOf = (mask: Mask, side: 1 | -1) => {
    const widths = mask.map((r) => r.replace(/\.+$/, '').replace(/^\.+/, '').length);
    // The brim: the first row at least (widest − 4) px wide; the band is the row above it.
    const brim = widths.findIndex((w) => w >= Math.max(...widths) - 4);
    const bandRow = brim - 1;
    const band = px(mask).filter(([, y]) => y === bandRow);
    const end = side === 1 ? Math.max(...band.map(([x]) => x)) : Math.min(...band.map(([x]) => x));
    const tip = px(mask).filter(([x, y]) => y < bandRow && (x - end) * side > 0);
    return { brim, bandRow, end, tip, len: Math.max(...tip.map(([x]) => (x - end) * side)) };
  };
  it.each([
    ['front', HAT, HAT_RISING, 1],
    ['q34', HAT_Q34, HAT_Q34_RISING, -1],
  ] as const)(
    '%s: short bent tip — ≤ 4 px past the cone, above the brim, a transparent notch',
    (_, rest, rising, side) => {
      for (const mask of [rest, rising]) {
        const { brim, tip, len } = tipOf(mask, side);
        expect(tip.length).toBeGreaterThan(0);
        expect(len).toBeLessThanOrEqual(4);
        for (const [, y] of tip) expect(y).toBeLessThan(brim);
        // Notch: on the tip's lowest row a transparent px separates the tip from the cone.
        const low = Math.max(...tip.map(([, y]) => y));
        const row = mask[low] ?? '';
        const tipX = tip.filter(([, y]) => y === low).map(([x]) => x);
        const near = side === 1 ? Math.min(...tipX) : Math.max(...tipX);
        expect(row.charAt(near - side)).toBe('.');
      }
    },
  );
  it.each([
    ['front', HAT, HAT_RISING, 1],
    ['q34', HAT_Q34, HAT_Q34_RISING, -1],
  ] as const)(
    '%s R-W3: the rising tip droops exactly 1 row, never above rest; the rest of the hat is unchanged',
    (_, rest, rising, side) => {
      const a = tipOf(rest, side);
      const b = tipOf(rising, side);
      expect(Math.min(...b.tip.map(([, y]) => y))).toBeGreaterThanOrEqual(Math.min(...a.tip.map(([, y]) => y)));
      expect(Math.max(...b.tip.map(([, y]) => y))).toBe(Math.max(...a.tip.map(([, y]) => y)) + 1);
      expect(rising.slice(a.bandRow)).toEqual(rest.slice(a.bandRow));
      expect(rising.map((r) => r.length)).toEqual(rest.map((r) => r.length));
    },
  );
  it.each([
    ['front', HAT],
    ['q34', HAT_Q34],
  ] as const)('%s: no coloured band — band and brim are moss only; one ochre ember px, no other trim', (_, mask) => {
    const { bandRow } = tipOf(mask, mask === HAT ? 1 : -1);
    for (const row of mask.slice(bandRow)) {
      for (const ch of row.replace(/\./g, '')) expect(slotOf(ch)).toBe('dress');
    }
    const slots = mask.join('').replace(/\./g, '').split('').map(slotOf);
    expect(slots.filter((s) => s === 'trim')).toHaveLength(1);
    expect(new Set(slots)).toEqual(new Set(['dress', 'apron', 'horn', 'trim']));
    expect(WITCH.outfit.dress.ramp).toBe('cloth_moss');
  });
});

describe('art gate (witch.md): face', () => {
  /** Ink px of the screen-left eye; outer = leftmost, inner = rightmost ink column, each at its lowest/highest row. */
  const lashEnds = (mask: Mask): { outer: number; inner: number } => {
    const ink: [number, number][] = [];
    const half = Math.max(...mask.map((row) => row.length)) >> 1;
    mask.forEach((row, y) => {
      for (let x = 0; x < half; x++) if ('Xx'.includes(row.charAt(x)) && y < 3) ink.push([x, y]);
    });
    const outerX = Math.min(...ink.map(([x]) => x));
    const innerX = Math.max(...ink.map(([x]) => x));
    const rowAt = (cx: number): number => Math.min(...ink.filter(([x]) => x === cx).map(([, y]) => y));
    return { outer: rowAt(outerX), inner: rowAt(innerX) };
  };
  it.each([
    ['front', WITCH_FACE.eyes.open?.mask ?? []],
    ['q34', q34.face.eyes.open?.mask ?? []],
  ] as const)('%s open: the lash outer end sits lower than its inner end (tare-me)', (_, mask) => {
    const { outer, inner } = lashEnds(mask);
    expect(outer).toBeGreaterThan(inner);
  });
});

describe('art gate (witch.md): rose, hands', () => {
  it('keeps the vial the only rose px apart from the face blush/tongue, and shows 2–3 rose px of potion at rest', () => {
    const rose = new Set(ramp(WITCH.outfit.blush.ramp));
    for (const r of Object.values(WITCH.ramps)) expect(r).not.toBe(WITCH.outfit.blush.ramp);
    for (const { a, f, img } of allFrames()) {
      const q = bodyViewOf(a, f) === 'q34';
      const knot = q ? q34.sashKnot : WITCH.sash?.knot;
      const vial = q ? VIAL_Q34 : VIAL;
      const j = renderer.joints(a, f);
      const kx = Math.round(j.hip[0] + (knot?.at[0] ?? 0));
      const ky = Math.round(j.hip[1] + (knot?.at[1] ?? 0));
      const [hx, hy] = headOrigin(a, f);
      const head = headViewOf(a, f) === 'q34' ? HEAD_Q34 : HEAD;
      for (let i = 0; i < img.width * img.height; i++) {
        if (!img.data[i * 4 + 3] || !rose.has(rgbAt(img.data, i))) continue;
        const x = i % img.width;
        const y = Math.floor(i / img.width);
        const inVial = x >= kx && x < kx + (vial[0]?.length ?? 0) && y >= ky && y < ky + vial.length;
        const inFace = x >= hx && x < hx + 30 && y >= hy + LASH_ROW && y < hy + head.length;
        expect(inVial || inFace, `${a.name}/${String(f)} rose px (${String(x)}, ${String(y)})`).toBe(true);
      }
    }
    const idle = frameOf('idle_a', 0);
    const j = renderer.joints(anim('idle_a'), 0);
    const at = WITCH.sash?.knot.at ?? [0, 0];
    const [kx, ky] = [Math.round(j.hip[0] + at[0]), Math.round(j.hip[1] + at[1])];
    let potion = 0;
    for (let y = ky; y < ky + VIAL.length; y++)
      for (let x = kx; x < kx + 3; x++) if (rose.has(rgbAt(idle.data, y * idle.width + x))) potion++;
    expect(potion).toBeGreaterThanOrEqual(2);
    expect(potion).toBeLessThanOrEqual(3);
  });

  it.each(['happy', 'wave'])('%s: every raised hand keeps ≥ 2 skin px (never lost under the brim)', (name) => {
    const a = anim(name);
    const skin = new Set(ramp(WITCH.outfit.skin.ramp));
    a.frames.forEach((p, f) => {
      const { image, labels } = renderer.renderLabeled(a, f, ctx);
      for (const [label, arm] of [
        [ARM_LABEL.endL, p.parts.armL],
        [ARM_LABEL.endR, p.parts.armR],
      ] as const) {
        if (arm === 'down') continue;
        let hand = 0;
        for (let i = 0; i < image.width * image.height; i++) {
          if (labels.data[i * 4 + 3] && labels.data[i * 4] === label && skin.has(rgbAt(image.data, i))) hand++;
        }
        expect(hand, `${name}/${String(f)} ${arm}`).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

describe('art gate (witch.md): q34 contour, brim and near lock (RIG.md owner rules)', () => {
  const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));

  it('tapers the facing-side contour monotonically from the eye row to a 1-px chin point', () => {
    const rights = HEAD_Q34.slice(LASH_ROW).map((r) => Math.max(...skinCols(r)));
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeLessThanOrEqual(1);
    }
    const last = skinCols(HEAD_Q34[HEAD_Q34.length - 1] ?? '');
    expect(last).toHaveLength(1);
    const eyeBand = Math.max(...(q34.face.eyes.open?.mask ?? []).map((row) => row.length));
    expect(last[0]).toBeGreaterThan(FACE_AT_Q34[0] + (eyeBand >> 1));
  });

  it('keeps the q34 skin no wider than the front skin', () => {
    const width = (mask: Mask): number =>
      Math.max(
        ...mask
          .map(skinCols)
          .filter((c) => c.length > 0)
          .map((c) => Math.max(...c) - Math.min(...c) + 1),
      );
    expect(width(HEAD_Q34)).toBeLessThanOrEqual(width(HEAD));
  });

  it('q34 walk: the head incl. the brim overhangs the torso front by ≤ its back overhang + 4 px', () => {
    const walk = anim('walk');
    const hatAt = q34.masks.headAcc?.at ?? [0, 0];
    walk.frames.forEach((_, f) => {
      const j = renderer.joints(walk, f);
      const { image, labels } = renderer.renderLabeled(walk, f, ctx);
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
      const brimBottom = Math.round(j.acc[1] + hatAt[1]) + HAT_Q34.length - 1;
      const head = ext(brimBottom - 2, Math.round(j.head[1]) + 10, false);
      const torso = ext(Math.round(j.hip[1]) - 9, Math.round(j.hip[1]) - 1, true);
      expect(head[1] - torso[1], `walk/${String(f)}`).toBeLessThanOrEqual(torso[0] - head[0] + 4);
    });
  });

  it('runs the near lock 2 px wide from the eye row down, never widening (no ear-height bulge)', () => {
    const widths = HEAD_Q34.slice(LASH_ROW).flatMap((row) => {
      const first = skinCols(row)[0];
      if (first === undefined) return [];
      return [
        row
          .slice(0, first)
          .split('')
          .filter((ch) => slotOf(ch) === 'hair').length,
      ];
    });
    expect(Math.max(...widths)).toBe(2);
    for (let k = 1; k < widths.length; k++) expect(widths[k]).toBeLessThanOrEqual(widths[k - 1] ?? 0);
  });

  it('no cup under the brim: the rendered back contour never steps out between the brim and the chin', () => {
    const turn = anim('turn');
    const f = turn.frames.findIndex((p, i) => bodyViewOf(turn, i) === 'q34' && headViewOf(turn, i) === 'q34' && p);
    const img = frameOf('turn', f);
    const j = renderer.joints(turn, f);
    const hatAt = q34.masks.headAcc?.at ?? [0, 0];
    const below = Math.round(j.acc[1] + hatAt[1]) + HAT_Q34.length;
    // Down to the chin, or to the row above the first clump-tip flick (`hairBackCuts`, checked below).
    const cuts = q34.hairBackCuts?.rows ?? [];
    const chin = Math.min(headOrigin(turn, f)[1] + HEAD_Q34.length - 1, Math.round(j.head[1]) + Math.min(...cuts) - 2);
    const left: number[] = [];
    for (let y = below; y <= chin; y++) {
      let x = 0;
      while (x < img.width && !img.data[(y * img.width + x) * 4 + 3]) x++;
      left.push(x);
    }
    for (let k = 1; k < left.length; k++)
      expect(left[k], `row ${String(below + k)}`).toBeGreaterThanOrEqual(left[k - 1] ?? 0);
  });
});

describe('art gate (witch.md): q34 back hair clump tips and far contour (art round 1)', () => {
  const turn = anim('turn');
  const f = turn.frames.findIndex((_, i) => bodyViewOf(turn, i) === 'q34' && headViewOf(turn, i) === 'q34');
  const img = frameOf('turn', f);
  const j = renderer.joints(turn, f);
  const firstX = (y: number): number => {
    let x = 0;
    while (x < img.width && !img.data[(y * img.width + x) * 4 + 3]) x++;
    return x;
  };
  const lastX = (y: number): number => {
    let x = img.width - 1;
    while (x >= 0 && !img.data[(y * img.width + x) * 4 + 3]) x--;
    return x;
  };
  it('cuts each listed row 1 px into the back edge with a 1-px outward flick on the row above', () => {
    const rows = q34.hairBackCuts?.rows ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const r of rows) {
      const y = Math.round(j.head[1]) + r;
      // The outline under the flick px fills the cleared edge px, so the cut row sits back at (or inside) the edge.
      expect(firstX(y), `row ${String(y)}`).toBeGreaterThanOrEqual(firstX(y - 2));
      expect(firstX(y - 1), `row ${String(y - 1)}`).toBeLessThan(firstX(y - 2));
    }
  });
  it('no bump at ear height: the facing-side contour never steps out from under the brim to the chin', () => {
    const hatAt = q34.masks.headAcc?.at ?? [0, 0];
    const below = Math.round(j.acc[1] + hatAt[1]) + HAT_Q34.length;
    const chin = headOrigin(turn, f)[1] + HEAD_Q34.length - 1;
    for (let y = below + 1; y <= chin; y++) expect(lastX(y), `row ${String(y)}`).toBeLessThanOrEqual(lastX(y - 1));
  });
});

describe('art gate (witch.md): vial clear of the hands (art round 1)', () => {
  /** Vial px (frame coords) of a frame, from the knot placement and mask. */
  const vialPx = (a: RigAnim, f: number): [number, number][] => {
    const q = bodyViewOf(a, f) === 'q34';
    const knot = q ? q34.sashKnot : WITCH.sash?.knot;
    const j = renderer.joints(a, f);
    const [kx, ky] = [Math.round(j.hip[0] + (knot?.at[0] ?? 0)), Math.round(j.hip[1] + (knot?.at[1] ?? 0))];
    return px(q ? VIAL_Q34 : VIAL).map(([x, y]) => [kx + x, ky + y]);
  };
  /** Smallest Chebyshev distance between a near-hand (arm end L) px and a vial px. */
  const gap = (a: RigAnim, f: number): number => {
    const { labels } = renderer.renderLabeled(a, f, ctx);
    const vial = vialPx(a, f);
    let best = Infinity;
    for (let i = 0; i < labels.width * labels.height; i++) {
      if (!labels.data[i * 4 + 3] || labels.data[i * 4] !== ARM_LABEL.endL) continue;
      const [x, y] = [i % labels.width, Math.floor(i / labels.width)];
      for (const [vx, vy] of vial) best = Math.min(best, Math.max(Math.abs(vx - x), Math.abs(vy - y)));
    }
    return best;
  };
  it('front rest: the glass starts at x ≥ 20 with ≥ 1 px of moss between it and the hand', () => {
    const vial = vialPx(anim('idle_a'), 0);
    expect(Math.min(...vial.map(([x]) => x))).toBeGreaterThanOrEqual(20);
    expect(gap(anim('idle_a'), 0)).toBeGreaterThanOrEqual(2);
  });
  /** q34 walk frames with the near arm hanging down beside the vial (derived from the pose, not pinned). */
  const forward = anim('walk').frames.flatMap((p, f) => (p.parts.armL === 'down' ? [f] : []));
  it('q34 walk: the near hand keeps ≥ 2 empty px to the vial (Chebyshev gap ≥ 3) on the arm-down frames', () => {
    expect(forward.length).toBeGreaterThan(0);
    for (const f of forward) expect(gap(anim('walk'), f), `walk/${String(f)}`).toBeGreaterThanOrEqual(3);
  });
});

describe('art gate (witch.md): q34 pout corner (art round 2, rendered)', () => {
  /** The first frame of walk and of turn whose head is q34 with the pout mouth (derived, not pinned). */
  const poutFrames = (['walk', 'turn'] as const).flatMap((name) => {
    const a = anim(name);
    const f = a.frames.findIndex(
      (p, i) => headViewOf(a, i) === 'q34' && q34.face.expressions[p.face]?.mouth === 'pout',
    );
    return f < 0 ? [] : [[name, f] as const];
  });
  it('finds a q34 pout frame in walk and turn', () => {
    expect(poutFrames.map(([n]) => n)).toEqual(['walk', 'turn']);
  });
  it.each(poutFrames)('%s f%i: the skin-shade low corner sits screen-left of the XX, one row under it', (name, f) => {
    const a = anim(name);
    const img = frameOf(name, f);
    const [hx, hy] = headOrigin(a, f);
    const mouth = q34.face.mouths['pout'];
    if (!mouth) throw new Error('no q34 pout');
    // The XX row of the mouth in frame px: face anchor + part offset + the mask's ink row.
    const y = hy + FACE_AT_Q34[1] + mouth.at[1] + mouth.mask.findIndex((r) => r.includes('XX'));
    const ink = new Set(ramp(WITCH.outfit.ink.ramp));
    const xs: number[] = [];
    for (let x = hx; x < hx + 30; x++) if (ink.has(rgbAt(img.data, y * img.width + x))) xs.push(x);
    expect(xs).toHaveLength(2);
    const skin = ramp(WITCH.outfit.skin.ramp);
    const corner = skin[WITCH.outfit.skin.tones[1]] ?? -1;
    const left = Math.min(...xs) - 1;
    const right = Math.max(...xs) + 1;
    expect(rgbAt(img.data, (y + 1) * img.width + left)).toBe(corner);
    expect(rgbAt(img.data, (y + 1) * img.width + right)).not.toBe(corner);
  });
});
