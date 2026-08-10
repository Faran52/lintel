import eslintReact from '@eslint-react/eslint-plugin';
import lintel from '@linteljs/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

import { SCRIPT_EXTENSIONS } from '../utils/globUtils';
import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

// The `simple-import-sort` bucket React owns, injected into `base({ frameworkGroup })`.
export const reactGroup: string[] = ['^react$', '^react-dom$', '^react/', '^react-', '^@react'];

const REACT_FILES = [`**/*.{${SCRIPT_EXTENSIONS}}`];

// `eslint-plugin-react-hooks` v7 ships the compiler's diagnostics alongside the two classic
// rules; its flat recommended preset is what enables `rules-of-hooks` here.
export const react = (): Layer => {
  return [
    ...presetOf(eslintReact.configs['recommended-typescript'], 'eslint-react/typescript', REACT_FILES),
    // `configs.flat.recommended`, not `configs.recommended`: the bare name is still the
    // eslintrc form, which flat config rejects with "This appears to be in eslintrc format".
    ...presetOf(reactHooks.configs.flat.recommended, 'react-hooks/flat/recommended', REACT_FILES),

    {
      name: '@linteljs/react',
      files: REACT_FILES,
      // The same plugin object `base` registers, so the two registrations are one.
      plugins: { '@linteljs': lintel },
      rules: {
        '@linteljs/prefer-destructured-props': 'error',
        '@linteljs/sort-hook-dependencies': 'error',
      },
    },
  ];
};

export default react;
