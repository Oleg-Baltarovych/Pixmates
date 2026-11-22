---
name: verify
description: Definition-of-Done gate — run typecheck/test/lint (+ mock evals, perf and screenshots when relevant) and walk the Definition-of-Done checklist.
---
1. Find the changed files (`git diff --name-only main...HEAD` + uncommitted).
2. Run `pnpm typecheck`, `pnpm test`, `pnpm lint`. Quote failures verbatim. Do not "fix" by weakening or skipping tests.
3. If `src/main/ai/`, `src/main/dev/`, `src/content/` or `evals/` changed: run `pnpm eval --provider mock`. All deterministic checks must pass.
4. If `src/renderer/stage/`, `src/main/sensors/`, `src/main/windows/` or any always-on service changed: run `/perf`. Is the result within SPEC §1 (< 2% CPU idle, ≤ 200 MB)?
5. If `assets-src/` or `src/renderer/stage/` changed visually: take stage screenshots over light and dark wallpapers and look at them.
6. DoD checklist. Answer each item yes / no / n.a. with evidence: `file:line`, test name, eval case, perf report or screenshot path.
   - AC from the plan met.
   - Core logic tested test-first; core stays pure (no hook warnings).
   - No magic numbers in logic (content keys).
   - IPC: zod contract + main validation + contract test for new channels.
   - Hardening intact (no `electron-hardening` warnings); untrusted input validated (packs, hook/MCP payloads, LLM output).
   - AI: tools read-only, injection eval cases present, budget respected.
   - i18n keys in `uk` + `en`.
   - DB migration + fixture if the schema changed.
   - Perf budget respected for always-on changes; resources disposed.
   - Security: `pnpm audit --prod` has no high/critical; new deps justified; no secrets; no protected characters.
   - No `any` / `@ts-ignore` without a comment.
   - SPEC/ADR updated if behaviour changed; `docs/CONTEXT.md` updated.
7. Output: a table of checks + a DoD table + verdict **DONE** or **NOT DONE** (with what is missing).
