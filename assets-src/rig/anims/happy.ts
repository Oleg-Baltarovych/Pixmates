// happy (6 @ 8): anticipation squash → take-off stretch → apex (−4, head lags) → fall → landing squash → settle.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const air = { legs: 'dangle', arms: 'up', face: 'happy' } as const;

export const HAPPY: RigAnim = {
  name: 'happy',
  fps: 8,
  loop: true,
  frames: [
    frame({ root: o(0, 1), squash: 1, face: 'happy', hem: { flare: 1 } }),
    frame({ ...air, root: o(0, -2), squash: -1, impulse: { x: 0, y: 1 } }),
    frame({ ...air, root: o(0, -4), joints: { head: o(0, 1) }, breath: 1, hem: { lift: 1 }, hairLift: 1 }),
    frame({ ...air, root: o(0, -2), joints: { head: o(0, -1) } }),
    frame({
      root: o(0, 1),
      squash: 1,
      joints: { head: o(0, 1) },
      face: 'happy',
      hem: { flare: 1 },
      impulse: { x: 0, y: -1 },
    }),
    frame({ face: 'happy' }),
  ],
};
