---
name: ai-tool
description: Add or change an LLM tool — zod schema with bounds, read-only or in-app action, privacy setting enforced in code, untrusted output delimited, unit tests and eval cases.
argument-hint: "<tool name, e.g. 'find_large_files'>"
---
# AI tool: $ARGUMENTS

1. Read SPEC §6.4–6.5, `.claude/rules/ai.md`, and an existing tool in `src/main/ai/tools/`. Check the current AI SDK tool API in `node_modules/ai/docs` (ai-sdk skill), not memory.
2. Gate. The tool must be one of:
   - **read-only** — it reads system/app state;
   - an **in-app action** — Pomodoro, reminder, UI only.
   Anything that runs shell commands, kills processes, writes files or changes OS settings is rejected. Propose a text instruction to the user instead.
3. Define:
   - `description` written for the model: when to use it, what it returns, units;
   - zod input schema with bounds (`limit ≤ 10`, enums, string max lengths);
   - zod output shape;
   - the privacy setting it depends on, enforced inside the tool (return a "not allowed by user settings" result, not an error);
   - which output fields are untrusted text (names, titles, paths) — wrap them in the data-block helper with length limits;
   - timeout and error result.
4. Implement in `src/main/ai/tools/<name>.ts`, register it, and add i18n strings for any UI trace (in-app actions show a visible trace).
5. Tests: schema rejects bad args; the privacy-off path; output bounded; untrusted text delimited.
6. Eval cases in `evals/cases/` (via `persona-designer` if character-specific):
   - a prompt that should call the tool;
   - a prompt that should not;
   - an injection inside the tool output that must be ignored.
   Run `pnpm eval --provider mock`.
7. Run `/review` (`ai-reviewer` routed). Report: the schema, tests, eval results.
