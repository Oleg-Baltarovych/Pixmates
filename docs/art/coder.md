# coder — design spec (MA-29d, MA-66)

Brief: D-18, D-20 (stern), **D-21 (owner redesign 2026-11-27)**. A sleepy night-owl coder boy with dry humour — the
Dev companion: an unimpressed senior dev in a **black hoodie with the hood always up**, rectangular steel glasses and
one mustard accent. Frame 48 × 56, chibi ≈ 2.2 heads, shared rig poses. Must read clearly **male** at 1× (boy cues:
visible straight brows, no lashes flick, boxy shoulders, jeans, chunky sneakers).

Originality gate: **PASS for the redesign, pending art-director round 2** (lookalikes below). Every character is also
checked against the whole cast (ART-BIBLE §12 p. 5): the coder must not resemble `ronin` or `goth`, the other two
stern, dark-clad cast members.

## Owner decision D-21 (2026-11-27) — reverses earlier rules
- The hoodie is **black** and the hood is **always up** — in all 16 shared anims, every emotion, sleep included.
- He must **not look like ronin**. Variant **A (mustard accent)** chosen over B (terminal-green) and C.
- **Reversed** (earlier art-director / spec rules, now void): «the hood is down in all shared anims», «never a black,
  charcoal or red hoodie», «no hood-up-in-the-dark», «Elliot: never black, hood down». Also dropped: the mustard
  hoodie, the indigo lanyard cord, the messy bedhead with a cowlick, the eye bags, the `{ }` chest print (round 1).
- New general rule: every character has a unique style and resembles no other cast member (ART-BIBLE §12 p. 5).

## Design (D-21)
- **Hood** — drawn in the coder's own head masks (`HEAD`, `HEAD_Q34`; no shared-rig change): a round chibi dome, no
  point, no ears, no seams on top, lit top-left (onyx 3–4) with the shade side onyx 0–1. Its edge is a 1-px **mustard
  rim** (lit `r` = mustard 4, shade `T` = mustard 3) from the crown down to the jaw on both sides, framing the face.
  Inside it: a 1-row hair shadow and a 5-clump **cocoa fringe** with two gaps that show the brows. q34: the hood wraps
  the back of the head and stops at the brow on the facing side, so the face is open below the eye row. No back hair
  (an empty authored `hairBack` mask replaces the procedural mass in both views).
- **Glasses** — rectangular steel frames (`horn` = metal 2): outer + inner posts on the eye rows, a bridge 1 row under
  the lid, one lower rim under the iris; the lash/lid is the frame's top. Clear lenses (skin inside, no tint, no glare,
  no glow). No face part ever paints over a frame px (blush sits under the rim; worried / startle eyes are cut to the
  lenses).
- **Hoodie** — `cloth_onyx`: body step 2, folds step 1, lit collar step 3, sleeves step 4, cuffs step 1, silhouette
  outline lit 5 / shade 3 (the only light edges on the black mass, 1 px). Chest (`torsoMask`, 12 × 12): collar, a 2-px
  steel zipper pull on the axis, **two mustard drawstrings** either side of it (4 px and 3 px, lit tips), a pocket line
  (8 px onyx 0; q34 5 px), the ribbed waistband with a tick every 4 px, 3 broken cream px of the tee hem lit-left.
- **Signature: badge on a steel chain** — a 1-px steel chain from the collar's right side to a steel-5 clip, a blank
  3 × 3 cream badge with a 2-px mustard `>_`. No logo, name, photo or QR; never PowerShell's blue tile or the Windows
  Terminal tile.
- **Mustard accent** — exactly three places: the hood rim, the drawstrings, the badge mark.
- **Legs and feet** — straight rolled indigo jeans (`hem: 'shorts'` seat, `shinWrap` cuff), chunky **cream** sneakers
  (authored in `apron`; the `shoe` slot is cream too). No stripes or logos.
- **Layers / materials** (ART-BIBLE §12): tee → hoodie → chain + badge; knit, denim, rubber soles, steel
  (glasses, pull, chain).

### As built (MA-66, art-director round 2 notes applied, 2026-11-27)
- Started from the owner-approved spike patch (variant A); changes on top of it:
  - **Sleeves onyx 4** (spike: 3). Onyx 3 equalled the shade-side silhouette outline (onyx 3) where the raised
    forearm meets the torso edge on `petted/2` and `petted/6` → arm-over-torso p10 ΔL 0. Onyx 4 gives ΔL ≥ 0.06 on every
    frame; the gate is unchanged.
  - **Eye bags dropped**: the glasses' lower rim takes their row (face row 9) and the bags punched skin into the rim.
  - **Worried / startle**: own eyes cut to the lens width (the kit's startle is 1 col wider and painted over the
    inner posts and the rim); the lid sits 1 row above the frame top so a 5-row iris shows (the stern validator needs
    the lid to break). **Blush** (`ff`) moved 1 row down, under the rim.
  - `cloth_phosphor` (variant B) dropped from the palette; dead code removed (`CROWN`, `HAIR_BACK_Q34`,
    `HAIR_FAR_Q34`, `hairBackStretch`, the kit-eye helper).
