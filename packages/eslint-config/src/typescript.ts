import tseslint from 'typescript-eslint';

import type { Layer } from './types';

// `projectService` types config files outside every tsconfig `include`.
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

    // `strictTypeChecked` lacks a files glob; keep config files untyped while SFC layers stay typed.
    {
      ...tseslint.configs.disableTypeChecked,
      name: '@linteljs/typescript/untyped',
      files: ['**/*.{js,jsx,mjs,cjs}', '**/*.html'],
    },

    // Restore base's unused-vars handoff after `strictTypeChecked` re-enables it.
    {
      name: '@linteljs/typescript/unused-vars-handover',
      rules: { '@typescript-eslint/no-unused-vars': 'off' },
    },

    // Metro assets need `require`; allow extensions only, keeping package imports reported.
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
