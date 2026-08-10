import { emitPnpmWorkspace } from './emitPnpmWorkspace';

import type { Answers } from '../../model/answers/answers';

// Top-level keys whose block is dropped on merge, with why.
const SUPERSEDED_KEYS = [
  // create-next-app writes ignoredBuiltDependencies: [sharp, unrs-resolver], opting out of exactly the builds
  // lintel opts into; left in place, pnpm would refuse the install with ERR_PNPM_IGNORED_BUILDS.
  'ignoredBuiltDependencies',
];

// Line-based, not a YAML round-trip, which would reformat every line the user wrote to drop one block.
export const mergePnpmWorkspace = (existing: string | null, answers: Answers): string => {
  const emitted = emitPnpmWorkspace(answers);

  if (existing === null) {
    return emitted;
  }

  const lines = existing.split('\n');
  const kept: string[] = [];
  let dropping = false;

  for (const line of lines) {
    const isTopLevel = line !== '' && !/^[\s-]/.test(line);

    if (isTopLevel) {
      dropping = SUPERSEDED_KEYS.some((key) => {
        return line.startsWith(`${key}:`);
      });
    }

    if (!dropping) {
      kept.push(line);
    }
  }

  const remainder = kept.join('\n').replace(/^\n+/, '');

  // Already ours: leave the user's list alone rather than reasserting our two names over it.
  return /^allowBuilds:/m.test(remainder) ? remainder : `${emitted}${remainder}`;
};
