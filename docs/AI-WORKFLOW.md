# AI-assisted workflow

Pixmates is built with Claude Code, and the configuration is committed so the workflow can be reproduced and reviewed.
It is the third project in the same setup, after Applyra (web CRM) and Cossack Kin (pixel-art idle game). The layering and gates are the same. They are adapted to a desktop app with:
- a multi-process Electron architecture;
- a pure behavior core;
- characters as data;
- art judged by eye;
- an LLM layer verified by evals;
- local servers reviewed for security.

## Context layers (cheapest first)
| Layer | Loaded | Purpose |
|---|---|---|
| `CLAUDE.md` | every session (~70 lines) | non-negotiable rules, commands, where to look |
| `docs/CONTEXT.md` | on demand, read first | status, repo map, systems, decisions, gotchas, SPEC index |
| `.claude/rules/*.md` | automatically when matching files are touched | core, main, ipc, render, ui, ai, dev, content, characters, art, security, testing, release |
| `docs/SPEC.md` | only the section needed | product/engineering spec (source of truth) + `docs/adr/` |
| `docs/art/` | for visual work | art bible, palette, rig spec, references |
| `docs/plans/*.md` | per task | architect's implementation plan for one feature |
| `.claude/skills/*` | body loads only when invoked | flow commands and procedures |

Token budget rules:
- Agent descriptions are always in context, so each stays one sentence.
- Flow commands use `disable-model-invocation: true`, so they cost nothing until typed. The exceptions are `/review`, `/verify` and the procedures, because other flows call them as steps.
- Heavy work (`/release-check`, live `pnpm eval`) runs only on an explicit trigger.

## Team — who owns what
| Agent | Model | Access | Owns | Never does |
|---|---|---|---|---|
| `architect` | opus | read + write `docs/` only | plans, ADRs, SPEC/CONTEXT, process boundaries, IPC contracts, core state design, DB schema | application code |
| `lead-developer` | inherit | full (no git commit/push) | implementing approved plans across core/main/preload/renderer, screenshots, perf runs | redesign without the architect, commits |
| `test-writer` | sonnet | edits tests only, runs tests | test-first core logic, IPC contract tests, main-process logic, migrations, Electron e2e | production code |
| `persona-designer` | sonnet | edits `src/content/` + `evals/` only, runs `pnpm eval` | character personas, lines uk/en, activities, reaction thresholds/cooldowns, eval cases | logic, protected characters |
| `code-reviewer` | sonnet | read-only | core purity, process boundaries, effects, typed IPC, resource cleanup, types, tests | edits |
| `electron-security-reviewer` | opus | read-only (+ audit/grep) | hardening, IPC validation, pack import (zip-slip), local servers, `safeStorage`, supply chain, CI/release | edits |
| `ai-reviewer` | opus | read-only (+ `pnpm eval --provider mock`) | prompt injection, tool scope, data in prompts, budgets, structured output, persona consistency, eval coverage | edits |
| `ui-reviewer` | sonnet | read-only | chat/settings UX, i18n/plurals, a11y, states, Markdown safety | edits |
| `art-director` | opus | read-only (+ screenshots) | rig, sprites and characters on real wallpapers: silhouette, readability, palette, animation feel, originality | edits |
| `qa-lead` | sonnet | read-only + runs checks | final acceptance: every AC has code + a test, screenshot, eval or perf number; findings resolved | fixes |

The main session is the orchestrator, because subagents cannot spawn subagents. It routes work, enforces the gates (`/review` → `/verify` → `qa-lead`) and stops for user approval at plan and ship.

