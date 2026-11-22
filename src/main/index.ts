// Main process entry (plan M0-02…07): single instance, app-wide hardening, the three windows, typed IPC,
// the stage overlay with its core, tray and the global toggle hotkey.
import { randomInt } from 'node:crypto';
import { app, globalShortcut, ipcMain, Menu, protocol, screen, session } from 'electron';
import { APP_ID } from '../shared/app.ts';
import { CHANNEL } from '../shared/ipc.ts';
import { WINDOW_ROLES } from '../shared/windows.ts';
import { isDebugLaunch } from './app/launch-guard.ts';
import { registerLifecycle } from './app/lifecycle.ts';
import { createTranslator } from './i18n.ts';
import { IpcRouter } from './ipc/handle.ts';
import { HotkeyService } from './services/hotkeys.ts';
import { TrayService } from './services/tray.ts';
import { StageController, stageWindowOptions } from './stage/controller.ts';
import { APP_SCHEME_PRIVILEGES, handleAppProtocol } from './windows/app-protocol.ts';
import { WindowManager } from './windows/manager.ts';
import { expectedPageUrl, rendererRoot, type PathContext } from './windows/paths.ts';
import { hardenSession, hardenWebContents } from './windows/secure.ts';

/** Global toggle for the character (owner decision D-9). */
const TOGGLE_ACCELERATOR = 'Control+Alt+P';

/** `--name=value` switch, or undefined. */
function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function main(): void {
  // A packaged build never runs with a debugger endpoint (rules/security.md).
  if (app.isPackaged && isDebugLaunch(process.argv, (name) => app.commandLine.hasSwitch(name))) {
    // exit, not quit: terminate at once so a debugger endpoint has no window while a graceful quit runs.
    app.exit(1);
    return;
  }
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  // Compat mode (S3, ADR 007): software compositing for GPUs that show black instead of transparency. Before ready.
  if (process.argv.includes('--compat-mode')) app.disableHardwareAcceleration();
  app.setAppUserModelId(APP_ID);
  // Must happen before ready: pages load from app://renderer/<role>/index.html, not file://.
  protocol.registerSchemesAsPrivileged([APP_SCHEME_PRIVILEGES]);

  // Every web contents (including any a compromised page might try to create) gets the navigation guards.
  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents);
    // Dev-only: renderer console (CSP violations, errors) in the terminal.
    if (!app.isPackaged) {
      contents.on('console-message', ({ level, message }) => {
        console.log(`[renderer:${level}] ${message}`);
      });
    }
  });

  const paths: PathContext = {
    mainDir: import.meta.dirname,
    isPackaged: app.isPackaged,
    devServerUrl: process.env['ELECTRON_RENDERER_URL'],
  };
  // `--perf-seed=<n>` fixes the core seed (pnpm perf); otherwise a fresh one per run. The seed only drives
  // behaviour (activity choice); never use it for anything security-relevant (tokens, ids, crypto).
  const seedArg = Number(argValue('perf-seed'));
  const seed = Number.isInteger(seedArg) ? seedArg : randomInt(0, 2 ** 31);

  const displayForStage = () => screen.getPrimaryDisplay();
  const windows = new WindowManager(paths, () => stageWindowOptions(displayForStage()));
  const stage = new StageController({
    stage: () => windows.windowOf('stage'),
    display: displayForStage,
    now: () => Date.now(),
    seed,
  });
  const ipc = new IpcRouter(ipcMain, {
    roleOf: (id) => WINDOW_ROLES.find((role) => windows.windowOf(role)?.webContents.id === id),
    expectedUrl: (role) => expectedPageUrl(role, paths),
  });
  ipc.handle(CHANNEL.ping, ({ nonce }) => ({ nonce, version: app.getVersion() }));
  stage.register(ipc);

  const t = createTranslator('uk');
  const hotkeys = new HotkeyService(globalShortcut);
  let tray: TrayService | undefined;
  const refreshTray = (): void => {
    tray?.update({
      stageVisible: windows.windowOf('stage')?.isVisible() ?? false,
      layer: stage.layer,
      preset: stage.preset,
      hotkey: hotkeys.status,
    });
  };
  const toggleStage = (): void => {
    const win = windows.windowOf('stage');
    if (win?.isVisible()) win.hide();
    else (win ?? windows.createStage()).showInactive();
    refreshTray();
  };

  void registerLifecycle(app, {
    ready: () => {
      hardenSession(session.defaultSession);
      handleAppProtocol(protocol, rendererRoot(paths));
      Menu.setApplicationMenu(null); // before any window: no default menu (and its devtools/reload accelerators)
      stage.attach(windows.createStage());

      const onDisplayChanged = (): void => {
        stage.onDisplayChanged();
      };
      screen.on('display-metrics-changed', onDisplayChanged);
      screen.on('display-added', onDisplayChanged);
      screen.on('display-removed', onDisplayChanged);

      tray = new TrayService(t, {
        toggleStage,
        showChat: () => {
          windows.showChat();
        },
        showSettings: () => {
          windows.showSettings();
        },
        setLayer: (layer) => {
          stage.setLayer(layer);
          refreshTray();
        },
        setPreset: (preset) => {
          stage.setPreset(preset);
          refreshTray();
        },
        nudge: (delta) => {
          stage.nudge(delta);
        },
        quit: () => {
          app.quit();
        },
      });
      hotkeys.bind(TOGGLE_ACCELERATOR, toggleStage);
      refreshTray();

      if (!app.isPackaged) {
        // Dev-only helpers: open the lazy windows at start; capture the stage over light/dark backdrops.
        if (process.argv.includes('--dev-windows')) {
          windows.showChat();
          windows.showSettings();
        }
        const captureDir = argValue('capture-stage');
        if (captureDir !== undefined) {
          // Loaded on demand: a separate chunk that a packaged app never imports.
          void import('./dev/capture.ts').then(({ captureStageForDev }) => {
            captureStageForDev(() => windows.windowOf('stage'), captureDir);
          });
        }
      }

      return () => {
        screen.removeListener('display-metrics-changed', onDisplayChanged);
        screen.removeListener('display-added', onDisplayChanged);
        screen.removeListener('display-removed', onDisplayChanged);
        tray?.dispose();
        tray = undefined;
      };
    },
    // A second launch only brings the companion back.
    secondInstance: () => {
      windows.createStage().showInactive();
      refreshTray();
    },
    beforeQuit: () => {
      ipc.dispose();
      windows.destroyAll();
    },
    willQuit: () => {
      hotkeys.dispose();
    },
  });
}

main();
