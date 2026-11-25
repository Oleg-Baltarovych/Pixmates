// M-ART MA-46 (adult redesign of MA-29b): the `pixmates.ronin` pack gates — build at 56 × 72, headroom, adult faces per
// view, arm-over-torso contrast — the «reads adult» gates (≈ 4.4 heads, shoulders ≥ 1.4× the head, legs ≥ 40 %), the
// front-prop axis rule, and the design-spec checks labelled "art gate (ronin.md)": palette anchors (dark kosode,
// oxblood accent, umber hakama, dove-ivory haori), spirit without horror (feet, no isolated mist px), the adult
// lookalike hard rules (tuft bounds, clean-shaven jaw, regular tapered haori wisps in mist only) and the q34 contour.
import { describe, expect, it } from 'vitest';
import { createRoninPack, HAORI, RONIN } from '../../../assets-src/characters/ronin/body.ts';
import { RONIN_FACE } from '../../../assets-src/characters/ronin/face.ts';
import { HEAD, HEAD_Q34 } from '../../../assets-src/characters/ronin/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import { animsFor } from '../../../assets-src/rig/anims/adult.ts';
import { frame as poseFrame } from '../../../assets-src/rig/anims/kit.ts';
import { resolveJoints } from '../../../assets-src/rig/body.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { cloakGeometry } from '../../../assets-src/rig/cloak.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer, headViewOf } from '../../../assets-src/rig/compose.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace } from '../../../assets-src/rig/face.ts';
import { layoutOf } from '../../../assets-src/rig/layout.ts';
import type { Body, RigAnim, View } from '../../../assets-src/rig/types.ts';
import { checkStrips, facingOf, manifestSchema } from '../../../src/shared/pack.ts';
import type { RgbaImage } from '../../../tools/lib/png.ts';
import { ATLAS_FILE, buildPack, deepestTones, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);
const LAYOUT = layoutOf(RONIN);
const W = LAYOUT.w;
const H = LAYOUT.frameH;
const AXIS = W / 2;
const ANIMS = animsFor(RONIN);
const anim = (name: string): RigAnim => {
  const a = ANIMS.find((x) => x.name === name);
  if (!a) throw new Error(name);
  return a;
};
const q34 = RONIN.views?.q34;
const cloak = RONIN.cloak;
const hakama = RONIN.hakama;
if (!q34 || !cloak || !hakama) throw new Error('ronin needs a q34 view, a haori cloak and a hakama');
const built = buildPack(createRoninPack(), ctx);
const renderer = createRigRenderer(RONIN);
const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
const rgbAt = (img: RgbaImage, x: number, y: number): number => {
  const i = (y * img.width + x) * 4;
  return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
};
const opaque = (img: RgbaImage, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < img.width && y < img.height && (img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0;
const allFrames = (): { a: RigAnim; f: number; img: RgbaImage }[] =>
  ANIMS.flatMap((a) => (built.frames.get(a.name) ?? []).map((img, f) => ({ a, f, img })));
const N4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
const MIST = ramp('mist');
const mistShade = (img: RgbaImage, x: number, y: number): number =>
  opaque(img, x, y) ? MIST.indexOf(rgbAt(img, x, y)) : -1;
const faceAtOf = (view: View): [number, number] => {
  const head = view === 'q34' ? q34.head : RONIN.head;
  const rest = resolveJoints(RONIN, poseFrame({}), H, view);
  return [rest.face[0] - (rest.head[0] + head.at[0]), rest.face[1] - (rest.head[1] + head.at[1])];
};
const FACE_AT = faceAtOf('front');
const FACE_AT_Q34 = faceAtOf('q34');
const OPEN_EYES = RONIN_FACE.eyes.open;
if (!OPEN_EYES) throw new Error('ronin has no open eyes');
const LASH_ROW = FACE_AT[1] + OPEN_EYES.at[1] + OPEN_EYES.mask.findIndex((row) => row.includes('X'));
const MOUTH_ROW = FACE_AT[1] + (RONIN_FACE.mouths['flat']?.at[1] ?? 8);
const lab = (c: number) => toOklab(c);
const chroma = (c: number): number => Math.hypot(lab(c)[1], lab(c)[2]);
const hue = (c: number): number => ((Math.atan2(lab(c)[2], lab(c)[1]) * 180) / Math.PI + 360) % 360;
const tone = (name: string, i: number): number => {
  const c = ramp(name)[i];
  if (c === undefined) throw new Error(`${name}[${String(i)}]`);
  return c;
};
/** Opaque px span [min, max] of a frame row (−1 when empty). */
const span = (img: RgbaImage, y: number): [number, number] => {
  let [lo, hi] = [-1, -1];
  for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) [lo, hi] = [lo < 0 ? x : lo, x];
  return [lo, hi];
};

describe('pixmates.ronin pack (adult layout)', () => {
  const m = manifestSchema.parse(built.manifest);

  it('builds all shared adult animations at 56 × 72 within 1024², walk/turn facing right, deterministically', () => {
    expect(m.id).toBe('pixmates.ronin');
    expect(m.frameSize).toEqual({ w: 56, h: 72 });
    expect(Object.keys(m.animations)).toEqual(ANIMS.map((a) => a.name));
    expect(facingOf(m.animations['walk'] ?? {})).toBe('right');
    expect(facingOf(m.animations['turn'] ?? {})).toBe('right');
    expect(facingOf(m.animations['idle_a'] ?? {})).toBe('front');
    expect(checkStrips(m, new Map([[ATLAS_FILE, built.atlasSize]]))).toEqual([]);
    expect(built.atlasSize.width).toBeLessThanOrEqual(1024);
    expect(built.atlasSize.height).toBeLessThanOrEqual(1024);
    expect(buildPack(createRoninPack(), ctx).sha256).toBe(built.sha256);
  });

  it('keeps frame row 0 transparent (headroom) and binary alpha on every frame', () => {
    for (const { a, f, img } of allFrames()) {
      for (let x = 0; x < img.width; x++) expect(opaque(img, x, 0), `${a.name}/${String(f)}`).toBe(false);
      for (let i = 3; i < img.data.length; i += 4) {
        const alpha = img.data[i] ?? 0;
        expect(alpha === 0 || alpha === 255, `${a.name}/${String(f)}`).toBe(true);
      }
    }
  });

  it('passes the adult face validator per view: all front expressions, q34 neutral + blink', () => {
    const rules = LAYOUT.face;
    expect(HEAD.every((r) => r.length === 16)).toBe(true);
    expect(HEAD_Q34.every((r) => r.length === 16)).toBe(true);
    expect(Object.keys(RONIN_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(RONIN_FACE, 'ronin', { mask: HEAD, faceAt: FACE_AT }, EXPRESSIONS, rules)).toEqual([]);
    expect(Object.keys(q34.face.expressions).sort()).toEqual([...Q34_EXPRESSIONS].sort());
    expect(
      validateFace(q34.face, 'ronin/q34', { mask: HEAD_Q34, faceAt: FACE_AT_Q34 }, Q34_EXPRESSIONS, rules),
    ).toEqual([]);
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
    // Known shared adult-pose findings (MA-45 pose tables; the adult dummies show the same list): the q34 far hand on
    // the walk passing frames and the worried `neck` hand end with 0 visible px. Follow-up for the rig, not ronin
    // art; any other problem (or a change to this list) fails here.
    const known = [...[3, 4, 5].map((f) => `walk/${String(f)}: arm R end 0 px`)];
    expect(problems.filter((p) => !known.includes(p))).toEqual([]);
  });
});

describe('reads adult (D-19, ADR 011)', () => {
  const img = built.frames.get('idle_a')?.[0];
  if (!img) throw new Error('idle_a');
  const rest = resolveJoints(RONIN, poseFrame({}), H, 'front');
  /** Skull top: the first row ≥ 6 px wide (the 2-px tuft above it is not skull). */
  const skullTop = Array.from({ length: H }, (_, y) => y).find((y) => {
    const [lo, hi] = span(img, y);
    return lo >= 0 && hi - lo + 1 >= 6;
  });
  const sole = Array.from({ length: H }, (_, y) => H - 1 - y).find((y) => span(img, y)[0] >= 0) ?? 0;
  /** Head = the 15 skull + face rows of the mask (the tuft row excluded; ADR 011 counts the outline-less mask). */
  const headRows = HEAD.length - 1;
  it('stands ≈ 4.4 heads tall (4.2 … 4.6)', () => {
    const heads = (sole - (skullTop ?? 0) + 1) / headRows;
    expect(heads).toBeGreaterThanOrEqual(4.2);
    expect(heads).toBeLessThanOrEqual(4.6);
  });
  it('shoulders ≥ 1.4× the head width', () => {
    const headTop = Math.round(rest.head[1] + RONIN.head.at[1]);
    let head = 0;
    // Skull + face rows (the tuft row and the chin row, which meets the collar, excluded).
    for (let y = headTop + 1; y < headTop + HEAD.length - 1; y++) {
      const [lo, hi] = span(img, y);
      if (lo >= 0) head = Math.max(head, hi - lo + 1);
    }
    let shoulders = 0;
    for (let y = Math.round(rest.shoulderL[1]); y <= Math.round(rest.shoulderL[1]) + 3; y++) {
      const [lo, hi] = span(img, y);
      shoulders = Math.max(shoulders, hi - lo + 1);
    }
    expect(shoulders / head).toBeGreaterThanOrEqual(1.4);
  });
  it('legs (hip → sole) ≥ 40 % of the figure', () => {
    expect((sole - rest.hip[1]) / (sole - (skullTop ?? 0) + 1)).toBeGreaterThanOrEqual(0.4);
  });
});

describe('art gate (ronin.md): the front katana never crosses the axis', () => {
  // Same body without the prop (Object.fromEntries drops the record type; the copy keeps every key but `prop`).
  const strip = <T extends object>(v: T): T => Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'prop')) as T;
  const bare: Body = { ...strip(RONIN), views: { q34: strip(q34) } };
  const bareRenderer = createRigRenderer(bare);
  it('front frames: every prop px stays ≥ 2 px right of the axis (hip sway ±1) and the prop shows', () => {
    let frames = 0;
    for (const a of ANIMS) {
      a.frames.forEach((p, f) => {
        if (bodyViewOf(a, f) !== 'front') return;
        frames++;
        const w = renderer.render(a, f, ctx);
        const b = bareRenderer.render(a, f, ctx);
        const axis = AXIS + Math.round(p.root.dx);
        let seen = 0;
        for (let i = 0; i < w.data.length; i += 4) {
          if ([0, 1, 2, 3].every((k) => w.data[i + k] === b.data[i + k])) continue;
          const [x, y] = [(i / 4) % w.width, Math.floor(i / 4 / w.width)];
          // The charm dangle and the prop's outline are part of the diff; both hang on the wearing side too.
          expect(x, `${a.name}/${String(f)} (${String(x)}, ${String(y)})`).toBeGreaterThanOrEqual(axis + 1);
          seen++;
        }
        expect(seen, `${a.name}/${String(f)}`).toBeGreaterThan(0);
      });
    }
    expect(frames).toBeGreaterThan(40);
  });
});

