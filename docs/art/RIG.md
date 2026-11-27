# Pixmates rig spec (M-ART phase 2, ADR 004 / 009)

The shared rig every built-in character is generated from. Code: `assets-src/rig/` (layout in «Code layout»),
bodies in `assets-src/characters/<id>/` (from MA-27). Plan: `docs/plans/2026-11-23-m-art.md`. Per-character specs:
`docs/art/kitsune.md`, `docs/art/goth.md`, `docs/art/witch.md` (D-17 adds ronin, knight).

## Code layout (MA-28 refactor 2026-11-24, sprites byte-identical)
| file | owns |
|---|---|
| `types.ts` | rig contract: views, joints, pose frame, `RigAnim`, `Body`, `BodyView`, opt-in shapes |
| `body.ts` | rest layouts `REST` / `REST_Q34` (`restOf(view)`), joint resolution |
| `validate.ts` | `validateBody` (every authored mask, opt-in ramps / shades, per-view parts, faces, hat / skirt / hair-cut / cloak / prop / collar / split bounds, `HEM_LIFT_MAX`) |
| `views.ts` | `bodyViewOf`, `headViewOf`, `animFacing`, `usesView` (re-exported by compose) |
| `cloak.ts` | cloak slot: `cloakGeometry` (per-frame px + tones), `cloakPart`, `cloakTones` |
| `compose.ts` | `createRigRenderer` + `createRigPack`; `renderLabeled` = ordered steps: layers → compose → tone passes → `stampAuthored` → leg passes → outline / AA / rim → arm over torso → quantize / squash / seams; `validateBody` (every authored mask incl. front bib/ties and sash knots; shade opt-ins 0..5); `animFacing` |
| `chains.ts` | looped verlet chains per animation (side locks, fox tail, scarf ends) + procedural part builders (back hair, tails, scarf ends, legs, skirt / shorts, torso, arms) |
| `passes.ts` | `stampMask` and the buffer / image passes (shin wraps, far-leg gap, knee creases, far-shoulder clip, chin fists, spade notches, apron panel, arm over torso, sleeve/hair line, hand over ties, labels, squash separator, seam closer) |
| `part-ids.ts` | `PART_ID` table, `LABEL_OF`, part sets (`SLEEVE_PARTS`, `TORSO_PARTS`, `LEG_PARTS`, …); no bare part numbers elsewhere |
| `faces/stern.ts` | stern-look kit (MA-62): `STERN_FACE`, `sternFace(overrides)`; rules in `face.ts` `sternProblems` |
| `face.ts`, `checks.ts`, `style.ts`, `q34.ts`, `dummies.ts`, `anims/` | face library + validator, arm-over-torso check, SOFT preset, q34 masks for dummies only, review bodies, shared poses |
| `layout.ts` | `RigLayout` (frame, rests, arm / leg shapes, torso + hem geometry, cloak bound, face rules); one layout `LAYOUT` (48 × 56, MA-61) |

## D-20 (ADR 012, 2026-11-25): chibi 48 × 56 is the only layout
The adult layer was **removed in MA-61** (2026-11-25; git history keeps it, last at 2ce10fa): `LAYOUT_ADULT`,
`Body.layout` / `build`, `anims/adult.ts`, `dummies-adult.ts`, `ADULT_PROP`, two-segment limbs, adult face rules,
`WALK_TRAVEL.adult`, `--adult` sheets. `RigLayout` stays with one layout (`LAYOUT`). D-19 opt-ins after the MA-69
cleanup (2026-11-27, all packs byte-identical): **kept** `Body.kote` (ronin, vampire) and front `masks.hairBack`
(coder, knight); **deleted** (no pack used them; git history keeps them, last at 428288c) `Prop.over`, `Body.tamoto`,
`skirtSplit.notchHalf`, `skirtSplit.q34.clear`, `Cloak.hem.wisps`, `Body.hakama` (+ `HAKAMA_DROP_MAX`, `skirtRampOf`),
`Body.despeckle`.
New opt-ins (D-20, unset = byte-identical):
- **`Body.face.style: 'stern'`** (MA-62) — shared kit `rig/faces/stern.ts`; `validateFace` stern rules (ART-BIBLE
  §11.9): lid covers the iris top row on stern expressions, ≥ 3 iris rows visible, brows present with inner end 1 row
  lower on the stern set and not on happy / worried / startle / petted / sleep, blush px only on `happy` / `petted` (MA-64 round 1).
