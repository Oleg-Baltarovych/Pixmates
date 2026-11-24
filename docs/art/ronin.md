# ronin — design spec (MA-29b; adult redesign MA-46)

> **D-19 / ADR 011 (owner, 2026-11-24): adult redesign, frame 56 × 72, ≈ 4.4 heads, male build.** The chibi body below
> (dome head, 48 × 56, ≈ 2.2 heads, bell cloak silhouette, 4 × 4 iris, blush, ochre accent, «no ties/topknots») is
> **superseded**; MA-46 rewrites this spec. Target = the style-spike costume (`reports/sprites/style-spike/`,
> `assets-src/spike/style/figure.ts`):
> - shaggy swept-back `hair_umber`, jade-glint eyes (iris 2 × 3), adult male face and jaw (ART-BIBLE §11.0);
> - charcoal kosode (`cloth_ash`); charcoal split hakama, trapezoid with 2 stiff pleats;
> - dove-ivory `mist` **haori** — open front, square shoulders, square-hanging empty tamoto, hem of tapered 3→2→1-px
>   wisps (the knee mist cloak becomes optional / owner call in MA-46);
> - **oxblood** obi and accent, **replacing ochre** (cord, sageo, tuft cord);
> - **katana through the obi** at the left hip: hilt up ≈ 30° forward, 3 × 3 tsuba, black saya behind the body,
>   showing 6–9 px past the silhouette, angled down (frame width 56 is for it); sageo with the paper charm;
> - lacquer **kote** (forearm guard) with brass px; zori with a lit toe;
> - **futokoro-de idle** (arms withdrawn into the kimono, empty sleeve hanging); `idle_b` thumb on the tsuba;
> - **crown tuft allowed** (Q-D19-2): a short tied tuft with an oxblood cord — never a ponytail or a neat chonmage.
>   This lifts the «no ponytail, topknot or tie» rule of §1 and the lookalike list for the tuft only; the art-director
>   re-checks Jin, Hanzo, Samurai Jack, Kenshin and Musashi at the ronin gate.

Originality gate: **PASS** (art-director, 2026-11-24). Owner decisions 2026-11-24 (§8): colourway B — warm dove-ivory mist (chosen so the green witch and the cloak never clash), paper charm on the sword cord; cloak changed to **knee length** after art round 1 (owner 2026-11-24: the calf cloak and the hakama fused into one dress triangle). Brief: ART-BIBLE §9. A calm
spirit swordsman who speaks in aphorisms. Frame 48 × 56, chibi ≈ 2.2 heads. No portrait, no scar, no reference images.

**Cast rule — not a second ninja next to kitsune.**

| | kitsune | ronin |
|---|---|---|
| Silhouette | small body, big fox tail on one side, ears, scarf, shorts, bare pale shins | symmetric bell: knee-length mist cloak with a flat mantle collar, hakama, smooth dome head (no ears/tufts), one diagonal hilt at the hip |
| Palette | silver, indigo, teal (saturated, cool) | warm dove-ivory mist, near-neutral ash grey, warm umber hair, ochre accent (muted ink-wash) |
| Costume | ninja wrap top, short scarf, side mask, tabi | no mask, scarf, tabi, shorts or shin wraps |

## D-19 lookalikes (adult) — hard rules (originality gate PASS with these, MA-46)
Re-checked for the adult redesign: Jin (Champloo), Hanzo, Samurai Jack, Kenshin, Musashi, Kenpachi, Byakuya, Rengoku,
Yasuo, Sanjuro. These rules replace the old «no ponytail / topknot» entries for Jin, Hanzo and Samurai Jack.
1. Tuft ≤ 2 px wide, ≤ 3 rows, on the crown, centred or 1 px back; a sprout, never a bun or chonmage; nothing trailing;
   an oxblood cord only. (Yasuo / Jin / Hanzo / Samurai Jack: no ponytail, topknot bun or tied tail.)
2. Hair umber (never black, grey, silver or red), at most jaw / nape length; the 3 forehead strands; no headband.
   (Byakuya: no long black hair or kenseikan; Kenshin / Rengoku: no red or flame hair.)
3. Clean-shaven (no stubble px), no scar, eyepatch or glasses. (Kenpachi: no eyepatch, scar; Sanjuro: no stubble.)
4. Haori hem wisps REGULAR and tapered 3 → 2 → 1 px, evenly spaced, in mist tones; never torn rags; tips never warm.
   (Rengoku: no flame-tongue hem.)
