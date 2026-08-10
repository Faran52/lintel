import {
  type Answers,
  hasLibrary,
  hasTests,
} from '../../model/answers/answers';
import { targetFor } from '../../model/targets';
import { agentArtifacts } from '../agent-files/agentArtifacts';
import {
  type Artifact,
  copied,
  emitted,
} from '../artifact/artifact';
import { checkerArtifact, SETUP_TESTS_PATH } from '../banned-patterns/checkerArtifact';
import { emitEslintConfig } from '../eslint-config/emitEslintConfig';
import { emitStylelintConfig } from '../stylelint-config/emitStylelintConfig';
import { emitTsconfig } from '../tsconfig/emitTsconfig';
import { emitViteConfig } from '../vite-config/emitViteConfig';
import { emitVitestConfig } from '../vitest-config/emitVitestConfig';

import type { TargetRecord } from '../../model/targets/record';

// The target's own setup, then the fragments the answers add. Every fragment is import-free, so it can follow a setup
// that imports: the other way round, Angular's imports would land after its statements and fail `import-x/first`.
const setupSources = (answers: Answers, target: TargetRecord): string[] => {
  return [
    target.testSetup ?? 'mocks/setupTests.ts',
    ...(target.routerMocks === true ? ['mocks/setupTests.router.ts'] : []),
    ...(hasLibrary(answers, 'tanstack-query') ? ['mocks/setupTests.tanstackQuery.ts'] : []),
  ];
};

// package.json, .gitignore, pnpm-workspace.yaml (merges), README.md (template fills), and starter tests (birth-only)
// are deliberately absent from this list. Agent adapters are artifacts because selection and sync share them.
export const buildArtifacts = (answers: Answers): Artifact[] => {
  const target = targetFor(answers.target);
  const viteConfig = emitViteConfig(answers);
  const vitestConfig = emitVitestConfig(answers);

  const artifacts: Artifact[] = [
    emitted('lint', 'eslint.config.js', emitEslintConfig(answers)),
    emitted('lint', 'stylelint.config.js', emitStylelintConfig(answers)),
    ...agentArtifacts(answers),
    checkerArtifact(answers),
    { ...copied('.husky/pre-commit', 'husky/pre-commit'), executable: true },
    { ...copied('.husky/commit-msg', 'husky/commit-msg'), executable: true },
    copied('lint-staged.config.js', 'lint-staged.config.js'),
    copied('commitlint.config.js', 'commitlint.config.js'),
    emitted('package', 'tsconfig.json', emitTsconfig(answers)),
    copied('scripts/typecheckStaged.ts', 'scripts/typecheckStaged.ts'),
  ];

  // Ambient and global type vocabulary for the relaxed floor; nothing imports it, and a strict project narrows with a
  // guard instead.
  if (answers.typeSafety === 'relaxed') {
    artifacts.push(copied('src/typings/customTypes.d.ts', 'typings/customTypes.d.ts'));
  }

  if (viteConfig !== null) {
    artifacts.push(emitted('standard', 'vite.config.ts', viteConfig));
  }

  if (vitestConfig !== null) {
    artifacts.push(emitted('standard', 'vitest.config.ts', vitestConfig));
  }

  if (hasTests(answers)) {
    // vitest.config.ts names this in setupFiles; without it, every run fails to find the module before collecting a
    // single test. `preserve`: the project adds its own mocks here, and a sync must not delete them.
    artifacts.push({ ...copied(SETUP_TESTS_PATH, ...setupSources(answers, target)), preserve: true });
  }

  return artifacts;
};
