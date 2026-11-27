// M-ART phase 2 MA-26: FX marks atlas (built into resources/fx/, loaded from M1).
import { describe, expect, it } from 'vitest';
import { FX_FRAME, FX_MARKS } from '../../../assets-src/fx/marks.ts';
import { LEGEND, maskSize } from '../../../assets-src/lib/mask.ts';
import { buildFx, loadMasterPalette, renderContext, renderFxFrame } from '../../../tools/lib/sprites.ts';
import { fxManifestSchema } from '../../../src/shared/pack.ts';

const ctx = renderContext(loadMasterPalette());
const REQUIRED = [
  'sweat',
  'vein',
  'blush',
  'eyes_happy',
  'eyes_startle',
  'zzz',
  'heart',
  'question',
  'exclaim',
  'smoke',
];

describe('FX atlas (MA-26)', () => {
  it('has the planned marks, each ≤ 6 frames of ≤ 16², marks ≤ 7 × 7 (vein 9², smoke and zzz ≤ 14²), 1-px margin', () => {
    const names = FX_MARKS.map((m) => m.name);
    for (const n of REQUIRED) expect(names).toContain(n);
    expect(FX_FRAME).toBeLessThanOrEqual(16);
    for (const m of FX_MARKS) {
      expect(m.frames.length).toBeGreaterThan(0);
      expect(m.frames.length).toBeLessThanOrEqual(6);
      for (const f of m.frames) {
        for (const s of f) {
          const { w, h } = maskSize(s.mask);
          const limit = m.name === 'smoke' || m.name === 'zzz' ? FX_FRAME - 2 : m.name === 'vein' ? 9 : 7;
          expect(Math.max(w, h), m.name).toBeLessThanOrEqual(limit);
          expect(s.x + w + 1, m.name).toBeLessThanOrEqual(FX_FRAME);
          expect(s.y + h + 1, m.name).toBeLessThanOrEqual(FX_FRAME);
          expect(Math.min(s.x, s.y), m.name).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
  it('builds a palette-only atlas ≤ 512² with a valid manifest, deterministically', () => {
    const fx = buildFx(ctx);
    expect(fxManifestSchema.parse(fx.manifest).marks['sweat']?.frames).toBeGreaterThan(1);
    expect(fx.atlasSize.width).toBeLessThanOrEqual(512);
    expect(fx.atlasSize.height).toBeLessThanOrEqual(512);
    expect(buildFx(ctx).sha256).toBe(fx.sha256);
  });
});

describe('FX stamps (review nit)', () => {
  it('every stamped mask px lands inside its 16² frame and is painted (no clipping)', () => {
    for (const m of FX_MARKS) {
      m.frames.forEach((stamps, f) => {
        const img = renderFxFrame(m, f, ctx);
        for (const s of stamps) {
          s.mask.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) {
              if (!LEGEND[row.charAt(c)]) continue;
              const x = s.x + c;
              const y = s.y + r;
              expect(x >= 0 && y >= 0 && x < FX_FRAME && y < FX_FRAME, `${m.name}/${String(f)}`).toBe(true);
              expect(img.data[(y * FX_FRAME + x) * 4 + 3], `${m.name}/${String(f)}`).toBe(255);
            }
          });
        }
      });
    }
  });
  it('rejects an FX strip that leaves the 512² atlas', () => {
    const fx = {
      version: '0.0.1',
      frameSize: { w: 16, h: 16 },
      marks: { sweat: { frames: 4, fps: 8, loop: false, origin: { x: 480, y: 0 } } },
      files: { 'sprites/fx.png': 'a'.repeat(64) },
    };
    expect(fxManifestSchema.safeParse(fx).success).toBe(false);
    expect(
      fxManifestSchema.safeParse({ ...fx, marks: { sweat: { ...fx.marks.sweat, origin: { x: 0, y: 496 } } } }).success,
    ).toBe(true);
    expect(
      fxManifestSchema.safeParse({ ...fx, marks: { sweat: { ...fx.marks.sweat, origin: { x: 0, y: 497 } } } }).success,
    ).toBe(false);
  });
});
