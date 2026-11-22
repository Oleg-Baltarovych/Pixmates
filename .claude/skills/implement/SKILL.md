---
name: implement
description: Implement an approved plan with the lead-developer agent, then review, verify and accept.
disable-model-invocation: true
argument-hint: "<docs/plans/....md> [step range] | <backlog file> <task ID>"
---
1. Check that `$ARGUMENTS` points to one of these:
   - an existing plan in `docs/plans/`;
   - a backlog file plus a task ID with `Flow: direct` (its AC act as the plan).
   If not, list the plans and ask which one.
2. Launch `lead-developer` with the plan path (and the step range or task ID, if given).
3. If the plan needs content (personas, lines, activities, reaction tuning, eval cases), launch `persona-designer`. Then run `/review`, then `/verify`. Send blockers back to `lead-developer` once.
4. Launch `qa-lead` with the plan path and review findings. On REJECTED, send the list back to `lead-developer` once.
5. Report the result and suggest `/ship`.
