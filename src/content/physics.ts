// Flight numbers (SPEC §4.2, plan M1 Design → Physics). Data only; `core/physics.ts` reads them. All in art px (× the
// sprite's DIP per art px at use), so a fling feels the same at every size preset. Tuned by the owner by eye.
import { SPRITE_FRAME_HEIGHT_ART } from './desktop.ts';

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
 * Where the foot pivot bounces, in art px inside the work area: `side` = half the 48-px frame width from each side
 * edge, `top` = the whole frame height below the top edge, so the sprite never leaves the screen in flight.
 */
export const FLIGHT_BOUNDS_ART = { side: 24, top: SPRITE_FRAME_HEIGHT_ART } as const;

/** The built-in `land` (4 frames at 10 fps, once). The core times a landing from it; a rig test keeps it equal. */
export const LAND_PLAY = { frames: 4, fps: 10 } as const;

/** A hard landing holds the last `land` frame this long more, with the sweat mark, before the character recovers. */
export const HARD_LANDING_HOLD_MS = 800;
