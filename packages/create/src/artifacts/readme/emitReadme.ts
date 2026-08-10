import { fillSlots, sharedSlots } from '../template/template';

import type { Answers } from '../../model/answers/answers';

/**
 * Replaces the scaffolder's README outright: after later stages run, its advice is wrong in a way someone will act on
 * (React's typescript-eslint tips, Next's npm/yarn/bun options, Solid's port 5173 vs the emitted 3000).
 * Written at generation and never touched again by `sync`, since it becomes the project's own document from then on.
 */
export const emitReadme = (template: string, projectName: string, answers: Answers): string => {
  return fillSlots(template, sharedSlots(projectName, answers), 'README.md');
};
