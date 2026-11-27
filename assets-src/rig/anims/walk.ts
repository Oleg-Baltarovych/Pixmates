// walk (8 @ 10), three-quarter view facing screen-right (ADR 010; left = runtime mirror). The stride runs fore/aft
// along x: an 8-px contact stride (near foot forward on frame 0, far foot forward on frame 4); the stance foot stays
// on the ground for 5 frames and slides back an even 2 px per frame (in place; M1 moves the sprite at
// `WALK_TRAVEL`, src/content/stage.ts), the swing foot lifts 1–2 px and on the passing frames (2 / 6) sits 1 px
// behind the planted one, toe tipped down (compose). Back-hair tips trail 1 px on the passing frames (half a step
// out of phase with the hem), the tail tip swings against them. 1-px body bob down on contact. Head steady (owner): root dx = 0
// and head-x − hip-x constant in every frame; the head only follows the bob one frame late (≤ 1 px vertical). Arms
// swing fore/aft against the legs (near arm in front of the torso, far hand peeking out); the hem trails 1 px on the
// passing frames; hair, locks and tail carry the follow-through. The front walk is retired (Q-D16-1).
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

const BOB = [1, 1, 0, 0, 1, 1, 0, 0] as const;
/** Foot x about the body axis (x = 24): stance 0–4 slides back, swing 5–7 returns forward; R runs 4 frames later. */
const STRIDE = [4, 2, 0, -2, -4, -3, -1, 2] as const;
const LIFT = [0, 0, 0, 0, 0, -1, -2, -1] as const;
/** Back-hair tips trail on the passing frames and return on the next ones. */
const HAIR = [0, 0, -1, 0, 0, 0, -1, 0] as const;
/** Hem trail (screen-left) on the passing frames. */
const HEM = [0, 0, -1, 0, 0, 0, -1, 0] as const;
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

/** q34 rest feet sit 1 px either side of the axis (REST_Q34): the stride is measured from the axis. */
const FOOT_REST = { L: -1, R: 1 } as const;

export const WALK: RigAnim = {
  name: 'walk',
  fps: 10,
  loop: true,
  frames: BOB.map((bob, i) =>
    frame({
      view: 'q34',
      root: o(0, bob),
      joints: {
        // The head follows the bob one frame late (vertical only, never sideways).
        head: o(0, at(BOB, i - 1) - bob),
        footL: o(at(STRIDE, i) - FOOT_REST.L, at(LIFT, i)),
        footR: o(at(STRIDE, i + 4) - FOOT_REST.R, at(LIFT, i + 4)),
      },
      armL: at(ARM_L, i),
      armR: at(ARM_R, i),
      hem: { dx: at(HEM, i) },
      hairDx: at(HAIR, i),
    }),
  ),
};