## Flow commands (`/name`)
| Command | When | Agents involved |
|---|---|---|
| `/feature <task>` | any non-trivial feature | architect → **you approve** → (test-writer) → lead-developer → (persona-designer) → reviewers → verify → qa-lead |
| `/plan <task>` | design only | architect |
| `/implement <plan>` | plan already approved | lead-developer → reviewers → verify → qa-lead |
| `/review [base]` | before verify/ship | only the reviewers matching the touched paths, in parallel |
| `/verify` | Definition-of-Done gate | none (typecheck/test/lint + eval mock, perf, screenshots when relevant + DoD) |
| `/ship [issue]` | commit + PR | verify → drafts → **you approve** → commit/push/PR |
| `/bugfix <bug>` | bugs | failing test (or reproducible screenshot) first → fix → review |
| `/release-check` | before a GitHub Release | security + code review, all checks, live evals, perf, installer smoke |
| `/sync-context` | after structural changes | none (refreshes `docs/CONTEXT.md`) |

Procedures (model-invocable, used inside flows):
- `/adr`
- `/sprite` — rig part / animation / FX → `pnpm sprites` → art review
- `/new-character` — parts, palette, persona, lines, signature activities, evals
- `/new-behavior` — activity, cursor interaction, system/dev reaction or character-switch transition → core + content + animation + test
- `/ai-tool` — zod schema, read-only, privacy flag, eval case
- `/prompt-eval`
- `/ipc-channel` — contract → preload → handler → test
- `/perf`
- `/e2e` — Playwright `_electron`
- `/db-migration`

## Efficiency rules (owner, 2026-11-25)
- **Fresh agent per task.** Start a new subagent with a short brief (goal, files, gates, what is ruled out) for each task. Resume an existing agent only for a short follow-up on the same task; never carry one agent across many tasks (context bloat makes every turn slow and triggers API timeouts).
- **Scope, not call caps.** Bound a brief by task scope ("do MA-66 only"), not by an artificial tool-call limit. Agents commit and push each green step, so an interruption loses little.
- **Owner sees early.** Art: art-director round 1 → owner. At most 2 art-director rounds per character. A style question that changes many characters gets a quick side-by-side spike before any full redraw.
- **Art tasks skip the architect.** A character redraw works straight from `docs/art/<id>.md` + ART-BIBLE; the architect is for new systems, IPC/DB contracts and SPEC/ADR changes.
- **Use the shared tools, don't rewrite them:** `pnpm check` (fail-fast gate), `pnpm sprites:compare <id> [--base <ref>]` (before/after lineups), the committed sprite fingerprint (other packs changing fails `pnpm test`).

## Tooling: sprite fingerprint
- **Problem.** `resources/characters/` and `resources/fx/` are generated by `pnpm sprites` and git-ignored, so a change to shared rig code that also shifts another character's pixels is invisible in a diff. Proving "only my pack changed" used to mean comparing SHA-256s by hand.
- **Fix.** `assets-src/sprites.lock.json` (committed) holds a SHA-256 per output file. `tests/unit/tools/sprites-lock.test.ts` builds every pack in memory (~2 s) and fails, naming the pack and file, when one differs.
- **Updating.** When a pack is meant to change, run `pnpm sprites:lock` and commit the lock diff with the asset change. A lock diff touching a pack the task did not name is a regression to fix, not to re-lock.

## Guardrails (`.claude/settings.json`, `.claude/hooks/`)
- `guard-paths.mjs` blocks:
  - any access to `.env*`, certificates and key files;
  - edits to generated `resources/characters/` and to committed DB fixtures;
  - any write to `skins-local/` (personal packs, ADR 005).
- `core-purity.mjs` runs after each edit in `src/core/`. It flags Electron/Node/DOM/Pixi/React/AI imports, clock reads, `Math.random` and timers.
- `electron-hardening.mjs` runs after each edit in `src/main/` or `src/preload/`. It flags insecure `webPreferences`, `executeJavaScript`, `shell.openExternal` with a non-literal URL, `child_process`, and servers bound to `0.0.0.0`.
- `format.mjs` runs Prettier on the edited file.
- Permissions:
  - allowed: checks, tests, sprites, mock evals, perf, read-only git;
  - ask first: dependency changes, live evals (they cost money), `electron-builder --publish`, commits, pushes, GitHub repo/PR/release creation;
  - denied: force-push, hard reset, `git clean`.

