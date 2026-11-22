# 007. Window strategy: stage overlay (A) vs per-character window (B)

- Status: **Accepted** (owner, 2026-11-23: A looked clearly smoother in the side-by-side walk check; budget ≤ 280 MB private approved)
- Date: 2026-11-22 (accepted 2026-11-23)

## Context
SPEC §3.1 left two options open. **A** is one transparent, click-through overlay over the work area. **B** is a small transparent window sized to the sprite, moved by main while the character walks. Spike S1 measured both on the packaged build (`docs/plans/spikes/s1-windows.md`). Spike S3 measured software compositing (`docs/plans/spikes/s3-gpu.md`). The plan's rule picks **A** unless A fails click-through or drag, or its idle CPU is worse than B's by more than 0.5 pp. A tie goes to A, because FX and speech bubbles then need no extra windows.

Measured on the owner's laptop (Ryzen 7730U iGPU, 125 %, 1536×816 DIP work area, one placeholder at 128×128 DIP):

| | CPU idle | CPU walk | Private sum idle | WS sum idle | gpu-process private | Walk p95 (quiet) |
|---|---|---|---|---|---|---|
| A | 0.44 % | 0.84 % | 250 MB | 354 MB | 124 MB | ~17–21 ms |
| B | 0.38 % | 0.61 % | 185 MB | 354 MB | 58 MB | 17.6 ms (rAF driver) |
| A, compat | 0.22 % | **15.9 %** | 184 MB | 447 MB | 57 MB | 18–21 ms |
| B, compat | 0.36 % | 0.64 % | 144 MB | 321 MB | 20 MB | 17.9 ms |

- The idle CPU difference is 0.06 pp, so the rule gives **A**.
- **A costs about 66 MB more private memory**, all of it in the GPU process: the work-area-sized transparent surface. This grows with display resolution.
- None of the RAM levers moved memory beyond noise: `--renderer-process-limit=1`, `--js-flags=--max-old-space-size=64`, the cookie-encryption fuse, warm vs fresh profile.

## Decision
**A — stage overlay on the work area.** It follows the S1 rule, and the owner saw clearly smoother walking than the spike's B. Click-through, drag and transparency were confirmed by the owner on M0 (overlay = A).
- **Memory budget metric (approved):** the idle budget is checked on the **private-bytes sum, avg** over all processes. Working set is reported but not gated: it double-counts shared pages and sits at ~350 MB in every mode.
- **Value (approved): ≤ 280 MB private-bytes sum** at idle with one character. That is measured A 250 MB plus about 30 MB headroom for the M1 rig atlas. SPEC §1 currently says ≤ 200 MB, which A cannot meet.
- Rejected alternative budget: keeping ≤ 200 MB would have forced B (185 MB, 15 MB headroom).
- Compat mode with A must not walk at full-overlay redraw cost (15.9 % CPU). Before M1 walking ships, limit the redraw region or cap the FPS in compat mode, or document the cost.
- Pixi `maxFPS = 60` skips vsyncs on 60 Hz panels (33 ms gaps). M1 uses an uncapped ticker with its own throttle.

## Alternatives considered
- **B, per-character window:** less RAM, cheap in compat mode, smoothness equal to A when driven by rAF. Costs:
  - extra windows for FX and bubbles;
  - a renderer→main move message every frame;
  - Windows quirks found in the spike: main-process timers tick at 15.6 ms, so a timer-driven B ran at ~31 ms intervals; `setPosition` at 125 % drifts the window size, so B needs `setBounds` with a fixed size;
  - drag must be rAF-driven too.
  It becomes the decision if the 200 MB budget stands or A fails the checklist.
- **A with a smaller overlay** (only the band around the character): not measured. It would keep one window and cut GPU memory, but it brings back B's moving-window problems.

## Consequences
- SPEC §1 and §3.1 are updated with the approved metric and value. `tools/perf.ts` gates on private bytes with that value.
- CONTEXT gotchas:
  - `getGPUFeatureStatus` does not predict WebGL availability or electron#40515;
  - `capturePage` alpha is not proof of desktop transparency;
  - the A overlay's GPU memory scales with work-area size.
- `--compat-mode` stays a manual switch (M0-10 flag, M5 settings toggle).
