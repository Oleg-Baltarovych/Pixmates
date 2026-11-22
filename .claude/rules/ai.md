---
paths:
  - "src/main/ai/**"
  - "evals/**"
  - "tools/eval.ts"
---
# AI rules — SPEC §6; ADR 003

- Providers come only through Vercel AI SDK 7 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`, `ai-sdk-ollama`) behind `AIService`. Read `node_modules/ai/docs` (ai-sdk skill) before writing SDK code; never guess the API.
- Model ids and endpoints come from settings/config, never hard-coded in logic. Keys come from `safeStorage`, are passed to the provider at call time, and never appear in prompts, logs or renderer state.
- Output contract: `{ say, emotion, action? }` via structured output, validated with zod against the active character's `emotions` and the action allow-list. Fallback: a validated `[emotion]` tag. On invalid output, show `say` with the `idle` emotion; never crash.
- Tools: only read-only or in-app actions; each tool is a file in `tools/` with bounded zod args (`/ai-tool`). Privacy settings are enforced inside the tool. At most 4 steps per turn and an overall timeout; abort cleans up the stream.
- Untrusted text is wrapped by the data-block helper, with a length limit, and is never concatenated into instructions:
  - window titles, process and file names, clipboard;
  - hook payloads, MCP `say`;
  - imported personas and lines;
  - tool outputs containing names.
  The system prompt states that data blocks are not instructions.
- Context: persona + state summary + 3–7 memory facts; history trimmed by tokens; a daily token budget is enforced before each call.
- Proactive speech: line templates first. The LLM may rephrase only within the budget and only for events the core already approved.
- No provider configured → chat disabled; characters keep working. Errors and timeouts become in-character, friendly messages.
- Every change to prompts, tools or personas comes with eval cases. `pnpm eval --provider mock` must pass. Live providers run only with user approval.
