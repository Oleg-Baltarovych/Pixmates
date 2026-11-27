# Pixmates ART-BIBLE v1 (2026-11-27, closes M-ART: chibi 48 × 56, anime soft, cast of 8 signed off)

The source of style for every built-in character (rules/art.md). v1 is the rule set the 8 built-ins were signed off
against on the real overlay (MA-33, owner 2026-11-27): chibi 48 × 56 (ADR 009, ADR 012), anime soft, stern look
(§11.9), mouth mask (§11.10), visor (§11.11), costume richness and cast uniqueness (§12), and the rules learned while
building the cast (§13). Rig mechanics, opt-ins and code names live in `docs/art/RIG.md`; per-character specs in
`docs/art/<id>.md`. All art is made by code (D-11): masks and geometry are authored in `assets-src/`, and procedural
code is used only for material texture.
*History:* v0 (spike), v0.5 (ADR 009 frame + arm-over-torso), v0.6 (adult rules, ADR 011, superseded), v0.7 (D-20
chibi restored).

## 1. Grid and frame
ADR 009, restored by ADR 012 (D-20, 2026-11-25).

- Frame **48 × 56** = a 48 × 48 figure box (feet on row 46, row 47 free for the outline) + **8 rows of headroom on
  top**. Row 0 is always transparent (builder + headroom gate); the tallest extra (kitsune ears, witch hat, maid
  horns, ronin tuft) + happy apex + 1-frame head lag must fit (RIG.md «Why 56»). The frame never grows without the
  owner.
- Body axis on a pixel boundary at **x = 24**, so left and right mirror exactly.
- **`scaleRef` 48 in every built-in manifest** (sizing follows the figure, not the frame): S/M/L ×3/×4/×5 at
  1080p / 125 %, ×2/×3/×4 at 100 % (clamp 0.25, L 176 DIP; SPEC §3.3, ADR 012).
- Pivot at the feet: anchor (0.5, 1); `sit_edge` pivots on the seat (per-animation `anchor`). Rig details:
  `docs/art/RIG.md`.
- Integer scale on screen (`computeScale`). Never resample art. Squash means inserting or removing whole rows. One
  art pixel at M is ×4.
- One atlas per character, strips shelf-packed (≤ 1024², 1008 × 336 for 105 frames), `origin` per animation.

## 2. Light
- One light from the top-left (`SUN` in `passes.ts`). Every shading pass uses it.
- Form comes from normals (strokes, ellipses, `curveX` cylinders), not from a centre highlight. No pillow shading.
- Cast shadow and AO from part depth: under the chin, under the bib, behind the arms.

## 3. Outline and rim
- Outline is coloured: the neighbour's own ramp, 2 steps darker (anime soft). Never `#000`. The ink ramp starts at a dark plum.
- Selective outline: one step lighter on the lit (top-left) side.
- Internal lines appear only where materials meet and the part behind gets the line.
- Rim light: the inner edge on the side away from the light gets 2 steps brighter (anime soft), so the sprite holds on dark wallpapers.
- **Rim on pale skin:** the rim must never turn a whole cheek or jaw edge into a column of the top skin tone (it reads
  as a white stripe on walk / turn). Author that edge 1 step lower so the rim lands on skin 5; the top tone stays on
  ≤ 2 cheekbone rows (vampire q34, MA-33).
- Outline, AA and rim run after compositing, on the whole figure, so part seams never show.
- **Arm over torso (rig rule, art round 5).** Wherever an arm overlaps or touches the torso: (i) at least one value
  step across the edge (the sleeve has its own ramp/tone, never the bodice tone); (ii) a 1-px separator in the
  deepest outline tone (shade 0 of the sleeve ramp) on the sleeve px along the edge; (iii) ≥ 2 px of a contrasting
  arm end (hand skin or cuff) at the tip. Measured per frame by `tests/unit/art/rig.test.ts` (RIG.md «Arm over torso»).

