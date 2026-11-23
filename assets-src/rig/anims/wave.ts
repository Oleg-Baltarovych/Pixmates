// wave (8 @ 8): the right hand waves (2 waves a second), the body leans into it.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const WAVE = ['wave_a', 'wave_a', 'wave_b', 'wave_b', 'wave_a', 'wave_a', 'wave_b', 'wave_b'] as const;

export const WAVE_ANIM: RigAnim = {
  name: 'wave',
  fps: 8,
  loop: true,
  frames: WAVE.map((armR, i) =>
    frame({
      armR,
      joints: armR === 'wave_b' ? { chest: o(0, -1), head: o(1, 0) } : {},
      face: i % 4 === 3 ? 'happy' : 'neutral',
      breath: i % 4 === 1 ? 1 : 0,
    }),
  ),
};
