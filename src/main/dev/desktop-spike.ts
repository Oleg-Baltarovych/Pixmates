// Dev-only spike S4 (plan M1-02, ADR 014): a koffi Win32 binding that lists the visible top-level windows with
// their DWM bounds, and the two change-detection modes it compares — a WinEvent hook and polling. Loaded on demand
// by `--desktop-spike=<mode> --desktop-spike-out=<dir>` in an unpackaged run; the packaged measurement used a local,
// uncommitted gate patch (recorded in the plan). Writes `<dir>/s4-<mode>.json` every few seconds (it survives a
// taskkill). No titles and no process access are read: class names only, to drop shell windows.
// M1-20 replaces this with `sensors/desktop.win32.ts`; delete this file then.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import koffi from 'koffi';
import { screen } from 'electron';

export type SpikeMode = 'bench' | 'load' | 'poll' | 'hook';
export const SPIKE_MODES: readonly SpikeMode[] = ['bench', 'load', 'poll', 'hook'];

const BENCH_CALLS = 500;
const POLL_MS = 1000; // DESKTOP_POLL_MS.onWindow (ADR 014 (b), rules/main.md "every 1 s while on a window")
const HOOK_COALESCE_MS = 100; // one re-list per burst of relevant events
const HOOK_REFRESH_MS = 10_000; // slow safety refresh beside the hook
const WRITE_MS = 5000;
const BENCH_DELAY_MS = 15_000; // let start-up settle before the memory snapshot and the bench
const MAX_WINDOWS = 64;
const CLASS_BUF_CHARS = 64;

