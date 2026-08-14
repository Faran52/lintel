import type { Answers } from '../../model/answers/answers';

/**
 * The checker file holds two things: the pattern list, which is the standard, and `PROJECT_SKIPPED` and
 * `PROJECT_BANNED`, which are the project's. Preserving it froze both, so a carve-out added to the floor reached
 * every new project and no existing one; emitting it would have deleted a project's exemptions and the reasons
 * written beside them.
 *
 * Merged, the two halves go where they belong: the shipped file supplies everything, then the project's own blocks
 * are lifted back over the empty ones the transform wrote.
 */

/**
 * Everything from the declaration to its closing `];`, which is what a project edits and what has to survive. Both
 * spellings count: a block with entries closes on its own line, and an empty one is `= [];` on the declaration line.
 */
const blockOf = (source: string, name: string): string | null => {
  const opening = source.indexOf(`const ${name}`);

  if (opening === -1) {
    return null;
  }

  const multiline = source.indexOf('\n];', opening);
  const empty = source.indexOf('];', opening);

  if (multiline !== -1 && (empty === -1 || multiline < empty)) {
    return source.slice(opening, multiline + 3);
  }

  return empty === -1 ? null : source.slice(opening, empty + 2);
};

const carriedOver = (shipped: string, current: string, name: string): string => {
  const theirs = blockOf(current, name);
  const ours = blockOf(shipped, name);

  // A project that never edited its block, or a shipped file that stopped declaring one, leaves the shipped text.
  return theirs === null || ours === null ? shipped : shipped.replace(ours, theirs);
};

export const mergeChecker = (
  current: string | null,
  shipped: (answers: Answers) => string,
  answers: Answers,
): string => {
  const text = shipped(answers);

  if (current === null) {
    return text;
  }

  return carriedOver(carriedOver(text, current, 'PROJECT_SKIPPED'), current, 'PROJECT_BANNED');
};
