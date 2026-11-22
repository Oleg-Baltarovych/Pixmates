// Privileged `app://` scheme for the renderer pages (review fix B1, rules/security.md). Pages load from
// `app://renderer/<role>/index.html` instead of `file://`, so the GrantFileProtocolExtraPrivileges fuse is off and
// a page can only ever read files inside out/renderer.
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, normalize, relative } from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'renderer';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/** Registered before ready: standard (origin, relative URLs, CSP 'self'), secure context, fetch for module scripts. */
export const APP_SCHEME_PRIVILEGES = {
  scheme: APP_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true },
} as const;

/** The types the renderer build emits; anything else is not served. */
const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const SAFE_SEGMENT = /^[A-Za-z0-9_-](?:[A-Za-z0-9._-]*[A-Za-z0-9_-])?$/;
const DOS_DEVICE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export interface ResolvedFile {
  readonly path: string;
  readonly mime: string;
}

/** Maps an `app://renderer/...` URL to a file inside `root`, or undefined (wrong origin, traversal, unknown type). */
export function resolveAppFile(rawUrl: string, root: string): ResolvedFile | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) return undefined;
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return undefined;
  // Every segment is a plain build-output name: no `:` (NTFS streams), no trailing dot/space, no DOS device names.
  const segments = pathname.split('/').slice(1);
  if (segments.some((s) => !SAFE_SEGMENT.test(s) || DOS_DEVICE.test(s))) return undefined;
  const file = normalize(join(root, pathname));
  const rel = relative(root, file);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return undefined;
  const mime = MIME[extname(file).toLowerCase()];
  return mime === undefined ? undefined : { path: file, mime };
}

/** Structural slice of `Protocol`. */
export interface ProtocolLike {
  handle(scheme: string, handler: (request: Request) => Promise<Response>): void;
}

export function handleAppProtocol(protocol: ProtocolLike, root: string): void {
  protocol.handle(APP_SCHEME, async ({ url }) => {
    const file = resolveAppFile(url, root);
    if (!file) return new Response(null, { status: 404 });
    try {
      return new Response(await readFile(file.path), {
        headers: { 'content-type': file.mime, 'x-content-type-options': 'nosniff' },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}
