// Content-Security-Policy for every renderer page (plan M0-02, rules/security.md). Injected as a <meta> into each
// HTML entry: the strict policy for `electron-vite build`, a relaxed one only for the dev server (Vite's dev client
// needs an inline React-refresh preamble, inline <style> tags and a HMR WebSocket). Production is never relaxed.
// `frame-ancestors` is ignored in <meta>; there are no frames anyway (navigation and webviews are denied in main).
import type { Plugin } from 'vite';

export const PROD_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' app://characters data: blob:",
  "connect-src 'self' app://characters",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export const DEV_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' app://characters data: blob:",
  "connect-src 'self' app://characters ws:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export function cspPlugin(): Plugin[] {
  const inject = (policy: string) => () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
      injectTo: 'head-prepend' as const,
    },
  ];
  return [
    { name: 'pixmates-csp-build', apply: 'build', transformIndexHtml: inject(PROD_CSP) },
    { name: 'pixmates-csp-serve', apply: 'serve', transformIndexHtml: inject(DEV_CSP) },
  ];
}
