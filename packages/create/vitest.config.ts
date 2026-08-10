import { defineConfig } from 'vitest/config';

/**
 * The `exclude` is the load-bearing line, and it has to be here rather than only in the root config.
 * `projects: ['packages/*']` makes each package its own vitest project, and a project does not inherit the root's
 * `test.exclude`, so with only the root entry `run/pipeline/pipeline.e2e.test.ts` is collected by a plain
 * `pnpm vitest run` and, once the tarballs it looks for exist, runs real scaffolds and installs inside a fast gate.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    // Real fs and spawned binaries per test; shared CI runners need margin the 5s default lacks.
    testTimeout: 30000,
    include: ['src/**/*.test.ts', 'assets/scripts/*.test.ts'],
    exclude: ['**/*.e2e.test.ts'],
  },
});
