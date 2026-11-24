# 011. Adult proportions for all built-in characters, frame 56 × 72

- Status: **Accepted** (owner, 2026-11-24: Q-D19-1 = **C+**, Q-D19-2 = ronin crown tuft allowed; D-19)
- Date: 2026-11-24 (proposed and accepted)
- Supersedes: ADR 009's frame (48 × 56), proportion and eye rules and its S/M/L scale table. ADR 009's «anime soft»
  shading, authored-mask faces and the headroom rule stay. Revises ADR 010's numbers (see Consequences).

## Context
At the `ronin` sign-off the owner said he looks like a kindergarten kid and decided (D-19) that every character must
be redone as an adult: «not childish, adult, tough characters», more samurai for ronin, all of them «cool».
The art-director traced it to the chibi proportions of D-13 / ADR 009 (ART-BIBLE §11.1–11.2): ≈ 2.0 heads, legs 13 %
of the height, arms ending at the waist, head 2.4× the shoulders, round baby face, eyes ⅓ of the face, blush, feet
together, pastel palette. Recolouring or a new costume does not fix that; the body plan has to change.
The style spike (MA-40, `reports/sprites/style-spike/`, painter `assets-src/spike/style/`) showed ronin and goth in
three variants at real size on white, a dark IDE and grey. The owner picked **C+** with the rule «the size must make
the body proportions right; it can be bigger if needed».

## Options
| | B — «SD adult», 48 × 56 | C — adult, 48 × 64 | **C+ — adult, 56 × 72 (chosen)** |
|---|---|---|---|
| Heads | ≈ 3.2 | ≈ 4.4 | ≈ 4.4, with the bigger B head (face 12) |
| Read | older, still stylised; short limbs | adult, but a small 11-row face | adult silhouette and a face with room for 2 × 3 irises |
| Width | 48 | 48: saya, sleeves, cloaks crowd the edges | 56: room for the saya, haori sleeves, cloaks, tails, wide arms |
| Atlas | 1008 × 336, 1.29 MiB | 1008 × 384, 1.48 MiB | 1008 × 432, 1.66 MiB |
| Scale 1080p / 125 % | ×3/×4/×5 | ×2/×3/×4 | ×2/×3/×3 with today's numbers → fixed below |

## Decision
**Adult proportions for every built-in character, frame 56 × 72.** Option A (keep chibi) is rejected: it fails D-19.
- **Target numbers (spike C+, male build; MA-42 re-measures them in the rig):** feet (sole) row 70, row 71 free for
  the outline; skull 14 × 15 (face 12, hairline → chin), neck 3 rows, chest → hip 17, hip → foot 30 (≈ 45 % of the
  figure), shoulders male 21 / female 17, neck width male 5 / female 3, arm upper 10 + fore 9 + fist 3 (reaches
  mid-thigh), stance (foot centres) male 13 / female 9, foot width male 6 / female 5. Crown ≈ row 6, standing figure
  ≈ 66 rows. Body axis x = 28 on a pixel boundary.
- **Build presets** on one skeleton. Female: hip 1 row higher, waist pinched 2 px per side at 60 % of the torso, hips
  equal to the shoulders, feet 1 px shorter. Male: broader shoulders, narrow hips, straighter waist. Contrapposto idle:
  hip 1 px out, the opposite shoulder 1 px down.
- **Face:** eyes ¼–⅕ of the face height; eye row ≈ 50 % of the face; iris 2 × 3 with the top row under a 1-px lid,
  one top-left highlight, sclera on the outer side only; brows 3–4 px with a 1-row gap (male inner end 1 px lower);
  a nose px left of the axis at ≈ 70 %; mouth 2–3 px at ≈ 82 %; jaw: male corner step then a 3-px chin, female taper
  to a 2-px chin + a lower-lip px; 2-row neck shadow; no blush outside `petted`.
- **Palette and outline:** a dark anchor ramp (darkest L ≤ 0.28) plus one saturated accent (C ≥ 0.12) per character;
  contour 3 tone steps darker than the fill (2 on the lit side); dark cloth gets an ink contour on the shadow side and
  a 2-step rim on the lit side; a hard shadow terminator. The «anime soft» ramps, manual AA and rim stay.
- **Frame width 56** is for the saya, haori sleeves, cloaks, tails and wide arms; the figure itself stays inside
  x ≈ 14–42. The shelf atlas is ≈ 1008 × 432 (18 × 6 cells, 105 frames).
- **Headroom:** row 0 transparent in every frame (gate). Rows 0–5 sit above the crown; the budget is «tallest extra
  above the crown (ears, hat, tuft) + happy apex + head lag ≤ 5 rows». If a character needs more (kitsune ears, witch
  hat), the frame grows by 4 rows on top (H 76, feet row 74, atlas 1008 × 456) — decided by the gate in MA-42 as the
  smallest fit, never by shrinking ears or hats. Owner: «it can be bigger if needed».
