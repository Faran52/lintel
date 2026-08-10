import vitestPlugin from '@vitest/eslint-plugin';

import { SCRIPT_EXTENSIONS } from './utils/globUtils';
import { presetOf } from './utils/presetUtils';

import type { Layer } from './types';

const TEST_FILES = [`**/*.{test,spec}.{${SCRIPT_EXTENSIONS}}`];

// Scoped to the test glob rather than a `__tests__` folder: colocated tests are the standard.
export const vitest = (): Layer => {
  return [
    { ...presetOf(vitestPlugin.configs.recommended, 'vitest/recommended')[0], files: TEST_FILES },
  ];
};

export default vitest;
