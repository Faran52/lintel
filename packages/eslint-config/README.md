# @linteljs/eslint-config

Shareable ESLint flat-config layers. One base, one per framework, composed by
[`@linteljs/create`](../create) or by hand.

Every export is a **function returning a flat-config array**, not an array. Two things vary per
project and cannot be static: the `simple-import-sort` group order, which depends on the
project's path aliases and its framework, and the `check-file` naming map.

```bash
pnpm add -D @linteljs/eslint-config
```

## Composition

```js
import { defineConfig } from '@linteljs/eslint-config/define-config';

const config = await defineConfig({
  framework: 'react',
  typescript: true,
  vitest: true,
  html: true,
  ignores: ['dist/**', 'coverage/**', '.claude/**'],
  aliases: {
    '@components/*': './src/components/*',
    '@ui/*': './src/components/ui/*',
    '@lib/*': './src/lib/*',
    '@hooks/*': './src/lib/hooks/*',
    '@config/*': './src/config/*',
  },
  naming: {
    'src/components/**/*.tsx': 'PASCAL_CASE',
    'src/**/*.ts': 'CAMEL_CASE',
  },
});

export default config;
```

This is what `@linteljs/create` emits. It orders the layers itself, so the wrong order is not
something a config file can express, and it reads the framework's `simple-import-sort` bucket off
the framework layer rather than making you thread it back into `base`. It returns the composed
array, so it can be inspected, sliced, or appended to.

`defineConfig` is `async` and lives on its own subpath because it loads only the layers it was
asked for: every framework plugin is an optional peer, and importing the barrel would load all
six.

### Options

| option | what it does |
| --- | --- |
| `framework` | `'react' \| 'next' \| 'vue' \| 'svelte' \| 'solid' \| 'angular'`. `next` stacks `react` beneath itself |
| `typescript` | composes `typescript()` |
| `vitest` | composes `vitest()` |
| `html` | composes `html()` |
| `libraries` | library layers: any of `'tanstack-query'`, `'tailwind'` |
| `ignores`, `naming`, `folderNaming`, `aliases`, `resolver` | passed straight to `base`, under the same names |

Every flag is off when absent. A layer that applied itself by default would be a rule set nobody
wrote down, and `base` alone is already a working config.

`frameworkGroup` is the one `base` option `defineConfig` does not take, because taking it is the
defect it exists to remove.

### Composing by hand

The layers are still exported one per subpath, and that is the escape hatch: anything the composer
does not offer is one import and one spread away.

```js
import base from '@linteljs/eslint-config/base';
import typescript from '@linteljs/eslint-config/typescript';
import react, { reactGroup } from '@linteljs/eslint-config/react';

export default [
  ...base({ frameworkGroup: reactGroup, aliases: { /* ... */ } }),
  ...typescript(),
  ...react(),
];
```

Import through the subpaths, as above, rather than the root barrel: a React project should
never load the Vue or Angular plugins to build its config. The barrel exists for convenience
and re-exports every layer.

### Extending and overriding

`defineConfig` returns a plain flat-config array, so everything ESLint's own composition rules allow
works here with no API of ours in the way. Append blocks after it: in flat config the last block
matching a file wins, so anything spread after the composed array overrides it.

```js
import { defineConfig } from '@linteljs/eslint-config/define-config';
import perfectionist from 'eslint-plugin-perfectionist';

const config = await defineConfig({ framework: 'react', typescript: true, vitest: true });

export default [
  ...config,

  // A plugin this package does not ship. Install it yourself; nothing here needs to know about it.
  {
    name: 'my-app/perfectionist',
    plugins: { perfectionist },
    rules: { 'perfectionist/sort-objects': 'error' },
  },

  // Turn one of ours down, or off. Naming the block is what makes `--inspect-config` readable later.
  {
    name: 'my-app/overrides',
    rules: {
      '@linteljs/newline-destructuring': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Scoped to a path, which is the honest form of most exemptions.
  {
    name: 'my-app/scripts',
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
```

