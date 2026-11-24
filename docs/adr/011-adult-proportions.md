# 011. Adult proportions for all built-in characters (frame B or C pending the spike)

- Status: Proposed (D-19, owner 2026-11-24; the one open parameter is the frame, B or C, picked by eye from the style spike)
- Date: 2026-11-24
- Supersedes: ADR 009's style rules on proportions and eyes; ADR 009's frame (48 × 56) only if C is chosen.
  ADR 009's «anime soft» shading, authored-mask faces and headroom rule stay.

## Context
At the `ronin` sign-off the owner said he looks like a kindergarten kid and decided (D-19) that every character must
be redone as an adult: «not childish, adult, tough characters», more samurai for ronin, all of them «cool».
The art-director traced it to the chibi proportions of D-13 / ADR 009 (ART-BIBLE §11.1–11.2): ≈ 2.0 heads, legs 13 %
of the height, arms ending at the waist, head 2.4× the shoulders, round baby face, eyes ⅓ of the face, blush, feet
together, pastel palette. Recolouring or a new costume does not fix that; the body plan has to change.
A style spike (`reports/sprites/style-spike/`: ronin-C, goth-C, ronin-B) is being built so the owner can pick by eye.

## Options
| | A — keep chibi, toughen details | B — «SD adult», 48 × 56, ≈ 3.2 heads | C — adult, 48 × 64, ≈ 4.5 heads (recommended) |
|---|---|---|---|
| Read | still a child: the owner's complaint stands | older and sturdier, still stylised; limbs short for a sword stance | adult silhouette: neck, shoulders, waist, long limbs |
| Frame / atlas | unchanged | unchanged (≈ 1008 × 336) | +8 rows: ≈ 1008 × 400, still ≤ 1024² |
| Rig | none | re-rest REST / REST_Q34, longer limbs; elbows/knees optional | re-rest + elbow and knee joints, male/female torso builds |
| Shared anims (16, 105 frames) | none | re-pose all, timing kept | re-pose all, timing kept |
| Faces / heads | tweaks | all redone (smaller head, eyes ¼–⅕) | all redone, more face rows per eye |
| Scale (1080p / 125 %) | ×3/×4/×5 | scaleRef ≈ 48–52, presets likely ×3/×4/×5 (re-measure) | scaleRef ≈ 58 → S ×2 / M ×3 / L ×4; S may be too small for face reads |
| Cost | ≈ 0, but fails D-19 | high | highest (≈ B + joints + frame change) |

## Decision
**Adult proportions for every built-in character** (A is rejected: it does not meet D-19). The frame — **B (48 × 56,
≈ 3.2 heads) or C (48 × 64, ≈ 4.5 heads)** — is chosen by the owner from the spike; this ADR becomes Accepted with
that choice written here. Rules shared by B and C:
- Anatomy: a neck; shoulders wider than the head; a waist; elbows and knees (joints in C, implied by shading in B);
  arms reaching mid-thigh; stance with feet apart. Male and female **build presets** (torso width, shoulder/hip ratio,
  waist) on the same skeleton.
- Face: eyes ¼–⅕ of the face height, 2–3 rows; visible brows; a nose shadow px; a jaw line; no blush outside `petted`.
- Palette: a dark anchor ramp plus one saturated accent per character; outline 3 steps darker than the fill;
  a hard shadow terminator (the «anime soft» ramps, manual AA and rim stay).
- Unchanged: all art by code (D-11), authored face masks, coloured outline + rim, light top-left, `front` + `q34`
  views (ADR 010), headroom rule (row 0 transparent), one atlas ≤ 1024² per character, roster D-18.

## Consequences
- Rig: re-rest `REST` / `REST_Q34` (C: with elbow and knee joints), male/female torso builds, all 16 shared
  animations re-posed with timing kept; all head masks and face libraries redone. Tests first for the rig.
- ADR 010 numbers revised (q34 stride 8 px and `WALK_TRAVEL` 2 px/frame scale with leg length; head-steady,
  mirror axis x = 24 and the 2-frame turn stay).
- Gates: the headroom test and `validateFace` sizes are re-derived for the new frame and eye sizes.
- Sizing: `scaleRef` per manifest changes; in C the presets drop one step (S ×2 / M ×3 / L ×4). S must pass a face-read
  check at real size, otherwise S is raised or removed (owner).
- Atlas: C ≈ 1008 × 400 (still one ≤ 1024² atlas), B unchanged. RAM impact negligible (one resident atlas, D-8) —
  confirm with `pnpm perf` (CPU < 2 %, private ≤ 280 MB).
- Carry-over: most rig opt-ins (cloak, scarf, fox tail, hat, apron, sash, prop, sleeve rules) and the master palette
  carry over; ramps get re-tuned for dark anchor + accent.
- Cost: every signed-off character (`maid`, `kitsune`, `goth`, `witch`) loses its sign-off and is redrawn; `ronin`
  is redesigned; `knight`, `coder`, `vampire` are built directly in the adult style. M-ART grows by one phase
  (plan §«D-19»); SPEC §13 risk row.
