# Pixmates — UI Guide v0 (direction A "Pixel-native")

> Owner decision **D-26** (2026-11-28, `docs/SPEC-REVIEW.md` §7): the UI looks like part of the game. Pixel fonts for headings, notched 3-px borders, hard drop shadows, palette from the cast.
> Source: the spike `docs/design/ui-spike/a-pixel.html` (commit 770a015). Values below are taken from its CSS. Where this guide differs from the spike, **the guide wins** (marked *Δ spike*).
> Scope: chat bubble, MCP confirmation card, radial menu, first run, settings (SPEC §6.1, §6.8, §9). The Pixi stage draws no UI text. Tokens become CSS Modules variables (`tokens.css`) in the first milestone that ships styled renderer UI (M1 radial menu / M2 bubble).

## 1. Readability guardrails (non-negotiable)
1. **Rubik for all reading text.** Character speech, user messages, composer input, first-run greeting, settings titles and descriptions, notes, errors, the approval card body. Never a pixel font. *Δ spike: the spike sets the bubble, composer and hello bubble in Tiny5.*
2. **Pixel fonts only for short chrome:** headings, window titles, nav items, tabs, buttons, chips, field labels, tags, step numbers, `kbd`, big stat numbers. Keep it to one line and about 4 words or fewer. Longer text → Rubik.
3. **Monospace for exact identifiers and data:** tool names, server names, commands, JSON arguments, keys, paths (`--font-mono` = Cascadia Mono). Never a pixel font: pixel glyphs blur `l`/`1`/`I` and `0`/`O`, and the user must approve exactly what they read. *Δ spike: `--font-mono` begins with Tiny5, and `.tool code` / `.server-name` are pixel.*
4. **Minimum sizes (CSS px = DIP):** body 15, chat 16, secondary text 13 (never 12), mono 13. Tiny5 ≥ 15. Press Start 2P only at 8 or 16 (its 8-px grid), and at 8 only for decoration whose meaning is also given in text or `aria-label`. *Δ spike: 7-px Press Start labels, 12-px smalls and 12-px JSON.*
5. **No faux bold on pixel fonts:** `font-synthesis: none` on Tiny5 and Press Start 2P, weight 400. Emphasis comes from size, colour or a tag. *Δ spike: `font-weight: 700` on Tiny5 headings, which the browser synthesises.*
6. **WCAG 2.2 AA in both themes.** Text ≥ 4.5 : 1, large text (≥ 24 px, or ≥ 18.66 px bold) ≥ 3 : 1. Control boundaries, focus rings and state indicators ≥ 3 : 1 against what is next to them (1.4.11). Check every pair in §2.4 again after any token change.
7. **Visible focus everywhere** (§4). Never `outline: none` without a replacement.
8. **State is never colour alone:** each state has an icon and/or a word (trace ✓/✗, the "changes data" badge, a disabled `auto` with a reason).

## 2. Tokens
### 2.1 Colour
Cast colours (same in both themes): `--lilac #7656c9` (witch) · `--fox #2f5aa6` (kitsune) · `--herb #3f7a3a` · `--menpo #c0392b` (ronin) · `--mustard #e0a52e` (coder) · `--steel #aeb7c4` (knight) · `--night #24304d` · `--skin #f3c9a8`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--page` | `#f2e8d5` | `#15121f` | window background |
| `--surface` | `#fffaf0` | `#221c33` | bubble, dialog, inputs |
| `--surface-2` | `#f4e7cf` | `#2c2542` | chips, cards, nav, footer |
| `--surface-3` | `#e8d6b4` | `#3a3156` | hover, user message, switch off |
| `--ink` | `#2a2238` | `#f4eeff` | text |
| `--ink-2` | `#5d536e` | `#b8acd6` | secondary text |
| `--line` | `#2a2238` | `#0b0912` | decorative frame (pixel box) |
| `--edge` *(new)* | `= --line` | `#7a6ea0` | boundary of interactive controls (inputs, switch, seg, chips) |
| `--shadow` | `rgba(42,34,56,.28)` | `rgba(0,0,0,.55)` | hard drop |
| `--accent` | `= --lilac` | `#a58cf0` | header bars, selected seg, bars |
| `--accent-ink` | `#fff` | `#15121f` | text on accent |
| `--accent-text` *(new)* | `#6548b8` | `#a58cf0` | accent used as text (preset cost) |
| `--accent-soft` | `#e6ddff` | `#3a2f63` | hover, selected card, notes |
| `--select` | `= --mustard`, ink `#2a2238` | same | current tab/nav, pressed chip, radial hover |
| `--ok` | `#2f6e2b` | `#7fd27a` | success text |
| `--danger` | `#b3261e` | `#ff8a7a` | danger text/badge (badge ink `#fff` / `#2a0d0a`) |
| `--danger-soft` | `#fbe1dc` | `#4a1f26` | |
| `--warn-soft` | `#fbefcf` | `#4a3a18` | approval card background |
| `--focus` | `#2a2238` *(Δ spike `#e0a52e`)* | `#ffd166` | focus ring |
| `--focus-on-accent` *(new)* | `#ffffff` | `#15121f` | focus ring inside accent/mustard bars |
| `--code-bg` / `--code-ink` | `#1d1830` / `#f4eeff` | same | JSON args, command lines |
| primary button | `--herb` / `#fff` (hover `#356a30`) | `#7fd27a` / `#10210e` | |

