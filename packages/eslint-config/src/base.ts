import lintel from '@linteljs/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import importX from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

import { buildNaming } from './utils/checkFileUtils';
import { SCRIPT_EXTENSIONS } from './utils/globUtils';
import { buildGroups } from './utils/importSortUtils';
import { presetOf } from './utils/presetUtils';

import type { Linter } from 'eslint';
import type { BaseOptions, Layer } from './types';

/**
 * Without a files glob these presets crash on a parser shape they can't read: `@stylistic/indent` throws
 * on an Angular template rather than false-positives. `.vue`/`.svelte` are in, their layers nesting a JS
 * parser; markup is out, owned by `html()` and `angular()`.
 */
const SCRIPT_FILES = [`**/*.{${SCRIPT_EXTENSIONS},vue,svelte}`];

// Nothing here is type-aware, so `base` alone works on a plain JavaScript repository.
export const base = (options: BaseOptions = {}): Layer => {
  const {
    ignores,
    naming,
    folderNaming,
    aliases,
    frameworkGroup,
    resolver,
  } = options;

  // Spread, not restated: without `import-x/parsers` naming a parser for `.cts`/`.mts`,
  // `import-x/no-cycle` can't parse the file it resolved and returns early without reporting.
  const importSettings: Linter.Config['settings'] = resolver?.project
    ? { ...importX.flatConfigs.typescript.settings, 'import-x/resolver': { typescript: { project: resolver.project } } }
    : importX.flatConfigs.typescript.settings;

  return [
    ...(ignores ? [{ name: '@linteljs/base/ignores', ignores }] : []),

    { ...presetOf(importX.flatConfigs.typescript, 'import-x/typescript')[0], settings: importSettings },

    // The syntax-only half: the import-x settings above name a parser for these extensions, so
    // `base` has to be able to parse them. `typescript()` adds the program.
    {
      name: '@linteljs/base/typescript-syntax',
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: { parser: tseslint.parser },
    },

    ...presetOf(sonarjs.configs?.['recommended'], 'sonarjs/recommended', SCRIPT_FILES),
    ...presetOf(stylistic.configs.recommended, 'stylistic/recommended', SCRIPT_FILES),
    // `flat/recommended`, not `recommended`: the bare name is the eslintrc object, and this package is flat-only.
    ...presetOf(lintel.configs['flat/recommended'], '@linteljs/flat/recommended', SCRIPT_FILES),

    {
      name: '@linteljs/base',
      files: SCRIPT_FILES,

      // `import-x`, `sonarjs` and `@stylistic` register themselves in the configs spread above;
      // a second registration risks "Cannot redefine plugin".
      plugins: {
        'check-file': checkFile,
        'simple-import-sort': simpleImportSort,
        'unused-imports': unusedImports,
      },

      rules: {
        // `ignorePattern` exempts a line that is only an attribute value (an SVG `d` has no legal break).
        // `ignoreTemplateLiterals` is absent on purpose: it exempts any line holding one, not only one that is.
        '@stylistic/max-len': ['error', {
          code: 120,
          ignoreUrls: true,
          ignorePattern: String.raw`^[ \t]*(?:<[\w.-]+[ \t]+)?[\w:@.-]+="[^"]*"[ \t]*/?>?[ \t]*$`,
        }],
        '@stylistic/semi': ['error', 'always'],
        // allowSingleLine off: a one-line arrow body reads as an expression arrow at a glance.
        // stroustrup so a `} catch {` starts its own line.
        '@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: false }],
        // Braces always. A braceless if reads fine until someone adds a second statement under it.
        'curly': ['error', 'all'],
        // The preset ships `semi: never` and `member-delimiter-style: none` as a matched pair, so
        // overriding only semi would leave statements terminated and interface members not.
        '@stylistic/member-delimiter-style': ['error', {
          multiline: { delimiter: 'semi', requireLast: true },
          singleline: { delimiter: 'semi', requireLast: false },
        }],
        '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],

        // `interface-order` sits outside `recommended`; `union-newline` is in it but scoped to `**/*.{ts,tsx,mts,cts}`,
        // which excludes an SFC's `<script lang="ts">`, so this widens rather than restates (vue.test.ts pins it).
        '@linteljs/union-newline': 'error',
        '@linteljs/interface-order': 'error',

        'import-x/no-unresolved': 'error',
        'import-x/no-duplicates': 'error',
        'import-x/first': 'error',
        'import-x/newline-after-import': 'error',
        'import-x/no-cycle': 'error',

        'simple-import-sort/imports': ['error', { groups: buildGroups(aliases, frameworkGroup) }],
        'simple-import-sort/exports': 'error',

        // `unused-imports` owns unused reporting: `no-unused-vars`, its typescript-eslint twin and
        // `sonarjs/unused-import` stand down rather than double-report. `error` not `warn`: a warning exits 0.
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'sonarjs/unused-import': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': ['error', {
          vars: 'all',
          args: 'after-used',
        }],

        // Arrow functions everywhere. These catch what `@linteljs/prefer-arrow-functions` declines.
        'func-style': ['error', 'expression'],
        'prefer-arrow-callback': 'error',

        'sonarjs/cognitive-complexity': ['error', 15],

        'no-console': ['error', { allow: ['warn', 'error'] }],
      },
    },

    ...buildNaming(naming, folderNaming),

  ];
};

export default base;
