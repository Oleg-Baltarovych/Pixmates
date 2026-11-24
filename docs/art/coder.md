# coder — design spec (MA-29d)

Originality gate: **PASS** (art-director, 2026-11-24), with conditions re-checked every round: (1) no hood ears, ever;
(2) the hood is down in all 16 shared anims; (3) never a black, charcoal or red hoodie; (4) hair never black,
green-black or blond-with-dark-roots, never spiky-up. Owner decisions 2026-11-24 (§8): Q1 A "Night shift", Q2 (a) mug only as an M1 signature prop, Q3 (a) `{ }` chest print. Brief: D-18. A sleepy night-owl
coder boy in an oversized hoodie with dry humour — the Dev companion. Frame 48 × 56, chibi ≈ 2.2 heads, shared rig poses.
Must read clearly **male** at 1× (kitsune read as a girl because of bob hair to the jaw, big up-flicked eyes, hidden
brows and bare legs — every boy cue below targets one of these).

**Cast rule — the only boy in trousers, the only warm-yellow mass.**

| | kitsune | ronin | coder |
|---|---|---|---|
| Silhouette | ears, tail, bob hair, shorts, bare shins | bell cloak, smooth dome | messy flat bedhead + one cowlick, boxy hoodie with dropped shoulders, hood bunched behind the neck, straight jeans, chunky sneakers |
| Palette | silver / indigo / teal | dove-ivory / ash / umber | mustard / denim / cocoa / cream |

## Lookalikes checked
- L (Death Note): hair cocoa, never black; hoodie never white; shoes always drawn; no crouch-sit, no thumb-bite (think
  uses the chin fist); eye bags 2 px of skin 2, never ink or dark rings.
- Elliot / Mr. Robot: never black or charcoal; hood down in the shared anims.
- Kenma (Haikyuu): no two-tone hair, no red, no game console (M1 included). Satou (NHK): no track jacket, side stripes,
  green.
- Hackerman tropes: no balaclava, sunglasses, hood-up-in-the-dark, green matrix/binary-rain FX, green-on-black text;
  code FX are cream or amber.
- Fix-It Felix (no cap, hammer, blue-and-brown), Ruby Rose (no red hood), Octocat (no cat-octopus, tentacles, logo).
- Shinji / Rei: no headphones, earbuds or SDAT player (q34 rule too); no white shirt + black trousers, blue hair, red
  eyes. Kirito / Kazuto: no black coat, black hair, swords. Sung Jin-Woo: no black hood, glowing eyes, aura.
- Gon: never spiky-up, never green-black, no green jacket. Peter Parker / Miles Morales: no red + blue, black + red,
  spider or web motif (chest print included), red sneakers, spray paint.
- Edward (Cowboy Bebop): no red hair, forehead goggles, never barefoot. Lain: no bear-ear hood, no single asymmetric
  side lock, braid or clip. Tetsuo: no red cape, short black hair.
- Hoodie-with-ears mascots: no ears, horns or tails on the hood (a mustard hood with ears reads Pikachu).
- Also: Shikamaru (no ponytail), Mob (no bowl cut), Oreki (no uniform), Naruto (no orange, blond spikes, whiskers).
- Brands: no real logo anywhere (GitHub, VS Code, Windows, Apple, Python, Tux, Java, Anthropic/Claude spark); plain
  sneakers (no swoosh, stripes, star patch); the mug is plain cream with cream-grey steam (no Java cup, Starbucks or
  Docker motifs).

## 1. Silhouette
A broad, boxy, slightly slouched T: wide flat-topped messy head, square dropped shoulders, straight jeans, chunky
sneakers set wide.
- **Hair** (`hair_cocoa`): chibi skull (crown widths as maid); the top line broken by 3 flat bedhead tufts lying
  sideways (2–3 px, tips out or down, never up) + one cowlick curl on the crown right of the axis (3-px hook). Headroom:
  the cowlick top + outline at or below kitsune's ear top at rest; the happy apex at frame row 3 or lower (rig test).
  Fringe: 5 messy clumps, uneven tips (5/7/4/6/5 rows), two kicking 1 px sideways in opposite directions, splits in
  `j`, tips ≥ 1 skin row above the brow row; **two fringe gaps** (2nd and 4th splits) expose the brows. `sideLocks:
  false`; side hair authored as short squared sideburns (2 px wide, ending at eye-bottom + 1, tapering only 1 px — no
  lock to the jaw). `hairBack: 'short'`, `hairBackStretch` ≈ 0.2, 2 short 1-px flicks at the nape. Angel ring one
  segment per clump, broken by the tufts, warm lit left. No dither, no islands.
