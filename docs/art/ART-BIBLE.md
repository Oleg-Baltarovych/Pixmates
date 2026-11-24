# Pixmates ART-BIBLE v0.6 (M-ART phase 3: ADR 011 adult rules, frame 56 × 72, anime soft only)

The source of style for every built-in character (rules/art.md). v0 holds what the spike needs. v0.5 adds the
numbers chosen in ADR 009 (frame size, style) and the arm-over-torso rule (§3) with the goth recipe (§11.8); v0.6
(MA-41) sets the adult frame and rules of ADR 011 (§1, §11.0), chibi text kept as history; v1 closes M-ART. All art is made by code (D-11): masks and geometry
are authored in `assets-src/`, and procedural code is used only for material texture.

## 1. Grid and frame
ADR 011 (accepted 2026-11-24, owner pick C+ from `reports/sprites/style-spike/`). Code numbers are re-measured in the
rig in MA-42; until then the shipped packs are still 48 × 56 (history below).

- Frame **56 × 72**, rows top to bottom (male build, standing):

  | rows | use |
  |---|---|
  | 0 | always transparent (builder + headroom gate) |
  | 1–5 | headroom above the crown: ears, horns, hats, the ronin tuft, the happy apex, head lag |
  | ≈ 6 | crown (top of the skull) |
  | 6–20 | skull 14 × 15, face 12 rows (hairline → chin at row 20) |
  | 21–23 | neck 3 rows (shadow on the top 2) |
  | 24 | shoulder line; chest → hip 17 rows |
  | 41 | hip joint (female 40); hip → sole 30 rows |
  | 70 | soles (feet row) |
  | 71 | free for the outline / ground contact |

  Standing figure ≈ 66 rows → **`scaleRef` 66 in every built-in manifest** (sizing follows the figure, not the frame;
  S/M/L ×2/×3/×4 at 1080p / 125 % with the 0.30 clamp and L 200 DIP, SPEC §3.3).
- **Headroom budget:** tallest extra above the crown + happy apex + 1-frame head lag ≤ 5 rows (spike ronin: tuft 2 +
  hop 2 = 4). A character that needs more (kitsune ears, witch hat) makes the frame grow by 4 rows on top (H 76, feet
  row 74) — the gate picks the smallest fit; ears and hats are never shrunk to fit.
- **Width 56:** the figure stays inside x ≈ 14–42; the extra columns are for the saya, haori sleeves, cloaks, tails
  and wide arm poses. Body axis on a pixel boundary at **x = 28**, so left and right mirror exactly.
- Pivot at the feet: anchor (0.5, 1); `sit_edge` pivots on the seat (per-animation `anchor`). Rig details:
  `docs/art/RIG.md`.
- Integer scale on screen (`computeScale`). Never resample art. Squash means inserting or removing whole rows. One
  art pixel at M is ×3 (was ×4): detail comes from the bigger frame, not bigger pixels.
- One atlas per character, strips shelf-packed (≤ 1024², ≈ 1008 × 432 = 18 × 6 cells for 105 frames, ≈ 1.66 MiB),
  `origin` per animation in the manifest.
- *History (phase 2, ADR 009):* frame 48 × 56 = a 48 × 48 figure box (feet row 46) + 8 rows of headroom, axis x = 24,
  `scaleRef` 48, S/M/L ×3/×4/×5, atlas 1008 × 336.

## 2. Light
- One light from the top-left (`SUN` in `passes.ts`). Every shading pass uses it.
- Form comes from normals (strokes, ellipses, `curveX` cylinders), not from a centre highlight. No pillow shading.
- Cast shadow and AO from part depth: under the chin, under the bib, behind the arms.

## 3. Outline and rim
- Outline is coloured: the neighbour's own ramp, 2 steps darker (anime soft; D-19 adult rule: 3 steps, 2 on the lit side — §11.0). Never `#000`. The ink ramp starts at a dark plum.
- Selective outline: one step lighter on the lit (top-left) side.
- Internal lines appear only where materials meet and the part behind gets the line.
- Rim light: the inner edge on the side away from the light gets 2 steps brighter (anime soft), so the sprite holds on dark wallpapers.
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

## 6. Faces
- Faces are authored masks, one face layer per emotion, placed on the head's face anchor (`mask.ts` legend: slot + tone 0–5).
- Eyes, mouth, nose and blush follow §11.0 (adult face, D-19); §11.2–11.3 are history except where §11.0 keeps them.
- An emotion must read within 2–4 frames at real size.

