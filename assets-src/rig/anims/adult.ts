// Adult pose tables (plan M-ART D-19 MA-45, ADR 011): the 16 shared animations re-posed for the 56 × 72 adult layout
// (≈ 1.33× the legacy figure, two-segment limbs). Same names, fps, loop, anchor and frame counts as the legacy
// tables in this folder (those stay byte-identical for the chibi packs); only the joint offsets differ. Arm and leg
// shapes are already per layout (`RigLayout.arms`, `legs`, `knee`), so most anims only re-tune offsets here.
import type { Body, PoseFrame, RigAnim } from '../types.ts';
import { DRAG } from './drag.ts';
import { ANIMS } from './index.ts';
import { frame, o } from './kit.ts';
import { SIT_EDGE } from './sit_edge.ts';
import { SLEEP } from './sleep.ts';
import { WALK } from './walk.ts';

const at = <T>(list: readonly T[], i: number): T => list[(i + list.length) % list.length] as T;

// ---- walk (8 @ 10, q34) ----------------------------------------------------------------------------------------------

/**
 * Adult stride: a 16-px contact stride (foot x about the body axis ±8); the stance foot stays planted for 5 frames and
 * slides back an even 4 px per frame (`ADULT_STRIDE_SLIDE` = `WALK_TRAVEL.adult.pxPerFrame`), the swing foot returns
 * forward lifted 2–3 px (the knee bends by the two-segment chord, `kneeOf`) and on the passing frames (2 / 6) sits
 * 1 px behind the planted one. R runs 4 frames later.
 */
export const ADULT_STRIDE = [8, 4, 0, -4, -8, -6, -1, 5] as const;
export const ADULT_STRIDE_SLIDE = 4;
const LIFT = [0, 0, 0, 0, 0, -2, -3, -1] as const;
/** 1-px bob down on the contact frames (the spread legs), up on the passing ones; the head follows 1 frame late. */
const BOB = [1, 1, 0, 0, 1, 1, 0, 0] as const;
/** Female hip sway (1 px) under a steady upper body: the hip shifts, the chest shifts back. */
export const ADULT_HIP_SWAY = [0, 1, 1, 0, 0, -1, -1, 0] as const;
const HAIR = [0, 0, -1, 0, 0, 0, -1, 0] as const;
const HEM = [0, 0, -1, 0, 0, 0, -1, 0] as const;
/** q34 adult rest feet sit 1 px either side of the axis (LAYOUT_ADULT restQ34). */
const FOOT_REST = { L: -1, R: 1 } as const;

const walkFrames = (sway: boolean): PoseFrame[] =>
  BOB.map((bob, i) => {
    const s = sway ? at(ADULT_HIP_SWAY, i) : 0;
    const legacy = WALK.frames[i];
    return frame({
      view: 'q34',
      root: o(0, bob),
      joints: {
        ...(s !== 0 ? { hip: o(s, 0), chest: o(-s, 0) } : {}),
        head: o(0, at(BOB, i - 1) - bob),
        footL: o(at(ADULT_STRIDE, i) - FOOT_REST.L, at(LIFT, i)),
        footR: o(at(ADULT_STRIDE, i + 4) - FOOT_REST.R, at(LIFT, i + 4)),
      },
      armL: legacy?.parts.armL ?? 'down',
      armR: legacy?.parts.armR ?? 'down',
      hem: { dx: at(HEM, i) },
      hairDx: at(HAIR, i),
    });
  });

// ---- seated (sit_edge, sleep) -------------------------------------------------------------------------------------

/**
 * Seated adult: the figure keeps its standing root (the long shins hang inside the frame), the knees on the seat row,
 * the hem lifted 4 rows so it ends at the knees (thighs toward the viewer).
 */
export const ADULT_SEATED = { root: o(0, 0), legs: 'sit', hem: { lift: 4 } } as const;
const SIT_CHEST = [0, 0, 0, -1, 0, 0] as const;
const SIT_BREATH = [0, 0, 1, 0, 0, 1] as const;
/** The hanging feet swing 1 px fore/aft in opposite phase (front view: up/down). */
const SWING_L = [0, -1, -1, -1, 0, 0] as const;
const SWING_R = [-1, 0, 0, 0, -1, -1] as const;

const sitFrames: PoseFrame[] = SWING_L.map((l, i) =>
  frame({
    ...ADULT_SEATED,
    arms: 'edge',
    joints: { chest: o(0, at(SIT_CHEST, i)), footL: o(0, l), footR: o(0, at(SWING_R, i)) },
    breath: at(SIT_BREATH, i),
  }),
);

/** Seated doze: the torso slumps 2 px and leans 1 px aside, the head bows 1 px more, hands limp on the thighs. */
const SLEEP_BREATH = [0, 1, 0, 1, 0, 1, 0, 0] as const;
const SLEEP_RISE = [0, 0, -1, -1, -1, 0, 0, 0] as const;
const sleepFrames: PoseFrame[] = SLEEP_BREATH.map((b, i) =>
  frame({
    ...ADULT_SEATED,
    arms: 'limp',
    face: 'sleep',
    joints: { chest: o(1, 2 + at(SLEEP_RISE, i)), head: o(1, 1) },
    breath: b,
  }),
);

// ---- drag ----------------------------------------------------------------------------------------------------------

/** Held up by the scruff: the adult shoulders rise 2 px (legacy 1), the feet and hem lag the cursor by a frame. */
const DRAG_SWING = [-1, 0, 1, 0] as const;
const dragFrames: PoseFrame[] = DRAG_SWING.map((s, i) => {
  const lag = at(DRAG_SWING, i - 1) - s;
  return frame({
    root: o(s, -2),
    legs: 'dangle',
    arms: 'hang',
    joints: { shoulderL: o(-1, -2), shoulderR: o(1, -2), footL: o(lag, 0), footR: o(lag, 0) },
    squash: -1,
    hem: { dx: lag },
    face: 'worried',
  });
});

const OVERRIDES: ReadonlyMap<string, readonly PoseFrame[]> = new Map([
  [WALK.name, walkFrames(false)],
  [SIT_EDGE.name, sitFrames],
  [SLEEP.name, sleepFrames],
  [DRAG.name, dragFrames],
]);

const adultAnims = (overrides: ReadonlyMap<string, readonly PoseFrame[]>): readonly RigAnim[] =>
  ANIMS.map((a) => {
    const frames = overrides.get(a.name);
    return frames ? { ...a, frames } : a;
  });

/**
 * Adult tables per build. The other anims (idle_a / idle_b, turn, fall, land, talk, think, happy, worried, wave,
 * petted, startle) keep the legacy offsets: they are 1-px moves (breath, tilt, sway) or root hops that read at the
 * adult size, and their arm / leg shapes come from the adult layout.
 */
export const ANIMS_ADULT: readonly RigAnim[] = adultAnims(OVERRIDES);
export const ANIMS_ADULT_FEMALE: readonly RigAnim[] = adultAnims(
  new Map([...OVERRIDES, [WALK.name, walkFrames(true)]]),
);

/** The pose tables a body plays: legacy bodies the legacy `ANIMS`, adult bodies their build's adult tables. */
export const animsFor = (body: Pick<Body, 'layout' | 'build'>): readonly RigAnim[] =>
  body.layout !== 'adult' ? ANIMS : body.build === 'female' ? ANIMS_ADULT_FEMALE : ANIMS_ADULT;
