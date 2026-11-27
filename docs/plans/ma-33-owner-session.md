# MA-33 owner session — checklist

> Plan: `docs/plans/2026-11-23-m-art.md` MA-33 (+ D-17/D-18 amendments). Real overlay, dev build, ≈ 15 min.
> After the session: verdicts below → ART-BIBLE v1, CONTEXT §1/§3, SPEC §5.2/§12, qa-lead acceptance.

## Setup (PowerShell, repo root)
```powershell
# Only in a VS Code / Claude Code terminal (they set it; Electron then runs as plain Node):
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```
Quote comma lists: PowerShell splits `a,b` into separate args. Close any other `pnpm dev` first (single-instance lock). Quit each run from the tray icon → Quit (or Ctrl+C).
Keep one light window (e.g. Notepad, light theme) and one dark window (Terminal) at hand to slide behind the cast.

## Runs
1. Female lineup (A–D = maid, goth, kitsune, witch):
   ```powershell
   pnpm dev -- "--art-lineup=maid,goth,kitsune,witch"
   ```
2. Male lineup (A–D = ronin, knight, coder, vampire):
   ```powershell
   pnpm dev -- "--art-lineup=ronin,knight,coder,vampire"
   ```
3. Solo + tray icon (repeat with any other id you want to see in the tray):
   ```powershell
   pnpm dev -- --character=pixmates.kitsune
   ```

A lineup loops each actor in place: `idle_a` ×3 → `turn` → `walk` facing right ×2 → `walk` mirrored, facing
left ×2 → `happy` (≈ 7 s per loop). Characters can be dragged; the default size is M.

## What to look at
| # | Check | Where |
|---|---|---|
| 1 | Readable at 1× (default M) over the light window and over the dark window: face, silhouette, outline | runs 1, 2 |
| 2 | Uniqueness: no two look alike (silhouette, colour mass, headwear) across all 8 | runs 1, 2 |
| 3 | Knight visor: down on `turn` and `walk`, up (face visible) on `idle_a` and `happy` | run 2, B |
| 4 | Travel both ways: `walk` right and the mirrored `walk` left read as the same character, feet stay put at the flip (no jump), one-sided details may swap sides (Q-D16-4) | runs 1, 2 |
| 5 | Tray icon at 16 px: head crop is recognisable, ears/hats not cut | run 3 |
| 6 | Kitsune tray icon: ears widen the crop to 33 art px, shown at 16 DIP (scale 33/16, not integer) — still crisp enough? | run 3 |

## Verdicts
| # | ✅ / ❌ | Notes (character, animation, what to change) |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |

Per character (sign-off on the real overlay):

| Character | ✅ / ❌ | Notes |
|---|---|---|
| maid |  |  |
| goth |  |  |
| kitsune |  |  |
| witch |  |  |
| ronin |  |  |
| knight |  |  |
| coder |  |  |
| vampire |  |  |

Overall MA-33 owner verdict: ______ (date: ______)