## 7. Motion
- 6–12 fps. Idle: breathing (shoulders and head rise 1 px, with a sub-pixel chest colour shift between) and a 1-frame blink.
- Walk: bob on contact frames, the head lags 1 frame, arms counter-swing, weight shifts sideways.
- Happy: anticipation squash, then a jump with arms up, then a landing squash and a settle.
- Secondary motion (locks, ribbons, tail) comes from a verlet chain: 2 warm-up loops, the residual spread over the loop, positions quantized to px. Loops must be seamless (tested).

## 8. Mirroring (closed, R4)
- Walking left uses the runtime mirror; the top-left light flips, which is accepted (plan M-ART phase 2). The
  art-director judges a mirrored walk sheet in MA-27; if rejected, a baked facing row is an M1 follow-up (it still fits
  ≤ 1024² with shelf packing).
- D-16: travel poses (`walk`, `turn`; M1 `run`, `climb`) are drawn in a three-quarter view facing right and mirrored
  for left (`facing` in the manifest; RIG.md «Views»). Asymmetric details swap sides in the mirror. The head never
  rocks sideways in a walk.

## 9. Originality (ADR 005)
- Own designs only. `maid` is an original horned demoness housekeeper: a chibi anime girl with lilac hair in pointed clumps, thin ivory hook horns shading to plum at the base, teal dress, cream apron with scalloped lace, rose bow and ribbons, plum stockings, a thin plum tail with a pointed spade at knee height and amber eyes with round pupils. She has no signature costume or colour scheme from any existing character; in particular she must not read as a «dragon maid» (no thick scaled tail, no tan dragon horns, no slit pupils).
- **kitsune** (chibi fox-girl ninja, hyperactive braggart; female since D-18, art unchanged). Colourway (owner Q3):
  ash-silver fur, deep indigo garb, teal scarf. Own traits: one oversized tail with a pale tip, a fox mask worn tilted
  on the side of the head, a short scarf whose ends lag in motion. Forbidden: leaf or forehead-plate headband, whisker
  marks, orange jumpsuit, nine tails, red-white shrine scheme.
  - Fox-girl risk list (D-18) — **re-check pending (MA-28r)**: Ahri (LoL), Senko-san, Holo (Spice and Wolf), Yae Miko
    (Genshin), Shirakami Fubuki (hololive), Tamamo no Mae (Fate), Kiriko (Overwatch), Izuna (Blue Archive). Watch: no
    pink/red-white miko or shrine scheme, no multiple tails, no long white hair with a side braid, no blonde/amber
    fur with a wolf-girl read, no heart or bell charms as signature props.
- **goth** (stylized pixel-anime goth girl, calm, ironic, warm to friends): long blue-black hair with bangs, all-black
  gothic dress, lace choker, brown eyes. Own traits (owner Q4): a small garnet drop on the choker, a moth hair clip,
  sleeves past the hands. Forbidden: red or heterochromatic eyes, clock or eyepatch motifs, twin-tails or drills,
  scythe/halberd/umbrella props, white collar + braids, hood with a forehead gem, purple headband. A stylized
  archetype, not a portrait: no tattoos or other identifying details, no reference images in the repo.
- Specs after the gate: kitsune — `docs/art/kitsune.md`, goth — `docs/art/goth.md`.
- **D-17 briefs (proposals; each per-character art-director gate refines them into `docs/art/<id>.md`):**
  - **witch** (female, «відьма-учениця»: an unsure apprentice witch who is still learning; spells fizzle). Own-trait
    ideas: a slightly too-big hat that is bent or patched (compact enough for the headroom gate, RIG.md), a
    scorch-marked hem or sleeve, a small potion vial on the belt, a non-black colourway (e.g. moss/teal with a warm
    accent) so she never doubles as `goth`. Forbidden lookalikes: Kiki (black dress + big red bow + broom + black
    cat), Little Witch Academia (Akko's red eyes / brown hair + wide-brim hat with a band, Luna Nova uniform),
    Frieren (white twin-tails, white-gold mage coat, elf ears), Sabrina (blonde teen + black cat), also Megumin (red eyes +
    eyepatch + crimson robe). No black cat familiar, no red bow, no elf ears, no eyepatch.
  - **ronin** (male, spirit swordsman with a mist cloak; calm, aphorisms). Own-trait ideas: the cloak dissolving
    into mist at its ends (texture only, binary alpha), a pale spirit-blue or slate colourway, a sheathed sword worn
    on the back or carried, a single paper charm or bell. Forbidden lookalikes: Kenshin (red hair, cross-shaped
    scar, magenta gi, reverse-blade sword), Zoro (green hair, three swords, green haramaki, earrings), Jin from
    Samurai Champloo (glasses, ponytail, blue/indigo hakama with a long blade), also Jin Sakai's (Ghost of
    Tsushima) mask and Mugen's red jacket. No facial scar, no glasses, no green hair, no multiple swords.
  - **knight** (male, cat knight in oversized armour; noble coward). Own-trait ideas: a helmet that is visibly too
    big (slips over the eyes on `startle`), cat ears through slots in the helmet, a short tail out of the back plate,
    a wooden or toy-ish sword, a non-ginger fur (e.g. grey tabby or cream) and a plume or tabard colour of his own.
    Forbidden lookalikes: Puss in Boots (ginger cat, feathered cavalier hat, boots, rapier, cape), Felyne/Palico
    (Monster Hunter cat armour sets), Hollow Knight (white mask with two horns, black body, nail), Garfield (orange
    tabby with black stripes). No ginger/orange fur, no cavalier hat with a feather, no white horned mask.
