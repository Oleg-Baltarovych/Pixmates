// Privileged `app://` scheme for the renderer pages (review fix B1, rules/security.md). Pages load from
// `app://renderer/<role>/index.html` instead of `file://`, so the GrantFileProtocolExtraPrivileges fuse is off and
// a page can only ever read files inside out/renderer.
import { lstat, open, realpath } from 'node:fs/promises';
import { extname, isAbsolute, join, normalize, relative } from 'node:path';
import { PACK_ID } from '../../shared/pack.ts';

export const APP_SCHEME = 'app';
export const APP_HOST = 'renderer';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
/** Read-only host for character atlases (plan M-ART MA-10): `app://characters/<id>/sprites/<file>.png`. */
export const CHARACTERS_HOST = 'characters';

/** Registered before ready: standard (origin, relative URLs, CSP 'self'), secure context, fetch for module scripts. */
export const APP_SCHEME_PRIVILEGES = {
  scheme: APP_SCHEME,
  // corsEnabled: the stage page (app://renderer, or the dev server) fetches atlases from app://characters, a
  // different origin; responses carry Access-Control-Allow-Origin only for the allowed page origins.
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
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

const CHARACTER_FILE = /^[a-z0-9_-]{1,64}\.(?:png|webp)$/;
const CHARACTER_MIME: Readonly<Record<string, string>> = { '.png': 'image/png', '.webp': 'image/webp' };
/** No built-in atlas comes near this (≤ 2048² PNG); anything larger is not served. */
export const CHARACTER_FILE_MAX_BYTES = 16 * 1024 * 1024;

/**
 * Maps `app://characters/<id>/sprites/<file>.png|webp` to a file inside `root`, or undefined: exactly three
 * segments, a known pack id, a plain image name, no traversal / NTFS streams / DOS devices, containment-checked.
 */
export function resolveCharacterFile(
  rawUrl: string,
  root: string,
  known: (id: string, file: string) => boolean,
): ResolvedFile | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== CHARACTERS_HOST || url.search !== '' || url.hash !== '') {
    return undefined;
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return undefined;
  const segments = pathname.split('/').slice(1);
  const [id, dir, file] = segments;
  if (segments.length !== 3 || id === undefined || dir !== 'sprites' || file === undefined) return undefined;
  if (!PACK_ID.test(id) || !CHARACTER_FILE.test(file) || segments.some((s) => DOS_DEVICE.test(s)) || !known(id, file)) {
    return undefined;
  }
  const path = normalize(join(root, id, dir, file));
  const rel = relative(root, path);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return undefined;
  const mime = CHARACTER_MIME[extname(path).toLowerCase()];
  return mime === undefined ? undefined : { path, mime };
}

export interface CharacterHost {
  /** resources/characters (M5 adds userData/characters). */
  readonly root: string;
  /** Only the registered atlas of a pack the registry validated is served (`file` = name inside `sprites/`). */
  readonly known: (id: string, file: string) => boolean;
  /** Page origins that may read the atlases (CORS): app://renderer, plus the dev server when unpackaged. */
  readonly allowedOrigins: readonly string[];
}

async function serveCharacter(request: Request, host: CharacterHost): Promise<Response> {
  if (request.method !== 'GET') return new Response(null, { status: 405 });
  const file = resolveCharacterFile(request.url, host.root, host.known);
  if (!file) return new Response(null, { status: 404 });
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'content-type': file.mime,
    'x-content-type-options': 'nosniff',
    vary: 'Origin',
  };
  if (origin !== null && host.allowedOrigins.includes(origin)) headers['access-control-allow-origin'] = origin;
  const bytes = await readContainedFile(host.root, file.path, CHARACTER_FILE_MAX_BYTES);
  return bytes === undefined ? new Response(null, { status: 404 }) : new Response(bytes, { headers });
}

/** Renderer build files are small; anything larger is not served. */
export const RENDERER_FILE_MAX_BYTES = 32 * 1024 * 1024;

const inside = (root: string, path: string): boolean => {
  const rel = relative(root, path);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
};

/**
 * Reads `path` only if it is a regular file (not a symlink) whose real path (junctions and links on any segment
 * resolved) is still inside the real `root`, and no larger than `maxBytes`. The size is checked on the open handle
 * and the bytes are read from that same handle, so a swap between the check and the read cannot change the file.
 */
export async function readContainedFile(
  root: string,
  path: string,
  maxBytes: number,
): Promise<Buffer<ArrayBuffer> | undefined> {
  try {
    if ((await lstat(path)).isSymbolicLink()) return undefined;
    const [realRoot, real] = await Promise.all([realpath(root), realpath(path)]);
    if (!inside(realRoot, real)) return undefined;
    const handle = await open(real, 'r');
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > maxBytes) return undefined;
      const bytes = Buffer.alloc(info.size);
      const { bytesRead } = await handle.read(bytes, 0, info.size, 0);
      return bytesRead === info.size ? bytes : undefined;
    } finally {
      await handle.close();
    }
  } catch {
    return undefined;
  }
}

/** Structural slice of `Protocol`. */
export interface ProtocolLike {
  handle(scheme: string, handler: (request: Request) => Promise<Response>): void;
}

export function handleAppProtocol(protocol: ProtocolLike, root: string, characters?: CharacterHost): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const { url } = request;
    if (characters && url.startsWith(`${APP_SCHEME}://${CHARACTERS_HOST}/`)) return serveCharacter(request, characters);
    const file = resolveAppFile(url, root);
    if (!file) return new Response(null, { status: 404 });
    const bytes = await readContainedFile(root, file.path, RENDERER_FILE_MAX_BYTES);
    if (bytes === undefined) return new Response(null, { status: 404 });
    return new Response(bytes, { headers: { 'content-type': file.mime, 'x-content-type-options': 'nosniff' } });
  });
}
