# 005. Original characters only in the distribution

- Status: Accepted
- Date: 2026-11-22

## Context
The owner considered bundling popular anime characters. A pixel version of a protected character is still a derivative work. A public repo and installer would infringe copyright, invite DMCA takedowns and weaken the portfolio story.

## Decision
- Only original characters go into the repository, builds, README, screenshots and release assets.
- Archetypes are fine. Signature traits of existing characters are not: costume details, symbols, names, catchphrases.
- Agents never generate or edit art or persona text for protected characters.
- Users may import any pack for personal use. Personal packs live in `skins-local/` (git-ignored). The `guard-paths` hook blocks agent writes there, and builds never include it.

## Alternatives considered
- Bundle fan art: legal and reputational risk.
- Disable import: kills customization without reducing our risk.

## Consequences
- Positive: safe to publish; clear authorship.
- Negative: no "famous face" shortcut — the characters must be good on their own.