- **D-18 briefs (proposals; the per-character gates MA-29d/e refine them into `docs/art/<id>.md`):**
  - **coder** (male, night-owl coder boy in a hoodie; sleepy, dry humour; Dev companion lead). Own-trait ideas:
    hood down and bunched, sleeves past the hands, half-lidded eyes with a soft under-eye shade, one cowlick, a
    steaming mug, a muted non-black hoodie (so he never doubles as `goth` or `vampire`), drawstrings of uneven length.
    Forbidden lookalikes: L (Death Note: white long-sleeve, crouched sitting, dark eye bags, messy black hair, sweets),
    Mr. Robot (black hood up, dark hacker read), Kenma (Haikyuu:
    two-tone blond-over-black hair, red/team jacket, handheld console), Satou (NHK ni Youkoso), generic hikikomori
    tropes (unkempt clutter, energy-drink piles), GitHub Octocat. No headphones (q34 rule), no glasses glint
    «anime hacker» trope, no real brand logos (IDE, OS, cloud, drink) on hoodie or mug, no code text legible on props.
  - **vampire** (male, chibi aristocrat count; theatrical, afraid of the light theme and mornings). Own-trait ideas:
    a high standing collar on a short cloak with a coloured lining of his own (not red-on-black), a small cravat or
    brooch, neat swept hair with one stray lock, tiny fangs only on chosen faces, a dramatic cloak-hide pose.
    Forbidden lookalikes: Alucard (Hellsing: red coat, wide hat, orange glasses; Castlevania: long white hair, black
    coat), Dracula (Castlevania), Count von Count (Sesame Street: monocle, purple skin, counting), Vlad (Hotel
    Transylvania), Edward Cullen (sparkling skin), Mavis (Hotel Transylvania), D (Vampire Hunter D: wide hat, long
    sword), Krul Tepes (Owari no Seraph: pink hair, gothic lolita), Mirai Kuriyama (Kyoukai no Kanata: red glasses,
    blood weapon), Vampire Knight (white/black academy uniforms), Dio (JoJo: blond, yellow jacket, heart motifs). No
    widow's-peak + slicked black hair + red-lined black cape combo, no monocle, no bats styled as any brand logo
    (e.g. the Batman emblem).
- **Black cloth and hair rule** (R6): "black" is a lifted ramp (`hair_black` blue-black with a cool angel ring,
  `cloth_black` desaturated plum-blue); its darkest tone is never `#000` (tested), the rim stays at 2 and the
  selective outline is lighter, so the figure holds on a dark IDE (judged first on that backdrop).
- Every new character passes an originality gate before its first sheet, and every art round re-checks it.

## 10. Beauty checklist (art-director and owner)
1. The silhouette reads at real size on white and on dark.
2. The face reads at 1×, and the emotion is clear in ≤ 4 frames.
3. The light is consistent (top-left), with no pillow shading and no stray black.
4. The ramps are hue-shifted and the materials are distinct (cloth, hair, horn, skin).
5. The outline is coloured and selective. The rim holds on dark wallpaper. AA is clean on the curves.
6. Motion has anticipation, follow-through and seamless loops, with no jitter pixels.
7. The design is original (ADR 005) and has at least one charming detail.

## 11. Anime style (D-13, SPEC §5.2 v1.7)
Every built-in character is pixel anime. The style is a technique, not IP: originality (§9, ADR 005) is checked on
every review. Numbers below are the spike `maid`'s (`assets-src/spike/maid-{48,64}/rig.ts`); ADR 009 fixes one size.