- **`Body.mask` {front, q34, down, downQ34?, downExpressions}** (MA-63) — mouth mask stamped after face parts, part id
  16 (`mask`, label none); hides every mouth px; `down` mask at the neck joint on `downExpressions` frames; validator:
  mask px inside the head contour, ≥ 1 skin row under the iris, `talk_a/b/c` differ outside the mouth rows.
- **Armour as built (MA-65):** authored masks, not procedural plates — `Body.torsoMask` (dō, from the chest joint,
  part torso, never over an arm), `Body.tassets` {front, seated?} (kusazuri from the hip joint over hem + legs, part hem,
  never over an arm; `seated` on sit/curl frames; no hip-lag dangle yet), `Body.sode` (square plate from the near
  shoulder joint, mirrored onto the far shoulder in front, stamped as the upper-arm sleeve part), per-view copies in
  `BodyView` (q34 sode = near only), and `kote.both` (the other forearm too, no studs). Tests `rig-armour.test.ts`.
- **Armour** (MA-65, ronin; knight/coder reuse): `Body.puff` (shoulder plates; knight R3) with `square` shape and lace
  rows; `Body.torsoMask` (= coder R-C3 `Body.front`: authored torso overlay on the chest/hip joints, part 7, for dō
  plates + lacing); `Body.tassets` (authored hip mask over the hem per view + seated variant, dangle ±1 px on hip lag).

MA-69 polish opt-ins (unset = byte-identical, tests in `rig-optins.test.ts`):
- **`SilhouetteOutline.head` {lit?, shade?}** — outer-outline px whose inner neighbour is a head-mask px (still
  unlabelled: no arm / torso drew over it) take these tones instead of the ramp's `lit` / `shade`. coder: onyx hood
  shade side 4 (body-wide 4 would fail the arm-over-torso gate).
- **`Body.shortsFlareQ34: false`** (`hem: 'shorts'`) — the q34 seat's trailing hem corner sits under the waist
  corner (no pose flare, hem trail or trailing flare): a straight back edge, trousers not a skirt. coder jeans.

## Part ids (`rig/part-ids.ts`, written per px by compose and `stampMask`)
| id | part | id | part |
|---|---|---|---|
| 0 | none / unlabelled (e.g. fist-to-jaw break) | 9 / 10 / 11 | near (L) arm: upper, fore, end (cuff + hand + chin fist) |
| 1 | back hair, side locks | 12 | scarf ends (not torso/trim: the separator ignores them) |
| 2 | fox tail, spade tube | 13 | q34 far leg with `BodyView.farLegShade` |
| 3 | legs (front both; q34 near, and far without `farLegShade`) | 19 / 20 / 21 | far (R) arm, as L |
| 4 | hem: skirt + lace + apron panel, or shorts | 7 | bodice + neck (+ apron bib) |
| 8 | trim: waist band, sash knot, collar accessory | 14 / 15 | cloak / hip prop + dangle (label none) |

`LABEL_OF` maps sleeve / end / torso / trim ids to the arm-over-torso check labels; every other id is `none`.

