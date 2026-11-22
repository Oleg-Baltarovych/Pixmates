---
name: perf
description: Measure idle CPU and RAM of the packaged Pixmates build (all Electron processes) with the active character, compare with the SPEC budget and the previous report.
argument-hint: "[scenario: idle|walk|sleep|switch|all] [--character <id>]"
---
# Perf: $ARGUMENTS

1. Measure the built app, not `pnpm dev`: run `pnpm build` (and `pnpm dist --dir` if the perf tool needs the unpacked app).
2. On battery, Windows throttles the CPU. Plugged in, close heavy apps and say what else is running.
3. Run `pnpm perf [--scenario …] [--character …]`. The tool launches the app with a fixed seed and a scripted scenario, warms up 30 s, samples all app processes for 120 s, and writes `reports/perf/<date>.md`.
4. Compare with SPEC §1:
   - idle CPU < 2%;
   - RAM ≤ 200 MB total (sum of the working sets of every process).
   Also compare with the latest previous report: Δ CPU, Δ RAM, fps per state.
5. Over budget or regressed > 10%: name the likely cause from the diff and suggest a fix. Typical causes:
   - ticker not throttled;
   - rendering without frame changes;
   - polling interval too short;
   - extra window alive;
   - texture leak.
6. Output: numbers table (scenario × character × CPU avg/p95 × RAM), verdict within/over budget, and the suspected causes.
