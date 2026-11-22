// `pnpm perf` (plan M0-08, SPEC §1 budget): builds the unpacked app, launches it with a fixed seed, samples CPU and
// memory of the whole Electron process tree at 1 Hz and writes reports/perf/<date>.md. Exit 1 over budget.
// Windows only. No dependencies: one long-running PowerShell sampler (Win32_Process tree + Get-Process counters).
// Not via Playwright: the EnableNodeCliInspectArguments fuse is off, so `_electron` cannot drive the build.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';

// Memory is checked on the private-bytes sum (avg) for now; working set is reported alongside. The final metric is
// decided in ADR 007.
const BUDGET = { cpuPercent: 2, memoryMb: 200 } as const;
/** Every child-process call is bounded (rules/security.md, tools/ exception). */
const TIMEOUT_MS = { build: 10 * 60_000, short: 30_000 } as const;
const root = path.resolve(import.meta.dirname, '..');
const exe = path.join(root, 'release', 'win-unpacked', 'Pixmates.exe');

function arg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const value = Number(raw);
  return raw !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;
}
const warmupS = arg('warmup', 30);
const durationS = arg('duration', 120);
const skipBuild = process.argv.includes('--skip-build');

interface Proc {
  readonly pid: number;
  readonly type: string;
  readonly cpuMs: number;
  readonly ws: number;
  readonly priv: number;
}
interface Sample {
  readonly t: number;
  readonly procs: readonly Proc[];
}

