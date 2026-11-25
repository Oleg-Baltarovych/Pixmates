// Adult pose tables (plan M-ART D-19 MA-45, ADR 011): the 16 shared animations re-posed for the 56 × 72 adult layout
// (≈ 1.33× the legacy figure, two-segment limbs), per build. Same names, fps, loop, anchor and frame counts as the
// legacy tables in this folder (those stay byte-identical for the chibi packs); only the poses differ. Arm and leg
// shapes come from the adult layout (`RigLayout.arms`, `legs`, `knee`); per-frame knee nudges via `PoseFrame.knees`.
// Art-director motion round 1 (MA-45): contrapposto idles, fist-pump happy, crouched land, seated feet apart /
// crossed, chin-on-collar sleep, drag with one knee up, neck / hip hands, walk passing frames.
import { LAYOUT_ADULT } from '../layout.ts';
import type { Body, BodyBuild, Joint, Offset, PoseFrame, RigAnim } from '../types.ts';
import { DRAG } from './drag.ts';
import { HAPPY } from './happy.ts';
import { IDLE_A } from './idle_a.ts';
import { IDLE_B } from './idle_b.ts';
import { ANIMS } from './index.ts';
import { frame, o } from './kit.ts';
import { LAND } from './land.ts';
import { PETTED } from './petted.ts';
import { SIT_EDGE } from './sit_edge.ts';
import { SLEEP } from './sleep.ts';
import { THINK } from './think.ts';
import { WALK } from './walk.ts';
import { WORRIED } from './worried.ts';

type Joints = Partial<Record<Joint, Offset>>;
type Knees = NonNullable<PoseFrame['knees']>;

const at = <T>(list: readonly T[], i: number): T => list[(i + list.length) % list.length] as T;

// ---- walk (8 @ 10, q34) ----------------------------------------------------------------------------------------------

/**
 * Adult stride: a 16-px contact stride (foot x about the body axis ±8); the stance foot stays planted for 5 frames and
 * slides back an even 4 px per frame (`ADULT_STRIDE_SLIDE` = `WALK_TRAVEL.adult.pxPerFrame`), the swing foot returns
 * forward lifted 2–3 px; on the passing frames (2 / 6) it is 2 px behind the planted ankle, lifted 3, with its knee
 * nudged (`PASS_KNEE`) to 2 px ahead of the stance knee. R runs 4 frames later.
 */
export const ADULT_STRIDE = [8, 4, 0, -4, -8, -6, -2, 5] as const;
export const ADULT_STRIDE_SLIDE = 4;
const LIFT = [0, 0, 0, 0, 0, -2, -3, -1] as const;
/** Swing-knee x nudge on the passing frame: the two-segment chord alone puts it ≈ 6 px ahead. */
export const PASS_KNEE = -2.8;
/** 1-px bob down on the contact frames (the spread legs), up on the passing ones; the head follows 1 frame late. */
const BOB = [1, 1, 0, 0, 1, 1, 0, 0] as const;
/** Female hip sway (1 px) under a steady upper body: the hip shifts, the chest shifts back. */
export const ADULT_HIP_SWAY = [0, 1, 1, 0, 0, -1, -1, 0] as const;
const HAIR = [0, 0, -1, 0, 0, 0, -1, 0] as const;
const HEM = [0, 0, -1, 0, 0, 0, -1, 0] as const;
/** q34 far-hand nudge per walk frame (back-swing frames 3–5; rig-contrast far-hand rule, art round 2 F6). */
const FAR_HAND_PEEK: Readonly<Record<number, readonly [number, number]>> = { 3: [5, 0], 4: [5, 0], 5: [5, 0] };