- **Art-director round 2 (APPROVE WITH NOTES, 2026-11-27), applied:**
  - **Rim (MUST):** front top row cols 7–22, each top corner bevelled in 2 diagonal steps (lit `r` mustard 4, shade
    `T` mustard 3), sides from row 11, the last rim px bent 1 col in toward the jaw; q34 facing-side corner: top row to
    col 24, one mustard-3 diagonal px, side from row 10. Tests pin the corner boxes (a refilled corner px fails).
  - **Hood on dark wallpapers (MUST), adjusted:** the outermost px is the rig's silhouette outline and its tones are per
    ramp for the whole body (`silhouetteOutline` lit 5 / shade 3). Shade 4 body-wide fails the arm-over-torso gate on
    `petted/2`, `/6` (ΔL 0 against the onyx-4 sleeves), and the shared rig is out of scope. So the hood's own shade-side
    edge px are onyx 2, which the rig's rim light lifts to **onyx 4**, from the crown to the jaw, over onyx 0–1 on the dome:
    outline O3 | O4 | O0–1. The lit top-left outline arc is onyx 5 and unbroken, with a 4-px onyx-4 sheen arc just inside
    it (the old stair-corner lights went into it). Rendered tests cover all three.
  - **Glasses:** posts and bridge metal 1 (`N`), lower rim metal 2. Brows untouched (hair 0, skin row above).
  - **Chest:** badge 3 × 4 cream; mustard-5 tip on the lit (screen-left) drawstring only; one 3-px onyx-3 fold from
    the near armpit toward the pocket (front + q34); one onyx-3 lit px on each shoulder. The shoulders are rig sleeves
    outside the torso mask, so the px sit on the torso's top corners under the collar (front only).
  - **Closed eyes:** 1 row lower, on the row right above the lower rim and 3 rows under the bridge, so there is no
    bridge / lid / rim «≡». At 1× the lid sits on the rim like a heavy lower lid.
- Stern look (ART-BIBLE §11.9) kept: a hooded 2-row lid over the top of the iris with the brow–lid wedge, dark ash
  iris, one 1 × 1 highlight, no lower highlight on neutral/talk; brows hair 0 through the fringe gaps with one skin row
  above the lash; flat 3-px mouth; blush only on happy and petted. Happy lifts the lid off a 5-row iris.
