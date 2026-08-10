import { targetFor } from '../../model/targets';

import type { Answers } from '../../model/answers/answers';

// The emitted file carries no `packages:` key: it exists only for `allowBuilds`, since a denied build fails the
// install with ERR_PNPM_IGNORED_BUILDS.
const SHARED_ALLOWED_BUILDS = ['sharp', 'unrs-resolver'];

export const emitPnpmWorkspace = (answers: Answers): string => {
  const names = [...SHARED_ALLOWED_BUILDS, ...targetFor(answers.target).allowBuilds];

  const entries = [...new Set(names)]
    .sort((left, right) => {
      return left.localeCompare(right, 'en');
    })
    .map((name) => {
      // Quoted unconditionally: @ opens a reserved YAML indicator, so a scoped package name as a bare key fails to
      // parse.
      return `  '${name}': true`;
    })
    .join('\n');

  return `allowBuilds:\n${entries}\n`;
};
