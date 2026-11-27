// Stage renderer (plan M0-06 variant A, M-ART MA-11): a transparent overlay on the work area. Main pushes the
// character(s) to draw (`stage:characters`); the stage fetches each atlas from app://characters, cuts frame textures
// (nearest filtering), plays animations on a frame timer and renders only when a frame or position changes — the
// Pixi ticker runs only while dragging (rules/render.md, SPEC §3.3). Empty entries (no valid pack) → nothing drawn.
import 'pixi.js/unsafe-eval'; // first: strict CSP has no 'unsafe-eval'; swaps Pixi's generated shader code for static code
// Named imports only; `skipExtensionImports` below stops Pixi from loading its browser bundle at init.
import { Application, BufferImageSource, ImageSource, Rectangle, Sprite, Texture, type TextureSource } from 'pixi.js';
import { CLICK_SLOP_DIP, DRAG_FPS } from '../../content/stage.ts';
import { resolveAnim } from '../../shared/anim.ts';
import type { PayloadOf } from '../../shared/ipc.ts';
import { pingMain } from '../shared/ping.ts';
import { isOpaqueInFrame, type AlphaMask, type FrameRect } from './hit-test.ts';
import { labelGlyph } from './label.ts';

type Payload = PayloadOf<'stage:characters'>;
type Entry = Payload['entries'][number];

const stageApi = window.pixmates.stage;
if (!stageApi) throw new Error('stage preload API missing');
const api = stageApi;

// Subscribe before any await: main pushes on did-finish-load, which can fire while Pixi initialises.
let latest: Payload = { entries: [], animCycle: false };
let onPayload = (): void => undefined;
api.onCharacters((payload) => {
  latest = payload;
  onPayload();
});

/** Snap a DIP coordinate to a whole device pixel so nearest filtering stays crisp at 125 % / 150 %. */
const snap = (dip: number): number => Math.round(dip * window.devicePixelRatio) / window.devicePixelRatio;

if (import.meta.env.DEV) {
  document.addEventListener('securitypolicyviolation', (event) => {
    console.warn(`[csp] ${event.violatedDirective} blocked ${event.blockedURI || '(inline)'}`);
  });
}

/** Dev cycle (art lineup / --anim-cycle): idle ×3 → walk in place ×2 → happy ×1. */
const CYCLE: readonly (readonly [string, number])[] = [
  ['idle_a', 3],
  ['walk', 2],
  ['happy', 1],
];

interface Actor {
  readonly id: string;
  readonly entry: Entry;
  readonly sprite: Sprite;
  readonly label: Sprite | undefined;
  readonly mask: AlphaMask;
  readonly textures: ReadonlyMap<string, readonly Texture[]>;
  readonly sources: readonly TextureSource[];
  scale: number;
  anim: string;
  frame: number;
  loops: number;
  cycleStep: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  rect: FrameRect;
}

async function loadAtlas(url: string): Promise<{ bitmap: ImageBitmap; mask: AlphaMask }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`atlas ${url}: HTTP ${String(response.status)}`);
  const bitmap = await createImageBitmap(await response.blob(), { premultiplyAlpha: 'none' });
  // The alpha hit-test reads the atlas once (rules/render.md: hit-test against the current frame).
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2d context unavailable');
  context.drawImage(bitmap, 0, 0);
  const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  const alpha = new Uint8Array(bitmap.width * bitmap.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3] ?? 0;
  return { bitmap, mask: { width: bitmap.width, height: bitmap.height, alpha } };
}

