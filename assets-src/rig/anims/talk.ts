// talk (6 @ 8): mouth cycle closed / small / open, a small hand gesture and a nod.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

export const TALK: RigAnim = {
  name: 'talk',
  fps: 8,
  loop: true,
  frames: [
    frame({ face: 'talk_b' }),
    frame({ face: 'talk_c', armR: 'talk' }),
    frame({ face: 'talk_a', armR: 'talk', breath: 1 }),
    frame({ face: 'talk_c', armR: 'talk', joints: { chest: o(0, -1) } }),
    frame({ face: 'talk_b' }),
    frame({ face: 'talk_a', breath: 1 }),
  ],
};
