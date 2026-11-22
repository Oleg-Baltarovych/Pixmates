---
name: db-migration
description: Change the SQLite schema safely — new numbered migration, schema version bump, immutable fixture of the previous version, migration test from every old fixture.
argument-hint: "<what changes, e.g. 'add memory_facts.pinned'>"
---
# DB migration: $ARGUMENTS

1. Read `.claude/rules/main.md` (storage section), `src/main/storage/migrations/`, and the current schema version.
2. Write a new migration `src/main/storage/migrations/NNN-<slug>.ts`:
   - forward-only, idempotent, runs in a transaction;
   - never edits an existing migration;
   - data transforms are explicit; no destructive drop of user data without a copy step.
3. Bump the schema version constant.
4. Fixture:
   - If no fixture of the *current* version exists yet, capture one first (`tests/fixtures/db/vN.sqlite` or a SQL dump), with no personal data.
   - Committed fixtures are immutable; the `guard-paths` hook blocks edits to them.
5. Tests: migrate from every fixture to the latest version, then assert the schema and representative data. Also assert that a database from a *newer* version is not opened destructively (read-only or warning).
6. Run `pnpm test` and report: migration file, version N → N+1, fixtures, tests.
