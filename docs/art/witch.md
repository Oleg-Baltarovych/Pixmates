# witch — design spec (MA-29a)

Originality gate: **PASS** (art-director, 2026-11-24), conditions: the hat headroom is measured in the rig test (R-W2)
and the Megumin / Coco / Link rules hold every round. Owner decisions 2026-11-24 (§8): A "moss and ember", hat-tip droop/lift (R-W3) now, mustard tights with a sock row. Brief: ART-BIBLE §9 (D-17). An
unsure apprentice witch; a stylized archetype, not a portrait. Frame 48 × 56 (fixed — no taller frame), chibi ≈ 2.2
heads. Silhouette: compact slouched hat with a bent tip, soft mid-back hair, A-line robe-dress with bell sleeves, no
cape, no prop.

Headroom basis: `acc` joint [24, 3] front / [23, 3] q34; figure row = frame row − 8; the most any pose lifts the head
is 3 rows (happy f1 root −2 + 1-row stretch; happy f2 root −4 with head lag +1; startle root −3); the outline adds 1 px
above the highest mask px. So the hat's top px sits at figure −1 at rest, its outline at −2, and the apex reaches −5 =
frame row 3 — rows 0–2 clear, the same apex as kitsune's ears.

## Lookalikes checked
Highest risks: **Megumin** (big hat with a crumpled tip and a gold/red band, crimson and black, red eyes, eyepatch),
**Coco** (Witch Hat Atelier: floppy hat with a long bent tip, pale hair, white and blue cloak), **Link / Peter Pan**
(green pointed cap with green clothes). Also: Kiki, Akko / Little Witch Academia (Ursula/Chariot, Sucy), Frieren,
Sabrina, Madoka witches, Hermione / Ginny, Marisa Kirisame, Elaina, the Witch (Slay the Princess), the Wendy's mascot,
Hilda, Lina Inverse, Elphaba.
Hard rules:
- Hat: compact (≈ 10 rows); the tip droops and ends at or above the brim's own height, never a long fold past the brim;
  no coloured band (tonal moss — the ochre accent lives only in the patch and the ember); no bow, buckle, feather, star
  or moon emblem; always a brim (never a stocking cap).
- Colour: never black or navy cloth; no red + gold; no green with silver trims, crest, striped tie or scarf; no blue and
  white stripes, no blue hair, no red top.
- Hair: auburn — never bright orange, blonde, ash or brown-only; no twin-tails, pigtails, braids, drills; never over
  one eye.
- Face: no freckles, red/heterochromatic eyes, eyepatch, glasses, fangs, cat pupils, elf ears.
- No broom, black cat/familiar, head bow, apron, egg-shaped gem, scythe; no wand in M-ART. No crazy or smug-explosion
  expressions.

## 1. Silhouette
- **Hat** (`headAcc: 'hat'`, R-W1, or `'clip'` with no code change): mask 28 × 10 at `[−14, −4]` from `acc` (x 10–37,
  figure rows −1…8; with outline x 9–38, rows −2…9). Dress letters (`cloth_moss`), a cream patch (apron letters),
  horn-letter stitches, one ochre ember px (`t`); light top-left. Shape guide (not final px):
  ```
  ...............wDDdv........   −1  fold crest (highest px)
  .............wWDDDdddvV.....    0  fold turns screen-right
  ............wWDDDddv..dvV...    1  cone | 2-px notch | drooping tip
  ...........wWDDDDddv...tV...    2  singed tip: moss 0 + 1 ember px
  ..........wWapDDDdddv...V...    3  1-px tip point at x 34; patch starts
  .........wWanpDDDdddv.......    4  2×2 cream patch, 1 horn stitch
  ........vvvvvvvvvvvvVV......    5  tonal band (moss 1)
  .wWWWWDDDDDDDDDDDDDdddddvvV.    6  brim top, lit left
  wWWDDDDDDDDDDDDDDdddddddvvvV    7  brim 28 px (head 24: 2-px overhang each side)
  .vvvvvvvvvvvvvvvvvvvvvVVVVV.    8  brim underside
  ```
  Cone axis 1 px left of x 24, leaning right; the tip folds toward screen-right, droops 3 rows, ends in a 1-px point
  (x ≈ 34, figure row 3); a transparent notch ≥ 1 px between tip and cone. The brim casts a 1-row shadow on the fringe
  roots (hair step 1, in the head mask). Rigid on `acc`: inherits the head's 1-frame lag, never its own x offset.
- **q34 hat** (26 × 10, same `at` from the q34 `acc`): brim foreshortened and 1 row thicker on the near side; cone 1 px
  toward the nape; the tip flops backward to screen-left (point ≈ x 13); brim facing-side overhang ≤ 2 px past the
  skull and ≤ the back overhang. Turn f0 tip swap right→back accepted as follow-through.
