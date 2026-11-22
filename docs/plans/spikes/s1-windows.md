# Spike S1 — window strategy A (work-area overlay) vs B (sprite-sized moving window)

Date 2026-11-22 · branch `spike/s1-windows` (throwaway, from b47ff92) · agent numbers; owner checklist pending.

## Setup
- Machine: Ryzen 7 7730U (Radeon iGPU only, AMD 0x1002:0x15E7), 16 threads, 16 GB, Win 11 26200, AC power, 125 % (work area 1536×816 DIP).
- Packaged `release/win-unpacked` (fuses on), fresh temp profile, `--perf-seed=1`, one placeholder (M preset, scale 5 → 128×128 DIP).
- Switches: `--window-mode=a|b`, `--scenario=idle|walk`, `--b-driver=raf|timer`, `--compat-mode`; `pnpm perf` passes them (+ `--pass=<switch>`, `--profile=<dir>`, `--exe=<path>`, `--label=`).
- Idle: 20 s warm-up + 60 s at 1 Hz. Walk: 10 s warm-up, then 1000 DIP left and back at 100 DIP/s for 57 s, measured 60 s.
- A walk: Pixi ticker (maxFPS 60) moves the sprite. B walk (`raf`): renderer rAF → offset message → main `setBounds` (integer DIP); the renderer does not re-render.
- Noise: S2's benchmark and other electron.exe processes were running at the same time. Each config ran twice, A-idle three times.
- Raw data: `reports/spikes/<label>.json|.jsonl`, `reports/perf/2026-11-22-<label>.md`.

## Results (avg of runs; CPU % of all cores; MB)
| Config | CPU avg / p95 | Private sum | WS sum | gpu-process priv | browser priv | renderer priv | utility priv |
|---|---|---|---|---|---|---|---|
| A-idle (×3) | 0.44 / 0.72 | 250.4 | 354.2 | 124.0 | 82.3 | 32.3 | 11.7 |
| A-walk (×2) | 0.84 / 1.33 | 257.2 | 366.0 | 125.2 | 83.9 | 36.5 | 11.7 |
| B-idle (×2) | 0.38 / 0.67 | 184.5 | 353.7 | 57.8 | 82.2 | 33.0 | 11.6 |
| B-walk raf (×2) | 0.61 / 1.04 | 187.9 | 358.3 | 59.1 | 83.7 | 33.4 | 11.8 |
| B-walk timer (×1) | 0.61 / 1.26 | 187.4 | 355.8 | 59.0 | 84.1 | 32.5 | 11.8 |

- **Idle CPU: A − B = +0.06 pp**, far below the 0.5 pp limit in the S1 rule.
- **RAM: A uses about 66 MB more private memory than B, almost all in the GPU process** (124 vs 58 MB). That is the cost of the transparent, work-area-sized GPU surface. It grows with display size. WS sums are equal, because WS double-counts shared pages.
- Both modes run 4 processes (browser, gpu, utility network, one renderer). The browser process takes about 82 MB in every mode.

## Smoothness (frame/move intervals, ms)
| Config | p50 | p95 | p99 | max | gaps > 33 ms (of ~3300) |
|---|---|---|---|---|---|
| A-walk run 1 / 2 | 16.7 / 16.7 | 33.3 / 21.0 | 43.6 / 34.1 | 62.7 / 48.5 | 178 / 86 |
| B-walk raf run 1 / 2 | 16.65 / 16.65 | 23.4 / 19.9 | 48.0 / 38.3 | 55.9 / 55.5 | 133 / 62 |
| B-walk timer | 18.4 | 31.4 | 31.8 | 32.9 | 0 (but only 2626 moves: ~44 Hz) |
| B-walk raf, quiet machine (smoke, 10 s) | 16.67 | 17.6 | 18.1 | 18.3 | 0 |

- Run 1 vs run 2 shows that the gaps track background load (S2 bench) more than the window mode. A and B are comparable. Both meet the plan's "p95 ≤ 20 ms" bar on a quiet machine.
- A: Pixi `maxFPS = 60` on a 60 Hz panel occasionally skips a vsync (delta slightly under 16.67 ms), which gives the 33 ms gaps. Use `maxFPS = 0` with own throttling, or a cap a bit above the refresh rate (M1).
- **B gotcha 1: main-process timers tick at the Windows 15.6 ms granularity.** `setInterval(1000/60)` fired every 28–31 ms (two ticks). `setInterval(15)` gave 18–28 ms, depending on which other apps had raised the system timer resolution. So **B must be driven by the renderer's rAF**, not by a timer in main.
- **B gotcha 2: `setPosition` at 125 % drifts the window size** (128 → 359 DIP wide after 10 s of walking). Use `setBounds({x, y, width, height})` with a fixed size (drift ≤ 1 DIP).
- B drag (spike): main polls `screen.getCursorScreenPoint()` every 15 ms, so expect visible lag at 125 %. A production B drag would be driven by rAF too.

## RAM levers (A-idle, one run each; baseline A-idle 249–252 MB private, CPU 0.41–0.48)
| Lever | Private sum | Δ | Note |
|---|---|---|---|
| `--renderer-process-limit=1` | 251.2 | ≈0 | only one renderer exists at idle (chat/settings are lazy) |
| `--js-flags=--max-old-space-size=64` | 245.4 | −5 (noise level) | stage heap is ~10 MB; the cap does not bite |
| cookie-encryption fuse **off** | 255.2 | ≈0; browser 83.8 vs 82 | **not** the cause of the 82 MB browser |
| warm profile (2nd launch) vs fresh | 255.3 | ≈0 | |

No lever is worth a production change. The real lever is the size of the overlay surface (B, or a smaller A overlay).

## Recommendation (plan S1 rule)
- **By the rule: A.** Idle CPU is within budget and no worse than B by more than 0.5 pp. The owner checklist for click-through and drag is still pending (`owner-checklist-s1-s3.md`).
- **Conflict for the owner:** A idle is **250 MB private / 354 MB WS**. That is over the SPEC §1 budget of ≤ 200 MB on either metric. B idle is 185 MB private, inside the budget but with only 15 MB headroom. WS is over 200 MB in every mode.
- So either A ships with a revised budget (ADR 007 draft proposes ≤ 280 MB private-bytes sum), or the 200 MB budget is kept and the decision flips to **B** with the rAF driver and fixed-size `setBounds`. B is also much better in compat mode (see `s3-gpu.md`: A-walk-compat costs 16 % CPU, B-walk-compat 0.6 %).