5. Haori warm dove-ivory (h 60–95), never white, pale blue or pink, unpatterned. Hakama umber-black (brown hue), never
   neutral black or indigo. Oxblood only on the obi, tuft cord and sageo. No scarf. (Byakuya: no white haori + scarf;
   Kenpachi: no tattered white haori.)
6. Haori on both shoulders, open front, full rectangular sleeves.
7. One katana with a black saya at the hip; no second sword, back sword, wooden sword, straw hat or mask. One kote on
   the right forearm only, never metal or mechanical-looking. (Musashi: no two swords, straw hat.)
8. Futokoro-de: the hand never comes out at the collar or chin (Sanjuro's chin-scratch).
Tested in `tests/unit/art/ronin.test.ts`: tuft bounds, clean-shaven jaw, wisp regularity + mist-only tips, haori hue,
hakama hue in the umber range.

## Lookalikes checked
- Kenshin: no red hair, cross scar, magenta gi, ponytail, straw kasa, reverse blade.
- Zoro: no green hair, exactly one sword, no haramaki, earrings, bandana.
- Jin (Samurai Champloo): no glasses; hakama never blue or indigo (tuft: see «D-19 lookalikes (adult)»). Mugen: no red
  jacket, spiky/afro hair, wrist tattoos.
- Jin Sakai / Ghost of Tsushima: no mask, menpo or lower-face cloth, hood, headband; the cloak is a smooth mist mantle,
  never a fur-trimmed traveller's cape.
- Yasuo: no ponytail, single pauldron, bare shoulder, wind-tornado FX. Genji: no visor, cyborg parts, green glow,
  shuriken. Hanzo: no bow, dragon tattoo (tuft: see below). Afro Samurai: no afro, tagged headband.
- Musashi (Vagabond): no long wild tied hair, two swords, straw hat. Okami: no white wolf, red markings, sun disc.
- Sekiro: no prosthetic arm, scarf; cloak hem is rounded cloud lobes, never torn rags; no grey-and-orange scheme.
- Hornet: no red cloak, horned white mask, needle. Yoshimitsu: no demon/face mask, no manji or swastika-like mark.
  Raiden (MGR): no long white hair, visor, cyborg plates.
- Spirited Away: Haku (green-black bob, white top, teal hakama) — umber hair, grey garb, no white-over-teal; No-Face —
  no black body with a white face mask.
- Sesshomaru: no long silver hair, crescent mark, cheek stripes; the mantle is symmetric and flat, never a fluffy boa on
  one shoulder.
- Bleach shinigami: never black-on-black with a white obi, no numbered white haori, no bells in the hair, no
  sword-name glow.
- Demon Slayer: no checkered pattern anywhere, hanafuda earrings, forehead scar (Tanjiro); no split two-pattern haori,
  low ponytail (Giyu); no water/flame swirl FX.
- Also: Shinsengumi (no pale-blue haori, sawtooth sleeve band), Gintoki (no silver perm, wooden sword, wave pattern),
  Samurai Jack (no white gi; tuft: see below), Ashitaka (no cowl).

Spirit without horror (yurei / jiangshi): feet always visible; warm `skin`, never grey-blue; garb never white; no
triangle forehead cloth, forehead paper charm, hitodama flames or hair over the face; eyes always keep a pupil and
highlights.

## 1. Silhouette
A calm standing bell with a sword-hilt accent. The cloak is wider than the body and narrower than the head; the head
stays the widest element.
- **Hair** (`hair_umber`): smooth chibi dome (crown widths as maid), no ears or tufts; 4 pointed fringe clumps (tips
  6/8/7/5 rows, centre-left longest), parted off-centre toward facing, splits in `j`, tips 1 skin row above the lash,
  brows hidden in neutral. Side locks authored in the head mask (`sideLocks: false`): 2 px wide, straight to the jaw
  line, tapering to a 1-px point curling 1 px inward. `hairBack: 'short'`, `hairBackStretch` ≈ 0.3: layered nape, 2
  pointed flicks showing 1–2 px under the jaw each side. No ponytail, topknot or tie. Angel ring one segment per clump
  on the skull arc, warm (steps 5/6) on the lit left, ≥ 1-px breaks.
- **Mist cloak** (`back: 'cloak'`, R1): front — a panel behind the body from the shoulder line (shoulder joints ± 1 px)
  to the knee (owner, art round 1: `hemRow` 0, frame row 48 — the split hakama legs read as trousers under it); hem ≈ 24 px wide (x 11–37, never past
  the head's outer x), showing 3–5 px each side of torso and hakama. Hem = 3 rounded cloud lobes per side (4–5 px wide,
  1-row dips); the 2 outer corners curl up 2 px in a stepped 1-px wisp that stays attached (no islands). Mist is shape
  and texture only: two horizontal *kasumi* bands with rounded ends (1 row each, mist 5, 2 rows apart, lower third);
  a 2-row ordered dither (mist 3/4) only between the bands, never on the edge; texture fixed to cloak coordinates.
  Binary alpha. q34: panel trails from the nape/back joint, leading edge hidden behind the torso; hem trails ≤ 3 px
  behind the hip on passing frames (1-frame lag), widens 1 px on contact frames.
- **Mantle collar** (`neckAcc: 'collar'`, R3): flat squared cloud mantle 3 rows deep, shoulder width + 2 px each side,
  covering the cloak's top join; 2 lobes per side with 1-px curl lines in mist 3; straight top edge (square, male
  shoulders); a 1-px V at the throat shows the ash kosode collar with 1 cream underlayer px. q34: 1 px narrower toward
  facing; top row ≥ 2 rows below the chin, ≥ 1 neck/skin px between the near lock tip and the collar (no headphone or
  boa read).
