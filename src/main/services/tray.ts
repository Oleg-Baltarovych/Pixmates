// System tray (plan M0-07). Rebuilds its menu from TrayState whenever something it shows changes.
import { join } from 'node:path';
import { Menu, nativeImage, Tray, type NativeImage } from 'electron';
import { isBuiltinPackId } from '../../shared/pack.ts';
import { readContainedSync, type CharacterPack } from '../characters/registry.ts';
import type { MessageKey } from '../i18n.ts';
import { CHARACTER_FILE_MAX_BYTES } from '../windows/app-protocol.ts';
import { idleFrameRect, trayIconCrop, trayIconProblem } from './tray-icon.ts';
import { trayTemplate, type TrayActions, type TrayState } from './tray-menu.ts';

/**
 * Tray icon from the active character's idle frame (tray-icon.ts), shown at 16 DIP. Pack bytes are decoded in main,
 * so: built-ins only, contained + size-capped read (no links), decoded size = the header the registry validated.
 * Any failure → an empty icon and a log line; the menu still works.
 */
function trayIcon(charactersRoot: string, pack: CharacterPack | undefined): NativeImage {
  if (!pack) return nativeImage.createEmpty(); // main has already logged the error
  try {
    if (!isBuiltinPackId(pack.id)) throw new Error('not a built-in pack');
    const bytes = readContainedSync(charactersRoot, join(pack.dir, pack.atlas), CHARACTER_FILE_MAX_BYTES);
    const atlas = nativeImage.createFromBuffer(bytes);
    const problem = trayIconProblem(pack, atlas.getSize());
    if (problem !== undefined) throw new Error(problem);
    const frame = idleFrameRect(pack.manifest);
    const { width, height } = atlas.getSize();
    const crop = frame && trayIconCrop(frame, { width, height, data: atlas.toBitmap() });
    if (!crop) throw new Error('no opaque idle frame to crop');
    const icon = atlas.crop(crop.rect);
    if (icon.isEmpty()) throw new Error('empty crop');
    return nativeImage.createFromBuffer(icon.toPNG(), { scaleFactor: crop.scaleFactor });
  } catch (error) {
    console.warn(`[tray] ${pack.id}: no character icon (${error instanceof Error ? error.message : String(error)})`);
    return nativeImage.createEmpty();
  }
}

export class TrayService {
  readonly #tray: Tray;
  readonly #t: (key: MessageKey, values?: Record<string, string>) => string;
  readonly #actions: TrayActions;

  constructor(
    t: (key: MessageKey, values?: Record<string, string>) => string,
    actions: TrayActions,
    character: CharacterPack | undefined,
    charactersRoot: string,
  ) {
    this.#t = t;
    this.#actions = actions;
    this.#tray = new Tray(trayIcon(charactersRoot, character));
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