### 2.2 Type
`--font-body: "Rubik", "Segoe UI", sans-serif` · `--font-head: "Tiny5", "Rubik", sans-serif` · `--font-tiny: "Press Start 2P", monospace` · `--font-mono: "Cascadia Mono", Consolas, monospace`.

| Role | Font | Size / line-height | Where |
|---|---|---|---|
| display | Tiny5 | 30 / 1.1 | first-run step heading, settings section heading |
| stat | Tiny5 | 34 / 1.1, tabular | usage numbers |
| title | Tiny5 | 18–20 | window bar, character name (19), preset/gallery name |
| label | Tiny5 | 15–17 | buttons (16), chips, tabs, seg (15), nav (17), radial label (16) |
| tag | Press Start 2P | 8 uppercase, 1.4 | tags, step numbers, `kbd`, status pill |
| chat | Rubik 400 | 16 / 1.45 | messages in the bubble, first-run greeting (20) |
| body | Rubik 400/500/600 | 15 / 1.45 | settings row title (600), notes, approval body |
| secondary | Rubik 400 | 13 / 1.4 | row descriptions, traits, meta, timeout note |
| mono | Cascadia Mono | 13 / 1.5 | tool trace, JSON args, tool/server names, commands |

### 2.3 Spacing, borders, shadows
- Spacing scale (spike values, normalised): `--sp-1 3` · `--sp-2 6` · `--sp-3 8` · `--sp-4 12` · `--sp-5 16` · `--sp-6 24` · `--sp-7 32` px. Radius is always 0.
- **Pixel box** (`--b: 3px`): four zero-blur shadows give the notched corners. `box-shadow: 0 -3px 0 0 var(--line), 0 3px 0 0 var(--line), -3px 0 0 0 var(--line), 3px 0 0 0 var(--line)`. They take no layout space, so add `margin: var(--b)` where boxes touch. Small parts (labels, dots, step numbers) use 2 px.
- **Floating** (bubble, dialog, radial sub-panel): pixel box + hard drop `6px 9px 0 0 var(--shadow)`.
- **Selected card**: the pixel box in `--accent` + `6px 6px 0 0 var(--mustard)`.
- **Divider**: `3px dotted color-mix(in srgb, var(--ink) 25%, transparent)`.
- **Bars** (bubble head, window bar, app header): `--accent` fill, bottom `0 3px 0 var(--line)`.
- **Press**: `transform: translate(2px, 2px)`, 60 ms. Motion uses `steps()` where it reads as pixel motion (switch knob `steps(3)`, typing caret, thinking dots).
- **Forced colours** (Windows contrast themes): box shadows are not drawn. Under `@media (forced-colors: active)` every pixel box gets `outline: 3px solid CanvasText` and focus uses `Highlight`.

### 2.4 Contrast check (computed, v0)
Pass: ink/surface 14.6 (L) · 14.5 (D); ink-2/surface-2 5.9 · 6.8; ink-2/warn-soft 6.3 · 5.2; accent-ink/accent 5.3 · 6.7; `#fff`/herb 5.2; `#fff`/danger 6.6; ink/mustard 6.9; ok/surface 6.0; code-ink/code-bg 15.1; `--focus` dark/surface 11.4.
**Fail in the spike → fixed by tokens above:** light focus mustard on cream 2.1 (→ ink ring 14.6); focus on accent/mustard bars ≈ 1.5–1.9 in both themes (→ `--focus-on-accent`); dark `--line` as a control boundary on surface 1.2 (→ `--edge` 3.6 on surface, 3.2 on surface-2); lilac text on surface-2 4.35 (→ `--accent-text` 5.4). The new values still need a look on screenshots (O-3).