- **Sizing:** `scaleRef` = the standing figure, **66 for every built-in** (one value, so switching characters never
  changes the size, D-8). To keep three distinct sizes at 1080p / 125 % (work area ≈ 816 DIP = 1020 device px):
  `MAX_HEIGHT_FRACTION` **0.25 → 0.30** and the L preset **176 → 200 DIP** (S 96 and M 136 unchanged). Both are
  needed: with the clamp alone L still rounds to ×3 (176 × 1.25 / 66 = 3.33); with L alone the 0.25 clamp caps at ×3
  (255 / 66 = 3.86). Result:

  | display | S | M | L | max |
  |---|---|---|---|---|
  | 1080p / 125 % | ×2 (106 DIP) | ×3 (158 DIP) | ×4 (211 DIP) | 4 |
  | 1080p / 150 % | ×2 | ×3 | ×4 (clamp) | 4 |
  | 4K / 150 % | ×2 | ×3 | ×5 | 9 |
  | 1080p or 1440p / 100 % | ×2 | ×2 (collapses into S) | ×3 | 4 / 6 |

  M stays ≈ 3 cm on the owner's laptop (198 device px vs 192 today). One art pixel at M is ×3 instead of today's
  ×4, so fine detail reads coarser — the bigger frame carries the detail instead.
- **Unchanged:** all art by code (D-11), authored face masks, coloured outline + rim, light top-left, `front` + `q34`
  views (ADR 010), one atlas ≤ 1024² per character, roster D-18.
- **Ronin crown tuft (Q-D19-2):** a short tied crown tuft with an oxblood cord is allowed for `ronin` only — never a
  ponytail or a neat chonmage. The art-director re-checks Jin, Hanzo, Samurai Jack, Kenshin and Musashi at the ronin
  gate.

## Consequences
- Rig (MA-42…45, tests first): `RIG_W` 56, `RIG_H` 72, re-rest `REST` / `REST_Q34`, figure height, masks, validators,
  headroom gate and `scaleRef`; male/female build presets; elbow and knee joints; all 16 shared animations re-posed
  with timing and frame counts kept; all head masks and face libraries redone. The spike painter is a proportion
  reference only, not production code.
- `src/content/stage.ts`: `MAX_HEIGHT_FRACTION` 0.30, `SIZE_PRESETS_DIP.l` 200 (MA-42, with `presetScales` tests for
  the table above). `computeScale` code is unchanged. SPEC §3.3 updated.
- ADR 010 numbers revised: mirror axis x = 24 → **28**; the q34 stride (8 px) and `WALK_TRAVEL` (2 px/frame) scale
  with the leg (30 vs ≈ 18 rows) and are re-derived in MA-45. Head-steady, the 2-frame turn and `facing` stay.
- Gates: the headroom test, `validateFace` sizes and the arm-over-torso check are re-derived for 56 × 72.
- At 100 % scaling S and M are both ×2 (integer scale, `MIN_SCALE` 2); fine steps still work. Owner may accept it or
  ask for a different S/M split (open question in the plan).
- Memory: +0.37 MiB GPU/private per resident atlas (one on screen, D-8) — negligible vs 280 MB; the overlay window does
  not grow (ADR 007). Confirmed by `pnpm perf` per pack (CPU < 2 %, private ≤ 265 MB, cap 280).
- Carry-over: most rig opt-ins (cloak, scarf, fox tail, hat, apron, sash, prop, sleeve rules) and the master palette
  carry over; ramps get re-tuned for dark anchor + accent; opt-ins that no longer fit are deleted.
- Cost: every signed-off character (`maid`, `kitsune`, `goth`, `witch`) is redrawn; `ronin` is redesigned; `knight`,
  `coder`, `vampire` are built directly in the adult style. M-ART grows by Phase 3 (plan §«D-19»); SPEC §13 risk row.

## Note 2026-11-24 (MA-45, art-director motion round 1) — revises ADR 010 q34 rest for adult layouts
- Adult q34 far shoulder at the far chest half − 1 (male axis +5, female +4; was rest −2), its cap clipped by default,
  so the bodice covers it; legacy 48 × 56 keeps the ADR 010 numbers.
- Adult q34 rest / turn f1 feet near −3, far +3, far 1 row higher (legacy: ±1 on one row). Walk contact frames
  unchanged.
- Adult prop slot scale: ≈ 34–36 px, hilt 8, guard 2, hilt top ≥ row 36, trailing down-back ≈ 25° (validated).
- Adult long back hair ends at row ≈ 41 (mid-back); `hairScale` applies to width only.
- 2026-11-24 (MA-45 motion round 2): the adult hip prop is projected per view — q34 keeps the 35-px 25° trailing
  diagonal; front shows a 4–5 px hilt poking forward at the wearing hip and a near-vertical (≥ 70°) scabbard behind
  the same thigh, tip ≤ row 56, never crossing the axis, ≤ 3 px past the outline; turn f0 uses the front projection
  (`ADULT_PROP.front` / `.q34`, `Prop.hilt`; RIG.md «Layouts»).
