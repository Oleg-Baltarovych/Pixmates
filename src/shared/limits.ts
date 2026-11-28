// Pack and name bounds (SPEC §5.1), zod-free so the pure core can check its input without pulling zod in
// (`shared/pack.ts` builds its schemas from these and re-exports them).

export const PACK_LIMITS = {
  idMax: 64,
  textMax: 64,
  personaMax: 2000,
  frameMin: 8,
  frameMax: 256,
  framesMax: 64,
  fpsMax: 30,
  animationsMax: 64,
  fallbacksMax: 64,
  /** SPEC §5.1: ≤ 4096 px per texture side. */
  textureMax: 4096,
  /** `scaleRef` ≥ ¾ of the frame height (ADR 009 headroom ≈ 17 %; a tiny scaleRef would blow the sprite up). */
  scaleRefMinRatio: 0.75,
} as const;

/** Longest animation name `ANIM_NAME` (`shared/pack.ts`) admits: 32-char name + `:` + 32-char namespace part. */
export const ANIM_NAME_MAX = 65;
