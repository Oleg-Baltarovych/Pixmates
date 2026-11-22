// App lifecycle wiring (plan M0-02/07, review fix A1). `screen`, `BrowserWindow`, `Tray` and `globalShortcut` exist
// only after ready, so the handlers that use them are gated on ready here, in one testable seam.

/** Structural slice of Electron's `app` (lets tests pass a fake). */
// Separate overloads on purpose: Electron's `App.on` is overloaded per event, and only per-event signatures make
// the real `app` assignable to this interface.
export interface LifecycleApp {
  on(event: 'second-instance', listener: () => void): unknown;
  // eslint-disable-next-line @typescript-eslint/unified-signatures -- per-event overloads match Electron's App.on
  on(event: 'before-quit', listener: () => void): unknown;
  // eslint-disable-next-line @typescript-eslint/unified-signatures -- per-event overloads match Electron's App.on
  on(event: 'will-quit', listener: () => void): unknown;
  // eslint-disable-next-line @typescript-eslint/unified-signatures -- per-event overloads match Electron's App.on
  on(event: 'window-all-closed', listener: () => void): unknown;
  whenReady(): Promise<unknown>;
}

export interface LifecycleHooks {
  /** Runs once after ready (never after a quit started); returns the teardown of what it set up (display
   * listeners, …), which runs on `before-quit`. */
  readonly ready: () => () => void;
  /** A second launch; called only once `ready` has run. */
  readonly secondInstance: () => void;
  /** `before-quit`, after the ready teardown: IPC, tray, windows. Must be safe before ready. */
  readonly beforeQuit: () => void;
  readonly willQuit: () => void;
}

export function registerLifecycle(app: LifecycleApp, hooks: LifecycleHooks): Promise<void> {
  let teardown: (() => void) | undefined;
  let quitting = false;
  app.on('second-instance', () => {
    if (teardown) hooks.secondInstance();
  });
  app.on('before-quit', () => {
    quitting = true;
    teardown?.();
    teardown = undefined;
    hooks.beforeQuit();
  });
  app.on('will-quit', () => {
    hooks.willQuit();
  });
  // A tray app: closing every window must not quit it (quit comes from the tray).
  app.on('window-all-closed', () => undefined);
  return app.whenReady().then(() => {
    if (!quitting) teardown = hooks.ready();
  });
}