// Emits one JSON line per second: elapsed ms and every process in the tree under $rootPid.
const SAMPLER = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($true) {
  $all = Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CommandLine
  $tree = @{}; $tree[[uint32]$env:PERF_ROOT_PID] = $true
  do { $added = $false
    foreach ($p in $all) { if (-not $tree.ContainsKey([uint32]$p.ProcessId) -and $tree.ContainsKey([uint32]$p.ParentProcessId)) { $tree[[uint32]$p.ProcessId] = $true; $added = $true } }
  } while ($added)
  $cmd = @{}; foreach ($p in $all) { $cmd[[uint32]$p.ProcessId] = $p.CommandLine }
  $procs = foreach ($id in $tree.Keys) {
    $g = Get-Process -Id $id
    if ($g) {
      $type = 'browser'; if ($cmd[$id] -match '--type=([\w-]+)') { $type = $Matches[1] }
      [pscustomobject]@{ pid = [int]$id; type = $type; cpuMs = $g.TotalProcessorTime.TotalMilliseconds; ws = $g.WorkingSet64; priv = $g.PrivateMemorySize64 }
    }
  }
  [Console]::Out.WriteLine((@{ t = $sw.ElapsedMilliseconds; procs = @($procs) } | ConvertTo-Json -Compress -Depth 4))
  Start-Sleep -Milliseconds (1000 - ($sw.ElapsedMilliseconds % 1000))
}
`;

function powerSource(): string {
  try {
    const out = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', '(Get-CimInstance Win32_Battery | Select-Object -First 1).BatteryStatus'],
      { encoding: 'utf8', timeout: TIMEOUT_MS.short },
    ).trim();
    if (out === '') return 'AC (no battery)';
    return out === '2'
      ? 'AC (plugged in)'
      : `battery (BatteryStatus=${out}) — Windows throttles CPU, numbers are not representative`;
  } catch {
    return 'unknown';
  }
}

const percentile = (values: readonly number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};
const mb = (bytes: number): number => bytes / 1024 / 1024;
const avg = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

async function main(): Promise<void> {
  if (process.platform !== 'win32') throw new Error('pnpm perf measures the Windows build only');
  if (!skipBuild)
    execFileSync('pnpm dist:dir', { cwd: root, stdio: 'inherit', shell: 'cmd.exe', timeout: TIMEOUT_MS.build }); // fixed command, no arguments interpolated

  const env = { ...process.env };
  delete env['ELECTRON_RUN_AS_NODE']; // ignored by the RunAsNode fuse anyway; keep the launch clean
  // Own temp profile: a running `pnpm dev` or installed instance holds the single-instance lock of the default
  // userData, which would make the measured launch quit at once; it also keeps perf runs off real user data.
  const userData = mkdtempSync(path.join(os.tmpdir(), 'pixmates-perf-'));
  const app = spawn(exe, ['--perf-seed=1', `--user-data-dir=${userData}`], { cwd: root, env, stdio: 'ignore' });
  if (app.pid === undefined) throw new Error(`could not start ${exe}`);
  const sampler = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SAMPLER], {
    env: { ...env, PERF_ROOT_PID: String(app.pid) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const samples: Sample[] = [];
  const totalS = warmupS + durationS;
  console.log(`[perf] warm-up ${String(warmupS)} s, measuring ${String(durationS)} s …`);
  try {
    await new Promise<void>((resolve) => {
      // Overall deadline: never hang if the sampler dies while the app keeps running.
      const deadline = setTimeout(resolve, (totalS + 60) * 1000);
      const done = (): void => {
        clearTimeout(deadline);
        resolve();
      };
      const lines = createInterface({ input: sampler.stdout });
      lines.on('line', (line) => {
        let parsed: Sample;
        try {
          parsed = JSON.parse(line) as Sample;
        } catch {
          return; // ignore a malformed sampler line
        }
        samples.push(parsed);
        if (parsed.t >= totalS * 1000) done();
      });
      app.on('exit', done);
    });
  } finally {
    sampler.kill();
    try {
      execFileSync('taskkill', ['/PID', String(app.pid), '/T', '/F'], { stdio: 'ignore', timeout: TIMEOUT_MS.short });
    } catch {
      // the app may already have exited
    }
    rmSync(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  }

  const measured = samples.filter((s) => s.t >= warmupS * 1000);
  if (measured.length < 2) throw new Error('the app exited before the measurement window');
  const cores = os.availableParallelism();
  const cpu: number[] = [];
  for (let i = 1; i < measured.length; i++) {
    const prev = measured[i - 1];
    const cur = measured[i];
    if (!prev || !cur) continue;
    let delta = 0;
    for (const p of cur.procs) {
      const before = prev.procs.find((q) => q.pid === p.pid);
      if (before) delta += Math.max(0, p.cpuMs - before.cpuMs);
    }
    cpu.push((delta / ((cur.t - prev.t) * cores)) * 100);
  }
  const wsTotals = measured.map((s) => s.procs.reduce((a, p) => a + p.ws, 0));
  const privTotals = measured.map((s) => s.procs.reduce((a, p) => a + p.priv, 0));
  const byType = new Map<string, { ws: number[]; priv: number[] }>();
  for (const s of measured) {
    for (const p of s.procs) {
      const entry = byType.get(p.type) ?? { ws: [], priv: [] };
      entry.ws.push(p.ws);
      entry.priv.push(p.priv);
      byType.set(p.type, entry);
    }
  }
  const processCount = measured.at(-1)?.procs.length ?? 0;

  const cpuAvg = avg(cpu);
  const ws = { avg: mb(avg(wsTotals)), p95: mb(percentile(wsTotals, 95)) };
  const priv = { avg: mb(avg(privTotals)), p95: mb(percentile(privTotals, 95)) };
  const verdict = cpuAvg < BUDGET.cpuPercent && priv.avg <= BUDGET.memoryMb ? 'within budget' : 'OVER BUDGET';
  const date = new Date().toISOString().slice(0, 10);
  const report = [
    `# Perf — ${date} — idle placeholder`,
    '',
    `- Build: release/win-unpacked (electron-builder --dir, fuses on), \`--perf-seed=1\``,
    `- Machine: ${os.cpus()[0]?.model ?? 'unknown CPU'}, ${String(cores)} logical cores, ${String(Math.round(mb(os.totalmem())))} MB RAM, Windows ${os.release()}`,
    `- Power: ${powerSource()}`,
    `- Warm-up ${String(warmupS)} s, measured ${String(durationS)} s at 1 Hz (${String(measured.length)} samples), ${String(processCount)} processes`,
    `- Budget (SPEC §1): CPU < ${String(BUDGET.cpuPercent)} % (avg), memory ≤ ${String(BUDGET.memoryMb)} MB (sum of all processes)`,
    '- Memory metric: the verdict uses the **private-bytes sum (avg)** for now; working set is shown alongside (it double-counts shared pages). The final metric is decided in ADR 007.',
    '',
    '| Metric | Value |',
    '|---|---|',
    `| CPU avg | ${cpuAvg.toFixed(2)} % |`,
    `| CPU p95 | ${percentile(cpu, 95).toFixed(2)} % |`,
    `| Private bytes, sum (avg / p95) — budget metric | ${priv.avg.toFixed(1)} / ${priv.p95.toFixed(1)} MB |`,
    `| Working set, sum (avg / p95) | ${ws.avg.toFixed(1)} / ${ws.p95.toFixed(1)} MB |`,
    '',
    '| Process type | WS avg MB | Private avg MB |',
    '|---|---|---|',
    ...[...byType].map(([type, v]) => `| ${type} | ${mb(avg(v.ws)).toFixed(1)} | ${mb(avg(v.priv)).toFixed(1)} |`),
    '',
    `**Verdict: ${verdict}** (CPU avg ${cpuAvg.toFixed(2)} %, private bytes avg ${priv.avg.toFixed(1)} MB; working set avg ${ws.avg.toFixed(1)} MB for reference).`,
    '',
  ].join('\n');
  const dir = path.join(root, 'reports', 'perf');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${date}.md`);
  writeFileSync(file, report);
  console.log(report);
  console.log(`[perf] report: ${file}`);
  if (verdict !== 'within budget') process.exitCode = 1;
}

await main();
