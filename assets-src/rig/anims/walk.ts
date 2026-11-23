// walk (8 @ 10): a real stride — the feet spread 4 px on the contact frames (0, 4) and pass under the hip with the
// swing foot lifted (2, 6); 1-px body bob down on contact, 1-px head drop on the passing frames, sideways weight
// shift, loose arm counter-swing beside the torso (never across it). The head and the hem lag the body by one frame;
// the side locks trail the head by 1 px (compose), hair follows through by chain.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const BOB = [1, 1, 0, 0, 1, 1, 0, 0] as const;
const SWAY = [0, 1, 1, 1, 0, -1, -1, -1] as const;
/** Half the extra foot spread (each foot moves out by this much). */
const SPREAD = [2, 1, 0, 1, 2, 1, 0, 1] as const;
const LIFT_L = [0, -1, -2, -1, 0, 0, 0, 0] as const;
const LIFT_R = [0, 0, 0, 0, 0, -1, -2, -1] as const;
const DROP = [0, 0, 1, 0, 0, 0, 1, 0] as const;
const ARM_L = [
  'swing_back',
  'swing_back',
  'down',
  'swing_fwd',
  'swing_fwd',
  'swing_fwd',
  'down',
  'swing_back',
] as const;
const ARM_R = [
  'swing_fwd',
  'swing_fwd',
  'down',
  'swing_back',
  'swing_back',
  'swing_back',
  'down',
  'swing_fwd',
] as const;
const at = <T>(list: readonly T[], i: number): T => list[(i + list.length) % list.length] as T;

export const WALK: RigAnim = {
  name: 'walk',
  fps: 10,
  loop: true,
  frames: BOB.map((bob, i) =>
    frame({
      root: o(at(SWAY, i), bob),
      joints: {
        // 1-frame lag: the head sits where the body was in the previous frame; it dips 1 px on the passing frame.
        head: o(at(SWAY, i - 1) - at(SWAY, i), at(BOB, i - 1) - bob + at(DROP, i)),
        footL: o(-at(SPREAD, i), at(LIFT_L, i)),
        footR: o(at(SPREAD, i), at(LIFT_R, i)),
      },
      armL: at(ARM_L, i),
      armR: at(ARM_R, i),
      hem: { dx: at(SWAY, i - 1) - at(SWAY, i) },
    }),
  ),
};
