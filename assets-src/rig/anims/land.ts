// land (4 @ 10, once): landing squash (2 rows, then 1), a 1-row rebound stretch, settle; arms out for balance.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

export const LAND: RigAnim = {
  name: 'land',
  fps: 10,
  loop: false,
  frames: [
    frame({ root: o(0, 1), squash: 2, arms: 'out', face: 'wince', hem: { flare: 1 }, impulse: { x: 0, y: 2 } }),
    frame({ root: o(0, 1), squash: 1, arms: 'out', face: 'blink' }),
    frame({ squash: -1, impulse: { x: 0, y: -1 } }),
    frame({}),
  ],
};