## 4. Palette and ramps
- `assets-src/palettes/master.json`, swatch `docs/art/palette.png`. Each ramp has 5–7 tones with monotonic OKLab L and ≥ 15° hue drift: shadows move cool or purple, lights move warm. No pure black or white (tested).
- Generators address colours as (ramp, index) only, so palette conformance holds by construction (checked again at build).
- Dithering is used only as texture near half steps (anime soft spread 0.35). It is never a gradient.

## 5. Materials
- Cloth: soft vertical folds that deepen toward the hem. Hair: long strands plus sparse lit strands. Horn: growth rings and a brighter tip. Metal: a hard specular step. Fur: tufts and clumps (`materials.ts`).
- Detail must never break the silhouette. If the shape stops reading at 1×, remove texture.
- **No 2 × 2 checker at 1×** in any material (lacing, brocade, mail): texture marks never touch diagonally. **Mail**
  is calm: sparse darker rings on a lattice offset per row in one mid tone, ≤ 1 light px, one clean hem row, no
  scallop; a camail stays compact (≤ 5 rows, ≤ 1 px past the helmet) so the helmet reads first (knight, MA-33).
- **Feet are calm:** shoes and sabatons use mid tones, one specular px per shoe (lit toe corner), no rim on the shoe,
  a 1-row seam where a greave or legging meets it; the leg rim stays on the outer edge, ≤ 2 px (knight, MA-69).

## 6. Faces
- Faces are authored masks, one face layer per emotion, placed on the head's face anchor (`mask.ts` legend: slot + tone 0–5).
- Eyes, mouth, nose and blush follow §11.2–11.3 (chibi); bodies with `face.style: 'stern'` add §11.9; bodies with a
  mouth mask add §11.10; a visor adds §11.11.
- An emotion must read within 2–4 frames at real size.

## 7. Motion
- 6–12 fps. Idle: breathing (shoulders and head rise 1 px, with a sub-pixel chest colour shift between) and a 1-frame blink.
- Walk: bob on contact frames, the head lags 1 frame, arms counter-swing, weight shifts sideways.
- Happy: anticipation squash, then a jump with arms up, then a landing squash and a settle.
- Secondary motion (locks, ribbons, tail) comes from a verlet chain: 2 warm-up loops, the residual spread over the loop, positions quantized to px. Loops must be seamless (tested).
- **No shimmer:** a part that does not move (cheek, jaw, visor) changes across a loop only by its whole-px offset;
  px that flip tone frame to frame where two parts bob against each other are a defect (vampire walk, MA-33; §13).

## 8. Mirroring (closed)
- Walking left uses the runtime mirror; the top-left light flips, which is accepted (owner, real overlay, MA-33).
- D-16: travel poses (`walk`, `turn`; M1 `run`, `climb`) are drawn in a three-quarter view facing right and mirrored
  for left (`facing` in the manifest; RIG.md «Views»). Asymmetric details swap sides in the mirror (Q-D16-4). The head
  never rocks sideways in a walk.

## 9. Originality (ADR 005)
Own designs only; stylized archetypes, never portraits, no reference images in the repo. Each spec in
`docs/art/<id>.md` keeps its full lookalike list; the summary below is what each built-in is and must never become.
- **maid** — original horned demoness housekeeper: lilac hair in pointed clumps, thin ivory hook horns shading to plum,
  teal dress, cream apron with scalloped lace, rose bow and ribbons, plum stockings, a thin plum spade tail at knee
  height, amber eyes with round pupils. Never a «dragon maid»: no thick scaled tail, no tan dragon horns, no slit
  pupils, no orange/copper hair with a straight fringe (§11.4).
- **kitsune** — fox-girl ninja: ash-silver fur, deep indigo garb, teal scarf with lagging ends, one oversized tail with
  a pale tip and a rose ribbon, a fox mask tilted on the side of the head. Forbidden: leaf or forehead-plate headband,
  whisker marks, orange jumpsuit, multiple tails, red-white miko/shrine scheme, long white hair with a side braid,
  wolf-girl amber fur, heart or bell charms. Fox-girl re-check (Ahri, Senko-san, Holo, Yae Miko, Fubuki, Tamamo,
  Kiriko, Izuna): **PASS** (MA-28r, art-director 2026-11-27).
