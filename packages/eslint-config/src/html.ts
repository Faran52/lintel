import htmlPlugin from '@html-eslint/eslint-plugin';
import htmlParser from '@html-eslint/parser';

import { presetOf } from './utils/presetUtils';

import type { Layer } from './types';

// Markup, offered to every target but Angular, whose template processor covers it. A layer
// rather than a rule block because `.html` cannot go through the TypeScript parser.
export const html = (): Layer => {
  return [
    {
      ...presetOf(htmlPlugin.configs['flat/recommended'], 'html-eslint/flat/recommended')[0],
      name: '@linteljs/html',
      files: ['**/*.html'],
      languageOptions: { parser: htmlParser },
    },
  ];
};

export default html;
