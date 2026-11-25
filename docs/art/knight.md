# knight — design spec (MA-29c)

Originality gate: **PASS** (art-director, 2026-11-24). Owner decisions 2026-11-24 (§8): biscuit-cream fur + pewter steel + raspberry-rose tabard, ears per emotion (R5) now, worn wooden sword at the hip. Brief: ART-BIBLE §9 (D-17). A cat
knight in oversized armour, a noble coward. Frame 48 × 56 (holds), chibi ≈ 2.2 heads, shared rig poses only.

**D-20 (2026-11-25):** chibi stands (D-19 adult update cancelled); normal face, no stern option. **Richness** (ART-BIBLE
§12): layers — gambeson (1-row rose quilted edge under the faulds) + plate + tabard; signature — the paw tabard;
materials — steel, leather (1-px brown pauldron straps with a brass buckle px), cloth, wood (toy sword), plus a 1-row
mail edge under the faulds (2-px checker texture in steel 2/4, texture only). Shares `Body.puff` with ronin's sode
(MA-65 builds it). Not black/red: steel + raspberry-rose stays apart from ronin (ronin.md §2 gates).

## Lookalikes checked
- Puss in Boots (ginger, feathered cavalier hat, cuffed boots, cape, rapier, "pleading eyes"): cream fur, steel helmet
  without feather, plated sabatons (no cuffs), a short blunt wooden sword, no cape; the dilated pleading pupil only on
  worried, never with a hat-to-chest pose.
- Felyne / Palico (themed cat armour, cat-face helmets, backpacks, big weapons): a plain round knight helmet, never
  cat-face-shaped; no backpack or weapon on the back; no fish, bone or acorn themes.
- Hollow Knight (white horned mask, black body, cloak, nail): steel helmet with an open visor and a fur face; ears with
  rounded tips and a rose inner, never ivory or tall/vertical; no black body, cloak or nail blade.
- Garfield: no orange, stripes, lazy lids. Stock "Sir Meowsalot" mascots: no fish or yarn motifs.
- Cait Sith: no tuxedo, crown, red cape, megaphone, mount. Lulu: no hat, staff, fairy, purple. Yuumi: no book, grounded,
  not white/blue. Khajiit: chibi, plate armour, no face marks.
- **Baron (The Cat Returns)** — highest colour risk (beige fur, green eyes): eyes teal-cyan, not emerald; no top hat,
  cane, bow tie, suit, monocle or gentleman bow.
- Redwall / Mouse Guard: a cat, no cloak or robe. Shovel Knight: low-chroma pewter, no horns, open visor, no shovel,
  brass only on the belt. Meta Knight: visor open at rest, no cape/wings, no gold blade. Link: no green, no shield,
  the emblem is a paw. Fire Emblem lords: no capes, tiaras, blue + gold.
- Also: Alphonse Elric (small and visibly occupied, no spikes), Sylvester (no tuxedo), Hello Kitty (no bow, has a
  mouth); vs kitsune — no whisker marks, no fang, no cowlick pair.
Hard rules: no orange/ginger; no feather or hat brim; no cape, cloak or wings; no horns or spikes on the helmet; no
closed face mask at rest; no shield or shovel; no green tabard; no crown or tiara; no tuxedo; no whiskers; no fish or
yarn; the helmet is never cat-face-shaped.

