# vampire — design spec (MA-29e)

Status: **owner signed off 2026-11-27** after art-director round 1 (MA-68, D-23).

Originality gate: **PASS** (art-director, 2026-11-24); a crimson lining (Q1-C) would reopen it. Owner decisions 2026-11-24 (§8): Q1 A midnight + old gold, Q2 crimson eyes, Q3 paired fangs in neutral. Brief: D-18. A chibi aristocrat count — theatrical, afraid of the light theme and of mornings, tied to
night mode. Frame 48 × 56, chibi ≈ 2.2 heads. An archetype, not a portrait; no reference images. Rig items R1
(`back: 'cloak'`), R3 (`neckAcc: 'collar'`) exist (built in MA-29b); D-20 ronin no longer uses the cloak, so vampire
is now its only user (keep it general).

**D-20 (2026-11-25):** chibi stands (D-19 adult update cancelled); normal face. **Richness** (ART-BIBLE §12): layers —
shirt + ascot, **brocade waistcoat** (tonal 2-px damask dither in midnight 4/5, texture only), cloak with gold lining;
signature — the gold-faced stand collar; materials — wool cloth, satin lining, silk ascot, metal (brooch rim, buckle);
trims at 1× — 1-px cream shirt cuff frill. No gold edge trim or chains (Alucard rule holds). Colour vs ronin: midnight
blue-black + old gold, never vermilion (ronin.md §2).

**Cast rule — not a second goth, not a second ronin.**

| | goth | ronin | vampire |
|---|---|---|---|
| Silhouette | long hair + A-line skirt (soft triangle) | calf-length bell cloak, flat mantle | **inverted trapezoid**: wide stand-up collar + broad shoulders, then a straight column cloak to the knee, trousers, pointed shoes |
| Palette | blue-black hair, plum-black dress, garnet | ivory mist, ash, umber | **midnight slate-blue** (h 230–275) + **old-gold lining** + cream cravat + crimson eyes; no plum, no garnet |
| Hair | long, bangs hide the brows | dome + 4-clump fringe | **short, slicked back, side part, 2 forelock clumps, brows visible** |

## Lookalikes checked
- Alucard (Hellsing): no red coat, wide-brim hat, round/tinted glasses, sigil gloves, long hair.
- Alucard (Castlevania SotN / Netflix) — **highest risk for black + gold**: no long platinum hair, no gold eyes; gold
  only as a flat satin lining — no gold filigree edge trim, shoulder plates or belt chains; cloak midnight blue, never
  true black.
- Dracula (Castlevania, Lugosi, Hotel Transylvania): the archetype (stand collar, cape, cravat) is allowed (the widow's
  peak too, owner D-23); not allowed — a medallion on a ribbon or sash, a red cape lining, beard, long hair, red cravat. Vlad (HT): no beard,
  not elderly.
- Count von Count: no monocle, medallion, purple/grey skin, lightning FX, counting gags (persona note). Count Chocula: no
  brown skin, no medallion.
- Edward Cullen: no bronze tousled hair, gold eyes, and **no skin sparkle** as the light-theme reaction.
- D (Vampire Hunter D): no wide-brim hat, blue pendant, face on the hand, long hair.
- Krul, Mikaela / Ferid (Owari no Seraph): no pink/blond/silver hair, no white uniform or cape.
- Vampire Knight: no neck tattoo (Zero), no brown hair + wine eyes + academy uniform (Kaname).
- Dio Brando: no blond, yellow, heart motifs, headband, "menacing" kana FX, clock/time-stop FX; the theatrical bow is a
  cloak sweep, not a JoJo pose (persona: no Dio catchphrases).
- Vladimir (LoL): no crimson outfit, long white hair, blood pools. Lestat: no long blond hair; the cravat is a folded
  2-tier ascot, never a dripping lace jabot.
- Nosferatu / Orlok: no bald head, central rat incisors, claws, grey skin.
- Hunson Abadeer: no blue-grey skin, no amulet. No bat-pony wings, bunny ears (Bunnicula), pink/pigtails/hearts
  (Draculaura), green duck (Count Duckula), bat wings (Remilia).
- **Bat logos (Batman et al.)**: no bat shape on the costume, brooch, cloak hem or FX; the hem is never scalloped into
  bat-wing points. A future bat (M2 transform) is a round chibi bat with a face, eyes and rounded wing lobes — never a
  flat dark silhouette, never on a yellow oval.
