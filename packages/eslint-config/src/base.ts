import { existsSync } from 'node:fs';
import { join } from 'node:path';

import lintel from '@linteljs/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import { includeIgnoreFile } from 'eslint/config';
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

// Limit presets to script parsers: Angular markup crashes `@stylistic/indent` and is owned by `angular()`.
const SCRIPT_FILES = [`**/*.{${SCRIPT_EXTENSIONS},vue,svelte}`];

/**
 * Whatever the project already ignores in git, ESLint ignores too. Flat config reads no `.gitignore` of its own, so
 * every build output a project produces had to be repeated in `ignores` or it got linted: a real repo with a second
 * output directory was linting its own generated files, and the entries this package hardcodes (`dist/**`,
 * `coverage/**`) only ever covered the outputs it could guess. `includeIgnoreFile` is ESLint's own converter, so the
 * gitignore semantics a hand-written glob gets wrong (negation, anchoring, directory-only patterns) are not this
 * package's to reimplement.
 *
 * Read from the working directory, which is where `eslint .` runs; absent, there is nothing to add. `process.cwd()`
 * off the global rather than a named import from `node:process`, matching `frameworks/next.ts`: a named import is a
 * static binding that a test cannot replace, and resolving from this file is wrong anyway, since it lives inside
 * `node_modules`.
 */
const gitignored = (): Layer => {
  const path = join(process.cwd(), '.gitignore');

  return existsSync(path) ? [includeIgnoreFile(path, '@linteljs/base/gitignore')] : [];
};

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

  /**
   * Keep import-x's parser settings so `.cts` and `.mts` cycles are checked, and try a declaration file in addition to
   * whatever a package's `exports` map resolves to.
   *
   * `conditionNames` is **not** set by default, and reordering it is not a safe default. Putting `import` ahead of
   * `types` does let a wildcard `exports` map resolve (`@modelcontextprotocol/sdk` maps `"./*"` to both `./dist/esm/*`
   * and `./dist/esm/*.d.ts`, so `types` alone yields a `server/mcp.js.d.ts` that does not exist), but it also makes
   * `react-native` resolve to its Flow-typed `index.js` instead of `index.d.ts`, which import-x cannot parse. Measured:
   * that reordering took a generated React Native project from a clean gate to 127 findings, because the parse failures
   * also stopped `eslint --fix` and left 111 autofixable ones behind. A project whose dependencies need the other order
   * asks for it through `resolver.conditionNames`.
   */
  const importSettings: Linter.Config['settings'] = {
    ...importX.flatConfigs.typescript.settings,
    'import-x/resolver': {
      typescript: {
        alwaysTryTypes: true,
        ...(resolver?.project === undefined ? {} : { project: resolver.project }),
        ...(resolver?.conditionNames === undefined ? {} : { conditionNames: resolver.conditionNames }),
      },
    },
  };

  return [
    ...gitignored(),
    ...(ignores ? [{ name: '@linteljs/base/ignores', ignores }] : []),

    { ...presetOf(importX.flatConfigs.typescript, 'import-x/typescript')[0], settings: importSettings },

    // Parse TypeScript here; `typescript()` adds its program.
    {
      name: '@linteljs/base/typescript-syntax',
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: { parser: tseslint.parser },
    },

    ...presetOf(sonarjs.configs?.['recommended'], 'sonarjs/recommended', SCRIPT_FILES),
    ...presetOf(stylistic.configs.recommended, 'stylistic/recommended', SCRIPT_FILES),
    // `recommended` is eslintrc; this package is flat-only.
    ...presetOf(lintel.configs['flat/recommended'], '@linteljs/flat/recommended', SCRIPT_FILES),

    {
      name: '@linteljs/base',
      files: SCRIPT_FILES,

      // Those plugins are already registered by the presets.
      plugins: {
        'check-file': checkFile,
        'simple-import-sort': simpleImportSort,
        'unused-imports': unusedImports,
      },

      rules: {
        // Exempt standalone attributes, not every line containing a template literal.
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
        // Not framework-specific, and `eslint-config-next` was the only thing enabling it before: a default export with
        // no name is what `lint-staged.config.js` and every emitted config avoid, so the rule belongs to every target.
        'import-x/no-anonymous-default-export': 'error',

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
