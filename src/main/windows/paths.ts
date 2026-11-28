// Where each window's page and preload live, and the page URL main expects IPC senders to come from.
import { join } from 'node:path';
import type { WindowRole } from '../../shared/windows.ts';
import { APP_ORIGIN } from './app-protocol.ts';

/** Where a window's page comes from: always a URL (dev server in dev, the `app://` scheme otherwise). */
export interface PageSource {
  readonly url: string;
}

export interface PathContext {
  /** Directory of the bundled main script (`out/main`). */
  readonly mainDir: string;
  /** Dev-only surfaces allowed (`devSurfaces` in app/dev-build.ts): a dev build running unpackaged. */
  readonly dev: boolean;
  /** `process.env.ELECTRON_RENDERER_URL`, set by `electron-vite dev`. */
  readonly devServerUrl: string | undefined;
}

/**
 * The dev server URL, only in a dev run and only on loopback http. A production build ignores the variable,
 * so an environment variable can never point a window that has a preload at a remote page.
 */
export function trustedDevServerUrl(ctx: PathContext): string | undefined {
  if (!ctx.dev || ctx.devServerUrl === undefined) return undefined;
  let url: URL;
  try {
    url = new URL(ctx.devServerUrl);
  } catch {
    return undefined;
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'http:' || !loopback || url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return undefined;
  }
  return url.origin;
}

export function pageSource(role: WindowRole, ctx: PathContext): PageSource {
  const dev = trustedDevServerUrl(ctx);
  return { url: `${dev ?? APP_ORIGIN}/${role}/index.html` };
}

/** The built renderer pages (`out/renderer`): the only directory the `app://` scheme serves. */
export function rendererRoot(ctx: PathContext): string {
  return join(ctx.mainDir, '..', 'renderer');
}

/** The exact page URL (no query/hash) a legitimate sender frame of this role has. */
export function expectedPageUrl(role: WindowRole, ctx: PathContext): string {
  return pageSource(role, ctx).url;
}

export function preloadPath(role: WindowRole, ctx: PathContext): string {
  return join(ctx.mainDir, '..', 'preload', `${role}.cjs`);
}
