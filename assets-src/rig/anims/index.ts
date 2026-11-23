// The 15 shared animations (plan M-ART MA-25, frame budget in the plan), authored once and played by every body.
// Drop order if art rounds overrun: idle_b → petted → startle (their fallbacks: idle_a, happy, worried).
import type { RigAnim } from '../types.ts';
import { DRAG } from './drag.ts';
import { FALL } from './fall.ts';
import { HAPPY } from './happy.ts';
import { IDLE_A } from './idle_a.ts';
import { IDLE_B } from './idle_b.ts';
import { LAND } from './land.ts';
import { PETTED } from './petted.ts';
import { SIT_EDGE } from './sit_edge.ts';
import { SLEEP } from './sleep.ts';
import { STARTLE } from './startle.ts';
import { TALK } from './talk.ts';
import { THINK } from './think.ts';
import { WALK } from './walk.ts';
import { WAVE_ANIM } from './wave.ts';
import { WORRIED } from './worried.ts';

export const ANIMS: readonly RigAnim[] = [
  IDLE_A,
  IDLE_B,
  WALK,
  SIT_EDGE,
  SLEEP,
  DRAG,
  FALL,
  LAND,
  TALK,
  THINK,
  HAPPY,
  WORRIED,
  WAVE_ANIM,
  PETTED,
  STARTLE,
];
