---
name: bugfix
description: Fix a bug test-first — reproduce with a failing test (or a reproducible screenshot/perf run), fix the root cause, review, verify.
disable-model-invocation: true
argument-hint: "<bug description / log / steps>"
---
Bug: $ARGUMENTS

1. Locate: use `docs/CONTEXT.md` to find the system; read only the relevant files. State the hypothesis of the root cause.
2. Reproduce:
   - Behaviour/logic bug: write the smallest failing Vitest test, replaying the event sequence into the core with a fixed seed and `now`. Use `test-writer` for a larger setup.
   - IPC/main bug: write a failing test against the handler or contract.
   - AI bug: add a failing eval case (mock provider) that captures the wrong behaviour.
   - Visual or perf bug: reproduce with a fixed scenario, then capture a screenshot or run `pnpm perf`.
   Confirm the test fails for the expected reason. If you cannot reproduce, stop and report what you tried.
3. Fix the cause, not the symptom — no guards that only hide the crash. Smallest change.
4. Run the test and `pnpm test`, then `/review` on the changed files.
5. If the bug reveals a non-obvious trap, add a line to `docs/CONTEXT.md` → Gotchas.
6. Report: root cause, fix, test name (or before/after evidence), checks. Suggest `/ship`.