- Cast: no single side fang (kitsune), no plum-black + garnet (goth), no mist or lobed hem (ronin), no tall ears.
Hard rules: no blood, drips, red liquid, goblets or wine glasses, bite marks or red-tipped fangs; no crosses or coffins
with crosses; skin stays warm `skin`, never grey-blue or lavender; eyes always have a pupil and highlights, never a
solid glow.

## 1. Silhouette
The widest point at shoulder level is collar + shoulders (≈ 27 px); the head stays the widest element overall; below,
a straight column reads male and tall.
- **Hair** (`hair_black`, reused): short, slicked back, side part toward facing; crown widths as maid; fine 1-px `j`
  strand lines sweep back from the part; two pointed forelock clumps on the part side (tips 4 and 6 rows, 2–3 px wide,
  1-px points) covering ≈ ⅓ of the forehead — forehead and **both brows show**. ~~No widow's peak~~ (reversed by the owner, D-23 — see «As built»); no centre part or S-curl.
  Sideburns authored in the head mask (`sideLocks: false`): 2 px wide, tapering to a 1-px point at eye-bottom level, no
  ear bulge. No visible ears. `hairBack: 'short'`, `hairBackStretch` ≈ 0.2: a slick nape with 1 pointed flick each
  side, 1 px under the jaw. Angel ring one segment per sweep clump on the skull arc, warm lit left, ≥ 1-px breaks.
- **High collar** (`neckAcc: 'collar'`, R3 + R-V2): two stiff wings flaring ≈ 45° out from the neck base (an open
  V-funnel); outer face midnight 2–3, **inner face gold 3–4** toward the viewer (a gold band framing the jaw). Tips: top
  at chin row C − 2 or lower and ≥ 3 rows below the eye-bottom row (never at cheek/ear height), at x 11–13 and 35–37,
  never past 11/37 (raised hands live at x ≤ 10 / ≥ 38). ≥ 1 transparent or outline px between each tip and the cheek
  (concave contour — **no jaw bump**); straight edges with 1-px stepped AA, no rounding toward the face (headphones).
  q34: near wing 2 px lower, 1 px narrower, opening toward facing, a 2-px gold sliver never ahead of the chin; far wing
  peeks 2–3 px behind the nape with a 1-px outline gap to the hair flick.
- **Cloak** (`back: 'cloak'`, R1 + R-V1): front — a straight column behind the body; top at the shoulder joints ± 2 px
  with **square shoulder corners**; hem at the knee (row ≈ 38) so ≥ 6 px of trouser and the shoes show; hem ≈ 22 px
  (x 13–35), narrower than the collar line, never a bell. Straight hem with a 1-px drop at each outer corner;
  **turned-back corners** show a 2 × 3 stepped gold lining triangle each side. One 1-px satin highlight fold per side
  (midnight 4) on the lit left + two vertical folds deepening to the hem; no dither, lobes or scallops. On the happy
  apex, land and the bow the front edges flare 1 px and show 1 more lining row. Binary alpha. q34: trails from the back
  joint, hem ≤ 3 px behind the hip on passing frames (1-frame lag), 1 px of gold at the trailing corner.
- **Shirt and cravat** (`cloth_cream`): a 3-px cream V at the throat between the wings + a 2-tier folded ascot (4 px
  then 3 px, cream 3/4, a 1-px cream-2 fold line).
- **Brooch**: 3 × 3 oval on the ascot — ochre 3 rim, cream-5 moonstone centre, 1 lit px top-left. The only jewel; not
  red, no ribbon, never bat- or crescent-shaped.
- **Waistcoat**: midnight 4 (`dressShade` 4), a 1-px gold button column (2 buttons, ochre 4 + lit px), 2 short points
  at the waist band; sleeves midnight 2 (a value step over the waistcoat).
- **Trousers**: `hem: 'shorts'` tailored (clothAlt midnight 3, raise 0), legs midnight 3 (continuous → trousers), a
  1-px knee crease on the near leg; `farLegShade` 2 in q34.
- **Shoes**: pointed dress shoes, shoe mask midnight 0–3, toe 1 px longer than goth's Mary Janes, a 1-px lit toe
  (shade 5), a 1-px ochre buckle; `silhouetteOutline` for the dark IDE.