const GWL_EXSTYLE = -20;
const GWL_STYLE = -16;
const WS_CHILD = 0x40000000;
const WS_EX_TOOLWINDOW = 0x00000080;
const GW_OWNER = 4;
const DWMWA_EXTENDED_FRAME_BOUNDS = 9;
const DWMWA_CLOAKED = 14;
const SHELL_CLASSES: ReadonlySet<string> = new Set(['Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);

const EVENT_SYSTEM_FOREGROUND = 0x0003;
const EVENT_SYSTEM_MOVESIZESTART = 0x000a;
const EVENT_SYSTEM_MOVESIZEEND = 0x000b;
const EVENT_SYSTEM_MINIMIZESTART = 0x0016;
const EVENT_SYSTEM_MINIMIZEEND = 0x0017;
const EVENT_OBJECT_DESTROY = 0x8001;
const EVENT_OBJECT_HIDE = 0x8003;
const EVENT_OBJECT_LOCATIONCHANGE = 0x800b;
const OBJID_WINDOW = 0;
const CHILDID_SELF = 0;
const WINEVENT_OUTOFCONTEXT = 0x0000;
const WINEVENT_SKIPOWNPROCESS = 0x0002;
/** Hook ranges, each as narrow as possible: a wide range would also deliver menu, scroll and capture events. */
const HOOK_RANGES: readonly (readonly [number, number])[] = [
  [EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND],
  [EVENT_SYSTEM_MOVESIZESTART, EVENT_SYSTEM_MOVESIZEEND],
  [EVENT_SYSTEM_MINIMIZESTART, EVENT_SYSTEM_MINIMIZEEND],
  [EVENT_OBJECT_DESTROY, EVENT_OBJECT_HIDE],
  [EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE],
];

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Binding {
  list(own: ReadonlySet<number>): { raw: number; kept: Rect[] };
  /** Worst case: every probe on every top-level handle, no early exit (upper bound for "40 windows"). */
  probeAll(): number;
  hook(onEvent: (event: number, hwnd: number, idObject: number, idChild: number) => void): () => void;
}

/**
 * koffi preallocates a stack (1 MiB) and a heap (2 MiB) block for synchronous calls (koffi 3.3 defaults, doc/misc.md),
 * counted in private bytes. These calls pass a few ints and one 16-byte struct, so much smaller blocks suffice.
 * Set before the first `load`.
 */
const KOFFI_SYNC_STACK = 256 * 1024;
const KOFFI_SYNC_HEAP = 64 * 1024;

function createBinding(): Binding {
  koffi.config({ ...koffi.config(), sync_stack_size: KOFFI_SYNC_STACK, sync_heap_size: KOFFI_SYNC_HEAP });
  const user32 = koffi.load('user32.dll');
  const dwmapi = koffi.load('dwmapi.dll');
  const RECT = koffi.struct('RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' });
  const EnumProc = koffi.proto('bool __stdcall EnumWindowsProc(intptr hwnd, intptr lParam)');
  const WinEventProc = koffi.proto(
    'void __stdcall WinEventProc(intptr hook, uint32 event, intptr hwnd, long idObject, long idChild, uint32 thread, uint32 time)',
  );
  // KoffiFunction is `(...args: any[]) => any`; each is narrowed here to its C prototype.
  const EnumWindows = user32.func('bool __stdcall EnumWindows(EnumWindowsProc *cb, intptr lParam)') as (
    cb: bigint,
    lParam: number,
  ) => boolean;
  const IsWindowVisible = user32.func('bool __stdcall IsWindowVisible(intptr hwnd)') as (hwnd: number) => boolean;
  const IsIconic = user32.func('bool __stdcall IsIconic(intptr hwnd)') as (hwnd: number) => boolean;
  const GetWindowLongPtrW = user32.func('intptr __stdcall GetWindowLongPtrW(intptr hwnd, int index)') as (
    hwnd: number,
    index: number,
  ) => number;
  const GetWindow = user32.func('intptr __stdcall GetWindow(intptr hwnd, uint32 cmd)') as (
    hwnd: number,
    cmd: number,
  ) => number;
  const GetClassNameW = user32.func('int __stdcall GetClassNameW(intptr hwnd, _Out_ uint8_t *buf, int max)') as (
    hwnd: number,
    buf: Buffer,
    max: number,
  ) => number;
  const DwmRect = dwmapi.func(
    'int32 __stdcall DwmGetWindowAttribute(intptr hwnd, uint32 attr, _Out_ RECT *value, uint32 size)',
  ) as (hwnd: number, attr: number, out: Rect, size: number) => number;
  const DwmUint = dwmapi.func(
    'int32 __stdcall DwmGetWindowAttribute(intptr hwnd, uint32 attr, _Out_ uint32 *value, uint32 size)',
  ) as (hwnd: number, attr: number, out: [number], size: number) => number;
  const SetWinEventHook = user32.func(
    'intptr __stdcall SetWinEventHook(uint32 min, uint32 max, intptr hmod, WinEventProc *cb, uint32 pid, uint32 tid, uint32 flags)',
  ) as (min: number, max: number, hmod: number, cb: bigint, pid: number, tid: number, flags: number) => number;
  const UnhookWinEvent = user32.func('bool __stdcall UnhookWinEvent(intptr hook)') as (hook: number) => boolean;

  const rectSize = koffi.sizeof(RECT);
  const classBuf = Buffer.alloc(CLASS_BUF_CHARS * 2);
  let handles: number[] = [];
  // One registered callback reused by every EnumWindows call (no per-call trampoline).
  const enumCb = koffi.register((hwnd: number) => {
    handles.push(hwnd);
    return true;
  }, koffi.pointer(EnumProc));

  return {
    list(own) {
      handles = [];
      EnumWindows(enumCb, 0);
      const kept: Rect[] = [];
      for (const hwnd of handles) {
        if (kept.length >= MAX_WINDOWS) break;
        if (own.has(hwnd) || !IsWindowVisible(hwnd) || IsIconic(hwnd)) continue;
        if ((GetWindowLongPtrW(hwnd, GWL_STYLE) & WS_CHILD) !== 0) continue;
        if ((GetWindowLongPtrW(hwnd, GWL_EXSTYLE) & WS_EX_TOOLWINDOW) !== 0) continue;
        if (GetWindow(hwnd, GW_OWNER) !== 0) continue;
        const cloaked: [number] = [0];
        if (DwmUint(hwnd, DWMWA_CLOAKED, cloaked, 4) === 0 && cloaked[0] !== 0) continue;
        const len = GetClassNameW(hwnd, classBuf, CLASS_BUF_CHARS);
        if (SHELL_CLASSES.has(classBuf.toString('utf16le', 0, len * 2))) continue;
        const r: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
        if (DwmRect(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, r, rectSize) !== 0) continue;
        if (r.right - r.left < 1 || r.bottom - r.top < 1) continue;
        // Physical px → DIP (Windows-only Electron API), as M1-20 will do per window.
        const dip = screen.screenToDipRect(null, {
          x: r.left,
          y: r.top,
          width: r.right - r.left,
          height: r.bottom - r.top,
        });
        kept.push({ left: dip.x, top: dip.y, right: dip.x + dip.width, bottom: dip.y + dip.height });
      }
      return { raw: handles.length, kept };
    },
    probeAll() {
      handles = [];
      EnumWindows(enumCb, 0);
      for (const hwnd of handles) {
        IsWindowVisible(hwnd);
        IsIconic(hwnd);
        GetWindowLongPtrW(hwnd, GWL_STYLE);
        GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        GetWindow(hwnd, GW_OWNER);
        DwmUint(hwnd, DWMWA_CLOAKED, [0], 4);
        GetClassNameW(hwnd, classBuf, CLASS_BUF_CHARS);
        const r: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
        DwmRect(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, r, rectSize);
        screen.screenToDipRect(null, { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top });
      }
      return handles.length;
    },
    hook(onEvent) {
      const cb = koffi.register((_hook: number, event: number, hwnd: number, idObject: number, idChild: number) => {
        onEvent(event, hwnd, idObject, idChild);
      }, koffi.pointer(WinEventProc));
      const hooks = HOOK_RANGES.map(([min, max]) =>
        SetWinEventHook(min, max, 0, cb, 0, 0, WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS),
      );
      if (hooks.some((h) => h === 0)) console.error('[spike] SetWinEventHook returned 0 for a range');
      return () => {
        for (const h of hooks) if (h !== 0) UnhookWinEvent(h);
        koffi.unregister(cb);
      };
    },
  };
}

function stats(values: readonly number[]): { n: number; median: number; p95: number; max: number; mean: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const mean = sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length);
  return { n: sorted.length, median: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? 0, mean };
}