- **Hakama**: `hem: 'skirt'` at the rig default length, clothAlt `cloth_ash` 2; front 1-px darker centre split 4 rows
  up from the hem (R4) + rig folds. Legs `cloth_ash`; `farLegShade` 2 in q34.
- **Feet**: zori — shoe mask umber 0–3, a 1-px cream thong strap and a lit toe px (shade 5). No tabi, no split toe.
- **Sword** (prop mask on the hip joint, R2; sheathed only): front on his left hip (screen-right), behind torso and
  arms, over the cloak; the hilt rises out of the hip outline up/out ≈ 35°, x 33–39, rows ≈ 29–34 — kashira cap ash 4
  + lit px, 4-px grip of alternating cream `p` / ink `X` diamonds, 3 × 1 brass tsuba (trim 4, shade 2 under), 2-px saya
  mouth ash 1 with a lit px at 3; saya runs behind the body, tip shows 2–3 px behind the screen-left hem corner at knee
  height. q34: same hip, now far — the hilt pokes 3 px ahead of the belly at waist height under the near arm's swing
  (arm over it); the saya trails down/back ≈ 25°, tip 2 px clear of the cloak's trailing edge. Mirror swap accepted.
  **Paper charm** from the sageo under the tsuba: 1-px ochre cord, 2 × 3 cream slip, 1 ink stroke (no glyph), swings
  1 px against the hip lag (R2 dangle); never at the forehead or chest.
- **Width budget**: the hilt is the only element past the cloak (x ≤ 40 front). Headroom unchanged.

## 2. Ramps (OKLCH L / C / h)
- **New `mist`** — owner colourway B, warm dove-ivory (h 60–95 in the lights and mids, greyed-mauve shadows; keep the
  L steps): 0.40/0.020/320 · 0.50/0.020/340 · 0.60/0.022/20 · 0.70/0.024/55 · 0.79/0.024/70 · 0.87/0.022/82 ·
  0.94/0.016/92 (targets; lead-dev may tune within ±0.01 C / ±10° h). Gates: Oklab Δab ≥ 0.03 vs `fur_ash` and vs
  `fur_cream` (knight) at matching steps, and ≥ 0.04 ΔL vs `cloth_cream` at the panel step, so the cloak never reads as
  kitsune's fur, knight's fur or a cream apron; C ≤ 0.03 (a mist, not a beige cloth). Shades: panel 4, lit left 5,
  kasumi 5, lobe curls 3, outline 1 (lit 2). The original sage variant (A) is kept only as history.
- **New `cloth_ash`** (kosode, hakama, legs, saya; near-neutral grey): 0.25/0.012/262 · 0.32/0.015/256 ·
  0.39/0.018/250 · 0.47/0.020/244 · 0.56/0.020/236 · 0.66/0.018/228 · 0.77/0.014/218. Gates: vs `cloth_indigo` C ≤
  0.02; vs `cloth_black` base L ≥ 0.12 higher, no plum hue.
- **New `hair_umber`** (warm dark brown, never copper/red): 0.22/0.030/25 · 0.29/0.040/35 · 0.37/0.046/45 ·
  0.46/0.050/55 · 0.56/0.048/65 · 0.68/0.044/75 · 0.82/0.040/85. C ≤ 0.05; hair mid vs kosode ΔL ≥ 0.05, hue ≥ 150°.
