# Pixmates — Working Context

> Current state only; update it in the commit that changes structure, systems, commands or decisions.
> Finished narratives go to `docs/CONTEXT-HISTORY.md`.
> Last updated: 2026-11-27 (MA-30 review fixes: tray icon read/crop, stage partial-failure handling; next MA-31…33).

## 1. Status
- **M0 ✅** (spikes S1–S3 on unmerged `spike/*` branches). **M-ART 🚧** on `feat/m-art` (draft PR #4), plan `docs/plans/2026-11-23-m-art.md`. SPEC v1.15. MVP for the portfolio = M0 + M-ART + M1 + M2.
- **Art direction (D-20, ADR 012; supersedes D-19 / ADR 011):** chibi, frame **48 × 56** with headroom, «anime soft» (ADR 009), `scaleRef` 48, clamp 0.25 + L 176 DIP (S/M/L ×3/×4/×5 at 1080p/125 %, ×2/×3/×4 at 100 %). Views `front` + `q34` (ADR 010).
- **Roster v1 = 8 (D-18):** signed off — `maid`, `kitsune` (fox-girl ninja; originality re-check MA-28r pending), `witch`, `goth` (stern face, MA-64), `ronin` (armoured samurai, red menpō with a black dragon, MA-65), `coder` (stern, black `cloth_onyx` hoodie with the hood always up, steel glasses, mustard hood edge + drawstrings + badge `>_`, badge on a steel chain, D-21, MA-66; open polish: hood shade edge on dark needs a per-part outline opt-in → MA-69), `knight` (D-22, MA-67), `vampire` (MA-68, D-23: variant A + C's fan collar + a widow's peak; only user of `back: 'cloak'` + `neckAcc: 'collar'`; `cloth_midnight`; as built `docs/art/vampire.md` §9; tests `vampire.test.ts`, `vampire-palette.test.ts`). Costume richness passes for maid/kitsune/witch after M1 (Q-D20-2).
- **MA-67 knight ✅ (owner sign-off 2026-11-27 after AD round 1, D-22):** variant B (owner pick 2026-11-27) — human chibi in full `metal_silver` plate, great bascinet with a hounskull visor lowered per animation (`VISOR_DOWN_IN`, `Body.visor`, `Body.gauntlets`; rule `docs/art/knight.md` §1), mail camail + mail hem, `cloth_emerald` sash (baldric + panel) and eyes, sword at the hip; normal face. As built: `docs/art/knight.md` §7; tests `knight.test.ts`, `knight-palette.test.ts`.
- **MA-30 ✅ (agents; owner look at dev + packaged pending in MA-33):** the stage loads `pixmates.<id>` (default `maid`, `--character=pixmates.<id>` for the others; unknown id → default + warning; no valid pack → `[characters]` error, empty stage, no fallback art). Placeholder gone (`placeholder-art.ts`, `content/placeholder.ts`, `FRAME_HEIGHT_PX`, `placeholderScale`); the M0 core plays `idle_a`/`drag`; a click picks `happy`|`wave` in core but shows nothing on screen until M1 (main drops `PlayAnimation`). Tray icon = head crop of the active built-in's idle frame from the figure's top opaque row (≥ 32 art px, widened for ears/hats, shown at 16 DIP; `services/tray-icon.ts`), read contained + size-capped and checked against the registry's IHDR size (`CharacterPack.atlasSize`); any failure → empty icon + `[tray]` log. The stage keeps the actors that loaded and reloads only when the pack set changes. Packaged guard: `tests/unit/main/builtin-packs.test.ts` + CI layout check.
- **MA-69 ✅:** D-19 opt-in cleanup; polish opt-ins, each changing only its pack: coder hood outline + jeans seat, kitsune rose tail ribbon (`FoxTail.ribbon`, owner 2026-11-24), knight greaves / camail hem tone 1 / breastplate seam (`Body.greaves`, `head.hemTones`), vampire cloak taper (`Cloak.widths.taper`). Art-director re-gate of these pending.
- **Next:** MA-31…33 (spike removed, integrity + perf ×8, owner session). Art gates: other packs unchanged (`assets-src/sprites.lock.json`), ≤ 2 art-director rounds, owner sees round 1; every character checked against the whole lineup for look-alikes (D-21, ART-BIBLE §12 p. 5).
- Owner decisions D-1…D-23 (`docs/SPEC-REVIEW.md`): Windows 11 only; Dev companion in v1 (M4); one active character, switchable; layer on-top / desktop-only, hotkey `Ctrl+Alt+P`, appId `io.github.oleg-baltarovych.pixmates`; default ≈ 136 DIP, integer physical scale; all art by code. Post-v1 backlog: `golem`, `corsair`, `salamander`, `robot`, `glitch`.
- Repo: public `github.com/Oleg-Baltarovych/pixmates`; commits from the GitHub noreply address (repo-local `user.email`); LF via `.gitattributes`.

## 2. Repo map (SPEC §11; ✅ = exists)
```
src/
  core/ ✅     pure behavior (M0: types, rng, step, scale) → engine, states, priorities, physics, mood, throttle, focus, activities, switch
  content/ ✅  data (stage numbers incl. WALK_TRAVEL) → characters/<id>/{persona,lines.uk,lines.en,activities}, reactions
  main/ ✅     index, app/{lifecycle,launch-guard}, windows/{secure,paths,manager,app-protocol}, ipc/handle, stage/controller,
               characters/{registry,selection}, services/{hotkeys,tray,tray-menu}, i18n, dev/capture → ai/, dev/, storage/
  preload/ ✅  stage, chat, settings (contextBridge only)
  renderer/ ✅ stage/ (Pixi), chat/ (React), settings/ (React)
  shared/ ✅   ipc.ts + ipc-channels.ts (zod-free names), pack.ts (manifest schemas, facingOf), anim.ts, app.ts, windows.ts
  i18n/ ✅     locales/{uk,en}.json (flat keys)
assets-src/ ✅ palettes/master.json, lib/ (art lib), rig/, characters/<id>/, fx/, spike/, packs.ts, sprites.lock.json
               → `pnpm sprites` → resources/{characters/<id>,fx}/ (generated, git-ignored, never edit)
tools/ ✅      build-sprites, sprites-sheet, sprites-lock, sprites-compare, rig-contrast, perf;
               lib/{png,sprites,sprite-outputs,sprite-compare,canvas,cli,git-tree,csp}.ts; eval.ts (M2)
tests/ ✅      unit/{core,main,renderer,shared,lint,art,tools}, fixtures/ → e2e/ (M6)
docs/ ✅       SPEC.md, SPEC-REVIEW.md, CONTEXT.md, CONTEXT-HISTORY.md, AI-WORKFLOW.md, adr/, plans/, art/ (ART-BIBLE, RIG, <id>.md)
skins-local/   owner's personal packs — git-ignored, agents never write here
.claude/ ✅    agents/, skills/, rules/, hooks/, settings.json
```

## 3. Systems (SPEC §12)
| System | Milestone | Status |
|---|---|---|
| scaffold, typed IPC, hardening, CI, `pnpm perf`, spikes | M0 | ✅ `src/main/windows/`, `src/shared/ipc.ts`, `src/core/`, `tools/perf.ts`, ADR 007/008 |
| palette, rig, 8 characters, FX, pack pipeline, stage loads packs | M-ART | 🚧 8/8 signed off, stage loads packs (MA-30); MA-31…33 left; `assets-src/`, `tools/build-sprites.ts`, `src/shared/pack.ts`, `src/main/characters/`, `stage:characters` IPC, `docs/art/` |

Not started (scope in SPEC §12): M1 core behaviour, physics, surfaces, switch, tray · M2 AI service, tools, memory, evals · M3 sensors, quiet mode, reactions, Pomodoro · M4 Dev companion (hooks, MCP, git/CI) · M5 pack import, settings, uk/en · M6 NSIS, auto-update, e2e, release.

## 4. Key decisions (`docs/adr/README.md`)
- 001 Electron, Windows-only v1, platform code behind interfaces. 002 pure deterministic core, effects interpreted by main.
- 003 Vercel AI SDK 7, structured `{say, emotion, action?}`, templates first, LLM optional, evals.
- 004 built-in characters from a modular rig, art by code, art-director gate; roster capped at 8 (4 female, 4 male). 005 original characters only; personal packs in `skins-local/`.
- 006 Dev companion: localhost hooks + MCP, off by default, token + Origin checks.
- 007 overlay on the work area; RAM = private-bytes sum avg ≤ 280 MB. 008 `node:sqlite` behind `storage/db.ts` (better-sqlite3 fallback).
- 009 frame 48 + headroom, anime soft. 010 views `front` + `q34` (facing right, left = runtime mirror; q34 for `walk`, `turn`, M1 `run`, `climb`); manifest per-anim `facing`. 011 adult proportions — superseded by 012 (chibi 48 × 56, stern face option, mouth-mask slot, costume richness).

## 5. Gotchas
**Electron / app**
- `ELECTRON_RUN_AS_NODE=1` is set in VS Code / Claude Code shells: run `env -u ELECTRON_RUN_AS_NODE pnpm dev`. Packaged builds ignore it (RunAsNode fuse off).
- `electron@45` has no install script: the first `require('electron')` downloads the binary (or `pnpm exec install-electron`). `allowBuilds` only denies `electron-winstaller`.
- Preloads are forced to CJS (`[name].cjs`, `isolatedEntries`, `externalizeDeps: false`): sandboxed preloads cannot load ESM. They import channel names from zod-free `shared/ipc-channels.ts`.
- Vite pre-bundling reloads on the first dev run; `optimizeDeps.include` lists pixi/react.
- `screen`, `Tray`, `globalShortcut` only after `app.whenReady()`. The stage subscribes to `onCharacters` before any `await`.
- Pages load from `app://renderer/<role>/index.html` (never `file://`); `app://` reads go through `readContainedFile`; the characters host (`windows/app-protocol.ts`) serves only registered atlases, with CORS for `app://renderer` + the dev origin; CSP `img-src`/`connect-src` include `app://characters`. Fuses: `GrantFileProtocolExtraPrivileges` off, `EnableCookieEncryption` on.
- Lifecycle via `app/lifecycle.ts`; packaged builds quit on `--remote-debugging-port`/`--inspect*`. Single-instance lock is per userData: use `--user-data-dir=<temp>` beside a running `pnpm dev`.
- Overlay GPU memory scales with work-area size. Main timers tick at 15.6 ms → per-frame motion via renderer rAF; `setBounds`, not `setPosition`, at 125 %; Pixi `maxFPS = 60` skips vsyncs (M1: own throttle). Black instead of transparency on some GPUs (electron#40515) → `--compat-mode` (+ walking ≈ 16 % CPU).
- Stage: named Pixi imports, `skipExtensionImports: true`, plain DOM input; canvas = exact device-pixel box (`device-pixel-content-box`). Check scales with `pnpm dev -- --character=pixmates.<id> --force-device-scale-factor=1|1.25 --capture-stage=<dir> --user-data-dir=<temp>` (the dev box is natively 125 %; `stage-capture.json` sizes are device px). Never screenshot the whole desktop.
- `node:sqlite` has no `transaction()` (wrapped in `storage/db.ts`). Use `get-windows` (not `active-win`); `electron-store` 12 is ESM-only. Read `node_modules/ai/docs` before AI code.

**Art tooling**
- `pnpm sprites [<id>…]` (deterministic; `pnpm build` runs it; validates manifests; does not prune stale pack dirs). `pnpm sprites:sheet [<id>] [--review|--fx|--real|--lineup|--swatch]`, `pnpm sprites:preview` (real-size APNGs, mirrored for `facing` ≠ front) → `reports/sprites/`. Dev flags `--character=<id>`, `--anim-cycle`, `--art-lineup`. `pnpm perf -- --character=spike-maid-64soft`.
- **Fingerprint:** `assets-src/sprites.lock.json` = SHA-256 per output file; `pnpm test` fails, naming the pack, when a pack drifts. Intended change → `pnpm sprites:lock`, commit the lock diff. No hand SHA-256 checks.
- **Before/after:** `pnpm sprites:compare <id> [--base <ref>] [--frames anim[:frame],…]` → `reports/sprites/<id>-compare-x{1,4,10}.png`. Don't write throwaway review scripts. Old and new rows of an unchanged pack are byte-identical; if they look different, the image viewer is downscaling the sheet (judge at x1 or crop).
- `node tools/rig-contrast.ts [<body id>]` = arm-over-torso numbers (also in `rig.test.ts`). `python3` is the Windows Store stub — use `python`. Long bash heredocs with template literals fail to parse here: write the script with the Write tool.
- `pnpm dev` / `dev:cycle` / `dev:lineup` run `pnpm sprites` first (≈ 3 s for all packs, under the plan's 5 s cache threshold: no input-hash cache). `extraResources` ships `pixmates.*/**` only.
- Spike packs (`spike-*`) are listed only unpackaged (or `--perf-spike`); never shipped.

**Rig rules** (full catalogue: `docs/art/RIG.md`; per-task notes in CONTEXT-HISTORY)
- Determinism: `assets-src/` uses seeded hashes, integer math and + − × ÷ / sqrt only (no sin/cos/pow into output).
- Code map: `rig/compose.ts` (renderer + `createRigPack`), `rig/validate.ts`, `rig/chains.ts`, `rig/passes.ts`, `rig/part-ids.ts` (`PART_ID`), `rig/views.ts`, `rig/faces/stern.ts`. Opt-in tests on dummies: `tests/unit/art/rig-optins.test.ts`.
- Masks are stamped over procedural parts: raised hands stay outside the head mask (x ≤ 10 / ≥ 38). Seam closer fills enclosed gaps ≤ 3 px and the outline is 4-neighbour → notches must be ≥ 3 px and open. Keep ≥ 1 skin row between fringe tips and the lash. `computeScale` clamps on `refH`.
- q34: per-frame `PoseFrame.view`/`headView` is the only view source; manifest `facing` = `animFacing()`; a body without `views.q34` fails when a pose uses q34. Walk is q34 only, planted foot slides 2 px/frame = `WALK_TRAVEL` (20 native px/s — M1 must travel at exactly this). q34 head must not jut ahead of the torso.
- Stern face (`face.style: 'stern'`): `validateFace` → `sternProblems`; blush only on happy + petted; an emotion eye must break the lid (lid off the iris or ≠ 3–4 iris rows). The kit's open mouths use trim `t` as the interior — override them when the body's trim slot is not a mouth tone (coder: mustard → rose `f`). Headwear/glasses in a head mask: face parts stamp over the head, so keep every expression part off the frame px (coder test).
- Hood / no back hair: an empty authored `masks.hairBack` (`{ mask: [], at: [0, 0] }`) suppresses the procedural back-hair mass (coder, both views).
- The outermost px of a figure is the rig outline: `silhouetteOutline` tones apply per ramp to the whole body, so a mask cannot retone it locally. Rim light runs after the locked tones and lifts the inner px on right-facing edges by +2. To get a lighter shade-side edge on one part (the coder hood), author that px 2 steps under the target.
- `Body.torsoMask` stamps on every non-arm px (empty ones too): a flat authored chest (coder) beats cloth dither on a 12-px torso; frame row = figure row + 8. Mouth mask (`Body.mask`): `mouthMaskProblems`; review bodies `rig-dummy-stern`, `rig-dummy-masked`.
- Visor (`Body.visor`, D-22): state per animation frame (`downIn`), not per expression; lowered = no face parts, the down mask must cover every head skin px, slit glints per expression. Author visor masks in head-mask coordinates (`at` = the head's `at`). Never with `Body.mask`.
- Collar (`neckAcc: 'collar'`, R-V2 `COLLAR_MAX`): per frame ≤ 27 × 9, cols inside 11..37, top under the open eyes — head bob and idle sway count. `Cloak.lining.inset` keeps the gold corners off the silhouette edge.
- Open: `legRim` px are not locked (outline/AA retone 418 witch px; locking = visible witch change).

## 6. SPEC section index (`docs/SPEC.md`)
§0 principles · §1 goals/non-goals, budgets · §2 stack · §3 architecture (3.1 windows, 3.2 IPC, 3.3 render budget) · §4 behavior (4.1 state machine + priorities + anti-spam, 4.2 physics/surfaces, 4.3 activities + cursor, 4.4 character switch, 4.5 mood) ·
§5 characters (5.1 pack format, 5.2 rig, 5.3 roster) · §6 AI (6.1 UX, 6.2 text + body, 6.3 providers, 6.4 tools, 6.5 prompt/memory/security, 6.7 evals) · §7 Dev companion · §8 non-AI features · §9 settings · §10 privacy & security · §11 structure · §12 milestones · §13 risks · §14 v1 acceptance.
