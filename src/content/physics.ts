// Flight numbers (SPEC §4.2, plan M1 Design → Physics). Data only; `core/physics.ts` reads them. All in art px (× the
// sprite's DIP per art px at use), so a fling feels the same at every size preset. Tuned by the owner by eye.
import { SPRITE_FRAME_HEIGHT_ART, SPRITE_FRAME_WIDTH_ART } from './desktop.ts';

export const PHYSICS = {
  /** Art px/s². A drop from the top of a 1080p work area (≈ 320 art px at ×4 / 125 %) takes ≈ 0.5 s. */
  gravityArtS2: 2_400,
  /** Fastest fling, art px/s, along the throw direction: a wild flick still reads as a throw, not a teleport. */
  flingMaxArtS: 1_600,
  /** Share of the speed into a wall or the ceiling kept after the bounce (the other axis is untouched). */
  restitution: 0.5,
  /** Downward speed at touch-down, art px/s, above which the landing is hard (land + sweat): a drop of ≈ 3 heights. */
  hardLandingArtS: 900,
  /** Wall/ceiling bounces before the rest of the flight drops straight down (a flight always ends). */
  maxBounces: 6,
} as const;

/**
 * Where the foot pivot bounces, in art px inside the work area: `side` = half the frame width from each side
 * edge, `top` = the whole frame height below the top edge, so the sprite never leaves the screen in flight.
 */
export const FLIGHT_BOUNDS_ART = { side: SPRITE_FRAME_WIDTH_ART / 2, top: SPRITE_FRAME_HEIGHT_ART } as const;

/**
 * Seconds a touch-down root may lie in the past and still count as "now" (s): a point sampled on a path comes back a
 * few ulps past the surface it is about to cross (≈ 1e-13 DIP, so ≪ 1e-9 s even at grazing speeds), and a strict
 * `t >= 0` would let it fall through. 1 µs is far above that error and far below any timer or frame (≥ 1 ms).
 */
export const LANDING_ROOT_EPSILON_S = 1e-6;

/** A hard landing holds the last `land` frame this long more, with the sweat mark, before the character recovers. */
export const HARD_LANDING_HOLD_MS = 800;
