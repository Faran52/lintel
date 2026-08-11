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
import { checkerArtifact, setupTestsPath } from '../banned-patterns/checkerArtifact';
import { emitEslintConfig } from '../eslint-config/emitEslintConfig';
import { emitStylelintConfig } from '../stylelint-config/emitStylelintConfig';
import { emitTsconfig } from '../tsconfig/emitTsconfig';
import { emitViteConfig } from '../vite-config/emitViteConfig';
import { emitVitestConfig } from '../vitest-config/emitVitestConfig';

import type { TargetRecord } from '../../model/targets/record';

// Append import-free fragments after the target setup, so Angular imports remain first.
const setupSources = (answers: Answers, target: TargetRecord): string[] => {
  return [
    target.testSetup ?? 'mocks/setupTests.ts',
    ...(target.routerMocks === true ? ['mocks/setupTests.router.ts'] : []),
    ...(hasLibrary(answers, 'tanstack-query') ? ['mocks/setupTests.tanstackQuery.ts'] : []),
  ];
};

// Excludes merges, template fills and birth-only files. `existingSetup` preserves a project's setup spelling.
export const buildArtifacts = (answers: Answers, existingSetup?: string): Artifact[] => {
  const target = targetFor(answers.target);
  const setup = setupTestsPath(answers, existingSetup);
  const viteConfig = emitViteConfig(answers);
  const vitestConfig = emitVitestConfig(answers, setup);

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

  // Relaxed projects get ambient type vocabulary; strict projects narrow with guards.
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
    // Preserve project mocks in the setup file Vitest loads before collecting tests.
    artifacts.push({ ...copied(setup, ...setupSources(answers, target)), preserve: true });
  }

  return artifacts;
};
