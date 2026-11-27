// drag (4 @ 8): held up by the scruff — shoulders raised, torso stretched 1 px, arms hanging straight down outside
// the hair line with the hands splayed 1 px, legs dangling with pointed toes; the body follows the cursor sideways
// while the feet and the hem stay where they were one frame ago (1-frame lag), hair and tails trail by chain.
// Worried, both eyes open.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

/** Cursor motion (root x). */
const SWING = [-1, 0, 1, 0] as const;
const at = (i: number): number => SWING[(i + SWING.length) % SWING.length] ?? 0;

export const DRAG: RigAnim = {
  name: 'drag',
  fps: 8,
  loop: true,
  frames: SWING.map((s, i) => {
    const lag = at(i - 1) - s;
    return frame({
      root: o(s, -2),
      legs: 'dangle',
      arms: 'hang',
      joints: { shoulderL: o(-1, -1), shoulderR: o(1, -1), footL: o(lag, 0), footR: o(lag, 0) },
      squash: -1,
      hem: { dx: lag },
      face: 'worried',
    });
  }),
};
