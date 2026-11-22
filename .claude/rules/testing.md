---
paths:
  - "tests/**"
  - "**/*.{test,spec}.{ts,tsx}"
---
# Testing rules — SPEC §12, §14

- **Unit tests (Vitest)** for `src/core`, `src/content` integrity, `src/shared` contracts and the main-process logic (services with injected fakes). Core coverage ≥ 90%.
- **Core:** replay event sequences with an explicit seed and `now`. Cover:
  - the priority table (drag > hidden > reactions > activities);
  - cooldowns and the global speech limit;
  - quiet hours, dedup;
  - activity weights and no-repeat;
  - surfaces: window closes or moves under a character, screen edges, fling velocity;
  - character switch: transition interrupted by drag, per-character mood kept, active character persisted;
  - mood drift.
- **Main:**
  - IPC contracts reject malformed or oversize payloads and wrong senders;
  - the hooks endpoint and MCP reject a bad token, foreign Origin, wrong Host, oversize body and unknown fields;
  - pack import rejects zip-slip, symlinks, bad magic bytes, oversize textures and id collisions;
  - DB migrations run from every fixture.
- **AI:** mocked providers only in unit tests. Assert:
  - tool choice;
  - schema-valid `{say, emotion}`;
  - fallbacks on invalid output;
  - untrusted text stays inside data blocks;
  - budget enforcement.
  Live behaviour goes to `evals/`, not unit tests.
- **UI:** Testing Library, query by role/label, jsdom per file (`// @vitest-environment jsdom`). The Pixi stage is checked by screenshots, except pure helpers (hit-test math, interpolation, fling velocity).
- **E2E:** Playwright `_electron` smoke for critical flows only (`/e2e`). Temp `userData`, mock provider, fixed seed. No `waitForTimeout`.
- Fake timers only for main/UI code; core never needs them (time is a parameter).
- A test must fail when the behaviour breaks. Assert outputs and effects, not implementation calls. Delete tests that pass against an empty implementation. Test data via builders (`makeCoreState({ … })`).