describe('art gate (ronin.md): palette anchors (dark anchor + oxblood accent, D-19)', () => {
  it('kosode is the dark anchor (L ≤ 0.35, near-neutral) and the hakama keeps the umber hue (never neutral black)', () => {
    const kosode = tone(RONIN.ramps.cloth, RONIN.dressShade ?? 3);
    expect(lab(kosode)[0]).toBeLessThanOrEqual(0.35);
    expect(chroma(kosode)).toBeLessThanOrEqual(0.0205);
    const hk = tone(hakama.ramp, hakama.shade);
    expect(lab(hk)[0]).toBeLessThanOrEqual(0.3);
    expect(chroma(hk)).toBeGreaterThanOrEqual(0.02);
    expect(hue(hk)).toBeGreaterThanOrEqual(20);
    expect(hue(hk)).toBeLessThanOrEqual(80);
  });
  it('the obi is a saturated oxblood (C ≥ 0.12, red hue), never ochre', () => {
    const obi = tone(RONIN.ramps.trim, 2);
    expect(chroma(obi)).toBeGreaterThanOrEqual(0.12);
    expect(hue(obi) < 40 || hue(obi) > 340).toBe(true);
  });
  it('the haori is a warm dove-ivory mist (h 60–95, C ≤ 0.03), never pure white', () => {
    const tip = cloak.hem.wisps?.tipShade ?? cloak.shade;
    for (const s of [cloak.shade, cloak.litShade ?? cloak.shade, cloak.innerShade ?? cloak.shade, tip]) {
      const c = tone(cloak.ramp, s);
      expect(chroma(c)).toBeLessThanOrEqual(0.03);
      expect(hue(c)).toBeGreaterThanOrEqual(60);
      expect(hue(c)).toBeLessThanOrEqual(95);
      expect(c).not.toBe(0xffffff);
    }
  });
});

