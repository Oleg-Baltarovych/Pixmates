// Desktop numbers (SPEC §4.2, plan M1 Content). Data only; M1-20 adds the sensor poll intervals here.

/**
 * Narrowest window top edge the character may use, in art px (× the sprite's DIP per art px, so it scales with the
 * size preset). 32 = two thirds of the 48-px frame: room to stand with a stride to spare; a thinner sliver between
 * two overlapping windows reads as a glitch, not a ledge.
 */
export const SURFACE_MIN_WIDTH_ART = 32;
