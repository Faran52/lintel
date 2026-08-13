import astroPlugin from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

import { presetOf } from './utils/presetUtils';

import type { Layer } from './types';

const ASTRO_FILES = ['**/*.astro'];

/**
 * The template itself, and the virtual files the plugin extracts from its frontmatter and its `<script>` blocks. That
 * second glob matches `**\/*.{ts,tsx,mts,cts}`, which is what `typescript()` claims, so a type-aware rule would try to
 * read a program for a path no tsconfig can contain and fail at load with "Error while loading rule".
 */
const ASTRO_TYPELESS = ['**/*.astro', '**/*.astro/*.ts', '**/*.astro/*.js'];

/**
 * A file-type layer, not a framework one, which is why `defineConfig` takes it as a boolean beside `html` rather than
 * as a `framework`. An Astro project renders `.astro` templates *and* may render components from React, Vue, Svelte or
 * Solid through an integration, so this has to stack with a framework layer instead of replacing one.
 *
 * `presetOf` scopes it: the plugin's `flat/recommended` leaves its rule entry unglobbed, so the nine `astro/*` rules
 * would otherwise read as enabled on every `.ts` file in the project. The parser entry and the two virtual-file entries
 * (`**\/*.astro/*.ts`, where the plugin extracts a template's script block) carry their own globs and keep them.
 */
export const astro = (): Layer => {
  const recommended = presetOf(
    astroPlugin.configs['flat/recommended'],
    'astro/flat/recommended',
    ASTRO_FILES,
  );

  /**
   * The accessibility floor `react()` and `solid()` give JSX, applied to Astro markup by the same plugin that parses
   * it. Taken from the plugin's own `jsx-a11y-recommended` rather than re-derived: it maps the rules onto the template
   * AST and re-exports them under its own namespace, as `astro/jsx-a11y/*`, so `eslint-plugin-jsx-a11y` needs no
   * registration of its own here. Only the rule entry is kept, since the four base entries are spread above already.
   */
  const a11y = presetOf(
    astroPlugin.configs['flat/jsx-a11y-recommended'],
    'astro/flat/jsx-a11y-recommended',
    ASTRO_FILES,
  ).filter((entry) => {
    return Object.keys(entry.rules ?? {}).some((rule) => {
      return rule.startsWith('astro/jsx-a11y/');
    });
  });

  return [
    ...recommended,
    ...a11y,
    /**
     * Same mechanism `typescript()` uses for config files, and it has to come after that layer, which is why
     * `defineConfig` composes this one last: a template's script block is real TypeScript but it is not a file on disk,
     * so it can be parsed and linted without being typed.
     */
    {
      ...tseslint.configs.disableTypeChecked,
      name: '@linteljs/astro/untyped',
      files: ASTRO_TYPELESS,
    },
  ];
};

export default astro;
