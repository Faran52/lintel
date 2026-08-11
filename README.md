# lintel

Lintel scaffolds a TypeScript project with a shared lint, type-check, and test standard. It starts with the
framework's own generator, then adds the configuration and project files that usually get copied from the last
repository.

```bash
pnpm create @linteljs my-app
```

Use the package manager you have.

| Runner | Command |
| --- | --- |
| pnpm | `pnpm create @linteljs my-app` |
| npm | `npm create @linteljs my-app` |
| Yarn 2+ | `yarn create @linteljs my-app` |
| Bun | `bun create @linteljs my-app` |

The generated project has ESLint flat config, TypeScript settings, git hooks, test setup, and coding-agent
rules. It supports React, Next.js, Vue, Svelte, Solid, Angular, React Native through Expo, and Manifest V3 web
extensions.

It starts with a working gate:

```bash
pnpm check
```

That runs linting, CSS linting, type-checking, coverage, and the build. Coverage thresholds are 100%.

Yarn 1 cannot use its `create` shorthand for this package. Use `npx @linteljs/create my-app`. Long forms are
in the [create package README](packages/create).

## Packages

| Package | Use it for |
| --- | --- |
| [`@linteljs/create`](packages/create) | Start a project or bring an existing one under the standard. |
| [`@linteljs/eslint-config`](packages/eslint-config) | Compose ESLint flat-config layers. |
| [`@linteljs/eslint-plugin`](packages/eslint-plugin) | Use the custom rules behind the config. |

## What stays shared

Generated projects depend on `@linteljs/eslint-config`, rather than carrying private copies of rules. Their
`eslint.config.js` selects layers. It does not contain rule logic. Updating the package is how a project takes
a shared improvement.

`defineConfig` owns the layer order. You can still import each layer from its subpath and compose an array
yourself when a project needs it.

## Existing projects

```bash
npx @linteljs/create --skip-scaffold
npx @linteljs/create sync
```

The first command applies the standard to the current repository. The second compares Lintel-owned files with
the current version. It prints diffs and writes nothing until `--force` is passed. It plans from
`lintel.config.json`, so it does not guess a framework or replace recorded choices.

## Why

Copied configuration drifts quietly. A missing setting can disable a rule while two config files still look
alike. Lintel keeps shared rules in a published package and makes generated files explicit, so projects can
update them with a reviewable diff.

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

MIT