- **goth** — calm goth girl, stern look: long blue-black hair with bangs, all-black gothic dress with a corset, lace
  choker with a garnet drop, moth hair clip, sleeves past the hands, brown eyes. Forbidden: red or heterochromatic
  eyes, clock or eyepatch motifs, twin-tails or drills, scythe/halberd/umbrella, white collar + braids, hood with a
  forehead gem, purple headband, tattoos.
- **witch** — unsure apprentice, «moss and ember»: compact slouched hat with a bent tip, auburn hair, moss A-line
  robe with bell sleeves, ochre accents and tights; no cape, no prop. Forbidden: Kiki (black dress, red bow, broom,
  black cat), Little Witch Academia, Frieren, Sabrina, Megumin; no black cat familiar, red bow, elf ears, eyepatch.
- **ronin** — armoured samurai (D-20), stern look: black lacquer dō with vermilion lacing, sode, kusazuri, kote,
  katana, a crown tuft, no helmet; red lacquer menpō with a black dragon (Q-D20-1). Forbidden: Kenshin, Zoro, Jin
  (Champloo), Jin Sakai's mask, Mugen; no facial scar, glasses, green hair, multiple swords, full-face pale oni mask,
  cyber/ninja visor, Shredder blades, Mortal Kombat ninja colour schemes.
- **knight** — a human in full `metal_silver` plate (D-22): great bascinet with a hounskull visor raised or lowered per
  animation (§11.11), calm camail, emerald sash and eyes, sword on the hip, normal face. Forbidden: Shovel Knight,
  onion helm, Solaire, Alphonse, Meta Knight, Link, Sir Fortesque, Hollow Knight; no cross shape anywhere, no real
  heraldry, no animal traits.
- **coder** — night-owl coder, stern look (D-21): black `cloth_onyx` hoodie with the hood always up, rectangular steel
  glasses, mustard hood edge and drawstrings, a cream badge `>_` on a steel chain. Forbidden: L, Mr. Robot, Kenma,
  Zenitsu/Ryuji yellow, Octocat; no real brand logos, no legible code, no headphones, no green binary-rain FX.
- **vampire** — theatrical count (D-23): `cloth_midnight` throughout, swept-back hair with a high forehead and a sharp
  widow's peak, a tall gold-lined fan collar, cream ascot with a moonstone, waistcoat with 2 gold buttons, a straight
  knee cloak with gold turned-back corners, buckled pointed shoes, crimson eyes, paired fangs. Gold only small and
  inside the costume. Forbidden: Alucard, Dracula (Castlevania), Count von Count, Vlad / Mavis, Edward Cullen, D,
  Krul Tepes, Mirai Kuriyama, Vampire Knight, Dio; no red-lined black cape, no monocle, no bat logos.
- **Black cloth and hair rule** (R6): "black" is a lifted ramp (`hair_black` blue-black with a cool angel ring,
  `cloth_black` desaturated plum-blue, neutral `cloth_onyx`); its darkest tone is never `#000` (tested), the rim stays
  at 2 and the selective outline is lighter, so the figure holds on a dark IDE (judged first on that backdrop).
- Every new character passes an originality gate before its first sheet, and every art round re-checks it.

## 10. Beauty checklist (art-director and owner)
1. The silhouette reads at real size on white and on dark.
2. The face reads at 1×, and the emotion is clear in ≤ 4 frames.
3. The light is consistent (top-left), with no pillow shading and no stray black.
4. The ramps are hue-shifted and the materials are distinct (cloth, hair, horn, skin).
5. The outline is coloured and selective. The rim holds on dark wallpaper. AA is clean on the curves.
6. Motion has anticipation, follow-through and seamless loops, with no jitter or shimmer pixels.
7. The design is original (ADR 005) and has at least one charming detail.
8. It looks like no other cast member (§12 p. 5) and holds on the real overlay, both walk directions (MA-33).

