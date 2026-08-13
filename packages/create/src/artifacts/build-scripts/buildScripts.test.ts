import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  type PackageManager,
  type TargetId,
  type Testing,
} from '../../model/answers/answers';

import { buildScripts } from './buildScripts';

interface AnswerOverrides {
  target?: TargetId;
  testing?: Testing;
  packageManager?: PackageManager;
}

const answersFor = (overrides: AnswerOverrides): Answers => {
  return { ...DEFAULT_ANSWERS, ...overrides };
};

describe('buildScripts', () => {
  it('emits the target typecheck variant', () => {
    expect(buildScripts(answersFor({ target: 'vue' }))['typecheck']).toBe('vue-tsc --noEmit');
    // `--fail-on-warnings` is load-bearing, not decoration: Svelte reports accessibility as a compiler warning, and
    // without the flag `svelte-check` prints it and exits 0.
    expect(buildScripts(answersFor({ target: 'svelte' }))['typecheck']).toBe(
      'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --fail-on-warnings',
    );
    expect(buildScripts(answersFor({ target: 'react' }))['typecheck']).toBe('tsc --noEmit');
  });

  it('chains check through every gate the answers enable', () => {
    expect(buildScripts(answersFor({})).check).toBe(
      'pnpm lint && pnpm lint:css && pnpm typecheck && pnpm test:coverage && pnpm build',
    );
    expect(buildScripts(answersFor({ testing: 'none' })).check).toBe(
      'pnpm lint && pnpm lint:css && pnpm typecheck && pnpm build',
    );
    expect(buildScripts(answersFor({ packageManager: 'npm' })).check).toBe(
      'npm run lint && npm run lint:css && npm run typecheck && npm run test:coverage'
      + ' && npm run build',
    );
  });

  // build is inherited from the scaffolder except React Native, whose eas build needs an account; expo export is the
  // local Metro bundle instead (measurements in DESIGN.md).
  it('writes the build script only for the record that carries one', () => {
    expect(buildScripts(answersFor({ target: 'react-native' }))['build'])
      .toBe('expo export --platform web');
    expect(buildScripts(answersFor({ target: 'react' }))).not.toHaveProperty('build');
  });

  // Naming vitest in a project with no suite is a `check` that fails on command-not-found.
  it('names vitest for every target that has a suite', () => {
    const {
      test,
      'test:coverage': coverage,
      check,
    } = buildScripts(answersFor({ target: 'react-native' }));

    expect(test).toBe('vitest run --passWithNoTests');
    expect(coverage).toBe('vitest run --coverage');
    expect(check).toContain('test:coverage');
  });
});
