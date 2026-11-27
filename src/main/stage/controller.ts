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
import { initialState, step } from '../../core/step.ts';
import type { CoreEvent, CoreState, Effect } from '../../core/types.ts';
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
    // Per-animation pivot (sit_edge seat) and authored facing (ADR 010); the renderer ignores both until M1.
    ...(a.anchor ? { anchor: a.anchor } : {}),
    ...(a.facing ? { facing: a.facing } : {}),
  };
}

export type LayerMode = 'on-top' | 'desktop';

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
  #core: CoreState;
  #preset: SizePreset = DEFAULT_SIZE_PRESET;
  #scale = MIN_SCALE;
  #layer: LayerMode = 'on-top';

  constructor(deps: StageControllerDeps) {
    this.#deps = deps;
    this.#core = initialState(deps.seed);
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
      this.#dispatch({ type: 'input', input: { kind } });
    });
  }

  /** Called once the stage window exists: click-through on, layer, scale. */
  attach(win: BrowserWindow): void {
    // Display metrics exist only after app ready, so the first scale is computed here, not in the constructor.
    this.#scale = this.#presetScale(this.#preset);
    win.setIgnoreMouseEvents(this.#core.hitThrough, { forward: true });
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

  #dispatch(event: CoreEvent): void {
    const result = step(this.#core, event, this.#deps.now());
    this.#core = result.state;
    for (const effect of result.effects) this.#interpret(effect);
  }

  #interpret(effect: Effect): void {
    switch (effect.type) {
      case 'SetHitThrough':
        this.#deps.stage()?.setIgnoreMouseEvents(effect.ignore, { forward: true });
        return;
      case 'PlayAnimation':
        // The stage plays only idle until M1 behaviour sends animations to the renderer.
        return;
    }
  }
}
