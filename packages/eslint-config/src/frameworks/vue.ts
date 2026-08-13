import vuePlugin from 'eslint-plugin-vue';
import vueA11y from 'eslint-plugin-vuejs-accessibility';
import tseslint from 'typescript-eslint';

import { presetOf } from '../utils/presetUtils';

import type { Layer } from '../types';

// Vue's bucket. Pinia sits here rather than with node_modules: it is framework furniture.
export const vueGroup: string[] = ['^vue$', '^vue-router$', '^pinia$', '^@vue/'];

const VUE_FILES = ['**/*.vue'];

// Must come after `typescript()`: `vue-eslint-parser` is the top-level parser for an SFC and delegates
// `<script>` onward, so placed earlier it is overwritten and every SFC fails to parse at the template.
export const vue = (): Layer => {
  return [
    ...presetOf(vuePlugin.configs['flat/recommended'], 'vue/flat/recommended'),

    /**
     * `eslint-plugin-vue` carries no accessibility rule, so a template is unchecked without this: an `<img>` with no
     * `alt`, a `@click` on a `<div>` and an unlabelled input all pass `flat/recommended`. This is the template
     * equivalent of what `jsx-a11y` does for the JSX frameworks.
     *
     * Ahead of the block below, not after it. The preset's own second entry sets `languageOptions.parser`, and placed
     * later it would land on `**\/*.vue` after ours and drop the `parserOptions` that put `projectService` there.
     */
    ...presetOf(vueA11y.configs['flat/recommended'], 'vuejs-accessibility/flat/recommended', VUE_FILES),

    {
      name: '@linteljs/vue',
      files: VUE_FILES,
      languageOptions: {
        parserOptions: {
          parser: tseslint.parser,
          extraFileExtensions: ['.vue'],
          /**
           * `typescript()` scopes `projectService` to `**\/*.{ts,tsx,mts,cts}`, not an SFC, while
           * `strictTypeChecked` enables its rules everywhere; without this the first `.vue` file kills the
           * run with "you have used a rule which requires type information", blamed on `vue-eslint-parser`.
           */
          projectService: true,

          // Do not add `loadTypeScriptPlugins`, and do not put `@vue/typescript-plugin` in a
          // generated Vue tsconfig. See `sfc-import-seam` below for the measurement.
        },
      },
      rules: {
        // Multi-word is what keeps a component name from colliding with an HTML tag.
        'vue/multi-word-component-names': 'error',
      },
    },

    {
      /**
       * `import App from './App.vue'` has no type for typescript-eslint, so `createApp(App)` draws
       * `no-unsafe-argument` and a route's `component:` draws `no-unsafe-assignment`, both already covered
       * by `vue-tsc --noEmit`. Off because covered, not silenced. Measured against the alternatives:
       * `@vue/typescript-plugin` trades 2 findings for 376 (`projectService` is one service per program, so
       * scoping to `**\/*.ts` doesn't contain it), and `declare module '*.vue'` types every SFC as `any`.
       */
      name: '@linteljs/vue/sfc-import-seam',
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
      },
    },

  ];
};

export default vue;
