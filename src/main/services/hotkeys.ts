// Global hotkey (plan M0-07, D-9): one toggle accelerator. `globalShortcut.register` returns false when another
// app owns the combination; that is reported (log + tray notice), never thrown.
export interface ShortcutApi {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
  unregisterAll(): void;
}

export type HotkeyStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'registered'; readonly accelerator: string }
  | {
      readonly kind: 'conflict';
      readonly accelerator: string;
    };

export class HotkeyService {
  readonly #api: ShortcutApi;
  #status: HotkeyStatus = { kind: 'idle' };

  constructor(api: ShortcutApi) {
    this.#api = api;
  }

  get status(): HotkeyStatus {
    return this.#status;
  }

  /** (Re)binds the toggle; a previous binding is released first, so calling it again is safe. */
  bind(accelerator: string, onPress: () => void): HotkeyStatus {
    if (this.#status.kind === 'registered') this.#api.unregister(this.#status.accelerator);
    const ok = this.#api.register(accelerator, onPress);
    this.#status = ok ? { kind: 'registered', accelerator } : { kind: 'conflict', accelerator };
    if (!ok) console.warn(`[hotkeys] ${accelerator} is taken by another application`);
    return this.#status;
  }

  /** On `will-quit`. */
  dispose(): void {
    this.#api.unregisterAll();
    this.#status = { kind: 'idle' };
  }
}
