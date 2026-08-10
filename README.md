# lintel

A lint, type and test standard that lives in one place instead of being copied between projects.

```bash
pnpm create @linteljs my-app
```

Scaffolds with the framework's own official generator, then layers on ESLint flat config,
`tsconfig`, git hooks, a test setup and rules for coding agents. Eight targets: React, Next.js,
Vue, Svelte, Solid, Angular, React Native through Expo, and Manifest V3 browser extensions.

The generated project passes its own gate on day one:

```bash
pnpm check     # lint && lint:css && typecheck && test:coverage && build
```

Coverage thresholds are 100% and are not relaxed to get there.

## Packages

| Package | What it is |
| --- | --- |
| [`@linteljs/create`](packages/create) | The CLI. Run with `pnpm create @linteljs`, never installed as a dependency. |
| [`@linteljs/eslint-config`](packages/eslint-config) | The shareable flat-config layers. The only dependency a generated project takes on. |
| [`@linteljs/eslint-plugin`](packages/eslint-plugin) | The custom rules the config enables. |

A generated `eslint.config.js` holds no rule logic, only which layers apply:

```js
import { defineConfig } from '@linteljs/eslint-config/define-config';

const config = await defineConfig({
  framework: 'react',
  typescript: true,
  vitest: true,
  html: true,
  aliases: { /* ... */ },
});

export default config;
```

The layers are still exported one per subpath and can be spread by hand. What `defineConfig` owns
is the order they compose in.

Fix a rule once, publish, and every project picks it up on update. No project holds a private
fork of the rules.

## Existing projects

```bash
npx @linteljs/create --skip-scaffold
```

Applies everything except the scaffold to a repository that already exists. It plans from the
answers recorded in `package.json`, so re-running it cannot re-decide what the project is, and it
refuses to run on defaults nobody chose.

The `.claude/` rules and hook scripts have to be real files on disk, so they are copied rather
than imported, and the emitted configs are regenerated whenever an option written into them
changes. Both drift. `npx @linteljs/create sync` re-applies them, showing a diff and refusing to
overwrite anything you have edited.

## Why

Copying a config between projects works exactly once. After that the copies drift, and the drift
is silent: a single missing setting can disable a rule outright while the config still looks
right. That is not hypothetical: it is what was found in two of these repositories, and it is
written up in [DESIGN.md](DESIGN.md) along with the decisions that are not visible in the code.

## Development

Requires Node 24.19+ and pnpm 11.20+. Developed and tested on macOS and Linux; Windows is
supported through WSL, not natively, because the git hooks and the sync command's diffing are
POSIX-shaped.

```bash
pnpm install
pnpm check                              # lint, typecheck, coverage, build
pnpm --filter @linteljs/create test:e2e    # all eight targets, end to end, ~5 min
```

The end-to-end suite runs each official scaffolder for real, generates a project, installs it,
and asserts `pnpm check` passes with zero lint findings. It is excluded from the default test
run because it takes minutes and hits the network.

The workspace lints itself with its own layers, imported from source, so a rule change is
judged against this repository before it reaches anyone else's.

Its own coverage is gated per package in the root `vitest.config.ts`, at 100% on statements,
branches, functions and lines for all three. A number that has to come down is a regression.

## License

MIT
