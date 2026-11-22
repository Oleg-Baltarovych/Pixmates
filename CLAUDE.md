# Pixmates

Windows desktop companions: original pixel-art characters live on top of windows, walk the taskbar and window edges, react to the cursor, system state and Claude Code activity, help with focus, and talk in character through an LLM. Solo developer, portfolio-grade.
Source of truth: `docs/SPEC.md` (Ukrainian) + `docs/adr/`. Review history and owner decisions: `docs/SPEC-REVIEW.md`. Read only the section you need.

## Orientation (read this before exploring)
1. `docs/CONTEXT.md` — status, repo map, system status, decisions, gotchas, SPEC section index. Read it first; it replaces broad exploration.
2. Need a spec detail? Pick the section from the index in `docs/CONTEXT.md` §6, then `grep -n "^##" docs/SPEC.md` and read only that range.
3. Area rules load automatically from `.claude/rules/` when you touch matching files. Do not duplicate them here.
4. At the end of every task that changes structure, systems, commands or decisions — update `docs/CONTEXT.md` (keep it terse).

## Stack (fixed by SPEC §2; verify current versions at scaffold, never from memory)
pnpm · Electron 45 + electron-vite · TypeScript strict (`noUncheckedIndexedAccess`) · React 19 + CSS Modules (chat, settings) · PixiJS 8 (stage) ·
pure behavior core in `src/core` · Zustand (renderer view state) · zod (IPC, manifests, events, tools) · Vercel AI SDK 7 (Anthropic / OpenAI-compatible / Ollama) ·
`@modelcontextprotocol/server` · electron-store + SQLite · i18next (uk, en) · electron-builder (NSIS) · Vitest · Playwright `_electron` · ESLint + Prettier. Windows 11 only in v1.

## Commands
> Planned until M0 scaffold lands — keep this list in sync with `package.json` (`/sync-context`).
- `pnpm dev` — electron-vite dev (HMR for renderers, main restarts)
- `pnpm typecheck && pnpm test && pnpm lint` — must be green before reporting a task done
- `pnpm format` / `pnpm format:check` — Prettier
- `pnpm sprites` — rig + parts in `assets-src/` → `resources/characters/<id>/` sheets + manifest (deterministic, prints hashes); `pnpm sprites:sheet <id>` → contact sheet in `reports/sprites/`
- `pnpm eval [--provider mock|ollama|anthropic] [--case <glob>]` — LLM eval suite → `reports/evals/<date>/`; `mock` runs in CI
- `pnpm build` — production build; `pnpm dist` — electron-builder NSIS installer into `release/`
- `pnpm perf` — launches the packaged app, measures idle CPU/RAM over all processes (active character) → `reports/perf/<date>.md`; fails over budget (SPEC §1)
- `pnpm e2e` — Playwright `_electron` smoke on the built app
- `pnpm security` — `pnpm audit --prod --audit-level high` + Electron hardening checks

## Non-negotiable rules
- If a task conflicts with the SPEC — stop and ask. Behaviour/architecture changes go into `docs/SPEC.md` + an ADR (`/adr`).
- Stay inside the task scope and the current milestone (SPEC §12). No new dependency without stating why (in the commit/PR body).
- `src/core/` is pure, deterministic TypeScript: no Electron, Node built-ins, DOM, Pixi, React, sensor or AI packages; no `Date.now()`, `Math.random()`, timers. Time comes in as `now`, randomness from the seeded RNG.
- Behaviour numbers (thresholds, cooldowns, weights, durations) live in `src/content/`. No magic numbers in logic.
- Renderers draw and send input; they never decide behaviour. Every IPC message is a zod contract in `src/shared/ipc.ts`, validated in main.
- Electron hardening is fixed: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, strict CSP, no navigation / `window.open` / `webview`, `shell.openExternal` only for allow-listed https.
- AI tools are read-only or in-app actions. No shell, no process kill, no file writes. System data, window titles, clipboard, hook payloads and imported packs are untrusted text: they go into prompts only as delimited data with length limits.
- Local servers (hooks endpoint, MCP) bind to `127.0.0.1` only, with token auth and `Origin`/`Host` checks.
- Only original characters in the repo and builds (ADR 005). Never create or edit art, lines or personas of protected characters; never write to `skins-local/`.
- All user-facing text via i18n keys (`uk` default, `en` second). No string concatenation for plurals.
- No `any`, `@ts-ignore`, `as unknown as`, or non-null `!` without a one-line justification comment.
- Never read or edit `.env*` (except `.env.example`), certificates (`*.pfx`, `*.p12`, `*.p8`, `*.cer`), or API keys. Never edit `resources/characters/` (generated) or committed DB fixtures.

## Engineering principles
- Core logic: write the failing test first and see it fail for the expected reason. Skip test-first for wiring, Pixi scene composition, styling.
- Tests assert observable behaviour through public APIs. A test that would pass if every function returned nothing is deleted.
- Make illegal states unrepresentable (discriminated unions for behaviour states, effects, IPC messages, AI responses).
- Smallest change that solves the problem; prefer deleting to adding; redesign instead of bolting on.
- Bugs: reproduce with a test, fix the cause. A guard that only hides the crash is not a fix.
- Visual work is verified by looking at it (stage screenshots over light + dark wallpapers); performance by `pnpm perf`; LLM behaviour by `pnpm eval` — not by reading code.

## Git
- Branches `feat/*`, `fix/*`, `art/*`, `chore/*` from `main`; Conventional Commits; one logical change per commit/PR, referencing the milestone task ID / SPEC section.
- Never commit, push, force-push, or delete files/branches without the user's explicit approval in this session.

## Team & workflow (details: `docs/AI-WORKFLOW.md`)
- `architect` designs (plans in `docs/plans/`, ADRs, SPEC/CONTEXT) — never code. `lead-developer` implements approved plans.
- `test-writer` writes tests. `persona-designer` owns `src/content/` (characters, lines, reactions) and `evals/`. Read-only reviewers: `code-reviewer`, `electron-security-reviewer`, `ai-reviewer`, `ui-reviewer`, `art-director`. `qa-lead` gives final acceptance.
- Flow commands: `/feature` (plan → approve → implement → review → verify → accept) · `/plan` · `/implement` · `/review` · `/verify` · `/ship` · `/bugfix` · `/sync-context` · `/release-check` (pre-release only).
- Procedures: `/adr`, `/sprite`, `/new-character`, `/new-behavior`, `/ai-tool`, `/prompt-eval`, `/ipc-channel`, `/perf`, `/e2e`, `/db-migration`.
- Non-trivial work (new system, IPC contract change, DB schema change, new character, AI tool, local server) goes through a plan first. Small fixes may skip the architect.
