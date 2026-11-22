# 001. Electron, Windows-only v1

- Status: Accepted
- Date: 2026-11-22

## Context
Characters live in a transparent always-on-top window and must not block clicks outside their bodies (SPEC §3.1). Precise click-through needs mouse-move forwarding while the window ignores mouse events, so the renderer can hit-test sprite alpha. The owner works on Windows and wants a desktop-only app (SPEC-REVIEW D-2).

## Decision
Electron (45.x at scaffold) with electron-vite, TypeScript and React. v1 targets Windows 11 only. Platform-specific code sits behind interfaces in `src/main/sensors/` and `src/main/services/`, so macOS can be added after v1. That covers window enumeration, fullscreen detection, autolaunch and the hooks installer.

## Alternatives considered
- Tauri v2: lighter RAM, but `setIgnoreCursorEvents` has no forward option (tauri#11461 closed "not planned"). Hit-testing would need cursor polling. It also brings Rust into a TS-first portfolio.
- Windows + macOS in v1: macOS auto-update needs a paid Developer ID, and window bounds need Screen Recording/Accessibility permissions. That doubles QA for little gain.

## Consequences
- Positive: `setIgnoreMouseEvents(true, { forward: true })`; one language end to end; mature packaging (electron-builder, electron-updater).
- Negative: higher RAM. The budget is ≤ 200 MB total (SPEC §1), measured on the packaged build with `pnpm perf`. Only the stage window stays alive.
- Follow-ups: ADR 007 (window strategy) after the M0 spike; unsigned NSIS → SmartScreen note in README.
