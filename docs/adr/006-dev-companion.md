# 006. Dev companion: local hooks endpoint + MCP server

- Status: Accepted
- Date: 2026-11-22

## Context
Many AI desktop pets exist; the existing Claude Code pets are single-purpose status indicators. Reacting to the user's AI coding agents is the product's differentiator and matches the owner's AI-native workflow (SPEC-REVIEW P-01, D-3).

## Decision
**Hooks endpoint.** A local HTTP endpoint on `127.0.0.1` (random port, per-install token) receives Claude Code hook events.
- Settings generate the hook snippet for `~/.claude/settings.json`. The user applies it; the app never edits that file silently.
- Mapped events: `PermissionRequest`, `Notification`, `Stop`, `StopFailure`, `PostToolUseFailure`, `SubagentStart/Stop`, `SessionStart`.
- Payloads are validated against fixed zod schemas, and only the needed fields are kept.

**MCP server.** A local server (`@modelcontextprotocol/server` v2) exposes `say`, `emote` and `notify`. Text from `say` is shown as a quote attributed to the agent. It is never the character's own voice and never a prompt instruction. Amendment 2026-11-28 (D-24, SPEC §7): a fourth, read-only tool `get_handoff` returns a task the user explicitly handed off from chat, once; same localhost, token and `Origin`/`Host` rules.

**Shared rules.** Both are off by default:
- localhost only, token auth;
- `Origin`/`Host` checks against DNS rebinding;
- rate limits and size limits.

**Optional.** Git state of the current repo; the last GitHub Actions run via `gh`.

## Alternatives considered
- Reading Claude Code transcripts from disk: fragile and privacy-heavy.
- TCP or a named pipe: harder than HTTP to call from a one-line hook command.

## Consequences
- Positive: a strong, demoable differentiator; reuses the core's event-priority and anti-spam logic.
- Negative: a local attack surface. Covered by the `electron-security-reviewer` review and `.claude/rules/dev.md`.
