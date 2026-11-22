---
name: review
description: Review current changes with only the reviewers relevant to the touched paths, in parallel.
argument-hint: "[base ref, default: main]"
---
1. Collect the changed files:
   - `git diff --name-only ${ARGUMENTS:-main}...HEAD`;
   - `git diff --name-only`;
   - `git ls-files --others --exclude-standard`.
   If nothing changed, say so and stop.
2. Route: launch the matching agents **in parallel, in one message**, each with only its list of files.
   | Touched paths | Agent |
   |---|---|
   | `src/core/**`, `src/content/**` (logic-facing data), `src/main/**`, `src/renderer/stage/**`, `src/shared/**`, `tools/**` | `code-reviewer` |
   | `src/main/**`, `src/preload/**`, `src/shared/ipc.ts`, `src/main/characters/**`, `src/main/dev/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, `electron-builder.yml`, `electron.vite.config.ts`, `.github/**` | `electron-security-reviewer` (run `pnpm build` first so it can grep the output) |
   | `src/main/ai/**`, `src/main/dev/**`, `src/content/characters/**` (personas, lines), `evals/**` | `ai-reviewer` |
   | `src/renderer/chat/**`, `src/renderer/settings/**`, `src/i18n/**` | `ui-reviewer` |
   | `assets-src/**`, `src/renderer/stage/**` (visual), `docs/art/**` | `art-director` (first produce contact sheets with `pnpm sprites:sheet <id>` plus stage screenshots over light and dark wallpapers, and pass their paths) |
   | test files only | `code-reviewer` (test-quality focus) |

   Skip any agent with no files. For docs-only changes, launch no agents; just check that `docs/CONTEXT.md` is consistent.
3. Merge the findings into one list: ordered by severity, deduplicated, each with `file:line` (or screenshot + area). End with a combined verdict: ready / fix first (list) / rework.
