---
name: new-character
description: Add a built-in original character end to end — rig parts and palette, signature animations, manifest, persona and uk/en lines, activities, eval cases — and get art and AI sign-off.
argument-hint: "<roster id from SPEC §5.3, e.g. 'witch'>"
---
# New character: $ARGUMENTS

1. Read SPEC §5.3 (the roster row), `docs/art/` (art bible, rig spec) and an existing character in `assets-src/characters/` and `src/content/characters/` as the template.
2. **Originality gate** (ADR 005): restate the archetype in one line and list 3 visual traits that make it ours. If any trait matches a well-known protected character, change it before drawing.
3. **Art**, via `/sprite`:
   - parts for every rig slot (or slot variants: wheel, tail, cloak, wings);
   - palette ramp;
   - 3–5 signature animations;
   - check every shared animation on the new body.
   `art-director` must reach ✅.
4. **Manifest**: animations, fallbacks, `emotions` (must match the available animations), activities with conditions and weights.
5. **Content**: launch `persona-designer` for:
   - the persona;
   - `lines.uk` and `lines.en` (greetings, switch-in/out, reactions, focus, dev events);
   - activity weights;
   - eval cases (in-character, tool use, injection).
6. Wire the character into the registry and settings list. Add a content-integrity test: every referenced animation, emotion and line key exists in both languages.
7. Run `pnpm sprites`, `pnpm test`, `pnpm eval --provider mock`, and `/perf` with this character active.
8. Run `/review` (art-director, ai-reviewer, code-reviewer will be routed). Report: sheet and screenshots, sample lines, eval scores, perf numbers.
