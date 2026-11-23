# Pixmates rig spec (M-ART phase 2, ADR 004 / 009)

The shared rig every built-in character is generated from. Code: `assets-src/rig/` (types, body, compose, face,
style, `anims/`), bodies in `assets-src/characters/<id>/` (from MA-27). Plan: `docs/plans/2026-11-23-m-art.md`.

## Frame and sizing
- **Frame 48 × 56.** The figure box is 48 × 48 (feet on row 46, row 47 free for the outline). The frame adds
  **8 rows of headroom on top** (`RIG_H = 56`), so feet stay on the same row and the extra rows are only headroom.
- **Why 56.** H is the smallest of 52 / 56 / 60 that keeps row 0 transparent in every frame of every body. Measured on
  the review bodies: the highest opaque px is figure row −5 (fox ears + outline at the happy apex, root −4 with a
  1-frame head lag; the maid's horns reach −4). With 52 that is row −1 (clipped), with 56 row 3. The test
  `tests/unit/art/rig.test.ts` re-measures this and fails if H is no longer the smallest fit.
- **`scaleRef` 48** in every built-in manifest: sizing uses the standing figure, not the frame, so S/M/L stay
  ×3/×4/×5 at 1080p / 125 % (SPEC §5.1, ADR 009). The 25 % work-area clamp also measures `scaleRef` (headroom rows
  are transparent); with the full 56 the L preset would drop to ×4 on the owner's laptop.
- Pivot at the feet `anchor (0.5, 1)`; `sit_edge` has a per-animation `anchor` on the seat joint (≈ 0.5, 0.866).

## Coordinates and joints
- 48-px figure units, origin top-left of the figure box; body axis x = 24 on a pixel boundary (left/right mirror).
- Joints (parent → child): root → hip → {seat, chest, footL/R}; chest → {back, neck, shoulderL/R}; neck → head →
  {face, acc, fx}; shoulder → hand. Rest positions = the 48-soft spike geometry (`REST` in `body.ts`).
- A pose offset on a joint moves it and all its children. `legs: 'stand'` keeps the feet planted on the ground row
  (root motion does not move them); `dangle`, `sit`, `curl` hang the feet from the hip.
- Arms are variants (elbow + hand from the shoulder, right arm mirrored): `down`, `swing_fwd`, `swing_back`, `up`,
  `wave_a/b`, `hug`, `flail`, `out`, `chin`, `chest`, `knees`, `talk`, `edge`, `hang` (drag: straight down from
  raised, 1-px-wider shoulders, hand splayed 1 px out — never at the collar), `limp` (sleep: hand resting on the
  thigh), `fold` (think: forearm across the waist propping the chin elbow). Raised hands stay outside the head mask
  (x ≤ 10 / ≥ 38), because masks are stamped over the procedural parts; the `chin` fist is the exception — an
  authored fist mask stamped after the head at cols 10–13 / 34–37 so it breaks the cheek edge at the jaw, with a
  dark knuckle column toward the face and, on long sleeves, a cuff row under it.
- Seated legs (`sit`, `sit_edge`): front view with the thighs toward the viewer — hem lifted 2 px (`hem.lift`), a
  1-px knee bump just under the hem per leg, short foreshortened shins (foot at hip + 6.4), toes pointed down 1 px
  (the shoe mask gets its sole row again minus the outer px). `dangle` (drag) points the toes too.
- Side locks below their root trail the head by ≤ 1 px from the previous frame (walk, drag), on top of the chain.

## Views (D-16, ADR 010 accepted; implemented MA-27b…d, maid signed off 2026-11-24)
- **`front`** = every pose above. **`q34`** = three-quarter, authored facing screen-right; left = runtime mirror
  about x = 24. M-ART q34 poses: `walk` (front walk retired), `turn` (2 frames: f0 front body + q34 head, f1 q34
  rest). M1: `run`, `climb`. All other poses stay front.
- **Pose frame fields** (`rig/types.ts`): `view` (body view, default `front`); `headView` (head leads the body, turn
  f0); `irisDx: 1` (irises 1 px toward screen-right, lashes/shine stay; turn f0); `hairDx: −1|0|1` (back-hair tips,
  full at the tips; the tail tip swings the other way); `tailTucked` (turn f0: no tube, spade tip under the hem
  centre, fox tail hidden — the tail never jumps sides between front and q34). Manifest facing is derived, never
  authored: `animFacing()` (`rig/compose.ts`) = `right` when any frame's body is q34; a leading q34 head alone stays
  `front`.
- **Rest `REST_Q34`** (`rig/body.ts`, via `restOf(view)`): head joint = hip x − 1 (behind the axis: back-of-head
  hair overhangs behind, the face never juts past the chest; owner, MA-27d); face anchor = head + 2 relative to
  front (absolute +1); chest/hip axis unchanged; near shoulder (L) 1 px out, far (R) 2 px in and 1 row lower; tail
  root 2 px trailing; feet 1 px either side of the axis. Constant in every frame (steady-head rule): poses never
  move head-x − hip-x.
- **Depth (`order: 'q34'`):** far arm + far leg (R) → back hair / tail / `hairFar` → near leg → hem → apron ties →
  torso → near arm (L). Far leg, far shoe and far hand one ramp step darker.
- **Body `views.q34`** (`BodyView`): `{ head, face, masks { headAcc?, neckAcc?, shoe, hairFar? }, apron?,
  sleeveHairLine?, hideFarShoulder?, tweaks? }`; required when any q34 pose is built.
  - `masks.hairFar`: authored far-lock sliver beyond the far jaw (frames the facing-side contour); when set, the
    procedural back hair keeps clear of the facing side under the jaw (only the nape shows).
  - `sleeveHairLine` (opt-in ramp): hair px touching the near sleeve take shade 1 — a 1-px line so a puff never
    melts into a lock of similar value (maid: plum vs lilac).
  - `hideFarShoulder` (opt-in): far upper-arm px down to `FAR_SHOULDER_CLIP_ROWS` (2) under the shoulder joint are
    not drawn — the far puff sits behind neck and collar; needed when no back-hair mass covers it (e.g. `hairFar`).
  - `Apron.ties`: waist bow at the small of the back, trailing (q34 only), placed from the hip; painted over the
    skirt, never over the arms; a hand crossing them gets a 1-px skin-dark (shade 1) edge, ties keep their tones.
  - Head mask: fringe parted toward facing, far lock hidden behind the cheek, near lock full; horns near full / far
    shorter behind the skull; fox ears near full, far 2 px narrower and 1 px lower. Clip on the near side (swaps when
    mirrored). Neck accessory and bib 1 px narrower toward facing; apron panel 8 px; shoe = 5-px side shoe.
- **q34 face contour** (gated in `tests/unit/art/maid.test.ts`; owner rounds MA-27d): no cheekbone bump; from eye
  level down the facing-side skin edge is monotonic — never steps out, steps in ≤ 1 px per row — to a 1-px chin
  point ahead of the face centre; q34 skin width per row ≤ front skin width; on walk frames the facing overhang of
  the head past the torso ≤ the back overhang + 4 px.
- **Procedural view params:** bodice half-width near 4.8 / far 3.6 (`curveX` centre +1); hem flare trails; back hair
  mass +2 px trailing; tail behind the body; scarf ends and side locks trail by chain.
- **q34 walk (accepted, 8 @ 10):** 8-px contact stride fore/aft (near foot forward f0, far f4); stance foot planted 5
  frames, sliding back 2 px/frame in place — M1 moves the sprite at `WALK_TRAVEL` (`src/content/stage.ts`, 2 px/frame
  = 20 px/s); swing foot lifts 1–2 px, on passing frames (2 / 6) 1 px behind the planted one, toe down. 1-px bob
  down on contact, head follows 1 frame late (≤ 1 px vertical). Root dx = 0, head-x − hip-x constant. Arms swing
  fore/aft against the legs; hem and back-hair tips trail 1 px on the passing frames, tail tip against them.
- **Face `face.q34`:** exactly `neutral` + `blink`; near eye full, far eye 1 px narrower; blush on the near cheek.
- **Glance rule** (`irisShift` / `onlyIrisDiffers`, `rig/face.ts`): `glance` and `irisDx` move only iris/pupil px
  below the lash row, 1 px toward screen-right within each eye (same px count); lash row, outline and shine stay.
- **Gates on q34 frames:** headroom (row 0 transparent), seams, `validateFace` per view, `armTorsoContrast` (far arm
  behind the torso: separator on its visible edge; arm-end rule only when ≥ 3 sleeve px show), mirror test (exact
  column flip, same alpha count), the contour rules above.

## Slots and variants
| slot | variants | notes |
|---|---|---|
| `head` | authored mask per character | skull, fringe, crown, side locks; horns live in it when `head_acc = horns` |
| `head_acc` | `horns`, `fox_ears`, `clip` | ears are stamped under the head mask, a clip over it; antenna in M3 |
| `hair_back` | `short` (shoulder), `long` (waist) | below the temples it lags the head by one frame; side locks are chains |
| `torso` | bodice | top on the chest joint, bottom on the hip (breathing never opens the waist) |
| `arms` | mitten biped; `sleeves: short / long` | long = sleeve to the wrist + bell cuff, hand skin always visible |
| `legs` | `biped` | wheel legs: M3, contract only |
| `hem` | `skirt` (+ lace), `shorts` | `dx` lag, `flare`, `lift` per frame |
| `back` | `none`, `spade_tail`, `fox_tail` | spade = authored curve with tip lag; fox = 4-segment chain, pale tip, no fur noise |
| `neck_acc` | `bow`, `choker`, `scarf` | authored masks on the neck joint |

## Body (`assets-src/characters/<id>/body.ts`)
`Body` in `types.ts`: id (`pixmates.<id>`), outfit (mask slot → ramp), ramps per material, variants, head mask +
band row, face library, masks (shoe, head_acc, neck_acc, spade), optional horn outline ramp and `tweaks` (rest
offsets per joint). A body never forks an animation; proportions go through `tweaks` only.

## Pose (`assets-src/rig/anims/<anim>.ts`, shared by all bodies)
Per frame: `root {dx, dy}`, `joints?` offsets, `parts {armL, armR, legs, hem?}`, `face` (expression id), `squash`
−2…+2 (whole rows removed / duplicated at the waist row, no resampling), `breath` 0|1 (sub-pixel chest colour
shift), `order?` (`arms_front`, `arm_l_back`, `arm_r_back`, `arms_back`), `impulse?` (chain kick), `hairLift?` 1 (back hair below the temples + side locks float 1 px: happy apex). `frame({...})` in
`anims/kit.ts` fills defaults. The 15 animations and their budget (103 frames): idle_a 8@6, idle_b 12@6, walk 8@10,
sit_edge 6@6, sleep 8@3, drag 4@8, fall 4@10, land 4@10, talk 6@8, think 8@6, happy 6@8, worried 8@6, wave 8@8,
petted 8@8, startle 5@10. Drop order if art rounds overrun: idle_b → petted → startle. D-16 (MA-27c): `walk`
becomes q34 and `turn` 2@10 joins → 16 animations, 105 frames.
- Walk: 1-px bob (down on contact and recoil), sideways weight shift, contact foot planted, arms counter-swing, head
  and hem lag the body by exactly one frame. Happy: anticipation squash → stretch → apex −4 (head lags) → landing
  squash → settle.

## Arm over torso (rule + check)
Wherever an arm overlaps or touches the torso (bodice, neck, waist band), in front or behind:
1. **Value step.** The sleeve has its own ramp/tone (`Body.sleeve: {ramp?, shade?}`; default = cloth ramp shade 2,
   one under the bodice's 3; on the bodice ramp a shade < 1 step away throws). After lighting, the last tone pass
   steps sleeve fill px next to the separator away from the bodice px across it until OKLab ΔL ≥ 0.06.
2. **Separator.** The sleeve px touching a torso px takes shade 0 of its ramp (the deepest outline tone).
3. **Arm end.** ≥ 2 visible px of hand skin or cuff on every arm that crosses the torso; long sleeves never swallow
   the hand. Bare forearms (short sleeves) count as arm end.

Check: `createRigRenderer(body).renderLabeled()` returns the frame plus a part-label map (sleeve L/R, end L/R,
torso); `armTorsoContrast` (`assets-src/rig/checks.ts`) measures, on the final frame: edge = sleeve px 4-adjacent to
torso; separator share (edge px in a ramp's index-0 colour, ≥ 95 %); ΔL samples = |OKLab L| of the sleeve fill px
one step inside the separator vs the torso px across it, **10th percentile ≥ 0.05**; arm-end px per crossing arm
≥ 2. Shoulder seam (MA-27): collar accessory (neck_acc, part 8) and waist band are labelled **trim**; the same
ΔL samples against trim px are reported separately (`trimP10`, ≥ 0.05) and the composer's step pass keeps sleeves
apart from them. `tests/unit/art/rig.test.ts` runs it on every frame of every pose of `pixmates.maid` and the review bodies;
`node tools/rig-contrast.ts [<body id>]` prints the per-pose numbers.

## Composite order
back (tail) → hair_back + side locks → legs → hem → neck + bodice + waist band → arms (by `order`) → compose (light,
texture, AO, dither) → masks stamped and locked: neck_acc, head_acc (ears) / head (+ forehead band) / head_acc
(clip), face parts (never over hair), chin fist, spade, shoes → outline on the whole composite → horn outline
recolour → selective outline → AA → masks restored → rim → arm-over-torso step + separator → quantize → squash
rows → seam closer (enclosed gaps ≤ 3 px take
the darkest neighbour colour; larger enclosed spaces are intentional negative space).

## Face library (`assets-src/characters/<id>/face.ts`, format in `rig/face.ts`)
Parts (eyes, brows, mouths, cheeks), each `{mask, at}` on the face anchor; an expression picks one of each. Required
expressions: `neutral`, `blink`, `half`, `talk_a/b/c`, `happy`, `worried`, `think`, `sleep`, `startle`, `petted`,
`wince`. `validateFace` fails the build on a missing expression, an unknown part, a non-face slot (allowed: ink,
eye, blush, skin, trim, apron) or a face px that lands on a hair px of the head mask. Optional `raisedMouth` per
expression = the mouth on frames with both arms `up` (maid: open D-mouth on the happy jump, closed smile on the ground).
Done in MA-27c (shared, art-director LATER on maid): required `glance` (neutral, irises 1 px toward screen-right,
glance rule in «Views») on one `idle_a` frame; `chin` fist 1 px toward its own arm with a 2-px darker outline break at the jaw (+ optional 1-px
knuckle highlight); `pointToe` adds a 1-px light toe highlight (`sit_edge`).
Spade tail (MA-27): a 2-tone tube (top px of each column light, rest base; no light/dither noise) that follows the hip
one frame late (tip = full previous-frame hip offset); the spade mask carries its own light upper rim.

## FX marks (`assets-src/fx/marks.ts` → `resources/fx/`)
sweat, vein, blush (3-row hatching), eyes_happy (^), eyes_startle (>), zzz, heart, question, exclaim, smoke. Frame
16 × 16, marks ≤ 7 × 7 (zzz and smoke drift over the frame), ≤ 6 frames, 1-px outline per mark (ink marks get a
cream outline for dark IDEs). Atlas 96 × 160, `fxManifestSchema`. Built by `pnpm sprites`; not shipped
(electron-builder copies only `resources/characters`) and not loaded until M1. The `fx` joint (head + 9, −9) is the
mark anchor; it is exported per frame to the sheet tool now, and reaches the manifest/IPC in M1.

## Builder checks (`tools/lib/sprites.ts`)
Palette-only px, binary alpha, non-empty, frame size, **row 0 transparent** (`headroom`), frame counts = pose
lengths, shelf atlas ≤ 1024² (first-fit decreasing, longest strips first; 48 × 56 × 103 frames → 1008 × 336,
≈ 1.35 MB RGBA), manifest passes `manifestSchema` + `checkStrips`, two builds → same hashes. Frame names
`<pack>/<anim>/<nn>` in errors.

## Review commands
`pnpm sprites:sheet --review` (dummies + maid preview), `pnpm sprites:preview --review` (real-size APNGs on 4
backdrops), `pnpm sprites:sheet --fx` (FX sheet + marks on the review bodies) → `reports/sprites/`.
