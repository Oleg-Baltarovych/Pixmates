// System tray (plan M0-07). Rebuilds its menu from TrayState whenever something it shows changes.
import { Menu, nativeImage, Tray, type NativeImage } from 'electron';
import { placeholderFrame } from '../../shared/placeholder-art.ts';
import type { MessageKey } from '../i18n.ts';
import { trayTemplate, type TrayActions, type TrayState } from './tray-menu.ts';

/** Tray icon from the placeholder frame: 32×32 at scale factor 2 (16 DIP), BGRA as Windows expects. */
function trayIcon(): NativeImage {
  const frame = placeholderFrame();
  const bgra = Buffer.alloc(frame.rgba.length);
  for (let i = 0; i < frame.rgba.length; i += 4) {
    bgra[i] = frame.rgba[i + 2] ?? 0;
    bgra[i + 1] = frame.rgba[i + 1] ?? 0;
    bgra[i + 2] = frame.rgba[i] ?? 0;
    bgra[i + 3] = frame.rgba[i + 3] ?? 0;
  }
  return nativeImage.createFromBitmap(bgra, { width: frame.width, height: frame.height, scaleFactor: 2 });
}

export class TrayService {
  readonly #tray: Tray;
  readonly #t: (key: MessageKey, values?: Record<string, string>) => string;
  readonly #actions: TrayActions;

  constructor(t: (key: MessageKey, values?: Record<string, string>) => string, actions: TrayActions) {
    this.#t = t;
    this.#actions = actions;
    this.#tray = new Tray(trayIcon());
    this.#tray.setToolTip(t('tray.tooltip'));
    this.#tray.on('click', () => {
      actions.toggleStage();
    });
  }

  update(state: TrayState): void {
    this.#tray.setContextMenu(Menu.buildFromTemplate(trayTemplate(state, this.#t, this.#actions)));
  }

  dispose(): void {
    this.#tray.destroy();
  }
}