- **Hood, down** (`neckAcc: 'hood'`, R-C1): front — a flat U of bunched hood behind the neck, a 2-row rim above the
  shoulder line inset 1 px from each shoulder's outer x; inner lining mustard 1 (inside the U only); top row ≥ 2 rows
  below the chin; the crossover collar opens in a 3-px V with a 1-px mustard-1 seam. q34: a 5 × 4 lump trailing behind
  the nape, top ≥ 2 rows below the jaw line and below the nape flick, attached to the torso's back edge, never curving up
  toward ear height. No ears, no piping.
- **Hood strings**: front — two 1-px cream strings (`cloth_cream` 4, aglet px 5) from the collar V at x 22 and 26,
  starting ≥ 3 rows below the chin, lengths 4 and 3 rows (one "chewed" shorter), straight down, ≥ 2 rows above the
  pocket, never near the jaw edge. q34: only the near string (3 px), straight down inside the torso. Static in M-ART
  (R-C5 lag optional).
- **Hoodie**: oversized boxy torso, `dressShade` 3; dropped shoulders via `puff` (knight R3) flattened (rx 3.0, ry 2.0)
  + `tweaks` shoulders 1 px out each side in front; kangaroo pocket 10 × 4 trapezoid on the belly (top edge mustard 2,
  side openings 1-px diagonals in mustard 1, bottom 1 row above the rib band); rib waistband `sash: { rows: 2 }` mustard
  2 with a 1-px vertical rib tick every 2 px (shade 1), over the jeans top.
- **Sleeves**: long, mustard 4; 1-row ribbed cuff mustard 2, **no bell flare** (R-C2); hands fully visible (no
  `sleeveOverHand` — sweater paws read feminine).
- **Legwear**: straight jeans — `hem: 'shorts'` as the jeans' seat (clothAlt `cloth_indigo` 2, raise 0, crotch notch
  kept, **leg-hem flare off**, R-C4), legs `cloth_indigo`, `shinWrap: { row: 1, shade: 4 }` as a rolled denim cuff;
  q34 `farLegShade: 2`.
- **Sneakers** (shoe mask, `cloth_cream`): upper 4, a 1-row sole at 5 + a shade-2 sole line, 1-px lace px at 2, lit toe
  at 5; front 1 px wider than maid's; q34 the 5-px side shoe + a 1-px heel tab; no stripes or logos.
- **Stance**: feet 1 px wider each side in front (`tweaks` footL dx −1, footR +1; q34 walk unaffected).
- Width budget: the head stays widest; nothing past x 10–38 in front except raised arms.

