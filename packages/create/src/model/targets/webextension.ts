import { FOLDER_NAMING, NAMING } from '../naming/naming';

import { hostedNaming, partsFor } from './utils/frameworkUtils';
import { viteScaffold } from './utils/targetUtils';

import type { Browser } from '../answers/answers';
import type { PluginSpec } from './record';
import type { TargetBuilder } from './registry';

/**
 * A Manifest V3 extension on the vanilla TypeScript scaffold, with no official generator of its own; stage 4 adds the
 * manifest, the surfaces it names, and `@crxjs/vite-plugin` to build them.
 *
 * Two axes move this record. The browser decides the manifest shape and the ambient types, not the bundler: `crx`
 * builds for both, and its own manifest type carries the `service_worker` and the `scripts` background forms plus
 * `browser_specific_settings.gecko`. The hosted framework decides what a component is, which Vite plugin runs and
 * which layer lints it, leaving the manifest and the surface layout alone.
 */

// Per browser: the ambient types, the manifest template, and what runs and packages the build.
interface BrowserParts {
  types: string[];
  manifest: string;
  devDependencies: string[];
  // A way to run the built extension, where the browser has a runner for it.
  scripts?: Record<string, string>;
  /**
   * The background entry and its handler, in the namespace this browser's own types declare. Not shared: the Chrome
   * types declare `chrome.*` and the Firefox ones `browser.*`, so one file cannot satisfy both. Found by an end-to-end
   * run, where the Firefox starter linted as three unsafe-member-access findings on an untyped `chrome`. The handler's
   * own test comes with it: the two details types are not the same shape either, Firefox's carrying a required
   * `temporary`, so an object literal written for one fails `typecheck` against the other.
   */
  starter: {
    entry: string;
    handler: string;
    test: string;
  };
}

const BROWSERS: Record<Browser, BrowserParts> = {
  chrome: {
    // Both shipped rule files assume `chrome.*`, and without the types the first line of extension code fails
    // `typecheck`. An allow-list once populated: installed but unlisted still lints `chrome.*` as unresolved.
    types: ['chrome'],
    manifest: 'manifest/template.json',
    devDependencies: ['@types/chrome'],
    starter: {
      entry: 'starter/webextension/background.ts',
      handler: 'starter/webextension/onInstalled.ts',
      test: 'starter/webextension/onInstalled.test.ts',
    },
  },
  firefox: {
    // Firefox implements the same surface under `browser.*`, promise-returning rather than callback-taking. These types
    // declare that namespace and only that one: they carry no `chrome`, so Chrome's starter does not typecheck here.
    types: ['firefox-webext-browser'],
    manifest: 'manifest/template.firefox.json',
    // `web-ext` runs the extension in a real Firefox, lints the manifest the way AMO will, and builds the upload
    // archive. It is not a bundler, so `crx` still is.
    devDependencies: ['@types/firefox-webext-browser', 'web-ext'],
    // `--no-reload` because the build is a one-shot `vite build`, not a watch: a reload would serve a stale `dist/`.
    scripts: { start: 'web-ext run --source-dir dist --no-reload' },
    starter: {
      entry: 'starter/webextension/background.firefox.ts',
      handler: 'starter/webextension/onInstalled.firefox.ts',
      test: 'starter/webextension/onInstalled.firefox.test.ts',
    },
  },
};

const CRX: PluginSpec = {
  imports: [
    "import { crx } from '@crxjs/vite-plugin';",
    "import manifest from './manifest.json';",
  ],
  calls: ['crx({ manifest })'],
};

export const webextension: TargetBuilder = (answers) => {
  const browser = BROWSERS[answers.browser];
  const hosted = answers.hostedFramework === undefined
    ? undefined
    : partsFor(answers.hostedFramework);

  return {
    id: 'webextension',
    label: 'Web Extension (MV3)',
    scaffold: viteScaffold('vanilla'),
    hostsBrowser: true,
    hostsFramework: true,
    html: true,
    vite: true,
    routeUnit: 'manifest.json, whose entries name every surface',
    // Nothing of its own: `dist/**` is a shared ignore, and it was repeated here until a duplicate was noticed
    // in the emitted config.
    ignores: [],
    // With a framework, the component is marked by its own extension; without one, by living under `components/`.
    naming: hosted === undefined ? NAMING.webextension : hostedNaming(hosted.framework),
    // No router, so no segment a kebab-case folder rule has to make room for.
    folderNaming: FOLDER_NAMING.webextension,
    // `lib/model/` is this target's own layout with no alias; `@store/*`/`@providers/*` alias directories this layout
    // doesn't have, an alias naming nothing being a dead end a reader follows for no reason.
    extraAliases: { '@model/*': './src/lib/model/*' },
    omitAliases: ['@store/*', '@providers/*'],
    styleEntry: 'src/style.css',
    ...(hosted === undefined ? {} : { framework: hosted.framework }),
    ...(hosted?.sfcExtension === undefined ? {} : { sfcExtension: hosted.sfcExtension }),
    // The framework plugin runs before `crx`, which reads the manifest and wraps whatever the plugins above produced.
    vitePlugin: {
      imports: [...hosted?.vitePlugin.imports ?? [], ...CRX.imports],
      calls: [...hosted?.vitePlugin.calls ?? [], ...CRX.calls],
    },
    tsconfig: { types: browser.types },
    ...(hosted?.testConditions === undefined ? {} : { testConditions: hosted.testConditions }),
    // The background entry and the handler it binds; `manifest.json` names the entry, so it must exist before the
    // first `vite build`, and no vanilla scaffold writes one.
    starterFiles: [
      { source: browser.starter.entry, target: 'src/background/index.ts' },
      { source: browser.starter.handler, target: 'src/background/onInstalled.ts' },
    ],
    starterTests: [
      {
        source: 'starter/webextension/counter.test.ts',
        target: 'src/counter.test.ts',
        covers: 'src/counter.ts',
      },
      {
        source: browser.starter.test,
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
    // The background entry is a registration shell with no branch of its own; its handlers live beside it and are
    // covered like any other module.
    coverageExclude: ['src/background/index.ts'],
    birthTemplate: { source: browser.manifest, target: 'manifest.json' },
    typecheck: 'tsc --noEmit',
    ...(browser.scripts === undefined ? {} : { extraScripts: browser.scripts }),
    ...(hosted === undefined ? {} : { dependencies: hosted.dependencies }),
    devDependencies: [
      '@crxjs/vite-plugin',
      ...browser.devDependencies,
      ...hosted?.devDependencies ?? [],
    ],
    ...(hosted === undefined ? {} : { testDevDependencies: hosted.testDevDependencies }),
    allowBuilds: [],
    stateRules: hosted?.stateRules ?? [],
  };
};
