import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    // The ESLint boundary test builds a type-aware TS program on first run.
    testTimeout: 30_000,
    // An empty suite is a failure only once tests exist (M0-01 runs before the first test lands).
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      // SPEC §12 / rules/testing.md: core coverage ≥ 90 %.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
