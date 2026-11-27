// Runtime mirroring (ADR 010): sided animations are authored facing right; left is a horizontal mirror. Pure helpers.
import type { Facing } from '../../shared/pack.ts';

/** Does an animation authored as `authored` (absent = front) need a mirror to face `wanted`? Front never mirrors. */
export function needsMirror(authored: Facing | undefined, wanted: Facing | undefined): boolean {
  if (authored === undefined || authored === 'front' || wanted === undefined || wanted === 'front') return false;
  return authored !== wanted;
}

/**
 * Art px to move a frame mirrored about its centre so it flips around the pivot column `anchorX · frameW` instead
 * (0 for the built-ins' foot pivot x 0.5).
 */
export const mirrorShiftPx = (anchorX: number, frameW: number): number => (2 * anchorX - 1) * frameW;
