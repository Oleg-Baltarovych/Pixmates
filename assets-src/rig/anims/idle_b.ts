// idle_b (12 @ 6): weight shift and a look to each side, a sleepy half-lid, blinks; feet stay planted.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const left = (extra = {}) => ({ head: o(-1, 0), ...extra });
const right = (extra = {}) => ({ head: o(1, 0), ...extra });

export const IDLE_B: RigAnim = {
  name: 'idle_b',
  fps: 6,
  loop: true,
  frames: [
    frame({}),
    frame({ breath: 1 }),
    frame({ root: o(-1, 0), joints: left() }),
    frame({ root: o(-1, 0), joints: left(), face: 'half' }),
    frame({ root: o(-1, 0), joints: left({ chest: o(0, -1) }), face: 'half' }),
    frame({ root: o(-1, 0), joints: left(), face: 'blink' }),
    frame({ breath: 1 }),
    frame({ root: o(1, 0), joints: right() }),
    frame({ root: o(1, 0), joints: right({ chest: o(0, -1) }), breath: 1 }),
    frame({ root: o(1, 0), joints: right(), face: 'blink' }),
    frame({ breath: 1 }),
    frame({}),
  ],
};
