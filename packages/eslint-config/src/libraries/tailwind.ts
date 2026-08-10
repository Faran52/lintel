import betterTailwindcss from 'eslint-plugin-better-tailwindcss';

import { SCRIPT_EXTENSIONS } from '../utils/globUtils';
import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

const TAILWIND_FILES = [`**/*.{${SCRIPT_EXTENSIONS},vue,svelte}`];

/**
 * A library layer for the class strings themselves: order, duplicates and conflicts, none of which the build or
 * stylelint can see. With no `entryPoint` setting the plugin resolves against Tailwind's default theme, exactly
 * a fresh scaffold; a project that customises its theme should append a block setting
 * `settings['better-tailwindcss'].entryPoint` to its CSS entry.
 */
export const tailwind = (): Layer => {
  return [
    ...presetOf(betterTailwindcss.configs.recommended, 'better-tailwindcss/recommended', TAILWIND_FILES),
    {
      name: '@linteljs/tailwind',
      files: TAILWIND_FILES,
      rules: {
        // A class the theme does not know is usually the project's own CSS, and without a per-project
        // entryPoint the rule cannot tell: create-vite's own template classes trip it. Measured, not assumed.
        'better-tailwindcss/no-unknown-classes': 'off',
      },
    },
  ];
};

export default tailwind;
