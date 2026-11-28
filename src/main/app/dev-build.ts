// The one gate for dev-only surfaces (M1-02 security review M1): debugger-switch bypass, devtools, the dev server
// URL, dev switches and the `src/main/dev/*` chunks. `app.isPackaged` alone is not enough: on Windows it only checks
// that the exe is not named `electron.exe`, so a renamed production exe would pass it.

/**
 * Dev-only surfaces are allowed: a dev build (`import.meta.env.DEV`, a literal Vite substitutes at build time; `false`
 * in `electron-vite build`) that is also running unpackaged. Always false in a production build.
 *
 * Code that must not even ship (the `src/main/dev/*` chunks) also tests `import.meta.env.DEV` literally at the
 * `import()` site: only a branch that is dead at transform time drops its dynamic import from the chunk graph; a
 * call to this function would still emit the chunks. `tools/check-build.ts` (last step of `pnpm build`) checks the build output;
 * its rules are tested in `tests/unit/tools/dev-leak.test.ts`.
 */
export function devSurfaces(isPackaged: boolean): boolean {
  return import.meta.env.DEV && !isPackaged;
}
