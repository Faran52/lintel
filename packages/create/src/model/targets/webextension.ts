import { FOLDER_NAMING, NAMING } from '../naming/naming';

import { viteScaffold } from './utils/targetUtils';

import type { TargetRecord } from './record';

// A Manifest V3 extension on the vanilla TypeScript scaffold, with no official generator of its own; stage 4 adds the
// manifest, the surfaces it names, and `@crxjs/vite-plugin` to build them.
export const webextension: TargetRecord = {
  id: 'webextension',
  label: 'Web Extension (MV3)',
  scaffold: viteScaffold('vanilla'),
  html: true,
  vite: true,
  routeUnit: 'manifest.json, whose entries name every surface',
  ignores: ['dist/**'],
  naming: NAMING.webextension,
  // No router, so no segment a kebab-case folder rule has to make room for.
  folderNaming: FOLDER_NAMING.webextension,
  // `lib/model/` is this target's own layout with no alias; `@store/*`/`@providers/*` alias directories this layout
  // doesn't have, an alias naming nothing being a dead end a reader follows for no reason.
  extraAliases: { '@model/*': './src/lib/model/*' },
  omitAliases: ['@store/*', '@providers/*'],
  // An allow-list once populated: `@types/chrome` installed but unlisted still lints `chrome.*` as unresolved.
  tsconfig: { types: ['chrome'] },
  // The service worker and the handler it binds; `manifest.json` names the worker, so it must exist before the first
  // `vite build`, and no vanilla scaffold writes one.
  starterFiles: [
    { source: 'starter/webextension/background.ts', target: 'src/background/index.ts' },
    { source: 'starter/webextension/onInstalled.ts', target: 'src/background/onInstalled.ts' },
  ],
  starterTests: [
    {
      source: 'starter/webextension/counter.test.ts',
      target: 'src/counter.test.ts',
      covers: 'src/counter.ts',
    },
    {
      source: 'starter/webextension/onInstalled.test.ts',
      target: 'src/background/onInstalled.test.ts',
      covers: 'src/background/onInstalled.ts',
    },
  ],
  starterFixes: [
    {
      path: 'src/counter.ts',
      transform: (source) => {
        // restrict-template-expressions: interpolating a number relies on implicit coercion.
        return source.replace('${counter}', '${String(counter)}');
      },
    },
  ],
  // The service worker is a registration shell with no branch of its own; its handlers live beside it and are covered
  // like any other module.
  coverageExclude: ['src/background/index.ts'],
  birthTemplate: { source: 'manifest/template.json', target: 'manifest.json' },
  typecheck: 'tsc --noEmit',
  /**
   * `@types/chrome`: both shipped rule files assume `chrome.*`, and without it the first line of extension code fails
   * `typecheck`. `@crxjs/vite-plugin` reads `manifest.json` and builds every surface it names; by hand with
   * `build.rollupOptions.input` that means hashed filenames the manifest can't reference, and a worker Chrome won't
   * load as an ES module.
   */
  devDependencies: ['@crxjs/vite-plugin', '@types/chrome'],
  allowBuilds: [],
  stateRules: [],
};
