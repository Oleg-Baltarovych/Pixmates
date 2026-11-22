---
name: release-check
description: Pre-release gate for a GitHub Release — full security and code review, all checks, live evals, perf on the packaged build, installer and auto-update smoke, release checklist.
disable-model-invocation: true
argument-hint: "<version, e.g. 0.3.0>"
---
# Release check: $ARGUMENTS

1. Confirm the version in `package.json` matches `$ARGUMENTS` and that `CHANGELOG.md` (or the release notes draft) covers the changes since the last tag.
2. Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm security`, `pnpm eval --provider mock`.
3. **Ask the user** before live evals: `pnpm eval --provider ollama` (local, free) and optionally `--provider anthropic` (costs money). Compare the scores with the last release.
4. Run `pnpm build && pnpm dist` (no `--publish`). Then `/perf` on the packaged app and `/e2e` smoke.
5. Launch in parallel, each with the full diff since the last tag:
   - `electron-security-reviewer` (also check fuses, asar, updater config, devtools off);
   - `ai-reviewer`;
   - `code-reviewer`.
6. Manual checklist (ask the user to confirm the items you cannot check):
   - The installer runs on a clean Windows 11 user; the SmartScreen note is in the README.
   - The app autostarts if enabled; uninstall removes it cleanly; `userData` is kept or removed as documented.
   - Auto-update from the previous version works (test feed or pre-release).
   - Characters hide in fullscreen; there is no click blocking outside character bodies; compat mode works.
   - The first-run privacy disclosure appears before the first AI request.
   - The README GIFs show only original characters; licenses for any third-party assets are listed.
7. Output: checks table, reviewer verdicts, perf numbers, eval scores, open items, verdict **READY** / **NOT READY**. Publishing (`electron-builder --publish`, `gh release create`) happens only after explicit user approval.