- **Fangs** (face masks, apron slot cream 4 — not 5): a **symmetric pair**, 1 px each, 1 row under the mouth line,
  2 px apart on the axis (x 22 and 25) — unlike kitsune's single side fang; never red, never longer than 1 px.
- Budget: collar x 11–37, cloak x 13–35; nothing above the crown (headroom better than maid).

## 2. Ramps (OKLCH L / C / h)
- **New `cloth_midnight`** (cloak, sleeves, waistcoat, trousers, shoes): 0.17/0.030/275 · 0.22/0.040/268 ·
  0.28/0.048/260 · 0.35/0.052/252 · 0.43/0.050/244 · 0.52/0.044/236 · 0.62/0.036/228 (tune ±0.01 C / ±8° h). Gates:
  vs `cloth_black` hue ≥ 30° at steps 2–4 and Oklab Δab ≥ 0.04 (no plum read); vs `cloth_indigo` C ≤ 0.055 against
  indigo's ≥ 0.09 at the mids, Δab ≥ 0.04 (not kitsune); vs `hair_black` base (3) L ≥ hair mass L + 0.08; darkest ≠
  #000; palette tests (L monotonic, hue drift ≥ 15°).
- Reuse: `hair_black` (hair); `cloth_ochre` (lining 3–4, buttons, buckle, brooch rim — flat satin, never trim);
  `cloth_cream` (shirt, ascot, fangs, sclera, highlights, moonstone); eyes from `fx_red` (c = 1, i = 2, I = 3, k = 4;
  never 5, never a glow) — or an `eye_crimson` ramp with the same values if an FX ramp on a face is unwanted; `skin`;
  `cloth_rose` (blush on emotions only); `ink`.
- White window: the midnight outline (0–1) holds, gold collar and corners are accents. Dark IDE (judge first): R6
  outline on midnight and hair, 2-step rim, the gold collar face behind the jaw, the cream ascot, the lit toes.

## 3. Costume
- `variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'cloak', neckAcc: 'collar', sleeves: 'long' }`
- `ramps: { hair: 'hair_black', cloth: 'cloth_midnight', clothAlt: 'cloth_midnight', trim: 'cloth_ochre', legs: 'cloth_midnight', tail: 'cloth_midnight', tailTip: 'cloth_ochre' }`; cloak ramp midnight, lining ochre.
- outfit: skin · hair `hair_black` · horn → `cloth_ochre` (collar inner face and lining letters) · dress
  `cloth_midnight` · apron `cloth_cream` · trim `cloth_ochre` · shoe `cloth_midnight` · eye `fx_red` (or `eye_crimson`)
  · blush `cloth_rose` · ink.
- `sleeve: { ramp: 'cloth_midnight', shade: 2 }` vs `dressShade` 4 (if p10 fails: sleeve 1 or waistcoat 5);
  `cuff: { ramp: 'cloth_cream', shade: 4 }` (1-px shirt cuff; hands visible, no `sleeveOverHand`); `sash: { rows: 1 }`
  midnight 1 as the waistcoat bottom line.
- Opt-ins reused: silhouetteOutline (midnight `{ lit: 4, shade: 2 }`, hair_black as goth), sleeveRim, sideLocks false,
  hairBackStretch, farLegShade, hideFarShoulder, lockLean, tweaks.

