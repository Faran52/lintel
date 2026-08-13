import type { NamingMap, TargetId } from '../answers/answers';

const KEBAB = '+([a-z0-9])*(-+([a-z0-9]))';

// Everything except camelCase, so router segments like `[slug]`, `(tabs)`, `_layout` and `+page@(app)` all pass while
// `useThing` and `apiClient` don't.
export const COMPONENT = '!([a-z]*[A-Z]*)';

// A declaration file: kebab-case or camelCase, so `vite-env.d.ts` and `assets.d.ts` both pass.
export const DECLARATION = `@(${KEBAB}|+([a-z])*([a-zA-Z0-9]))`;

// A folder: kebab-case, plus `__tests__`, which every framework's tooling reserves as-is.
export const FOLDER = `@(${KEBAB}|__tests__)`;

// The same, plus the segments a file-based router owns (`[slug]`, `[...slug]`, `[[lang]]`, `(tabs)`, TanStack's
// `{-$id}`), granted where a router names one today or may later: the React family, Solid and SvelteKit.
export const FOLDER_ROUTED = String.raw`@(${KEBAB}|__tests__|\[*\]|\(*\)|{*})`;

/**
 * CamelCase for `.ts`, excluding `.d`, `.test` and `.spec`: `check-file` applies every matching key rather than the
 * most specific, so two disagreeing conventions on one file satisfy neither.
 * A route directory gets two keys since its own filenames (`+page.server.ts`, `opengraph-image.ts`)
 * aren't camelCase, and `src/!(app)/**\/*` alone can't reach a file sitting directly in `src/`.
 */
const scriptKeys = (routeDirectory?: string): NamingMap => {
  if (routeDirectory === undefined) {
    return { 'src/**/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE' };
  }

  return {
    'src/!(*.d|*.test|*.spec).ts': 'CAMEL_CASE',
    [`src/!(${routeDirectory})/**/!(*.d|*.test|*.spec).ts`]: 'CAMEL_CASE',
  };
};

// Its own key, not the script one: `src/**/*.ts` matches `vite-env.d.ts`, and two keys on one file must agree.
const DECLARATION_KEY: NamingMap = { 'src/**/*.d.ts': DECLARATION };

// The React family: `.tsx` is a component wherever it sits, everything else is a module.
const componentNaming = (routeDirectory?: string): NamingMap => {
  return {
    'src/**/*.tsx': COMPONENT,
    ...scriptKeys(routeDirectory),
    ...DECLARATION_KEY,
  };
};

// The same, with a single-file-component extension marking the component instead of an `x`.
const sfcNaming = (extension: 'vue' | 'svelte', routeDirectory?: string): NamingMap => {
  return {
    [`src/**/*.${extension}`]: COMPONENT,
    ...scriptKeys(routeDirectory),
    ...DECLARATION_KEY,
  };
};

// Keyed by target rather than framework: the policy must be total and `webextension` has no framework.
export const NAMING: Record<TargetId, NamingMap> = {
  'react': componentNaming(),
  'next': componentNaming('app'),
  'vue': sfcNaming('vue'),
  'svelte': sfcNaming('svelte', 'routes'),
  'solid': componentNaming(),
  /**
   * `.astro` is the component wherever it sits, the way `.tsx` is on React: `COMPONENT` admits both `Card.astro` and
   * the lowercase `index.astro` a route file has to be, since it excludes only camelCase. `pages` is the route
   * directory, so its own `.ts` files are exempt from the module rule the way Next's `app` is.
   */
  'astro': {
    'src/**/*.astro': COMPONENT,
    ...scriptKeys('pages'),
    ...DECLARATION_KEY,
  },
  // Kebab-case, matching `ng generate`'s own spelling; needs no exclusions since `ignoreMiddleExtensions` already
  // reduces `app.spec.ts`/`app.config.ts` to the kebab-case `app`.
  'angular': { 'src/**/*.ts': 'KEBAB_CASE' },
  // A component here is a DOM-building module or custom element, still PascalCase, but marked by directory rather than
  // a `.tsx` extension.
  'webextension': {
    'src/components/**/!(*.d|*.test|*.spec).ts': 'PASCAL_CASE',
    ...scriptKeys('components'),
    ...DECLARATION_KEY,
  },
  'react-native': componentNaming('app'),
};

// Folder policy per target: kebab-case everywhere, router segments where a router names them.
export const FOLDER_NAMING: Record<TargetId, NamingMap> = {
  'react': { 'src/**/': FOLDER_ROUTED },
  'next': { 'src/**/': FOLDER_ROUTED },
  'vue': { 'src/**/': FOLDER },
  'svelte': { 'src/**/': FOLDER_ROUTED },
  'solid': { 'src/**/': FOLDER_ROUTED },
  'angular': { 'src/**/': FOLDER },
  // Astro routes are files under `src/pages/`, and a dynamic one is `[slug].astro`, so a directory may be one too.
  'astro': { 'src/**/': FOLDER_ROUTED },
  'webextension': { 'src/**/': FOLDER },
  'react-native': { 'src/**/': FOLDER_ROUTED },
};