## Plugins & external skills
Enabled at project scope (`enabledPlugins`, `extraKnownMarketplaces` in `.claude/settings.json`). On a fresh clone: trust the folder, then
run `claude plugin install <name>@<marketplace> --scope project` for each entry. Enabling a plugin does not download it.

| Tool | Area |
|---|---|
| superpowers | planning, TDD, systematic debugging, verification |
| pr-review-toolkit | silent-failure hunter, type-design and test-coverage analyzers |
| typescript-lsp | type-aware navigation |
| frontend-design | chat/settings UI quality |
| context7 | current docs for Electron, electron-vite, Pixi, zod, i18next (hosted MCP; queries leave the machine) |
| pixijs-skills (official) | Pixi v8 scene graph, textures, rendering, v7→v8 pitfalls |

### Recommended external skills (verified 2026-11-22, not installed yet)
Before installing, review the SKILL.md and any scripts, and pin a commit.

| When | Tool | Install | Why |
|---|---|---|---|
| M6 | **pedronauck/skills** — `electron-builder`, `electron-release` (MIT, markdown only; review first) | `npx skills add pedronauck/skills/skills/curated --skill electron-builder` | NSIS, electron-updater, GitHub Releases |
| M2 | **ai-sdk** (Vercel, official) | `npx skills add https://github.com/vercel/ai --skill ai-sdk` | makes the agent read the docs bundled in `node_modules/ai/docs`, not memory |
| M2 | **claude-api** | built into Claude Code | model ids, streaming, tool use, caching for the Anthropic provider |
| M2 | **semgrep llm-security** (Semgrep Rules License, not OSI — use only) | `npx skills add semgrep/skills --skill llm-security` | OWASP LLM Top 10: prompt injection, excessive agency, output handling |
| M4 | **mcp-server-dev** (Anthropic) | `/plugin install mcp-server-dev@claude-plugins-official` | local MCP server design, transports, tool design |
| M5 | **i18next-localization** (official) | `npx skills add i18next/i18next-cli` | uk/en setup through i18next-cli |
| M-ART | **pixelfx** (MIT) | `/plugin marketplace add patch-gg/pixelfx` → `/plugin install pixelfx@pixelfx` | code-drawn pixel FX (sleep Zzz, sweat, hearts, smoke) as references or exports |
| M6 | **trailofbits/skills** — `supply-chain-risk-auditor`, `insecure-defaults` | `/plugin marketplace add trailofbits/skills` | native modules, install scripts, unsafe defaults |
| M6 | **github-actions-hardening** (GitHub) | `npx skills add github/awesome-copilot --skill github-actions-hardening` | release workflow with secrets |
| ideas only | `skill-creator`, `aseprite-ai-artist` (needs paid Aseprite), `react-best-practices` (Vercel, no license file) | cherry-pick | |

Rejected:
- Playwright Test Agents and Anthropic `webapp-testing`: no Electron support.
- Electron org skills: maintainer-only.
- Aggregator catalogs (sickn33, TerminalSkills): thin, generated content.
- `security-guidance`: sends every diff to an LLM, duplicates our reviewers.
- Third-party Ollama skills: unvetted; ai-sdk covers the provider.
- XState / stately skills: we use our own state machine (ADR 002).
- `pedronauck electron-dev` (reviewed 2026-11-22 at bba9fa3): it teaches the removed `enableRemoteModule` and a generic `invoke(channel)` preload, which contradicts `rules/ipc.md`.

Not carried over from Cossack Kin:
- `balance-designer`, `platform-reviewer` (no store or ads);
- `/balance`, `/new-village`, `/save-migration` (→ `/db-migration`);
- Playwright test agents.
