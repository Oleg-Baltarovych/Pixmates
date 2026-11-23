// sit_edge (6 @ 6): seated on a window edge (pivot = seat joint, manifest per-animation `anchor`), front view with
// the thighs toward the viewer: hem lifted 2 px, two 1-px knee bumps at the hem, short foreshortened shins past the
// edge, toes pointed down, the feet swinging 1 px in opposite phase, hands on the edge, breathing.
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';

/** The whole seated figure sits 2 px higher than the standing one, so the hanging shoes stay inside the frame. */
export const SEATED = { root: o(0, -2), legs: 'sit' } as const;
const SWING_L = [0, -1, -1, -1, 0, 0] as const;
const SWING_R = [-1, 0, 0, 0, -1, -1] as const;
const CHEST = [0, 0, 0, -1, 0, 0] as const;
const BREATH = [0, 0, 1, 0, 0, 1] as const;

export const SIT_EDGE: RigAnim = {
  name: 'sit_edge',
  fps: 6,
  loop: true,
  anchor: 'seat',
  frames: SWING_L.map((l, i) =>
    frame({
      ...SEATED,
      arms: 'edge',
      hem: { lift: 2 },
      joints: { chest: o(0, CHEST[i] ?? 0), footL: o(0, l), footR: o(0, SWING_R[i] ?? 0) },
      breath: BREATH[i] ?? 0,
    }),
  ),
};
