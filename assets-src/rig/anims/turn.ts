// turn (2 @ 10, one-shot; ADR 010): front → three-quarter facing screen-right. f0 = the front body with the q34 head
// and eyes leading (head first; the irises 1 px toward the facing), f1 = the q34 rest stance (the body follows). M1 plays it forward before travel and
// reversed after it (frame order is renderer logic); left = runtime mirror.
import type { RigAnim } from '../types.ts';
import { frame } from './kit.ts';

export const TURN: RigAnim = {
  name: 'turn',
  fps: 10,
  loop: false,
  frames: [frame({ view: 'front', headView: 'q34', irisDx: 1 }), frame({ view: 'q34' })],
};