- **New `jade`** (eyes): 0.30/0.050/190 · 0.42/0.070/178 · 0.55/0.085/168 · 0.68/0.090/160 · 0.80/0.075/152 ·
  0.91/0.050/140.
- Reuse: `skin`; `cloth_ochre` (obi, sageo, tsuba); `cloth_cream` (charm, grip diamonds, sclera, highlights, zori
  strap); `cloth_rose` (blush); `ink`.
- Palette tests for all 4 new ramps: darkest ≠ #000, L monotonic, hue drift ≥ 15°.
- White window: the pale cloak relies on its mist 1/2 outline (judge white first). Dark IDE: the cloak carries the
  read; the ash body needs the 2-step rim plus lit zori and hilt px.

## 3. Costume
- Kosode `cloth_ash`, `dressShade` 3; crossover collar V under the mantle opening (in the neckAcc mask).
- `sleeves: 'long'`, `sleeve: { ramp: 'cloth_ash', shade: 4 }` (5 if the p10 ΔL gate fails), `cuff: { ramp: 'cloth_ash',
  shade: 1 }` (art round 1: cream cuffs read as a blouse, mist cuffs as noise). No `sleeveOverHand`.
- Obi: `sash: { rows: 2, dy: 2 }` ochre, no knot — one ash-3 kosode row with the ash-1 crossover V shows between the
  mantle (mist-1 bottom outline, hard corners) and the obi. Hakama (art round 1): `skirtSplit` rows 9, notch 4 +
  `notchShade` 0, `hemHalf` 8 (trapezoid), pleats [3, 6] ash 2 (lit ash 5), rim ash 4 / 5; charm `overHem` over it.
  Art round 2: q34 split (`skirtSplit.q34` rows 5, notch 4, pass notch 2, near-leg pleat ash 2); front side locks
  taper 1 px inward every 3 rows and end in a 1-px inward-curling point; grip rim ash 4 / lit ash 5 on its upper-left
  edge; the mantle's lower 2 rows stop at the sleeves (square top corners kept).
- `variants: { headAcc: 'none' (R5 if needed), hairBack: 'short', hem: 'skirt', back: 'cloak', neckAcc: 'collar', sleeves: 'long' }`
- `ramps: { hair: 'hair_umber', cloth: 'cloth_ash', clothAlt: 'cloth_ash', trim: 'cloth_ochre', legs: 'cloth_ash', tail: 'mist', tailTip: 'mist' }`; cloak ramp `mist`.
- outfit: skin · hair `hair_umber` · horn → `mist` (mantle letters, `hornOutline: 'mist'`) · dress `cloth_ash` · apron
  `cloth_cream` · trim `cloth_ochre` · shoe `hair_umber` (zori) · eye `jade` · blush `cloth_rose` · ink.
- Opt-ins reused: sash, cuff, sleeve, dressShade, silhouetteOutline (+ mist entry), hairBackStretch, sideLocks false,
  lockLean, farLegShade, hideFarShoulder, masks.hairFar, tweaks.

## 4. Face
- **Eyes** (jade: c = 0, i 2, I 3, k 4; lower highlight jade 5 = the "spirit" glow): calm, gentle *tareme*. Thin 1-px
  lash straight across with the outer end dipping 1 row down (never an up-flick). Iris 4 × 4 fully visible. Pupil
  2 × 2 in jade 0 (not ink) — pale, luminous. 1 × 2 cream highlight top-left (same side both eyes), 1-px jade-5 lower
  highlight, outer sclera sliver. No aura px, dark sockets or pupilless glow.
- **Neutral**: composed closed mouth — 2-px ink `XX` on the axis + 1-px skin-2 softener each side; no smile, no fang;
  1 `f` blush px per cheek; brows hidden; ≥ 1 skin row above the chin.
