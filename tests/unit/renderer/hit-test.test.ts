import { describe, expect, it } from 'vitest';
import { FRAME_HEIGHT_PX } from '../../../src/content/stage.ts';
import { isOpaqueAt } from '../../../src/renderer/stage/hit-test.ts';
import { placeholderFrame } from '../../../src/shared/placeholder-art.ts';

// 4×2 mask: only (1,0) and (2,1) are opaque; (3,0) is faint.
const mask = { width: 4, height: 2, alpha: new Uint8Array([0, 255, 0, 40, 0, 0, 255, 0]) };

describe('isOpaqueAt', () => {
  it('maps a stage point through position and pixel size to the art pixel', () => {
    // Sprite at (100, 50), one art pixel = 2.5 DIP (scale 5 at 200 %... or 125 % with scale 3.125 — any positive).
    expect(isOpaqueAt(mask, 100, 50, 2.5, 100 + 2.5 * 1 + 0.1, 50 + 0.1)).toBe(true);
    expect(isOpaqueAt(mask, 100, 50, 2.5, 100 + 2.5 * 2 - 0.01, 50 + 2.4)).toBe(true);
    expect(isOpaqueAt(mask, 100, 50, 2.5, 100 + 0.1, 50 + 0.1)).toBe(false);
    expect(isOpaqueAt(mask, 100, 50, 2.5, 100 + 2.5 * 2 + 0.1, 50 + 2.5 + 0.1)).toBe(true);
  });

  it('treats faint pixels and everything outside the frame as transparent', () => {
    expect(isOpaqueAt(mask, 0, 0, 1, 3.5, 0.5)).toBe(false);
    expect(isOpaqueAt(mask, 0, 0, 1, -0.5, 0.5)).toBe(false);
    expect(isOpaqueAt(mask, 0, 0, 1, 4.5, 0.5)).toBe(false);
    expect(isOpaqueAt(mask, 0, 0, 1, 1.5, 2.5)).toBe(false);
    expect(isOpaqueAt(mask, 0, 0, 0, 1.5, 0.5)).toBe(false);
  });
});

describe('placeholder frame', () => {
  it('matches the content frame height and has transparent margins with an opaque body', () => {
    const frame = placeholderFrame();
    expect(frame.height).toBe(FRAME_HEIGHT_PX);
    expect(frame.alpha[0]).toBe(0);
    expect(frame.alpha[frame.width * frame.height - 1]).toBe(0);
    expect(frame.alpha[18 * frame.width + 16]).toBe(255);
    expect(frame.rgba.length).toBe(frame.width * frame.height * 4);
  });
});