- **Back hair**: `hairBack: 'long'`, `hairBackStretch` 1.15 (mid-back ≈ row 31, between maid and goth), 3 soft clumps
  with tips flicking 1 px out (frizzy from spells), never a straight curtain; q34 `masks.hairFar` + `hairTipLag`.
- **Fringe**: 4 pointed clumps (tips ≈ 5/7/6/4 rows, centre-left longest), parted off-centre, splits in `j`, tips 1 skin
  row above the lash. Angel ring under the brim: 1-px segments 2 rows below the brim shadow, lit `Y` left, dim `y`
  right, broken at every split.
- **Side locks**: default chains, 2–3 px wide, ending at the chin row with a 1-px outward curl, starting under the brim;
  `lockLean` only if think bulges.
- **Robe-dress**: fitted moss bodice, `hem: 'skirt'` default length; tonal hem band (`clothAlt` moss, 1 row shade 4);
  no lace or scorch in M-ART. `sleeves: 'long'` bell cuffs **with hands visible** (not `sleeveOverHand`), ochre cuff.
  Cream collar (§5). Ochre 1-row belt (`sash`) with the potion vial as the knot mask on the near hip. No cape.
- **Legs**: mustard tights (`cloth_ochre`) with a sock-top row (`shinWrap`); short brown boots (`horn` 0–3) with a lit
  toe and an `l` rim.
- **Props**: none in the 16 shared anims (the vial is costume).

## 2. Ramps (OKLCH L / C / h)
- **New `cloth_moss`** (cool blue-green shadows → warm yellow-green lights): 0.24/0.040/150 · 0.31/0.055/145 ·
  0.39/0.068/138 · 0.47/0.078/132 · 0.56/0.082/125 · 0.67/0.080/115 · 0.79/0.075/105. Gates: ≥ 60° hue from
  `cloth_teal` at every matching step; darkest ≠ #000, L monotonic, hue drift ≥ 15°.
- Reuse: `hair_copper` with a darker shade map (shadow 1, mid 2, lit clumps 3, ring 5/6, outline 0–1; steps 4+ only in
  the ring — auburn, not orange); `cloth_ochre` (belt, cuffs, tights, ember); `cloth_cream` (collar, patch, vial glass,
  sclera, highlights); `horn` (boots, cork, stitch); `cloth_rose` (blush, potion); `skin`; `ink`.
- Separation: hat vs hair by hue (≈ 95°), the brim underside (moss 1–0) is the line; sleeve vs bodice shade 4 vs 3
  with the p10 ΔL gate (bump to 5 if it fails).

## 3. Costume
- `variants: { headAcc: 'hat', hairBack: 'long', hem: 'skirt', back: 'none', neckAcc: 'choker', sleeves: 'long' }`
- `ramps: { hair: 'hair_copper', cloth: 'cloth_moss', clothAlt: 'cloth_moss', trim: 'cloth_ochre', legs: 'cloth_ochre', tail: 'hair_copper', tailTip: 'hair_copper' }`
- outfit: skin · hair `hair_copper` [0,0,1,2,5,6] · dress `cloth_moss` · horn `horn` · apron `cloth_cream` · trim
  `cloth_ochre` · shoe `horn` [0,0,1,2,3,5] · eye `cloth_moss` [1,2,3,4,5,6] · blush `cloth_rose` · ink.
- Opt-ins (existing): `sleeve { cloth_moss, 4 }`, `cuff { cloth_ochre, 3 }`, `sash { rows: 1, knot: VIAL }` + q34
  `sashKnot: VIAL_Q34`, `shinWrap { row: 2, shade: 1 }`, `hairBackStretch 1.15`, `chinHand` for think, q34 `hairFar`,
  `hairTipLag`, `hideFarShoulder` if needed, `farLegShade 2.6`, `hornOutline` only if the hat gets a wrong-ramp halo.
- **Vial** (3 × 4 at hip + ≈ [−6, −2], screen-left); q34 2 × 4 on the near hip; the only rose px apart from the blush:
  ```
  .o.    cork (horn)
  qpq    glass neck (cream 1 / 5)
  pFf    rose potion, cream glint on the lit left
  qfq    glass base
  ```

