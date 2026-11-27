// worried (8 @ 6): hands clasped at the chest, head lowered, shallow quick breaths, a foot shuffle.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const low = (extra = {}) => ({ head: o(0, 1), ...extra });
const base = { arms: 'chest', face: 'worried' } as const;

export const WORRIED: RigAnim = {
  name: 'worried',
  fps: 6,
  loop: true,
  frames: [
    frame({ ...base, joints: low() }),
    frame({ ...base, joints: low(), breath: 1 }),
    frame({ ...base, joints: low({ chest: o(0, -1) }) }),
    frame({ ...base, joints: low({ chest: o(0, -1) }), breath: 1 }),
    frame({ ...base, joints: low({ footR: o(0, -1) }) }),
    frame({ ...base, joints: low(), breath: 1 }),
    frame({ ...base, joints: low({ chest: o(0, -1) }) }),
    frame({ ...base, joints: low() }),
  ],
};
