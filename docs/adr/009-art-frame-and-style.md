# 009. Character frame 48 px, style «anime soft»

- Status: Accepted. *(2026-11-24 ADR 011 superseded its frame, chibi rules and scale table; 2026-11-25 ADR 012 (D-20)
  superseded ADR 011 and **restored all of this ADR**: frame 48 × 56, chibi, `scaleRef` 48, S/M/L ×3/×4/×5.)*
- Date: 2026-11-23

## Context
M-ART Phase 1 compared one original character (`maid`) in four variants (plan `docs/plans/2026-11-23-m-art.md`). The variants were frame 48 vs 64, each in «anime cel» (2–3 tones, hard terminators, crisp outline) and «anime soft» (6–7 tones, soft modelling, manual AA, rim light). Constraints:
- all art by code (D-11);
- pixel-anime style (D-13, SPEC §5.2);
- default size ≈ 3 cm (D-10).

Before the owner session the art-director ran 3 review rounds plus a gate check:
- the heads moved to authored masks;
- the faces at 48 and 64 were matched in mood and eye-to-face ratio;
- cel and soft were made to differ on the face, not only on hair and cloth;
- the blush contrast was evened out;
- the hair changed to lilac, so the design stops reading as a known anime character (ADR 005).

The art-director's verdict was READY with no blockers. Their prediction was 64 soft, on detail.

At the M preset on 1080p / 125 %, 48 ×4 and 64 ×3 are both 192 device px tall, so the comparison was about detail density and look, not size.

## Decision
**Frame 48 × 48, style «anime soft».** The owner chose variant A = `spike-maid-48soft` in the blind A–D lineup on the real overlay. The mapping was revealed only afterwards.
- All built-in characters use a 48-px frame (with headroom, see below) and the soft preset: full 6–7-tone hue-shifted ramps, manual AA, rim light on the side away from the light, and texture dither on cloth only, never on hair or skin.
- Faces, fringe, horns and other key details are authored masks per expression. The face is the bottleneck at 48, so the face masks get the most care.
- **Headroom rule:** horns, ears, antennae and the happy jump must never clip. Phase 2 sets the frame height to fit the tallest pose of every slot variant, e.g. 48 × 56, or lowers the figure in the frame. A test checks that no opaque pixel touches row 0 in any frame.
- `computeScale` presets with frame 48 at 1080p / 125 % are S ×3 (144 px), M ×4 (192 px) and L ×5 (240 px). All three are distinct, so the fine size steps keep working.

## Alternatives considered
- **64 soft** (the art-director's pick): more room for costume detail and a full anime eye. The owner preferred the 48 look: more chibi and cuter at real size. With 64 the L preset also equals M.
- **Cel**, at either size: cleaner next to real work, but plainer.
- **Hand-drawn or hybrid art:** rejected in D-11, because the owner does not draw.

## Consequences
- Positive:
  - smaller atlases (~10 kB per spike pack), lighter on RAM (budget ≤ 280 MB, ADR 007);
  - half the mask authoring per character;
  - fine size steps.
- Negative:
  - less room for face and costume detail;
  - the anime eye at 48 is 4×5, so emotions rely on authored face layers and FX (sweat drop, anger vein, blush hatching);
  - the art-director rates code art at «good indie», with the face as the ceiling.
- Follow-ups for Phase 2:
  - frame headroom;
  - rounder head silhouette;
  - happy open mouth;
  - walk body bob;
  - thicker tail without texture noise;
  - originality check on every new character.
  The spike packs (`spike-*`) stay excluded from builds.
