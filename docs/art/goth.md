# goth — design spec (MA-29)

Originality gate: **PASS** (art-director, 2026-11-24). Owner decisions 2026-11-24: tonal plum hem lace (not cream),
opaque black tights. Brief: ART-BIBLE §9, costume recipe §11.8, black rule R6. A stylized archetype, not a portrait:
no tattoos or identifying details, no reference images. Frame 48 × 56, chibi ≈ 2.2 heads.

## D-20 stern pass + richness (MA-64; re-sign-off; everything not listed stays as signed off 2026-11-24)
- **Stern face** (`face.style: 'stern'`, ART-BIBLE §11.9): keep the flat thick lash (already covers the iris top
  row); highlight 1 × 2 → 1 × 1; **brows visible** through two fringe gaps (2nd and 3rd splits), hair_black 1, inner
  end 1 row lower; neutral mouth = the half-smile becomes a **smirk** (2-px `XX` + 1-px corner up on screen-right,
  no skin softener); **no `ff` blush in neutral** (petted only). Happy / startle / worried / petted as §4 but brows
  must flatten or invert (validator). Lifts the §4 «brows hidden» rule for goth.
- **Richness** (§12): layers — dress + a **leather corset belt** over the bodice waist (`sash` rows 3, `leather_black`
  or `cloth_black` 1 with a soft 1-px sheen at shade 4, the 3-rung tonal lacing ladder restored on it) + the long
  sleeves; signature — moth clip + choker (kept); materials — cloth, lace, leather, metal (2 pewter buckle px on the
  corset, `metal_steel` 5; never a cross or ankh); trims at 1× — corset lacing whole px.
- Gates: maid/kitsune/witch/fx bytes unchanged; ≤ 2 art rounds; owner sees round 1.
- **Art-director round 1 (2026-11-25):** eye, brows, blush and mouth items applied; the belt is **deleted** (AD
  fallback): a 4-row cincher does not fit the chibi waist without moving the signed-off choker + garnet drop, and the
  waist-band rows below are the skirt flare. No `leather_oxblood` ramp added (nothing would use it). The garnet gap
  test now measures from the lowest iris row. **Owner 2026-11-25:** the lower-lid px are removed (at 1× they read as eye
  bags or tears); **goth signed off**.
- **Implementation deviations (MA-64, before art round 1; the belt items are superseded above):** no `leather_black` / `metal_steel` ramps exist, so the belt
  is `cloth_black` 1 with a `D` (shade 4) sheen and the buckle is 2 cream px (`cloth_cream` 4/5); the belt sits on the
  default waist-band rows (the garnet drop reaches row 29 on bowed frames, so the belt's top centre is left open and
  the lacing is one `wWw` rung over `v` cord px, not a 3-rung ladder); the smirk keeps the signed-off lip-tone corner
  (`z`, art round 2 test) instead of an ink px; petted keeps its glance but under the soft pre-D-20 lash (the stern
  validator requires the lid to break on petted); happy loses its blush (stern rule: petted only).

## Lookalikes checked
Highest risks: **Shinobu Kocho** (moth clip vs butterfly pin) and **Kuroneko** (black hair + gothic dress). Also:
Kurumi Tokisaki, Yor Forger, Wednesday Addams, Mikasa, Rory Mercury, Akame, Black Rock Shooter, Raven, Marceline,
Suigintou, Hotaru Tomoe, Ruby Rose, Homura Akemi, Yuno Gasai, Nico Robin, Ai Enma, Kaguya Shinomiya, Hinata, Komi
Shouko, Misa Amane, Nana Osaki, Reze, Death of the Endless, Lydia Deetz, Morticia, Hex Maniac, Sadako.
Hard rules:
- moth seen from above at rest (swept-back delta wings, fuzzy 1-px body, feathered antennae), dusty ivory/tan
  (`horn`), never an upright round-winged butterfly, never purple/pink; no gradient hair tips, no haori, no wing
  pattern on clothes;
- no hime cut: bangs are pointed clumps of uneven length, side locks taper to points; no mole;
- no twin-tails/drills, clock, eyepatch, red or heterochromatic eyes, red ribbons/ties/scarf, crosses, ankh,
  orb/padlock/pull-ring on the choker, hood, forehead gem (the only gem is at the throat), headband/hairband, wings,
  scythe/halberd/umbrella/blades/axe;
