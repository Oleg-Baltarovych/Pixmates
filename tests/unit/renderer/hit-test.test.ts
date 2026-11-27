import { describe, expect, it } from 'vitest';
import { isOpaqueInFrame, OPAQUE_ALPHA, type AlphaMask } from '../../../src/renderer/stage/hit-test.ts';
import { manifestSchema } from '../../../src/shared/pack.ts';
import { decodePng } from '../../../tools/lib/png.ts';
import { buildOutput } from '../../../tools/lib/sprite-outputs.ts';
import { loadMasterPalette, renderContext } from '../../../tools/lib/sprites.ts';

// 4×2 mask: only (1,0) and (2,1) are opaque; (3,0) is faint.
const mask: AlphaMask = { width: 4, height: 2, alpha: new Uint8Array([0, 255, 0, 40, 0, 0, 255, 0]) };
const whole = { x: 0, y: 0, w: 4, h: 2 };

describe('isOpaqueInFrame', () => {
  it('maps a stage point through position and pixel size to the art pixel', () => {
    // Sprite at (100, 50), one art pixel = 2.5 DIP (any positive size: scale 3 at 125 % is 2.4 DIP).
    expect(isOpaqueInFrame(mask, whole, 100, 50, 2.5, 100 + 2.5 * 1 + 0.1, 50 + 0.1)).toBe(true);
    expect(isOpaqueInFrame(mask, whole, 100, 50, 2.5, 100 + 2.5 * 2 - 0.01, 50 + 2.4)).toBe(true);
    expect(isOpaqueInFrame(mask, whole, 100, 50, 2.5, 100 + 0.1, 50 + 0.1)).toBe(false);
    expect(isOpaqueInFrame(mask, whole, 100, 50, 2.5, 100 + 2.5 * 2 + 0.1, 50 + 2.5 + 0.1)).toBe(true);
  });

  it('treats faint pixels, points outside the frame and a zero pixel size as transparent', () => {
    expect(isOpaqueInFrame(mask, whole, 0, 0, 1, 3.5, 0.5)).toBe(false);
    expect(isOpaqueInFrame(mask, whole, 0, 0, 1, -0.5, 0.5)).toBe(false);
    expect(isOpaqueInFrame(mask, whole, 0, 0, 1, 4.5, 0.5)).toBe(false);
    expect(isOpaqueInFrame(mask, whole, 0, 0, 1, 1.5, 2.5)).toBe(false);
    expect(isOpaqueInFrame(mask, whole, 0, 0, 0, 1.5, 0.5)).toBe(false);
  });

  it('reads only the current frame of the atlas, never a neighbouring one', () => {
    // Frame 1 of a 2-px strip is (2,0)…(3,1): its (0,1) is the atlas (2,1), opaque; atlas (1,0) is frame 0's.
    const frame1 = { x: 2, y: 0, w: 2, h: 2 };
    expect(isOpaqueInFrame(mask, frame1, 0, 0, 1, 0.5, 1.5)).toBe(true);
    expect(isOpaqueInFrame(mask, frame1, 0, 0, 1, -0.5, 0.5)).toBe(false);
    expect(isOpaqueInFrame(mask, frame1, 0, 0, 1, 2.5, 1.5)).toBe(false);
  });

  it('reads a mirrored frame right to left (dev travel preview, MA-33)', () => {
    // Mirrored, screen column x shows art column w - 1 - x: art (1,0) appears at screen column 2, art (2,1) at 1.
    const mirrored = { ...whole, mirrored: true };
    expect(isOpaqueInFrame(mask, mirrored, 0, 0, 1, 2.5, 0.5)).toBe(true);
    expect(isOpaqueInFrame(mask, mirrored, 0, 0, 1, 1.5, 0.5)).toBe(false);
    expect(isOpaqueInFrame(mask, mirrored, 0, 0, 1, 1.5, 1.5)).toBe(true);
    expect(isOpaqueInFrame(mask, mirrored, 0, 0, 1, 2.5, 1.5)).toBe(false);
    // The faint (3,0) shows at screen column 0 and still does not count; outside the frame stays transparent.
    expect(isOpaqueInFrame(mask, mirrored, 0, 0, 1, 0.5, 0.5)).toBe(false);
    expect(isOpaqueInFrame(mask, mirrored, 0, 0, 1, 4.5, 0.5)).toBe(false);
  });
});

describe('click-through on a real frame (MA-30)', () => {
  const pack = buildOutput('pixmates.maid', renderContext(loadMasterPalette()));
  const file = (path: string): Buffer => {
    const found = pack.files.find((f) => f.path === path);
    if (!found) throw new Error(`pixmates.maid has no ${path}`);
    return found.bytes;
  };
  const manifest = manifestSchema.parse(JSON.parse(file('manifest.json').toString('utf8')));
  const image = decodePng(file('sprites/atlas.png'));
  const atlas: AlphaMask = {
    width: image.width,
    height: image.height,
    alpha: Uint8Array.from({ length: image.width * image.height }, (_, i) => image.data[i * 4 + 3] ?? 0),
  };
  const idle = manifest.animations['idle_a'];
  if (!idle) throw new Error('pixmates.maid has no idle_a');
  const { w, h } = manifest.frameSize;
  const rect = { x: idle.origin?.x ?? 0, y: idle.origin?.y ?? 0, w, h };
  // Scale 3 at 125 %: one art pixel = 2.4 DIP; sprite top-left at (500, 300) DIP.
  const px = 3 / 1.25;
  const at = (ax: number, ay: number): boolean =>
    isOpaqueInFrame(atlas, rect, 500, 300, px, 500 + (ax + 0.5) * px, 300 + (ay + 0.5) * px);

  it('passes clicks through the headroom and the frame corners, catches them on the body', () => {
    expect(at(0, 0)).toBe(false);
    expect(at(w - 1, 0)).toBe(false);
    expect(at(0, h - 1)).toBe(false);
    // Headroom: row 0 of every built-in frame is transparent (ADR 009).
    for (let x = 0; x < w; x++) expect(at(x, 0)).toBe(false);
    // The frame centre column has opaque body pixels, and every opaque art pixel maps to an opaque hit.
    let opaque = 0;
    for (let y = 0; y < h; y++) {
      const a = atlas.alpha[(rect.y + y) * atlas.width + rect.x + w / 2] ?? 0;
      expect(at(w / 2, y)).toBe(a >= OPAQUE_ALPHA);
      if (a >= OPAQUE_ALPHA) opaque++;
    }
    expect(opaque).toBeGreaterThan(h / 2);
  });
});