Three things worth knowing before you do:

- **You do not need to re-register a plugin a layer already registered.** Override the rules; the
  plugin is there. Re-registering the same imported object is harmless and ESLint accepts it, but a
  *different* object under a name already taken fails the whole config with
  `ConfigError: Config "<name>": Key "plugins": Cannot redefine plugin "@linteljs"`, and no file is
  linted at all. Two copies of a package in the tree is the usual way to get two objects, so the
  safe habit is not to name it twice.
- **`ignores` and `aliases` are options, not overrides.** Pass them to `defineConfig` rather than
  appending a block, so `base` builds the resolver and the naming globs from the same list it
  reports on. A lone `{ ignores: [...] }` block is still the way to add a global ignore on top.
- **Run `eslint --inspect-config` when a rule does not do what you expect.** It prints which blocks
  applied to a file and in what order, which answers "is my override actually last" without guessing.

If a change belongs to every project you start rather than to this one, it belongs in a layer here
rather than in a config file, and the layers are exported one per subpath for exactly that.

In a project generated by `@linteljs/create`, `eslint.config.js` is emitted rather than preserved, so
`sync` reports your edits as a diff and `--force` would overwrite them. Either keep the edits and
answer the diff each time, or keep them in a file of their own that the config imports.

## Order

`base`, then `typescript`, then the framework layer, then library layers, then `vitest`, then `html`.
`defineConfig` applies it; composing by hand means applying it yourself.

1. `base` and `typescript` come first. Framework layers override them, never the reverse.
2. Framework layers are mutually exclusive. `next()` is the one exception: it stacks on
   `react()`, and both are emitted in that order.
3. `vue()` and `svelte()` **must** come after `typescript()`. Both set a top-level parser
   (`vue-eslint-parser`, `svelte-eslint-parser`) with `typescript-eslint` nested under
   `parserOptions.parser`; placed earlier, that top-level parser is overwritten and every
   component fails to parse at its template. The `describe('layer order', ...)` block in
   `src/defineConfig.test.ts` lints a real `.vue` and a real `.svelte` in both orders: correct,
   the framework's own rules report; reversed, the file dies on a parse error that names the
   component and nothing about the config, which is the red herring this rule exists to stop
   someone chasing.
4. No layer turns another's rule off to de-duplicate reporting. `eslint-config-next` registers
   `eslint-plugin-import` but configures exactly one rule from it,
   `import/no-anonymous-default-export`, and the config files `@linteljs/create` emits name their
   default export rather than exempting themselves from it.

## Layers

| export | subpath | what it brings |
| --- | --- | --- |
| `defineConfig(options?)` | `/define-config` | not a layer: the composer above, which loads the layers below on demand and puts them in order |
| `base(options?)` | `/base` | `@stylistic`, `import-x`, `simple-import-sort`, `unused-imports`, `check-file`, `sonarjs`, `@linteljs/eslint-plugin`. Not type-aware, so `base` alone is a working config for a plain JavaScript repository |
| `typescript()` | `/typescript` | `strictTypeChecked` + `stylisticTypeChecked` + `projectService`, and the `**/*.js` tail that turns the type-aware rules back off |
| `vitest()` | `/vitest` | `@vitest/eslint-plugin`, scoped to `**/*.{test,spec}.*` |
| `html()` | `/html` | `@html-eslint` with its own parser, scoped to `**/*.html` |
| `react()` | `/react` | `@eslint-react` `recommended-typescript`, `eslint-plugin-react-hooks`, `@linteljs/sort-hook-dependencies` |
| `next()` | `/next` | `eslint-config-next`, normalised for ESLint 10 |
| `vue()` | `/vue` | `eslint-plugin-vue` `flat/recommended` with TypeScript nested under the SFC parser, and the two `no-unsafe-*` rules the SFC import seam blinds (see below) |
| `svelte()` | `/svelte` | `eslint-plugin-svelte` `flat/recommended`, same nesting |
| `solid()` | `/solid` | `eslint-plugin-solid` `flat/typescript` |
| `angular()` | `/angular` | `angular-eslint`, both halves, plus `processInlineTemplates`. The one target that does not take `html()` |
| `tanstackQuery()` | `/tanstack-query` | `@tanstack/eslint-plugin-query` `flat/recommended` |
| `tailwind()` | `/tailwind` | `eslint-plugin-better-tailwindcss` `recommended`: class order, duplicates, conflicts and unknown classes. Resolves against the default theme; a customised theme sets `settings['better-tailwindcss'].entryPoint` |

