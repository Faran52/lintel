import angularEslint from 'angular-eslint';

import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

// Angular's bucket. RxJS is framework furniture here, not an ordinary dependency.
export const angularGroup: string[] = ['^@angular/', '^rxjs$', '^rxjs/'];

const TS_FILES = ['**/*.ts'];

const TEMPLATE_FILES = ['**/*.html'];

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

    ...presetOf(angularEslint.configs.templateRecommended, 'angular-eslint/template', TEMPLATE_FILES),

    /**
     * `templateRecommended` is four rules and none is about accessibility; the eleven that are ship as their own
     * preset, which nothing enables by default. Both are applied, so a template gets the same accessibility floor
     * that a `.vue` template and a JSX tree get.
     */
    ...presetOf(angularEslint.configs.templateAccessibility, 'angular-eslint/templateAccessibility', TEMPLATE_FILES),
  ];
};

export default angular;
