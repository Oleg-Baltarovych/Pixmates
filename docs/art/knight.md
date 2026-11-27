# knight — design brief (MA-67, D-22)

> History: MA-29c / early MA-67 specified a cat knight (cream fur, ears, tail, paw tabard, wooden sword). The owner
> rejected it on 2026-11-27 (D-22); every cat-knight rule is superseded by this brief.

A **human** chibi knight (48 × 56, male, normal face — not the stern option) in **full silver plate** head to toe, with a
helmet whose **visor he lowers and raises** by animation. Persona unchanged: a noble coward who guards the screen, is
scared by the cursor and «fights» the mouse. Shared rig poses only.

## 1. Visor rule (default — the owner may move animations between the lists)
- **Lowered:** `walk`, `turn`, `startle` frames 1–4 (frame 0 shows the surprised face, then he slams the visor down),
  `fall`, `drag` (held by the cursor), `land` frames 0–1 (the impact; raised again as he settles). M1 adds `run`,
  `climb`, `guard` and «fights the mouse».
- **Raised:** `idle_a`, `idle_b`, `sit_edge`, `sleep`, `talk`, `think`, `happy`, `worried`, `wave`, `petted`.
- Lowered, the emotion lives in the **eye slit** (cream glints per expression: neutral 2-px pairs, startle 1 × 2 wide
  pinpoints, worried inner-high pairs, wince one eye, blink none) and in the pose; never glowing eyes.
- Code: `VISOR_DOWN_IN` in `assets-src/characters/knight/body.ts` → shared opt-in `Body.visor` (RIG.md, ART-BIBLE
  §11.11; state per animation frame, part 16). Gauntlets: `Body.gauntlets`.

## 2. Silver (`metal_silver`, tests `tests/unit/art/knight-palette.test.ts`)
Polished, cool-neutral, wide value range for hard specular steps: L 0.21 → 0.985, C ≤ 0.03, body hue 220–260°, a
near-white spec. Gates vs the cast: steps 4–6 ≥ 0.04 L above kitsune's `fur_ash` hair and shadow steps 0–2 ≥ 25° bluer
(her silver-grey has violet shadows); ≥ 120° hue from maid's `cloth_cream`. Mask tones for helmet and armour:
0 · 2 · 3 · 4 (base) · 5 · 6 (spec) — a dark reflection band under a near-white spec reads as polish at 1×.

## 3. Armour (all variants)
Helmet + visor (head mask in hair letters, visor masks), gorget (choker slot), breastplate (torsoMask, lit keel left of
centre, dark reflection band, leather belt with a silver buckle), pauldrons (sode), long silver sleeves (vambraces) with
a lit flared cuff, gauntlets, faulds/tassets over silver shorts (cuisses), silver legs (greaves, lit left edge),
sabatons, a sword in a leather scabbard on the right hip. Materials (ART-BIBLE §12): metal, leather, cloth (accent),
mail (B).

## 4. Uniqueness against the cast (D-21) and accent
- The cast already holds almost the whole hue wheel at accent chroma: maid teal + rose, kitsune fox orange + indigo,
  witch moss + ochre, goth purple-black + garnet, ronin vermilion + black lacquer (+ jade eyes), coder mustard + onyx.
  The free gaps are **cobalt** (h ≈ 255–265, more saturated and lighter than kitsune's indigo) and **emerald**
  (h ≈ 150–160, about twice the chroma of witch's moss). Gold/brass is out (it is coder's mustard in OKLCH).
- **vs ronin:** silver, not black lacquer; a closed helmet, not a bare head with a tuft; a European sword; no cloak.
- **vs coder:** no round dome over a flat rectangular face frame — the raised visor has a pointed lower edge (A), an
  arched opening (B) or a bell brim (C), and the cheek plates curve in.
- **vs kitsune:** brighter, bluer silver on hard plate (see §2); no ears or tail.

## 5. Lookalikes (ADR 005) — keep generic
- Shovel Knight (blue armour, horns, shovel): silver armour, cobalt only as plume/tabard; no horns; sword.
- Siegmeyer / Onion Knight: no onion-shaped helm (B's ogive is pointed and narrow, not bulbous); not stout-bodied.
- Solaire: no sun device, no orange-white tabard.
- Alphonse Elric: no spike on the head, no loincloth, no red glowing eyes, chibi proportions, a visible face.
- Meta Knight: no mask with a T-slit, no cape, no gold sword.
- Link: no green tunic + cap; B's emerald is a baldric and panel only.
- Sir Daniel Fortesque: no skull, no missing jaw. Arthur (Ghosts 'n Goblins): never armour-less boxers.
- Hollow Knight: no white horned mask, no black body.
- Religious crosses and real heraldry: no cross shape anywhere (no keel through a slit, no cross on a tabard); C's
  device is a plain 5-point star.

## 6. Concept spike (owner picks)
Patches `reports/sprites/knight-spike-{A,B,C}.patch` (git apply on the D-22 groundwork commit), sheets
`knight-spike-{A,B,C}-x4.png`, lineups `knight-spike-lineup-x{1,4}.png`.
- **A — close helm + plume:** round skull, cobalt plume sweeping back, raised visor with a pointed lip, lowered visor
  with one sight slit and breaths; cobalt tabard panel and eyes.
- **B — great bascinet + hounskull:** pointed ogive skull, mail camail onto the shoulders, raised snout over the brow,
  lowered beaked visor with two angled slits; emerald baldric, panel and eyes.
- **C — sallet + bevor:** low skull with a cobalt crest, brim and swept tail (q34), chin bevor, lowered visor slit
  under the brim; full cobalt tabard with a cream star.

## 7. As built (variant B, owner pick 2026-11-27; awaiting art-director round 1)
Code `assets-src/characters/knight/{body,face,masks}.ts` (spike variant scaffolding removed); ramps `metal_silver` +
`cloth_emerald` (`cloth_cobalt` dropped). Tests `tests/unit/art/knight.test.ts`, `knight-palette.test.ts`.
- **Layers:** mail (camail onto the shoulders, a 2-row mail hem under the faulds) → plate (bascinet, gorget,
  breastplate with a lit keel, spaulders, vambraces, gauntlets, two fauld lames, greaves, sabatons) → emerald sash
  (baldric near shoulder → far hip, tabard panel between the legs). Leather: belt (silver buckle), sword grip, scabbard
  with a silver locket and chape; the hanging hand rests on the hilt in front view.
- **Signature:** the pointed ogive bascinet + hounskull visor. Raised: the snout tips up over the brow. Lowered: a pivot
  seam with temple rivets, a lit-left / shaded-right cone, two slits angled toward the snout, the lit ridge only
  **below** the slits (no cross, tested), single breath holes on the shade side (no T-slit, tested), a pointed tip
  (≤ 6 px). q34: ridge off-centre toward the facing, long near slit + short far slit, the lower edge rising to the tip.
- **Visor rule** = §1 exactly (`VISOR_DOWN_IN`, tested per frame: lowered = no skin / ink / blush px; glints cream only,
  on slit px; startle / worried / wince / neutral glints, none on a blink).
- **Face:** normal chibi (no stern option), emerald eyes; blush only on happy (light) and petted (strong).
- **q34 owner rules:** the camail wraps the near jaw and tucks under the chin, so the facing contour never steps out
  and steps in ≤ 1 px per row with the visor up and down (head + visor composite tested); head ≤ torso + 4 px, steady.
- **Open for the art director:** the q34 visor has no forward beak (the contour rule forbids a protrusion), so the
  pig-face reads from the front; emerald eyes vs ronin's jade eyes; mail checker density at 1×.