## 4. Face
- **Eyes**: crimson (Q2), iris 4 × 5 fully visible. Lash: a straight flat 1-px line with a sharp inner corner dipping
  1 px down-in and the outer end cut square — **no flick** (boy cue; differs from maid's arch, kitsune's up-slope,
  goth's thick flat lid, witch/ronin tareme, knight's droop). Pupil ink 2 × 2 round (never a slit). 1 × 2 cream
  highlight top-left (same side both eyes) + 1-px lower highlight at fx_red 4; outer sclera sliver. Red is allowed as the
  vampire tell (goth's no-red-eyes rule is goth-only) and safe only with short black hair, no hat or glasses, no red
  cloak.
- **Brows** (always visible): 3 px each, ink 1; inner end 1 row lower; the screen-right brow 1 row higher in neutral —
  **a single raised theatrical brow** (his signature).
- **Neutral**: a composed closed 3-px ink line on the axis, the fangs under it (Q3), ≥ 1 skin row above the chin, a chin
  point 1 px flatter than maid's; **no blush** (boy cue).
- **Signatures**: hiss (light theme) — `><` squeeze, open 4-px mouth with both fangs, brows angled in, sweat FX; smug
  talk — brow raise alternating per frame; happy — closed eyes as flat lines (inner corner kept), open smile with both
  fangs, `ff` blush; petted — eyes glance aside, strong blush, brows lose their arch ("flustered aristocrat"); morning
  drowsy — half lids, brow 2 rows lower, yawn `O` without fangs; startle — lash lifts 1 row, pupils 1 × 1, sclera both
  sides, small `o`; worried — inner brow ends up.
- q34: `neutral` + `blink`; near eye full, far eye 1 px narrower; near brow full, far brow 2 px; only the near fang
  (1 px); no blush.

## 5. Signature motion (M1+, briefs)
Light-theme recoil (2 frames recoil, the near arm sweeps the cloak edge up to the nose, hiss face, sweat, hold, lower
over 2 frames; ≤ 1.2 s; no sparkle, smoke or burning skin); night-mode "good evening" bow (one arm sweeps the cloak open
with a 2-frame gold flash, the other hand to the chest, 1-px bow at the hip, head steady relative to the hip); morning
slump (1 row of cloak lift, half lids, slow 6-s yawn); sleep (stiff standing doze, arms crossed, Zzz, no coffin); land
(cloak billows 2 px with gold corners, settles over 2 frames); M2 optional bat poof (smoke, then a round chibi bat with
his slicked tuft and red eyes).

## 6. Pitfalls at 48 px
1. Dark IDE (judge first): midnight + black hair melt without R6 + rim; the gold collar sits between hair and cloak —
   never a hair px directly against a midnight px at the jaw.
2. Collar as jaw bump or headphones (owner q34): keep the tip rule (C − 2 or lower, ≥ 3 rows under the eyes) and the
   concave gap at the cheek; if it still reads as ear-muffs, drop the tips 1 more row before narrowing them.
3. Collar vs raised arms (wave, happy, hang): neck_acc stamps after the arms and would cut over them — R-V2 required;
   gate on wave f2–5, happy apex, drag.
4. Fangs at 1× can read as drool or gaps: 1 px each at cream 4, ≥ 1 skin px between them and the chin; if noisy, Q3-B.
5. Castlevania read: gold stays inside (lining, collar face, 2 buttons, buckle), ≤ 8 % of figure px, never edge trim.
6. Goth read: no plum hue in midnight (hue gate), no garnet, no lace.
7. Cloak column vs body: 2–3 px each side of the torso below the arms, or he reads as a waiter; if so widen the hem
   2 px, never past the collar width.
8. q34: head joint at hip x − 1 (+ `tweaks.head.dx: −1` if the trailing cloak pulls the read forward); never move the
   head to fix the collar.

## 7. Rig work
- **R1** `back: 'cloak'` (ronin) + **R-V1** params: `hem: { lobes: 0, cornerDrop: 1 }` (straight hem), `lining: {
  ramp, shade, corner: [w, h] }` + `flareRows` (extra lining rows on hairLift / land / squash), `shoulder: 'square'`,
  `widths` tapering top to hem (column, not bell), `bands: []`. Tests: ronin and other bodies byte-identical, no
  isolated px, gold share ≤ 8 %.
- **R3** `neckAcc: 'collar'` (ronin) + **R-V2**: validateBody bounds for a tall collar (≤ 27 × 9 px, top ≥ chin row − 2,
  ≥ 3 rows below the eye-bottom row, x within [11, 37] per view); `under: 'arms'` opt-in (collar px not stamped where
  an arm px is, or stamped before the arms); the trim label keeps the arm-over-torso `trimP10` check.
- **R5** `headAcc: 'none'` (ronin).
- **R6** palette `cloth_midnight` + tests, silhouetteOutline midnight entry; optional `eye_crimson`.
- R-V3 (only if seen): no shade-0 outline at the shorts-to-legs seam when clothAlt and legs ramp/shade match.
- Fit: frame 48 × 56 unchanged; the 16 shared anims unforked; cloak-hide and the bow are signature-only prop masks.

## 8. Owner decisions
- **Q1 Colourway**: A (recommended) midnight slate-blue cloak/coat/trousers, old-gold lining/collar face/buttons, cream
  ascot with a moonstone, blue-black hair, crimson eyes; B the same with a moonlight-silver lining and collar face
  (fully clear of Castlevania, less warm on white); C classic crimson lining (not recommended: goth's garnet family,
  stock HT/Lugosi look; reopens the gate).
- **Q2 Eyes**: crimson (recommended) or wine-violet (new ramp, h ≈ 330; softer). Gold rejected (Edward Cullen,
  Castlevania).
- **Q3 Fangs**: paired 1-px fangs in neutral (recommended) or only on open mouths (talk, happy, hiss).

## 9. As built (MA-68, owner pick 2026-11-27: variant A + C's fan collar + a widow's peak, D-23)
Files: `assets-src/characters/vampire/{body,face,masks}.ts`; tests `tests/unit/art/vampire.test.ts`,
`vampire-palette.test.ts`; rig `COLLAR_MAX` (R-V2) in `rig/validate.ts`, `Cloak.lining.inset` in `rig/cloak.ts`.
- **Hair (D-23, reverses §1 «no widow's peak»):** slicked straight back, no forelocks. The hairline recedes at both
  temples from head row 9 (3 skin rows of open forehead above the brows) and the centre wedge narrows 10 → 6 → 2 px to
  a V tip on the face axis (front cols 14–15, q34 cols 16–17, row 11), one skin row above the brows. 2-px sideburns.
  AD round 1: no procedural back-hair mass in either view (empty `masks.hairBack`; it read as a bob) — the front side
  mass ends at the sideburn tip on the eye-bottom row; q34 back contour tapers 1 px per row from the ear row with 2
  `j` strands, ending in a 1-px nape flick at jaw − 1. Crown shine = 3 angel-ring segments (2–3 px, 1-px breaks) on
  the skull arc, lit top-left.
- **Fan collar (C, inside R-V2):** 25 × 9 px from the neck joint − (12, 1): tips at x 12 / 36 at rest (the idle_b
  sway reaches 11 / 37; C's 31-px span would sit in the raised-hand zone), top 1 row over A's (2 rows would put the tip
  at eye level on the walk / happy / sleep head bob). AD round 1 (read as epaulettes): the lit midnight-5 outer face
  is a 1-px stepped rim rising to the tip, 1 row over the gold; the gold inner face is a stepped wedge 2 px → 1 px at
  the neck; 1 px midnight 1 where the wing meets the shoulder; no gold in the q34 facing sliver. Eye 1 row shorter →
  R-V2 now allows 1 more row up; the collar keeps its height.
- **Values:** sleeves midnight 3 (cloak 2, waistcoat 4) — at 2 the arms vanished into the cloak on land / petted; the
  collar's outer face avoids the sleeve's 2–4 so a sleeve over a wing keeps the arm-over-torso step.
- **Gold:** `cloth_ochre` 3–4 (no new ramp: reads old gold on midnight, clear of coder's greener mustard); collar
  face, 2 buttons, brooch rim, buckle, cloak corners. Corners `inset: 1` (a midnight edge on the side and hem); q34
  buckle 1 px back from the toe edge. Tested: no gold px on the silhouette edge, no straight run > 4 px, ≤ 8 % of the
  figure (max 3.7 % after round 1).
- **Face:** normal chibi; crimson (`fx_red` 1–3, never 4: no glow) only in the eye band, never on a skin row (the
  lower highlight is 1 px of `fx_red` 3 in the bottom iris row; tested); neutral = closed 4-px line + 1-px cream fangs
  at x 22 / 25; brows flat (inner end 1 row lower over 1 px), the screen-right brow 2 rows higher with a 1-px centre
  arch; happy keeps its round-1 brows (`brows.happy`); blush only on happy and petted, petted blush 1 row lower and
  1 px out so a skin row separates it from the eye (tested).
- **Torso (AD round 1):** tonal midnight 4/5 checker brocade inside the waistcoat (off the outline, folds and gold);
  a flat 1-px cream-4 cuff band at each wrist via the existing `kote` opt-in (both arms, no studs).
- **q34:** facing contour holds col 25 to the mouth, then steps in 1 px per row to a 1-px chin (the spike's jaw stepped
  2 px); head steady against the hip on walk / turn.
- **Deferred to M1** (with his reactions): the cloak-hide pose, the bow, the light-theme recoil (§5). Not built.
- Not done from AD round 1: note 7 (taper the cloak front edge 1 px over the bottom third, hem width kept) needs a new
  `widths` shape in the shared `rig/cloak.ts` (`column` and `bell` cannot narrow only the bottom third) — out of the
  pack's scope. `cloth_ochre` stays (note 8; witch also uses it on broad stockings vs his small accents).
