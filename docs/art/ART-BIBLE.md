# Pixmates ART-BIBLE v0.1 (M-ART phase 1, anime style D-13)

The source of style for every built-in character (rules/art.md). v0 holds what the spike needs. v0.5 adds the
numbers chosen in ADR 009 (frame size, style); v1 closes M-ART. All art is made by code (D-11): masks and geometry
are authored in `assets-src/`, and procedural code is used only for material texture.

## 1. Grid and frame
- Frame 48×48 or 64×64 (ADR 009 decides). Pivot at the feet: anchor (0.5, 1). The bottom row stays free for the outline.
- Body axis on a pixel boundary (x = 24 in 48-units), so left and right mirror exactly.
- Integer scale on screen (`computeScale`). Never resample art. Squash means inserting or removing whole rows.
- One atlas per character: one row per animation, `origin` per animation in the manifest.

## 2. Light
- One light from the top-left (`SUN` in `passes.ts`). Every shading pass uses it.
- Form comes from normals (strokes, ellipses, `curveX` cylinders), not from a centre highlight. No pillow shading.
- Cast shadow and AO from part depth: under the chin, under the bib, behind the arms.

## 3. Outline and rim
- Outline is coloured: the neighbour's own ramp, 2 steps darker (anime soft) or 3 steps (anime cel). Never `#000`. The ink ramp starts at a dark plum.
- Selective outline: one step lighter on the lit (top-left) side.
- Internal lines appear only where materials meet and the part behind gets the line.
- Rim light: the inner edge on the side away from the light gets 2 steps brighter (anime soft), so the sprite holds on dark wallpapers.
- Outline, AA and rim run after compositing, on the whole figure, so part seams never show.

## 4. Palette and ramps
- `assets-src/palettes/master.json`, swatch `docs/art/palette.png`. Each ramp has 5–7 tones with monotonic OKLab L and ≥ 15° hue drift: shadows move cool or purple, lights move warm. No pure black or white (tested).
- Generators address colours as (ramp, index) only, so palette conformance holds by construction (checked again at build).
- Dithering is used only as texture near half steps (anime soft spread 0.35). It is never a gradient.

## 5. Materials
- Cloth: soft vertical folds that deepen toward the hem. Hair: long strands plus sparse lit strands. Horn: growth rings and a brighter tip. Metal: a hard specular step. Fur: tufts and clumps (`materials.ts`).
- Detail must never break the silhouette. If the shape stops reading at 1×, remove texture.

## 6. Faces
- Faces are authored masks, one face layer per emotion, placed on the head's face anchor (`mask.ts` legend: slot + tone 0–5).
- Eyes, mouth, nose and blush follow §11.2–11.3 (anime construction per frame size).
- An emotion must read within 2–4 frames at real size.

## 7. Motion
- 6–12 fps. Idle: breathing (shoulders and head rise 1 px, with a sub-pixel chest colour shift between) and a 1-frame blink.
- Walk: bob on contact frames, the head lags 1 frame, arms counter-swing, weight shifts sideways.
- Happy: anticipation squash, then a jump with arms up, then a landing squash and a settle.
- Secondary motion (locks, ribbons, tail) comes from a verlet chain: 2 warm-up loops, the residual spread over the loop, positions quantized to px. Loops must be seamless (tested).

## 8. Mirroring (open, R4)
- Runtime mirroring flips the top-left light. v0 proposal: accept the flip for walking left. If art-director flags it in phase 2, bake a facing row instead (2× atlas, still ≤ 1024×2048). ADR 009 decides.

## 9. Originality (ADR 005)
- Own designs only. `maid` is an original horned demoness housekeeper: a chibi anime girl with copper hair in pointed clumps, thin ivory hook horns shading to plum at the base, teal dress, cream apron with scalloped lace, rose bow and ribbons, plum stockings, a thin plum tail with a pointed spade at knee height and amber eyes with round pupils. She has no signature costume or colour scheme from any existing character; in particular she must not read as a «dragon maid» (no thick scaled tail, no tan dragon horns, no slit pupils).

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

### 11.1 Proportions (chibi)
- About 2 heads to the feet (target 2–2.5): the skull (crown to chin, horns excluded) is 23 rows of 48 / 28 of 64.
- The head is much wider than the shoulders: 24 px at 48 (face 20), 32 px at 64 (face 26). The body stays small and
  simple: short arms, mitten hands, short legs. Detail goes to the head first.
- Big forehead under the fringe, eyes on the lower half of the face, small chin rounded over the last 3–4 rows.

### 11.2 Eyes (the main emotion carrier)
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
- Iris per style: soft = 3 steps `c` → `i` → `I`; cel remaps `eye` to 2 tones (dark `c` top, flat `I` below).
- Brows stay hidden under the fringe in neutral (they read as a frown when fringe tips touch the lash); keep ≥ 1 skin
  row between fringe tips and the lash line.

### 11.3 Mouth, nose, blush
- Mouth minimal: calm symmetric smile = corners `x..x` + centre `XX` (4 px), never a v/cat mouth; keep ≥ 1 skin row
  above the chin (48: lifted 1 px in round 3). Happy: open 4-px `XXXX` + rose tongue.
- Nose: none at 48; 1 skin-shadow px left of the axis at 64.
- Blush per style (rig `face.cheeks`, under every emotion layer): **cel** = hard 2×1 `FF` block per cheek;
  **soft** = `fFFf` with a dithered `f.f` row under it (AA edges). Hatching «/» moves to the FX intensified blush.
- Forehead hair-shadow band: derived from the fringe by `withBand` (`maid.ts`): the first skin px under the hair in
  every column becomes `z` (rows ≤ rig `band`, so it never touches the lash). Cel: one hard tone. Soft: plus a 1-px
  AA step (`s`) under the band at staircase corners.

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

### 11.5 Shading directions (spike axis, ADR 009 picks one)
| | Anime cel (`spike-maid-*cel`) | Anime soft (`spike-maid-*soft`) |
|---|---|---|
| Tones per material | 2–3 with hard terminators: procedural px snap to ramp stops (`celSnap`), masks remap 6 → 3 tones | full 6–7-tone ramps, gentle light (2.0), texture dither 0.35 |
| Outline | crisp, 3 steps below the neighbour, lighter on the lit side | 2 steps, lighter on the lit side, manual AA on staircases |
| Rim | none | 2 steps on the side away from the light (dark wallpapers) |
| AO | almost none (0.2) | soft (1.0) |
| Face | flat skin, hard 1-tone fringe band, 2-tone iris, 2×1 blush block | cheek light (`e`/`E`), band + AA step, 3-step iris, AA/dithered blush |
Eye shapes, ink and highlights are the same in both directions (the face must read the same); only the tone
treatment above differs.

### 11.6 Emotion marks (FX, phase 2+)
Drawn as FX sprites over the head, not in face layers: sweat drop (cream-outlined blue drop at the temple), anger
vein (rose «#»-cross at the forehead corner), blush hatching intensified (3 rows), ^^ eyes (happy, already a face
layer), >< eyes (startle / embarrassed face layer). Each mark ≤ 7×7 at 48, 2–4 frames in.

### 11.7 Mascots (non-human characters, later)
Robots and creatures use the same chibi head ratio with rounder forms and no human nose/mouth detail: screen eyes
(emissive ramp, 2–3 px shapes swapped per emotion) or flame/glow eyes, a single highlight, soft round silhouette;
emotion marks are shared with humans.
