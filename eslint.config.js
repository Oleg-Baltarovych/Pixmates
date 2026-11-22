// @ts-check
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Pure layers (src/core, src/content, src/shared) — 1:1 with .claude/hooks/core-purity.mjs (SPEC §3, ADR 002).
// Each message carries a `core-purity[<rule>]` tag; tests/unit/lint/core-purity.test.ts checks every tag
// against a fixture.
const msg = (/** @type {string} */ rule, /** @type {string} */ text) => `core-purity[${rule}]: ${text}`;
const PLATFORM_PACKAGE = msg('platform-package', 'pure layers must not import platform / render / UI / AI packages.');
const NODE_BUILTIN = msg('node-builtin', 'pure layers must not import Node built-ins.');
const OUTER_LAYER = msg('outer-layer', 'pure layers must not import from main / renderer / preload.');
const CLOCK = msg('clock', 'pure layers must not read the clock — take `now` as a parameter.');
const RANDOM = msg('random', 'pure layers must not use Math.random — use the seeded RNG (core/rng.ts).');
const BROWSER_GLOBAL = msg('browser-global', 'pure layers must not touch browser / process globals.');
const TIMER = msg('timer', 'pure layers must not schedule timers — main drives the core with events.');
const REQUIRE = msg('require', 'pure layers are ESM and dependency-free — no require().');

const PLATFORM_PACKAGES =
  '^(electron|pixi\.js|react|react-dom|zustand|systeminformation|get-windows|ai|ai-sdk-ollama|electron-store|better-sqlite3)(/.*)?$';
const NODE_BUILTINS = '^(node:.+|fs|path|os|child_process|http|https|net|crypto|events|worker_threads)(/.*)?$';

const PURE_PATTERNS = [
  { regex: PLATFORM_PACKAGES, message: PLATFORM_PACKAGE },
  { regex: '^@(pixi|ai-sdk|modelcontextprotocol)/', message: PLATFORM_PACKAGE },
  { regex: NODE_BUILTINS, message: NODE_BUILTIN },
  { regex: '^(\.\./)+(main|renderer|preload)(/|$)', message: OUTER_LAYER },
];

// Process boundaries (rules/main.md, rules/ipc.md): renderers and preloads never reach into main or Node;
// main never imports renderer code.
const NO_MAIN = {
  regex: '^(\.\./)+main(/|$)',
  message: 'boundary[no-main]: renderer and preload must not import src/main — talk to main through typed IPC.',
};
const NO_NODE_IN_RENDERER = {
  regex: NODE_BUILTINS,
  message: 'boundary[no-node]: renderer and preload must not import Node built-ins.',
};
const NO_ELECTRON_IN_RENDERER = {
  regex: '^electron(/.*)?$',
  message: 'boundary[no-electron]: renderers use the preload API (window.pixmates), never electron.',
};
const NO_RENDERER = {
  regex: '^(\.\./)+(renderer|preload)(/|$)',
  message: 'boundary[no-renderer]: main must not import renderer or preload code.',
};

/** @type {import('eslint').Rule.RuleModule} */
const requireDisableReason = {
  meta: {
    type: 'problem',
    docs: { description: 'Allow only `eslint-disable-next-line <rule> -- <reason>` directives.' },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const text = comment.value.trim();
          if (!/^eslint-disable/.test(text)) continue;
          const nextLineWithReason = /^eslint-disable-next-line\s+\S.*\s--\s+\S/.test(text);
          if (!nextLineWithReason) {
            context.report({
              loc: comment.loc ?? { line: 1, column: 0 },
              message:
                'Use `eslint-disable-next-line <rule> -- <reason>`; file- and line-wide disables are not allowed.',
            });
          }
        }
      },
    };
  },
};

export default defineConfig(
  {
    ignores: [
      'out/',
      'release/',
      'coverage/',
      'reports/',
      'resources/',
      'test-results/',
      'playwright-report/',
      '.claude/',
      'tests/fixtures/lint/',
    ],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { local: { rules: { 'require-disable-reason': requireDisableReason } } },
    rules: {
      'local/require-disable-reason': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      // Security backstop (rules/security.md): the strict CSP blocks these at runtime anyway.
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['src/core/**/*.{ts,tsx}', 'src/content/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
    rules: {
      // Replaced by the tagged core-purity[require] check below (same intent, one message per violation).
      '@typescript-eslint/no-require-imports': 'off',
      'no-restricted-imports': ['error', { patterns: PURE_PATTERNS }],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB', 'process'].map(
          (name) => ({ name, message: BROWSER_GLOBAL }),
        ),
        ...['setTimeout', 'setInterval', 'setImmediate', 'requestAnimationFrame', 'queueMicrotask'].map((name) => ({
          name,
          message: TIMER,
        })),
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "MemberExpression[object.name='Date'][property.name='now']", message: CLOCK },
        { selector: "NewExpression[callee.name='Date']", message: CLOCK },
        { selector: "MemberExpression[object.name='performance'][property.name='now']", message: CLOCK },
        { selector: "MemberExpression[object.name='Math'][property.name='random']", message: RANDOM },
        { selector: "CallExpression[callee.name='require']", message: REQUIRE },
      ],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_MAIN, NO_NODE_IN_RENDERER, NO_ELECTRON_IN_RENDERER] }],
    },
  },
  {
    files: ['src/preload/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_MAIN, NO_NODE_IN_RENDERER] }] },
  },
  {
    files: ['src/main/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_RENDERER] }] },
  },
);
