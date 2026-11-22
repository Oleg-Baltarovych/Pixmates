---
name: new-behavior
description: Add a behaviour end to end — an idle activity, cursor interaction, system/dev reaction or character-switch transition — through core (state, priority, throttle), content (numbers, lines), animation and tests.
argument-hint: "<kind: activity|cursor|reaction|switch> <name>, e.g. 'reaction agent_failed'"
---
# New behavior: $ARGUMENTS

1. Read SPEC §4 (priority table 4.1, surfaces 4.2, activities 4.3, switch 4.4) and `.claude/rules/core.md`. Find similar behaviour in `src/core/behavior/` and copy its shape.
2. Define it in the plan (or confirm it with the user for small additions):
   - trigger event (sensor snapshot, cursor input, timer, dev event) and its zod-typed source;
   - priority (fits the SPEC table, or the SPEC is updated);
   - state(s), min/max duration, exit conditions;
   - cooldown and whether it counts toward the global 1-per-10-min unsolicited-speech limit;
   - surfaces and conditions (time of day, mood, focus);
   - animation(s) and emotion with fallbacks;
   - line keys (uk + en);
   - setting toggle (every reaction can be disabled).
3. Tests first (`test-writer` for larger setups). Replay events with a fixed seed and `now`, and assert:
   - it triggers; it is interrupted by higher priorities;
   - the cooldown holds; quiet mode and fullscreen suppress it;
   - it never fires while `hidden`.
4. Implement:
   - core state and transitions;
   - numbers in `src/content/reactions.ts` or the character activities;
   - the main-side sensor or dev event mapping;
   - the renderer animation hookup.
   If a new animation or pose is needed, use `/sprite`. For lines and weights, use `persona-designer`.
5. Run `pnpm test`, then a manual run with a scripted trigger if possible. For anything continuous (cursor tracking, sensors), run `/perf`.
6. Report: the behaviour spec (one table), tests, how to trigger it manually, perf impact.
