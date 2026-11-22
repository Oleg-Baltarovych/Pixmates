// Tray menu template (plan M0-07): a pure function of the app state, so it is unit-tested without Electron.
import type { MenuItemConstructorOptions } from 'electron';
import type { SizePreset } from '../../content/stage.ts';
import type { MessageKey } from '../i18n.ts';
import type { HotkeyStatus } from './hotkeys.ts';
import type { LayerMode } from '../stage/controller.ts';

export interface TrayState {
  readonly stageVisible: boolean;
  readonly layer: LayerMode;
  readonly preset: SizePreset;
  readonly hotkey: HotkeyStatus;
}

export interface TrayActions {
  toggleStage(): void;
  showChat(): void;
  showSettings(): void;
  setLayer(layer: LayerMode): void;
  setPreset(preset: SizePreset): void;
  nudge(delta: 1 | -1): void;
  quit(): void;
}

type Translate = (key: MessageKey, values?: Record<string, string>) => string;

export function trayTemplate(state: TrayState, t: Translate, actions: TrayActions): MenuItemConstructorOptions[] {
  const layer = (mode: LayerMode, key: MessageKey): MenuItemConstructorOptions => ({
    label: t(key),
    type: 'radio',
    checked: state.layer === mode,
    click: () => {
      actions.setLayer(mode);
    },
  });
  const size = (preset: SizePreset, key: MessageKey): MenuItemConstructorOptions => ({
    label: t(key),
    type: 'radio',
    checked: state.preset === preset,
    click: () => {
      actions.setPreset(preset);
    },
  });
  const conflict: MenuItemConstructorOptions[] =
    state.hotkey.kind === 'conflict'
      ? [{ label: t('hotkey.conflict', { accelerator: state.hotkey.accelerator }), enabled: false }]
      : [];
  return [
    {
      label: t(state.stageVisible ? 'tray.hide' : 'tray.show'),
      click: () => {
        actions.toggleStage();
      },
    },
    {
      label: t('tray.chat'),
      click: () => {
        actions.showChat();
      },
    },
    {
      label: t('tray.settings'),
      click: () => {
        actions.showSettings();
      },
    },
    { type: 'separator' },
    { label: t('tray.layer'), submenu: [layer('on-top', 'tray.layer.onTop'), layer('desktop', 'tray.layer.desktop')] },
    {
      label: t('tray.size'),
      submenu: [
        size('s', 'tray.size.s'),
        size('m', 'tray.size.m'),
        size('l', 'tray.size.l'),
        { type: 'separator' },
        {
          label: t('tray.size.bigger'),
          click: () => {
            actions.nudge(1);
          },
        },
        {
          label: t('tray.size.smaller'),
          click: () => {
            actions.nudge(-1);
          },
        },
      ],
    },
    ...conflict,
    { type: 'separator' },
    {
      label: t('tray.quit'),
      click: () => {
        actions.quit();
      },
    },
  ];
}
