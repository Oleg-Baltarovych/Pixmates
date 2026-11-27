// System tray (plan M0-07). Rebuilds its menu from TrayState whenever something it shows changes.
import { join } from 'node:path';
import { Menu, nativeImage, Tray, type NativeImage } from 'electron';
import type { CharacterPack } from '../characters/registry.ts';
import type { MessageKey } from '../i18n.ts';
import { trayIconRect } from './tray-icon.ts';
import { trayTemplate, type TrayActions, type TrayState } from './tray-menu.ts';

/** Tray icon from the active character's idle frame (tray-icon.ts): 32×32 art px at scale factor 2 = 16 DIP.
 * No pack (main has already logged the error) → an empty icon; the menu still works. */
function trayIcon(pack: CharacterPack | undefined): NativeImage {
  if (!pack) return nativeImage.createEmpty();
  const atlas = nativeImage.createFromPath(join(pack.dir, pack.atlas));
  if (atlas.isEmpty()) return atlas;
  const crop = atlas.crop(trayIconRect(pack.manifest));
  return nativeImage.createFromBuffer(crop.toPNG(), { scaleFactor: 2 });
}

export class TrayService {
  readonly #tray: Tray;
  readonly #t: (key: MessageKey, values?: Record<string, string>) => string;
  readonly #actions: TrayActions;

  constructor(
    t: (key: MessageKey, values?: Record<string, string>) => string,
    actions: TrayActions,
    character: CharacterPack | undefined,
  ) {
    this.#t = t;
    this.#actions = actions;
    this.#tray = new Tray(trayIcon(character));
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
