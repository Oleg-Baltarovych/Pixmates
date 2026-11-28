// Stage controller (plan M0-06): feeds pointer input into the core and interprets its effects on the stage window;
// owns the overlay geometry, the integer sprite scale (D-10) and the layer mode (D-9).
import type { BrowserWindow, BrowserWindowConstructorOptions, Display } from 'electron';
import {
  DEFAULT_SIZE_PRESET,
  MAX_HEIGHT_FRACTION,
  MIN_SCALE,
  SIZE_PRESETS_DIP,
  type SizePreset,
} from '../../content/stage.ts';
import { maxScale, presetScales, stepScale, type ScaleInput } from '../../core/scale.ts';
import { initialState } from '../../core/state.ts';
import { step } from '../../core/step.ts';
import type { CoreEvent, CoreState, Effect, Layer, PointerInput } from '../../core/types.ts';
import { CHANNEL, type StageAnimation } from '../../shared/ipc.ts';
import type { Manifest } from '../../shared/pack.ts';
import { sendEvent, type IpcRouter } from '../ipc/handle.ts';
import type { StageCharacter } from '../characters/selection.ts';

/** One `stage:characters` animation entry from a validated manifest animation (pivot and facing pass through). */
export function stageAnimation(a: Manifest['animations'][string]): StageAnimation {
  return {
    frames: a.frames,
    fps: a.fps,
    loop: a.loop,
    origin: a.origin ?? { x: 0, y: 0 },
    // Per-animation pivot (sit_edge seat) and authored facing (ADR 010); the renderer mirrors facing in the dev cycle
    // (MA-33) and applies the pivot from M1.
    ...(a.anchor ? { anchor: a.anchor } : {}),
    ...(a.facing ? { facing: a.facing } : {}),
  };
}

export type LayerMode = Layer;

interface Sizing {
  readonly frameH: number;
  readonly refH: number | undefined;
}

/** Overlay window on the display's work area (SPEC §3.1 variant A). */
export function stageWindowOptions(
  display: Pick<Display, 'workArea'>,
): Omit<BrowserWindowConstructorOptions, 'webPreferences' | 'show'> {
  return {
    ...display.workArea,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    alwaysOnTop: true,
    title: 'Pixmates',
  };
}

export interface StageControllerDeps {
  readonly stage: () => BrowserWindow | undefined;
  readonly display: () => Pick<Display, 'workArea' | 'scaleFactor'>;
  readonly now: () => number;
  readonly seed: number;
  /** Packs on stage (1 in product; ≤ 4 in the dev lineup). Empty = no valid pack: nothing to draw or size. */
  readonly characters?: () => readonly StageCharacter[];
  /** Dev: cycle idle → walk → happy. */
  readonly animCycle?: boolean;
}

export class StageController {
  readonly #deps: StageControllerDeps;
  /** Undefined until attach (display metrics exist only after app ready) and while no valid pack is on stage. */
  #core: CoreState | undefined;
  #preset: SizePreset = DEFAULT_SIZE_PRESET;
  #scale = MIN_SCALE;
  #layer: LayerMode = 'on-top';

  constructor(deps: StageControllerDeps) {
    this.#deps = deps;
  }

  get preset(): SizePreset {
    return this.#preset;
  }
  get scale(): number {
    return this.#scale;
  }
  get layer(): LayerMode {
    return this.#layer;
  }

  register(ipc: IpcRouter): void {
    ipc.on(CHANNEL.stageHit, ({ overOpaque }) => {
      this.#dispatch({ type: 'input', input: { kind: 'hover', overOpaque } });
    });
    ipc.on(CHANNEL.stageInput, ({ kind }) => {
      this.#dispatch({ type: 'input', input: this.#stageInput(kind) });
    });
  }

  /** Called once the stage window exists: click-through on, layer, scale. */
  attach(win: BrowserWindow): void {
    // Display metrics exist only after app ready, so the first scale is computed here, not in the constructor.
    this.#scale = this.#presetScale(this.#preset);
    this.#core = this.#initialCore();
    win.setIgnoreMouseEvents(this.#core?.hitThrough ?? true, { forward: true });
    this.#applyLayer(win);
    win.webContents.on('did-finish-load', () => {
      this.#pushCharacters();
    });
  }

  setPreset(preset: SizePreset): void {
    this.#preset = preset;
    this.#scale = this.#presetScale(preset);
    this.#pushCharacters();
  }

  /** «Більше» / «Менше»: one integer step within [MIN_SCALE, clamp]. */
  nudge(delta: 1 | -1): void {
    const sizing = this.#sizing();
    if (!sizing) return;
    this.#scale = stepScale(this.#scale, delta, MIN_SCALE, maxScale(this.#scaleInput(0, sizing)));
    this.#pushCharacters();
  }

  setLayer(layer: LayerMode): void {
    this.#layer = layer;
    const win = this.#deps.stage();
    if (win) this.#applyLayer(win);
  }

  /** `display-metrics-changed` / `display-added` / `display-removed`: refit the overlay and the scale. */
  onDisplayChanged(): void {
    const win = this.#deps.stage();
    if (win) win.setBounds(this.#deps.display().workArea);
    this.#scale = this.#presetScale(this.#preset);
    this.#pushCharacters();
  }

  #characters(): readonly StageCharacter[] {
    return this.#deps.characters?.() ?? [];
  }

  /** Sizing of the primary character (frame height + manifest `scaleRef`, ADR 009); undefined = nothing on stage. */
  #sizing(): Sizing | undefined {
    const manifest = this.#characters()[0]?.pack.manifest;
    if (!manifest) return undefined;
    return { frameH: manifest.frameSize.h, refH: manifest.scaleRef };
  }

