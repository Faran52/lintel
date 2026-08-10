// Stage 4, `standard`, also writes the git hooks, commitlint, lint-staged, the banned-pattern checker, the test setup
// and `vite.config.ts`/`vitest.config.ts`, not just `.claude/` and `CLAUDE.md`.

export type Stage
  = 'scaffold'
    | 'lint'
    | 'package'
    | 'standard'
    | 'install'
    | 'fix';

export const STAGES: Stage[] = [
  'scaffold',
  'lint',
  'package',
  'standard',
  'install',
  'fix',
];
