import { describe, expect, it, vi } from 'vitest';
import type { MenuItemConstructorOptions } from 'electron';
import { HotkeyService, type ShortcutApi } from '../../../src/main/services/hotkeys.ts';
import { trayTemplate, type TrayState } from '../../../src/main/services/tray-menu.ts';
import { StageController } from '../../../src/main/stage/controller.ts';
import { createTranslator } from '../../../src/main/i18n.ts';
import en from '../../../src/i18n/locales/en.json';
import uk from '../../../src/i18n/locales/uk.json';

function fakeShortcuts(taken: readonly string[] = []) {
  const registered = new Map<string, () => void>();
  const api: ShortcutApi = {
    register: (accelerator, callback) => {
      if (taken.includes(accelerator) || registered.has(accelerator)) return false;
      registered.set(accelerator, callback);
      return true;
    },
    unregister: (accelerator) => {
      registered.delete(accelerator);
    },
    unregisterAll: () => {
      registered.clear();
    },
  };
  return { api, registered };
}

describe('HotkeyService', () => {
  it('registers the toggle and fires it', () => {
    const fake = fakeShortcuts();
    const service = new HotkeyService(fake.api);
    const onPress = vi.fn();
    expect(service.bind('Control+Alt+P', onPress)).toEqual({ kind: 'registered', accelerator: 'Control+Alt+P' });
    fake.registered.get('Control+Alt+P')?.();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports a conflict instead of throwing when another app owns the combination', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const service = new HotkeyService(fakeShortcuts(['Control+Alt+P']).api);
    expect(service.bind('Control+Alt+P', vi.fn())).toEqual({ kind: 'conflict', accelerator: 'Control+Alt+P' });
    expect(service.status.kind).toBe('conflict');
  });

  it('can bind again (releases the previous binding first) and unregisters everything on dispose', () => {
    const fake = fakeShortcuts();
    const service = new HotkeyService(fake.api);
    service.bind('Control+Alt+P', vi.fn());
    expect(service.bind('Control+Alt+P', vi.fn()).kind).toBe('registered');
    expect(service.bind('Control+Alt+O', vi.fn()).kind).toBe('registered');
    expect([...fake.registered.keys()]).toEqual(['Control+Alt+O']);
    service.dispose();
    expect(fake.registered.size).toBe(0);
    expect(service.status).toEqual({ kind: 'idle' });
  });
});

describe('locales', () => {
  it('uk and en have the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(uk).sort());
  });

  it('translates flat keys with interpolation', () => {
    const t = createTranslator('uk');
    expect(t('tray.size')).toBe('Розмір');
    expect(t('tray.size.m')).toBe('Середній');
    expect(t('hotkey.conflict', { accelerator: 'Ctrl+Alt+P' })).toContain('Ctrl+Alt+P');
    expect(createTranslator('en')('tray.quit')).toBe('Quit');
  });
});

describe('trayTemplate', () => {
  const t = createTranslator('uk');
  const actions = () => ({
    toggleStage: vi.fn(),
    showChat: vi.fn(),
    showSettings: vi.fn(),
    setLayer: vi.fn(),
    setPreset: vi.fn(),
    nudge: vi.fn(),
    quit: vi.fn(),
  });
  const state: TrayState = {
    stageVisible: true,
    layer: 'on-top',
    preset: 'm',
    hotkey: { kind: 'registered', accelerator: 'Control+Alt+P' },
  };
  const find = (items: MenuItemConstructorOptions[], label: string): MenuItemConstructorOptions | undefined => {
    for (const item of items) {
      if (item.label === label) return item;
      if (Array.isArray(item.submenu)) {
        const inner = find(item.submenu, label);
        if (inner) return inner;
      }
    }
    return undefined;
  };
  const click = (item: MenuItemConstructorOptions | undefined): void => {
    // The template's click handlers ignore their Electron arguments.
    (item?.click as (() => void) | undefined)?.();
  };

  it('shows hide/show by stage visibility and checks the current layer and size', () => {
    const items = trayTemplate(state, t, actions());
    expect(find(items, 'Сховати персонажа')).toBeDefined();
    expect(find(trayTemplate({ ...state, stageVisible: false }, t, actions()), 'Показати персонажа')).toBeDefined();
    expect(find(items, 'Поверх усіх вікон')?.checked).toBe(true);
    expect(find(items, 'Лише на робочому столі')?.checked).toBe(false);
    expect(find(items, 'Середній')?.checked).toBe(true);
  });

  it('wires layer, size, fine steps and quit to the actions', () => {
    const a = actions();
    const items = trayTemplate(state, t, a);
    click(find(items, 'Лише на робочому столі'));
    click(find(items, 'Великий'));
    click(find(items, 'Більше'));
    click(find(items, 'Менше'));
    click(find(items, 'Вийти'));
    expect(a.setLayer).toHaveBeenCalledWith('desktop');
    expect(a.setPreset).toHaveBeenCalledWith('l');
    expect(a.nudge).toHaveBeenNthCalledWith(1, 1);
    expect(a.nudge).toHaveBeenNthCalledWith(2, -1);
    expect(a.quit).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled conflict notice only when the hotkey is taken', () => {
    const label = t('hotkey.conflict', { accelerator: 'Control+Alt+P' });
    expect(find(trayTemplate(state, t, actions()), label)).toBeUndefined();
    const conflict = trayTemplate(
      { ...state, hotkey: { kind: 'conflict', accelerator: 'Control+Alt+P' } },
      t,
      actions(),
    );
    expect(find(conflict, label)?.enabled).toBe(false);
  });
});

describe('StageController', () => {
  it('does not read display metrics before attach (screen is unavailable before app ready)', () => {
    const display = vi.fn(() => ({ workArea: { x: 0, y: 0, width: 1536, height: 816 }, scaleFactor: 1.25 }));
    const controller = new StageController({ stage: () => undefined, display, now: () => 0, seed: 1 });
    expect(display).not.toHaveBeenCalled();
    expect(controller.preset).toBe('m');
    expect(controller.layer).toBe('on-top');
  });

  it('steps the scale within the clamp and returns to the preset scale on a preset change', () => {
    const display = () => ({ workArea: { x: 0, y: 0, width: 1536, height: 816 }, scaleFactor: 1.25 });
    const controller = new StageController({ stage: () => undefined, display, now: () => 0, seed: 1 });
    controller.setPreset('m');
    expect(controller.scale).toBe(5);
    controller.nudge(1);
    controller.nudge(1);
    controller.nudge(1);
    expect(controller.scale).toBe(7); // clamp: 25 % of 816 DIP at 125 %
    controller.setPreset('s');
    expect(controller.scale).toBe(4);
  });
});
