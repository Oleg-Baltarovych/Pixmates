# 003. LLM layer on Vercel AI SDK, character-first output

- Status: Accepted
- Date: 2026-11-22

## Context
SPEC v1 planned three hand-written provider adapters (Anthropic, OpenAI-compatible, Ollama) with streaming and tool calling. That is weeks of work with no visible result. The valuable part is the agent layer (SPEC §6): persona, context, memory, tools and budget, and letting the AI drive the character's body.

## Decision
Use Vercel AI SDK 7 (`ai`) with `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible` and `ai-sdk-ollama`, behind our own `AIService` in `src/main/ai/`.
- Responses use structured output `{ say, emotion, action? }`, validated with zod against the character's manifest. Models without structured output fall back to a validated `[emotion]` tag.
- Tools are read-only or in-app actions, at most 4 steps per turn.
- Proactive speech uses character line templates first; the LLM optionally rephrases them within a daily token budget.
- An eval suite guards quality (`evals/`, `pnpm eval`).

## Alternatives considered
- Hand-written adapters: full control, high cost, more bugs in streaming and tool-call parsing.
- Claude Agent SDK: built for coding agents with file/shell tools. Wrong fit and too heavy for a read-only companion.

## Consequences
- Positive: one API for streaming, tools and structured output across providers; local-first via Ollama.
- Negative: depends on a fast-moving SDK. Pin exact versions and read the docs bundled in `node_modules/ai/docs` (ai-sdk skill), not memory.
- Follow-ups: `ai-reviewer` agent, `/ai-tool` and `/prompt-eval` skills.