## 4. Face
- **Eyes** (leaf green: c = moss 1 → i 3 → I 4 → k 5): big, round, outer corner **downturned** (*tare-me*, unsure).
  Iris 4 × 5 fully visible; the lash arches over the pupil and its outer corner sits 1 row lower than the inner end,
  with a 1-px horizontal outer tick (per-character exception to §11.2's up-out flick). Pupil 2 × 2 round, set inward;
  1 × 2 highlight top-left + 1-px lower highlight (same side both eyes); outer sclera sliver.
- **Neutral ("unsure")**: 2-px `XX` 1 px left of the axis + a 1-px `x` corner one row down on screen-left (a tiny
  uncertain pout); ≥ 1 skin row above the chin; soft `fFFf` blush. Brows hidden except worried (inner ends up, through
  a fringe gap) and startle (raised).
- **Signatures**: happy ("it worked!") `^^` + big open smile with rose tongue + full blush; petted soft closed arcs +
  strong blush + small wobbly 4-px smile; think `irisDx` glance up-aside + lips pressed to one side (no cheek bump);
  startle full round, pupils 1 px ("O_O", not kitsune's `><`) + small `o`; worried (her home emotion) inner lash ends
  raised + 2-px lower highlight (wet shine) + wavy 3-px mouth; wince one eye shut + gritted line.
- q34: `neutral` + `blink`; the pout's low corner on the far side, the near eye full.

## 5. Collar (neck_acc mask, 8 px, symmetric about x = 24)
Two rounded cream lobes (3 px each + a 1-px gap) with a 1-px ochre clasp `t` on the centre column, lit px left of each
lobe's centre, lobe tips 1 row down, a chin-AO skin row above. Never a straight white band (choker or Wednesday collar
read). q34: 7 px, shifted 1 px toward facing.

## 6. Signature motion (M1+, briefs)
Spell fizzle (hand up, 2-frame spark, smoke puff, falling sparks); "the spell broke" on red tests (puff from the hat
tip, the hat slips over the eyes for 2 frames, she pushes it back); success (sparkle burst + hat-tip flick); think (the
potion bubbles, 1-px FX); sleep (hat tilted over the eyes); petted (hat squashes 1 row); maybe a wand as an M1
signature-only prop.

## 7. Pitfalls at 48 px
1. Headroom: the hat top stays at figure −1 at rest; tip droop (R-W3) may only go lower; the rig test fails on any
   opaque px in frame rows 0–2.
2. Arms up under the brim (head masks stamp over arms): check the hands in happy f1–f3 and wave; if a hand vanishes,
   narrow the brim to 26 — never offset the hat per pose.
3. Hat vs hair at 1×: a continuous dark brim underside; the auburn ring must survive the brim shadow on the dark IDE.
4. Bend read: keep the 1-px transparent notch and one value step between tip and cone, or the hat reads as a lump.
5. Megumin / Coco drift: short tip (≤ 4 px), tonal band; otherwise the gate fails.
6. q34 owner rules: monotonic contour (no cheek/jaw bump); head joint at hip x − 1, the brim counts toward the facing
   overhang (≤ back overhang + 4, aim ≤ 2 past the skull); not headphones — the brim end tapers to 1 row, the near lock
   starts ≥ 1 row lower, 2 px wide, no ear-height bulge, no dark outline step between brim and lock; steady head (hat
   rigid, no per-frame dx).
7. Vial vs arm swing on walk f2/f6: ≥ 2 px of hand over the vial; the rose stays 2–3 px.
8. Green everywhere: eyes at moss 3–5 against the moss 2–4 cloth; ochre tights and belt break the mass; check the lineup
   next to kitsune and maid on white.

## Rig work
- **R-W1** (small, optional): `'hat'` in the `headAcc` union, stamped like `clip`, with `validateBody` bounds.
- **R-W2** (required): add the witch to the headroom measurement in `rig.test.ts` — hat apex ≤ kitsune ear apex (frame
  row 3), H = 56 still the smallest fit.
- **R-W3** (recommended): hat-tip alternate mask per frame from head dy vs the previous frame — head rising: tip droops
  1 px; landing squash: tip back to rest, never above. Deterministic, no chain, seamless loops.
- **R-W4** (required): `cloth_moss` in the palette with R6-style tests.
- Nothing else new: collar, vial, cuffs, sock row and hair length use existing opt-ins.

## 8. Owner decisions
- **Q1 Colourway**: A (recommended) "moss and ember" — moss robe and hat, auburn hair, ochre belt/cuffs/tights,
  leaf-green eyes, rose potion; B "mustard robe" — ochre robe, moss hat, moss-dark tights; C "heather" — dusty
  rose-mauve robe (new ramp), moss hat (most distinct, slight magical-girl drift).
- **Q2 Hat tip motion**: R-W3 droop/lift now (recommended) or fixed until M1.
- **Q3 Legwear**: mustard tights with a sock row (recommended) or cream knee socks with a moss band.
