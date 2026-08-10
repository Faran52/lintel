import sveltePlugin from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

// SvelteKit-owned virtual modules, not project aliases: no file backs either, so they belong here, not in a
// `tsconfig.paths` bucket. Named once, used twice: the sort bucket and the `no-unresolved` allowance are one set.
const VIRTUAL_MODULES = [String.raw`^\$app/`, String.raw`^\$env/`];

export const svelteGroup: string[] = ['^svelte$', '^svelte/', '^@sveltejs/', ...VIRTUAL_MODULES];

// The filenames SvelteKit itself owns, and only those: `+` is not a word character and
// `service-worker` is not camelCase, so a naming convention rejects both.
const SVELTEKIT_ROUTE_FILES = [
  '**/routes/**/+*.svelte',
  '**/routes/**/+*.ts',
  '**/routes/**/+*.js',
  '**/service-worker.{ts,js}',
];

// `$lib` lives in a `svelte-kit sync` output that may not exist when ESLint runs, and
// `$app`/`$env` have no file at all, so a stock layout opens with `no-unresolved` on itself.
const SVELTEKIT_VIRTUAL_MODULES = [String.raw`^\$lib/`, ...VIRTUAL_MODULES];

// Must come after `typescript()`, like `vue()`: `svelte-eslint-parser` is top-level and nests TypeScript beneath it.
export const svelte = (): Layer => {
  return [
    ...presetOf(sveltePlugin.configs['flat/recommended'], 'svelte/flat/recommended'),

    {
      name: '@linteljs/svelte/framework-specifiers',
      rules: {
        'import-x/no-unresolved': ['error', { ignore: SVELTEKIT_VIRTUAL_MODULES }],
      },
    },

    {
      name: '@linteljs/svelte/route-filenames',
      files: SVELTEKIT_ROUTE_FILES,
      rules: {
        'check-file/filename-naming-convention': 'off',
      },
    },

    {
      name: '@linteljs/svelte',
      files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
      languageOptions: {
        parserOptions: {
          parser: tseslint.parser,
          extraFileExtensions: ['.svelte'],
          // Same reason as `vue()`: `typescript()` scopes `projectService` to TS extensions
          // only, but the type-aware rules it enables have no `files` glob at all.
          projectService: true,
        },
      },
    },
  ];
};

export default svelte;
