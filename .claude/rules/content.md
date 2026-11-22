---
paths:
  - "src/content/**"
---
# Content rules — SPEC §4, §5.3, §6.5; ADR 005

- `src/content/` is data only: personas, line templates, emotion sets, activities (conditions, weights, durations), reaction thresholds and cooldowns, physics constants. No logic beyond tiny pure helpers.
- Typed with `as const` + `satisfies` against types from `src/shared` / `src/core` so ids stay literal unions.
- Owner: `persona-designer`. Logic changes go to `lead-developer`.
- Originality: personas, names and lines are original. No catchphrases, names or traits of protected characters.
- Every line key exists in `lines.uk` and `lines.en`. Bubble text ≤ 120 chars. Tone is kind: no shaming, no guilt-trips, no fake urgency.
- Anti-spam defaults (SPEC §4.1): reaction cooldown ≥ 30 min by default; global ≤ 1 unsolicited line per 10 min. Deviations need a plan reference.
- Variety: no single idle activity > 30% of expected idle time; signature activities weighted so each appears at least once per ~30 min of idle.
- A content-integrity test checks that referenced animations, emotions, line keys and activity ids exist (with fallbacks).
- Persona or line change → update eval cases and run `pnpm eval --provider mock`.
