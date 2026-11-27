// sleep (8 @ 3): dozing seated (the sit_edge lower body, same seat anchor), slumped — the torso leans 1 px aside and
// 1 px down, arms limp on the thighs, head bowed further; slow breathing, closed eyes (Zzz is an FX mark).
import type { RigAnim } from '../types.ts';
import { frame, o } from './kit.ts';
import { SEATED } from './sit_edge.ts';

const BREATH = [0, 1, 0, 1, 0, 1, 0, 0] as const;
const RISE = [0, 0, -1, -1, -1, 0, 0, 0] as const;

export const SLEEP: RigAnim = {
  name: 'sleep',
  fps: 3,
  loop: true,
  anchor: 'seat',
  frames: BREATH.map((b, i) =>
    frame({
      ...SEATED,
      arms: 'limp',
      face: 'sleep',
      joints: { chest: o(1, 1 + (RISE[i] ?? 0)), head: o(1, 1) },
      breath: b,
    }),
  ),
};
