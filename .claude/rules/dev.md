---
paths:
  - "src/main/dev/**"
---
# Dev companion rules — SPEC §7; ADR 006

- Everything here is off by default and enabled per feature in settings.
- Hooks endpoint:
  - HTTP on `127.0.0.1` only, random port, per-install token (stored via `safeStorage`), compared in constant time;
  - reject a missing or foreign `Origin` and a `Host` other than `127.0.0.1:<port>`;
  - body ≤ 16 KB; rate limit;
  - zod schemas per hook event; unknown events ignored; only needed fields kept (event name, session id hash, tool name, short status).
- The app never edits `~/.claude/settings.json` itself. Settings generate a snippet plus instructions; the user applies it.
- MCP server:
  - `@modelcontextprotocol/server` v2, Streamable HTTP on localhost (or a stdio shim);
  - same token and Origin rules;
  - tools `say`, `emote`, `notify` with bounded args.
  `say` text is displayed as a quote attributed to the agent, rate-limited, never fed back as instructions, and never spoken as the character's own words.
- Events go into the core as typed dev events. The core decides whether and how the character reacts (priority, cooldown, quiet mode).
- Git/CI:
  - read-only;
  - `gh`/`git` called via `execFile` with an argument array, no shell, timeout;
  - only allow-listed subcommands (`git rev-parse`, `git status --porcelain`, `gh run list --limit 1 --json …`);
  - polling ≥ 60 s.
- Logs never contain the token, prompts or hook payload text.
