---
name: feature
description: Full feature flow — plan (architect) → user approval → implement (lead-developer) → content (persona-designer) → review → verify → accept.
disable-model-invocation: true
argument-hint: "<feature or milestone task, e.g. 'cursor chase + petting (M1)'>"
---
# Feature: $ARGUMENTS

Run these stages in order. Keep the main thread small: delegate, then relay summaries.

1. **Plan** — launch `architect` with the feature text. Show the user the plan path, the summary and the open questions.
   **Stop and wait for the user's approval** (or answers). If they request changes, send them to the architect again.
2. **Implement**:
   - If the plan has substantial core logic, first launch `test-writer` for the failing tests. Subagents cannot spawn subagents, so this happens here.
   - Then launch `lead-developer` with the approved plan path (and the failing test files).
3. **Content** — if the plan needs new personas, lines, activities, reaction tuning or eval cases, launch `persona-designer` with the plan path.
4. **Review** — run `/review`. Send blocker/should-fix findings back to `lead-developer` (or `persona-designer` for content) in one batch; repeat the review at most once more.
5. **Verify** — run `/verify`. If red, return to step 2 with the failure output.
6. **Accept** — launch `qa-lead` with the plan path and the review findings. If REJECTED, send the list to `lead-developer` and repeat from step 4. Allow at most 2 loops, then stop and ask the user.
7. **Report**:
   - what was built;
   - checks with results (perf numbers, eval scores);
   - review/art/QA verdicts;
   - screenshots (paths);
   - follow-ups.
   Suggest `/ship` — do not commit yourself.
