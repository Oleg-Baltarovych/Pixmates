---
name: ipc-channel
description: Add or change a typed IPC channel end to end — zod contract in src/shared/ipc.ts, minimal preload API, validated main handler with sender check, renderer usage, contract tests.
argument-hint: "<channel, e.g. 'focus:start'>"
---
# IPC channel: $ARGUMENTS

1. Read `.claude/rules/ipc.md` and the existing contracts in `src/shared/ipc.ts`.
2. Contract: in `src/shared/ipc.ts`, define the name, direction (invoke/handle, main→renderer event, or stream), request and response zod schemas, size bounds, and which windows may use it (stage, chat, settings).
3. Preload: expose one named, typed function on the window's API (`src/preload/<window>.ts`). Never expose `ipcRenderer`, generic `send`/`invoke`, or channel names as parameters.
4. Main handler:
   - verify the sender (window id / frame URL allow-list);
   - `schema.parse` the payload;
   - call the service or the core input;
   - return a schema-valid response.
   Errors become typed error results; stack traces never reach the renderer. No raw paths, URLs or commands from the renderer reach fs, shell or `openExternal`.
5. Renderer: use the typed API only, and handle the loading and error states.
6. Tests: the contract accepts valid and rejects malformed or oversize payloads; the handler rejects a wrong sender; round trip through the typed API where practical.
7. Run `pnpm typecheck && pnpm test`, then `/review` (`electron-security-reviewer` routed).