## 1. Silhouette
A wide low dome with two short ears angled out (a broad "W" top vs kitsune's tall "V V"), round oversized pauldrons, a
steel trapezoid body with a rose tabard stripe, short faulds, chunky sabatons and a thin hooked tail on screen-left.
- **Helmet** (replaces the hair; head mask in hair letters so `withBand` gives the visor shadow; 30 × 26 at head −
  (15, 14) as kitsune): dome 28 px wide (2 px wider than maid's skull each side), top on kitsune's crown row, no
  cowlicks — oversized by width and by sitting low, never by height. Raised visor: a 3-row band across the forehead
  (mask rows ≈ 8–10), its lower edge casts the band row; 1-px steel-light rivet pivots at the band ends (never a round
  boss). Face opening 18 px (cols 6–23), rows ≈ 11–23, fur to the chin; cheek guards are straight 3-px columns to row 22
  with no rivets or plates between temple and jaw (headphones rule). Dent: 1 px shade 1 + 1 px shade 5 on the
  screen-right dome. Specular: a 1-row arc 2 rows under the crown (5 px `Y` lit left, then 3 px `y`, stopping before the
  axis, broken only at the ear slots), a shade-1 core along the lower right; no dither on steel.
- **Ears** (`fox_ears` slot, authored cat mask): 5 × 4 rounded triangle with a 2-px blunt tip; base row hidden under the
  helmet with a 1-px shade-0 slot line in the head mask; angled ≈ 35° outward from the upper dome; inner ear 2 px rose
  (blush letters), fur in skin letters. Headroom: the highest knight px is ≥ 2 rows below kitsune's at the same frame
  (happy apex: kitsune figure −5, knight ≤ −3). Ears inside the dome width (x 11–37), clear of raised paws. q34: near
  ear full, far ear 2 px narrower and 1 px lower.
- **Neck guard**: procedural back hair in steel, `hairBackStretch` ≈ 0.35 — an aventail flaring 1–2 px past the helmet
  bottom at shoulder level, below the jaw. `sideLocks: false`.
- **Tail** (`fox_tail` + `Body.foxTail`, thin, no brush): front radii [1.3, 1.2, 1.1, 1.0, 1.1], root on screen-left
  (−x root and gravity), rises to chest height with a hooked "?" tip curling 1 px back over the last 2 points, `shine`
  on, outer x ≥ 4. q34 points [0,0] [−3,−2] [−6,−5] [−7,−8] [−6,−10] (last hooks forward), radii [1.2, 1.1, 1.0, 1.0,
  1.1], chain swing kept, `tailTucked` on turn f0. If the chain can't root on −x, keep screen-right.
- No plume: the ears are the crest and set the headroom.

## 2. Ramps (OKLCH L / C / h)
- **New `metal_steel`** (pewter): 0.19/0.030/280 · 0.29/0.034/265 · 0.40/0.034/250 · 0.52/0.030/240 · 0.64/0.026/232 ·
  0.81/0.022/92 · 0.95/0.020/85. Warm-ivory spec, mids bluer than `fur_ash`. Not the existing `metal` (cyan lights break
  the warm-light rule and push toward Shovel Knight); keep `metal` for later.
- **New `fur_cream`** ("biscuit"): 0.40/0.035/320 · 0.50/0.035/340 · 0.61/0.036/10 · 0.71/0.038/50 · 0.80/0.040/75 ·
  0.88/0.035/85 · 0.95/0.028/92. Mauve shadows, buttery lights, C ≤ 0.04 (never ginger); ≥ 0.05 L or ≥ 20° h from
  `skin` at matching steps (or the face reads as a human boy in a helmet).
- Reuse: `cloth_rose` (tabard, nose, inner ear, blush), `cloth_teal` (eyes, teal-cyan), `cloth_ochre` (brass belt),
  `horn` (wooden sword), `cloth_cream` (sclera, highlights, paw emblem), `ink`.

## 3. Costume and armour
- Breastplate: `ramps.cloth: metal_steel`, `dressShade: 2`, metal material (R1); one 2-px vertical spec streak left of
  centre.
- Pauldrons: the sleeve shoulder puff enlarged by R3 (rx 3.4 × ry 2.8), metal, 2-px spec top-left, 2 steel-light
  rivets on the lower rim.
- Sleeves `long`, `sleeve: { ramp: 'metal_steel', shade: 4 }` (5 if p10 ΔL fails vs bodice 2); gauntlet flare `cuff:
  { ramp: 'cloth_ochre', shade: 3 }`; bare cream paws as the arm end; no `sleeveOverHand`.
- Tabard: `apron` bib mask in dress letters (rose) centred on the breastplate, 5 × 4 cream paw emblem (`.o.o.` /
  `o...o` / `.ooo.` / `.ooo.`), `panelW: 6` down the faulds, no `ties`; drop the frill if it reads as a maid apron (R4).
- Faulds: `hem: 'skirt'` in steel raised 3 rows (R2) to mid-thigh — never at the knee (bell dress, maid silhouette);
  the lace row becomes a 1-row rose gambeson edge if it reads.
- Belt: `sash: { rows: 2, knot: SWORD }`, `ramps.trim: cloth_ochre` (brass).
- Sword (Q3): a worn wooden toy sword as the sash-knot mask on the screen-right hip (≈ 4 × 8), horn-ramp blade/scabbard,
  horn-5 guard, `hornOutline: 'horn'`, inside hip + 7 and above the hem bottom; q34 `sashKnot` hilt and guard only
  (3 × 3) just ahead of the far hip. No hand prop or shield in the 16 anims.
- Legs `metal_steel` (greaves), `shinWrap: { row: 2, shade: 2 }` (greave lip); shoe mask = sabatons, steel 0–5, 2-px toe
  plate with a lit toe px, never cuffed; q34 `farLegShade: 2`.
- Gorget: `neckAcc: 'choker'` with an 8 × 2 gorget mask in trim letters (steel), 1-px spec left; keep ΔL vs sleeves.
- `variants: { headAcc: 'fox_ears', hairBack: 'short', hem: 'skirt', back: 'fox_tail', neckAcc: 'choker', sleeves: 'long' }`
- `ramps: { hair: 'metal_steel', cloth: 'metal_steel', clothAlt: 'cloth_rose', trim: 'cloth_ochre', legs: 'metal_steel', tail: 'fur_cream', tailTip: 'fur_cream' }`
- outfit: skin `fur_cream` (face, ears, paws) · hair `metal_steel` (helmet) · horn `horn` (sword) · dress `cloth_rose`
  (tabard) · apron `cloth_cream` · trim `metal_steel` (gorget, startle visor) · shoe `metal_steel` · eye `cloth_teal` ·
  blush `cloth_rose` · ink.

## 4. Face and fur
- **Eyes** (`cloth_teal`, dark top, 3-step iris; iris 4 × 5): the lash droops — inner end 1 row higher than the outer
  corner, outer flick 1 px down-out (vs maid's round arch, kitsune's upturn, goth's flat lid). Pupil 2 × 3 round;
  1 × 2 cream highlight top-left (same side both eyes) + 1-px lower highlight; outer sclera sliver.
- **Brows** visible (no fringe): 3 px each, skin 1, on the row between the visor band and the lash.
- **"Brave but scared" neutral**: flat determined brows with the inner px 1 row lower over drooping wide eyes; a tight
  3-px pressed mouth `xXx` under the nose + a 1-px skin-1 tension px at the screen-right corner; 2-px rose nose `fF` on
  the axis 1 row above the mouth; lighter muzzle patch (skin 5) 6 × 2; blush `fFf` per cheek; no whiskers, no fang.
- **Signatures**: happy `^^` + open round mouth with rose tongue + full blush; petted `^^` + strong blush + the only `ω`
  cat mouth (purr); worried brows inner-up + extra 1-px inner-lower "teary" highlight + wavy 4-px mouth; think far-eye
  half-lid, irises up-aside, mouth pulled aside, chin paw via `chinHand` clear of the cheek guard; startle — the visor
  slips (face layer paints the visor band 2 rows lower in trim over brows and lash row, never on hair px), 1 × 1
  pinpoint pupils, small `o`; wince one eye squeezed + gritted 4-px teeth; sleep closed drooping arcs + tiny `o`; talk
  a/b/c closed, small open, `o`.
- q34: `neutral` + `blink`; near eye full, far eye 1 px narrower, nose 1 px toward facing inside the contour, near-cheek
  blush; blink = drooping closed arcs.

## 5. Signature motion (M1+, briefs)
Guard (wooden sword raised, knees tremble 1 px on alternate frames, tail fluffs +0.5); scared by the cursor (visor
slam, ears flat, 2-px hop back, sweat FX); fights the mouse (3-frame anticipation → swing → recover, then peeks from
under the visor); brave salute (visor up, chest out); sleep (visor down, tail round the sabatons); petted (purr, ears
tilt out 1 px, tail hook curls).

## 6. Pitfalls at 48 px
1. Steel monotony: the rose tabard, brass belt/cuffs and cream face/paws break it; chin AO + 1 value step at the
   helmet/gorget edge.
2. Arm over torso: steel sleeve 4 vs breastplate 2 and the rose bib — p10 ΔL and trimP10 on hug, chest, fold;
   pauldrons never cover the hands on chest, hug, chin.
3. White window first: steel lights 0.95 and cream fur lights need the 2-step coloured outline; on dark the steel mids
   hold without `silhouetteOutline`.
4. Raised paws vs ears/helmet (happy, wave, drag hang): ears never wider than the dome.
5. Sword never covers the hand on down/knees/limp/edge; on sit_edge the scabbard stays above the seat row.
6. Face reads human: raise the fur/skin hue split and strengthen muzzle and nose before adding anything else.
7. q34 owner rules: monotonic facing cheek guard and fur contour (no cheek/jaw bump, muzzle never protrudes); the
   helmet mass overhangs behind (+ `tweaks.head.dx: −1` if it reads forward); nothing round at ear height (no visor
   boss, cheek rivet or aventail bulge between temple and jaw; ears only on the dome top); steady head (no helmet
   chain or wobble).
8. Metal at 48 px: one hard spec step per convex part, no texture noise or dither; if metal reads as cloth, R1 is missing.

## Rig work
- **R1** (required) `Body.metal?: ('torso' | 'sleeves' | 'hem' | 'legs' | 'backHair')[]` — use the existing `metal()`
  material (assets-src/lib/materials.ts) with texture dither 0 on those parts.
- **R2** (required) `Body.skirt?: { raise }` — hem raised N rows, like `Body.shorts.raise`.
- **R3** (required) `Body.puff?: { rx, ry }` — shoulder puff size (default 2.6 / 2.3).
- **R4** (conditional) `Apron.frill: false` — only if the tabard panel reads as an apron.
- **R5** (Q2) `Body.headAccByFace?: Partial<Record<ExpressionId, PlacedMask>>` — flattened ears on worried, startle,
  wince; perked on happy, within the headroom cap; tests on dummies in rig-optins.test.ts.
- **R6** (required) palette `metal_steel`, `fur_cream` with the standard tests.
- Reused as is: fox_tail + foxTail, apron, sash knot (sword), choker (gorget), cuff, hornOutline, hairBackStretch,
  sideLocks false, farLegShade, chinHand, tweaks.
- To confirm at build: ear masks may use skin and blush letters in the `head_acc` slot; the fox_tail chain accepts a
  negative x root and gravity. Fallbacks: ears in hair letters with a fur ramp swap; tail on screen-right.

## 8. Owner decisions
- **Q1 Colourway**: recommended — biscuit-cream fur, pewter steel, raspberry-rose tabard with a cream paw, brass belt
  and cuffs, teal eyes; alt 1 — smoke-grey fur, warm bronze armour (ochre), plum tabard; alt 2 — chocolate fur, steel,
  mustard tabard. Grey tabby + steel rejected (face melts into the helmet, doubles kitsune's silver).
- **Q2 Ears per emotion** (R5) now in M-ART (recommended) or defer to M1.
- **Q3 Worn wooden sword** at the hip now (recommended) or no prop until the M1 signature.
