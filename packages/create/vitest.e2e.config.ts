import { defineConfig } from 'vitest/config';

/**
 * The opt-in half of the split. `vitest.config.ts` excludes `*.e2e.test.ts` so the default gate
 * stays fast; this one includes nothing else, so `pnpm test:e2e` runs exactly the end-to-end
 * suite and never the unit tests alongside it.
 *
 * No `testTimeout` here: the suite sets its own per-case timeout, because the number that
 * matters is per target rather than per file.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    include: ['src/**/*.e2e.test.ts'],
    // One real scaffold and install per case. Running them at once thrashes the pnpm store and
    // interleaves their output into something unreadable when one fails.
    fileParallelism: false,
    hookTimeout: 120_000,
  },
});