## 11. Anime style (D-13, SPEC §5.2)
Every built-in character is pixel anime. The style is a technique, not IP: originality (§9, ADR 005) is checked on
every review. Numbers are for the 48-px figure; the reference head/face masks live in
`assets-src/rig/preview-masks.ts`. The adult rules of D-19 / ADR 011 are superseded (ADR 012) and never apply.

### 11.1 Proportions (chibi)
- About 2 heads to the feet (target 2–2.5): the skull (crown to chin, horns excluded) is 23 rows.
- The head is much wider than the shoulders: 24 px (face 20). The body stays small and simple: short arms, mitten
  hands, short legs. Detail goes to the head first.
- Big forehead under the fringe, eyes on the lower half of the face, small chin rounded over the last 3–4 rows.

### 11.2 Eyes (the main emotion carrier)
Eye height ≈ ⅓ of the face (lash to iris bottom); the iris is taller than wide. Light is top-left, so both highlights
sit the same way in both eyes (never mirror them); the lash shape is mirrored.
- Upper lid: an arched ink lash line (higher in the middle), a thick outer corner and a 1-px outer **flick** up-out
  from the corner. No lower lash line.
- Iris 4 × 5, 3 steps dark top → light bottom (`eye` slot c → i → I → k/K), rounded bottom row; its top row is fully
  visible right under the lash; eye block 6 rows.
- Pupil: round, ink, 2 × 2, set slightly inward; the big highlight (1 × 2, cream `P`) overlaps its top-left edge, plus
  a small lower one (1 px `p`, bottom-right of the iris).
- Sclera: a 1-px cream sliver (`p`) on the outer side of the iris.
- Brows stay hidden under the fringe in neutral (they read as a frown when fringe tips touch the lash); keep ≥ 1 skin
  row between fringe tips and the lash line. Stern bodies: §11.9.

### 11.3 Mouth, nose, blush
- Mouth minimal: calm symmetric smile = corners `x..x` + centre `XX` (4 px), never a v/cat mouth; keep ≥ 1 skin row
  above the chin. Happy: open 4-px `XXXX` + rose tongue.
- Nose: none.
- Blush (face library `cheeks`, under every expression): soft = `fFFf` with a dithered `f.f` row under it (AA edges).
  Hatching «/» is the FX intensified blush. Stern bodies (§11.9): blush only on `happy` and `petted`.
- Forehead hair-shadow band: derived from the fringe by `withBand` (`rig/body.ts`): the first skin px under the hair in
  every column becomes `z` (rows ≤ rig `band`, so it never touches the lash). Plus a 1-px AA
  step (`s`) under the band at staircase corners.

### 11.4 Hair
- Clumps with pointed tips: 4 fringe clumps, each 1 px narrower per row to a 1-px point, off-centre parting, split
  by a dark (`j`) line; the centre-left clump is the longest. Side locks end in points. Never dithered.
- Colour (owner decision 2026-11-23, ADR 005): the `maid` has **lilac** hair (`hair_lilac`: cool blue-violet
  shadows h≈280°, lilac base h≈295°, warm-pink lights h≈345°), kept apart from the darker plum tail/stockings and the
  warm rose bow. Horns are imp hooks (3 px base → 1-px tip curling inward, 1-px light edge upper-left, plum base with a
  lighter rim px for dark backdrops), never swept-back dragon horns.
- «Angel ring»: a 1-row shine band on the crown, broken into one segment per clump, brightest on the lit left (`Y`),
  dimmer on the right (`y`), following the skull arc.

### 11.5 Shading: anime soft only (ADR 009)
One preset, `SOFT` in `assets-src/rig/style.ts`: full 6–7-tone ramps, gentle light 2.0, texture dither 0.35 (cloth
only), soft AO 1.0, 2-step coloured outline lighter on the lit side, manual AA on staircases, 2-step rim on the side
away from the light; faces keep cheek light (`e`/`E`), the band + AA step and the 3-step iris. No cel preset.

