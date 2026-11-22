// M0 placeholder character data (plan M0-05/06). Replaced by the real rig and manifests in M-ART / M1.
/** Animation names the placeholder understands; the stage renders all of them with the one 32×32 frame. */
export const PLACEHOLDER_ANIMATIONS = ['idle', 'drag', 'hop', 'blink'] as const;
export type PlaceholderAnimation = (typeof PLACEHOLDER_ANIMATIONS)[number];

/** A click picks one of these, uniformly, from the seeded RNG. */
export const CLICK_REACTIONS = ['hop', 'blink'] as const satisfies readonly PlaceholderAnimation[];
