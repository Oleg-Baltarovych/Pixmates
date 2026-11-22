# 008. SQLite driver: `node:sqlite` behind a `storage/db.ts` interface

- Status: Accepted (2026-11-23, per the spike decision rule; re-run the bench on each Electron major)
- Date: 2026-11-22

## Context
Pixmates keeps chat history, memory, mood and stats in a local SQLite file in `userData` (settings stay in
`electron-store`), opened only by the main process (SPEC §2 storage row, §3 Storage, §4.5, §6.1). Electron 45.4.1 ships Node 24.22.3 with a built-in `node:sqlite` (SQLite 3.54.1) that needs no flag but is
not yet stable (release candidate only from Node 25.7). The alternative is the native `better-sqlite3`. The packaged build
uses asar and fuses (`OnlyLoadAppFromAsar`, asar integrity, `RunAsNode` off), and pnpm 12 blocks install scripts unless
they are listed in `allowBuilds`.

Spike S2 (`docs/plans/spikes/s2-sqlite.md`) ran both drivers in the Electron main process, in dev and in
`pnpm dist:dir`, with a temp `userData`. Each process ran 5 runs, with 5 processes per driver alternating. The table
gives the median of the per-process medians. Machine: Ryzen 7 7730U. Spike S1 perf runs were active at the same time.

| Packaged, ms | `node:sqlite` | `better-sqlite3` 13.2.0 |
|---|---|---|
| Module load | 0.58 | 9.60 |
| Cold open + WAL + schema | 8.50 | 8.20 |
| 10 000 inserts, one transaction | 34.0 | 46.0 |
| 1 000 indexed selects | 11.7 | 11.7 |
| Δ main RSS | +11.6 MB | +11.8 MB |
| Δ `release/win-unpacked` | 0 | +28.2 MB (whole package smart-unpacked; ≈ 2.1 MB if trimmed) |

Both drivers load without flags in dev and packaged builds. Both support WAL, `BEGIN/COMMIT/ROLLBACK`, prepared
statements and `PRAGMA user_version`. `node:sqlite` emitted no ExperimentalWarning. better-sqlite3 13.2.0 has no install
script: it ships N-API prebuilds, so it needs no `allowBuilds` entry, no node-gyp and no rebuild for Electron.

## Decision
Use the built-in **`node:sqlite`** (`DatabaseSync`) in the main process. It meets the plan rule: it works packaged
without flags, supports WAL and transactions, and is no worse than 2× better-sqlite3 (worst case is 1.04× on cold open).
- All access goes through one interface in `src/main/storage/db.ts` (open, exec, prepared statements, a `transaction(fn)`
  wrapper over `BEGIN/COMMIT/ROLLBACK`, `user_version` for migrations). No other module imports `node:sqlite`.
- The DB is opened with `journal_mode = WAL` and `synchronous = NORMAL`. Migrations are keyed on `PRAGMA user_version`
  (`/db-migration`).
- No new dependency. `electron-builder.yml` keeps `npmRebuild: false` and needs no `asarUnpack`.

## Alternatives considered
- `better-sqlite3` 13.2.0 is mature and stable and has a `transaction()` helper. It costs a dependency and +28 MB by
  default (or `files` exclusions to maintain). It also loads 16× slower and is no faster on the bench. It stays the
  fallback because it already packages cleanly under our fuses.
- `sql.js` / WASM: whole DB in memory, explicit file flush, slower. Not measured.

## Consequences
- Positive: zero install and packaging cost, smaller release, no native binary to audit or update, and no gap between
  the Electron ABI and the prebuild.
- Negative / trade-offs: the `node:sqlite` API is not stable and may change with an Electron or Node major. It has no
  built-in `transaction()` helper (we write one in `db.ts`). The SQLite version follows Electron.
- Follow-ups: re-run the S2 bench (`--sqlite-bench`, spike branch) on every Electron major bump. If `node:sqlite`
  breaks, switch `db.ts` to better-sqlite3 with `files` trimming to `lib/` + `win32-x64.node`. Update the SPEC §2 storage row
  and CONTEXT "Key decisions" when this ADR is accepted (M0-10).
