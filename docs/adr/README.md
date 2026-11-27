# Architecture Decision Records

| # | Title | Status |
|---|---|---|
| 001 | [Electron, Windows-only v1](001-electron-windows-only.md) | Accepted |
| 002 | [Pure deterministic behavior core](002-pure-behavior-core.md) | Accepted |
| 003 | [LLM layer on Vercel AI SDK, character-first output](003-llm-layer-ai-sdk.md) | Accepted |
| 004 | [Built-in characters from a modular pixel rig, art by code](004-modular-pixel-rig.md) | Accepted |
| 005 | [Original characters only in the distribution](005-original-characters-only.md) | Accepted |
| 006 | [Dev companion: local hooks endpoint + MCP server](006-dev-companion.md) | Accepted |
| 007 | [Window strategy: stage overlay (A); RAM budget ≤ 280 MB private](007-window-strategy.md) | Accepted |
| 008 | [SQLite driver: `node:sqlite` behind `storage/db.ts`](008-sqlite-driver.md) | Accepted |
| 009 | [Character frame 48 px, style «anime soft»](009-art-frame-and-style.md) | Accepted (restored in full by 012) |
| 010 | [Rig views: front + three-quarter (3/4) for travel](010-rig-views-front-and-three-quarter.md) | Accepted (D-16); own numbers hold (011's revision void) |
| 011 | [Adult proportions for all built-in characters, frame 56 × 72](011-adult-proportions.md) | Superseded by 012 (D-20) |
| 012 | [Return to chibi 48 × 56 with a stern-look face option and a mouth-mask slot](012-return-to-chibi-stern-look.md) | Accepted (D-20, owner 2026-11-25) |
| 013 | [MCP client: user-connected tools for the in-character agent](013-mcp-client.md) | Accepted (D-24, 2026-11-28) |
| 014 | [Desktop window sensing: own Win32 calls over koffi FFI, not `get-windows`](014-desktop-window-sensing.md) | Accepted (2026-11-28; spike S4 confirms) |
| 015 | [Radial menu: a lazy transparent React window, not Pixi on the stage](015-radial-menu-window.md) | Accepted (2026-11-28) |
