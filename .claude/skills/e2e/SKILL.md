---
name: e2e
description: Write or run Playwright _electron smoke tests for critical flows on the built app (launch, stage click-through, chat with mock provider, settings, pack import, quiet mode).
argument-hint: "<flow, e.g. 'chat with mock provider'>"
---
# E2E: $ARGUMENTS

Playwright Test Agents do not support Electron, so this skill replaces them.

1. Read `.claude/rules/testing.md` and the existing specs in `tests/e2e/`. Check the current `_electron` API in the Playwright docs (context7), not memory.
2. Test the built app: `pnpm build`, then `_electron.launch({ args: [<main entry>], env: { PIXMATES_E2E: '1', PIXMATES_SEED: '1', PIXMATES_PROVIDER: 'mock' } })`. Use a temp `userData` dir per test, never the user's real profile.
3. Scope = critical flows only:
   - app starts with the stage visible;
   - the tray menu exists;
   - chat opens with the hotkey or a character click, a mock reply streams, and the emotion is applied;
   - settings persist;
   - pack import accepts a valid fixture pack and rejects a zip-slip pack;
   - quiet mode hides characters.
   Behaviour details belong in unit tests.
4. Locators: role- or label-based for React windows. For the stage, use the debug hooks exposed only when `PIXMATES_E2E=1` (character positions and states), compiled out of production.
5. No `waitForTimeout`. Wait on events or `expect.poll` against debug state. Close every app instance in `afterEach`.
6. Run `pnpm e2e --grep "<flow>"`, quote failures verbatim, and attach traces from `test-results/`.
