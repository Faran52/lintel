import { defineConfig, type ViteUserConfig } from 'vitest/config';

/**
 * The workspace gate measures coverage from the root, where a package's own block is ignored.
 * This one is for `pnpm audit:ignores`, which runs `vitest --coverage` inside this package and
 * reads `coverage/coverage-final.json` back to test whether a `v8 ignore` is load bearing.
 */
const EXCLUDE_COVERAGE = [
  'src/**/*.test.ts',
  'src/**/*.d.ts',

  // Registry and barrel files. Pure wiring, no branches worth a threshold.
  'src/rules/index.ts',
];

const config: ViteUserConfig = {
  cacheDir: '.vitest-cache',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    unstubGlobals: true,
    watch: false,
    pool: 'threads',
    testTimeout: 30000,
    include: ['src/**/*.test.ts'],
    coverage: {
      reportsDirectory: './coverage',
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: EXCLUDE_COVERAGE,
      cleanOnRerun: false,
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
};

export default defineConfig(config);