- hair stops at the hip, never in front of the face in any pose (not Sadako), warm skin (never grey-blue);
- the angel ring never forms one continuous band across the head (Homura headband read);
- no white collar + braids, no centre part, not floor length; no "crazy eyes" in any expression.

## 1. Silhouette
Smooth round dome with one moth bump on one side; long hair + A-line skirt make a soft triangle; bell sleeves add
width at the arms.
- **Back hair**: `hairBack: 'long'`, default stretch 1.45, tips at the hip (≈ row 35, never below the hip joint),
  2–3 pointed clumps, never a blunt curtain. Front: the mass shows 2–3 px each side of the shoulders and behind the
  arms. q34: mass trails behind (rig shifts it 2 px), tips follow `hairDx` with a 1-frame lag ≤ 2 px; authored
  `masks.hairFar` sliver as for maid/kitsune, `hideFarShoulder` if the far puff shows.
- **Not Sadako**: hair never over the face (sleep and slump included), forehead band + ≥ 1 skin row above the lash,
  angel ring and pointed clumps keep it groomed, length capped at the hip, upright posture.
- **Bangs**: 4 pointed clumps, tip lengths ≈ 6/8/7/5 rows (centre-left longest, §11.4), parting off-centre toward
  the facing side, splits in `j`; they hide the brows in neutral, tips exactly 1 skin row above the lash.
- **Side locks** (front): 2–3 px wide, tapering to a 1-px point at the chest row (≈ 27), tip curls 1 px inward,
  ≥ 1 px clear of the choker drop; existing lock chains, lag ≤ 1 px.
- **Moth clip** (`headAcc: 'clip'`, horn letters, `hornOutline: 'hair_black'`): front 7 × 4 on the screen-left
  crown-temple (head rows ≈ 3–6), over the fringe root, never at ear height:
  ```
  .n...n.   feathered antennae (horn 1)
  UUonoUU   forewings, body n on the centre column
  .uoNou.   wings taper; o = 1-px wing spot
  ..o.o..   hindwing tips
  ```
  q34: same (near) side, 5 × 4, rotated ~20° with the wings swept back toward the nape, framed by hair; mirror swap
  accepted. ≥ 2 px of hair between the clip and the near lock root.
- **Dress**: fitted bodice, `hem: 'skirt'` at the rig default length (A-line, just below the knee, 3–4 px of shin),
  folds deepen to the hem; hem lace = 1-row tonal scallop (`cloth_black` 4–5, owner Q1); never floor length,
  pannier or bell; q34 flare trails.
- **Sleeves past the hands**: `sleeves: 'long'` + R1. Bell cuff flares 1 px past the wrist and covers the hand,
  1-px cream lace edge, only 1–2 px of fingertip skin below it (§11.8 + arm-over-torso rule iii). Hand above the
  shoulder (wave, happy apex): the sleeve slides back so 2–3 px of hand show. q34 far cuff one step darker but its
  lace keeps ≥ 2 px of cream 3 wherever the hand clears the torso (gate walk f2–3, f6–7).
- **Legwear and shoes** (owner Q2): opaque tights, legs = `cloth_black` (rig default 3.6, far leg 2.6 via
  `farLegShade` with its touch outline). Shoes `cloth_black` 0–3: Mary Janes with a 1-px tonal strap (shade 4), a
  1-px lit toe and an `l`/`L` rim so the feet anchor on the dark IDE.

## 2. Ramps (OKLCH L / C / h)
- **New `hair_black`** (near-black, cool ring; retuned in art round 1 — the first values read navy/steel):
  0.17/0.018/288 · 0.21/0.022/282 · 0.255/0.027/270 · 0.30/0.030/266 · 0.37/0.033/262 · 0.50/0.036/252 ·
  0.66/0.032/244. Shade map: shadow mass step 1, mid mass step 2, lit top-left clumps step 3; R2 outer outline
  step 4 (step 5 on the lit top-left arc); angel ring steps 5/6 as a 1-px band 2–3 rows under the crown, broken by
  the clump tips.
