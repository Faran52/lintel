import solidPlugin from 'eslint-plugin-solid';

import { SCRIPT_EXTENSIONS } from '../utils/globUtils';
import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

// Solid's bucket.
export const solidGroup: string[] = ['^solid-js$', '^solid-js/', '^@solidjs/'];

const SOLID_FILES = [`**/*.{${SCRIPT_EXTENSIONS}}`];

// The plugin's preset carries no `files` glob, so the layer supplies one; without it the
// reactivity rules read as enabled on `.html` and `.css`.
export const solid = (): Layer => {
  return presetOf(solidPlugin.configs['flat/typescript'], 'solid/flat/typescript', SOLID_FILES);
};

export default solid;