async function start(): Promise<void> {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: false,
    autoStart: false,
    sharedTicker: false,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    roundPixels: true,
    preference: 'webgl',
    skipExtensionImports: true,
  });
  document.body.appendChild(app.canvas);
  app.ticker.maxFPS = DRAG_FPS;

  let actors: Actor[] = [];
  let builtFor = '';
  let renderQueued = false;
  const render = (): void => {
    if (app.ticker.started || renderQueued) return;
    renderQueued = true;
    queueMicrotask(() => {
      renderQueued = false;
      app.render();
    });
  };
  const pixelDip = (actor: Actor): number => actor.scale / window.devicePixelRatio;

  const showFrame = (actor: Actor): void => {
    const list = actor.textures.get(actor.anim);
    const texture = list?.[actor.frame % list.length];
    if (!texture) return;
    actor.sprite.texture = texture;
    const origin = actor.entry.animations[actor.anim]?.origin ?? { x: 0, y: 0 };
    const { w, h } = actor.entry.frameSize;
    actor.rect = { x: origin.x + (actor.frame % list.length) * w, y: origin.y, w, h };
  };

  const play = (actor: Actor, wanted: string): void => {
    actor.anim = resolveAnim(wanted, actor.entry) ?? actor.anim;
    actor.frame = 0;
    actor.loops = 0;
    showFrame(actor);
  };

  const tick = (actor: Actor): void => {
    const anim = actor.entry.animations[actor.anim];
    if (!anim) return;
    actor.timer = setTimeout(() => {
      actor.frame++;
      if (actor.frame >= anim.frames) {
        actor.frame = anim.loop ? 0 : anim.frames - 1;
        actor.loops++;
        const step = CYCLE[actor.cycleStep];
        if (latest.animCycle && step && actor.loops >= step[1]) {
          actor.cycleStep = (actor.cycleStep + 1) % CYCLE.length;
          play(actor, CYCLE[actor.cycleStep]?.[0] ?? 'idle_a');
        }
      }
      showFrame(actor);
      render();
      tick(actor);
    }, 1000 / anim.fps);
  };

  const destroyActors = (): void => {
    for (const actor of actors) {
      clearTimeout(actor.timer);
      actor.sprite.destroy();
      actor.label?.destroy();
      for (const list of actor.textures.values()) for (const t of list) t.destroy();
      for (const source of actor.sources) source.destroy();
    }
    actors = [];
  };

  const entryActor = async (entry: Entry): Promise<Actor> => {
    const { bitmap, mask } = await loadAtlas(entry.atlasUrl);
    const source = new ImageSource({ resource: bitmap, scaleMode: 'nearest', autoGenerateMipmaps: false });
    const textures = new Map<string, Texture[]>();
    for (const [name, anim] of Object.entries(entry.animations)) {
      const list: Texture[] = [];
      for (let f = 0; f < anim.frames; f++) {
        const frame = new Rectangle(
          anim.origin.x + f * entry.frameSize.w,
          anim.origin.y,
          entry.frameSize.w,
          entry.frameSize.h,
        );
        list.push(new Texture({ source, frame }));
      }
      textures.set(name, list);
    }
    const sources: TextureSource[] = [source];
    let label: Sprite | undefined;
    if (entry.label !== undefined) {
      const glyph = labelGlyph(entry.label);
      const labelSource = new BufferImageSource({
        resource: glyph.rgba,
        width: glyph.width,
        height: glyph.height,
        format: 'rgba8unorm',
        scaleMode: 'nearest',
        autoGenerateMipmaps: false,
      });
      sources.push(labelSource);
      label = new Sprite(new Texture({ source: labelSource }));
    }
    const actor: Actor = {
      id: entry.key,
      entry,
      sprite: new Sprite(Texture.EMPTY),
      label,
      mask,
      textures,
      sources,
      scale: entry.scale,
      anim: 'idle_a',
      frame: 0,
      loops: 0,
      cycleStep: 0,
      timer: undefined,
      rect: { x: 0, y: 0, w: entry.frameSize.w, h: entry.frameSize.h },
    };
    play(actor, latest.animCycle ? (CYCLE[0]?.[0] ?? 'idle_a') : 'idle_a');
    return actor;
  };

  let placed = false;
  const layout = (): void => {
    const gap = 40;
    if (!placed) {
      // First placement: standing on the taskbar edge, right-aligned, A…D left to right.
      let x = app.screen.width - 64;
      for (const actor of [...actors].reverse()) {
        actor.sprite.scale.set(pixelDip(actor));
        x -= actor.sprite.width;
        actor.sprite.position.set(snap(x), snap(app.screen.height - actor.sprite.height));
        x -= gap;
      }
      placed = actors.length > 0;
    }
    for (const actor of actors) {
      actor.sprite.scale.set(pixelDip(actor));
      // Pinned inside the overlay (never a negative position).
      const maxX = Math.max(0, app.screen.width - actor.sprite.width);
      const maxY = Math.max(0, app.screen.height - actor.sprite.height);
      actor.sprite.position.set(
        snap(Math.min(Math.max(actor.sprite.x, 0), maxX)),
        snap(Math.min(Math.max(actor.sprite.y, 0), maxY)),
      );
      if (actor.label) {
        actor.label.scale.set(Math.max(1, Math.round(actor.scale / 2)) / window.devicePixelRatio);
        actor.label.position.set(
          snap(actor.sprite.x + (actor.sprite.width - actor.label.width) / 2),
          snap(Math.max(0, actor.sprite.y - actor.label.height - 8)),
        );
      }
    }
    render();
  };

  let building = Promise.resolve();
  const apply = (): void => {
    building = building.then(async () => {
      app.renderer.resolution = window.devicePixelRatio;
      const payload = latest;
      const signature = payload.entries.map((e) => `${e.key}|${e.atlasUrl}`).join(';');
      // Rebuild on a new set of packs, or retry a set whose atlas failed to load (no fallback art: nothing drawn).
      if (signature !== builtFor || (actors.length === 0 && payload.entries.length > 0)) {
        destroyActors();
        try {
          actors = await Promise.all(payload.entries.map(entryActor));
        } catch (error) {
          console.error(`[stage] ${error instanceof Error ? error.message : String(error)}`);
          actors = [];
        }
        builtFor = signature;
        placed = false;
        for (const actor of actors) {
          app.stage.addChild(actor.sprite);
          if (actor.label) app.stage.addChild(actor.label);
          tick(actor);
        }
      } else {
        actors.forEach((actor, i) => {
          actor.scale = payload.entries[i]?.scale ?? actor.scale;
        });
      }
      layout();
      document.body.dataset['ready'] = 'true';
    });
  };
  onPayload = apply;
  // Pixel discipline (art-director round 1, item 12): the canvas backing store must equal the window's device-pixel
  // box exactly. `resizeTo: window` sized it from `innerWidth/innerHeight`, which are whole CSS px: at 125 % a work
  // area of 1032 device px is 825.6 CSS px, reported as 826, so the backing store (1032.5 → 1033 px) was stretched
  // back onto 1032 device px — a non-integer resample of every sprite. `devicePixelContentBoxSize` gives the exact
  // device box; the CSS size is set from it (fractional CSS px allowed), so one texel maps to `scale` device px.
  const fit = (deviceW: number, deviceH: number): void => {
    const dpr = window.devicePixelRatio;
    app.renderer.resolution = dpr;
    app.renderer.resize(deviceW / dpr, deviceH / dpr);
    layout();
  };
  const observer = new ResizeObserver((entries) => {
    const box = entries[0]?.devicePixelContentBoxSize[0];
    const dpr = window.devicePixelRatio;
    if (box) fit(box.inlineSize, box.blockSize);
    else fit(Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr));
  });
  observer.observe(document.body, { box: 'device-pixel-content-box' });

  // Click-through: report only changes of "over an opaque pixel of any character" (main toggles ignore).
  const actorAt = (x: number, y: number): Actor | undefined =>
    [...actors].reverse().find((a) => isOpaqueInFrame(a.mask, a.rect, a.sprite.x, a.sprite.y, pixelDip(a), x, y));
  let overOpaque = false;
  const hitAt = (x: number, y: number): void => {
    const now = actorAt(x, y) !== undefined;
    if (now === overOpaque) return;
    overOpaque = now;
    api.reportHit(now);
  };

  // Drag 1:1 with the pointer; a press without travel is a click.
  let drag:
    | { actor: Actor; pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean }
    | undefined;
  window.addEventListener('mousemove', (event) => {
    if (!drag) hitAt(event.clientX, event.clientY);
  });
  window.addEventListener('mouseleave', () => {
    if (!drag && overOpaque) {
      overOpaque = false;
      api.reportHit(false);
    }
  });
  window.addEventListener('pointerdown', (event) => {
    const actor = event.button === 0 ? actorAt(event.clientX, event.clientY) : undefined;
    if (!actor) return;
    app.canvas.setPointerCapture(event.pointerId);
    drag = {
      actor,
      pointerId: event.pointerId,
      dx: event.clientX - actor.sprite.x,
      dy: event.clientY - actor.sprite.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  });
  window.addEventListener('pointermove', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= CLICK_SLOP_DIP) {
      drag.moved = true;
      api.sendInput('drag-start');
      app.ticker.start();
    }
    if (drag.moved) {
      drag.actor.sprite.position.set(snap(event.clientX - drag.dx), snap(event.clientY - drag.dy));
      const label = drag.actor.label;
      if (label)
        label.position.set(
          snap(drag.actor.sprite.x + (drag.actor.sprite.width - label.width) / 2),
          snap(Math.max(0, drag.actor.sprite.y - label.height - 8)),
        );
    }
  });
  const endDrag = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) return;
    const wasDrag = drag.moved;
    drag = undefined;
    if (app.canvas.hasPointerCapture(event.pointerId)) app.canvas.releasePointerCapture(event.pointerId);
    if (wasDrag) {
      app.ticker.stop();
      layout();
      api.sendInput('drag-end');
    } else {
      api.sendInput('click');
    }
    overOpaque = !overOpaque; // force a fresh report for where the cursor is now
    hitAt(event.clientX, event.clientY);
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  apply();
  console.info(`[stage] main: ${await pingMain()}`);
}

void start();
