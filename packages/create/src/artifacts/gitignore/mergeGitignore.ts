// Appends coverage/ and *.tsbuildinfo (lintel's own output) rather than writing the file, since the scaffolder's
// list is the one that knows about .next/, .angular/ and .svelte-kit/.

const LINTEL_IGNORED = ['coverage/', '*.tsbuildinfo'];

const HEADING = '# lintel';

export const mergeGitignore = (existing: string | null): string => {
  const current = existing ?? '';
  // Split on either ending: splitting on `\n` alone leaves a trailing `\r` on a Windows checkout, so an entry never
  // matches and gets appended again.
  const lines = current.split(/\r?\n/);

  const missing = LINTEL_IGNORED.filter((entry) => {
    return !lines.includes(entry);
  });

  if (missing.length === 0) {
    return current;
  }

  const block = `${HEADING}\n${missing.join('\n')}\n`;

  if (current === '') {
    return block;
  }

  const terminated = current.endsWith('\n') ? current : `${current}\n`;

  return `${terminated}\n${block}`;
};
