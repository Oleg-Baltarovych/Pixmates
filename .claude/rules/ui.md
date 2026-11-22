---
paths:
  - "src/renderer/chat/**"
  - "src/renderer/settings/**"
  - "src/i18n/**"
---
# UI rules (React 19 + CSS Modules) — SPEC §6.1, §8, §9

- Components render state and call the typed preload API. No behaviour or AI logic in components; no direct Node/Electron access.
- Zustand for view state with narrow selectors; no global re-render on every stream chunk (batch chunks per animation frame).
- Chat states: idle, streaming, thinking (tool call), aborted, provider error, disabled (no key / no Ollama, with a reason and a settings link), first-run privacy disclosure.
- Keyboard: Enter sends, Shift+Enter adds a newline, Esc closes, focus trapped in modals, visible focus ring.
- Markdown: rendered without raw HTML (no `dangerouslySetInnerHTML` with model output); code blocks have copy buttons; links go through the main-process allow-list.
- Settings mirror SPEC §9. Privacy-by-default values are pre-selected. Destructive actions ask for confirmation. API key fields are write-only (show "saved", never the key).
- i18n: every user-facing string is a key in `uk.json` and `en.json`; plurals via i18next plural forms; no concatenated sentences.
- Theme: follow the Windows light/dark theme (`nativeTheme`); contrast AA; respect reduced motion.
