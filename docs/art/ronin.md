# ronin — design spec (MA-29b → D-20 armoured samurai, MA-65)

> **D-20 (owner, 2026-11-25; ADR 012): chibi again, frame 48 × 56, ≈ 2.2 heads, stern look (ART-BIBLE §11.9).** The
> adult MA-46 spec (56 × 72, haori, D-19) is void. Ronin is now an **armoured samurai in black lacquer and red** with a
> **menpō** (lower-face mask). Same id, same persona (calm, aphorisms) — a masterless samurai who kept his own armour
> (persona note for `persona-designer`: «the armour is his; the lord is gone»). He talks with his eyes; the speech
> bubble carries the words. The mist cloak and the bell silhouette are dropped (they read "kindergarten" + "robe").
> Originality gate (MA-65, 2026-11-25): **PASS — confirmed by the art-director (round 1, 2026-11-25)** after the
> lead-developer pre-art check against §4. The design as specced (black-lacquer dō with vermilion odoshi, square sode, kusazuri over ash hakama, kote,
> red lacquer half-menpō with an original whisker + mouth-slot dragon motif, umber chibi hair with a crown tuft, one
> katana at the hip, no helmet / crest / horns / hood / cloth wrap / back sword / mon) breaks every §4 rule's lookalike:
> not a full-face, oni, bone or metal-grille mask (Ghost of Tsushima, Genji, Raiden), not a hooded ninja colourway
> (Mortal Kombat), armour black with red lacing (not all-red Sanada, not black-on-black with red eyes), no helmet or
> blades (Vader, Shredder, For Honor, Nioh), hair umber with a tuft (no ponytail / bun / topknot of a named hero).

## As built — round 0 (MA-65, 2026-11-25; before art-director)
- Masks in `characters/ronin/masks.ts`: `MENPO` / `_Q34` / `_DOWN` (red one step darker than spec — step 3 read orange at
  1×), `THROAT` (yodare-kake as the `collar` neck accessory: dark red + black lacing; the menpō itself must stay inside
  the head), `DO` (2 offset red dashes per plate row — every-2-px lacing read as a checker), `SODE`, `KUSAZURI` (+
  seated, q34), `TUFT` (`headAcc: 'clip'`). Slots: shoe = lacquer_black, horn = lacquer_red, trim = ochre (zori straw).
- Face = the shared stern kit: talk_a stern / talk_b glance / talk_c lid + brows up 1 row; worried / startle 1 row
  higher (iris ends ≥ 1 skin row above the menpō); **think keeps the stern open eye** (stern rule; spec said closed);
  happy / petted blush with the mask down. q34: kit eye + set brows.
- Kote on both forearms = `kote.both` (studs on the near one); kusazuri have no hip-lag dangle yet; no sageo on the
  saya yet. The cefa873 mist cloak, collar and charm are deleted.

## Art-director round 1 (MA-65, 2026-11-25) — as applied
- Done: the menpō is a hard shell in the 4 rows the chibi head leaves under the iris (top edge lit left / base right,
  2-px ridge between black nostrils, cheek flares, 2-px spec streak, one connected whisker per side, upturned corners,
  3-px slot on the chin row, red-0 outline ends; q34 near cheek only); a black gap row + black throat guard with one
  red lace row under the chin; dō top plate black with a 2-px spec streak, continuous lace lines broken every 3rd px;
  sode with a lit top edge, one lace line and an outline column toward the dō; kusazuri lace rows in aligned
  columns; umber tuft with one deep-red tie px; ink hilt, ochre tsuba with one highlight, lit saya line, 2-px red
  sageo; jade one step darker.
