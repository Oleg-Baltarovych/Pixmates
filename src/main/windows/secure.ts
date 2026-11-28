// The one window factory and the app-wide hardening (SPEC §10, rules/security.md, plan M0-02).
// Every BrowserWindow is created here with the fixed webPreferences; no ad-hoc `new BrowserWindow` elsewhere.
import { BrowserWindow, type BrowserWindowConstructorOptions, type WebPreferences } from 'electron';
import type { WindowRole } from '../../shared/windows.ts';
import { pageSource, preloadPath, type PathContext } from './paths.ts';

/** Fixed hardening; callers cannot override it (only `preload` and `devTools` are filled in per window). */
export const SECURE_WEB_PREFERENCES = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  nodeIntegrationInWorker: false,
  nodeIntegrationInSubFrames: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  experimentalFeatures: false,
  navigateOnDragDrop: false,
  spellcheck: false,
} as const satisfies WebPreferences;

/** Structural slice of `WebContents` that the guards need (lets tests pass a fake). */
export interface GuardedContents {
  on(
    event: 'will-navigate' | 'will-frame-navigate' | 'will-redirect' | 'will-attach-webview',
    listener: (event: { preventDefault(): void }) => void,
  ): unknown;
  setWindowOpenHandler(handler: () => { action: 'deny' }): void;
}

/** Structural slice of `Session`. */
export interface GuardedSession {
  setPermissionRequestHandler(
    handler: (webContents: unknown, permission: string, callback: (granted: boolean) => void) => void,
  ): void;
  setPermissionCheckHandler(handler: () => boolean): void;
  setDevicePermissionHandler(handler: () => boolean): void;
}

/** No navigation, no new windows, no webviews — in any frame of any web contents. */
export function hardenWebContents(contents: GuardedContents): void {
  const deny = (event: { preventDefault(): void }): void => {
    event.preventDefault();
  };
  contents.on('will-navigate', deny);
  contents.on('will-frame-navigate', deny);
  contents.on('will-redirect', deny);
  contents.on('will-attach-webview', deny);
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

/** Deny every permission request and check (camera, notifications, clipboard, HID, …) by default. */
export function hardenSession(session: GuardedSession): void {
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.setPermissionCheckHandler(() => false);
  session.setDevicePermissionHandler(() => false);
}

export interface SecureWindowOptions {
  readonly role: WindowRole;
  readonly paths: PathContext;
  /** Window shape and behaviour; `webPreferences` are not accepted on purpose. */
  readonly window: Omit<BrowserWindowConstructorOptions, 'webPreferences' | 'show'>;
}

/** Creates a hidden, hardened window and starts loading its page. The caller decides when to show it. */
export function createSecureWindow({ role, paths, window }: SecureWindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    ...window,
    show: false,
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: preloadPath(role, paths),
      devTools: paths.dev,
    },
  });
  win.loadURL(pageSource(role, paths).url).catch((error: unknown) => {
    console.error(`[windows] ${role} page failed to load`, error);
  });
  return win;
}
