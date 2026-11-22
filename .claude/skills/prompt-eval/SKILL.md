---
name: prompt-eval
description: Run the LLM eval suite (mock by default; live providers only with user approval), compare with the previous report, and summarize regressions by case and character.
argument-hint: "[mock|ollama|anthropic|openai] [--case <glob>]"
---
# Prompt eval: $ARGUMENTS

1. Provider = the first argument, `mock` by default. For anything other than `mock`, **ask the user first**: `ollama` needs a running local model; `anthropic` and `openai` cost money. Never read or print API keys; the app's key storage is used.
2. Run `pnpm eval --provider <p> [--case <glob>]` → `reports/evals/<date>-<provider>.md` (+ JSON).
3. Compare with the latest previous report for the same provider. For each case, report pass → fail changes, score deltas and latency/token deltas.
4. Group failures:
   - wrong or missing tool call;
   - invented numbers;
   - injection followed;
   - out of character;
   - wrong language;
   - schema-invalid `{say, emotion}`;
   - too long.
   Quote the failing output (truncated to 300 chars).
5. Suggest the owner of each fix:
   - prompt assembly or tools → `lead-developer`;
   - persona or lines → `persona-designer`;
   - a flaky case → tighten the assertion, never delete it.
6. Output: summary table (cases, pass rate, Δ vs previous), regressions, and the suggested fixes. Do not change code in this skill.
