// fall (4 @ 10): flailing arms and kicking legs, skirt lifted, hair blown up (chain impulse), startled.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const air = {
  root: o(0, -1),
  legs: 'dangle',
  hem: { lift: 1, flare: 1 },
  face: 'startle',
  impulse: { x: 0, y: -2 },
} as const;

export const FALL: RigAnim = {
  name: 'fall',
  fps: 10,
  loop: true,
  frames: [
    frame({ ...air, armL: 'up', armR: 'flail', joints: { footL: o(0, -2) } }),
    frame({ ...air, armL: 'flail', armR: 'up', joints: { footR: o(0, -2) } }),
    frame({ ...air, armL: 'up', armR: 'flail', joints: { footL: o(0, -1) } }),
    frame({ ...air, armL: 'flail', armR: 'up', joints: { footR: o(0, -1) } }),
  ],
};
