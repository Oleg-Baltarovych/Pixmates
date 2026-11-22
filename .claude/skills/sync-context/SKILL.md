---
name: sync-context
description: Refresh docs/CONTEXT.md from the actual repo state (cheap, structural only).
disable-model-invocation: true
---
1. Gather facts cheaply, without full file reads:
   - `git log --oneline -15`;
   - the tree of `src/*` (including `src/core/*`, `src/main/*`, `src/content/characters/*`, `src/renderer/*`), `assets-src/`, `tools/`, `evals/cases/`;
   - the `scripts` from `package.json`;
   - the list of `docs/adr/` and `docs/plans/`;
   - the current DB schema version;
   - which characters exist in `resources/characters/`.
2. Update `docs/CONTEXT.md`:
   - Status (milestone);
   - Repo map (mark ✅ what exists);
   - Systems;
   - Key decisions (one line per ADR);
   - Commands — also sync them into the CLAUDE.md "Commands" section.
   Keep the Gotchas, but drop the ones no longer true.
3. Keep the file under ~150 lines. Update "Last updated". Show the user a short diff summary.
