import { FOLDER_NAMING, NAMING } from '../naming/naming';

import { HOOKS_ALIAS, tabsToSpaces } from './utils/targetUtils';

import type { TargetRecord } from './record';

export const svelte: TargetRecord = {
  id: 'svelte',
  label: 'Svelte',
  // `--no-add-ons`: every add-on `sv` offers is something lintel already emits or excludes, and a half-specified one
  // prompts again for its own options. `--types ts` rather than the `jsdoc` its other choice offers.
  scaffold: (name) => {
    return {
      kind: 'dlx',
      args: [
        'sv', 'create', name,
        '--template', 'minimal',
        '--types', 'ts',
        '--no-add-ons',
        '--no-install',
      ],
    };
  },
  framework: 'svelte',
  html: true,
  vite: true,
  sfcExtension: 'svelte',
  routeUnit: 'src/routes/',
  hooksSlot: { label: 'Hooks', path: 'src/lib/hooks/' },
  ignores: ['.svelte-kit/**'],
  naming: NAMING.svelte,
  folderNaming: FOLDER_NAMING.svelte,
  hooksAlias: HOOKS_ALIAS,
  // SvelteKit's own, re-declared: an extending config replaces `paths` rather than merging it, and
  // `.svelte-kit/tsconfig.json` is where `$lib` otherwise comes from.
  extraAliases: { '$lib': './src/lib', '$lib/*': './src/lib/*' },
  tsconfig: { extends: './.svelte-kit/tsconfig.json', include: ['**/*.svelte'] },
  testConditions: ['browser'],
  /**
   * Not `+page.test.ts`/`+layout.test.ts`: SvelteKit reserves the `+` prefix in `src/routes/` and warns the file isn't
   * a recognised route. The layout is covered rather than excluded like Next's root layout: measured, excluding it
   * reported `100% ( 0/0 )` on all four metrics, passing while asserting nothing; included, 4/4 statements, 3/3
   * functions, 2/2 lines.
   */
  starterTests: [
    {
      source: 'starter/svelte/page.test.ts',
      target: 'src/routes/page.test.ts',
      covers: 'src/routes/+page.svelte',
    },
    {
      source: 'starter/svelte/layout.test.ts',
      target: 'src/routes/layout.test.ts',
      covers: 'src/routes/+layout.svelte',
    },
  ],
  starterFixes: [
    {
      path: 'src/app.html',
      transform: (source) => {
        return tabsToSpaces(source
          // require-title: a document with no title is announced by its URL.
          .replace(
            '%sveltekit.head%',
            '<title>App</title>\n\t\t%sveltekit.head%',
          )
          // use-baseline: `text-scale` is not widely available yet, and nothing in the starter depends on it.
          .replace(/^[ \t]*<meta name="text-scale"[^>]*>\n/m, ''));
      },
    },
    {
      path: 'src/routes/+layout.svelte',
      // `$props()` with no type annotation makes `children` implicitly untyped (no-unsafe-call); `--types ts` above is
      // what guarantees the `<script lang="ts">` the annotation needs.
      transform: (source) => {
        return tabsToSpaces(source).replace(
          'let { children } = $props();',
          "import type { Snippet } from 'svelte';\n\n  let { children }: { children: Snippet } = $props();",
        );
      },
    },
    { path: 'src/routes/+page.svelte', transform: tabsToSpaces },
  ],
  // `sv create` always names its config `vite.config.js`; Vite resolves `.js` first, so leaving it beside stage 4's
  // `vite.config.ts` would run the scaffolder's config and ignore lintel's.
  staleScaffoldFiles: ['vite.config.js'],
  // `svelte-kit sync` first: it regenerates `.svelte-kit/tsconfig.json`, which the emitted tsconfig extends and which
  // drifts after a route file is added or renamed.
  typecheck: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
  prepare: 'svelte-kit sync',
  testDevDependencies: ['@testing-library/svelte'],
  devDependencies: ['eslint-plugin-svelte', 'svelte-eslint-parser', 'svelte-check'],
  allowBuilds: [],
  stateRules: ['svelte-reactivity.md'],
};
