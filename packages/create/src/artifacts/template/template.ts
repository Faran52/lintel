import { hasTests } from '../../model/answers/answers';
import { targetFor } from '../../model/targets';
import { buildScripts, RUN_PREFIX } from '../build-scripts/buildScripts';

import type { Answers } from '../../model/answers/answers';

// A slot left unfilled throws rather than shipping: an intact `{{RUN}}` in a generated CLAUDE.md would read as
// documentation until someone tried the command.

const SLOT_PATTERN = /\{\{[A-Z_]+\}\}/g;

const testRows = (answers: Answers, run: string): string => {
  return hasTests(answers)
    ? `| test | \`${run} test\` |\n| coverage | \`${run} test:coverage\` |\n`
    : '';
};

// What CLAUDE.md and README.md both say (identity, how to run the gate); shared so a new slot is one edit, not two.
export const sharedSlots = (projectName: string, answers: Answers): Record<string, string> => {
  const run = RUN_PREFIX[answers.packageManager];

  return {
    PROJECT_NAME: projectName,
    TARGET_LABEL: targetFor(answers).label,
    RUN: run,
    CHECK_CHAIN: buildScripts(answers).check,
    TEST_ROWS: testRows(answers, run),
  };
};

export const fillSlots = (
  template: string,
  values: Record<string, string>,
  label: string,
): string => {
  const filled = template.replace(SLOT_PATTERN, (slot) => {
    return values[slot.slice(2, -2)] ?? slot;
  });

  const unfilled = filled.match(SLOT_PATTERN);

  if (unfilled) {
    throw new Error(`${label} template has unfilled slots: ${unfilled.join(', ')}`);
  }

  return filled;
};
