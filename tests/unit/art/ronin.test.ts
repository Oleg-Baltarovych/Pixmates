// M-ART MA-29b: the `pixmates.ronin` pack gates — build, headroom, faces per view, arm-over-torso contrast — and the
// design-spec checks labelled "art gate (ronin.md)": the four new ramps (§2), feet always visible (no yurei read), no
// isolated mist px, binary alpha, the mist dither never on the silhouette edge, the hilt on wave/think, the mantle
// under the chin, and the q34 contour rules (mask and render level). Positions come from masks and joints.
import { describe, expect, it } from 'vitest';
import { createRoninPack, RONIN } from '../../../assets-src/characters/ronin/body.ts';
import { RONIN_FACE } from '../../../assets-src/characters/ronin/face.ts';
import { HAIR_BACK_Q34, HEAD, HEAD_Q34, SWORD } from '../../../assets-src/characters/ronin/masks.ts';
import { LEGEND, type Mask } from '../../../assets-src/lib/mask.ts';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import { ANIMS } from '../../../assets-src/rig/anims/index.ts';
import { frame as poseFrame } from '../../../assets-src/rig/anims/kit.ts';
import { resolveJoints } from '../../../assets-src/rig/body.ts';
import { armTorsoContrast, armTorsoProblems } from '../../../assets-src/rig/checks.ts';
import { cloakGeometry } from '../../../assets-src/rig/cloak.ts';
import { ARM_LABEL, bodyViewOf, createRigRenderer, headViewOf, RIG_H, RIG_W } from '../../../assets-src/rig/compose.ts';
import { EXPRESSIONS, Q34_EXPRESSIONS, validateFace } from '../../../assets-src/rig/face.ts';
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
const q34 = RONIN.views?.q34;
const cloak = RONIN.cloak;
if (!q34 || !cloak) throw new Error('ronin needs a q34 view and a cloak');
const built = buildPack(createRoninPack(), ctx);
const renderer = createRigRenderer(RONIN);
const ramp = (name: string): readonly number[] => palette.ramps.get(name) ?? [];
const slotOf = (ch: string): string | undefined => LEGEND[ch]?.[0];
type Img = { width: number; height: number; data: Uint8Array };
const rgbAt = (img: Img, x: number, y: number): number => {
  const i = (y * img.width + x) * 4;
  return ((img.data[i] ?? 0) << 16) | ((img.data[i + 1] ?? 0) << 8) | (img.data[i + 2] ?? 0);
};
const opaque = (img: Img, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < img.width && y < img.height && (img.data[(y * img.width + x) * 4 + 3] ?? 0) > 0;
const allFrames = (): { a: RigAnim; f: number; img: Img }[] =>
  ANIMS.flatMap((a) => (built.frames.get(a.name) ?? []).map((img, f) => ({ a, f, img })));
const N4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
/** Mist shade of a px (−1 when not on the mist ramp). */
const MIST = ramp('mist');
const mistShade = (img: Img, x: number, y: number): number => (opaque(img, x, y) ? MIST.indexOf(rgbAt(img, x, y)) : -1);
const faceAtOf = (view: View): [number, number] => {
  const head = view === 'q34' ? q34.head : RONIN.head;
  const rest = resolveJoints(RONIN, poseFrame({}), RIG_H, view);
  return [rest.face[0] - (rest.head[0] + head.at[0]), rest.face[1] - (rest.head[1] + head.at[1])];
};
const FACE_AT = faceAtOf('front');
const FACE_AT_Q34 = faceAtOf('q34');
const OPEN_EYES = RONIN_FACE.eyes.open;
if (!OPEN_EYES) throw new Error('ronin has no open eyes');
const LASH_ROW = FACE_AT[1] + OPEN_EYES.at[1] + OPEN_EYES.mask.findIndex((row) => row.includes('X'));
const lab = (c: number) => toOklab(c);
const chroma = (c: number): number => Math.hypot(lab(c)[1], lab(c)[2]);
const hue = (c: number): number => ((Math.atan2(lab(c)[2], lab(c)[1]) * 180) / Math.PI + 360) % 360;
const hueDist = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const dE = (a: number, b: number): number => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const tone = (name: string, i: number): number => {
  const c = ramp(name)[i];
  if (c === undefined) throw new Error(`${name}[${String(i)}]`);
  return c;
};

describe('pixmates.ronin pack', () => {
  const m = manifestSchema.parse(built.manifest);

  it('builds all shared animations at 48 × 56 within 1024², walk/turn facing right, deterministically', () => {
    expect(m.id).toBe('pixmates.ronin');
    expect(m.frameSize).toEqual({ w: 48, h: RIG_H });
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

  it('passes the face validator per view: all front expressions, q34 neutral + blink', () => {
    expect(HEAD.every((r) => r.length === 30)).toBe(true);
    expect(HEAD_Q34.every((r) => r.length === 30)).toBe(true);
    expect(Object.keys(RONIN_FACE.expressions).sort()).toEqual([...EXPRESSIONS].sort());
    expect(validateFace(RONIN_FACE, 'ronin', { mask: HEAD, faceAt: FACE_AT })).toEqual([]);
    expect(Object.keys(q34.face.expressions).sort()).toEqual([...Q34_EXPRESSIONS].sort());
    expect(validateFace(q34.face, 'ronin/q34', { mask: HEAD_Q34, faceAt: FACE_AT_Q34 }, Q34_EXPRESSIONS)).toEqual([]);
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

describe('art gate (ronin.md): palette ramps mist, cloth_ash, hair_umber, jade (§2, R6)', () => {
  it.each(['mist', 'cloth_ash', 'hair_umber', 'jade'])('%s: no #000, L rising, ≥ 15° hue drift', (name) => {
    const r = ramp(name);
    expect(r.length).toBeGreaterThanOrEqual(6);
    expect(r).not.toContain(0);
    for (let i = 1; i < r.length; i++) expect(lab(tone(name, i))[0]).toBeGreaterThan(lab(tone(name, i - 1))[0]);
    expect(hueDist(hue(tone(name, 0)), hue(tone(name, r.length - 1)))).toBeGreaterThanOrEqual(15);
  });
  it('mist: a mist, not a beige cloth (C ≤ 0.03); ΔE ≥ 0.03 vs fur_ash on the drawn steps 0–5; ΔL ≥ 0.04 vs cream at the panel step', () => {
    for (const c of ramp('mist')) expect(chroma(c)).toBeLessThanOrEqual(0.03);
    // Step 6 (unused by the outfit and the cloak) sits ΔE 0.013 from fur_ash 6 — reported as a deviation.
    for (let i = 0; i <= 5; i++)
      expect(dE(tone('mist', i), tone('fur_ash', i)), `step ${String(i)}`).toBeGreaterThanOrEqual(0.03);
    const panel = cloak.shade;
    expect(Math.abs(lab(tone('mist', panel))[0] - lab(tone('cloth_cream', panel))[0])).toBeGreaterThanOrEqual(0.04);
  });
  it.todo('mist vs fur_cream (knight) ΔE ≥ 0.03 — fur_cream is not in the master palette yet (MA-29c)');
  it('cloth_ash: near-neutral (C ≤ 0.02), base ≥ 0.12 L over cloth_black, never plum', () => {
    for (const c of ramp('cloth_ash')) {
      expect(chroma(c)).toBeLessThanOrEqual(0.0205);
      expect(hueDist(hue(c), 320)).toBeGreaterThan(40);
    }
    expect(lab(tone('cloth_ash', 3))[0] - lab(tone('cloth_black', 3))[0]).toBeGreaterThanOrEqual(0.12);
  });
  it('hair_umber: warm brown (C ≤ 0.05, never copper); hair mass vs kosode ΔL ≥ 0.05 and ≥ 150° apart', () => {
    for (const c of ramp('hair_umber')) expect(chroma(c)).toBeLessThanOrEqual(0.0505);
    const hairMass = tone('hair_umber', RONIN.outfit.hair.tones[2]);
    const kosode = tone('cloth_ash', RONIN.dressShade ?? 3);
    expect(Math.abs(lab(hairMass)[0] - lab(kosode)[0])).toBeGreaterThanOrEqual(0.05);
    expect(hueDist(hue(tone('hair_umber', 3)), hue(kosode))).toBeGreaterThanOrEqual(150);
  });
});

describe('art gate (ronin.md): spirit without horror, mist texture', () => {
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
    for (const { a, f, img } of allFrames()) {
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (mistShade(img, x, y) < 0) continue;
          const touching = N4.some(([dx, dy]) => mistShade(img, x + dx, y + dy) >= 0);
          expect(touching, `${a.name}/${String(f)} (${String(x)}, ${String(y)})`).toBe(true);
        }
      }
    }
  });
  it('the mist dither sits only between the bands and never on the silhouette edge', () => {
    const dither = cloak.dither;
    if (!dither) throw new Error('ronin cloak has no dither');
    const [shadeA] = dither.shades;
    let seen = 0;
    for (const { a, f, img } of allFrames()) {
      const j = renderer.joints(a, f);
      const prev = renderer.joints(a, a.loop ? (f + a.frames.length - 1) % a.frames.length : Math.max(0, f - 1));
      const p = a.frames[f];
      if (!p) continue;
      const prevDx = a.frames[a.loop ? (f + a.frames.length - 1) % a.frames.length : Math.max(0, f - 1)]?.hairDx ?? 0;
      const lag: [number, number] = [prev.hip[0] - j.hip[0], prev.hip[1] - j.hip[1]];
      const geom = cloakGeometry(cloak, p, j, bodyViewOf(a, f) === 'q34', lag, prevDx, RIG_W);
      const bands = cloak.bands.map((b) => geom.hemY - b.row);
      const rows = dither.rows.map((r) => geom.hemY - r);
      expect(Math.min(...rows)).toBeGreaterThan(Math.min(...bands));
      expect(Math.max(...rows)).toBeLessThan(Math.max(...bands));
      for (const y of rows) {
        for (let x = 0; x < img.width; x++) {
          if (mistShade(img, x, y) !== shadeA || !geom.px.has(y * RIG_W + x)) continue;
          seen++;
          for (const [dx, dy] of N4) {
            const n = mistShade(img, x + dx, y + dy);
            expect(opaque(img, x + dx, y + dy), `${a.name}/${String(f)} (${String(x)}, ${String(y)})`).toBe(true);
            // The inner-shadow column (`innerShade`) borders the body, not the silhouette: the px past it is opaque.
            const inner = n === cloak.innerShade && opaque(img, x + 2 * dx, y + 2 * dy);
            expect(n === -1 || n >= shadeA || inner, `${a.name}/${String(f)} edge (${String(x)}, ${String(y)})`).toBe(
              true,
            );
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('art gate (ronin.md): sword and mantle', () => {
  const prop = RONIN.prop;
  if (!prop) throw new Error('ronin has no prop');
  /** Hilt = the sword mask rows above the tsuba row (kashira + grip), as expected colours per frame position. */
  const tsubaRow = SWORD.findIndex((row) => row.includes('rrr'));
  it.each(['wave', 'think'])('%s: ≥ 3 hilt px show on every frame (the arm never swallows it)', (name) => {
    const a = anim(name);
    (built.frames.get(name) ?? []).forEach((img, f) => {
      const j = renderer.joints(a, f);
      const [ox, oy] = [Math.round(j.hip[0] + prop.at[0]), Math.round(j.hip[1] + prop.at[1])];
      let shown = 0;
      SWORD.slice(0, tsubaRow).forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          const entry = LEGEND[row.charAt(c)];
          if (!entry) continue;
          const sw = RONIN.outfit[entry[0]];
          const want = ramp(sw.ramp)[sw.tones[entry[1]]];
          if (opaque(img, ox + c, oy + r) && rgbAt(img, ox + c, oy + r) === want) shown++;
        }
      });
      expect(shown, `${name}/${String(f)}`).toBeGreaterThanOrEqual(3);
    });
  });
  it.each(['front', 'q34'] as const)('%s: the mantle top row sits ≥ 2 rows under the chin', (view) => {
    const head = view === 'q34' ? q34.head : RONIN.head;
    const collar = (view === 'q34' ? q34.masks : RONIN.masks).neckAcc;
    if (!collar) throw new Error('no collar');
    const rest = resolveJoints(RONIN, poseFrame({}), RIG_H, view);
    const lastSkin = head.mask.reduce(
      (acc, row, y) => (row.split('').some((ch) => slotOf(ch) === 'skin') ? y : acc),
      0,
    );
    const chin = Math.round(rest.head[1] + head.at[1]) + lastSkin;
    expect(Math.round(rest.neck[1] + collar.at[1]) - chin).toBeGreaterThanOrEqual(2);
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

  it('tapers the facing-side contour monotonically from the eye row to a 1-px chin point', () => {
    const rights = HEAD_Q34.slice(LASH_ROW).map((r) => Math.max(...skinCols(r)));
    for (let k = 1; k < rights.length; k++) {
      const step = (rights[k - 1] ?? 0) - (rights[k] ?? 0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeGreaterThanOrEqual(0);
      expect(step, `row ${String(LASH_ROW + k)}`).toBeLessThanOrEqual(1);
    }
    expect(skinCols(HEAD_Q34[HEAD_Q34.length - 1] ?? '')).toHaveLength(1);
  });
  it('keeps the q34 face skin no wider than the front face skin on every row the front has', () => {
    for (let y = 0; y < HEAD.length; y++)
      expect(width(HEAD_Q34, y), `row ${String(y)}`).toBeLessThanOrEqual(width(HEAD, y));
  });

  /** Rendered q34 frames with a q34 head (walk, turn f1). */
  const q34Frames = ANIMS.flatMap((a) =>
    a.frames.flatMap((_, f) => (bodyViewOf(a, f) === 'q34' && headViewOf(a, f) === 'q34' ? [{ a, f }] : [])),
  );
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
      const head = ext(Math.round(j.head[1]) - 8, Math.round(j.head[1]) + 8, false);
      const torso = ext(Math.round(j.hip[1]) - 9, Math.round(j.hip[1]) - 1, true);
      expect(head[1] - torso[1], `${a.name}/${String(f)}`).toBeLessThanOrEqual(torso[0] - head[0] + 4);
    }
  });
  /** Last head-mask row of the authored q34 nape (`masks.hairBack`). */
  const hairBack = q34.masks.hairBack;
  if (!hairBack) throw new Error('ronin q34 needs masks.hairBack');
  const NAPE_LAST = hairBack.at[1] - q34.head.at[1] + HAIR_BACK_Q34.length - 1;
  it('render: the trailing cloak shows ≥ 2 mist px behind the hip on every q34 frame (art round 1)', () => {
    const q34Bodies = ANIMS.flatMap((a) => a.frames.flatMap((_, f) => (bodyViewOf(a, f) === 'q34' ? [{ a, f }] : [])));
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
  it('render: every q34 walk / turn frame shows a leg gap (vertical ash-0 notch) at the hem (art round 2)', () => {
    const ash0 = tone('cloth_ash', 0);
    const ash = new Set(ramp('cloth_ash'));
    const q34Legs = ANIMS.flatMap((a) => a.frames.flatMap((_, f) => (bodyViewOf(a, f) === 'q34' ? [{ a, f }] : [])));
    for (const { a, f } of q34Legs) {
      const img = built.frames.get(a.name)?.[f];
      if (!img) throw new Error(a.name);
      const j = renderer.joints(a, f);
      const mid = Math.round((j.footL[0] + j.footR[0] + 2 * j.hip[0]) / 4);
      // Lowest row with a run of ≥ 6 ash px = the hakama hem.
      let hem = -1;
      for (let y = 0; y < img.height; y++) {
        let n = 0;
        for (let x = 0; x < img.width; x++) if (opaque(img, x, y) && ash.has(rgbAt(img, x, y))) n++;
        if (n >= 6) hem = y;
      }
      // A vertical ash-0 run ≥ 2 rows in the bottom 4 hem rows near the leg gap (without the q34 split: ≤ 1 on walk).
      let best = 0;
      for (let x = mid - 2; x <= mid + 2; x++) {
        let run = 0;
        for (let y = hem - 3; y <= hem; y++) {
          run = opaque(img, x, y) && rgbAt(img, x, y) === ash0 ? run + 1 : 0;
          best = Math.max(best, run);
        }
      }
      expect(best, `${a.name}/${String(f)}`).toBeGreaterThanOrEqual(2);
    }
  });
  it('render: no back-hair mass below the nape (2 rows under the ear) behind the head joint', () => {
    const hair = new Set(ramp(RONIN.ramps.hair));
    for (const { a, f } of q34Frames) {
      const img = built.frames.get(a.name)?.[f];
      if (!img) throw new Error(a.name);
      const j = renderer.joints(a, f);
      const top = Math.round(j.head[1] + q34.head.at[1]) + (a.frames[f]?.squash ?? 0);
      // + 1: the outline row under the flicks; down to the waist (the zori are umber too).
      for (let y = top + NAPE_LAST + 2; y < Math.round(j.hip[1]) - 10; y++) {
        for (let x = 0; x < Math.round(j.head[0]); x++) {
          const isHair = opaque(img, x, y) && hair.has(rgbAt(img, x, y));
          expect(isHair, `${a.name}/${String(f)} (${String(x)}, ${String(y)})`).toBe(false);
        }
      }
    }
  });
  it('render: no near-lock ear bulge — the back contour never steps out from the lash row to the jaw', () => {
    for (const { a, f } of q34Frames) {
      const img = built.frames.get(a.name)?.[f];
      if (!img) throw new Error(a.name);
      const j = renderer.joints(a, f);
      const top = Math.round(j.head[1] + q34.head.at[1]) + (a.frames[f]?.squash ?? 0);
      const left: number[] = [];
      // To the nape's last row (below it the shoulders and cloak start).
      for (let y = top + LASH_ROW; y <= top + NAPE_LAST; y++) {
        let x = 0;
        while (x < img.width && !opaque(img, x, y)) x++;
        left.push(x);
      }
      for (let k = 1; k < left.length; k++)
        expect(left[k], `${a.name}/${String(f)} row ${String(top + LASH_ROW + k)}`).toBeGreaterThanOrEqual(
          left[k - 1] ?? 0,
        );
    }
  });
});
