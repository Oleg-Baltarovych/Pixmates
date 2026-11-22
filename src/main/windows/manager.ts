// Window lifecycle (SPEC §3.1, rules/main.md): stage always alive, chat lazy and hidden on close, settings
// created and destroyed each time. All windows come from the hardened factory in secure.ts.
import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import type { WindowRole } from '../../shared/windows.ts';
import type { PathContext } from './paths.ts';
import { createSecureWindow } from './secure.ts';

const CHAT_WINDOW = { width: 360, height: 480, title: 'Pixmates', autoHideMenuBar: true } as const;
const SETTINGS_WINDOW = { width: 640, height: 520, title: 'Pixmates', autoHideMenuBar: true } as const;

export class WindowManager {
  readonly #paths: PathContext;
  readonly #stageOptions: () => Omit<BrowserWindowConstructorOptions, 'webPreferences' | 'show'>;
  #stage: BrowserWindow | undefined;
  #chat: BrowserWindow | undefined;
  #settings: BrowserWindow | undefined;
  #quitting = false;

  constructor(
    paths: PathContext,
    stageOptions: () => Omit<BrowserWindowConstructorOptions, 'webPreferences' | 'show'>,
  ) {
    this.#paths = paths;
    this.#stageOptions = stageOptions;
  }

  /** The window that currently owns a role, if alive. Used by the IPC sender check. */
  windowOf(role: WindowRole): BrowserWindow | undefined {
    const win = role === 'stage' ? this.#stage : role === 'chat' ? this.#chat : this.#settings;
    return win !== undefined && !win.isDestroyed() ? win : undefined;
  }

  createStage(): BrowserWindow {
    const existing = this.windowOf('stage');
    if (existing) return existing;
    const win = createSecureWindow({ role: 'stage', paths: this.#paths, window: this.#stageOptions() });
    win.once('ready-to-show', () => {
      win.showInactive();
    });
    win.on('closed', () => {
      this.#stage = undefined;
    });
    this.#stage = win;
    return win;
  }

  showChat(): void {
    let win = this.windowOf('chat');
    if (!win) {
      win = createSecureWindow({ role: 'chat', paths: this.#paths, window: CHAT_WINDOW });
      const created = win;
      created.on('close', (event) => {
        // Lazy and kept: closing only hides it, except when the app quits.
        if (this.#quitting) return;
        event.preventDefault();
        created.hide();
      });
      created.on('closed', () => {
        this.#chat = undefined;
      });
      created.once('ready-to-show', () => {
        created.show();
      });
      this.#chat = created;
      return;
    }
    win.show();
    win.focus();
  }

  showSettings(): void {
    const existing = this.windowOf('settings');
    if (existing) {
      existing.show();
      existing.focus();
      return;
    }
    const win = createSecureWindow({ role: 'settings', paths: this.#paths, window: SETTINGS_WINDOW });
    win.once('ready-to-show', () => {
      win.show();
    });
    win.on('closed', () => {
      this.#settings = undefined;
    });
    this.#settings = win;
  }

  /** Called on `before-quit`: lets the chat window close for real, then destroys everything. */
  destroyAll(): void {
    this.#quitting = true;
    for (const role of ['settings', 'chat', 'stage'] as const) this.windowOf(role)?.destroy();
  }
}
