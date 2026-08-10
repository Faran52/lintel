import angularEslint from 'angular-eslint';

import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

// Angular's bucket. RxJS is framework furniture here, not an ordinary dependency.
export const angularGroup: string[] = ['^@angular/', '^rxjs$', '^rxjs/'];

const TS_FILES = ['**/*.ts'];

// The only target that does not take `html()`: it brings its own template parser, and
// `processInlineTemplates` extracts decorator templates so both kinds are linted alike.
export const angular = (): Layer => {
  return [
    ...presetOf(angularEslint.configs.tsRecommended, 'angular-eslint/tsRecommended', TS_FILES),

    {
      name: '@linteljs/angular/inline-templates',
      files: TS_FILES,
      processor: angularEslint.processInlineTemplates,
    },

    ...presetOf(angularEslint.configs.templateRecommended, 'angular-eslint/template', ['**/*.html']),
  ];
};

export default angular;
