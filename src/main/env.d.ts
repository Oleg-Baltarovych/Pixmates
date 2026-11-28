// `import.meta.env` as electron-vite defines it for main (same shape as `vite/client`, so the two merge in tests).
interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