- **Ramp gates revised (coordinator, 2026-11-25):** the gates exist to keep characters apart at 1×, and same-step
  comparisons were the wrong measure. The `fx_red` gate is dropped (a small FX accent, not a character ramp); the garnet
  and knight-rose gates are one perceptual gate on the base colours: `lacquer_red` step 3 vs each ramp's base step
  (mask tone 2 on a T6 outfit = index 2), OKLab ΔE ≥ 0.06. The art-director vermilion ramp passes unchanged and is
  applied (base #b02a14, h ≈ 32, L ≈ 0.50); ronin maps horn tones to steps 0 / 2 / 3 / 4 / 5 / 6 (tie and lace #8a1f12).
- **Owner head pass + sign-off (2026-11-25):** the round bowl crown is replaced by spiky clumps angled up and out
  (`SPIKY_CROWN`, rows 2–8 of both head masks: 1–2 px tips past the old outline, angel ring kept, temples squared —
  the side walls rise straight to row 5); a lit skin row (cheeks `lit`, skin 4) sits between the eyes and the menpō
  on every mask-up expression, front and q34. **ronin signed off.**
- Side locks: straight down 1 row further with a square corner (front), breaking the round bowl taper.

## 0. Base
Start from the chibi ronin character files at `cefa873` (MA-29b WIP: head mask, dome skull, hakama, sword prop),
adapted to today's rig. Keep: `hair_umber`, `jade` eyes, chibi head, the q34 owner rules (§6).

## 1. Silhouette (front)
A compact armoured block: square shoulder plates wider than the torso (the head stays the widest element), a laced
cuirass, a tasset skirt over a split hakama, feet apart, one hilt at the hip. No cloak, no haori.
- **Hair:** chibi dome in `hair_umber`, 4 pointed fringe clumps with **two gaps that show the brows** (stern); short
  side locks to the jaw; **crown tuft** (Q-D19-2 stands): ≤ 2 px wide, ≤ 2 rows above the crown, red cord 1 px; must
  pass the headroom gate (top ≤ kitsune's ear top at the same frame) — else 1 row, never dropped without the owner.
- **Menpō** (`Body.mask`, signature piece): rigid lacquer half-mask from the nose bridge to under the chin, cheek to
  cheek inside the head contour, top edge ≥ 1 skin row under the iris bottom, a 1-px nose ridge on the axis. Colour
  **red lacquer** (`lacquer_red` 3, lit 5, 1-px hard spec streak top-left) with an original **dragon motif** in
  `lacquer_black`: two 1-px whisker curls sweeping from the nostrils to the cheek edge, a 3-px mouth slot with
  upturned 1-px corners; a 2-row **yodare-kake** (throat guard) of red lacing under the chin. q34: 1 px narrower toward
  facing, whisker on the near cheek only, contour monotonic. **Down** (`happy`, `petted`, `sleep`): the menpō hangs
  under the chin as a 6 × 3 red plate over the collar; the chibi mouth shows.
- **Dō** (cuirass, `Body.torsoMask`): `lacquer_black` plate, 3 horizontal plate rows (1-px shade-1 lines) with
  **odoshi lacing** = vertical 1-px red dashes every 2 px on each row (`lacquer_red` 3/4); a 1-px hard lacquer spec
  streak top-left; a red-cord bow knot (agemaki, 3 × 2) at the back is hidden; obi row under the dō in red.
- **Sode** (`Body.puff` square): 6 × 5 shoulder plates, 2 lace rows each, a lacquer spec px; arm-over-torso rule holds
  (sode ≠ dō tone: black 2 vs dō 1 + separator).
- **Kote** (`Body.kote`, kept): both forearms, `lacquer_black` 1 with 2 iron/brass studs (`cloth_ochre` 4) on the near
  one; hands bare skin (arm end ≥ 2 px).
- **Kusazuri** (`Body.tassets`): 4 hanging plates over the hakama from the obi to mid-thigh, black lacquer with one red
  lace row each, 1-px gaps between plates; dangle ±1 px with hip lag; seated variant sits on the thighs.
- **Hakama** under: `cloth_ash` 3 (cool grey, so legs separate from the black armour on a dark IDE), split + notch
  (`skirtSplit`), visible 4–5 rows below the kusazuri. Feet: zori with a lit toe, ash tabi (no split toe).
- **Katana** (`Body.prop`, `Prop.over: 'hilt'` if needed): sheathed through the obi on his left hip (screen-right),
  `lacquer_black` saya with a red sageo, 3 × 3 brass tsuba, cream/ink grip diamonds; the paper charm is dropped
  (richness budget goes to the armour).

## 2. Ramps (OKLCH L / C / h) — the 1× read vs goth, vampire, knight
- **New `lacquer_black`** (urushi, warm brown-black): 0.15/0.010/45 · 0.20/0.013/50 · 0.26/0.016/55 · 0.33/0.018/60 ·
  0.42/0.018/66 · 0.56/0.016/75 · 0.74/0.014/85. Warm and near-neutral: hue ≥ 90° from `cloth_black` (goth, plum
  h 280–325) and from `cloth_midnight` (vampire, h 228–275) at steps 1–4, C ≤ 0.02 (goth ≥ 0.03, vampire ≥ 0.04).
  Lacquer reads by its **hard 1-px warm spec streak** (shade 5–6), which goth/vampire cloth never has.
- **`lacquer_red`** — as built: the art-director vermilion ramp (see «Art-director round 1»); the spec values below are history. (shu vermilion, orange-red): 0.30/0.090/24 · 0.38/0.130/29 · 0.46/0.160/33 · 0.54/0.175/37 ·
  0.63/0.165/42 · 0.73/0.130/50 · 0.84/0.090/62. Gates (Oklab, at steps 2–4): vs `gem_garnet` (goth, h 12–22, L ≤ 0.50)
  Δh ≥ 12° and ΔL ≥ +0.04 — vermilion, not wine; vs `fx_red` (vampire eyes) Δab ≥ 0.05; vs `cloth_rose` (knight
  raspberry-rose) Δh ≥ 20° and C ≥ +0.05. Red/black area ratio ≈ 1 : 3 (lacing, menpō, obi, sageo, cord).
- **As built (MA-65):** `lacquer_black` = the spec OKLCH steps. `lacquer_red` steps 2–4 retuned (sRGB gamut clips the
  spec chroma and the gates failed as written): 0.53/0.185/46 · 0.61/0.18/50 · 0.68/0.155/55, step 5 0.75/0.125/58 —
  a more orange shu; every §2 gate is tested per step in `tests/unit/art/ronin-palette.test.ts` (fx_red compared at
  the same step, like the other gates).
- Reuse: `hair_umber`, `jade` (eyes), `cloth_ash` (hakama, sleeves under the kote), `cloth_ochre` (studs, tsuba),
  `cloth_cream` (grip, sclera, highlights), `skin`, `cloth_rose` (petted blush only), `ink`. `mist`, `gem_garnet` no
  longer on ronin.
- Dark IDE: lacquer black ≈ IDE background → `silhouetteOutline` on `lacquer_black` (lit 4 / shade 3), red lacing and
  the grey hakama carry the read. White window: judge the black mass first for noise (lacing must not dither).

## 3. Face (stern, §11.9 kit; `face.style: 'stern'` + `Body.mask`)
- Eyes: stern lid over the jade iris top row, 1 × 1 highlight, pupil jade 0; brows hair 1, inner end 1 row lower.
- Mask up (all but `happy`, `petted`, `sleep`): no mouth. `talk_a/b/c` = brow lift 1 row / lid lift 1 row / blink-ish
  half — the eyes talk. `think`: eyes closed (meditation), chin fist kept. `worried`: brows inner-up. `startle`: lid up,
  pupils 1 × 1.
- Mask down: `happy` closed serene arcs + small smile; `petted` closed eyes + tiny smile + blush; `sleep` closed.
- q34: `neutral` + `blink`, mask q34 view.

## 4. Hard rules and originality gate (ADR 005; art-director re-runs before MA-65 art)
1. Menpō = generic historical lower-face shape (nose → chin), rigid lacquer with visible plate edges; **never** a full-
   face mask, never pale/white/bone, never an oni "ghost" face (Ghost of Tsushima), never a metal grille, visor or
   glowing slit (Genji, cyber-ninja, Raiden), never a cloth wrap. Dragon motif original: whiskers + mouth slot only, no
   horns, fangs, teeth row or tongue on the mask.
2. No cloth ninja hood or cowl with the mask; hair and tuft always show (not a Mortal Kombat ninja). No yellow, blue,
   green, grey or all-red ninja colourways (Scorpion, Sub-Zero, Reptile, Smoke, Ermac); armour is black lacquer with red
   lacing, never fully red (Sanada/akazonae read) and never black-on-black with red eyes.
3. No blades, spikes or claws on kote, sode or the dō (Shredder); no helmet, crest or horns (Darth Vader, Kylo Ren,
   For Honor Orochi / Kensei, Nioh, Genichiro).
4. One katana at the hip; no back sword, second sword, bow, straw hat or prosthetic arm (Musashi, Hanzo, Sekiro).
5. Hair umber (never black, silver or red), jaw length; no ponytail or bun — the crown tuft only (§1).
6. No scarf, eyepatch, scar or glasses; no clan mon, kanji or symbol on the armour (no Demon Slayer / Bleach motifs,
   no checker).
7. Warm skin, feet always visible (no yurei read).
**Changed from the MA-29b / D-19 rules and why:** «no mask, menpō or lower-face cloth» (Jin Sakai) → a lacquer menpō
is allowed by owner D-20, bounded by rules 1–2; «no headband / scarf» stays (the menpō is not a scarf); «haori on both
shoulders, open front» and the mist-cloak and haori-wisp rules → void (armour replaces the haori); «one kote on the
right forearm only» → kote on both forearms (armour set); «no mask» in the Yoshimitsu line → only full-face/demon masks
are forbidden; oxblood/`gem_garnet` accent → `lacquer_red` vermilion (garnet belongs to goth).
Tested in `tests/unit/art/ronin.test.ts`: tuft bounds, mask hides every mouth px on mask-up frames, mask down on
`happy`/`petted`/`sleep`, ramp gates of §2, no red px outside the listed parts.

## 5. Richness (ART-BIBLE §12)
Layers: kosode sleeves (ash) → dō + sode → kusazuri → hakama. Signature: the dragon menpō. Materials: lacquer (dō, sode,
kusazuri, saya), red silk cord (odoshi, sageo, tuft cord), cloth (hakama, sleeves), metal (studs, tsuba). Trims at 1×:
lace dashes 1 × 2, plate lines whole rows, no dither on lacquer.

## 6. Pitfalls at 48 px
1. Black armour on a dark IDE: outline + grey hakama + red lacing; never ink-black fill.
2. Lacing noise at 1×: dashes every 2 px on whole rows only; if noisy, keep red on the top row of each plate only.
3. Mask + stern eyes = angry mascot: emotions must change brows/lids (§11.9); mask-down faces must smile.
4. Wide sode vs head width: sode outer x inside the head's outer x; raised arms keep hands outside the head mask.
5. q34 owner rules: monotonic facing contour (menpō inside it), head at hip x − 1, steady head.
6. Kusazuri on `sit_edge` / `sleep`: seated variant; feet show.

## 7. Signature motion (M1+, briefs)
Pomodoro meditation (seated, eyes closed); cutting the cursor (crouch, hand to hilt, 1-frame iai with a cream arc FX);
corner guard (hand on the hilt, slow blink); aphorism talk = eye talk + bubble; bow on greeting.

## History
MA-29b chibi spirit swordsman (mist cloak, ochre, art rounds 1–2, never signed) → D-19 adult haori ronin (MA-46, two art
rounds, rejected D-20). Lookalike lists from both stay valid where they don't contradict §4: Kenshin, Zoro, Jin
(Champloo), Mugen, Jin Sakai, Yasuo, Genji, Hanzo, Afro Samurai, Musashi, Okami, Sekiro, Hornet, Yoshimitsu, Raiden,
Haku, Sesshomaru, Bleach, Demon Slayer, Shinsengumi, Gintoki, Samurai Jack, Ashitaka, Kenpachi, Byakuya, Rengoku,
Sanjuro.
