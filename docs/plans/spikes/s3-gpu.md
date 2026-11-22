# Spike S3 — GPU transparency + `--compat-mode`

Date 2026-11-22 · branch `spike/s1-windows` · same machine, build and method as `s1-windows.md`.

## Setup
- GPU: AMD Radeon iGPU (vendor 0x1002, device 0x15E7, driver 31.0.21925.1001). No dGPU, so no hybrid test. Microsoft Basic Render Driver (0x1414:0x8C) is also listed.
- `--compat-mode`: `app.disableHardwareAcceleration()` before `ready` (src/main/index.ts, guarded by `SPIKE.compat`; M0-10 production flag).
- `app.getGPUFeatureStatus()` and `app.getGPUInfo('basic')` are logged 3 s after load into the spike log (`reports/spikes/shots/{gpu,compat}*.jsonl`, and in every `reports/spikes/*.jsonl`).
- Screenshots come from inside the app (dev `--capture-stage`, `webContents.capturePage`), never the desktop: `reports/spikes/shots/{gpu,compat,b-gpu,b-compat}/stage-{light,dark}.png`.

## `app.getGPUFeatureStatus()`
| Feature | GPU (default) | compat |
|---|---|---|
| gpu_compositing | enabled | **disabled_software** |
| rasterization | enabled | disabled_software |
| 2d_canvas | enabled | unavailable_software |
| webgl / webgpu | enabled / enabled | **unavailable_software** / unavailable_software |
| opengl | enabled_on | disabled_off |

- Pixi still reports `renderer=webgl` in compat mode (`gl.RENDERER` = "WebKit WebGL", masked). WebGL works on a software GL behind it, even though the feature status says `unavailable_software`. So the status is not a reliable sign that WebGL works.
- Auto-detect signal: `gpu_compositing !== 'enabled'` reliably means software compositing. But nothing in the status predicts the black-background bug (electron#40515), which shows up while GPU compositing *is* enabled. **Keep compat mode a manual switch** (plan rule), with a hint in M5 settings. Autodetect is not justified.

## Transparency
- Page capture: alpha = 0 everywhere except the sprite, in all four cases: A/B × GPU/compat (A sprite bbox 120×115 px of a 1920×1020 px page; B 120×115 of 160×160). The sprite renders crisply over light and dark backdrops in both modes.
- **Limit:** `capturePage` shows that the *page* is transparent. It does not show what DWM composites on the desktop, which is where electron#40515 shows up. Desktop transparency needs the owner's eyes (checklist item T1–T3). No full-desktop screenshot was taken, for privacy.

## Cost of compat mode (CPU % of all cores; MB; 60 s each)
| Config | CPU avg / p95 | Private sum | WS sum | gpu-process priv / WS | Walk p95 / gaps > 33 ms |
|---|---|---|---|---|---|
| A-idle GPU (×3) | 0.44 / 0.72 | 250.4 | 354.2 | 124.0 / 101.2 | — |
| A-idle compat (×2) | 0.22 / 0.52 | 184.4 | 446.7 | 57.3 / 151.9 | — |
| A-walk GPU (×2) | 0.84 / 1.33 | 257.2 | 366.0 | 125.2 / 104.5 | 21–33 / 86–178 |
| **A-walk compat (×2)** | **15.9 / 20.3** | 200.3 | 488.8 | 67.2 / 179.7 | 18–21 / 20–44 |
| B-idle compat (×1) | 0.36 / 0.70 | 144.2 | 321.4 | 19.7 / 69.9 | — |
| **B-walk compat (×1)** | **0.64 / 0.98** | 149.4 | 328.5 | 19.7 / 70.0 | 17.9 / 0 |

- Idle compat is *cheaper* than GPU (no GPU surface, nothing redraws).
- **A-walk in compat mode costs ~16 % CPU.** Software compositing redraws the whole 1920×1020 px transparent overlay every frame. That is unusable for a companion that walks.
- B in compat mode is the cheapest config measured: 144–149 MB private, 0.64 % CPU while walking, perfect rAF cadence.

## Conclusions
1. Keep `--compat-mode` (implemented on this branch; M0-10 should copy the two lines). It stays manual.
2. If ADR 007 picks A, compat mode needs a mitigation before M1 walking ships: shrink the redraw region (damage rect) or cap the walk FPS in compat mode. Otherwise document "compat mode = high CPU while walking". With B, the problem does not exist.
3. CONTEXT gotchas: feature status ≠ WebGL availability; `capturePage` alpha ≠ desktop transparency; A overlay GPU memory scales with work-area size.
4. Owner: run T1–T3 in `owner-checklist-s1-s3.md` (desktop transparency on this iGPU in both modes, DevTools closed). A second machine/VM is optional.
