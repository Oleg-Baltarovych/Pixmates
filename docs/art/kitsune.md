# kitsune — design spec (MA-28)

> **D-18 (owner, 2026-11-24):** kitsune is now **female** (fox girl ninja, hyperactive braggart); the signed-off art
> stays. Originality re-check as a girl is **pending (MA-28r)** against the fox-girl list in ART-BIBLE §9. The body
> below still says «him»/«fox-boy» from MA-28 and is not rewritten; read it as describing the same art.

Originality gate: **PASS** (art-director, 2026-11-24). Owner decisions 2026-11-24: violet eyes, pale cream leg wraps,
mask on the character's right (screen-left, near side in q34). Brief: ART-BIBLE §9. Frame 48 × 56, chibi ≈ 2.2 heads.

## Lookalikes checked
Naruto/Kurama, Kakashi, Konohamaru, Sasuke, Inuyasha, Yoko Kurama, Gin Ichimaru, Shippo, Sabito/Makomo + Anbu masks,
Ahri, Senko-san, Holo, Yae Miko, Kiriko, Tamamo, Ninetales, Greninja, Zorua/Zoroark, Tails, Fox McCloud, Izuna.
Hard rules that keep him clear:
- no orange, whisker marks, forehead plate, swirl/clan symbol, radial spiky hair; one tail only;
- no lower-face cloth, no hair swept up to one side, no vest (Kakashi);
- scarf short (ends 4–5 px, never below the chest row), teal not navy, no goggles/helmet (Konohamaru);
- no thick rope belt bow, no fan emblem; no long hair, red/white robe or beads;
- neutral has open eyes (no permanent closed-eye smile); `^^` only on happy/petted;
- mask ivory with teal markings, no red anywhere on it, no scar, no haori;
- never Naruto hand seals, thumbs-up shout pose or clone poofs.

## 1. Silhouette
- **Ears** (`fox_ears`, hair letters j/h/y): triangles in a 6 × 7 box (same as dummy `EAR`), tip leans 1 px outward,
  convex inner edge, 1-px point. Inner ear shade j + 2-px cream tuft at the base (not pink). Headroom: never taller than
  dummy-b's ears (≤ +1 row; row 0 clear with a 1-row margin at the happy apex). q34: near ear full, far ear 2 px
  narrower and 1 px lower.
- **Hair** (`fur_ash`): round chibi mop (crown widths as maid 12→16→18→20→22), 4 pointed fringe clumps (centre-left
  longest, points 1 px screen-left), splits in `j`. Two 2-px cowlick tufts on the crown between the ears, 1 px above the
  crown curve. Side locks short (to mid-cheek), tips kick 1 px out. `hairBack: 'short'`. Shine band split per clump,
  warm on the lit left.
- **Tail** (one, oversized, smooth tube, no fur noise):
  - front: rises from behind the hip on screen-right as a brush S-curve; tip at shoulder-to-cheek height, never over
    the head mask, outer x ≤ 44. Radii ≈ [1.8, 3.0, 3.5, 3.0, 2.0] (widest ≈ 7 px at belly height, never wider than the
    head). Pale tip = last 2 segments, tip radius 1.4, tip curls 1 px back toward the body;
  - q34: new curve (do **not** reuse `FOX_TAIL_Q34`), rooted at the trailing hip, rising ~1 px per 2 px back:
    [0,0] [−4,−2] [−8,−4] [−12,−6] [−14,−8] (last = 1-px up-curl). Radii [1.5, 2.4, 3.0, 2.6, 1.8], pale tip last 2
    points. Chain swing kept: tip against `hairDx`, 1-frame lag on passing frames. `tailTucked` on turn f0 as is.
- **Scarf** (`neckAcc: 'scarf'`): 2-row teal band, 2 × 2 knot on screen-right. Front: two ends 4 and 5 px long, 2 px
  wide, slightly splayed. q34: knot near-front, ends trail behind the nape (2-segment chain, 1-frame lag, ≤ 6 px back),
  lift 1 px on the happy apex. Ends never below the chest row.

## 2. Ramps (OKLCH L / C / h)
- Reuse: `skin`; `cloth_teal` (scarf, sash, mask markings); `horn` (mask face); `cloth_cream` (sclera, highlights,
  fang, leg wraps, tail tip); `cloth_rose` (blush); `hair_lilac` (eyes); `ink`.
