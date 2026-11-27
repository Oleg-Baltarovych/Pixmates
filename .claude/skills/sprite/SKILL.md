---
name: sprite
description: Create or change a rig pose, character part, animation or FX through the asset pipeline (assets-src → pnpm sprites → resources/characters), then check it with art-director. Use for any new or changed visual asset.
argument-hint: "<what, e.g. 'rig: climb pose' | 'kitsune: tail parts' | 'fx: sweat drops'>"
---
# Sprite: $ARGUMENTS

1. Read `docs/art/`: the art bible (grid, frame size, outline, light, palette ramps) and the rig spec (slots, pose format, frame naming). Read SPEC §5.2–5.3.
2. Decide the level and say why:
   - **Rig pose / shared animation** (`assets-src/rig/`): one pose file is applied to every character. Check it on all existing characters, not just one.
   - **Character part / palette / signature animation** (`assets-src/characters/<id>/`): parts must fit the slot anchors; colours come only from the master palette plus the character ramp.
   - **FX** (`assets-src/fx/`): small and short, shared atlas.
   - All art is code (D-11): faces and key details as authored pixel masks in code, materials procedural. Apply the quality techniques from SPEC §5.2 and the ART-BIBLE beauty checklist.
3. Never use or imitate protected characters (ADR 005). AI-generated images are references only.
4. Run `pnpm sprites`. It must be deterministic: two runs, same hashes. After an intended pack change run `pnpm sprites:lock`; the lock diff must list only the packs this task names. The builder enforces the shelf atlas ≤ 1024²; check that the manifest animation names resolve.
5. Run `pnpm sprites:sheet <id>` for each affected character, and take a stage screenshot over light and dark wallpapers.
6. Launch `art-director` with the paths. Apply the ⚠/❌ notes once, then show the owner (before/after via `pnpm sprites:compare <id>`). At most 2 art-director rounds in total; report what is left.
7. Report: files in `assets-src/`, characters affected, atlas impact (size, frame count), sheet and screenshot paths, remaining art notes.
