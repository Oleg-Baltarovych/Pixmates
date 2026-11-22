import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { cspPlugin } from './tools/lib/csp.ts';

const root = import.meta.dirname;
const WINDOWS = ['stage', 'chat', 'settings'] as const;

export default defineConfig({
  // Main: ESM (package.json `type: module`), runtime dependencies externalized and shipped in app.asar.
  main: {
    build: { rolldownOptions: { input: { index: resolve(root, 'src/main/index.ts') } } },
  },
  // Preloads run sandboxed (`sandbox: true`): no `require` of node_modules and no ESM. Each preload is one
  // self-contained CommonJS file (electron-vite docs: isolated build + externalizeDeps off; with `type: module`
  // electron-vite would default to ESM `.mjs`, which a sandboxed preload cannot load).
  preload: {
    build: {
      externalizeDeps: false,
      isolatedEntries: true,
      rolldownOptions: {
        input: Object.fromEntries(WINDOWS.map((name) => [name, resolve(root, `src/preload/${name}.ts`)])),
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: resolve(root, 'src/renderer'),
    plugins: [react(), cspPlugin()],
    // Pre-bundled up front: a first-run dependency discovery would full-reload the dev windows.
    optimizeDeps: { include: ['pixi.js', 'pixi.js/unsafe-eval', 'react', 'react-dom/client'] },
    build: {
      rolldownOptions: {
        input: Object.fromEntries(WINDOWS.map((name) => [name, resolve(root, `src/renderer/${name}/index.html`)])),
      },
    },
  },
});
