# 014. Desktop window sensing: own Win32 calls over koffi FFI, not `get-windows`

- Status: Accepted (owner, 2026-11-28); spike S4 (M1-02, 2026-11-28) passed → mode (a) event hook (see Spike S4 result)
- Date: 2026-11-28

## Context
M1 lets the character stand and walk on the top edges of other apps' windows and fall when a window moves or closes
(SPEC §4.2). Main needs, for the stage display: the visible top-level windows, front to back, with their **visible**
bounds, refreshed fast enough that the character does not float after its window moves. Electron has no API that lists
other apps' windows or their bounds (`desktopCapturer` gives thumbnails, not rects). SPEC §2/§4.2 name `get-windows`.
Reading its Windows source (`Sources/windows/main.cc`, v10.0.0, 2026-11-28):
- install script `node-pre-gyp install --fallback-to-build` downloads a binary from GitHub Releases at install time
  (needs an `allowBuilds` entry; falls back to node-gyp);
- `openWindows()` is synchronous and per window opens the process, reads its image path and **file version info**,
  working set and the **title** (we must not read titles by default, SPEC §9/§10);
- bounds come from `GetWindowRect` (includes the invisible ~7 px resize borders on Windows 10/11), not
  `DWMWA_EXTENDED_FRAME_BOUNDS`;
- per-call heap leaks (`new WCHAR[]` for the title, `new OwnerWindowInfo`) — unacceptable at a 1 Hz poll.

## Decision
A small Win32 binding in `src/main/sensors/desktop.win32.ts` over **koffi** (FFI; prebuilt Node-API binary from the
script-free platform package `@koromix/koffi-win32-x64`; koffi's own `install` script, which only test-loads that binary
or else builds from source with CMake, is denied in `allowBuilds`), behind the `DesktopSensor` interface (`sensors/desktop.ts`, ADR 001).
- Calls: `EnumWindows` (z-order, front to back), `IsWindowVisible`, `IsIconic`, `GetWindowLongPtrW` (`WS_EX_TOOLWINDOW`,
  `WS_CHILD`), `GetAncestor`/owner check, `DwmGetWindowAttribute` (`DWMWA_CLOAKED`, `DWMWA_EXTENDED_FRAME_BOUNDS`),
  `GetClassNameW` only to drop shell windows (`Progman`, `WorkerW`, `Shell_TrayWnd`). **No title, no process access.**
- Physical px → DIP with `screen.screenToDipRect(null, rect)` (Windows-only Electron API). Our own windows are dropped
  by HWND (`getNativeWindowHandle`). HWNDs never leave main; core sees opaque ids.
- Change detection, decided by S4: (a) `SetWinEventHook(WINEVENT_OUTOFCONTEXT)` for `EVENT_OBJECT_LOCATIONCHANGE`
  (filtered to `OBJID_WINDOW` of top-level windows), `EVENT_OBJECT_DESTROY/HIDE`, `EVENT_SYSTEM_MOVESIZESTART/END`,
  `EVENT_SYSTEM_MINIMIZESTART`, delivered through the Electron main-thread message loop; plus a slow list refresh; or
  (b) polling only: every `DESKTOP_POLL_MS.onWindow` while the character is on a window, `.onFloor` otherwise, none in
  `sleep`/`hidden`/desktop-only layer.
- S4 rule: (a) if it works in the packaged build and costs < 0.1 pp CPU while typing/scrolling in another app,
  else (b). Either way: one enumeration < 2 ms with 40 windows, Δ private bytes < 5 MB, `pnpm perf` in budget.

## Alternatives considered
- `get-windows` — leaks, reads titles and process info we must not collect, install-time download, frame-inclusive
  bounds. Kept only as the source for active-app name in M3 if still needed (or replaced by the same binding).
- Own N-API addon (C++) — node-gyp toolchain in CI, Electron ABI care, a native binary to audit; more code than FFI.
- PowerShell / `child_process` — forbidden (rules/security.md), seconds of latency.
- Electron only — no such API.

## Consequences
- Positive: exactly the data we need, no titles, DWM-visible bounds, event-driven falls, no install script runs.
- Negative / trade-offs: new native dependency (koffi; `asarUnpack` check for `koffi.node`, supply-chain review);
  FFI typing is hand-written; Windows-only code path (fine for v1, ADR 001).
- Follow-ups: SPEC §2 data row and §4.2 `DesktopSensor` text (get-windows → own binding); CONTEXT gotcha; security
  review of the binding; re-check on each Electron major.

## Spike S4 result (M1-02, 2026-11-28)
koffi 3.3.8, packaged build (fuses on, asar, `koffi.node` unpacked), `pnpm perf` 30 s + 120 s on AC. Numbers and the
method are in `docs/plans/2026-11-28-m1.md` § M1-02 result.
- Packaged: koffi loads and the out-of-context WinEvent hook delivers on Electron's main message loop. ✅
- One enumeration: median 0.25 ms (tight) / 0.7–0.8 ms (1 Hz), p95 ≤ 1.8 ms with 175 handles. The full probe on
  every handle is 11 µs, so 40 windows ≈ 0.45 ms. **< 2 ms ✅**
- Typing in another app (36 WinEvents/s): main process +0.03 pp vs polling, +0.07 pp vs its idle; the whole-tree
  difference is within noise. **< 0.1 pp ✅**
- Δ private: +4.4–6.7 MB browser with koffi's default sync blocks (1 MiB stack + 2 MiB heap), so poll failed. With
  `koffi.config({ sync_stack_size: 256 KiB, sync_heap_size: 64 KiB })` it is ≈ +2–3 MB. **< 5 MB ✅** with that
  config, which is required.
- `pnpm perf` within budget in every run.

**Decision: (a) WinEvent hook + slow refresh**, koffi sync blocks reduced. Open for M1-20: the cursor-motion event
load (not measured, `OBJID_CURSOR`) needs a perf spot check; option: hook `EVENT_OBJECT_LOCATIONCHANGE` per pid of
the window under the character.