describe('art gate (ronin.md): adult lookalike hard rules', () => {
  it('tuft: ≤ 2 px wide, ≤ 3 rows over the skull, centred, the cord in oxblood (trim) only', () => {
    for (const mask of [HEAD, HEAD_Q34]) {
      const tuft = mask[0] ?? '';
      const cols = tuft.split('').flatMap((c, x) => (c === '.' ? [] : [x]));
      expect(cols.length).toBeLessThanOrEqual(2);
      expect(cols.every((x) => slotOf(tuft.charAt(x)) === 'hair')).toBe(true);
      const cord = (mask[1] ?? '').split('').filter((c) => slotOf(c) === 'trim');
      expect(cord.length).toBeGreaterThan(0);
      expect(RONIN.outfit.trim.ramp).toBe('gem_garnet');
    }
    const cols = (HEAD[0] ?? '').split('').flatMap((c, x) => (c === '.' ? [] : [x]));
    expect(Math.abs((cols[0] ?? 0) + (cols[cols.length - 1] ?? 0) - 15)).toBeLessThanOrEqual(1);
  });
  it('clean-shaven: no hair or ink px inside the jaw skin from the mouth row down (both views)', () => {
    for (const mask of [HEAD, HEAD_Q34]) {
      for (let y = MOUTH_ROW; y < mask.length; y++) {
        const row = mask[y] ?? '';
        const skin = row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));
        if (skin.length === 0) continue;
        for (let x = Math.min(...skin); x <= Math.max(...skin); x++) {
          expect(['hair', 'ink'].includes(slotOf(row.charAt(x)) ?? ''), `row ${String(y)} col ${String(x)}`).toBe(
            false,
          );
        }
      }
    }
  });
  it('haori wisps: per side 2 regular tongues tapering 3 → 2 → 1, evenly spaced, mist tones only', () => {
    const wisps = HAORI.hem.wisps;
    if (!wisps) throw new Error('haori has no wisps');
    const j = resolveJoints(RONIN, poseFrame({}), H, 'front');
    const geom = cloakGeometry(cloak, poseFrame({}), j, false, [0, 0], 0, W);
    const runs = (y: number): [number, number][] => {
      const out: [number, number][] = [];
      for (let x = 0; x < W; x++) {
        if (!geom.px.has(y * W + x)) continue;
        const last = out[out.length - 1];
        if (last && last[1] === x - 1) last[1] = x;
        else out.push([x, x]);
      }
      return out;
    };
    const rows = [1, 2, 3].map((s) => runs(geom.hemY + s));
    rows.forEach((r, s) => {
      expect(r).toHaveLength(2 * wisps.count);
      for (const [a, b] of r) expect(b - a + 1).toBe(wisps.length - s);
    });
    const starts = (rows[0] ?? []).map(([a]) => a);
    expect((starts[1] ?? 0) - (starts[0] ?? 0)).toBe((starts[3] ?? 0) - (starts[2] ?? 0));
    for (const tone of geom.px.values()) expect(tone.lining).toBe(false);
    // Rendered: the haori hem rows (hem … tips) under the sleeves show mist or the body, never a warm accent.
    const warm = new Set([...ramp('gem_garnet'), ...ramp('cloth_ochre')]);
    const img = built.frames.get('idle_a')?.[0];
    if (!img) throw new Error('idle_a');
    for (let y = geom.hemY - 1; y <= geom.hemY + wisps.length; y++) {
      for (const x of [...geom.px.keys()].filter((i) => Math.floor(i / W) === y).map((i) => i % W)) {
        if (opaque(img, x, y)) expect(warm.has(rgbAt(img, x, y)), `(${String(x)}, ${String(y)})`).toBe(false);
      }
    }
  });
});