Every plugin is an **optional** peer dependency. Nothing is installed for a layer you do not
import.

### The one rule pair `vue()` turns off

`import App from './App.vue'` has no type for typescript-eslint, because tsserver cannot resolve
an SFC without Vue's tsserver plugin, so the import is an error type and `no-unsafe-argument` and
`no-unsafe-assignment` fire on any use of it. `vue()` turns those two off for `**/*.ts` only,
because the Vue target's `typecheck` script is `vue-tsc --noEmit`, which types the same lines
correctly and fails the build if either is genuinely unsafe. Nothing is lost that a gate the
project already runs does not cover, and the rest of the `no-unsafe-*` family stays on.

`**/*.ts` and not `**/*.{ts,vue}`. The seam is an SFC imported *into* a script, the entry and the
router, and inside an SFC the nested parser types its own `<script setup>`, so nothing there
needed the exemption. The narrower scope was measured: the end-to-end Vue target generates,
installs and checks at zero findings with `.vue` outside this glob.

The two alternatives cost more than they return, and both were measured: loading
`@vue/typescript-plugin` types the import and then lints the virtual TypeScript it generates for
every SFC (2 findings become 376), and `declare module '*.vue'` blinds `vue-tsc` as well.

## `base` options

```ts
interface BaseOptions {
  ignores?: string[];
  naming?: NamingMap;         // glob -> PASCAL_CASE | CAMEL_CASE | KEBAB_CASE
  folderNaming?: NamingMap;
  aliases?: AliasMap;         // '@ui/*' -> './src/components/ui/*'
  frameworkGroup?: string[];  // reactGroup, vueGroup, and so on
  resolver?: { project?: string };
}
```

`defineConfig` takes all of these under the same names, bar `frameworkGroup`, which it fills in
from the framework layer it loaded.

`aliases` is the same list that writes `tsconfig.paths`, so the import-sort groups and the
path aliases cannot disagree. The buckets are ordered down the spine's dependency direction
(config and typings, then the `lib` family, then the hooks slot, then components, then mocks),
so a sorted import block reads top-down as the architecture. An alias the project does not
declare produces no pattern; an alias no bucket names gets its own group rather than falling
in with `node_modules`.

`resolver.project` is only needed when the tsconfig that holds the paths is not the one the
import resolver would find from the working directory, which usually means a workspace.

## Why this package exists

`base` spreads `importX.flatConfigs.typescript` instead of hand-writing a `settings` block.
Two shipping repositories hand-wrote that block and both got it wrong in the same direction:
`import-x/no-cycle` has to parse the file it resolved before it can read that file's own
imports, and without `import-x/parsers` naming a parser for the extension it just resolved it
returns early and reports nothing. One repository omitted the setting entirely, so its
`no-cycle` had never fired. The other named `.ts` and `.tsx`, leaving `.cts` and `.mts` in the
same hole.

`src/base.test.ts` pins that with a two-file cycle across `.cts` files, and with a negative
control that asserts the hand-written block it replaces still misses it.

## Scripts

```bash
pnpm build      # tsdown, one entry per exports subpath
pnpm typecheck
pnpm smoke      # packs the tarball and loads every subpath from it
```

`pnpm smoke` is the pre-publish gate. An `exports` entry with no matching `tsdown` entry
typechecks, builds, publishes, and then 404s the first time a consumer imports it.
