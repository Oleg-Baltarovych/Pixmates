# Pixmates — Working Context

> Living map for AI agents and humans. Goal: orient in a new session without re-reading code or the whole SPEC.
> Keep it terse and current. Update in the same commit that changes structure, systems, commands, or decisions.
> Last updated: 2026-11-22 (SPEC v1.1, ADR 001–006, AI tooling scaffolded; no code yet)

## 1. Status
- Phase: **pre-M0**. SPEC v1.2 after review (`docs/SPEC-REVIEW.md`, decisions D-1…D-7). AI tooling in `.claude/` (adapted from Cossack Kin). No `package.json` yet.
- Next: M0 plan via `/plan M0` → scaffold + spikes (window strategy → ADR 007, SQLite driver → ADR 008, GPU transparency, drag without focus, idle RAM/CPU).
- Owner decisions: name **Pixmates** (D-1); Windows 11 only (D-2); Dev companion in v1, M4 (D-3); 10 original characters on a modular rig, no default Domovyk (D-4); AI SDK (D-5); window strategy by spike (D-6); public repo (D-7); **one active character on screen, switchable (D-8)**.
- Repo: public `github.com/Oleg-Baltarovych/pixmates` (D-7), branch `main`, commits from the GitHub noreply address (repo-local `user.email`). `.gitattributes` forces LF. Local folder is still `Domovyk/` — rename to `pixmates/` when convenient (git does not care).
- MVP for portfolio = M0 + M-ART + M1 + M2 (SPEC §12).

## 2. Repo map (planned, SPEC §11; ✅ = exists)
```
src/
  core/        pure behavior: engine, states, priorities, physics, mood, throttle, focus, activities, switch, rng
  content/     data: characters/<id>/{persona,lines.uk,lines.en,activities}, reactions (thresholds, cooldowns)
  main/        app, windows, sensors, scheduler, ai/{service,providers,tools,prompt,memory,budget}, dev/{hooks-endpoint,mcp-server,git},
               characters/{registry,importer,validator}, storage/{settings,db,migrations}, services/{hotkeys,tray,updater,autolaunch}
  preload/     stage, chat, settings (contextBridge only)
  renderer/    stage/ (Pixi), chat/ (React), settings/ (React)
  shared/      ipc.ts (zod contracts), types.ts, events.ts
  i18n/        locales/{uk,en}.json
assets-src/    palettes/, rig/, characters/<id>/, fx/   → `pnpm sprites` → resources/characters/<id>/ (generated, never edit)
tools/         build-sprites.ts, perf.ts, eval.ts
evals/cases/   *.yaml
tests/         unit/{core,main,content,shared,ui}, e2e/, fixtures/{db,packs}
skins-local/   owner's personal packs — git-ignored, agents never write here
docs/ ✅       SPEC.md, SPEC-REVIEW.md, CONTEXT.md, AI-WORKFLOW.md, adr/ ✅, plans/, art/
.claude/ ✅    agents/, skills/, rules/, hooks/, settings.json
```

## 3. Systems (SPEC §12)
| System | Milestone | Status |
|---|---|---|
| scaffold, typed IPC, hardening, CI, `pnpm perf`, spikes | M0 | — |
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
- Built-in characters from a 32×32 modular rig, art by code, art-director gate; 3 → 6 → 10 (004).
- Original characters only; personal packs in git-ignored `skins-local/` (005).
- Dev companion: localhost hooks endpoint + MCP server, off by default, token + Origin checks (006).
- Pending: window strategy (007), SQLite driver (008) — M0 spikes.

## 5. Gotchas (known before code)
- Electron ≥ 43 fixed the macOS overlay-throttling bug; on Windows some GPUs show black instead of transparency (electron#40515) → compat mode setting.
- `active-win` is deprecated → `get-windows` (ESM). `electron-store` 12 is ESM-only. `systeminformation` is CommonJS.
- `better-sqlite3` 13 ships N-API prebuilds but still needs asar unpack; try `node:sqlite` first (Electron 45 = Node 24).
- Playwright Test Agents do not support Electron → own `/e2e` skill with `_electron.launch()`.
- AI SDK moves fast: read `node_modules/ai/docs` (ai-sdk skill) before writing AI code.

## 6. SPEC section index (`docs/SPEC.md`)
§0 principles · §1 goals/non-goals, budgets · §2 stack · §3 architecture (3.1 windows, 3.2 IPC, 3.3 render budget) · §4 behavior (4.1 state machine + priorities + anti-spam, 4.2 physics/surfaces, 4.3 activities + cursor, 4.4 character switch, 4.5 mood) ·
§5 characters (5.1 pack format, 5.2 rig, 5.3 roster) · §6 AI (6.1 UX, 6.2 text + body, 6.3 providers, 6.4 tools, 6.5 prompt/memory/security, 6.7 evals) · §7 Dev companion · §8 non-AI features · §9 settings · §10 privacy & security · §11 structure · §12 milestones · §13 risks · §14 v1 acceptance.
