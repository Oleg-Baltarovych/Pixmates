# 012. Return to chibi 48 × 56 with a stern-look face option and a mouth-mask slot

- Status: **Accepted** (owner decision D-20, 2026-11-25)
- Date: 2026-11-25
- Supersedes: **ADR 011** in full (frame 56 × 72, adult proportions and faces, `scaleRef` 66, clamp 0.30 + L 200 DIP).
  Restores ADR 009's frame, chibi proportions, eye rules and S/M/L table. ADR 010 is back to its own numbers
  (mirror axis x = 24, 8-px stride, `WALK_TRAVEL` 2 px/frame = 20 native px/s).

## Context
D-19 / ADR 011 re-rigged the characters as adults (56 × 72, ≈ 4.4 heads). After the adult ronin (MA-46, two art
rounds) the owner rejected it: «the adult versions are meh». He wants the CHIBI style back for all 8. The "kindergarten
kid" problem that started D-19 is answered differently: goth, ronin and coder get a **tougher look, "or just the
gaze"** — a harder face inside the chibi proportions. maid, kitsune and witch were signed off in chibi and stay. The
4 legacy packs never changed bytes during D-19 (every rig change was opt-in, SHA-256 checked).
Same day the owner added: ronin becomes an **armoured samurai** in black lacquer and red with a **lower-face mask
(menpō)** that is always on except in petted, happy and sleep; he talks with his eyes; and outfits in general must be
**more interesting** (layered, a signature piece, material contrast).

## Decision
1. **Chibi for every built-in character:** frame 48 × 56 (figure 48 × 48, feet row 46, 8 headroom rows), axis x = 24,
   `scaleRef` 48, ART-BIBLE §11.1–11.2 chibi proportions and eyes, anime soft (ADR 009). Atlas 1008 × 336.
2. **Stern look = a per-body face option** (`Body.face.style: 'stern'`, shared by goth, ronin, coder): a shared part
   kit in the rig (lid line that cuts the iris top, angled brows, set mouths, small highlight) plus validator rules
   (ART-BIBLE §11.9). Emotions must break the stern read; proportions do not change.
3. **Mouth-mask slot = a per-body rig option** (`Body.mask`, ronin's menpō; general): an authored mask over the lower
   face that hides the mouth rows, with `downExpressions` (expressions on which the mask hangs at the neck and the
   mouth shows). While the mask is up, `talk_a/b/c` differ by eyes and brows only (validated).
4. **Costume richness** is a style rule (ART-BIBLE §12): layered garments, one signature piece, material contrast,
   trims readable at 1×. Applies to the characters not yet signed off; maid, kitsune, witch stay as signed.
5. **Sizing back to the pre-D-19 numbers:** `MAX_HEIGHT_FRACTION` **0.25**, presets S 96 / M 136 / L **176** DIP
   (`computeScale` unchanged). With `scaleRef` 48:

   | display | S | M | L | max (0.25 clamp) |
   |---|---|---|---|---|
   | 1080p / 125 % | ×3 (144 px) | ×4 (192 px) | ×5 (240 px) | 5 |
   | 1080p / 150 % | ×3 | ×4 | ×5 (clamp) | 5 |
   | 1080p or 1440p / 100 % | ×2 | ×3 | ×4 | 5 / 7 |
   | 4K / 150 % | ×3 | ×4 | ×6 | 10 |

   (work area = height minus a 48-DIP taskbar; `presetScales` tests in MA-61 assert this table.)

   S/M/L are distinct everywhere, so the D-19 open question Q-D19-3 (S/M collapse at 100 %) is closed.

## What is kept from D-19 (general, works at 48 × 56)
Kept only if a chibi pack uses it by the end of the D-20 phase (plan MA-69), else deleted: `Prop.over`
(`'all' | 'hilt'`), `Body.kote`, `Body.tamoto`, `skirtSplit.notchHalf` / `skirtSplit.q34.clear`, `Cloak.hem.wisps`,
`Body.hakama`, `Body.despeckle`, front `Body.masks.hairBack`. `RigLayout` + `layoutOf` stay as the single source of
rig numbers with one layout (`LAYOUT_LEGACY`, renamed `LAYOUT`) — cheap, no byte change. Palette ramps added in MA-46
stay if used (`gem_garnet` stays — goth).

## What is removed (git history keeps it)
`LAYOUT_ADULT`, `Body.layout` / `Body.build`, `anims/adult.ts` (`animsFor` → `ANIMS`), `dummies-adult.ts`,
`rig-adult*.test.ts`, adult face rules in `validateFace`, `ADULT_PROP` (`front` / `q34` / `frontOver`), `adultSword*`,
two-segment limbs (`kneeOf`, `PoseFrame.knees`, `ARMS_ADULT`), `RigLayout.longHairTipRow` / `farArmStep` adult values,
`WALK_TRAVEL.adult` (back to one value), `pnpm sprites:sheet --adult`, the style spike `assets-src/spike/style/` +
`tools/style-spike.ts` + `reports/sprites/style-spike/`, `scaleRef` 66 and the 0.30 / 200 numbers in
`src/content/stage.ts` and their tests.

## Alternatives considered
- **Keep adult 56 × 72 and iterate** — rejected by the owner after two rounds.
- **SD-adult B (48 × 56, ≈ 3.2 heads)** — a third body plan; the owner asked for chibi, not a compromise.
- **Stern faces as separate per-character masks only** — works, but three characters would re-solve the same rules;
  a shared kit + validator keeps them consistent and testable.

## Consequences
- maid, kitsune, witch: sign-offs restored (D-20), packs byte-identical. goth: stern face + richness pass → re-sign-off.
  ronin: rebuilt in chibi as an armoured samurai. coder, knight, vampire: built in chibi as specced (coder stern).
- Rig: delete the adult layer (tests first: the 4 legacy packs + fx SHA-256 unchanged), add the stern kit + rules and
  the mask slot as opt-ins (unset = byte-identical).
- M1: one `WALK_TRAVEL` (20 native px/s); per-anim `anchor` / `facing` unchanged; no IPC, DB, i18n or core change.
- Memory/CPU: atlas back to 1008 × 336 (≈ 1.35 MB RGBA, one resident, D-8) — slightly below the adult budget.
