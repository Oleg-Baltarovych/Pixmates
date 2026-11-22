// Stage renderer (plan M0-06, variant A): a transparent overlay on the work area with one placeholder sprite.
// It draws and sends input; main + core decide click-through and drag state. Frames render on demand: the
// ticker runs only while dragging (rules/render.md, SPEC §3.3).
import 'pixi.js/unsafe-eval'; // first: strict CSP has no 'unsafe-eval'; swaps Pixi's generated shader code for static code
// Named imports only, so the bundler drops the unused parts of pixi.js; `skipExtensionImports` below stops Pixi from
// loading its browser bundle (accessibility, DOM, events, filters) at init: one sprite needs none of them.
import { Application, BufferImageSource, Sprite, Texture } from 'pixi.js';
import { CLICK_SLOP_DIP, DRAG_FPS, MIN_SCALE } from '../../content/stage.ts';
import { pingMain } from '../shared/ping.ts';
import { isOpaqueAt } from './hit-test.ts';
import { placeholderFrame } from '../../shared/placeholder-art.ts';

const stageApi = window.pixmates.stage;
if (!stageApi) throw new Error('stage preload API missing');
const api = stageApi;

// Subscribe before any await: main pushes the scale on did-finish-load, which can fire while Pixi initialises.
let scale = MIN_SCALE;
let onScaleChanged = (): void => undefined;
api.onScale(({ scale: next }) => {
  scale = next;
  onScaleChanged();
});

/** Snap a DIP coordinate to a whole device pixel so nearest filtering stays crisp at 125 % / 150 %. */
const snap = (dip: number): number => Math.round(dip * window.devicePixelRatio) / window.devicePixelRatio;

// Dev only: CSP violations reach the terminal through main's dev console relay.
if (import.meta.env.DEV) {
  document.addEventListener('securitypolicyviolation', (event) => {
    console.warn(`[csp] ${event.violatedDirective} blocked ${event.blockedURI || '(inline)'}`);
  });
}

async function start(): Promise<void> {
  const app = new Application();
  await app.init({
    backgroundAlpha: 0,
    antialias: false,
    autoStart: false,
    sharedTicker: false,
    resizeTo: window,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    roundPixels: true,
    preference: 'webgl',
    skipExtensionImports: true,
  });
  document.body.appendChild(app.canvas);
  app.ticker.maxFPS = DRAG_FPS;

  const frame = placeholderFrame();
  const source = new BufferImageSource({
    resource: frame.rgba,
    width: frame.width,
    height: frame.height,
    format: 'rgba8unorm',
    scaleMode: 'nearest',
    autoGenerateMipmaps: false,
  });
  const sprite = new Sprite(new Texture({ source }));
  app.stage.addChild(sprite);

  /** Width of one art pixel in DIP (device pixels per art pixel ÷ devicePixelRatio). */
  const pixelDip = (): number => scale / window.devicePixelRatio;
  let placed = false;

  const render = (): void => {
    if (!app.ticker.started) app.render();
  };

  const layout = (): void => {
    sprite.scale.set(pixelDip());
    if (!placed) {
      // First placement: bottom-right of the work area, standing on the taskbar edge.
      sprite.position.set(snap(window.innerWidth - sprite.width - 64), snap(window.innerHeight - sprite.height));
      placed = true;
    }
    // Pinned to the top-left if the overlay is ever smaller than the sprite (never a negative position).
    const maxX = Math.max(0, window.innerWidth - sprite.width);
    const maxY = Math.max(0, window.innerHeight - sprite.height);
    sprite.position.set(snap(Math.min(Math.max(sprite.x, 0), maxX)), snap(Math.min(Math.max(sprite.y, 0), maxY)));
    render();
  };

  onScaleChanged = () => {
    app.renderer.resolution = window.devicePixelRatio;
    layout();
  };
  window.addEventListener('resize', layout);

  // Click-through: report only changes of "over an opaque pixel" (main toggles setIgnoreMouseEvents).
  let overOpaque = false;
  const hitAt = (x: number, y: number): void => {
    const now = isOpaqueAt(frame, sprite.x, sprite.y, pixelDip(), x, y);
    if (now === overOpaque) return;
    overOpaque = now;
    api.reportHit(now);
  };

  // Drag 1:1 with the pointer; a press without travel is a click.
  let drag: { pointerId: number; dx: number; dy: number; startX: number; startY: number; moved: boolean } | undefined;

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
    if (event.button !== 0 || !isOpaqueAt(frame, sprite.x, sprite.y, pixelDip(), event.clientX, event.clientY)) return;
    app.canvas.setPointerCapture(event.pointerId);
    drag = {
      pointerId: event.pointerId,
      dx: event.clientX - sprite.x,
      dy: event.clientY - sprite.y,
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
      sprite.position.set(snap(event.clientX - drag.dx), snap(event.clientY - drag.dy));
    }
  });
  const endDrag = (event: PointerEvent): void => {
    if (drag?.pointerId !== event.pointerId) return;
    const wasDrag = drag.moved;
    drag = undefined;
    if (app.canvas.hasPointerCapture(event.pointerId)) app.canvas.releasePointerCapture(event.pointerId);
    if (wasDrag) {
      app.ticker.stop();
      layout(); // keep the sprite on screen, render the final frame
      api.sendInput('drag-end');
    } else {
      api.sendInput('click');
    }
    overOpaque = !overOpaque; // force a fresh report for where the cursor is now
    hitAt(event.clientX, event.clientY);
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  layout();
  document.body.dataset['ready'] = 'true';
  console.info(`[stage] main: ${await pingMain()}`);
}

void start();