- **Signatures** (composure is the baseline, so small breaks read big): happy — serene closed flat lines with drooped
  outer ends (not `^^`, not goth's arcs), small 3-px smile, `fFFf`; petted — eyes close slowly, tiny smile, full blush;
  think — both eyes closed (meditation), flat mouth, chin fist kept; startle — lash lifts 1 row, pupils 1 × 1, sclera
  both sides, small `o`; worried — 2-px brows inner ends up (visible only here), wavy 3-px mouth.
- q34: `neutral` + `blink`; near eye full, far eye 1 px narrower, near-cheek blush px.

## 5. Signature motion (M1+, briefs)
Pomodoro meditation (seated, eyes closed, 1-px float bob at 4 fps, kasumi bands drift 1 px every 4 frames — the only
animated texture, kept out of the shared anims); cutting the cursor (2-frame crouch, hand to hilt, 1-frame iai draw
with a cream/mist arc smear FX ≤ 7 × 7, 2-frame sheathe with a cloak flare; the drawn blade only in this anim as its
own prop mask); corner guard (hand on the hilt, cloak drawn in 2 px, slow blink ~6 s, charm sway); aphorism talk (one
open hand at chest height); land (cloak billows 2 px, settles over 2 frames).

## 6. Pitfalls at 48 px
1. Pale cloak on a white window (judge first): the mist 1/2 outline must hold; deepen lobe curls to mist 2 if they melt.
2. Bell cloak + skirt reads as priest/wizard/girl: the flat squared mantle top, hakama split, short hair, thin lashes
   and a ≥ 5-px contrasting hilt keep "male swordsman"; if still a robe, shorten the cloak to the knee (Q3).
3. Mist noise at 1×: dither only between the bands, ≤ 2 rows, never on the edge, no 1-px islands (builder check).
4. Yurei read: feet and warm skin always; the cloak never covers the feet, sit_edge and sleep included (on `sit`, hem =
   seat row + 3).
5. Front hilt vs the screen-right arm: the arm draws over it with a 1-px separator; ≥ 3 px of hilt on wave and think.
6. q34 owner rules: monotonic facing contour, collar ≥ 2 rows under the chin; head joint at hip x − 1 (+
   `tweaks.head.dx: −1` if the trailing cloak pulls the read forward); near lock 2 px from the temple, tapering, no ear
   bulge; steady head — never "fix" the hilt protrusion by moving the head.
7. Cloak hem jitter in idle: chain lag ≤ 1 px, quantized, at most one direction change per breath cycle; seamless loops.
8. Hair vs saya vs zori: keep the saya in ash 1–3 (cool) so it never merges with the warm hair or zori.

## 7. Rig work
- **R1** `back: 'cloak'` + `Body.cloak` (required; a cloak slot, not scarf chains — those are 2-px strokes): procedural
  panel from the shoulder line to a 5-point hem polyline; hem points take the hip lag + `hairDx` (front ≤ 2 px, q34
  trailing ≤ 3 px via `maxTrail`), lift 1–2 px on `hairLift`, widen 1 px on squash/land; `sit` hem = seat + 3;
  `dangle` hangs straight and 2 px narrower; lobed hem generator (lobe width/dip), kasumi band rows, banded ordered
  dither (cloak-local); new part id `cloak` (LABEL `none`), depth behind the back hair in both views, q34 from the
  back joint; params `{ ramp, shade, top, hemRow, widths, lobes, bands, maxTrail }`. Tests: dummies + maid/kitsune/goth
  byte-identical, binary alpha, no isolated px, headroom.
- **R2** `Body.prop` / `BodyView.prop` (required): authored mask on the hip joint, depth `behindTorso` (over cloak and
  back slot, under torso, hem and arms); new part id `prop`, ignored by arm-over-torso labels; optional `dangle`
  sub-mask offset by clamp1(hip lag) for the charm. No new joint.
- **R3** `neckAcc: 'collar'` (required, trivial): mask-only variant on the neck mask path, like `choker`.
- **R4** `Body.skirtSplit { rows, shade }` (small): 1-px centre line from the hem, front only.
- **R5** `headAcc: 'none'` (only if needed).
- **R6** `silhouetteOutline` entry `{ ramp: 'mist', lit: 2, shade: 1 }`; palette tests for the 4 new ramps.
- Fit: frame 48 × 56 unchanged; the 16 shared anims unforked; no drawn blade in them.

## 8. Owner decisions
- **Q1 Colourway**: A (recommended) sage mist cloak, ash-grey kosode/hakama, warm umber hair, ochre obi/cord, jade eyes
  (not chosen: it clashes with the moss witch); B warm dove-ivory mist (h 60–95), same body; C pale spirit-blue mist + slate body
  (not recommended: a second cool kitsune palette).
- **Q2 Charm**: paper slip on the sword cord (recommended) or a small brass bell on the cord (never in the hair).
- **Q3 Cloak length**: calf (recommended; spirit read, feet still show) or knee (simpler sit/sleep, safer vs robe read).
