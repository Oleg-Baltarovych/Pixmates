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
import type { CoreEvent, CoreState, Effect, Layer, PointerInput, World } from '../../core/types.ts';
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
  #attached = false;
  /** The pack the core last refused; not retried (or re-logged) until the primary pack changes. */
  #refused: string | undefined;
  /** Rejections seen per `event:reason`, so a broken sensor logs once (then at powers of ten), not per event. */
  readonly #rejected = new Map<string, number>();
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
  /** Read-only view of the core state (diagnostics, tests); main never edits it. */
  get core(): CoreState | undefined {
    return this.#core;
  }

  register(ipc: IpcRouter): void {
    ipc.on(CHANNEL.stageHit, ({ overOpaque }) => {
      this.#dispatch({ type: 'input', input: { kind: 'hover', overOpaque } });
    });
    ipc.on(CHANNEL.stageInput, ({ kind }) => {
      const core = this.#ensureCore();
      if (core) this.#dispatch({ type: 'input', input: stageInput(core, kind) });
    });
  }

  /** Called once the stage window exists: click-through on, layer, scale. */
  attach(win: BrowserWindow): void {
    // Display metrics exist only after app ready, so the first scale is computed here, not in the constructor.
    this.#scale = this.#presetScale(this.#preset);
    this.#attached = true;
    win.setIgnoreMouseEvents(this.#ensureCore()?.hitThrough ?? true, { forward: true });
    this.#applyLayer(win);
    win.webContents.on('did-finish-load', () => {
      this.#pushCharacters();
    });
  }

  setPreset(preset: SizePreset): void {
    this.#preset = preset;
    this.#scale = this.#presetScale(preset);
    this.#pushCharacters();
    this.#pushWorld();
  }

  /** «Більше» / «Менше»: one integer step within [MIN_SCALE, clamp]. */
  nudge(delta: 1 | -1): void {
    const sizing = this.#sizing();
    if (!sizing) return;
    this.#scale = stepScale(this.#scale, delta, MIN_SCALE, maxScale(this.#scaleInput(0, sizing)));
    this.#pushCharacters();
    this.#pushWorld();
  }

  setLayer(layer: LayerMode): void {
    this.#layer = layer;
    const win = this.#deps.stage();
    if (win) this.#applyLayer(win);
    this.#pushWorld();
  }

  /** `display-metrics-changed` / `display-added` / `display-removed`: refit the overlay and the scale. */
  onDisplayChanged(): void {
    const win = this.#deps.stage();
    if (win) win.setBounds(this.#deps.display().workArea);
    this.#scale = this.#presetScale(this.#preset);
    this.#pushCharacters();
    this.#pushWorld();
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

  /** What main knows about the desktop now. M1-20/M1-22 feed the sensed windows and the tz offset. */
  #world(): World {
    const display = this.#deps.display();
    return {
      workArea: { width: display.workArea.width, height: display.workArea.height },
      windows: [],
      scale: this.#scale,
      scaleFactor: display.scaleFactor,
      layer: this.#layer,
      tzOffsetMin: 0,
    };
  }

  /** The core, built on first need after attach once a primary pack exists; undefined while there is none. */
  #ensureCore(): CoreState | undefined {
    if (this.#core || !this.#attached) return this.#core;
    const pack = this.#characters()[0]?.pack;
    if (!pack || pack.id === this.#refused) return undefined;
    const result = initialState({
      seed: this.#deps.seed,
      character: { id: pack.id, anims: Object.keys(pack.manifest.animations) },
      // M1-22 feeds the stored mood.
      world: this.#world(),
      now: this.#deps.now(),
    });
    if (result.ok) {
      this.#core = result.state;
    } else {
      this.#refused = pack.id;
      console.error(`[core] initial state rejected: ${result.reason}`);
    }
    return this.#core;
  }

  /** Scale, layer or display changed: tell the core (a freshly built core already has this world). */
  #pushWorld(): void {
    if (this.#core) this.#dispatch({ type: 'world', world: this.#world() });
    else this.#ensureCore();
  }

  #dispatch(event: CoreEvent): void {
    const core = this.#ensureCore();
    if (!core) return;
    const result = step(core, event, this.#deps.now());
    this.#core = result.state;
    for (const effect of result.effects) this.#interpret(effect);
  }

  #interpret(effect: Effect): void {
    switch (effect.type) {
      case 'SetHitThrough':
        this.#deps.stage()?.setIgnoreMouseEvents(effect.ignore, { forward: true });
        return;
      case 'Rejected': {
        const key = `${effect.event}: ${effect.reason}`;
        const count = (this.#rejected.get(key) ?? 0) + 1;
        this.#rejected.set(key, count);
        if (count === 1) console.warn(`[core] rejected ${key}`);
        else if (Number.isInteger(Math.log10(count))) console.warn(`[core] rejected ${key} (×${String(count)})`);
        return;
      }
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

/** The M0 `stage:input` contract has no release point or fling velocity yet (M1-17/M1-28 add them): report the
 * release at rest where the core stands. */
function stageInput(core: CoreState, kind: 'drag-start' | 'drag-end' | 'click'): PointerInput {
  if (kind !== 'drag-end') return { kind };
  return { kind, x: core.pos.x, y: core.pos.y, vx: 0, vy: 0 };
}
