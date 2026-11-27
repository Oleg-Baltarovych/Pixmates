# Pixmates — Working Context

> Current state only; update it in the commit that changes structure, systems, commands or decisions.
> Finished narratives go to `docs/CONTEXT-HISTORY.md`.
> Last updated: 2026-11-28 (D-24 accepted: ADR 013, milestone order, v1 wow scope; SPEC v1.18).

## 1. Status
- **M0 ✅** (spikes S1–S3 on unmerged `spike/*` branches). **M-ART ✅ accepted by qa-lead 2026-11-28** (with follow-ups: packaged smoke look, perf re-run before M1) on `feat/m-art` (draft PR #4), plan `docs/plans/2026-11-23-m-art.md`. SPEC v1.18, ART-BIBLE v1. MVP for the portfolio = M0 + M-ART + M1 + M2.
- **Art direction (D-20, ADR 012; supersedes D-19 / ADR 011):** chibi, frame **48 × 56** with headroom, «anime soft» (ADR 009), `scaleRef` 48, clamp 0.25 + L 176 DIP (S/M/L ×3/×4/×5 at 1080p/125 %, ×2/×3/×4 at 100 %). Views `front` + `q34` (ADR 010).
- **Roster v1 = 8 (D-18):** signed off — `maid`, `kitsune` (fox-girl ninja; originality re-check MA-28r PASS), `witch`, `goth` (stern face, MA-64), `ronin` (armoured samurai, red menpō with a black dragon, MA-65), `coder` (stern, black `cloth_onyx` hoodie with the hood always up, steel glasses, mustard hood edge + drawstrings + badge `>_`, badge on a steel chain, D-21, MA-66; open polish: hood shade edge on dark needs a per-part outline opt-in → MA-69), `knight` (D-22, MA-67), `vampire` (MA-68, D-23: variant A + C's fan collar + a widow's peak; only user of `back: 'cloak'` + `neckAcc: 'collar'` + `jawOverNeckAcc` (MA-33 walk cheek shimmer fix; q34 cheek rim softened to skin 5 in his own mask); `cloth_midnight`; as built `docs/art/vampire.md` §9; tests `vampire.test.ts`, `vampire-palette.test.ts`). Costume richness passes for maid/kitsune/witch after M1 (Q-D20-2).
- **MA-67 knight ✅ (owner sign-off 2026-11-27 after AD round 1, D-22):** variant B (owner pick 2026-11-27) — human chibi in full `metal_silver` plate, great bascinet with a hounskull visor lowered per animation (`VISOR_DOWN_IN`, `Body.visor`, `Body.gauntlets`; rule `docs/art/knight.md` §1), mail camail + mail hem, `cloth_emerald` sash (baldric + panel) and eyes, sword at the hip; normal face. Owner fix 2026-11-27: calm camail (5 rows, ≤ 28 px, sparse rings, clean silver-1 hem; tested). As built: `docs/art/knight.md` §7; tests `knight.test.ts`, `knight-palette.test.ts`.
- **MA-30 ✅ (agents; owner look at dev + packaged pending in MA-33):** the stage loads `pixmates.<id>` (default `maid`, `--character=pixmates.<id>` for the others; unknown id → default + warning; no valid pack → `[characters]` error, empty stage, no fallback art). Placeholder gone (`placeholder-art.ts`, `content/placeholder.ts`, `FRAME_HEIGHT_PX`, `placeholderScale`); the M0 core plays `idle_a`/`drag`; a click picks `happy`|`wave` in core but shows nothing on screen until M1 (main drops `PlayAnimation`). Tray icon = head crop of the active built-in's idle frame from the figure's top opaque row (≥ 32 art px, widened for ears/hats, shown at 16 DIP; `services/tray-icon.ts`), read contained + size-capped and checked against the registry's IHDR size (`CharacterPack.atlasSize`); any failure → empty icon + `[tray]` log. The stage keeps the actors that loaded and reloads only when the pack set changes. Packaged guard: `tests/unit/main/builtin-packs.test.ts` + CI layout check.
- **MA-31 ✅:** art spike gone (`assets-src/spike/`, `spike-*` packs + lock entries, blind key `dev/lineup.ts`, `--perf-spike`; L4 closed); the registry lists `pixmates.*` only, dev and packaged. Dev lineup `pnpm dev -- --art-lineup=maid,goth,kitsune,witch` (roster or pack ids, ≤ 4, labelled A–D in order; > 4 / unknown / duplicate / repeated flag / packaged → `[characters]` error, solo stage). `pnpm perf -- --character=<id>` measures a built-in (checked against the unpacked build). Both normalize ids with `toBuiltinId` (`src/shared/pack.ts`). Every pack is shelf-packed (rows layout and `PackDef.layout` removed). Dummies' masks: `assets-src/rig/preview-masks.ts`.
- **MA-32 ✅:** `tests/unit/main/builtin-integrity.test.ts` checks every animation, fallback target and emotion of the 8 packs through the registry (shared roster and temp packs in `tests/fixtures/builtin-packs.ts`). Perf ×8 on AC, all within budget: CPU 0.25–0.57 %, private avg 213–264 MB (maid 263.7 MB leaves 1.3 MB of headroom under 265). Table in the plan, MA-32.
- **MA-69 ✅:** D-19 opt-in cleanup; polish opt-ins, each changing only its pack: coder hood outline + jeans seat, kitsune rose tail ribbon (`FoxTail.ribbon`, owner 2026-11-24), knight greaves / camail hem tone 1 / breastplate seam (`Body.greaves`, `head.hemTones`), vampire cloak taper (`Cloak.widths.taper`). Art-director re-gate done (coder/vampire PASS; kitsune ribbon → rose 2 f945421, knight sabatons 14075d3), owner signed off in MA-33.
- **MA-33 ✅ (owner, real overlay, 2026-11-27):** all 8 signed off, all 6 checks ✅ (`docs/plans/ma-33-owner-session.md`). Owner fixes: ronin menpō full head width (292a735), knight calm camail (c011e68), vampire steady jaw outline + softer q34 cheek rim (b2a33d0, d3f12c1). Ronin `happy` bare face by design. Dev cycle (`--art-lineup` / `--anim-cycle`) = `DEV_ANIM_CYCLE` in `content/stage.ts`; the stage mirrors a sided animation about the foot pivot (`renderer/stage/facing.ts`). Docs closed: ART-BIBLE v1 (§13 cast-build rules), SPEC v1.16 §5.2 (cast as built) / §12.
- **README showcase ✅ (2026-11-28):** portfolio `README.md` (cast, art as code, architecture, practice); media in `docs/media/` from `pnpm showcase` (`tools/showcase.ts`, `tools/lib/{showcase,gif}.ts`, tests `tests/unit/tools/{showcase,gif}.test.ts`, test-only decoder `tests/fixtures/gif-decode.ts`).
- **Next:** PR #4 merge prep, then M1. Art gates for any later change: other packs unchanged (`assets-src/sprites.lock.json`), ≤ 2 art-director rounds, owner sees round 1; every character checked against the whole lineup (ART-BIBLE §12 p. 5).
- **D-24 ✅ (ADR 013 accepted):** MCP client for user-connected servers, part of v1. Order M1 → M2 → M4 → M-MCP → M3 → M5 → M6 (approved). M2 builds the tool registry with `source` + core `decideToolCall`. CLAUDE.md tool rule amended (480ba45). **v1 wow scope (SPEC v1.18):** "explain this error" from the clipboard (M2, §6.1) · "why is CI red?" via `gh run view --log-failed`, tool `get_ci_failure` (M4, §7) · handoff to Claude Code: `draft_handoff` → user "Передати" → `get_handoff` on our MCP server, table `handoffs` (M4, §7) · morning brief, calendar + GitHub, `auto` read tools only, opt-in (M-MCP, §6.8). Voice post-v1; MCP OAuth = M-MCP step 2. **D-25:** provider presets Ollama / Haiku 5.5 / Opus 5.5 with cost hints as dated `src/content/` data, plus an M2 cost meter.
- Owner decisions D-1…D-25 (`docs/SPEC-REVIEW.md`): Windows 11 only; Dev companion in v1 (M4); one active character, switchable; layer on-top / desktop-only, hotkey `Ctrl+Alt+P`, appId `io.github.oleg-baltarovych.pixmates`; default ≈ 136 DIP, integer physical scale; all art by code. Post-v1 backlog: `golem`, `corsair`, `salamander`, `robot`, `glitch`.
- Repo: public `github.com/Oleg-Baltarovych/pixmates`; commits from the GitHub noreply address (repo-local `user.email`); LF via `.gitattributes`.

## 2. Repo map (SPEC §11; ✅ = exists)
```
src/
  core/ ✅     pure behavior (M0: types, rng, step, scale) → engine, states, priorities, physics, mood, throttle, focus, activities, switch
  content/ ✅  data (stage numbers incl. WALK_TRAVEL) → characters/<id>/{persona,lines.uk,lines.en,activities}, reactions
  main/ ✅     index, app/{lifecycle,launch-guard}, windows/{secure,paths,manager,app-protocol}, ipc/handle, stage/controller,
               characters/{registry,selection}, services/{hotkeys,tray,tray-menu}, i18n, dev/capture → ai/, dev/, storage/
  preload/ ✅  stage, chat, settings (contextBridge only)
  renderer/ ✅ stage/ (Pixi), chat/ (React), settings/ (React)
  shared/ ✅   ipc.ts + ipc-channels.ts (zod-free names), pack.ts (manifest schemas, facingOf), anim.ts, app.ts, windows.ts
  i18n/ ✅     locales/{uk,en}.json (flat keys)
assets-src/ ✅ palettes/master.json, lib/ (art lib), rig/, characters/<id>/, fx/, packs.ts, sprites.lock.json
               → `pnpm sprites` → resources/{characters/<id>,fx}/ (generated, git-ignored, never edit)
tools/ ✅      build-sprites, sprites-sheet, sprites-lock, sprites-compare, rig-contrast, perf, showcase;
               lib/{png,gif,sprites,sprite-outputs,sprite-compare,showcase,canvas,cli,git-tree,csp,perf-args}.ts; eval.ts (M2)
tests/ ✅      unit/{core,main,renderer,shared,lint,art,tools}, fixtures/ → e2e/ (M6)
docs/ ✅       media/ (README images, generated by `pnpm showcase`), SPEC.md, SPEC-REVIEW.md, CONTEXT.md, CONTEXT-HISTORY.md, AI-WORKFLOW.md, adr/, plans/, art/ (ART-BIBLE, RIG, <id>.md)
skins-local/   owner's personal packs — git-ignored, agents never write here
.claude/ ✅    agents/, skills/, rules/, hooks/, settings.json
```

## 3. Systems (SPEC §12)
| System | Milestone | Status |
|---|---|---|
| scaffold, typed IPC, hardening, CI, `pnpm perf`, spikes S1–S3 | M0 | ✅ `src/main/windows/`, `src/shared/ipc.ts`, `src/core/`, `tools/perf.ts`, ADR 007/008 |
| palette, rig, 8 characters, FX, pack pipeline, stage loads packs | M-ART | ✅ final, qa-lead accepted 2026-11-28: 8/8 signed off on the real overlay (MA-33), stage loads packs (MA-30), spike removed (MA-31), integrity + perf ×8 (MA-32); `assets-src/`, `tools/build-sprites.ts`, `src/shared/pack.ts`, `src/main/characters/`, `stage:characters` IPC, `docs/art/` |

Not started (scope in SPEC §12; order D-24): M1 core behaviour, physics, surfaces, switch, tray · M2 AI service, tools, memory, evals, cost meter, explain-error chip · M4 Dev companion (hooks, MCP server + `get_handoff`, git/CI + CI-red explain, handoff) · M-MCP MCP client (ADR 013) + morning brief · M3 sensors, quiet mode, reactions, Pomodoro · M5 pack import, settings, uk/en · M6 NSIS, auto-update, e2e, release.

## 4. Key decisions (`docs/adr/README.md`)
- 001 Electron, Windows-only v1, platform code behind interfaces. 002 pure deterministic core, effects interpreted by main.
- 003 Vercel AI SDK 7, structured `{say, emotion, action?}`, templates first, LLM optional, evals.
- 004 built-in characters from a modular rig, art by code, art-director gate; roster capped at 8 (4 female, 4 male). 005 original characters only; personal packs in `skins-local/`.
- 006 Dev companion: localhost hooks + MCP, off by default, token + Origin checks.
- 007 overlay on the work area; RAM = private-bytes sum avg ≤ 280 MB. 008 `node:sqlite` behind `storage/db.ts` (better-sqlite3 fallback).
- 009 frame 48 + headroom, anime soft. 010 views `front` + `q34` (facing right, left = runtime mirror; q34 for `walk`, `turn`, M1 `run`, `climb`); manifest per-anim `facing`. 011 adult proportions — superseded by 012 (chibi 48 × 56, stern face option, mouth-mask slot, costume richness).
- 013 (accepted) MCP client: `@modelcontextprotocol/client`, stdio + Streamable HTTP, every server untrusted, tools `off`/`ask`/`auto`, per-call confirmation with exact args, taint rule, fingerprints, ≤ 6 steps with MCP.

## 5. Gotchas
**Electron / app**
- `ELECTRON_RUN_AS_NODE=1` is set in VS Code / Claude Code shells: run `env -u ELECTRON_RUN_AS_NODE pnpm dev`. Packaged builds ignore it (RunAsNode fuse off).
- `electron@45` has no install script: the first `require('electron')` downloads the binary (or `pnpm exec install-electron`). `allowBuilds` only denies `electron-winstaller`.
- Preloads are forced to CJS (`[name].cjs`, `isolatedEntries`, `externalizeDeps: false`): sandboxed preloads cannot load ESM. They import channel names from zod-free `shared/ipc-channels.ts`.
- Vite pre-bundling reloads on the first dev run; `optimizeDeps.include` lists pixi/react.
- `screen`, `Tray`, `globalShortcut` only after `app.whenReady()`. The stage subscribes to `onCharacters` before any `await`.
- Pages load from `app://renderer/<role>/index.html` (never `file://`); `app://` reads go through `readContainedFile`; the characters host (`windows/app-protocol.ts`) serves only registered atlases, with CORS for `app://renderer` + the dev origin; CSP `img-src`/`connect-src` include `app://characters`. Fuses: `GrantFileProtocolExtraPrivileges` off, `EnableCookieEncryption` on.
- Lifecycle via `app/lifecycle.ts`; packaged builds quit on `--remote-debugging-port`/`--inspect*`. Single-instance lock is per userData: use `--user-data-dir=<temp>` beside a running `pnpm dev`.
- Overlay GPU memory scales with work-area size. Main timers tick at 15.6 ms → per-frame motion via renderer rAF; `setBounds`, not `setPosition`, at 125 %; Pixi `maxFPS = 60` skips vsyncs (M1: own throttle). Black instead of transparency on some GPUs (electron#40515) → `--compat-mode` (+ walking ≈ 16 % CPU).
- Stage: named Pixi imports, `skipExtensionImports: true`, plain DOM input; canvas = exact device-pixel box (`device-pixel-content-box`). Check scales with `pnpm dev -- --character=pixmates.<id> --force-device-scale-factor=1|1.25 --capture-stage=<dir> --user-data-dir=<temp>` (the dev box is natively 125 %; `stage-capture.json` sizes are device px). Never screenshot the whole desktop.
- `pnpm perf` writes `reports/perf/<date>-<character>.md` (`-default` without `--character`; a same-day rerun of one character overwrites its own report); `--skip-build` reuses `release/win-unpacked` (rebuild first if it predates your change). Flags are strict, `=` form only: unknown flag, bad value, repeat or `--character maid` → usage error, exit 2.
- `node:sqlite` has no `transaction()` (wrapped in `storage/db.ts`). Use `get-windows` (not `active-win`); `electron-store` 12 is ESM-only. Read `node_modules/ai/docs` before AI code.

**Art tooling**
- `pnpm sprites [<id>…]` (deterministic; `pnpm build` runs it; validates manifests; does not prune stale pack dirs). `pnpm sprites:sheet [<id>] [--review|--fx|--real|--lineup|--swatch]`, `pnpm sprites:preview` (real-size APNGs, mirrored for `facing` ≠ front) → `reports/sprites/`. Dev flags `--character=pixmates.<id>`, `--anim-cycle`, `--art-lineup=<ids>` (≤ 4; both play `DEV_ANIM_CYCLE`). `--capture-stage` shoots once at 4 s (still `idle_a`); for a mid-cycle check patch the delay locally, don't commit it. `pnpm perf -- --character=<id>`. `sprites:sheet --lineup` → `reports/sprites/lineup-real-size.png`.
- **Fingerprint:** `assets-src/sprites.lock.json` = SHA-256 per output file; `pnpm test` fails, naming the pack, when a pack drifts. Intended change → `pnpm sprites:lock`, commit the lock diff. No hand SHA-256 checks.
- **Before/after:** `pnpm sprites:compare <id> [--base <ref>] [--frames anim[:frame],…]` → `reports/sprites/<id>-compare-x{1,4,10}.png`. Don't write throwaway review scripts. Old and new rows of an unchanged pack are byte-identical; if they look different, the image viewer is downscaling the sheet (judge at x1 or crop).
- `node tools/rig-contrast.ts [<body id>]` = arm-over-torso numbers (also in `rig.test.ts`). `python3` is the Windows Store stub — use `python`. Long bash heredocs with template literals fail to parse here: write the script with the Write tool.
- **README media:** `docs/media/` is committed output of `pnpm showcase` (refuses atlases that differ from the lock). After an intended pack change rerun it and commit the media with the lock diff. GIFs are transparent, one global palette (≤ 255 colours + transparent, the master palette has 234), disposal = restore background.
- `pnpm dev` / `dev:cycle` run `pnpm sprites` first (≈ 3 s for all packs, under the plan's 5 s cache threshold: no input-hash cache). `extraResources` ships `pixmates.*/**` only.

**Rig rules** (full catalogue: `docs/art/RIG.md`; per-task notes in CONTEXT-HISTORY)
- Determinism: `assets-src/` uses seeded hashes, integer math and + − × ÷ / sqrt only (no sin/cos/pow into output).
- Code map: `rig/compose.ts` (renderer + `createRigPack`), `rig/validate.ts`, `rig/chains.ts`, `rig/passes.ts`, `rig/part-ids.ts` (`PART_ID`), `rig/views.ts`, `rig/faces/stern.ts`. Opt-in tests on dummies: `tests/unit/art/rig-optins.test.ts`.
- Masks are stamped over procedural parts: raised hands stay outside the head mask (x ≤ 10 / ≥ 38). Seam closer fills enclosed gaps ≤ 3 px and the outline is 4-neighbour → notches must be ≥ 3 px and open. Keep ≥ 1 skin row between fringe tips and the lash. `computeScale` clamps on `refH`.
- q34: per-frame `PoseFrame.view`/`headView` is the only view source; manifest `facing` = `animFacing()`; a body without `views.q34` fails when a pose uses q34. Walk is q34 only, planted foot slides 2 px/frame = `WALK_TRAVEL` (20 native px/s — M1 must travel at exactly this). q34 head must not jut ahead of the torso.
- Stern face (`face.style: 'stern'`): `validateFace` → `sternProblems`; blush only on happy + petted; an emotion eye must break the lid (lid off the iris or ≠ 3–4 iris rows). The kit's open mouths use trim `t` as the interior — override them when the body's trim slot is not a mouth tone (coder: mustard → rose `f`). Headwear/glasses in a head mask: face parts stamp over the head, so keep every expression part off the frame px (coder test).
- Hood / no back hair: an empty authored `masks.hairBack` (`{ mask: [], at: [0, 0] }`) suppresses the procedural back-hair mass (coder, both views).
- The outermost px of a figure is the rig outline: `silhouetteOutline` tones apply per ramp to the whole body, so a mask cannot retone it locally. Rim light runs after the locked tones and lifts the inner px on right-facing edges by +2. To get a lighter shade-side edge on one part (the coder hood), author that px 2 steps under the target.
- `Body.torsoMask` stamps on every non-arm px (empty ones too): a flat authored chest (coder) beats cloth dither on a 12-px torso; frame row = figure row + 8. Mouth mask (`Body.mask`): `mouthMaskProblems`; review bodies `rig-dummy-stern`, `rig-dummy-masked`. Author each mask row to the full head width on its rows (ronin, 2026-11-27): a narrower row leaves jaw skin + a skin outline beside it.
- Visor (`Body.visor`, D-22): state per animation frame (`downIn`), not per expression; lowered = no face parts, the down mask must cover every head skin px, slit glints per expression. Author visor masks in head-mask coordinates (`at` = the head's `at`). Never with `Body.mask`.
- Collar (`neckAcc: 'collar'`, R-V2 `COLLAR_MAX`): per frame ≤ 27 × 9, cols inside 11..37, top under the open eyes — head bob and idle sway count. `Cloak.lining.inset` keeps the gold corners off the silhouette edge.
- Open: `legRim` px are not locked (outline/AA retone 418 witch px; locking = visible witch change).

## 6. SPEC section index (`docs/SPEC.md`)
§0 principles · §1 goals/non-goals, budgets · §2 stack · §3 architecture (3.1 windows, 3.2 IPC, 3.3 render budget) · §4 behavior (4.1 state machine + priorities + anti-spam, 4.2 physics/surfaces, 4.3 activities + cursor, 4.4 character switch, 4.5 mood) ·
§5 characters (5.1 pack format, 5.2 rig, 5.3 roster) · §6 AI (6.1 UX, 6.2 text + body, 6.3 providers, 6.4 built-in tools, 6.5 prompt/memory/security, 6.7 evals, 6.8 MCP client) · §7 Dev companion · §8 non-AI features · §9 settings · §10 privacy & security · §11 structure · §12 milestones · §13 risks · §14 v1 acceptance.
