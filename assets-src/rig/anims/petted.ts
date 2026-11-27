// petted (8 @ 8): hugging itself, ^^ with strong blush, the head pressed down and nuzzling, small scrunches.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const base = { arms: 'hug', face: 'petted' } as const;
const press = { head: o(-1, 1) };

export const PETTED: RigAnim = {
  name: 'petted',
  fps: 8,
  loop: true,
  frames: [
    frame({ ...base }),
    frame({ ...base, joints: press }),
    frame({ ...base, joints: press, squash: 1 }),
    frame({ ...base, breath: 1 }),
    frame({ ...base }),
    frame({ ...base, joints: press }),
    frame({ ...base, joints: press, squash: 1 }),
    frame({ ...base, breath: 1 }),
  ],
};
