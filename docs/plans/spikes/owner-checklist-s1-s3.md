# Owner checklist — S1 (modes A/B) and S3 (compat mode)

Run each block on the owner's machine at 125 % and again at 150 %, with DevTools closed.
**Close `pnpm dev` first**: it holds `Ctrl+Alt+P` and the default-profile lock. Each command below uses its own profile.
Commands are for PowerShell, run from `C:\Oleg\Work\Portfolio\pixmates-spike-s1`. Build once with `pnpm dist:dir`; it is already built at the time of writing.
Quit each run from the tray ("Вийти"), not from Task Manager.

## Launch commands
| Mode | Command |
|---|---|
| A idle | `& .\release\win-unpacked\Pixmates.exe --user-data-dir="$env:TEMP\pm-owner-a" --window-mode=a` |
| B idle | `& .\release\win-unpacked\Pixmates.exe --user-data-dir="$env:TEMP\pm-owner-b" --window-mode=b` |
| A walk | `& .\release\win-unpacked\Pixmates.exe --user-data-dir="$env:TEMP\pm-owner-a" --window-mode=a --scenario=walk --walk-delay-ms=5000 --walk-duration-ms=60000` |
| B walk | `& .\release\win-unpacked\Pixmates.exe --user-data-dir="$env:TEMP\pm-owner-b" --window-mode=b --b-driver=raf --scenario=walk --walk-delay-ms=5000 --walk-duration-ms=60000` |
| A compat | add `--compat-mode` to the A idle / A walk lines |
| B compat | add `--compat-mode` to the B idle / B walk lines |

The walk starts 5 s after launch, goes 1000 DIP left and back for 60 s, then stops.

## Click-through (C) — run in A, then B (idle, layer "Поверх усіх вікон")
Place the character over each target. Check the transparent area right next to the body (not just far away) and the body itself.
- [ ] C1 Browser: left click on a link under the transparent area opens it; right click opens the browser context menu; the wheel scrolls the page.
- [ ] C2 Browser: hovering a link/button under the transparent area shows its tooltip or hover state.
- [ ] C3 Explorer: click selects a file; right click shows the context menu; the wheel scrolls; hover shows the file tooltip.
- [ ] C4 Taskbar (character dragged down onto it): click opens the app; right click shows the jump list; hovering shows the thumbnail preview.
- [ ] C5 On the body (opaque pixels): click and right click do **not** reach the window below. The cursor stays normal and nothing flickers when moving body ↔ transparent area.
- [ ] C6 Over an elevated window (Task Manager "Run as admin"): note what happens. `forward` is known to break at a higher integrity level; that is a Windows limitation, so just record it.

## Drag (D) — A and B
- [ ] D1 Open Notepad and keep typing. Drag the character with the mouse while typing: the caret stays in Notepad and no keystrokes are lost.
- [ ] D2 The drag follows the cursor 1:1. **B note:** spike B follows a 15 ms main-process timer, so a little lag is expected. Describe how much ("none / slight / annoying").
- [ ] D3 Drag over the taskbar and over a fullscreen window (F11 browser): the character stays visible and does not steal focus.
- [ ] D4 A press without moving counts as a click: nothing moves.

## Walk smoothness (W) — A walk, B walk, at 125 % (then 150 %)
- [ ] W1 Watch the full 60 s. Is there visible stutter, judder or tearing? Compare A vs B side by side if you can (one after the other).
- [ ] W2 B only: does the sprite blur, flicker, or does the window grow or jump at the turn-around points?
- [ ] W3 Score each mode: smooth / slight hitches / visibly jerky.

## Layer toggle (L) — tray menu, A and B
- [ ] L1 "Лише на робочому столі": the character goes under other windows, does not come forward on click/drag, and is visible after Win+D and with all windows minimised.
- [ ] L2 Back to "Поверх усіх вікон": it sits above windows and the taskbar again. `Ctrl+Alt+P` hides and shows it.

## Transparency (T) — S3, iGPU (no dGPU on this machine)
- [ ] T1 Default mode, A and B: the background around the character is fully transparent (the desktop shows through), not black or grey, both over a light and a dark wallpaper.
- [ ] T2 Same with `--compat-mode`, A and B.
- [ ] T3 A compat walk: note whether the fan spins up or the laptop feels busy. The agent measured ~16 % CPU; B compat walk measured 0.6 %.

## Record
For each item: pass / fail + a one-line note, separately for A, B and compat, at 125 % and 150 %. Then confirm (or reject) the RAM budget proposal in ADR 007.
