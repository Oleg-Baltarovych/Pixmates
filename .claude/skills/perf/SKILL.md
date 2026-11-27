---
name: perf
description: Measure idle CPU and RAM of the packaged Pixmates build (all Electron processes) with the active character, compare with the SPEC budget and the previous report.
argument-hint: "[--character=<id>] [--skip-build] [--warmup=<s>] [--duration=<s>]"
---
# Perf: $ARGUMENTS

1. Measure the packaged app, not `pnpm dev`: `pnpm perf` runs `pnpm dist:dir` itself unless `--skip-build` (then `release/win-unpacked` must postdate your change). Close any `pnpm dev` instance.
2. On battery, Windows throttles the CPU. Plugged in, close heavy apps and say what else is running.
3. Run `pnpm perf [-- --character=<id>] [--skip-build] [--warmup=<s>] [--duration=<s>]`. Flags use the `=` form only; an unknown flag, a bad value, a repeat or `--character maid` is a usage error (exit 2).
   - `--character` takes `maid` or `pixmates.maid`; without it the app shows its default character.
   - Seconds are whole numbers 1–3600 (defaults: 30 warm-up, 120 measured).
   - The tool launches the app with `--perf-seed=1` and a temp profile, samples every app process at 1 Hz (idle only, no scenarios yet) and writes `reports/perf/<date>-<character>.md` (`<date>-default.md` without `--character`).
4. Compare with SPEC §1 / ADR 007 (the tool prints the verdict and exits 1 over budget):
   - CPU avg < 2 %;
   - private-bytes sum avg ≤ 280 MB (working set is shown for reference).
   Also compare with the latest previous report of the same character: Δ CPU, Δ RAM (avg / p95 / max).
5. Over budget or regressed > 10%: name the likely cause from the diff and suggest a fix. Typical causes:
   - ticker not throttled;
   - rendering without frame changes;
   - polling interval too short;
   - extra window alive;
   - texture leak.
6. Output: numbers table (character × CPU avg/p95/max × private bytes avg/p95/max), verdict within/over budget, and the suspected causes.
