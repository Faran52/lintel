# @linteljs/eslint-config

[![npm](https://img.shields.io/npm/v/@linteljs/eslint-config.svg)](https://www.npmjs.com/package/@linteljs/eslint-config)
[![ci](https://github.com/Faran52/linteljs/actions/workflows/ci.yml/badge.svg)](https://github.com/Faran52/linteljs/actions/workflows/ci.yml)

Composable ESLint flat-config layers for TypeScript projects. Start with `defineConfig` when the built-in
layer order fits your project.

```bash
npm install --save-dev @linteljs/eslint-config eslint
```

```js
// eslint.config.js
import { defineConfig } from '@linteljs/eslint-config/define-config';

const config = await defineConfig({
  framework: 'react',
  typescript: true,
  vitest: true,
});

export default config;
```

`defineConfig` returns a normal flat-config array. Add your own blocks after it to override a matching rule or
scope an exception.

## Options

All layer switches are off unless you set them.

| Option | Effect |
| --- | --- |
| `framework` | `'react'`, `'next'`, `'vue'`, `'svelte'`, `'solid'`, or `'angular'`. Next includes React. |
| `typescript` | Adds the TypeScript layer. |
| `vitest` | Adds rules for `*.test.*` and `*.spec.*` files. |
| `html` | Adds the HTML layer. |
| `libraries` | Adds `'tanstack-query'` and/or `'tailwind'`. |
| `ignores`, `naming`, `folderNaming`, `aliases`, `resolver` | Passed to `base` under the same names. |

`frameworkGroup` is intentionally not an option here. The composer reads it from the framework layer so import
sorting cannot drift from the framework it loaded.

## Layer order

The composer applies base, TypeScript, framework, library, Vitest, then HTML. Framework layers override shared
layers. Vue and Svelte must follow TypeScript so their top-level parsers can nest the TypeScript parser
correctly.

`next()` is the one framework layer that stacks: React comes first, then Next. Angular owns its template
processing, so a generated Angular project does not add `html()`.

## Compose layers yourself

Use subpaths when the composer is not enough. Importing only the layers you use avoids loading optional peers
for other frameworks.

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

Apply the same order yourself. The root export re-exports layers for convenience, but subpaths are the better
choice for a project config.

## Layers

| Export | Subpath | Purpose |
| --- | --- | --- |
| `defineConfig(options?)` | `/define-config` | Loads requested layers and orders them. |
| `base(options?)` | `/base` | Shared style, imports, unused imports, naming, complexity, and Lintel rules. It works for JavaScript on its own. |
| `typescript()` | `/typescript` | Strict type-aware rules and an untyped tail for JavaScript and HTML. |
| `vitest()` | `/vitest` | Vitest recommended rules for test files. |
| `html()` | `/html` | HTML rules with its own parser. |
| `astro()` | `/astro` | `.astro` template rules and accessibility, with its own parser. A file type, so it stacks with a framework layer rather than replacing one. |
| `react()` | `/react` | React, React Hooks, JSX accessibility, and Lintel React rules. |
| `next()` | `/next` | Next configuration, composed after React. |
| `vue()` | `/vue` | Vue recommended rules and template accessibility, with TypeScript nested in the SFC parser. |
| `svelte()` | `/svelte` | Svelte recommended rules with the same parser arrangement. Accessibility is the compiler's, reported by `svelte-check --fail-on-warnings`, not this layer's. |
| `solid()` | `/solid` | Solid TypeScript rules and JSX accessibility. |
| `angular()` | `/angular` | Angular TypeScript rules, plus template rules and template accessibility. |
| `tanstackQuery()` | `/tanstack-query` | TanStack Query recommended rules. |
| `tailwind()` | `/tailwind` | Tailwind class-order, duplicate, and conflict checks. |

Framework and library plugins are optional peer dependencies. Install the peers for layers you enable.

## Base options

```ts
interface BaseOptions {
  ignores?: string[];
  naming?: NamingMap;
  folderNaming?: NamingMap;
  aliases?: AliasMap;
  frameworkGroup?: string[];
  resolver?: { project?: string };
}
```

Pass aliases to the composer instead of adding them in a later block. The base layer uses them for both import
resolution and import-sort groups. Set `resolver.project` when the relevant tsconfig is not the one the
resolver finds from the working directory.

## Why these layers exist

The config is layered so a project only loads the plugins it chose. `defineConfig` also makes order a tested
public API, not an instruction a reader has to copy.

`base` uses `import-x`'s TypeScript settings rather than a hand-written replacement. Those settings tell the
resolver which parser handles the file it resolved. Without them, `import-x/no-cycle` can miss cycles in
TypeScript files.

Vue turns off `@typescript-eslint/no-unsafe-argument` and `@typescript-eslint/no-unsafe-assignment` for `*.ts`
files only. TypeScript cannot resolve an SFC import there without Vue's tsserver plugin, while `vue-tsc
--noEmit` checks the same seam. SFC scripts stay covered by the nested parser.

## Scripts

```bash
pnpm build
pnpm typecheck
pnpm smoke
```

`pnpm smoke` packs the package and imports every export subpath. It catches an exports entry that builds
successfully but fails for a consumer.

MIT