### 11.0 D-19 — adult rules (final; ADR 011 accepted 2026-11-24, frame 56 × 72)
> **§11.1 and §11.2 below are superseded and kept as history; §11.3 blush and nose rules too.** Owner D-19: adult,
> tough characters, not childish. Pixel anime, «anime soft», authored faces, hair clumps with an angel ring and FX
> marks (§11.4–11.6) still hold. Numbers are the spike C+ targets; MA-42…44 re-measure them in the rig.

- **Build.** ≈ 4.4 heads in 56 × 72 (rows in §1). Skull 14 × 15, neck 3, chest → hip 17, hip → foot 30 (≈ 45 %).
  Shoulders wider than the head: male 21 / female 17; neck width male 5 / female 3. Arms upper 10 + fore 9 + fist 3,
  reaching mid-thigh; elbow and knee joints. Stance (foot centres) male 13 / female 9, never feet together; foot width
  male 6 / female 5. **Build presets** on one skeleton — male: broad shoulders, narrow hips, straight waist; female:
  hip 1 row higher, waist pinched 2 px per side at 60 % of the torso, hips = shoulders, feet 1 px shorter.
  Contrapposto idle: hip 1 px out, the opposite shoulder 1 px down.
- **Face (12 rows).** Eyes ¼–⅕ of the face height; eye row ≈ 50 % of the face; iris 2 × 3 with its top row under a
  1-px lid, one top-left highlight (same side in both eyes), sclera on the outer side only. Brows 3–4 px with a 1-row
  gap above the lid, always visible (with the eyes they carry the emotion); the male inner end 1 px lower. Nose: 1
  shadow px left of the axis at ≈ 70 %. Mouth 2–3 px at ≈ 82 %. Jaw: male = corner step, then a 3-px chin; female =
  taper to a 2-px chin + a lower-lip px. 2-row neck shadow under the chin. No blush outside `petted`. Adult face shape,
  never round baby cheeks.
- **Colour.** Each character: a dark anchor ramp (darkest L ≤ 0.28) + one saturated accent (C ≥ 0.12, e.g. ronin
  oxblood); no all-pastel sets. Contour 3 tone steps darker than the fill (2 on the lit side); dark cloth: ink contour
  on the shadow side, 2-step rim on the lit side. A hard shadow terminator on body and face (ramps, AA and rim as §3,
  §11.5).

### 11.1 Proportions (chibi) — historical, superseded by §11.0 (D-19)
- About 2 heads to the feet (target 2–2.5): the skull (crown to chin, horns excluded) is 23 rows of 48 / 28 of 64.
- The head is much wider than the shoulders: 24 px at 48 (face 20), 32 px at 64 (face 26). The body stays small and
  simple: short arms, mitten hands, short legs. Detail goes to the head first.
- Big forehead under the fringe, eyes on the lower half of the face, small chin rounded over the last 3–4 rows.

### 11.2 Eyes (the main emotion carrier) — historical, superseded by §11.0 (D-19: eyes ¼–⅕ of the face)
Shared: eye height ≈ ⅓ of the face (lash to iris bottom); the iris is taller than wide. Light is top-left, so both
highlights sit the same way in both eyes (never mirror them); the lash shape is mirrored.
- Upper lid: an arched ink lash line (higher in the middle), a thick outer corner and a 1-px outer **flick**
  (up-out). No lower lash line at 48; one outer px at 64 (optional).
- Iris gradient (convention): dark top → light bottom, `eye` slot c → i → I → k/K, rounded bottom row (narrower).
- Pupil: round, ink, 2×2 (48) / 2×3 (64), set slightly inward; the big highlight overlaps its top-left edge.
- Highlights: big upper (1×2 at 48, 2×2 at 64, cream `P`) + small lower (1 px `p`, bottom-right of the iris).
- Sclera: 1-px cream slivers beside the iris (`p`), outer and inner side at 64, outer only at 48.
- 48: iris 4×5, lash 4 (top row) + thick outer corner and inner end 1 row lower (arch) + outer flick 1 px **up**-out
  from the corner; the iris top row is fully visible right under the lash; eye block 6 rows.
- 64: iris 6×7, pupil 2×3, lash 6 + a 3-px peak over the pupil + corner + up-out flick, sclera on both sides; eye
  block 8 rows starting 1 px lower than round 3 (fringe tips 2 px lower), so the eyes take about the same share of the
  face as at 48.
