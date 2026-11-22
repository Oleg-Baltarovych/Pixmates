---
paths:
  - "electron-builder.yml"
  - ".github/workflows/release*.yml"
  - "src/main/services/updater.ts"
  - "src/main/services/autolaunch.ts"
  - "build/**"
---
# Release rules — SPEC §2, §12 (M6), §14; ADR 001

- Target: Windows NSIS (x64; arm64 when tested). `appId` is `com.pixmates.app`, fixed after the first public release.
- Versioning: SemVer, tag `vX.Y.Z`, `CHANGELOG.md` updated in the release PR.
- Auto-update:
  - `electron-updater` with the GitHub provider;
  - checks on start and every 6 h, can be disabled in settings;
  - download in the background, install on quit;
  - never forced mid-session.
  Pre-releases only on an opt-in channel.
- Unsigned in v1: the README explains the SmartScreen prompt. A signing certificate, if added, is used only in CI via secrets and never committed (`guard-paths` blocks `*.pfx`/`*.p12`).
- Release workflow:
  - runs on a tag;
  - build job with `contents: read`, publish job with `contents: write`;
  - artifacts are the installer, `latest.yml` and blockmap;
  - checksums in the release notes.
- Publishing (`electron-builder --publish`, `gh release create`) only after `/release-check` is READY and the user explicitly approves.
- Autolaunch: off by default, toggle in settings; uses the login-item API; removed on uninstall.
