---
paths:
  - "src/main/characters/**"
  - "tests/fixtures/packs/**"
---
# Character pack rules — SPEC §5.1, §10; ADR 005

- Runtime sees one format: `manifest.json` + sprite sheets (+ optional sounds, lines). Built-in characters are generated into this format; imported packs arrive in it (or as a single GIF/APNG → auto-pack).
- Import pipeline, in order:
  1. size check (≤ 50 MB);
  2. unzip into a temp dir with zip-slip protection (resolved path must stay inside the target), no symlinks, no absolute paths;
  3. file-type allowlist by magic bytes (png/webp/gif/ogg/mp3/json);
  4. zod-validate the manifest;
  5. texture limits (≤ 4096 px side);
  6. move to `userData/characters/<id>`.
  Any failure → reject with a typed reason and clean up the temp dir.
- No executable content: packs never contain JS/HTML. Manifest strings (`name`, `author`, `persona`, lines) are untrusted text: length-limited, rendered as text, delimited in prompts.
- Ids are namespaced (`com.author.name`); built-ins use the `pixmates.` prefix and cannot be overwritten by imports.
- `skins-local/` is the owner's personal folder: git-ignored, never bundled, never written by agents.
- Tests: valid pack, zip-slip, symlink, oversize texture, wrong magic bytes, malformed manifest, id collision with a built-in.