### 11.6 Emotion marks (FX atlas built in M-ART, played from M1)
Drawn as FX sprites over the head, not in face layers: sweat drop (cream-outlined blue drop at the temple), anger
vein (rose «#»-cross at the forehead corner), blush hatching intensified (3 rows), ^^ and >< eye glyphs (the face
library also has them as `happy` / `startle` eyes), Zzz, heart, «?», «!», smoke puff (switch). Each mark ≤ 7×7, frame
16×16, ≤ 6 frames, 1-px outline (cream around ink marks for dark IDEs); atlas `resources/fx/` (RIG.md), placed at the
rig `fx` anchor.

### 11.7 Mascots (post-v1 backlog only)
Robots and creatures use the same chibi head ratio with rounder forms and no human nose/mouth detail: screen eyes
(emissive ramp, 2–3 px shapes swapped per emotion) or flame/glow eyes, a single highlight, soft round silhouette;
emotion marks are shared with humans.

### 11.8 Black costume recipe (goth)
Black costumes must still separate on dark wallpapers and across the arm/torso edge:
- hue-shifted black ramp: bodice plum-black ~`#1c1626`; sleeves one step lighter and cooler ~`#2c2840` (a separate
  sleeve ramp via `Body.sleeve`), sleeve light side ~`#47405f`;
- 1-px rim on the lit outer arm edge; outer silhouette outline in a lighter plum ~`#5a4a70` (never `#000`);
- bell cuff flaring 1 px with a 1–2 px lace edge (off-white or deep red); hand skin always 1–2 px below the cuff
  (think / wave must show the hand — the arm-over-torso rule iii);
- a light front detail (collar, lacing or ribbon) to break the bodice mass.

### 11.9 Stern look (D-20; per-body face option `face.style: 'stern'` — goth, ronin, coder)
Toughness "or just the gaze" inside chibi proportions. Shared part kit in the rig (`rig/faces/stern.ts`, slot
letters, so each body keeps its eye ramp); a body may override a part but the validator rules hold.
- **Eye (48):** iris 4 × 5; an ink **lid line** 1 row thick that runs flat (or 1 row lower at the outer end) and covers
  the iris top row, so 4 × 3–4 × 4 of iris shows (never < 3 rows: a slit reads asleep); the lid extends 1 px past the
  outer corner as a square tick, no up-flick. No lower-lid px (owner 2026-11-25: at 1× they read as eye bags or
  tears). Pupil 2 × 2 touching the lid; highlight **1 × 1** top-left (+ optional 1-px lower), not the cute 1 × 2.
- **Brows:** always visible (fringe gaps or tips ≥ 1 row above the brow row), 3–4 px × 1 row, hair ramp shade ≤ 1,
  **inner end 1 row lower** (one 1-px step over 3–4 px = "set"); exactly 1 skin row between brow and lid (0 rows
  merges into a blob at 1×).
- **Mouth options:** set flat `XXX` (3 px); short `XX` + 1-px skin-2 corner pulled down on one side (grim); 1-px
  corner up on one side (smirk — goth). Never a symmetric smile in neutral, never a `v`/cat mouth.
- **Blush:** only on `happy` and `petted` (and the FX blush mark); never on neutral, talk, think or wince (validated).
- **Readable at M (×4):** the lid line and the brow are the darkest face px (ΔL ≥ 0.25 vs skin); the brow angle is a
  whole-px step, never AA'd away; checked on real-size previews at S and M on light + dark wallpapers.
- **Not angry all the time — emotions break it** (validated): only `neutral`, `blink`, `half`, `talk_*`, `think`,
  `wince` keep the stern lid + inward brow; `happy` (lids lift or closed arcs, brows flat/up), `worried` (brows
  inner-up — the reverse angle), `startle` (lid fully up, sclera both sides, brows up), `petted` (lid lifted or closed, blush),
  `sleep` (closed) must change the brow angle and the lid. Anger is never the baseline: 2-step brows + the vein FX
  are an anger-only reaction (M1+).
- Stance: confident = chest 1 px up / head level in idles via `tweaks` only; no forked poses.

