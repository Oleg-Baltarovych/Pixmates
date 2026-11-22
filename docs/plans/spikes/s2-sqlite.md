# S2 — SQLite driver: `node:sqlite` vs `better-sqlite3` 13.2.0 (Electron 45.4.1 main)

Date 2026-11-22 · branch `spike/s2-sqlite` (from feat/m0-scaffold b47ff92, throwaway, not merged) · → ADR 008.

## Setup
- Electron 45.4.1 (Node 24.22.3, bundled SQLite 3.54.1, N-API 10), electron-builder 26.18.0, pnpm 12.21.0.
- Throwaway entry `src/main/spike/sqlite-bench.ts`, reached only via `--sqlite-bench=<node|better|none> --sqlite-out=<file>`
  (checked first in `main()`; own temp `userData`, no windows, `app.exit` when done). Production paths unchanged.
- Per process: feature checks, then 5 runs on a fresh file each: cold open (`new` + `journal_mode=WAL` +
  `synchronous=NORMAL` + `CREATE TABLE` + `CREATE INDEX`), 10 000 prepared `INSERT` in one `BEGIN…COMMIT`,
  1 000 prepared `SELECT … WHERE k = ?` on the index (LCG keys). Same SQL for both drivers.
- Packaged: `pnpm dist:dir` (asar, fuses on, `npmRebuild: false`), `release/win-unpacked/Pixmates.exe`, 5 processes per
  driver alternating node/better in one session; table = median over processes of the per-process median of 5 runs.
- RAM: `process.memoryUsage().rss` of main after `ready` vs after the bench (same process).
- Machine: Ryzen 7 7730U, 16 logical CPUs, Windows 11 26200. **Concurrency: spike S1's packaged Pixmates (4 processes)
  and its perf runs were active at the same time**, so absolute ms are noisy; the ratio between drivers is the signal.

## Results (packaged, ms unless noted)
| Metric | `node:sqlite` | `better-sqlite3` 13.2.0 | node / better |
|---|---|---|---|
| Module load (`import` / `require`) | 0.58 | 9.60 | 0.06× |
| Cold open + WAL + schema | 8.50 | 8.20 | 1.04× |
| 10 000 inserts, one transaction | 34.0 | 46.0 | 0.74× |
| 1 000 indexed selects | 11.7 | 11.7 | 1.00× |
| Δ main RSS (base ≈ 81.6 MB) | +11.6 MB | +11.8 MB | ≈ |
| Δ `release/win-unpacked` | 0 (built in) | +28.2 MB (423.3 → 451.5 MB) | — |

Per-process insert medians: node 34.0/32.5/43.2/36.9/31.5; better 43.9/50.6/42.5/45.9/55.5.
Dev (`pnpm dev`, one process each): node open 8.8 / insert 42.1 / select 12.2; better 8.4 / 45.9 / 12.5.

## Features (both drivers, dev and packaged)
- Load without flags in dev and packaged: **yes / yes**. `PRAGMA journal_mode = WAL` → `wal`; `PRAGMA user_version = 3`
  read back as 3; `BEGIN` + insert + `ROLLBACK` leaves 0 rows; prepared statements reused across 10 000 runs.
- better-sqlite3 also has `db.transaction(fn)`; `node:sqlite` has none (wrap `BEGIN/COMMIT/ROLLBACK` in `storage/db.ts`).

## ExperimentalWarning
- None. `process.on('warning')` registered before the import captured nothing (dev and packaged), and
  `ELECTRON_RUN_AS_NODE=1 electron -e "require('node:sqlite')"` prints no warning on Node 24.22.3. The module is still
  documented as not stable (release candidate only from Node 25.7), so the API may change on an Electron major bump.

## Packaging notes (better-sqlite3 13.2.0)
- No install script (`gypfile: false`, N-API prebuilds for 8 platforms ship in the tarball) → **no `allowBuilds` entry**,
  `strictDepBuilds` install passes, no node-gyp, no `@electron/rebuild`, works with Electron's ABI as-is.
- Load via the platform entry `better-sqlite3/win32-x64` (or the default entry, which picks it).
- `asarUnpack` not needed in config: electron-builder's smart unpack moved the **whole package** to `app.asar.unpacked`
  (27.8 MB: all 8 prebuilds 17.3 MB, `deps/` SQLite sources 10.3 MB) + 0.4 MB in asar (`node-addon-api` headers).
  Trimming via `files` exclusions would bring it to ≈ 2.1 MB (`lib/` + `win32-x64.node` 2.0 MB) — extra config to maintain.
- Packaged app loads it with fuses on (`OnlyLoadAppFromAsar`, asar integrity) — unpacked `.node` is allowed.
- CI `build` not run (spike not pushed); local `pnpm dist:dir` green.

## Recommendation
**`node:sqlite`.** Works packaged without flags, WAL/transactions/`user_version` OK, no ExperimentalWarning, at parity or
faster than better-sqlite3 (worst ratio 1.04× on cold open, rule allows 2×), zero install/packaging cost (−28 MB vs
better-sqlite3 default packaging). Risk = non-stable API: access only through the `storage/db.ts` interface so a switch to
better-sqlite3 (already proven to package cleanly) stays a one-file change; re-run this bench on each Electron major.
