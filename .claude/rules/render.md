---
paths:
  - "src/renderer/stage/**"
---
# Stage render rules (PixiJS v8) — SPEC §3.1, §3.3, §5

- The stage draws the core's state and sends input (hover, click, drag, fling, petting circles). It makes no behaviour decisions.
- Pixel discipline:
  - integer physical scale from `computeScale` (target DIP × scaleFactor / frameH, SPEC §3.3), sized so the sprite is exactly frameH × scale device px;
  - nearest filtering (`scaleMode: 'nearest'`), `roundPixels`, integer positions;
  - non-integer scaling only for deliberate squash/stretch.
- Budget:
  - `ticker.maxFPS` follows the current action: ~12 in idle, 30–60 during physics or drag, ≤ 2 or paused in `sleep`/`hidden`;
  - render only when a frame or position changes;
  - one atlas per character (≤ 2048²) + the shared FX atlas;
  - FX particles ≤ 30 on screen.
- Click-through:
  - alpha hit-test against the current frame on `mousemove`;
  - ask main to stop ignoring mouse events only over opaque pixels, and restore ignore as soon as the cursor leaves;
  - debounce the IPC.
- Motion: interpolate between core positions (the core runs at 10 Hz). Drag follows the cursor 1:1; fling velocity is measured over the last ~100 ms and sent to the core.
- Destroy what you create on character removal: textures, sprites, tickers, listeners. No leaks when switching characters.
- Animation names come from the manifest. Missing names go through `fallbacks`; never crash on a missing animation.
- Check Pixi v8 APIs with pixijs-skills, context7 or the installed typings, not memory.
- Visual changes are verified with stage screenshots over light and dark wallpapers; continuous changes with `/perf`.
