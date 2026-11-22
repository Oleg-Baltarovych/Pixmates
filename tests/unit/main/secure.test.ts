import { describe, expect, it, vi } from 'vitest';

// secure.ts imports BrowserWindow; the guards under test never touch it.
vi.mock('electron', () => ({ BrowserWindow: vi.fn() }));
const { SECURE_WEB_PREFERENCES, hardenSession, hardenWebContents } =
  await import('../../../src/main/windows/secure.ts');

type Listener = (event: { preventDefault(): void }) => void;

function fakeContents() {
  const listeners = new Map<string, Listener[]>();
  let openHandler: (() => { action: 'deny' }) | undefined;
  return {
    on(event: string, listener: Listener) {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
      return this;
    },
    setWindowOpenHandler(handler: () => { action: 'deny' }) {
      openHandler = handler;
    },
    /** Emits like Electron would and reports whether some listener prevented the default. */
    emit(event: string): boolean {
      let prevented = false;
      for (const listener of listeners.get(event) ?? []) {
        listener({
          preventDefault: () => {
            prevented = true;
          },
        });
      }
      return prevented;
    },
    openWindow() {
      return openHandler?.();
    },
  };
}

describe('hardenWebContents', () => {
  it.each(['will-navigate', 'will-frame-navigate', 'will-redirect', 'will-attach-webview'])('prevents %s', (event) => {
    const contents = fakeContents();
    hardenWebContents(contents);
    expect(contents.emit(event)).toBe(true);
  });

  it('denies window.open', () => {
    const contents = fakeContents();
    expect(contents.openWindow()).toBeUndefined();
    hardenWebContents(contents);
    expect(contents.openWindow()).toEqual({ action: 'deny' });
  });
});

describe('hardenSession', () => {
  it('denies permission requests, checks and device access', () => {
    let request: ((wc: unknown, permission: string, cb: (granted: boolean) => void) => void) | undefined;
    let check: (() => boolean) | undefined;
    let device: (() => boolean) | undefined;
    hardenSession({
      setPermissionRequestHandler: (h) => (request = h),
      setPermissionCheckHandler: (h) => (check = h),
      setDevicePermissionHandler: (h) => (device = h),
    });

    const granted: boolean[] = [];
    for (const permission of ['media', 'notifications', 'clipboard-read', 'geolocation']) {
      request?.(undefined, permission, (value) => granted.push(value));
    }
    expect(granted).toEqual([false, false, false, false]);
    expect(check?.()).toBe(false);
    expect(device?.()).toBe(false);
  });
});

describe('SECURE_WEB_PREFERENCES', () => {
  it('keeps the fixed hardening', () => {
    expect(SECURE_WEB_PREFERENCES).toMatchObject({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    });
  });
});
