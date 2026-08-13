import betterTailwindcss from 'eslint-plugin-better-tailwindcss';

import { SCRIPT_EXTENSIONS } from '../utils/globUtils';
import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

const TAILWIND_FILES = [`**/*.{${SCRIPT_EXTENSIONS},vue,svelte}`];

/**
 * A library layer for the class strings themselves: order, duplicates and conflicts, none of which the build or
 * stylelint can see. `entryPoint` names the CSS file holding `@import "tailwindcss"`, which is how the plugin reads
 * the project's own theme; without it every rule that reasons about the theme reports a custom token as unknown and
 * warns once per class string. Passed rather than appended by the project, so a generated config needs no override.
 */
export const tailwind = (entryPoint?: string): Layer => {
  return [
    ...presetOf(betterTailwindcss.configs.recommended, 'better-tailwindcss/recommended', TAILWIND_FILES),
    {
      name: '@linteljs/tailwind',
      files: TAILWIND_FILES,
      ...(entryPoint === undefined ? {} : { settings: { 'better-tailwindcss': { entryPoint } } }),
      rules: {
        // A class the theme does not know is usually the project's own CSS, and without a per-project
        // entryPoint the rule cannot tell: create-vite's own template classes trip it. Measured, not assumed.
        'better-tailwindcss/no-unknown-classes': 'off',
      },
    },
  ];
};

export default tailwind;
