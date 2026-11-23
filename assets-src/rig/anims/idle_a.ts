// idle_a (8 @ 6): breathing — shoulders and head rise 1 px with a sub-pixel chest shift between, 1-frame blink.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const up = { chest: o(0, -1) };

export const IDLE_A: RigAnim = {
  name: 'idle_a',
  fps: 6,
  loop: true,
  frames: [
    frame({}),
    frame({ breath: 1 }),
    frame({ joints: up }),
    frame({ joints: up, breath: 1 }),
    frame({ joints: up }),
    frame({ breath: 1 }),
    frame({ face: 'blink' }),
    frame({}),
  ],
};
