# @linteljs/eslint-plugin

[![npm](https://img.shields.io/npm/v/@linteljs/eslint-plugin.svg)](https://www.npmjs.com/package/@linteljs/eslint-plugin)
[![ci](https://github.com/Faran52/linteljs/actions/workflows/ci.yml/badge.svg)](https://github.com/Faran52/linteljs/actions/workflows/ci.yml)

ESLint rules for TypeScript and React code. They cover layout, imports, functions, promises, and declaration
order.

```bash
npm install --save-dev @linteljs/eslint-plugin
```

`pnpm add -D`, `yarn add -D`, and `bun add -d` work too.

## Use it

For ESLint flat config, spread the `flat` preset:

```js
import lintel from '@linteljs/eslint-plugin';

export default [
  ...lintel.configs['flat/recommended'],
];
```

The same shape works in CommonJS flat config:

```js
const lintel = require('@linteljs/eslint-plugin');

module.exports = [
  ...lintel.configs['flat/recommended'],
];
```

For ESLint 8 or older, use the legacy preset name:

```jsonc
{
  "extends": ["plugin:@linteljs/recommended"]
}
```

Flat presets are arrays. Bare presets are eslintrc objects. Use the matching form for your config.

To enable one rule:

```js
export default [
  {
    plugins: { '@linteljs': lintel },
    rules: { '@linteljs/import-newlines': 'error' },
  },
];
```

## Pick a category

Category presets include every rule in that category, including rules outside `recommended`.

```js
export default [
  ...lintel.configs['flat/layout'],
  ...lintel.configs['flat/promises'],
];
```

Available categories are `layout`, `ordering`, `imports`, `functions`, and `promises`.

TypeScript-only rules are scoped to `**/*.{ts,tsx,mts,cts}`. Set a TypeScript parser before relying on them:

```js
import tseslint from 'typescript-eslint';

export default [
  ...lintel.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: { parser: tseslint.parser },
  },
];
```

`union-newline` is in `recommended`. `interface-order` is opt-in through `flat/ordering` or by rule name.

## Rules

Each rule link has examples, options, and cases it declines to fix.

| Rule | Description | Category | Recommended | TypeScript only | Options |
| --- | --- | --- | --- | --- | --- |
| [`@linteljs/destructuring-property-newline`](src/rules/destructuring-property-newline) | Keep multiline destructuring properties on separate lines. | layout | yes | | |
| [`@linteljs/export-specifier-newline`](src/rules/export-specifier-newline) | Put each export specifier on its own line. | layout | yes | | |
| [`@linteljs/import-newlines`](src/rules/import-newlines) | Split imports that exceed the configured item count or line length. | layout | yes | | `maxItems`, `maxLineLength` |
| [`@linteljs/interface-order`](src/rules/interface-order) | Put top-level interfaces and type aliases after imports and before runtime code. | ordering | | yes | |
| [`@linteljs/newline-destructuring`](src/rules/newline-destructuring) | Split object destructuring, interfaces, and type literals with too many properties. | layout | yes | | `maxProperties`, `maxPropertiesWithRest` |
| [`@linteljs/no-import-namespace-destructure`](src/rules/no-import-namespace-destructure) | Import named members instead of destructuring a namespace import. | imports | yes | | |
| [`@linteljs/prefer-arrow-functions`](src/rules/prefer-arrow-functions) | Prefer arrow functions when conversion preserves behaviour. | functions | yes | | `forceHoisted` |
| [`@linteljs/prefer-await-to-then`](src/rules/prefer-await-to-then) | Prefer `await` to promise chains. | promises | yes | | `strict` |
| [`@linteljs/prefer-destructured-props`](src/rules/prefer-destructured-props) | Destructure props in the function signature. | functions | | | |
| [`@linteljs/prefer-try-catch`](src/rules/prefer-try-catch) | Prefer `try`/`catch` around an awaited rejection handler. | promises | yes | | |
| [`@linteljs/sort-hook-dependencies`](src/rules/sort-hook-dependencies) | Sort hook dependency arrays. | ordering | | | `order`, `hooks` |
| [`@linteljs/union-newline`](src/rules/union-newline) | Split object or function union members, and long generic type arguments. | layout | yes | yes | `maxGenericMembers` |

`prefer-await-to-then` reports code that does not await a promise value. `prefer-try-catch` reports rejection
handlers around a value that is already awaited. With default options, they do not report the same line.
`strict: true` on `prefer-await-to-then` allows that overlap.

## Compatibility

The peer range is ESLint `>=5.0.0` and the Node range is `>=12.0.0`.

| ESLint | Config format | Preset |
| --- | --- | --- |
| 10.x | Flat config | `configs['flat/recommended']` |
| 9.x | Flat config | `configs['flat/recommended']` |
| 8.x and below | eslintrc | `extends: ['plugin:@linteljs/recommended']` |

The package has no runtime dependencies. Its compatibility matrix packs the tarball, runs it with ESLint 5
through 10, and checks that fixed output is identical across those versions. Compatibility helpers cover
ESLint APIs that moved between releases.

## Why the rules are cautious

A fixer must preserve behaviour. Rules that cannot prove a rewrite is safe report without fixing. The test
suite runs fixers against difficult input, parses their output, checks fixed-point output, and checks that
comments survive.

Rules are framework agnostic. TypeScript-only rules are scoped away from JavaScript files, so a JavaScript
project does not enable a rule that cannot report there.

## Adding a rule

Each rule owns one directory:

```text
src/rules/prefer-arrow-functions/
  index.ts
  index.test.ts
  README.md
```

Register the rule, add its test and documentation, add metadata to `__mocks__/ruleMetadata.json`, and add its
id to `RULE_MODULES` in `src/ruleModules.test.ts`. The registry derives presets and docs URLs. The table above
is deliberately hand-maintained.

## Licence

MIT
