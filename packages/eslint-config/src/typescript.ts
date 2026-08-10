import tseslint from 'typescript-eslint';

import type { Layer } from './types';

// The type-aware half. `projectService` rather than a `project` glob, so a config file outside
// every `include` is typed instead of drawing the "file not found in project" error.
export const typescript = (): Layer => {
  return [
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    {
      name: '@linteljs/typescript',
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: {
        parserOptions: { projectService: true },
      },
    },

    /**
     * `strictTypeChecked` carries no `files` glob, so without this untyped tail `eslint.config.js`,
     * `commitlint.config.js` and `index.html` each throw "you have used a rule which requires type
     * information" instead of reporting. `.vue`/`.svelte` are absent: their layers nest TypeScript and stay typed.
     */
    {
      ...tseslint.configs.disableTypeChecked,
      name: '@linteljs/typescript/untyped',
      files: ['**/*.{js,jsx,mjs,cjs}', '**/*.html'],
    },

    // Re-asserts the handover `base()` set up and `strictTypeChecked` above undid: without this both
    // rules report every unused variable. No `files` glob, since `strictTypeChecked` carries none either.
    {
      name: '@linteljs/typescript/unused-vars-handover',
      rules: { '@typescript-eslint/no-unused-vars': 'off' },
    },

    /**
     * A bundler asset is not a module, and `require` is the only way to name one that
     * typechecks (Metro resolves `require('./icon.png')` to an asset id; `expo/types` declares
     * no `*.png`). Allowing the extensions rather than the rule keeps `require('lodash')` reported.
     */
    {
      name: '@linteljs/typescript/asset-requires',
      rules: {
        '@typescript-eslint/no-require-imports': ['error', {
          allow: ['\\.(png|jpe?g|gif|webp|avif|bmp|svg|ttf|otf|woff2?|mp[34]|wav|aac|m4a|mov|webm)$'],
        }],
      },
    },
  ];
};

export default typescript;