## Frame and sizing
> **D-20 / ADR 012: the numbers below are current** (ADR 011's 56 × 72 is void).

- **Frame 48 × 56.** The figure box is 48 × 48 (feet on row 46, row 47 free for the outline). The frame adds
  **8 rows of headroom on top** (`RIG_H = 56`), so feet stay on the same row and the extra rows are only headroom.
- **Why 56.** H is the smallest of 52 / 56 / 60 that keeps row 0 transparent in every frame of every body. Measured on
  the review bodies: the highest opaque px is figure row −5 (fox ears + outline at the happy apex, root −4 with a
  1-frame head lag; the maid's horns reach −4; the witch hat apex the same −5, R-W2). With 52 that is row −1 (clipped), with 56 row 3. The test
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
| `head_acc` | `horns`, `fox_ears`, `clip`, `hat` | ears are stamped under the head mask, a clip or hat over it (a hat hides the crown: the head mask leaves the rows under the cone blank); antenna in M3 |
| `hair_back` | `short` (shoulder), `long` (waist) | below the temples it lags the head by one frame; side locks are chains |
| `torso` | bodice | top on the chest joint, bottom on the hip (breathing never opens the waist) |
| `arms` | mitten biped; `sleeves: short / long` | long = sleeve to the wrist + bell cuff, hand skin always visible |
| `legs` | `biped` | wheel legs: M3, contract only |
| `hem` | `skirt` (+ lace), `shorts` | `dx` lag, `flare`, `lift` per frame; tailored shorts via `Body.shorts` |
| `back` | `none`, `spade_tail`, `fox_tail`, `cloak` | spade = authored curve with tip lag; fox = chain (default 4 segments, per body `Body.foxTail`), pale tip, no fur noise; cloak = «Cloak slot» below (MA-29b) |
| `neck_acc` | `bow`, `choker`, `scarf`, `collar` | authored masks on the neck joint; scarf adds chain ends (`ScarfEnds`); `collar` (mantle) is mask-only and never stamped over arm px (coder's `hood` = later alias) |

## Body (`assets-src/characters/<id>/body.ts`)
`Body` in `types.ts`: id (`pixmates.<id>`), outfit (mask slot → ramp), ramps per material, variants, head mask +
band row, face library, masks (shoe, head_acc, neck_acc, spade), optional horn outline ramp and `tweaks` (rest
offsets per joint). A body never forks an animation; proportions go through `tweaks` only.

## Body opt-ins (MA-27/28; all optional, unset = maid/dummy output unchanged; tests `tests/unit/art/rig-optins.test.ts`)
| field | effect |
|---|---|
| `Body.scarf` / `BodyView.scarf` (`ScarfEnds`) | required with `neckAcc: 'scarf'` (build throws without). Two 2-segment chains, 2 px wide, part 12, hung from `at` (neck joint; front under the knot, q34 at the nape trailing); `lengths` = drawn length incl. the stroke cap; end points capped at chest row + `maxBelowChest` (default `SCARF_MAX_BELOW_CHEST` 5); q34 ends trail ≤ `maxTrail` px (default `SCARF_MAX_TRAIL` 6) and draw over the near arm. Knot + band = the authored neck_acc mask |
| `Body.foxTail` (`FoxTail`) | per-body fox tail (default = dummy-b's). `front`: verlet chain from the back joint, `radii.length − 1` segments of `length`, `gravity` sets the rest direction, `bend` px per point (S-curve, tip curl), `root` (default [1, 1]), `shine` = lit stroke (tail shade 5) on the upper-left edge. `q34`: fixed centre line `points` (trailing = −x), tip swings against `hairDx`. Pale tip = second stroke over the last `tipRadii.length` points. `ribbon {ramp, shade}` (MA-69, kitsune): a 1-row, 3-px band across the tube just before the pale tip (both views, over the shine, hidden when tucked); on squash/stretch frames it slides down the line off the waist rows the squash drops/repeats |
| `Body.shorts` {shade, raise} | tailored shorts (`hem: 'shorts'`): clothAlt shade (0..5, default 3), hem raised `raise` rows; front adds a 1-px notch between the legs + 1-px outward flare at each leg hem |
| `Body.shinWrap` {row, shade?} | darker legs-ramp row `row` rows above each foot joint (shade 0..5, default `WRAP_SHADE` 3), leg px only (near and far) |
| `Body.sash` {rows, knot, dy?} + `BodyView.sashKnot` | waist sash band `rows` high (default 1), `dy` whole rows lower (0..`SASH_DY_MAX` 3) + knot mask on the near hip (from the hip joint, trim part 8); q34 knot per view, default none |
| `BodyView.farLegShade` | q34 far leg in that legs shade (0..5), part 13, shade-0 px where it touches the near leg (two pale shins never merge on contact frames) |
| `Body.hairBackStretch` | back-hair length below the temples as a factor (default short 1 / long 1.45; ≈ 0.2 = short mop ending at the nape) |
| `Body.sideLocks` | procedural side-lock chains (default true); false = the head mask's own short locks only |
| `FacePart.irisRows` | eyes with 1-px pupils: the rows `irisShift` moves (glance / `irisDx`), the pupil's lighter ink end `x` moves with the iris; default = rows with a 2-px `XX` pupil |
| `Body.dressShade` | bodice + skirt base shade on the cloth ramp (default 3); `dressShade` + breath glow 0.4 must stay on the ramp |
| `Body.sleeveOverHand` (MA-29) | long sleeves only: bell cuff over the hand (1–2 fingertip px; raised, it slides back to the long-sleeve cuff spot, 2–3 px of hand); the think chin fist becomes the `paw` mask with no procedural cuff/hand |
| `Body.cuff` {ramp, shade} (MA-29) | bell-cuff ramp + whole shade (default clothAlt 3); the hem lace keeps clothAlt |
| `Body.silhouetteOutline` [{ramp, lit, shade}] (MA-29) | outer-outline px of each listed ramp (once each) take whole shade `lit` on the top-left, `shade` elsewhere (dark ramps never melt into dark backdrops) |
| `Body.sleeveRim` (MA-29) | whole sleeve-ramp shade on the near (L) sleeve's outer edge only; the far (R) sleeve never |
| `Body.jawOverNeckAcc` (MA-33, vampire) | neck-accessory px (still trim) 4-touching a head skin px are cleared and unlocked before the outline, so the jaw takes its outer outline there as over an empty backdrop; the cheek contour moves only with the head when the head bobs against a collar whose tips sit under the jaw |
| `Body.lockLean` (MA-29) | side-lock chain points between root and tip on one straight line (no outward kink) |
| `BodyView.hairTipLag` (MA-29, q34) | back-hair tips add the previous frame's `hairDx`, capped at `HAIR_TIP_MAX` 2 px |
| `headAcc: 'hat'` (MA-29a, R-W1) | stamped like `clip` (over the head mask); `validateBody` bounds per view: ≤ `HAT_MAX` 28 × 10 px, rest top ≥ figure row −1 (outline −2, highest pose +3 → apex frame row 3 = kitsune ears), inside the frame width; needs a `headAcc` mask |
| `masks.headAccRising` / `BodyView.masks.headAccRising` (MA-29a, R-W3) | alternate head-accessory mask (same size as `headAcc`) stamped on frames whose drawn head (fx anchor after squash) is higher than on the previous frame (loops wrap, one-shot frame 0 never): a hat tip droops 1 row while rising, back to rest on landing; no chain, deterministic |
| `Body.skirtRaise` (MA-29a) | skirt hem raised whole rows (0..`SKIRT_RAISE_MAX` 3, `hem: 'skirt'` only) so more legwear shows |
| `Body.legRim` (MA-29a) | whole legs-ramp shade on each leg's lit (screen-left) edge px (left neighbour not a leg px); shin wraps paint over it |
| `Body.greaves` {lit, mid, shade, spec} (MA-69, knight) | final pass (after rim) over the visible procedural leg px: per row of each leg the contour px stay, inner px run `lit` → `mid` → `shade` from screen-left, one `spec` px per leg (first inner px of its top visible row); shades may reach a 7-tone ramp's top |
| `Body.sabatons` {top, max, spec, seam, rim} (MA-69 re-gate, knight) | final pass after rim + `greaves` over each stamped shoe (`RigRenderer.shoes`): rim lift removed, tones ≤ `max` except one authored `spec` px (toe-cap corner), outline px beside a shoe ≤ `seam`; the top row one run `top[0]` (lit half, rounded up) → `top[1]`, one step darker on a shoe without a spec px (q34 far), `seam` px at both ends; the row above the run ± 1 (opaque shoe/legs-ramp px) = `seam`; leg rim kept only on the outer (screen-right) leg's right edge, ≤ `rim` px from the top |
| `head.hemTones` {rows, slot, tones} (MA-69, knight) | the head mask's last `rows` rows paint `slot` px with `tones` (`StampOptions.toneRows`): a mail hem reaches a ramp step the slot's six tones skip, the rest of the head keeps the outfit tones |
| `BodyView.hairBackCuts` {rows, nape?} (MA-29a, q34) | clump tips on the trailing back-hair edge: per row (offset from the head joint, 0..24, ≤ 4 rows) the outermost hair px is cleared and the row above gets a 1-px outward flick; `nape` (offset from the neck) darkens back-hair px touching the torso/collar to shade 0 |
| `Body.cloak` (MA-29b, R1) | required with `back: 'cloak'`; see «Cloak slot» |
| `Body.prop` / `BodyView.prop` (MA-29b, R2) | authored mask on the hip joint (part 15) stamped only over empty / cloak / tail / hair / prop px (depth behindTorso: under torso, hem, legs, arms); optional `dangle` sub-mask offset ±1 px by hip lag + `hairDx`; q34 poses need `views.q34.prop` |
| `Body.skirtSplit` {rows, shade, notch?, notchShade?, hemHalf?, pleats?, rim?} (MA-29b, R4) | front: 1-px cloth-ramp centre line `rows` (≤ 12) up from the hem; `notch` cuts a 2-px gap that many rows up between the legs; `notchShade` fills the gap (legs / cloak / empty) with that cloth shade; `hemHalf` (6..10, default 10, both views) = straight trapezoid hem; `pleats` {offsets, shade, lit?} = 1-px lines mirrored about the split (+ lit px left of the screen-left ones); `rim` {shade, lit} = 2-step screen-left skirt edge (lit on outward steps). All final + locked |
| `Body.skirtSplit.q34` {rows, notch, passNotch, pleat?} (MA-29b round 2) | q34 two leg panels: on contact frames (feet ≥ `SPLIT_Q34_CONTACT_DX` 4 px apart) a 1-px split line `rows` (≤ 8) up the leg gap (hip → mid-feet) + a 2-px `notch` (notchShade) + the bottom 2 hem rows of the front panel 1 px forward / back panel 1 px back; passing frames get `passNotch` only; `pleat` = 1 near-leg (L) line in that cloth shade |
| `BodyView.masks.hairBack` (MA-29b round 1) | authored back hair (from the head joint, final tones, stamped like `hairFar`: over the cloak, under head / neck / torso, kept through rim light); replaces the procedural back-hair mass on frames whose head uses the view (`hairBackStretch` is then moot) |
| `Cloak.innerShade` (MA-29b round 1) | cloak px 4-touching skirt / leg px take this shade: a 1-px inner shadow column so a pale cloak never fuses with the skirt |
| `Prop.dangle.overHem` (MA-29b round 1) | the dangle is stamped over the skirt / legs (never over arms) instead of behind the torso |
| `headAccRising` view rule | never swaps on a frame whose body or head view differs from the previous frame (turn f0 → f1) |
| `Body.skirtLace` (MA-29b) | false = no petticoat lace; the plain cloth runs to the same hem length |
| `hemLiftOf(body, p)` | pose `hem.lift` + `skirtRaise` (skirt) / `shorts.raise`; used by skirt, shorts and the seated skirt knee; sum ≤ `HEM_LIFT_MAX` 5 |
| `Body.visor` {up, upQ34?, down, downQ34?, slit?, slitQ34?, downIn} (MA-67, D-22) | movable face cover (knight's helmet visor), part 16, all masks from the head joint (author in head-mask coordinates). `downIn` = animation → `'all'` or frame indices (`visorIsDown`, `rig/views.ts`): on those frames no face part is stamped, `down` covers every skin px of the head mask and `slit[expression]` adds the eye-slit glints; on every other frame `up` is stamped over the helmet and must not cover a face part. q34 masks are required when q34 poses show the head; never together with `Body.mask`. Tests `rig-visor.test.ts` |
| `Body.gauntlets` {ramp} (MA-67, D-22) | every arm-end px on the skin ramp (procedural hands, think chin fists) moves to `ramp` at the same shade, locked (`gauntletTones`) |
| `Body.sleeve`, `Body.chinHand`, `Body.apron` (+ `ties`), `hornOutline`, `BodyView.{sleeveHairLine, hideFarShoulder, masks.hairFar}` | see «Arm over torso», «Views» |

### Cloak slot (`back: 'cloak'`, `rig/cloak.ts`; ronin, vampire later)
One general panel behind everything (incl. the q34 far arm/leg), both views. `Cloak`: `ramp`, `shade`, `litShade` (screen-left
edge column), `top` (rows from the shoulder line), `hemRow` (rows below the hip), `widths {top, hem, shape: bell|column, taper?}`
(half-widths; `taper` (MA-69, vampire, front only): bottom-third rows above the hem row sit `taper` px in per side, the hem row keeps its width, the lining keeps its inset), `shoulder: square|round`, `hem {lobes (0 = straight), cornerDrop, curl, curlShade}`, `bands [{row, shade}]`
(rows above the hem, ends inset 2 px, may be empty), `dither {rows, shades}` (cloak-local, interior px only), `lining {ramp,
shade, corner [w, h]}` + `flareRows` (extra lining rows on hairLift / squash), `maxTrail` (default `CLOAK_MAX_TRAIL` 2). Per frame:
front hem sways with hip lag + `hairDx` (≤ maxTrail, sheared from 0 at the top), lifts 1 on `hairLift`, widens by squash; seated
hem ≤ seat + `CLOAK_SEAT_HEM` 3 (feet always show); dangling legs: straight, `CLOAK_DANGLE_NARROW` 2 px narrower per side; q34
trails left from a leading edge 3 px ahead of the chest axis, the hem foreshortened to 0.85 and trailing by the previous
frame's |hairDx| + hip lag (≤ maxTrail). Tones are final and locked after the masks (a cloak px left with no cloak
4-neighbour is cleared). Bounds in `validate.ts` (`CLOAK_MAX`).

Post-squash separator pass: squash > 0 can join a sleeve px to the bodice, so the separator runs again after the
squash rows (`squashSeparator`). Test hooks: `RigRenderer.tail()` / `scarfEnds()`.

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
Parts (eyes, brows, mouths, cheeks), each `{mask, at}` on the face anchor; an expression picks one of each (brows may also use hair tones, a brow end fading into the fringe gap — MA-29a). Required
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
≈ 1.35 MB RGBA; after MA-42: 56 × 72 × 105 → ≈ 1008 × 432, ≈ 1.74 MB), manifest passes `manifestSchema` + `checkStrips`, two builds → same hashes. Frame names
`<pack>/<anim>/<nn>` in errors.

## Review commands
`pnpm sprites:sheet --review` (dummies + maid preview), `pnpm sprites:preview --review` (real-size APNGs on 4
backdrops), `pnpm sprites:sheet --fx` (FX sheet + marks on the review bodies) → `reports/sprites/`.