- Not `hair_ash` (cool icy lights, dummy-a's colour).
- **New `fur_ash`** (silver, violet shadows, warm-ivory lights): 0.28/0.045/300 · 0.38/0.045/290 · 0.49/0.038/278 ·
  0.60/0.030/265 · 0.71/0.022/250 · 0.83/0.016/95 · 0.93/0.024/85. Mid chroma ≤ 0.03 (silver, not lilac); ≥ 0.08 L from
  `cloth_indigo` at matching steps.
- **New `cloth_indigo`**: 0.22/0.060/295 · 0.29/0.080/285 · 0.36/0.100/278 · 0.43/0.115/272 (base) · 0.52/0.110/265 ·
  0.62/0.090/258 · 0.73/0.065/250. Apart from `ink` by chroma; darkest not `#000`.

## 3. Costume
- Top: short indigo wrap with a crossover collar, a 3-row darker V under the scarf (in the scarf's neck_acc mask).
- Sleeves `short`, `sleeve: { ramp: 'cloth_indigo', shade: 4 }` (shade 5 if the p10 ΔL gate fails); bare forearms.
- Waist sash = trim `cloth_teal` (optional 2 × 2 front knot on the near hip if cheap).
- `hem: 'shorts'`, `clothAlt: 'cloth_indigo'`. No hakama.
- Legs `cloth_cream` = pale shin wraps (optionally one darker wrap row per shin).
- Feet: dark indigo tabi (`cloth_indigo` 0–3) with a light toe/heel rim (shade 5); no split-toe notch.
- `variants: { headAcc: 'fox_ears', hairBack: 'short', hem: 'shorts', back: 'fox_tail', neckAcc: 'scarf', sleeves: 'short' }`
- `ramps: { hair: 'fur_ash', cloth: 'cloth_indigo', clothAlt: 'cloth_indigo', trim: 'cloth_teal', legs: 'cloth_cream', tail: 'fur_ash', tailTip: 'cloth_cream' }`
- outfit: hair fur_ash · horn → horn (mask) · dress cloth_indigo · apron cloth_cream · trim cloth_teal · shoe
  cloth_indigo · eye hair_lilac · blush cloth_rose · ink.

## 4. Face
- Eyes violet (`hair_lilac`, top dark). Iris 4 × 4 (one row shorter than maid). Lash line slopes up to the outer
  corner (+1 row) with a 1-px flick. Pupil 1 × 3 vertical oval with round ends, set inward (if it reads as a demon
  slit, widen to 2 × 3 with a rounded bottom). 1 × 2 cream highlight top-left + 1-px lower highlight; highlights stay
  on the same side in both eyes, lashes mirrored.
- Brows hidden in neutral; visible in worried (inner ends up) and a smug 2-px brow on think.
- Mouth: lopsided 3-px smirk, near corner 1 px higher; one cream fang px directly under the higher corner, touching
  the line (never floating). Fang also on talk_b/c, happy grin, open `raisedMouth`.
- Blush: maid's soft `fFFf`.
- Signatures: happy `^^` + wide grin + fang; petted flustered (strong blush, wavy 5-px mouth); think far-eye half-lid
  + smug brow + smirk; startle `><` + open square mouth; wince one eye shut + gritted teeth.
- q34: `neutral` + `blink` only; the smirk's high corner and fang on the facing side.

## 5. Side mask (inside HEAD / HEAD_Q34, horn letters)
6 × 7 fox face: two 1-px ear points with a dip, wide ivory forehead, two 2-px diagonal ink eye slits slanting up and
out, a 2-px teal brow mark over each, taper to a 1-px snout tip with one teal px; outline 2 horn steps darker; no
cord, no scar. Front: screen-left temple below the near ear root, tilted ~30° out (snout down/out), head rows ≈ 4–11,
not covering the ear or the lash row, ≥ 1 px hair from the fringe. q34: same screen side (near), faces the viewer more,
7 px wide, over the back-temple behind the near ear, framed by hair. Mirror swaps it (accepted, Q-D16-4).

## 6. Signature motion (M1+, briefs)
Brag pose (fist to chest, tail flick, scarf snap); mask flips down over the face for 2 frames on petted/startle;
low ninja crouch before the happy jump; smoke-puff FX on drag release; sleep with the tail curled round the feet.

## 7. Pitfalls at 48 px
1. Crowded screen-left head (ear + mask + lock): ≥ 1 px hair between mask and ear; shorten that lock if it melts.
2. Mask base ≥ 0.15 L brighter than the hair mid, warm vs cool hue split; check on the dark IDE.
3. Tail wider than the head reads Kurama/Ahri: cap 7 px, below cheek level, one tip.
4. Pale shins and tail tip on a white window need the coloured outline (cream shade 2); check white first.
5. Indigo body on a dark IDE needs the 2-step rim and light tabi rims; teal scarf and sash carry the read.
6. Sleeve vs bodice separator and ΔL gate (shade 4 vs 3; bump to 5 if p10 fails).
7. Fang must touch the mouth line; scarf ends 2 segments only.

## Rig work
- Build the `neckAcc: 'scarf'` end chain (exists only as a type).
- Parameterize the fox-tail per body: front radii and the q34 curve points/radii.

## D-18 — fox girl (MA-28r, art-director 2026-11-24)
Originality re-check as a girl: **PASS as is** (Shirakami Fubuki and Izuna are the real risks). Hard rules that keep her
clear (every future round and skin):
1. Hair stays `fur_ash` — the lightest step only in the shine band and highlights, mids (L ≤ 0.71) carry the mass; never
   `hair_ash`, never white; no braid, side braid, ponytail or long back hair; the bob stays chin-length.
2. Eyes stay violet (`hair_lilac`), never blue, cyan, teal or yellow.
3. Garb stays deep indigo — no white or sky-blue top, no hoodie, choker or bell, no kimono or long sleeves.
4. Scarf stays short and teal, never red or long. Persona: no third-person self-name, no "nin-nin" tic, no devotion to a
   lord/master (Izuna) — her hook is the braggart.
5. No pink hair and no red anywhere (hair, mask, scarf, props).
Owner decision 2026-11-24: add a tail ribbon wrap — a 1-row, 3-px `cloth_rose` band around the tail just above the cream
tip, no bow, no trailing ends, front and q34, moving with the tail chain.