## 3. Components
- **Bubble** (chat renderer, beside the character): width 440 (460 tall), max-height = work area − 88, floating box, `--surface`. Header bar: name in Tiny5 19 + a status tag (`думає…` / `говорить`, Press Start 8 on mustard, paired with the character's `think`/`talk` pose) + icon buttons 30 × 30 (new chat, close) with `aria-label`. A stepped tail of 24 × 24 built from 6-px blocks points at the character; the renderer flips it to the side where the character stands. Messages Rubik 16. The user message is on `--surface-3` in a 3-px box, right-aligned, max 80 %. A streaming caret is shown while typing. The message list is `aria-live="polite"` and scrolls inside the bubble. Composer: input (Rubik 15, `--surface-2`, `--edge` box), accent send button, `kbd` hint.
- **Chip** (quick action): `--surface-2`, Tiny5 15, padding 4/9, gap 12. Hover `--accent-soft`; pressed/active `--mustard` + ink (`aria-pressed`). Label ≤ 4 words in uk and en; if the en label is longer, it wraps to a second chip row, never to a smaller font.
- **Tool-trace line**: one line per tool call, `--surface-2`, mono 13, `--ink-2`. Layout: `[icon] source · tool · state`. Icon: gear = built-in, plug = MCP. Tool name in `--ink`. States: `виконується…` → `✓ 0,4 с[ · авто|дозволено]` (`--ok`) or `✗ відмовлено` (`--danger`). Dark icon colour `#8fb4ff`.
- **MCP confirmation card** (inside the bubble, `role="group"` labelled by its title): `--warn-soft`, padding 12, pixel box.
  - Head: plug icon + "Дозволити дію?" (Tiny5 18) and the **"змінює дані" badge** on write tools: `--danger` fill + warn icon + text in Tiny5 15. *Δ spike: Press Start 8.*
  - Meta (`dl`, 2 columns): server and tool in mono 13, plus transport and locality in Rubik 13. Labels in Rubik 600 13, `--ink-2`. *Δ spike: 7-px Press Start labels.*
  - "Точні аргументи": the **full** JSON, never truncated or prettified away. `pre` in mono 13 / 1.5 on `--code-bg`/`--code-ink` in a 3-px box, `white-space: pre`, scrolling on both axes inside a max-height, `tabindex="0"` + `aria-label`.
  - Actions: primary "Дозволити раз" (herb), "Відмовити". There is no "always allow" for write tools. Initial focus goes to the card, not to "Дозволити". Esc = deny.
  - Rubik 13 note about the timeout. After a choice, the actions are replaced by a result line (✓ allowed once / ✗ denied).
- **Radial menu** (right-click on the character): 5 items on a 175-px radius around the character: change character, quiet mode, Pomodoro, settings, hide. Each item is a 54 × 54 icon box (`--surface`, icon 26) with a Tiny5 16 label on `--surface` in a 2-px box. A dotted ring (`repeating-conic-gradient`, masked to 3 px) sits at radius 159–162. Hover/focus/expanded: `--mustard`. The character sub-panel is a floating box of 72-px cells; the current one is `--accent-soft` + inset 3-px accent. While the menu is closed, active states (quiet until …, Pomodoro 25:00) show as mustard pills above the head. `role="menu"`, arrow keys move between items, Enter activates, Esc closes, focus returns to the character. Open animation 220 ms scale+fade.
- **Gallery card** (first run, settings): 4 columns, gap 14. `--surface-2`, name Tiny5 18, trait Rubik 13 `--ink-2`, idle sprite at an integer scale (`image-rendering: pixelated`). A radio input underneath (visually hidden). Checked = selected card recipe. Focus: ring offset 5 px.
- **Preset card** (provider, D-25): same recipe, 3 columns. Name Tiny5 20, cost Tiny5 22 in `--accent-text`, description Rubik 13. Tags: `free`/`ro` herb, `rec` mustard, `pricey` `#ffd6a8`/`#5c2a00`.
- **Settings window**: left nav 230 px, `--surface-2`, a 3-px right rule. Items are Tiny5 17 with an icon; the current one is mustard in a pixel box (`aria-current`). Body padding 22/30/30/34. **Section**: display heading, then rows. **Row**: title Rubik 600 15, description Rubik 13 `--ink-2`, control on the right, dotted divider between rows.
- **Switch**: 48 × 24 track (`--surface-3`, `--edge` box) and an 18-px knob. On = herb track with a white knob that moves 24 px in `steps(3)`. `role="switch"`.
- **Tool mode toggle off / ask / auto** (`вимк.` / `питати` / `авто`, en `off` / `ask` / `auto`): a segmented `radiogroup` on `--surface-2` with an `--edge` box and 3-px separators. Checked option = `--accent` + `--accent-ink`. For write tools `auto` is disabled (40 % ink + line-through). The reason ("лише для read-only tools") is shown as visible text linked by `aria-describedby`, not only in a `title`. *Δ spike: title only.*
- **Notes / tags / meters**: note = `--accent-soft` (`--warn-soft` for warnings) with an icon, Rubik 13. Meter = 15-px pixel box with 9/3-px stepped fill (herb day, fox month), a 3-px menpo cap mark.

## 4. States and a11y
- **Focus**: `outline: 3px solid var(--focus); outline-offset: 2px`. Cards and hidden-input controls use offset 5, segments −3 (inset). Inside accent or mustard surfaces use `--focus-on-accent`. Focus order follows the visual order. Every dialog traps focus and restores it on close.
- **Hover** = one step lighter surface (`--surface-3` or `--accent-soft`). **Selected / current** = mustard. **Disabled** = 40 % ink, default cursor, plus a reason when the user would wonder why.
- **Reduced motion** (`prefers-reduced-motion`, which follows the Windows animation setting): no radial scale animation, no thinking-dot bounce, a static caret. State changes stay instant and visible.
- **Text size**: layouts survive 200 % zoom and Windows text scaling without clipping. Bubble and settings scroll; chips wrap.
- **Language**: all strings are i18n keys (uk default, en). Check every component with the longer en strings.
- **Screenshots** for every component: light + dark theme × light + dark wallpaper, at 100 % and 125 %.

## 5. Fonts (bundled, offline, strict CSP)
- No Google Fonts or any remote font at runtime. The spike's Google Fonts link stays in the spike only.
- All three fonts are SIL OFL 1.1 and have Cyrillic subsets (Google Fonts metadata). The owner checked the Ukrainian glyphs `і ї є ґ ’` in the spike. Licences: `docs/art/LICENSES.md`.
- Plan (lead-developer, the first styled-UI milestone):
  - Rubik + Tiny5 from `@fontsource-variable/rubik` and `@fontsource/tiny5` (OFL-1.1, pinned; latin, latin-ext and cyrillic subsets only).
  - Press Start 2P has a Reserved Font Name, and subsetting or format conversion makes a Modified Version that may not use the name. So vendor the unmodified upstream `PressStart2P-Regular.ttf` from `google/fonts` (pinned commit), or drop the font (Q-1).
- CSP: add `font-src 'self'` to `PROD_CSP` and `DEV_CSP` (`tools/lib/csp.ts`; today `default-src 'none'` blocks fonts). Fonts must not be inlined as `data:` URIs: a `build.assetsInlineLimit` callback returns `false` for font files.
- Ship the OFL text of each font with the app (an About/licences view or `resources/licenses/`): Vite copies only the font files.
- Perf: fonts load only in the chat/settings renderers, never in the stage. `font-display: block` for pixel fonts (no fallback flash). Check with `pnpm perf` after wiring (expect no measurable idle change).

## 6. Open items
- **O-1 (spike follow-up):** the first-run privacy step leaves empty space (the right column `privacy-who` is shorter than the rows card). Rebalance in the real layout, for example a single column with the data-flow card below, or a taller rows card.
- **O-2:** pixel fonts at 125 % / 150 % scale land on fractional device px. Pick crisp sizes by screenshot (Tiny5 15/16/18/20/30, Press Start 8/16) and accept smoothing where integer px are impossible.
- **O-3:** new tokens `--edge`, `--focus`, `--focus-on-accent`, `--accent-text` are computed, not yet seen. Verify them on screenshots against the spike look.
- **O-4:** Tiny5 ships as a variable font (`wght`, `wdth` and other axes). v0 uses the default instance only. Decide whether a real heavier instance replaces size-only emphasis.
- **O-5:** the approval-card JSON max-height (proposed 240 px) and how a very long single-line value scrolls. Check against M-MCP evals with large arguments.
- **Q-1 — resolved 2026-11-28:** keep Press Start 2P, since the owner picked the A look as shown. Ship the unmodified upstream TTF (pinned `google/fonts` commit, no subsetting or conversion), so the Reserved Font Name stays usable. Rubik and Tiny5 come from fontsource packages, bundled locally (no runtime CDN).
- **O-6:** tail and bubble placement near screen edges and the taskbar (bubble flips sides with the character, SPEC §6.1). Settle this in the M2 bubble plan.