function walkFrames(build: BodyBuild): PoseFrame[] {
  const q = LAYOUT_ADULT[build].restQ34;
  const axis = q.hip[0];
  // Stride x is about the axis on the contact row; the q34 rest feet stand near −3 / far +3 (far 1 row up).
  const rest = { L: [q.footL[0] - axis, 0], R: [q.footR[0] - axis, q.footR[1] - q.footL[1]] } as const;
  return BOB.map((bob, i) => {
    const s = build === 'female' ? at(ADULT_HIP_SWAY, i) : 0;
    const legacy = WALK.frames[i];
    const passL = at(ADULT_STRIDE, i) === -2;
    const passR = at(ADULT_STRIDE, i + 4) === -2;
    const knees: Knees | undefined = passL ? { L: o(PASS_KNEE, 0) } : passR ? { R: o(PASS_KNEE, 0) } : undefined;
    return frame({
      view: 'q34',
      root: o(0, bob),
      joints: {
        ...(s !== 0 ? { hip: o(s, 0), chest: o(-s, 0) } : {}),
        // Far hand on the back-swing frames: nudged forward past the hakama edge so ≥ 2 × 2 px + the cuff show.
        ...(FAR_HAND_PEEK[i] ? { handR: o(FAR_HAND_PEEK[i][0], FAR_HAND_PEEK[i][1]) } : {}),
        head: o(0, at(BOB, i - 1) - bob),
        footL: o(at(ADULT_STRIDE, i) - rest.L[0], at(LIFT, i) - rest.L[1]),
        footR: o(at(ADULT_STRIDE, i + 4) - rest.R[0], at(LIFT, i + 4) - rest.R[1]),
      },
      ...(knees ? { knees } : {}),
      armL: legacy?.parts.armL ?? 'down',
      armR: legacy?.parts.armR ?? 'down',
      hem: { dx: at(HEM, i) },
      hairDx: at(HAIR, i),
    });
  });
}

// ---- idle contrapposto ----------------------------------------------------------------------------------------------

/** Weight foot at axis ±5, free foot ∓8, hip 1 px toward the weight leg, head back on the axis, free shoulder +1 row. */
export function contrapposto(build: BodyBuild, weight: 'L' | 'R'): Joints {
  const dx = LAYOUT_ADULT[build].rest.footR[0] - LAYOUT_ADULT[build].rest.hip[0];
  const w = weight === 'R' ? 1 : -1;
  return {
    hip: o(w, 0),
    head: o(-w, 0),
    footR: o(w === 1 ? 5 - dx : 8 - dx, 0),
    footL: o(w === 1 ? dx - 8 : dx - 5, 0),
    ...(w === 1 ? { shoulderL: o(0, 1) } : { shoulderR: o(0, 1) }),
  };
}

/** The legacy frame (face, breath, arms) with the root reset and the adult joints (+ its chest rise). */
const withJoints = (p: PoseFrame, extra: Joints): PoseFrame => {
  const chest = p.joints?.chest;
  return { ...p, root: o(0, 0), joints: { ...extra, ...(chest ? { chest } : {}) } };
};

const idleA = (build: BodyBuild): PoseFrame[] => IDLE_A.frames.map((p) => withJoints(p, contrapposto(build, 'R')));

/** idle_b: the weight shifts from the right leg to the left over 2 frames (hip +1 → 0 → −1) and holds. */
const idleB = (build: BodyBuild): PoseFrame[] =>
  IDLE_B.frames.map((p, i) =>
    withJoints(p, i < 2 ? contrapposto(build, 'R') : i === 2 ? {} : contrapposto(build, 'L')),
  );

// ---- seated (sit_edge, sleep) -------------------------------------------------------------------------------------

/**
 * Seated adult: standing root (the long shins hang inside the frame), knees on the seat row, hem lifted 4 rows.
 * Never feet together: male knees ±5 / feet ±7, the near (L) foot 2 px lower; female knees ±6 (round 2: the shins
 * keep a 1–2 px gap under the hem, two legs at 1×) closing to the ankles, which meet and overlap only in the bottom
 * rows (the left foot at axis −0.5, the right at axis +0.5 and 1 row higher).
 */