### 11.10 Mouth mask (D-20; per-body rig option `Body.mask` — ronin's menpō)
- An authored mask over the lower face (front + q34), stamped after the face parts: it **hides the mouth rows** and
  sits ≥ 1 skin row below the iris bottom, inside the head contour (q34 facing contour stays monotonic).
- **Full head width:** every mask row spans the head from contour to contour on its rows, in both views. A narrower
  row leaves a strip of jaw skin + a skin outline beside it, which reads on walk as the face poking past the mask
  (ronin, MA-33).
- `downExpressions` (ronin: `happy`, `petted`, `sleep`): on those frames the face mouth shows and an alternate
  `down` mask hangs at the neck (under the chin, over neck/collar, ≤ 3 rows). The bare face on those expressions is by
  design; there is no «always masked» rule (owner 2026-11-27).
- Mask up = no mouth: `talk_a/b/c` must differ in eye/brow px (validator), so talk reads through the eyes; the speech
  bubble carries the words.

### 11.11 Visor (D-22; per-body rig option `Body.visor` — knight's helmet)
- A movable face cover whose state follows the **animation**, not the expression: `downIn` lists the animations (or
  frames) that show it lowered (knight: `docs/art/knight.md` §1; owner-checked on the overlay — down on `turn` /
  `walk`, up on `idle_a` / `happy`). Raised = the full chibi face shows under the lifted visor (normal face rules).
- Lowered = no face part: the visor covers every skin px of the head; the emotion moves to the **eye slit** (per
  expression glints: calm 2-px pairs, startle 1 × 2 wide pinpoints, worried inner-high pairs, wince one eye, none on a
  blink) and the body language of the shared pose. No glowing eyes (cream glints, never an emissive colour).
- Shapes: never a cross (no vertical keel through a horizontal slit), never a T-visor. Never combined with a mouth mask.

## 12. Costume richness and cast uniqueness (D-20, D-21)
Owner: "standard costumes read boring". Each spec (`docs/art/<id>.md` §«Richness») names:
1. **Layers** — at least 2 visible garment layers (under + over: kosode under dō, dress under corset, tee under hoodie).
2. **One signature piece** — the thing you'd draw from memory (ronin menpō, goth moth + corset, coder hood + badge,
   knight visor, vampire collar).
3. **Material contrast** — ≥ 3 materials from lacquer, metal, cloth, leather/cord, fur, each with its own ramp and
   specular rule (lacquer = hard 1-px streak, metal = hard step, leather = soft 1-px sheen, cloth = folds).
4. **Trims at 1×** — every trim/accessory ≥ 2 px in one direction and ≥ 1 ramp step off its ground; drop it if it
   becomes noise at 1×. Silhouette still reads first (§5).
5. **Unique across the cast** (owner D-21, 2026-11-27) — every character has its own style and resembles no other cast
   member: each new or redrawn character is checked against the whole lineup (`pnpm sprites:sheet --lineup`) for
   silhouette, hair or headwear, colour and face detail, not only against protected characters (§9).

maid, kitsune and witch were signed off before §12; their richness passes come after M1 (Q-D20-2).

## 13. Rules from the cast builds (M-ART, 2026-11-25 … 11-27)
1. **Archetypes played straight** (D-22). The character is the archetype its name promises: a knight is a human in
   full plate, a ronin a samurai in armour. No species swap, animal ears or gag twist on the archetype; charm comes
   from details, motion and persona.
2. **Accessories never replace the jaw outline.** Where a collar, ruff or other neck accessory touches head skin, the
   jaw keeps its own outline and the accessory shows only below it, so the cheek contour moves only with the head
   when head and body bob out of phase (vampire, rig opt-in `Body.jawOverNeckAcc`, RIG.md).
3. **Masks and covers span the full head width** (§11.10) and cover every skin px they claim (§11.11).
4. **Calm small surfaces:** no 2 × 2 checker, calm mail, calm feet (§5); no full-column rim on pale skin (§3).
5. **Judge on the real overlay**, both walk directions, over a light and a dark window, before sign-off: sheets and
   previews miss shimmer and mask gaps that show at 1× in motion (all three MA-33 fixes were found this way).
