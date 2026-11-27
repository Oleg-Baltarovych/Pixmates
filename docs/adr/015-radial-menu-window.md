# 015. Radial menu: a lazy transparent React window, not Pixi on the stage

- Status: Proposed (M1 plan `docs/plans/2026-11-28-m1.md`; owner approves)
- Date: 2026-11-28

## Context
D-26 / UI-GUIDE §3: right-click on the character opens a radial menu (items on a 175-px radius, Tiny5 labels, Rubik
reason text, character gallery sub-panel, `role="menu"`, arrow keys, Enter, Esc, focus return, reduced motion). The
stage is a click-through, **non-focusable** overlay (ADR 007) whose renderer draws no UI text and loads no fonts
(UI-GUIDE §3, §5). Two hosts were considered: Pixi inside the stage, or a separate small window.

## Decision
A new window role **`menu`**: a transparent, frameless, **focusable**, always-on-top (`screen-saver`, raised above the
stage with `moveTop()`) window, ≈ 2 × (175 + 54 + margin) DIP square, centred on the character and clamped to the work
area. React 19 + CSS Modules + `tokens.css` (UI-GUIDE §2), bundled fonts. **Created on open and destroyed on close**
(Esc, blur, item chosen, click on its transparent area), like the settings window.
- Hardened `webPreferences` from `windows/secure.ts`; own preload `preload/menu.ts`; channels `menu:state` (event) and
  `menu:action` (send, zod union) — renderers stay untrusted, main validates and asks core.
- Items are laid out by a pure `radialLayout()` (shared) on the arc that fits inside the work area (the character
  usually stands on the taskbar, so the lower half is off-screen).

## Alternatives considered
- **Pixi on the stage:** no new process, but (1) keyboard a11y is impossible in a non-focusable window, and making the
  overlay focusable steals focus from the user's app; (2) text needs fonts or bitmap glyphs in the stage, against
  UI-GUIDE (no UI text, no fonts in the stage) and with no screen-reader semantics; (3) hit-testing must grow from the
  sprite alpha to menu boxes while click-through toggles per item; (4) every byte added to the always-alive stage is
  idle RAM.
- **React DOM layered over the stage canvas:** same focus problem; React + fonts resident in the stage forever.
- **Native context menu (`Menu.popup`)** — fast and accessible, but not direction A (no gallery, no pixel look);
  stays the tray's job.

## Consequences
- Positive: real focus, a11y and fonts; idle budget unchanged (no window while closed); the same tokens and fonts serve
  the M2 bubble and settings.
- Negative / trade-offs: a renderer process start on every open (≈ 150–300 ms, masked by the 220 ms open animation;
  measured in M1); a transparent window has the same black-background risk as the stage on bad GPUs (compat mode
  applies); a fourth window role in IPC, CSP and the protocol handler.
- Follow-ups: SPEC §3.1 (window list) and §3.2 (channels); if open latency > 400 ms, pre-warm the window hidden after
  the first use (costs idle RAM — owner decision).