export const ADULT_SEATED = { root: o(0, 0), legs: 'sit', hem: { lift: 4 } } as const;
interface SeatLegs {
  readonly feet: { readonly L: readonly [number, number]; readonly R: readonly [number, number] };
  readonly knees: Knees;
}
const SEAT_LEGS: Readonly<Record<BodyBuild, SeatLegs>> = {
  male: { feet: { L: [-3, 1], R: [3, -1] }, knees: { L: o(1.4, 0), R: o(-1.4, 0) } },
  female: { feet: { L: [3.5, 0], R: [-3.5, -1] }, knees: { L: o(-2.6, 0), R: o(2.6, 0) } },
};
const SIT_CHEST = [0, 0, 0, -1, 0, 0] as const;
const SIT_BREATH = [0, 0, 1, 0, 0, 1] as const;
/** The hanging feet swing 1 px in opposite phase. */
const SWING_L = [0, -1, -1, -1, 0, 0] as const;
const SWING_R = [-1, 0, 0, 0, -1, -1] as const;

const seatedFeet = (build: BodyBuild, l = 0, r = 0): Joints => {
  const s = SEAT_LEGS[build];
  return { footL: o(s.feet.L[0], s.feet.L[1] + l), footR: o(s.feet.R[0], s.feet.R[1] + r) };
};

const sitFrames = (build: BodyBuild): PoseFrame[] =>
  SWING_L.map((l, i) =>
    frame({
      ...ADULT_SEATED,
      arms: 'edge',
      joints: { chest: o(0, at(SIT_CHEST, i)), ...seatedFeet(build, l, at(SWING_R, i)) },
      knees: SEAT_LEGS[build].knees,
      breath: at(SIT_BREATH, i),
    }),
  );

/**
 * Seated doze: chest +2 / +1 aside, head o(2, 3) with the chin on the collar, the near hand limp on the thigh, the far
 * one slid 2 px off it toward the seat edge.
 */
const SLEEP_RISE = [0, 0, -1, -1, -1, 0, 0, 0] as const;
const sleepFrames = (build: BodyBuild): PoseFrame[] =>
  SLEEP.frames.map((p, i) =>
    frame({
      ...ADULT_SEATED,
      arms: 'limp',
      face: 'sleep',
      joints: { chest: o(1, 2 + at(SLEEP_RISE, i)), head: o(2, 3), handR: o(2, 0), ...seatedFeet(build) },
      knees: SEAT_LEGS[build].knees,
      breath: p.breath,
    }),
  );

// ---- happy, land, drag ------------------------------------------------------------------------------------------------

/** Fist pump, no jump: crouch (knees out 1), rise onto the toes (root −1) pumping the near fist, hold, settle. */
const happyFrames: PoseFrame[] = [
  frame({ root: o(0, 1), knees: { L: o(-1, 0), R: o(1, 0) }, face: 'happy', hem: { flare: 1 } }),
  frame({ root: o(0, -1), armL: 'pump', armR: 'chest', face: 'happy', impulse: { x: 0, y: 1 } }),
  frame({ root: o(0, -1), armL: 'pump', armR: 'chest', face: 'happy', breath: 1 }),
  frame({ joints: { chest: o(0, 1) }, armR: 'chest', face: 'happy' }),
  frame({ face: 'happy' }),
  frame({ face: 'happy', breath: 1 }),
];

/** Landing crouch: hip +3 with the knees out 2, chest +1, arms out low for balance; then +2, +1, rest. */
const landFrames: PoseFrame[] = [
  frame({
    root: o(0, 3),
    knees: { L: o(-2, 0), R: o(2, 0) },
    joints: { chest: o(0, 1), handL: o(0, -2.5), handR: o(0, -2.5) },
    arms: 'out',
    face: 'wince',
    hem: { flare: 1 },
    impulse: { x: 0, y: 2 },
  }),
  frame({ root: o(0, 2), knees: { L: o(-1, 0), R: o(1, 0) }, arms: 'out', face: 'blink' }),
  frame({ root: o(0, 1), knees: { L: o(-1, 0), R: o(1, 0) }, impulse: { x: 0, y: -1 } }),
  frame({}),
];

