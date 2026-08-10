# @linteljs/eslint-plugin

[![npm](https://img.shields.io/npm/v/@linteljs/eslint-plugin.svg)](https://www.npmjs.com/package/@linteljs/eslint-plugin)
[![ci](https://github.com/Faran52/linteljs/actions/workflows/ci.yml/badge.svg)](https://github.com/Faran52/linteljs/actions/workflows/ci.yml)

Opinionated ESLint rules for lintel TypeScript and React code: vertical layout, import hygiene, and
modern idioms.

- **Zero runtime dependencies.** ESLint is a peer dependency, nothing else ships.
- **ESLint 5 to 10, both config formats.** `peerDependencies.eslint` is `>=5.0.0` and
  `engines.node` is `>=12.0.0`, because there are installs against both floors. Every rule reads
  the accessors ESLint moved through a shim, and `scripts/compatMatrix.js` installs all six majors
  and asserts they emit byte-identical fixed output.
- **Framework agnostic.** Nothing imports React, Vue or anything else.
- **TypeScript-only rules stay off in JavaScript.** They sit behind a `files` glob, so
  `@linteljs/interface-order` never shows up as enabled on a `.js` file it could not report on.
- **Fixers are checked, not just written.** Every fixer runs over a shared corpus of awkward inputs
  and its output is parsed, re-run to a fixed point, and compared for lost comments. Where a rule
  cannot rewrite something safely it reports and leaves the code alone rather than guessing.

## Install

```sh
npm install --save-dev @linteljs/eslint-plugin
```

## Usage

Every preset ships under two names. `flat/<name>` is the array a flat config spreads, and the bare
`<name>` is the eslintrc object an `extends` list takes. Spreading the bare one into a flat config
throws `TypeError: lintel.configs.recommended is not iterable`, which is the wrong-name symptom.

```js
// eslint.config.js
import lintel from '@linteljs/eslint-plugin';

export default [
  ...lintel.configs['flat/recommended'],
];
```

A `.cjs` config is the same array through `require`:

```js
// eslint.config.cjs
const lintel = require('@linteljs/eslint-plugin');

module.exports = [
  ...lintel.configs['flat/recommended'],
];
```

On ESLint 8 or older, the bare name in an `.eslintrc.json`:

```jsonc
{
  "extends": ["plugin:@linteljs/recommended"]
}
```

Or pick rules yourself:

```js
export default [
  {
    plugins: { '@linteljs': lintel },
    rules: {
      '@linteljs/import-newlines': 'error',
    },
  },
];
```

### Category presets

For anyone who wants a narrower slice:

```js
export default [
  ...lintel.configs['flat/layout'],
  ...lintel.configs['flat/promises'],
];
```

Available: `layout`, `ordering`, `imports`, `functions`, `promises`. A category preset carries its
whole category, including the rules `recommended` leaves out.

### TypeScript

A TypeScript-only rule needs a TypeScript parser. Every preset scopes those rules to `**/*.ts`,
`**/*.tsx`, `**/*.mts` and `**/*.cts`, an `overrides` entry in the eslintrc shape and a second
config object in the flat one, but you still have to point ESLint at the parser:

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

`recommended` carries one of the two: `union-newline`. `interface-order` relocates declarations, so
it is opt-in through `flat/ordering` or by name.

## Rules

Click a rule for its examples, its options and the cases it declines to fix.

| Rule | Description | Category | In `recommended` | TypeScript only | Options |
| --- | --- | --- | --- | --- | --- |
| [`@linteljs/destructuring-property-newline`](src/rules/destructuring-property-newline) | Enforce consistent newlines in destructuring patterns. Allows all properties on same line. | layout | yes | | |
| [`@linteljs/export-specifier-newline`](src/rules/export-specifier-newline) | Forces every export specifier to be on a new line. | layout | yes | | |
| [`@linteljs/import-newlines`](src/rules/import-newlines) | Enforce multiple lines for import statements past a certain number of items. | layout | yes | | `maxItems`, `maxLineLength` |
| [`@linteljs/interface-order`](src/rules/interface-order) | Enforce that top-level interfaces and type aliases are placed after imports, before runtime code. | ordering | | yes | |
| [`@linteljs/newline-destructuring`](src/rules/newline-destructuring) | Enforce newlines in object destructuring, interfaces, and type literals when there are too many properties. | layout | yes | | `maxProperties`, `maxPropertiesWithRest` |
| [`@linteljs/no-import-namespace-destructure`](src/rules/no-import-namespace-destructure) | Disallow destructuring namespace imports. Import only the specific named exports needed. | imports | yes | | |
| [`@linteljs/prefer-arrow-functions`](src/rules/prefer-arrow-functions) | Prefer arrow functions over plain functions when conversion preserves behaviour. | functions | yes | | `forceHoisted` |
| [`@linteljs/prefer-await-to-then`](src/rules/prefer-await-to-then) | Prefer await to then()/catch()/finally() for reading Promise values. | promises | yes | | `strict` |
| [`@linteljs/prefer-destructured-props`](src/rules/prefer-destructured-props) | Requires props to be destructured in the signature rather than read member by member. | functions | | | |
| [`@linteljs/prefer-try-catch`](src/rules/prefer-try-catch) | Prefer try/catch around an await to a promise rejection handler. | promises | yes | | |
| [`@linteljs/sort-hook-dependencies`](src/rules/sort-hook-dependencies) | Requires that hook dependency arrays are sorted alphabetically. | ordering | | | `order`, `hooks` |
| [`@linteljs/union-newline`](src/rules/union-newline) | Enforce newlines in union types containing objects/functions, or in generic type arguments with many keys. | layout | yes | yes | `maxGenericMembers` |

`prefer-await-to-then` and `prefer-try-catch` divide the work rather than duplicate it. The first is
about not awaiting at all; the second only speaks once a value is awaited, because a `try` needs an
`await` to wrap. With the default options they never report the same line. Setting `strict: true` on
`prefer-await-to-then` drops that split and the two overlap on purpose.

## Supported ESLint versions

`peerDependencies` says `>=5.0.0`, and `scripts/compatMatrix.js` is what makes that a test result
rather than a claim: it packs the tarball, installs all six majors side by side, lints one fixture
that trips every universal rule in `recommended`, and asserts every major emits byte-identical
fixed text.

| ESLint | Config format | Preset to reach for |
| --- | --- | --- |
| 10.x | flat | `configs['flat/recommended']` |
| 9.x | flat | `configs['flat/recommended']` |
| 8.x and below | eslintrc | `extends: ['plugin:@linteljs/recommended']` |

Both names stay. The bare ones have been the eslintrc objects since 1.0.0, and renaming them would
break every eslintrc consumer silently: spreading an array into `extends` reports nothing at all.

ESLint moved `getScope`, `getAncestors` and `getDeclaredVariables` from the rule context onto
`SourceCode` across 8.37 to 8.40, and `getSourceCode()` to `sourceCode` in 8.40. No rule reads any
of them directly. `src/utils/compatUtils.ts` tries the current shape and falls back to the old one,
so a modern ESLint never touches the legacy path and an old one still gets an answer. Reading
`context.sourceCode` directly does not throw on ESLint 7: the property is simply `undefined`, and
the first symptom is a rule that reports nothing.

The declared Node floor is `>=12.0.0`, which the matrix cannot prove because it runs every ESLint
on whichever Node invoked it. CI runs the built bundle inside `node:12-alpine` and `node:14-alpine`
instead, and `scripts/smoke.js` greps the bundle for built-ins newer than Node 12, since a bundler
downlevels `?.` and leaves `array.at(-1)` exactly where it was.

A rule is a directory named after its id, holding everything that rule owns:

```
src/rules/prefer-arrow-functions/
  index.ts        the rule
  index.test.ts   its suite
  README.md       its documentation, which is what the table above links to
```

Adding one is six steps, and the type system plus `src/meta.test.ts` catch a missed one:

1. `src/rules/<kebab-case>/index.ts`, built with `createRule('<kebab-case>', { ... })`.
   `category`, `language` and `recommended` are compulsory.
2. One line in the registry in `src/rules/index.ts`.
3. `src/rules/<kebab-case>/index.test.ts`.
4. `src/rules/<kebab-case>/README.md`.
5. An entry in `__mocks__/ruleMetadata.json`, the checked-in copy of every rule's public surface.
6. The rule id in `RULE_MODULES` in `src/ruleModules.test.ts`.

The presets and the docs URL derive from the registry. The rule table above does not: no
script writes it, and `meta.test.ts` only checks that each rule id appears somewhere in this file.
Edit it by hand and read it back.

## Licence

MIT
