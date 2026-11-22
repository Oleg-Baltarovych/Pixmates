---
paths:
  - "src/shared/**"
  - "src/preload/**"
---
# IPC rules — SPEC §3.2, §10

- Every channel is declared once in `src/shared/ipc.ts`: name, direction, request/response zod schemas, size bounds, allowed windows. No string channel names elsewhere.
- Preloads expose one small typed API per window via `contextBridge.exposeInMainWorld`. They never expose `ipcRenderer`, a generic `send`/`invoke`, or Node/Electron objects.
- Main validates every incoming payload with the schema and checks the sender (window id / frame URL) before acting. Renderers are untrusted.
- Renderers get only what they need to draw: no raw sensor snapshots, no window titles unless shown to the user, no tokens or keys, no file paths outside `userData` previews.
- Streams (chat) use an id per request with explicit `abort`; main cleans up on window close.
- Errors cross IPC as typed results (`{ ok: false, code }`), never as stack traces.
- Changing a contract → update both ends + contract tests in the same change (`/ipc-channel`).
