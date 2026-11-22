# Pixmates — Working Context

> Living map for AI agents and humans. Goal: orient in a new session without re-reading code or the whole SPEC.
> Keep it terse and current. Update in the same commit that changes structure, systems, commands, or decisions.
> Last updated: 2026-11-22 (SPEC v1.1, ADR 001–006, AI tooling scaffolded; no code yet)

## 1. Status
- Phase: **M0 🚧** — M0-01…M0-08 implemented on `feat/m0-scaffold`, reviewed (code + security) and accepted by qa-lead 2026-11-22; owner visual check ✅ 2026-11-22 (transparency, click-through, drag without focus, tray incl. layer + size); first CI run green (PR #1); spikes M0-09 done 2026-11-23 (`docs/plans/spikes/`: S1 windows, S2 SQLite, S3 GPU; code on branches `spike/s1-windows`, `spike/s2-sqlite`, never merged); M0-10: ADR 007 (overlay A, budget private ≤ 280 MB — A measures 250 MB) and ADR 008 (`node:sqlite`) accepted, `--compat-mode` flag added. SPEC v1.6, decisions D-1…D-12 in `docs/SPEC-REVIEW.md`.
- Next: M0 plan approved — `docs/plans/2026-11-22-m0-scaffold.md` → scaffold + spikes (window strategy → ADR 007, SQLite driver → ADR 008, GPU transparency, drag without focus, idle RAM/CPU).
- Owner decisions: name **Pixmates** (D-1); Windows 11 only (D-2); Dev companion in v1, M4 (D-3); 10 original characters on a modular rig, no default Domovyk (D-4); AI SDK (D-5); window strategy by spike (D-6); public repo (D-7); **one active character on screen, switchable (D-8)**; layer toggle on-top / desktop-only, hotkey `Ctrl+Alt+P`, appId `io.github.oleg-baltarovych.pixmates`, fuses from M0 (D-9); default size ≈ 3 cm / 136 DIP with S/M/L + fine steps, integer physical scale, very detailed art (D-10); all art by code with max-quality techniques (SPEC §5.2); M-ART spike picks frame 48/64 + style direction → ADR 009 (D-11).
- Repo: public `github.com/Oleg-Baltarovych/pixmates` (D-7), branch `main`, commits from the GitHub noreply address (repo-local `user.email`). `.gitattributes` forces LF. Local folder is still `Domovyk/` — rename to `pixmates/` when convenient (git does not care).
- MVP for portfolio = M0 + M-ART + M1 + M2 (SPEC §12).

## 2. Repo map (SPEC §11; ✅ = exists)
```
src/
  core/ ✅     pure behavior (M0: types, rng, step, scale): engine, states, priorities, physics, mood, throttle, focus, activities, switch, rng
  content/ ✅  data (M0: stage numbers, placeholder): characters/<id>/{persona,lines.uk,lines.en,activities}, reactions (thresholds, cooldowns)
  main/ ✅     (M0: index, windows/{secure,paths,manager}, ipc/handle, stage/controller, services/{hotkeys,tray,tray-menu}, i18n, dev/capture) app, windows, sensors, scheduler, ai/{service,providers,tools,prompt,memory,budget}, dev/{hooks-endpoint,mcp-server,git},
               characters/{registry,importer,validator}, storage/{settings,db,migrations}, services/{hotkeys,tray,updater,autolaunch}
  preload/ ✅  stage, chat, settings (contextBridge only)
  renderer/ ✅ stage/ (Pixi), chat/ (React), settings/ (React)
  shared/ ✅   ipc.ts + ipc-channels.ts (zod-free names for preloads), app.ts, windows.ts, placeholder-art.ts, (zod contracts), types.ts, events.ts
  i18n/ ✅     locales (flat keys)/{uk,en}.json
assets-src/    palettes/, rig/, characters/<id>/, fx/   → `pnpm sprites` → resources/characters/<id>/ (generated, never edit)
tools/ ✅     perf.ts ✅, lib/csp.ts ✅, build-sprites.ts, eval.ts
evals/cases/   *.yaml
tests/ ✅     unit/{core,main,content,shared,ui}, e2e/, fixtures/{db,packs}
skins-local/   owner's personal packs — git-ignored, agents never write here
docs/ ✅       SPEC.md, SPEC-REVIEW.md, CONTEXT.md, AI-WORKFLOW.md, adr/ ✅, plans/, art/
.claude/ ✅    agents/, skills/, rules/, hooks/, settings.json
```

## 3. Systems (SPEC §12)
| System | Milestone | Status |
|---|---|---|
| scaffold, typed IPC, hardening, CI, `pnpm perf`, spikes | M0 | ✅ M0-01…10 (pending final qa-lead + merge of PR #1) — `src/main/windows/`, `src/shared/ipc.ts`, `src/core/`, `tools/perf.ts`, ADR 007/008 |
| master palette, rig, parts generators, `maid`/`kitsune`/`robot`, FX | M-ART | — |
| core state machine, physics, activities, cursor, drag/fling, window surfaces, character switch, tray | M1 | — |
| AIService (AI SDK), providers, `{say, emotion, action}`, tools, memory, budget, evals | M2 | — |
| sensors, quiet mode, reactions + throttle, Pomodoro, reminders, +3 characters | M3 | — |
| Dev companion: hooks endpoint, MCP server, git/CI | M4 | — |
| pack/GIF import, settings, uk/en, +4 characters (all 10) | M5 | — |
| NSIS, auto-update, autolaunch, e2e smoke, README, release | M6 | — |
Legend: — not started · 🚧 in progress · ✅ done (link key files when done).

## 4. Key decisions (details in `docs/adr/README.md`)
- Electron, Windows-only v1, platform code behind interfaces (001).
- Pure deterministic behavior core in `src/core`, effects interpreted by main, own state machine (002).
- LLM via Vercel AI SDK 7; structured `{say, emotion, action?}`; templates first, LLM optional; evals (003).
- Built-in characters from a modular rig (frame size 48/64 decided at M-ART, detail-first — D-10), art by code, art-director gate; 3 → 6 → 10 (004).
- Original characters only; personal packs in git-ignored `skins-local/` (005).
- Dev companion: localhost hooks endpoint + MCP server, off by default, token + Origin checks (006).
- Window strategy: overlay on the work area (A); RAM budget = private-bytes sum avg ≤ 280 MB, WS reported only (007). SQLite: built-in `node:sqlite` behind `storage/db.ts`, better-sqlite3 as fallback (008).

## 5. Gotchas
- `ELECTRON_RUN_AS_NODE=1` is set in shells spawned by VS Code/Claude Code: `electron-vite dev` then starts Electron as plain Node. Run `env -u ELECTRON_RUN_AS_NODE pnpm dev` there. The packaged build ignores it (RunAsNode fuse off — verified).
- `electron@45` has **no install script**: `pnpm install` does not fetch the binary; the first `require('electron')` (pnpm dev) downloads it, or `pnpm exec install-electron`. CI does not need it (electron-builder downloads its own zip). `allowBuilds` only denies `electron-winstaller` (Squirrel 7-Zip picker, unused).
- Preloads: with `type: module` electron-vite 6 emits ESM `.mjs` preloads, which sandboxed preloads cannot load → config forces `format: 'cjs'`, `[name].cjs`, `isolatedEntries`, `externalizeDeps: false`. Preloads import channel names from `shared/ipc-channels.ts` (zod-free; importing `ipc.ts` inlined ~160 kB of zod into each preload).
- `screen`, `Tray`, `globalShortcut` only after `app.whenReady()`; StageController reads display metrics lazily (guard test).
- Stage renderer subscribes to `onScale` before any `await` (main pushes on `did-finish-load`, which can beat Pixi init).
- Vite dep pre-bundling on first dev run triggers a full reload; `optimizeDeps.include` lists pixi/react to avoid it.
- Renderer pages load from the privileged `app://renderer/<role>/index.html` scheme (`windows/app-protocol.ts`: registered before ready, `protocol.handle` after; only files inside `out/renderer` with a known MIME type), never `file://`. The IPC sender check expects these URLs; CSP `'self'` = `app://renderer`. Fuses `GrantFileProtocolExtraPrivileges` off, `EnableCookieEncryption` on (read back from the exe). The URL parser folds `..` at the root, so traversal lands inside `out/renderer` (404).
- Lifecycle goes through `app/lifecycle.ts` (`registerLifecycle`): `second-instance` is ignored before ready; display listeners are added in `ready` and removed by its teardown on `before-quit`. Packaged builds quit on `--remote-debugging-port`/`--inspect*` (`app/launch-guard.ts`; Chromium still opens the port for a moment before main quits).
- Single-instance lock is per userData: a running `pnpm dev` makes any other launch (packaged too) quit at once. Use `--user-data-dir=<temp>` for side-by-side runs; `pnpm perf` does that itself.
- `pnpm perf` memory verdict = **private-bytes sum, avg ≤ 280 MB** (ADR 007); working-set sum avg/p95 is printed alongside (double-counts shared pages, ~350 MB in every mode).
- Spikes S1/S3: the overlay's GPU-process private memory scales with work-area size (124 MB vs 58 MB for a sprite-sized window). Main-process timers tick at 15.6 ms on Windows, so per-frame motion must be driven by renderer rAF. `setPosition` at 125 % drifts the window size (use `setBounds`). Pixi `maxFPS = 60` skips vsyncs on 60 Hz panels (M1: uncapped ticker + own throttle). `getGPUFeatureStatus()` is not a reliable WebGL/transparency signal; `capturePage` alpha proves page transparency, not desktop transparency. Compat mode + overlay walking ≈ 16 % CPU.
- S2: `node:sqlite` has no `transaction()` helper — `storage/db.ts` wraps BEGIN/COMMIT/ROLLBACK; no ExperimentalWarning in Electron 45; re-run the bench on each Electron major.
- Stage imports only named Pixi exports and inits with `skipExtensionImports: true` (no accessibility/DOM/events/filters bundle). Pixi events are not used: input is plain DOM listeners. Anything that needs a Pixi extension must import its `pixi.js/<ext>` init explicitly.
- Never screenshot the owner's whole desktop; use `pnpm dev -- --capture-stage=<dir>` for stage images.

- Electron ≥ 43 fixed the macOS overlay-throttling bug; on Windows some GPUs show black instead of transparency (electron#40515) → compat mode setting.
- `active-win` is deprecated → `get-windows` (ESM). `electron-store` 12 is ESM-only. `systeminformation` is CommonJS.
- `better-sqlite3` 13 ships N-API prebuilds but still needs asar unpack; try `node:sqlite` first (Electron 45 = Node 24).
- Playwright Test Agents do not support Electron → own `/e2e` skill with `_electron.launch()`.
- AI SDK moves fast: read `node_modules/ai/docs` (ai-sdk skill) before writing AI code.

## 6. SPEC section index (`docs/SPEC.md`)
§0 principles · §1 goals/non-goals, budgets · §2 stack · §3 architecture (3.1 windows, 3.2 IPC, 3.3 render budget) · §4 behavior (4.1 state machine + priorities + anti-spam, 4.2 physics/surfaces, 4.3 activities + cursor, 4.4 character switch, 4.5 mood) ·
§5 characters (5.1 pack format, 5.2 rig, 5.3 roster) · §6 AI (6.1 UX, 6.2 text + body, 6.3 providers, 6.4 tools, 6.5 prompt/memory/security, 6.7 evals) · §7 Dev companion · §8 non-AI features · §9 settings · §10 privacy & security · §11 structure · §12 milestones · §13 risks · §14 v1 acceptance.
