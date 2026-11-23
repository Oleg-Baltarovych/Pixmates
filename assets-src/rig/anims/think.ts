// think (8 @ 6): one hand at the jaw — a fist with a raised finger breaking the cheek outline at the jaw corner —
// its elbow propped on the other forearm folded across the waist; head tilted, eyes up to the side, one blink.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const tilt = { head: o(1, 0) };
const base = { armR: 'chin', armL: 'fold', face: 'think' } as const;

export const THINK: RigAnim = {
  name: 'think',
  fps: 6,
  loop: true,
  frames: [
    frame({ ...base }),
    frame({ ...base, breath: 1 }),
    frame({ ...base, joints: tilt }),
    frame({ ...base, joints: tilt }),
    frame({ ...base, joints: tilt, breath: 1 }),
    frame({ ...base, joints: tilt }),
    frame({ ...base, face: 'blink' }),
    frame({ ...base }),
  ],
};
