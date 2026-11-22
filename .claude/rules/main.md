---
paths:
  - "src/main/**"
---
# Main-process rules — SPEC §3, §8, §9; ADR 001, 002

- Main wires sensors, timers and IPC into `src/core` and interprets its effects. It does not re-implement behaviour decisions.
- Windows (SPEC §3.1):
  - the stage window is always alive;
  - the chat window is lazy and hidden on close;
  - the settings window is created and destroyed each time.
  Every window uses the hardened `webPreferences` from `windows/secure.ts` (single factory; no ad-hoc `new BrowserWindow`).
- Sensors:
  - system every 2–5 s;
  - window bounds on change or every 1 s while a character is on a window surface;
  - cursor at 30 Hz only while near a character;
  - everything paused in `hidden`/`sleep` except what wakes the character.
  Never poll in a tight loop. Platform-specific code sits behind interfaces (`sensors/*.ts` + `*.win32.ts`).
- Privacy defaults are enforced at the sensor level: no window titles unless allowed; the clipboard only on explicit user action; no IP addresses.
- Lifecycle: single-instance lock. On `before-quit`, clear intervals, close servers, flush storage, destroy windows. Handle `display-added/removed/metrics-changed`, `suspend`/`resume` and `lock-screen`.
- Storage:
  - `electron-store` for settings (schema-validated);
  - SQLite for history, memory and stats, through `storage/db.ts` only;
  - migrations via `/db-migration`;
  - writes off the hot path.
- Secrets: API keys only through `safeStorage` (`storage/secrets.ts`); never logged, never sent to renderers.
- Errors: log with context but without secrets or personal text. A sensor failure degrades the feature and never crashes the app.
- ESM: `electron-store` and `get-windows` are ESM-only; `systeminformation` is CJS. Respect electron-vite main build settings.