## 2. Ramps (OKLCH L / C / h)
- **New `cloth_mustard`** (hoodie, pocket, rib, hood): 0.30/0.060/45 · 0.40/0.085/58 · 0.51/0.100/70 · 0.62/0.110/82
  (base 3) · 0.72/0.110/90 · 0.82/0.095/96 · 0.91/0.070/100. Rust-brown shadows, butter lights; greener and lighter
  than `cloth_ochre`. Gates: Oklab Δab ≥ 0.04 vs `cloth_ochre` (and the witch's tights) at shades 2–4; C ≤ 0.115, h ≤ 100
  (never lemon). `silhouetteOutline { ramp: 'cloth_mustard', lit: 2, shade: 1 }`; judge the white window first.
- **New `hair_cocoa`** (cool cocoa, mauve shadows): 0.20/0.030/350 · 0.27/0.036/5 · 0.34/0.040/18 · 0.42/0.042/30 ·
  0.52/0.040/42 · 0.64/0.034/55 · 0.78/0.028/70. Gates: Δab ≥ 0.04 vs `hair_umber` (ronin) at matching steps (else push
  the mids toward h 10–15); hair mid vs mustard base ΔL ≥ 0.15; C ≤ 0.045 (never red/copper).
- Reuse: `cloth_indigo` (denim 1–4), `cloth_cream` (sneakers, strings, sclera, highlights, mug), `hair_ash` (eyes —
  cool grey-blue "monitor glow", unused by the cast), `skin`, `cloth_rose` (blush on petted/happy only), `ink`.
- Palette tests for both new ramps: darkest ≠ #000, L monotonic, hue drift ≥ 15°.

## 3. Costume
- `variants: { headAcc: 'none', hairBack: 'short', hem: 'shorts', back: 'none', neckAcc: 'hood', sleeves: 'long' }`
- `ramps: { hair: 'hair_cocoa', cloth: 'cloth_mustard', clothAlt: 'cloth_indigo', trim: 'cloth_mustard', legs: 'cloth_indigo', tail: 'hair_cocoa', tailTip: 'hair_cocoa' }`
- outfit: skin · hair `hair_cocoa` · horn → `cloth_cream` (strings, `hornOutline: 'cloth_cream'`) · dress
  `cloth_mustard` · apron `cloth_mustard` (pocket) · trim `cloth_mustard` · shoe `cloth_cream` · eye `hair_ash` · blush
  `cloth_rose` · ink.
- `sleeve: { ramp: 'cloth_mustard', shade: 4 }` (5 if p10 ΔL vs body 3 fails, separator kept); `cuff: { ramp:
  'cloth_mustard', shade: 2 }` + R-C2.
- Pocket and chest print: `apron` bib mask in dress letters, `frill: false` (knight R4), no panel, no ties; R-C3 if the
  bib can't sit at belly height.
- Opt-ins reused: sash, shorts (+ R-C4), shinWrap, farLegShade, dressShade, silhouetteOutline, hairBackStretch,
  sideLocks false, lockLean, hideFarShoulder, hairFar if needed, tweaks, chinHand.

## 4. Face
- **Eyes** (`hair_ash`: c = 0, i 2, I 3, k 4): half-lidded and blunt — a flat lid **2 rows thick** across the whole eye,
  square outer corner, **no flick** (distinct from every other cast member). Iris 4 × 5 with the top 2 rows under the
  lid (4 × 3 shows; per-character §11.2 exception). Pupil 2 × 2 ink touching the lid. 1 × 1 cream highlight top-left
  (same side both eyes) + 1-px lower highlight at k; outer sclera sliver.
- **Eye bags** (signature): a 2-px skin-2 line under the outer half of each eye, 1 row below the iris, on neutral,
  blink, talk, think, sleep; never ink, never 3 px.
- **Brows** (boy cue): visible through the fringe gaps, 4 × 1 in hair 1, straight and flat, ≥ 1 skin row above the lid;
  the inner end never lower (angry read).
- **Neutral (deadpan)**: a straight 3-px `XXX` 1 px right of the axis, no corners or softeners; ≥ 1 skin row above the
  chin; **no blush**, no fang, no nose. Blink: the lid closes to a 1-row flat line + the eye bags.
- **Signatures** (the half-lid is the baseline, so opening reads big): happy (the rare "huh, it works") — lids lift
  1 row (4 × 4 iris), an extra 1-px highlight, a lopsided 3-px smile with the screen-right corner up, `ff`, not `^^`;
  petted — flat closed lines, 2-px smile, `ff` ("fine, whatever"); think — irises up-right (`irisDx` + a lid-row
  variant), near brow 1 row up (deadpan raised brow), mouth pulled aside, chin fist; startle — lids snap fully open
  (4 × 5 + sclera both sides), pupils 1 × 1, brows up, small flat `o`; worried — brows inner-up, lids stay half, wavy
  3-px mouth; wince — one eye shut, 4-px gritted line; talk a/b/c — flat, 1-px open, small `o`, all half-lidded; sleep —
  closed lines, 1-px open mouth.
- q34: `neutral` + `blink`; near eye full, far eye 1 px narrower (still lid-heavy), eye bags on both; near brow 4 px,
  far brow 3 px; mouth 1 px toward facing inside the contour; no blush.

## 5. Signature motion (M1+, Dev companion briefs)
Sip (mug to the mouth over 2 frames, 1-frame hold with the lids closing, steam FX of 2–3 cream-grey 1-px wisps ≤ 5 × 5,
4 frames); Claude Code session start (cracks knuckles, then air-types on the taskbar edge, 4-frame loop); tests pass
(1-frame lid lift + a tiny fist pump, deadpan "nice"); tests fail (hood up for 2 frames, then a slow `...` FX); deploy
(crossed fingers + sweat drop); long session / late night (hood up, head bobs 1 px on a 6-s cycle, snaps awake);
think/debug (talks to a 4 × 4 generic rubber duck); sleep (hood over the eyes, Zzz). Code FX: cream or amber `{ }` /
`;` glyphs, never green, never binary rain.

## 6. Pitfalls at 48 px
1. Mustard lights on a white window (judge first): the mustard 1/2 outline must hold; check mustard vs the witch's
   tights in the lineup.
2. Denim and dark cocoa on a dark IDE: 2-step rim; cream sneakers and strings carry the read.
3. Half-lid at 1× can read angry or dead: keep 3 iris rows, the highlight and flat brows; eye bags only 2 px of skin 2;
   if still asleep, cut the lid to 1.5 rows (thick only in the outer 3 px).
4. Gender read: check at 1× beside kitsune; if still soft, shorten the sideburns 1 row and thicken the brows to 2 rows
   in the outer 2 px — never via a jaw or cheek bump.
5. Hood rim as a neck pillow or headphones: flat U ≥ 2 rows below the chin; q34 lump below the jaw, behind the nape;
   strings never at the jaw.
6. Mustard sleeve over a mustard torso (hug, chest, fold): sleeve 4 vs body 3 + separator; pocket edge and strings
   break the mass; p10 ΔL gate.
7. Messy hair noise: tufts ≥ 2 px, no islands or dither, cowlick inside the headroom gate, never spiky-up.
8. q34 owner rules: monotonic facing contour; head joint at hip x − 1 (no `tweaks.head.dx` unless the read goes
   forward); nothing round at ear height; steady head.

## 7. Rig work
- **R-C1** (required, small) `neckAcc: 'hood'` — mask-only variant on the neck mask path (same mechanism as ronin R3
  `collar`; reuse it if R3 lands first). The q34 mask carries the trailing lump. Dummies byte-identical.
- **R-C2** (required, small) `Body.cuff.flare?: 0 | 1` (default 1) — ribbed cuff with no bell.
- **R-C3** (conditional) `Body.front?: PlacedMask` on the hip joint in torso part 7 (pocket and print) — only if the
  apron bib can't sit at belly height.
- **R-C4** (required, small) `Body.shorts.flare?: false` — drop the 1-px leg-hem flare.
- **R-C5** (optional, M1) 1-px string ends (`ScarfEnds.width: 1`, 1 segment, lag ≤ 1 px).
- Depends on knight R3 (`Body.puff`) and R4 (`Apron.frill: false`); palette for the 2 ramps; silhouetteOutline entry.
- Fit: frame 48 × 56 unchanged, 16 anims unforked, no prop in them (unless Q2 b or c).

## 8. Owner decisions
- **Q1 Colourway**: A (recommended) "Night shift" — mustard hoodie, denim jeans, cool cocoa hair, cream sneakers and
  strings, grey-blue eyes; B "Rust" — rust-terracotta hoodie, charcoal-ash joggers, sandy hair (close to the witch's
  auburn); C "Cornflower" — faded cornflower hoodie, mustard-khaki trousers, cocoa hair (a second blue boy).
- **Q2 Mug**: (a, recommended) M1 signature prop only; (b) a static mug in the far hand on idle/talk (needs a hand-prop
  rig); (c) a "pocket coffee" gag peeking from the kangaroo pocket.
- **Q3 Chest detail**: (a, recommended) a 5 × 3 `{ }` print in indigo 2 on the lit-left chest; (b) a 3 × 3 cream
  crescent moon; (c) plain. Never a logo, spider, asterisk or spark.
