// Desktop numbers (SPEC §4.2, plan M1 Content). Data only; M1-20 adds the sensor poll intervals here.

/**
 * Narrowest window top edge the character may use, in art px (× the sprite's DIP per art px, so it scales with the
 * size preset). 32 = two thirds of the 48-px frame width: room to stand with a stride to spare; a thinner sliver
 * between two overlapping windows reads as a glitch, not a ledge.
 */
export const SURFACE_MIN_WIDTH_ART = 32;

/**
 * Frame width of every built-in pack, in art px (ADR 012: 48 × 56, manifests `frame.w`; axis at x = 24). Half of it
 * keeps the whole sprite on screen while walking the floor.
 */
export const SPRITE_FRAME_WIDTH_ART = 48;

/**
 * Frame height of every built-in pack, in art px (ADR 012: 48 × 56, manifests `frame.h`). The headroom an edge needs
 * is this whole 56-px frame height, FX rows above the head included, so a bubble or mark never clips at the top.
 */
export const SPRITE_FRAME_HEIGHT_ART = 56;

/**
 * How far a window top may shift vertically, in DIP, and still be the edge a character stands on. 1 DIP absorbs
 * physical-px → DIP rounding of DWM bounds (1 px ≤ 1 DIP at ≥ 100 %); any larger shift is a real move → fall.
 */
export const SURFACE_MOVED_TOLERANCE_DIP = 1;