- **New `cloth_black`** (desaturated plum-blue): 0.16/0.022/280 · 0.20/0.030/290 · 0.25/0.036/298 ·
  0.31/0.042/304 · 0.38/0.048/310 · 0.46/0.052/316 · 0.56/0.050/325 (§11.8 anchors: bodice ≈ #1c1626, sleeve ≈
  #2c2840, sleeve light ≈ #47405f, outer outline ≈ #5a4a70). C ≤ 0.052: black, not navy; apart from
  `cloth_indigo` and `ink`.
- **New `gem_garnet`**: 0.26/0.08/5 · 0.34/0.12/12 · 0.42/0.15/18 · 0.50/0.16/22 · 0.61/0.14/28 · 0.75/0.10/40.
- Reuse: `skin`; `cloth_cream` (choker and cuff lace, sclera, highlights); `horn` (moth, and the eyes: warm brown
  h ≈ 50°, never red-brown; not `hair_copper`); `cloth_rose` (blush); `ink`.
- Separation gates: hair mid vs sleeve ΔL ≥ 0.05 **and** hue split ≥ 30° (hair blue h 262–270, cloth plum
  h 298–310); if the front fails, `sleeveHairLine` on the front view (R5).
- Dark IDE: the bodice (L ≈ 0.20–0.25) equals the IDE background, so the edge carries the read: R2 outer outline,
  2-step rim, cream cuffs, choker and face; the hair mass may merge with the IDE by design — its read comes from
  the outline/ring at L ≥ 0.37.

## 3. Costume
- Bodice `cloth_black` base 2; tonal 3-rung lacing ladder on the centre panel (`wWw` rungs 1 row apart, shade 4–5),
  never checker or diagonal crosses.
- `neckAcc: 'choker'` (§5). Sleeve `{ ramp: 'cloth_black', shade: 3 }` (bodice 2; bump to 4 if the p10 ΔL gate
  fails). Cuffs: cream lace (R3) with fingertips below.
- Waist band `ramps.trim: 'cloth_black'` (tonal); `outfit.trim = gem_garnet` for masks only (R4).
- `hem: 'skirt'`, tonal hem lace (`clothAlt` not cream).
- `variants: { headAcc: 'clip', hairBack: 'long', hem: 'skirt', back: 'none', neckAcc: 'choker', sleeves: 'long' }`
- `ramps: { hair: 'hair_black', cloth: 'cloth_black', clothAlt: 'cloth_black', trim: 'cloth_black', legs: 'cloth_black', tail: 'hair_black', tailTip: 'hair_black' }`
- outfit: skin · hair `hair_black` · horn → `horn` (moth) · dress `cloth_black` · apron `cloth_cream` (lace) · trim
  `gem_garnet` · shoe `cloth_black` · eye `horn` · blush `cloth_rose` · ink.

## 4. Face
- **Eyes** (horn brown: c = horn 0, i 2, I 3, k 4; never above horn 4, so brown not amber): calm, heavy-lidded,
  distinct from maid's round open eye and kitsune's upturned slope. Iris 4 × 5 with the top row under a **flat thick
  lash** (no arch, 2 rows at the outer 2 px), so 4 × 4 of iris shows; 1-px flick up-out. Pupil 2 × 2 round, 1 row
  lower than maid's. 1 × 2 highlight top-left (same side both eyes) + 1-px lower highlight; outer sclera sliver.
  Per-character exception to §11.2 "iris top row fully visible" (recorded here).
- **Neutral**: gentle half-smile, a 2-px flat `XX` 1 px right of the axis + 1-px `x` corner one row up on
  screen-right; never a fang; ≥ 1 skin row above the chin.
- **Blush**: `ff` per cheek in neutral; full `fFFf` + dither on happy and petted.
- **Signatures** (the calm half-lid makes every opening read big): startle — lid lifts, full iris with sclera both
  sides, small `o` mouth; happy — soft closed downward arcs (content, not `^^`), small open smile, full blush;
  petted — irises glance aside (`irisDx`), strong blush, flat wavy 4-px mouth ("pretending not to care"); think —
  one eye 1 row more lidded, mouth corner pulled aside; worried — lids lift at the inner ends via the lash shape
  (brows hidden), small flat-open mouth.
- q34: `neutral` + `blink` only; the half-smile's high corner on the facing side.

## 5. Lace choker with garnet drop (6 px, symmetric about x = 24)
```
VwddvV   black velvet band, lit px left of centre (dress letters)
p.PP.p   cream lace scallops + centre bail, over chin-AO skin (z/s)
..RT..   garnet: R = shade-5 highlight top-left, T base
..gG..   garnet shadow toward bottom-right
```
Band black, not cream (a cream band merges with the neck and reads as a collar); neck skin under it in chin AO
(skin 1–2); the drop lands on the black neckline; the only red px on the figure, ≥ 8 rows below the eyes. q34:
5 px (`p.Pp.`), drop shifted 1 px toward the facing side.

## 6. Pitfalls at 48 px
1. Black on the dark IDE (judge first): without R2 the bodice and shoes melt. Silhouette px against transparency on
   `cloth_black`/`hair_black` take shade 4–5 on the lit side, 3 elsewhere, never 0.
2. Hair behind the arms (front): sleeves and hair close in value — hue-split gate, R5.
3. Homura risk: angel ring one segment per clump following the skull arc, ≥ 1 px breaks, never one straight row.
4. q34 owner rules: no cheek/jaw bump (monotonic contour), head joint at hip x − 1 (add `tweaks.head.dx: −1` if the
   long hair pulls the read forward), the near lock 2 px wide from the temple with no bulge at ear height (no
   headphones), the moth ≥ 2 px above the lock root.
5. Sleeve paws: think/chin need a `FIST_PAW` (lace wraps the fist, 2 knuckle px of skin, `FIST_BREAK` kept); the
   ≥ 2-px hand end is cuff lace or skin in every frame.
6. Hem lace: one scallop row, no dither; on sit clipped to 1 row.
7. Moth at 1×: if it reads as a bow or white blob, drop the wing spots, keep the antennae, one value step between
   wings and body.
8. Eyes: flat lash + covered iris row can read sleepy — keep the highlight big; calm, not dead.

## Rig work
- **R1** `sleeveOverHand` opt-in (required): cuff t ≈ 1.0, bell 1.8 × 0.9, hand radius ≈ 0.8 (1–2 fingertip px),
  auto slide-back (t 0.8) with the hand above the shoulder; `FIST_PAW` mask.
- **R2** `silhouetteOutline` opt-in (required): outer-outline override per ramp — shade 5 lit side, 3 elsewhere —
  for `cloth_black` and `hair_black`.
- **R3** `cuff: { ramp, shade }` opt-in (required): split the bell cuff from the hem lace (today both use
  `clothAlt`).
- **R4** (required): `outfit.trim` (garnet masks) may differ from `ramps.trim` (waist band); otherwise add a
  choker-gem ramp field.
- **R5** (optional): `sleeveHairLine` on the front view, only if the front hair/sleeve gate fails.
- **R6** (required): palette `hair_black`, `cloth_black`, `gem_garnet`; tests: darkest ≠ #000, L monotonic, hue
  drift ≥ 15°.

## Implementation deviations (MA-29, art-director accepted)
- `dressShade` opt-in: bodice 2, sleeve 4 (the rig default bodice is 3).
- No lacing ladder: the short bodice rows are taken by the choker, which carries the front detail.
- Garnet 8 rows below the eyes at rest, 7 on head-lag / bow / happy frames.
- Moth: no wing spots, 1 × 3 body in horn 4, leading edge horn 5, trailing edge horn 3, antennae horn 3.
- Choker: skin-2 row, `cloth_black` 1 band, `p.RT.p` scallops sharing the garnet's top row.
- Lashes: flat and thick with a horizontal 1-px outer tick (no up-flick; outer end never above the inner end).
- Neutral mouth: 2-px ink + a skin-2 raised corner. Petted: flat wavy line; happy: open smile with a rose tongue.
- Think: `FIST_PAW` = 2 skin knuckles over a 1-row 3-px lace, under the jaw; side locks lean straight (`lockLean`).
- Owner sign-off 2026-11-24.
