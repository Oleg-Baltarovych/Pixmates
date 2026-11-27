// Animation fallback resolution (SPEC §5.1 `fallbacks`, plan M-ART MA-09). zod-free so the stage renderer can use it
// without bundling zod; `shared/pack.ts` re-exports it next to the manifest schema.

/** The idle names a pack may use as its base animation (SPEC §5.1 `idle`; the rig uses `idle_a`). */
export const IDLE_NAMES = ['idle', 'idle_a'] as const;

export interface Resolvable {
  readonly animations: Readonly<Record<string, unknown>>;
  readonly fallbacks: Readonly<Record<string, string>>;
}

/**
 * The animation to play for `name`: itself if present, else its fallback (exact key, then `ns:*`, then `*`),
 * followed through chains (max 4 hops, cycles stop), else the pack's idle. Undefined only for a pack without idle.
 */
export function resolveAnim(name: string, manifest: Resolvable): string | undefined {
  const { animations, fallbacks } = manifest;
  const seen = new Set<string>();
  let current = name;
  for (let hop = 0; hop <= 4; hop++) {
    if (Object.hasOwn(animations, current)) return current;
    if (seen.has(current)) break;
    seen.add(current);
    const colon = current.indexOf(':');
    const ns = colon > 0 ? `${current.slice(0, colon)}:*` : undefined;
    const next =
      (Object.hasOwn(fallbacks, current) ? fallbacks[current] : undefined) ??
      (ns !== undefined && Object.hasOwn(fallbacks, ns) ? fallbacks[ns] : undefined) ??
      (Object.hasOwn(fallbacks, '*') && !seen.has('*') ? fallbacks['*'] : undefined);
    if (next === undefined) break;
    current = next;
  }
  return IDLE_NAMES.find((n) => Object.hasOwn(animations, n));
}
