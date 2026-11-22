import { describe, expect, it, vi } from 'vitest';
import { isDebugLaunch } from '../../../src/main/app/launch-guard.ts';
import { registerLifecycle, type LifecycleApp } from '../../../src/main/app/lifecycle.ts';

function fakeApp(): { app: LifecycleApp; emit: (event: string) => void; markReady: () => void } {
  const listeners = new Map<string, () => void>();
  let markReady = (): void => undefined;
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  const app: LifecycleApp = {
    on: (event: string, listener: () => void) => listeners.set(event, listener),
    whenReady: () => ready,
  };
  const emit = (event: string): void => {
    listeners.get(event)?.();
  };
  return { app, emit, markReady };
}

function hooks() {
  const teardown = vi.fn();
  return {
    teardown,
    ready: vi.fn(() => teardown),
    secondInstance: vi.fn(),
    beforeQuit: vi.fn(),
    willQuit: vi.fn(),
  };
}

describe('registerLifecycle', () => {
  it('ignores a second instance before ready (no screen/window access)', async () => {
    const { app, emit, markReady } = fakeApp();
    const h = hooks();
    const done = registerLifecycle(app, h);
    emit('second-instance');
    expect(h.secondInstance).not.toHaveBeenCalled();
    expect(h.ready).not.toHaveBeenCalled();
    markReady();
    await done;
    emit('second-instance');
    expect(h.secondInstance).toHaveBeenCalledTimes(1);
  });

  it('quit before ready skips the ready teardown and never runs ready', async () => {
    const { app, emit, markReady } = fakeApp();
    const h = hooks();
    const done = registerLifecycle(app, h);
    emit('before-quit');
    expect(h.beforeQuit).toHaveBeenCalledTimes(1);
    markReady();
    await done;
    expect(h.ready).not.toHaveBeenCalled();
    expect(h.teardown).not.toHaveBeenCalled();
  });

  it('tears down what ready set up on before-quit, once', async () => {
    const { app, emit, markReady } = fakeApp();
    const h = hooks();
    const done = registerLifecycle(app, h);
    markReady();
    await done;
    emit('before-quit');
    emit('before-quit');
    emit('will-quit');
    expect(h.teardown).toHaveBeenCalledTimes(1);
    expect(h.beforeQuit).toHaveBeenCalledTimes(2);
    expect(h.willQuit).toHaveBeenCalledTimes(1);
  });
});

describe('isDebugLaunch', () => {
  const none = (): boolean => false;
  it.each([
    [['Pixmates.exe', '--inspect'], none],
    [['Pixmates.exe', '--inspect-brk=9229'], none],
    [['Pixmates.exe', '--inspect-port=0'], none],
    [['Pixmates.exe', '--remote-debugging-port=9222'], none],
    [['Pixmates.exe', '--remote-debugging-pipe'], none],
    [['Pixmates.exe'], (name: string) => name === 'remote-debugging-port'],
  ])('flags %j', (argv, hasSwitch) => {
    expect(isDebugLaunch(argv, hasSwitch)).toBe(true);
  });

  it('allows a normal or perf launch', () => {
    expect(isDebugLaunch(['Pixmates.exe', '--perf-seed=1'], none)).toBe(false);
    expect(isDebugLaunch(['Pixmates.exe', '--remote-debugging-portal'], none)).toBe(false);
  });
});
