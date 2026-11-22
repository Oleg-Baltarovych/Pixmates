# 002. Pure deterministic behavior core

- Status: Accepted
- Date: 2026-11-22

## Context
Behavior is the heart of the app: a priority state machine, physics, activities, cursor reactions, character switching, mood and anti-spam throttling (SPEC §4). It must be easy to test and must not depend on Electron, timers or the real clock.

## Decision
All behavior decisions live in `src/core/`: pure TypeScript. It imports nothing from Electron, Node built-ins, DOM, Pixi, React or sensor packages.
- Time enters as `now: number` (ms).
- Randomness comes from a seeded RNG (`core/rng.ts`); its state is part of the core state.
- Inputs are typed events: sensor snapshots, user input, timer ticks, dev events.
- Outputs are a new state plus typed effects (`Say`, `PlayAnimation`, `MoveTo`, …).

Main (`src/main/`) wires sensors and timers into the core and executes the effects. The renderer interpolates motion and draws. Thresholds, cooldowns and weights live in `src/content/`.
The state machine is our own code (discriminated unions), not XState.

## Alternatives considered
- Logic spread across main services: harder to test, timing bugs, duplicated throttling.
- XState: good tooling, but an extra dependency and less control over determinism. A hand-written machine also shows the work better in a portfolio project.

## Consequences
- Positive: unit tests with a fixed seed and clock; replayable scenarios; one source of truth.
- Negative: needs an effect-interpreter layer in main.
- Follow-ups: `core-purity.mjs` hook + ESLint boundary rules at M0.
