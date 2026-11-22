---
paths:
  - "src/core/**"
---
# Core rules — SPEC §0, §3, §4; ADR 002

- Pure TypeScript. No imports from `electron`, `node:*` / Node built-ins, DOM, `pixi.js`, `react`, `systeminformation`, `get-windows`, `ai` / `@ai-sdk/*`, `src/main`, `src/renderer`, `src/preload`. Core may import only from `src/shared` and `src/content`. The `core-purity.mjs` hook warns; ESLint enforces after M0.
- Deterministic: time enters only as `now: number` (ms). Randomness comes only from `core/rng.ts` (seeded), with the RNG state stored in core state. Same state + same events → same state + effects.
- Shape: `step(state, event, now) => { state, effects }`.
  - Events are a discriminated union of plain data: sensor snapshots, input, timer, dev events.
  - Effects are a discriminated union: `PlayAnimation`, `MoveTo`, `Say`, `ShowBubble`, `Hide`, `Schedule`, …
  - Main interprets effects; core never performs I/O.
- Priorities per the SPEC §4.1 table. A higher priority interrupts a lower one; `drag` beats everything; `hidden` suppresses all reactions and speech.
- Anti-spam lives here:
  - per-reaction cooldowns;
  - the global limit of 1 unsolicited line per 10 min;
  - quiet hours;
  - dedup queue.
  The numbers come from `src/content/`.
- No magic numbers: thresholds, cooldowns, weights, durations, speeds and gravity come from `src/content/`. Allowed literals: 0, 1, unit conversions.
- Logic is 10 Hz. Core never reasons about frames or pixels-per-frame; the renderer interpolates.
- Illegal states are unrepresentable: behaviour state, surface (`floor | window_top | window_side | screen_edge`) and character pose as unions; no boolean soup.
- Invalid input returns the unchanged state plus a rejected or ignored effect. Never throw on user or sensor data.
