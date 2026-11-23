// startle (5 @ 10, once): jump with a stretch and flailing arms (>< face), land in a squash, settle worried.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

export const STARTLE: RigAnim = {
  name: 'startle',
  fps: 10,
  loop: false,
  frames: [
    frame({
      root: o(0, -2),
      squash: -1,
      legs: 'dangle',
      arms: 'flail',
      face: 'startle',
      hem: { flare: 1 },
      impulse: { x: 0, y: 2 },
    }),
    frame({ root: o(0, -3), legs: 'dangle', arms: 'flail', joints: { head: o(0, 1) }, face: 'startle' }),
    frame({ root: o(0, -1), legs: 'dangle', arms: 'out', face: 'startle' }),
    frame({ root: o(0, 1), squash: 1, arms: 'out', face: 'startle', hem: { flare: 1 } }),
    frame({ arms: 'chest', face: 'worried' }),
  ],
};
