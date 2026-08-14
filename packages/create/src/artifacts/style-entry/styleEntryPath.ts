import { targetFor } from '../../model/targets';

import type { Answers } from '../../model/answers/answers';

/**
 * Where a project keeps the stylesheet Tailwind is imported into. The target declares one, and a project that arranged
 * its styles differently keeps its own: writing the default beside it left a second entry nothing imported, so the
 * merge that was supposed to guarantee Tailwind was wired guaranteed nothing.
 *
 * Discovered rather than asked, the way `setupTests` already is. The list is every target's own entry plus the
 * spellings the scaffolders and the reference projects use, most specific first, so a project holding two is read as
 * the one that names Tailwind rather than the one that happens to sort first.
 */
export const STYLE_ENTRY_CANDIDATES = [
  'src/styles/tailwind.css',
  'src/styles/global.css',
  'src/styles/globals.css',
  'src/styles/index.css',
  'src/app/globals.css',
  'src/assets/main.css',
  'src/global.css',
  'src/globals.css',
  'src/styles.css',
  'src/index.css',
  'src/app.css',
  'src/style.css',
];

// The project's own where one was found, and the target's default otherwise.
export const styleEntryPath = (answers: Answers, existing?: string): string | undefined => {
  return existing ?? targetFor(answers).styleEntry;
};
