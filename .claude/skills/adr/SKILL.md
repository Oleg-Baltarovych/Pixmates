---
name: adr
description: Write an Architecture Decision Record in docs/adr. Use when a technical or product decision is made or changed (window strategy, storage, LLM layer, rig/art pipeline, local servers, packaging, platform).
argument-hint: "<short-kebab-title>"
---
# ADR: $ARGUMENTS

1. Next number: list `docs/adr/` and take max + 1 (3 digits). If `docs/adr/README.md` has a "Pending" row for this decision, reuse its number. Update the index.
2. Create `docs/adr/NNN-<title>.md` in English:

```markdown
# NNN. <Title>

- Status: Proposed | Accepted | Superseded by NNN
- Date: YYYY-MM-DD

## Context
<forces, constraints, what problem; link docs/SPEC.md §; measurements if from a spike>

## Decision
<the choice in one or two sentences, then specifics>

## Alternatives considered
- <option> — <why not>

## Consequences
- Positive: …
- Negative / trade-offs: …
- Follow-ups: …
```

3. Under ~60 lines; facts over prose. Spike-based decisions include the measured numbers (CPU, RAM, fps) and how they were measured.
4. If the decision changes behaviour described in the SPEC, update the owning `docs/SPEC.md` section in the same change.
5. Add a one-line entry to "Key decisions" in `docs/CONTEXT.md`.
