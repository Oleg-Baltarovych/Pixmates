// M-ART MA-02/03/05/06/07/08: palette, masks, passes, chain, spike packs and build determinism.
import { describe, expect, it } from 'vitest';
import { PACKS } from '../../../assets-src/packs.ts';
import { createIndexBuffer } from '../../../assets-src/lib/buffer.ts';
import { simulateChain, type Point } from '../../../assets-src/lib/chain.ts';
import { checkMask, LEGEND, plotMasks, SLOTS, type Outfit } from '../../../assets-src/lib/mask.ts';
import { toOklab } from '../../../assets-src/lib/palette.ts';
import { dither, outline } from '../../../assets-src/lib/passes.ts';
import { antiAlias, rimLight } from '../../../assets-src/lib/polish.ts';
import { stroke } from '../../../assets-src/lib/shapes.ts';
import { withBand } from '../../../assets-src/rig/body.ts';
import { buildPack, loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

const palette = loadMasterPalette();
const ctx = renderContext(palette);

describe('master palette (MA-03)', () => {
  it('has 5–7 hue-shifted, L-monotonic ramps without pure black or white', () => {
    expect(palette.rampNames.length).toBeGreaterThanOrEqual(14);
    for (const [name, ramp] of palette.ramps) {
      expect(ramp.length, name).toBeGreaterThanOrEqual(5);
      expect(ramp.length, name).toBeLessThanOrEqual(7);
      const labs = ramp.map(toOklab);
      labs.slice(1).forEach(([l], i) => {
        expect(l, `${name}[${String(i + 1)}]`).toBeGreaterThan(labs[i]?.[0] ?? 1);
      });
      const hue = ([, a, b]: readonly number[]): number => (Math.atan2(b ?? 0, a ?? 0) * 180) / Math.PI;
      const first = labs[0];
      const last = labs[labs.length - 1];
      if (!first || !last) throw new Error('empty ramp');
      const drift = Math.abs(((hue(last) - hue(first) + 540) % 360) - 180);
      expect(drift, `${name} hue drift`).toBeGreaterThanOrEqual(15);
      expect(ramp).not.toContain(0x000000);
      expect(ramp).not.toContain(0xffffff);
    }
  });
});

const outfit = Object.fromEntries(
  SLOTS.map((s) => [s, { ramp: 'skin', tones: [0, 1, 2, 3, 4, 5] }]),
) as unknown as Outfit;

describe('masks (MA-05)', () => {
  it('maps every legend char to a slot and a tone 0..5', () => {
    expect(LEGEND['Z']).toEqual(['skin', 0]);
    expect(LEGEND['E']).toEqual(['skin', 5]);
    expect(LEGEND['x']).toEqual(['ink', 1]);
    const plot = plotMasks(outfit, [{ mask: ['zs', '.E'], x: 1, y: 1 }]);
    expect(plot.get(1, 1)?.shade).toBe(1);
    expect(plot.get(2, 2)?.shade).toBe(5);
    expect(plot.has(1, 2)).toBe(false);
  });
  it('fails on an unknown char with its position', () => {
    expect(() => {
      checkMask(['zs', 's?'], 'face');
    }).toThrow(/face: unknown mask char "\?" at row 1, col 1/);
  });
  it('mirrors a stamp with flip', () => {
    const plot = plotMasks(outfit, [{ mask: ['zE'], x: 0, y: 0, flip: true }]);
    expect(plot.get(0, 0)?.shade).toBe(5);
  });
});

describe('passes (MA-02)', () => {
  const blob = () => {
    const buf = createIndexBuffer(12, 12, palette);
    for (const f of stroke([[6, 6, 3.5]]).fragments) buf.set(f.x, f.y, { ramp: 'cloth_teal', shade: 3 });
    return buf;
  };
  it('outline, AA and rim keep every px on its ramp and inside its range', () => {
    const buf = blob();
    const map = outline(buf, ctx.rampSize, { drop: 2 });
    antiAlias(buf, map);
    rimLight(buf, map, ctx.rampSize, { strength: 1 });
    for (let i = 0; i < buf.ramp.length; i++) {
      if ((buf.ramp[i] ?? -1) < 0) continue;
      expect(Number.isInteger(buf.shade[i])).toBe(true);
      expect(buf.shade[i]).toBeGreaterThanOrEqual(0);
      expect(buf.shade[i]).toBeLessThanOrEqual(6);
    }
  });
  it('rim light brightens the right-hand inner edge only', () => {
    const buf = blob();
    const map = outline(buf, ctx.rampSize, { drop: 2 });
    rimLight(buf, map, ctx.rampSize, { strength: 1 });
    const row = 6;
    const xs = [...Array(12).keys()].filter((x) => buf.get(x, row).ramp !== null && map.kind[row * 12 + x] === 0);
    expect(buf.get(xs[xs.length - 1] ?? 0, row).shade).toBe(4);
    expect(buf.get(xs[0] ?? 0, row).shade).toBe(3);
  });
  it('dither rounds the listed ramps instead of dithering them', () => {
    const buf = createIndexBuffer(8, 1, palette);
    for (let x = 0; x < 8; x++) buf.set(x, 0, { ramp: x < 4 ? 'hair_copper' : 'cloth_teal', shade: 2.45 });
    dither(buf, ctx.rampSize, { spread: 1, round: ['hair_copper'] });
    expect([...buf.shade].slice(0, 4)).toEqual([2, 2, 2, 2]);
    expect(new Set([...buf.shade].slice(4)).size).toBe(2);
  });
});

describe('verlet chain (MA-06)', () => {
  const anchors: Point[] = [0, 1, 2, 1, 0, -1, -2, -1].map((dx) => [10 + dx, 5] as const);
  const spec = { segments: 4, length: 2, gravity: [0, 0.1] as const, damping: 0.85 };
  it('loops seamlessly in whole px and starts at the anchor', () => {
    const { frames, residual } = simulateChain(anchors, spec);
    expect(frames).toHaveLength(8);
    expect(residual).toBeLessThan(0.5);
    frames.forEach((points, f) => {
      expect(points[0]).toEqual([Math.round(anchors[f]?.[0] ?? 0), 5]);
      for (const [x, y] of points) expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
    });
  });
  it('is deterministic and lags behind the anchor (follow-through)', () => {
    expect(simulateChain(anchors, spec)).toEqual(simulateChain(anchors, spec));
    const tips = simulateChain(anchors, spec).frames.map((p) => p[p.length - 1]?.[0] ?? 0);
    expect(new Set(tips).size).toBeGreaterThan(1);
  });
  it('rejects bad input', () => {
    expect(() => simulateChain([], spec)).toThrow(RangeError);
    expect(() => simulateChain(anchors, { ...spec, segments: 0 })).toThrow(RangeError);
  });
});

describe('spike packs (MA-07/08)', () => {
  const SPIKES = PACKS.filter((p) => p.id.startsWith('spike-'));
  it('builds the two anime-soft maid variants with the planned animations, sizes and frame counts', () => {
    expect(PACKS.map((p) => p.id)).toEqual([
      'pixmates.maid',
      'pixmates.kitsune',
      'pixmates.goth',
      'pixmates.witch',
      'pixmates.ronin',
      'pixmates.coder',
      'pixmates.knight',
      'spike-maid-48soft',
      'spike-maid-64soft',
    ]);
    for (const def of SPIKES) {
      const built = buildPack(def, ctx); // throws on off-palette colours, soft alpha, wrong size or empty frames
      expect(built.frames.get('idle_a')).toHaveLength(8);
      expect(built.frames.get('walk')).toHaveLength(8);
      expect(built.frames.get('happy')).toHaveLength(6);
      expect(def.frameSize.w).toBe(def.id.includes('48') ? 48 : 64);
      const anims = built.manifest['animations'] as Record<string, { origin: { y: number } }>;
      expect(anims['walk']?.origin.y).toBe(def.frameSize.h);
    }
  });
  it('is deterministic: two builds give identical atlas hashes', () => {
    for (const def of SPIKES) expect(buildPack(def, ctx).sha256).toBe(buildPack(def, ctx).sha256);
  });
  it('idle breathes and blinks: frames differ within the loop', () => {
    const idle = buildPack(SPIKES[0] as (typeof PACKS)[number], ctx).frames.get('idle_a') ?? [];
    const keys = new Set(idle.map((f) => Buffer.from(f.data).toString('base64')));
    expect(keys.size).toBeGreaterThanOrEqual(4);
  });
});

describe('forehead hair-shadow band (ART-BIBLE §11.3)', () => {
  const fringe = ['HHHH', 'HHSH', 'SSSS', 'SSSS'];
  it('turns the first skin px under the fringe into z and adds a 1-px AA step at staircase corners', () => {
    expect(withBand(fringe, 3)).toEqual(['HHHH', 'HHzH', 'zzsz', 'SSSS']);
  });
  it('never places the band below the given row (keeps it off the lash line)', () => {
    expect(withBand(['HH', 'HS', 'SS'], 1)).toEqual(['HH', 'Hz', 'SS']);
  });
});

describe('chain one-shot clips (S5)', () => {
  it('a non-loop chain starts at rest and spreads no seam residual', () => {
    const anchors: Point[] = [
      [5, 5],
      [8, 5],
      [8, 5],
    ];
    const r = simulateChain(anchors, { segments: 3, length: 2, gravity: [0, 0.1], loop: false });
    expect(r.residual).toBe(0);
    expect(r.frames[0]).toEqual([
      [5, 5],
      [5, 7],
      [5, 9],
      [5, 11],
    ]);
  });
});