  #scaleInput(targetDip: number, { frameH, refH }: Sizing): ScaleInput {
    const display = this.#deps.display();
    return {
      targetDip,
      scaleFactor: display.scaleFactor,
      frameH,
      refH,
      workAreaHeightDip: display.workArea.height,
      maxFraction: MAX_HEIGHT_FRACTION,
      minScale: MIN_SCALE,
    };
  }

  /** Preset scale for `sizing` (default: the primary character); MIN_SCALE when no pack is on stage. */
  #presetScale(preset: SizePreset, sizing = this.#sizing()): number {
    return sizing ? presetScales(SIZE_PRESETS_DIP, this.#scaleInput(0, sizing))[preset] : MIN_SCALE;
  }

  #pushCharacters(): void {
    const win = this.#deps.stage();
    if (!win) return;
    const entries = this.#characters().map(({ key, label, pack }, index) => {
      const { manifest } = pack;
      const animations = Object.fromEntries(
        Object.entries(manifest.animations).map(([name, a]) => [name, stageAnimation(a)]),
      );
      return {
        key,
        ...(label === undefined ? {} : { label }),
        frameSize: manifest.frameSize,
        anchor: manifest.anchor,
        animations,
        fallbacks: manifest.fallbacks,
        atlasUrl: `app://characters/${pack.id}/${pack.atlas}`,
        // The primary character follows the fine steps; lineup entries use the preset for their own frame size.
        scale:
          index === 0
            ? this.#scale
            : this.#presetScale(this.#preset, { frameH: manifest.frameSize.h, refH: manifest.scaleRef }),
      };
    });
    const payload = { entries, animCycle: this.#deps.animCycle ?? false };
    if (!sendEvent(win.webContents, CHANNEL.stageCharacters, payload)) {
      console.error('[stage] stage:characters payload failed its contract');
    }
  }

  #applyLayer(win: BrowserWindow): void {
    // D-9: «поверх усіх вікон» (screen-saver level, above the taskbar) or «лише на робочому столі».
    if (this.#layer === 'on-top') win.setAlwaysOnTop(true, 'screen-saver');
    else win.setAlwaysOnTop(false);
  }

  /** Core state for the primary character on the current display; undefined (logged) when there is none to drive. */
  #initialCore(): CoreState | undefined {
    const pack = this.#characters()[0]?.pack;
    if (!pack) return undefined;
    const display = this.#deps.display();
    const result = initialState({
      seed: this.#deps.seed,
      character: { id: pack.id, anims: Object.keys(pack.manifest.animations) },
      // M1-20/M1-22 feed the sensed windows, the layer, the tz offset and the stored mood.
      world: {
        workArea: { width: display.workArea.width, height: display.workArea.height },
        windows: [],
        scale: this.#scale,
        scaleFactor: display.scaleFactor,
        layer: this.#layer,
        tzOffsetMin: 0,
      },
      now: this.#deps.now(),
    });
    if (result.ok) return result.state;
    console.error(`[core] initial state rejected: ${result.reason}`);
    return undefined;
  }

  /** The M0 `stage:input` contract has no release point or fling velocity yet (M1-17/M1-28 add them): report the
   * release at rest where the core stands. */
  #stageInput(kind: 'drag-start' | 'drag-end' | 'click'): PointerInput {
    if (kind !== 'drag-end') return { kind };
    return { kind, x: this.#core?.pos.x ?? 0, y: this.#core?.pos.y ?? 0, vx: 0, vy: 0 };
  }

  #dispatch(event: CoreEvent): void {
    if (!this.#core) return;
    const result = step(this.#core, event, this.#deps.now());
    this.#core = result.state;
    for (const effect of result.effects) this.#interpret(effect);
  }

  #interpret(effect: Effect): void {
    switch (effect.type) {
      case 'SetHitThrough':
        this.#deps.stage()?.setIgnoreMouseEvents(effect.ignore, { forward: true });
        return;
      case 'Rejected':
        console.warn(`[core] rejected ${effect.event}: ${effect.reason}`);
        return;
      case 'Show':
      case 'Fx':
      case 'OpenMenu':
      case 'LoadCharacter':
      case 'CommitSwitch':
      case 'PersistMood':
      case 'PersistActive':
      case 'SetSensing':
        // Interpreted from M1-22 (frame-state, switch, persistence, sensing); the stage plays only idle until then.
        return;
    }
  }
}
