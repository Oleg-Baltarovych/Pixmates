/// <reference types="vite/client" />
import type { PixmatesApi } from '../shared/ipc.ts';

declare global {
  interface Window {
    /** Exposed by the window's preload (src/preload/<role>.ts). */
    readonly pixmates: PixmatesApi;
  }
}
