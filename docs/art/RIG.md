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
shift), `order?` (`arms_front`, `arm_l_back`, `arm_r_back`, `arms_back`), `impulse?` (chain kick). `frame({...})` in
`anims/kit.ts` fills defaults. The 15 animations and their budget (103 frames): idle_a 8@6, idle_b 12@6, walk 8@10,
sit_edge 6@6, sleep 8@3, drag 4@8, fall 4@10, land 4@10, talk 6@8, think 8@6, happy 6@8, worried 8@6, wave 8@8,
petted 8@8, startle 5@10. Drop order if art rounds overrun: idle_b → petted → startle.
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
≥ 2. `tests/unit/art/rig.test.ts` runs it on every frame of every pose of the three review bodies;
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
eye, blush, skin, trim, apron) or a face px that lands on a hair px of the head mask.

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