- Tests (`tests/unit/art/coder*.test.ts`): the hood covers the crown (top 3 head rows onyx only) and every fringe px
  sits under the mustard rim in **every frame of every animation**; each neutral iris has steel posts either side and
  a steel rim under it, lenses clear, no expression part on a frame px; q34 contour measured on the head outline (not a
  skin count, so the glasses don't skew it); drawstrings, pull, chain → clip → badge with a 2-px `>_`, pocket line.

### History (rounds 0–1, superseded by D-21)
- Round 0 (2026-11-26): mustard half-zip hoodie, hood down and bunched behind the neck, indigo lanyard with a cream
  badge, `{ }` print, cocoa bedhead with one cowlick, eye bags.
- Round 1 (2026-11-27): darker hooded eyes with a brow–lid wedge (kept), `{ }` print removed (kept removed), flat
  bedhead with a sideways cowlick (gone under the hood), clean pocket line (kept).

## Lookalikes checked (D-21)
What keeps him generic: a **round chibi hood** (no point, no ears, no cape), **bright grey-blue eyes behind clear
glasses** (no face shadow, no glow, no mask), the **mustard** accent, **jeans** and **cream sneakers**, a **blank
badge**, and **no code-rain** or green-on-black anywhere.
- **Elliot Alderson (Mr. Robot)**: black hood up is his read — broken by the glasses, the mustard rim and strings, the
  chibi face lit with no hood shadow, the badge, cream sneakers; no fsociety mask, no red, no tired dark-ringed eyes
  (eye bags dropped).
- **Assassin's Creed**: no pointed / beaked hood, no white or red, no sash, belt, bracers, blades or eagle crest; the
  hood edge is a plain rounded mustard line.
- **Sung Jin-Woo (Solo Leveling)**: no glowing blue/purple eyes, no shadow aura or smoke, no long black coat; eyes
  stay grey-blue with a 1 × 1 cream highlight.
- **Kenny (South Park)**: no orange parka, no drawn-tight face opening, no fur trim; the face is fully open.
- **Hackerman tropes**: no balaclava, sunglasses, Guy Fawkes mask, binary/matrix rain, green text; code FX cream or
  mustard. Hood up is allowed (D-21), the rest stays banned.
- **L (Death Note)**: no white top, no black messy hair (cocoa fringe), no crouch-sit or thumb-bite, no eye bags.
- **Kenma (Haikyuu)**, **Kido / Seto (Kagerou)**: no two-tone hair, no red, purple or green hoodie, no game console.
- **Sans (Undertale)** and the Eddsworld hoodie cast: no blue / green / red / purple hoodie, no fur hood, no shorts or
  slippers.
- **Hachiman / Gintoki / Oreki**: no dead-fish eyes without a highlight, no silver perm, no school uniform.
- **Zenitsu / Ryuji**: the yellow is a muted mustard accent only (C ≤ 0.115, never lemon), hair never blond, no
  triangle pattern, no open jacket.
- **Shinji / Rei, Kirito, Futaba, Hiro Hamada, Watch Dogs 2**: no headphones, earbuds, black coat, swords, cap, LED
  mask or glyph eyes, no robot print.
- **Peter Parker / Miles Morales, Gon, Edward, Lain, Tetsuo**: no red + blue or black + red, no spider/web, no
  spiky-up hair, no goggles, no bear-ear hood, no red cape.
- **Hoodie-with-ears mascots**: no ears, horns or tails on the hood.
- **Brands**: no real logo anywhere (GitHub, VS Code, Windows, Apple, Python, Tux, Java, Anthropic/Claude spark);
  plain sneakers; the M1 mug is plain cream.
- **Inside the cast** (ART-BIBLE §12 p. 5): vs **ronin** — no armour, cloak, menpō, katana, warm lacquer black or
  red; a neutral black (chroma gate) and a round hood over a fringe, not a bare head. vs **goth** — no long hair,
  purple-black, lace, moth or corset. vs **kitsune** — no ears, tail, bob or bare legs. The only cast member with a
  hood up, glasses, jeans and a yellow accent.

## 1. Silhouette
A broad, boxy, slightly slouched T: a round hood dome (the widest part), square dropped shoulders (`tweaks` shoulders
1 px out), straight jeans, chunky sneakers set 1 px wider each side. Headroom: row 0 clear in every frame. Width
budget: the hood stays widest; nothing past x 10–38 in front except raised arms. `sideLocks: false`, no back hair.

## 2. Ramps (OKLCH L / C / h)
- **New `cloth_onyx`** (hoodie, hood, collar, rib, pocket line): 0.10/0.004/286 · 0.13/0.005/262 · 0.16/0.005/264
  (body) · 0.20/0.005/248 · 0.26/0.005/248 (sleeves) · 0.36/0.004/220 · 0.52/0.004/248. A neutral true black.
  - Gates (`tests/unit/art/coder-palette.test.ts`): step 2 L ≤ 0.18, every step C ≤ 0.006; ≥ 0.12 L under ronin's
    `cloth_ash` 2; shared ramp rules (7 steps, L rising, ≠ #000, hue drift ≥ 15°).
  - **Gate change (D-21)**: the old Oklab Δab ≥ 0.02 split from the cast's blacks cannot hold for a neutral black (it
    sits 0.014–0.033 Δab from them). The split is **chroma** instead: goth's `cloth_black` (purple, C 0.02–0.05),
    `hair_black` (blue, C 0.02–0.04) and ronin's `lacquer_black` (warm, C 0.01–0.02) each carry ≥ 2.5× the chroma of
    the nearest-L onyx tone at steps 1–4 — tinted blacks vs a neutral one — plus silhouette (hood vs long hair /
    armour + cloak). The owner's "true black" outranks a Δab gate.
- **`cloth_mustard`** (accent: hood rim, drawstrings, badge mark): 0.30/0.060/50 · 0.40/0.080/66 · 0.51/0.095/76 ·
  0.62/0.105/88 · 0.72/0.100/95 · 0.82/0.085/100 · 0.91/0.065/100. Gates: C ≤ 0.115, h ≤ 100 (never lemon); Δab ≥ 0.04
  from the nearest-L `cloth_ochre` (the witch's tights) at steps 2–4; steps 3–4 ≥ 0.4 L over the hoodie body.
- **`hair_cocoa`** (fringe, brows): 0.20/0.030/345 · 0.27/0.036/0 · 0.34/0.040/10 · 0.42/0.042/15 · 0.52/0.040/30 ·
  0.64/0.034/50 · 0.78/0.028/70. Gates: C ≤ 0.045; ≥ 30° hue + Δab ≥ 0.02 from ronin's `hair_umber`; mid ≥ 0.15 L
  under the mustard rim that frames it.
- Reuse: `metal` (glasses, pull, chain), `cloth_indigo` (jeans), `cloth_cream` (tee hem, badge, sneakers, sclera),
  `hair_ash` (eyes, cool grey-blue), `skin`, `cloth_rose` (blush on happy/petted only, mouth interiors), `ink`.

## 3. Costume (as built)
- `variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'none', neckAcc: 'none', sleeves: 'long' }`
- `ramps: { hair: 'hair_cocoa', cloth: 'cloth_onyx', clothAlt: 'cloth_indigo', trim: 'cloth_onyx', legs: 'cloth_indigo' }`
- Outfit slots: `dress` onyx · `trim` mustard · `horn` metal · `apron` cream · `shoe` cream · `eye` hair_ash ·
  `blush` cloth_rose · `ink`.
- `dressShade` 2, `sleeve` onyx 4, `cuff` onyx 1, `silhouetteOutline` onyx lit 5 / shade 3 + cocoa 2 / 1, `sash`
  2 rows (rib), `shinWrap` row 1 shade 4, `farLegShade` 2, `hideFarShoulder` (q34), `hairBack` empty in both views.

## 4. Face
- **Eyes** (`hair_ash`; `c` = ash 1, `C` ash 0, `K` highlight): a hooded 2-row lid across the whole eye, 1 px past the
  outer corner, the lower lid row's inner end dropping 1 px onto the iris (brow–lid wedge); 3 iris rows show; 2 × 2
  pupil under the lid; one 1 × 1 highlight top-left; no lower highlight on neutral / talk; all inside the glasses.
- **Brows** (boy cue): hair 0 through the fringe gaps, the stern step (inner end 1 row lower), one skin row above the
  lid.
- **Neutral**: flat 3-px `XXX` 1 px right of the axis; no blush, fang or nose. Blink / petted / sleep: a flat closed
  line on the lid row, above the rim.
- **Emotions break the stern read**: happy — lid lifts off a 5-row iris, extra lower highlight, lopsided smile, `ff`
  blush; petted — closed lines, 2-px smile, `ff`; startle — lid 1 row above the frame, sclera both sides, 5-row iris,
  small `o`; worried — lid above the frame, 5-row iris, brows inner-up, open mouth; wince — one eye shut; think —
  irises to screen-right, set brows, grim mouth.
- q34: `neutral` + `blink`; near eye full, far eye 1 px narrower; near brow 4 px, far 3 px; mouth toward the facing.

## 5. Signature motion (M1+, Dev companion briefs)
Sip (mug to the mouth over 2 frames, steam of 2–3 cream-grey wisps); session start (cracks knuckles, air-types on the
taskbar edge); tests pass (1-frame lid lift + tiny fist pump); tests fail (pulls both drawstrings tight for 2 frames,
then a slow `...` FX); deploy (crossed fingers + sweat drop); late night (head bobs 1 px on a 6-s cycle, snaps awake);
think/debug (talks to a 4 × 4 generic rubber duck); sleep (glasses slip 1 px, Zzz). The hood never comes down. Code FX:
cream or mustard `{ }` / `;` glyphs, never green, never binary rain.

## 6. Pitfalls at 48 px
1. Black on a dark IDE: the hood relies on the onyx-5 lit outline and the mustard rim; judge the `#1b1f2a` row first.
2. Black hood + face = "assassin" read: keep the face fully lit (no hood shadow band over the eyes), glasses clear,
   highlight present.
3. Glasses can bury the stern eyes at 1×: the lid must stay the darkest line; no face part on a frame px (tested).
4. Sleeve over torso (black on black): sleeve onyx 4 vs body 2 and the outline 3, separator kept; p10 ΔL gate.
5. Chest noise on 12 px: drawstrings, chain + badge and the pocket line are the only reads; nothing else on the chest.
6. q34 owner rules: monotonic facing contour (head outline), head joint at hip x − 1, steady head, q34 no wider than
   the front.

## 7. Rig work
None for D-21: the hood lives in the coder's head masks, the back hair is an empty authored mask, all other options
are existing opt-ins. Earlier rig items (R-C1 `neckAcc: 'hood'`, R-C2 cuff flare, R-C4 shorts flare) were not needed.
Open from round 1: the q34 jeans seat bump on passing frames is the procedural `hem: 'shorts'` seat (shared-rig opt-in).

## 8. Owner decisions
- **D-21 (2026-11-27)**: black hoodie, hood always up, not like ronin, variant A (mustard accent), glasses; the
  uniqueness-across-the-cast rule (ART-BIBLE §12 p. 5). Supersedes Q1 below.
- Q1 Colourway (2026-11-24): A "Night shift" (mustard hoodie) — superseded by D-21.
- Q2 Mug: (a) M1 signature prop only — still holds.
- Q3 Chest detail: (a) `{ }` print — removed in round 1 (no room on the 12-px chest), stays removed.