- Iris: 3 steps `c` → `i` → `I` (anime soft).
- Brows stay hidden under the fringe in neutral (they read as a frown when fringe tips touch the lash); keep ≥ 1 skin
  row between fringe tips and the lash line.

### 11.3 Mouth, nose, blush
> D-19: the nose px, mouth size and «blush only in `petted`» rules of §11.0 replace the nose and blush lines below.

- Mouth minimal: calm symmetric smile = corners `x..x` + centre `XX` (4 px), never a v/cat mouth; keep ≥ 1 skin row
  above the chin (48: lifted 1 px in round 3). Happy: open 4-px `XXXX` + rose tongue.
- Nose: none at 48; 1 skin-shadow px left of the axis at 64.
- Blush (face library `cheeks`, under every expression): soft = `fFFf` with a dithered `f.f` row under it (AA edges). Hatching «/» moves to the FX intensified blush.
- Forehead hair-shadow band: derived from the fringe by `withBand` (`rig/body.ts`): the first skin px under the hair in
  every column becomes `z` (rows ≤ rig `band`, so it never touches the lash). Plus a 1-px AA
  step (`s`) under the band at staircase corners.

### 11.4 Hair
- Clumps with pointed tips: 4 fringe clumps, each 1 px narrower per row to a 1-px point, off-centre parting, split
  by a dark (`j`) line; the centre-left clump is the longest. Side locks end in points. Never dithered.
- Colour (owner decision 2026-11-23, ADR 005): the `maid` has **lilac** hair (`hair_lilac`: cool blue-violet
  shadows h≈280°, lilac base h≈295°, warm-pink lights h≈345°). **Originality:** orange/copper hair + straight fringe +
  horns + maid dress reads as Tohru («Miss Kobayashi's Dragon Maid») and is forbidden for this character; lilac is
  cooler and lighter than the plum tail/stockings/shoes (h 320–345°, darker) and far from the warm rose bow, so the
  materials stay separate. Horns are imp hooks (3 px base → 1-px tip curling inward, 1-px light edge upper-left, plum
  base with a lighter rim px for dark backdrops), never swept-back dragon horns.
- «Angel ring»: a shine band 1 row (48) / 2 rows (64) on the crown, broken into one segment per clump, brightest on
  the lit left (`Y`), dimmer on the right (`y`), following the skull arc.

### 11.5 Shading: anime soft only (ADR 009)
The owner picked 48 soft in the blind lineup; the cel preset, `celSnap` and mask tone remaps were deleted (MA-22).
One preset, `SOFT` in `assets-src/rig/style.ts`: full 6–7-tone ramps, gentle light 2.0, texture dither 0.35 (cloth
only), soft AO 1.0, 2-step coloured outline lighter on the lit side, manual AA on staircases, 2-step rim on the side
away from the light; faces keep cheek light (`e`/`E`), the band + AA step and the 3-step iris.

### 11.6 Emotion marks (FX, phase 2+)
Drawn as FX sprites over the head, not in face layers: sweat drop (cream-outlined blue drop at the temple), anger
vein (rose «#»-cross at the forehead corner), blush hatching intensified (3 rows), ^^ and >< eye glyphs (the face
library also has them as `happy` / `startle` eyes), Zzz, heart, «?», «!», smoke puff (switch). Each mark ≤ 7×7, frame
16×16, ≤ 6 frames, 1-px outline (cream around ink marks for dark IDEs); atlas `resources/fx/` (RIG.md), placed at the
rig `fx` anchor, played from M1.

### 11.7 Mascots (non-human characters, later)
Robots and creatures use the same chibi head ratio with rounder forms and no human nose/mouth detail: screen eyes
(emissive ramp, 2–3 px shapes swapped per emotion) or flame/glow eyes, a single highlight, soft round silhouette;
emotion marks are shared with humans.

### 11.8 Goth costume recipe (MA-29 note)
Black costumes must still separate on dark wallpapers and across the arm/torso edge:
- hue-shifted black ramp: bodice plum-black ~`#1c1626`; sleeves one step lighter and cooler ~`#2c2840` (a separate
  sleeve ramp via `Body.sleeve`), sleeve light side ~`#47405f`;
- 1-px rim on the lit outer arm edge; outer silhouette outline in a lighter plum ~`#5a4a70` (never `#000`);
- bell cuff flaring 1 px with a 1–2 px lace edge (off-white or deep red); hand skin always 1–2 px below the cuff
  (think / wave must show the hand — the arm-over-torso rule iii);
- a light front detail (collar, lacing or ribbon) to break the bodice mass.