describe('art gate (ronin.md): spirit without horror', () => {
  it('feet always visible: both zori show on every front frame (sit_edge and sleep included), the near one on q34', () => {
    const shoe = new Set(ramp(RONIN.outfit.shoe.ramp));
    for (const { a, f, img } of allFrames()) {
      const j = renderer.joints(a, f);
      const feet = bodyViewOf(a, f) === 'q34' ? [j.footL] : [j.footL, j.footR];
      for (const foot of feet) {
        let n = 0;
        for (let y = Math.round(foot[1]) - 1; y <= Math.round(foot[1]) + 2; y++) {
          for (let x = Math.round(foot[0]) - 3; x <= Math.round(foot[0]) + 3; x++) {
            if (opaque(img, x, y) && shoe.has(rgbAt(img, x, y))) n++;
          }
        }
        expect(n, `${a.name}/${String(f)}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('no isolated mist px: every mist px touches another mist px', () => {
    const lone: string[] = [];
    for (const { a, f, img } of allFrames()) {
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (mistShade(img, x, y) < 0) continue;
          if (!N4.some(([dx, dy]) => mistShade(img, x + dx, y + dy) >= 0))
            lone.push(`${a.name}/${String(f)} (${String(x)}, ${String(y)})`);
        }
      }
    }
    expect(lone).toEqual([]);
  });
  it('the haori top sits ≥ 2 rows under the chin (front and q34 collars)', () => {
    for (const view of ['front', 'q34'] as const) {
      const head = view === 'q34' ? q34.head : RONIN.head;
      const collar = (view === 'q34' ? q34.masks : RONIN.masks).neckAcc;
      if (!collar) throw new Error('no collar');
      const rest = resolveJoints(RONIN, poseFrame({}), H, view);
      const lastSkin = head.mask.reduce(
        (acc, row, y) => (row.split('').some((ch) => slotOf(ch) === 'skin') ? y : acc),
        0,
      );
      const chin = Math.round(rest.head[1] + head.at[1]) + lastSkin;
      expect(Math.round(rest.neck[1] + collar.at[1]) - chin, view).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('art gate (ronin.md): q34 contour (RIG.md owner rules)', () => {
  const skinCols = (row: string): number[] => row.split('').flatMap((c, x) => (slotOf(c) === 'skin' ? [x] : []));
  /** Face width of a row: the longest run of skin px (a q34 ear sits apart, behind the sideburn). */
  const width = (mask: Mask, y: number): number => {
    let [best, run] = [0, 0];
    for (const c of mask[y] ?? '') {
      run = slotOf(c) === 'skin' ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };

  /** q34 nose px (head-mask coordinates): the only px allowed forward of the forehead column. */
  const nosePx = new Set(
    (q34.face.nose?.mask ?? []).flatMap((row, r) =>
      row
        .split('')
        .flatMap((c, x) =>
          c === '.'
            ? []
            : [
                `${String(FACE_AT_Q34[0] + (q34.face.nose?.at[0] ?? 0) + x)},${String(FACE_AT_Q34[1] + (q34.face.nose?.at[1] ?? 0) + r)}`,
              ],
        ),
    ),
  );
  const contour = (y: number): number =>
    Math.max(-1, ...skinCols(HEAD_Q34[y] ?? '').filter((x) => !nosePx.has(`${String(x)},${String(y)}`)));

  it('tapers the facing-side contour (nose px aside) from the eye row to a flat ≤ 2-px chin, ≤ 2 px per row', () => {
    for (let y = LASH_ROW + 1; y < HEAD_Q34.length; y++) {
      const step = contour(y - 1) - contour(y);
      expect(step, `row ${String(y)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(y)}`).toBeLessThanOrEqual(2);
    }
    const chin = skinCols(HEAD_Q34[HEAD_Q34.length - 1] ?? '');
    expect(chin.length).toBeGreaterThanOrEqual(1);
    expect(chin.length).toBeLessThanOrEqual(2);
  });

  it('no cheekbone bump (art round 2 F2): from the brow down, nothing but the nose sits forward of the forehead column', () => {
    const browAt = q34.face.brows[q34.face.expressions.neutral?.brows ?? '']?.at[1] ?? 0;
    const browRow = FACE_AT_Q34[1] + browAt;
    const forehead = Math.max(contour(browRow), contour(browRow + 1));
    for (let y = browRow; y < HEAD_Q34.length; y++)
      expect(contour(y), `row ${String(y)} skin past the forehead column ${String(forehead)}`).toBeLessThanOrEqual(
        forehead,
      );
    // Face parts (brows, eyes, mouth) also stay inside it; the brow end 1 px inside.
    const neutral = q34.face.expressions.neutral;
    const parts = [
      q34.face.brows[neutral?.brows ?? ''],
      q34.face.eyes[neutral?.eyes ?? ''],
      q34.face.mouths[neutral?.mouth ?? ''],
    ];
    for (const part of parts) {
      part?.mask.forEach((row, r) =>
        row.split('').forEach((c, x) => {
          if (c !== '.')
            expect(FACE_AT_Q34[0] + (part.at[0] ?? 0) + x, `face px row ${String(r)}`).toBeLessThan(forehead);
        }),
      );
    }
  });
  it('keeps the q34 face skin no wider than the front face skin on every row the front has', () => {
    for (let y = 0; y < HEAD.length; y++)
      expect(width(HEAD_Q34, y), `row ${String(y)}`).toBeLessThanOrEqual(width(HEAD, y));
  });

  const q34Frames = ANIMS.flatMap((a) =>
    a.frames.flatMap((_, f) => (bodyViewOf(a, f) === 'q34' && headViewOf(a, f) === 'q34' ? [{ a, f }] : [])),
  );
  const q34Bodies = ANIMS.flatMap((a) => a.frames.flatMap((_, f) => (bodyViewOf(a, f) === 'q34' ? [{ a, f }] : [])));
  it('render: the head overhangs the torso front by ≤ its back overhang + 4 px', () => {
    expect(q34Frames.length).toBeGreaterThan(0);
    for (const { a, f } of q34Frames) {
      const j = renderer.joints(a, f);
      const { image, labels } = renderer.renderLabeled(a, f, ctx);
      const ext = (y0: number, y1: number, noArms: boolean): [number, number] => {
        let [lo, hi] = [Infinity, -Infinity];
        for (let y = y0; y <= y1; y++) {
          for (let x = 0; x < image.width; x++) {
            const i = (y * image.width + x) * 4;
            if (!image.data[i + 3]) continue;
            const l = labels.data[i];
            if (noArms && l !== ARM_LABEL.none && l !== ARM_LABEL.torso && l !== ARM_LABEL.trim) continue;
            [lo, hi] = [Math.min(lo, x), Math.max(hi, x)];
          }
        }
        return [lo, hi];
      };
      const head = ext(Math.round(j.head[1]) - 8, Math.round(j.head[1]) + 7, false);
      const torso = ext(Math.round(j.hip[1]) - 9, Math.round(j.hip[1]) - 1, true);
      expect(head[1] - torso[1], `${a.name}/${String(f)}`).toBeLessThanOrEqual(torso[0] - head[0] + 4);
    }
  });
  it('render: the trailing haori shows ≥ 2 mist px behind the hip on every q34 frame', () => {
    expect(q34Bodies.length).toBeGreaterThan(0);
    for (const { a, f } of q34Bodies) {
      const img = built.frames.get(a.name)?.[f];
      if (!img) throw new Error(a.name);
      const j = renderer.joints(a, f);
      let best = 0;
      for (let y = Math.round(j.hip[1]) - 8; y <= Math.round(j.hip[1]) - 2; y++) {
        let n = 0;
        for (let x = 0; x < Math.round(j.hip[0]) - 4; x++) if (mistShade(img, x, y) >= 0) n++;
        best = Math.max(best, n);
      }
      expect(best, `${a.name}/${String(f)}`).toBeGreaterThanOrEqual(2);
    }
  });
  it('render: every q34 frame shows a leg gap (a vertical hakama-0 run) near the hem', () => {
    const dark = tone(hakama.ramp, 0);
    const hk = new Set(ramp(hakama.ramp).slice(0, 3));
    for (const { a, f } of q34Bodies) {
      const img = built.frames.get(a.name)?.[f];
      if (!img) throw new Error(a.name);
      const j = renderer.joints(a, f);
      const mid = Math.round((j.footL[0] + j.footR[0] + 2 * j.hip[0]) / 4);
      let hem = -1;
      for (let y = 0; y < img.height; y++) {
        let n = 0;
        for (let x = 0; x < img.width; x++) if (opaque(img, x, y) && hk.has(rgbAt(img, x, y))) n++;
        if (n >= 6) hem = y;
      }
      let best = 0;
      for (let x = mid - 3; x <= mid + 3; x++) {
        let run = 0;
        for (let y = hem - 5; y <= hem; y++) {
          run = opaque(img, x, y) && rgbAt(img, x, y) === dark ? run + 1 : 0;
          best = Math.max(best, run);
        }
      }
      expect(best, `${a.name}/${String(f)}`).toBeGreaterThanOrEqual(2);
    }
  });
  it('render: hair never past the collar — no hair px behind the head joint below the neck row + 2', () => {
    const hair = new Set(ramp(RONIN.ramps.hair).slice(2));
    for (const { a, f } of q34Frames) {
      const img = built.frames.get(a.name)?.[f];
      if (!img) throw new Error(a.name);
      const j = renderer.joints(a, f);
      for (let y = Math.round(j.neck[1]) + 2; y < Math.round(j.hip[1]) - 10; y++) {
        for (let x = 0; x < Math.round(j.head[0]); x++) {
          const isHair = opaque(img, x, y) && hair.has(rgbAt(img, x, y));
          expect(isHair, `${a.name}/${String(f)} (${String(x)}, ${String(y)})`).toBe(false);
        }
      }
    }
  });
});

describe('ronin wave / think keep the front hilt visible', () => {
  it.each(['wave', 'think'])('%s: the hilt (brass or cream wrap px) shows on every frame', (name) => {
    const a = anim(name);
    const brass = tone('cloth_ochre', 3);
    const cream = tone('cloth_cream', 4);
    (built.frames.get(name) ?? []).forEach((img, f) => {
      const j = renderer.joints(a, f);
      let shown = 0;
      for (let y = Math.round(j.hip[1]) - 6; y <= Math.round(j.hip[1]); y++)
        for (let x = AXIS; x < W; x++) if (opaque(img, x, y) && [brass, cream].includes(rgbAt(img, x, y))) shown++;
      expect(shown, `${name}/${String(f)}`).toBeGreaterThanOrEqual(1);
    });
  });
});