/** Held by the scruff: shoulders −3, head +1, arms hanging out, the left knee up 2 and its foot 2 px in, 1 row up. */
const DRAG_SWING = [-1, 0, 1, 0] as const;
const dragFrames: PoseFrame[] = DRAG_SWING.map((s, i) => {
  const lag = at(DRAG_SWING, i - 1) - s;
  return frame({
    root: o(s, -2),
    legs: 'dangle',
    arms: 'hang',
    joints: {
      shoulderL: o(-1, -3),
      shoulderR: o(1, -3),
      head: o(0, 1),
      footL: o(lag + 2, -1),
      footR: o(lag, 0),
    },
    knees: { L: o(0, -2) },
    squash: -1,
    hem: { dx: lag },
    face: 'worried',
  });
});

// ---- think, worried, petted --------------------------------------------------------------------------------------

/** Chin fist on the left (the prop hangs on the right hip), head tilted 1 px toward it, the right forearm folded. */
const thinkFrames: PoseFrame[] = THINK.frames.map((p) => ({
  ...p,
  parts: { ...p.parts, armL: 'chin', armR: 'fold' },
  joints: { head: o(-1, 0) },
}));

/** One hand to the back of the neck, the other on the hip; head down 1, eyes to the side on the middle frames. */
const worriedFrames: PoseFrame[] = WORRIED.frames.map((p, i) => ({
  ...p,
  parts: { ...p.parts, armL: 'neck', armR: 'hip' },
  face: i >= 2 && i <= 5 ? 'think' : 'worried',
}));

/**
 * Petted (round 2, distinct from worried): both arms down, the shoulders up 1 (an enjoying shrug), the head tilted
 * 1 px toward the near (L) side — pressed 1 lower on the nuzzle frames — with the closed `petted` ^^ eyes and blush.
 */
export const PETTED_SHRUG = -1;
const pettedFrames: PoseFrame[] = PETTED.frames.map((p) => ({
  ...p,
  parts: { ...p.parts, armL: 'down', armR: 'down' },
  joints: {
    shoulderL: o(0, PETTED_SHRUG),
    shoulderR: o(0, PETTED_SHRUG),
    head: o(-1, p.joints?.head?.dy ?? 0),
  },
}));

function adultAnims(build: BodyBuild): readonly RigAnim[] {
  const overrides = new Map<string, readonly PoseFrame[]>([
    [WALK.name, walkFrames(build)],
    [IDLE_A.name, idleA(build)],
    [IDLE_B.name, idleB(build)],
    [SIT_EDGE.name, sitFrames(build)],
    [SLEEP.name, sleepFrames(build)],
    [DRAG.name, dragFrames],
    [HAPPY.name, happyFrames],
    [LAND.name, landFrames],
    [THINK.name, thinkFrames],
    [WORRIED.name, worriedFrames],
    [PETTED.name, pettedFrames],
  ]);
  return ANIMS.map((a) => {
    const frames = overrides.get(a.name);
    return frames ? { ...a, frames } : a;
  });
}

/** Adult tables per build (turn, fall, talk, wave, startle keep the legacy offsets on the adult arm shapes). */
export const ANIMS_ADULT: readonly RigAnim[] = adultAnims('male');
export const ANIMS_ADULT_FEMALE: readonly RigAnim[] = adultAnims('female');

/** The pose tables a body plays: legacy bodies the legacy `ANIMS`, adult bodies their build's adult tables. */
export const animsFor = (body: Pick<Body, 'layout' | 'build'>): readonly RigAnim[] =>
  body.layout !== 'adult' ? ANIMS : body.build === 'female' ? ANIMS_ADULT_FEMALE : ANIMS_ADULT;