/** Starts the spike; returns its cleanup (unhook, clear timers, last write). */
export function startDesktopSpike(mode: SpikeMode, dir: string, ownHandles: () => readonly number[]): () => void {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `s4-${mode}.json`);
  const startedAt = performance.now();
  const cpuStart = process.cpuUsage();
  const record: Record<string, unknown> = { mode, pid: process.pid };
  const timers: NodeJS.Timeout[] = [];
  const disposers: (() => void)[] = [];
  const listMs: number[] = [];
  const cpuSeries: [number, number][] = [];
  let lastRaw = 0;
  let lastKept = 0;

  const memory = async (label: string): Promise<void> => {
    const info = await process.getProcessMemoryInfo();
    record[`memory_${label}`] = { privateKB: info.private, residentKB: info.residentSet };
  };
  const flush = (): void => {
    void memory('last');
    const cpu = process.cpuUsage(cpuStart);
    record['elapsedS'] = (performance.now() - startedAt) / 1000;
    record['mainCpuMs'] = (cpu.user + cpu.system) / 1000;
    cpuSeries.push([Math.round(Number(record['elapsedS'])), Math.round(Number(record['mainCpuMs']))]);
    record['cpuSeries'] = cpuSeries;
    record['list'] = { ...stats(listMs), lastRaw, lastKept };
    writeFileSync(file, JSON.stringify(record, null, 2));
  };
  const timedList = (binding: Binding): void => {
    const own = new Set(ownHandles());
    const t0 = performance.now();
    const { raw, kept } = binding.list(own);
    listMs.push(performance.now() - t0);
    lastRaw = raw;
    lastKept = kept.length;
  };

  const begin = async (): Promise<void> => {
    await memory('beforeLoad');
    const t0 = performance.now();
    const binding = createBinding();
    record['loadMs'] = performance.now() - t0;
    await memory('afterLoad');
    if (mode === 'load') return;
    if (mode === 'bench') {
      for (let i = 0; i < BENCH_CALLS; i++) timedList(binding);
      await memory('afterBench');
      const fullMs: number[] = [];
      let handles = 0;
      for (let i = 0; i < BENCH_CALLS; i++) {
        const t1 = performance.now();
        handles = binding.probeAll();
        fullMs.push(performance.now() - t1);
      }
      const full = stats(fullMs);
      record['probeAll'] = { ...full, handles, perHandleUs: (full.median * 1000) / Math.max(1, handles) };
      return;
    }
    if (mode === 'poll') {
      timers.push(
        setInterval(() => {
          timedList(binding);
        }, POLL_MS),
      );
      return;
    }
    // hook
    const events: Record<string, { all: number; relevant: number }> = {};
    let callbackMs = 0;
    let pending: NodeJS.Timeout | undefined;
    record['events'] = events;
    const unhook = binding.hook((event, _hwnd, idObject, idChild) => {
      const t = performance.now();
      const key = `0x${event.toString(16)}`;
      const entry = (events[key] ??= { all: 0, relevant: 0 });
      entry.all++;
      // Only the window object itself matters; caret, cursor and child objects are dropped here.
      if (idObject === OBJID_WINDOW && idChild === CHILDID_SELF) {
        entry.relevant++;
        pending ??= setTimeout(() => {
          pending = undefined;
          timedList(binding);
        }, HOOK_COALESCE_MS);
      }
      callbackMs += performance.now() - t;
      record['callbackMs'] = callbackMs;
    });
    disposers.push(() => {
      if (pending) clearTimeout(pending);
      unhook();
    });
    timers.push(
      setInterval(() => {
        timedList(binding);
      }, HOOK_REFRESH_MS),
    );
  };

  timers.push(
    setTimeout(() => {
      begin()
        .then(flush)
        .catch((error: unknown) => {
          record['error'] = String(error);
          flush();
        });
    }, BENCH_DELAY_MS),
  );
  timers.push(setInterval(flush, WRITE_MS));
  return () => {
    for (const t of timers) clearTimeout(t);
    for (const d of disposers) d();
    flush();
  };
}
