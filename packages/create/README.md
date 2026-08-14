# @linteljs/create

[![npm](https://img.shields.io/npm/v/@linteljs/create.svg)](https://www.npmjs.com/package/@linteljs/create)
[![ci](https://github.com/Faran52/linteljs/actions/workflows/ci.yml/badge.svg)](https://github.com/Faran52/linteljs/actions/workflows/ci.yml)

Create a TypeScript project with the framework's own scaffolder, then add the lintel standard: ESLint flat
config, TypeScript settings, git hooks, test setup, and coding-agent rules.

```bash
pnpm create @linteljs my-app
```

Use the package manager you have. The argument is the project name. Leave it out to answer that question in
the CLI. Names use lowercase letters, digits, dots, dashes, and underscores, and must start with a letter or
digit, avoid npm's reserved names, and contain no more than 214 characters. Extra positional arguments are
rejected.

| Runner | Short form | Long form |
| --- | --- | --- |
| pnpm | `pnpm create @linteljs my-app` | `pnpm dlx @linteljs/create my-app` |
| npm | `npm create @linteljs my-app` | `npx @linteljs/create my-app` |
| Yarn 2+ | `yarn create @linteljs my-app` | `yarn dlx @linteljs/create my-app` |
| Bun | `bun create @linteljs my-app` | `bunx @linteljs/create my-app` |

The runner you use here does not choose the generated project's package manager. That is a separate question.

Yarn 1 cannot use `yarn create @scope` for this package. It looks for a binary called `create`, but this
package provides `create-linteljs`. Use `npx @linteljs/create my-app` with Yarn 1.

If your pnpm sets `minimumReleaseAge`, a release published inside that window is refused until it ages. The
override has to come before `create`, not after:

```bash
pnpm --config.minimumReleaseAge=0 create @linteljs my-app
```

## What you get

The CLI asks about your project, then runs six stages:

1. **Scaffold:** runs the official generator. 2. **Lint:** writes ESLint and Stylelint config. 3. **Package:**
   updates package metadata, TypeScript config, `.gitignore`, and pnpm workspace config. 4. **Standard:**
   writes the agent plugin, hooks, commit checks, test setup, starter tests, and target config. 5.
   **Install:** runs the chosen package manager. 6. **Fix:** runs ESLint and Stylelint with `--fix`.

Every target is TypeScript. A fresh project starts with `pnpm check`, which runs linting, type-checking,
coverage, and the build. Generated coverage thresholds are 100%. Starter tests sit beside scaffolded code so
the test setup proves itself on day one.

The generated `eslint.config.js` uses `defineConfig` from `@linteljs/eslint-config/define-config`. The
composer fixes layer order and keeps framework import-sort groups aligned with the base layer. A project can
still compose exported layers by hand.

## Targets

| Target | Official scaffolder |
| --- | --- |
| React | Vite |
| Next.js | Create Next App |
| Vue | create-vue |
| Svelte | sv |
| Solid | Vite |
| Angular | Angular CLI |
| Astro | create-astro |
| React Native | Expo |
| Web Extension | Vite, then a Manifest V3 layer |

The CLI runs each scaffolder through the package manager selected in the questionnaire. The pnpm spellings are
not hard-coded into an npm, Yarn, or Bun project.

React Native needs **npm 11 on PATH**, whichever package manager you pick. `create-expo-app` shells out to
`npm pack --dry-run --json`, and npm 12 returns an object where npm 11 returned an array, so the scaffold
fails before writing a file with `Could not parse JSON returned from "npm pack"`. That is
[expo/expo#48091](https://github.com/expo/expo/issues/48091), open with no released fix. Node 24 bundles npm
12, so this bites by default: `npm i -g npm@11` first, and undo it once a fixed `create-expo-app` ships.

## Questions and options

The questionnaire covers project name, framework, testing, package manager, libraries, an optional state
store, type safety, AI agents, and AI plugins. A question is asked only where the target has a slot for
it: a target without a store choice does not ask that one, and the extension target additionally asks
its browser, its surfaces (popup, background, devtools panel) and the UI framework it hosts, while
Astro asks the last of those alone.
`--yes` accepts defaults, including React, Vitest, pnpm, strict type safety, Claude Code, and all three AI
plugins.

```text
@linteljs/create [name] [options]
@linteljs/create sync [options]

  --skip-scaffold   run stages 2-6 against an existing repository
  --no-install      skip install and the ESLint fix pass
  --fresh           with --skip-scaffold, treat the directory as new scaffolder output
  --skip <stage>    skip scaffold, lint, package, standard, install, or fix (repeatable)
  --yes, -y         accept defaults, ask nothing
  --force           sync: overwrite without asking
  --help, -h
```

For a non-interactive create, pass both the project name and `--yes`. Ctrl+C writes nothing.

## Existing projects and updates

```bash
npx @linteljs/create --skip-scaffold
```

If `lintel.config.json` already exists, the CLI uses it and asks nothing. Otherwise it asks the questionnaire.
It does not guess a framework for an existing project. Pass `--yes` only when you want defaults.

`lintel.config.json` records answers at the project root. Edit it, then use `sync` to review the output:

```bash
npx @linteljs/create sync
npx @linteljs/create sync --force
```

The first command shows one diff per file and writes nothing. `--force` applies the planned files. Sync
updates the plugin, host declarations, and emitted ESLint, Stylelint, TypeScript, Vite, and Vitest config. It
does not replace `package.json`, `.gitignore`, `pnpm-workspace.yaml`, your README, or your `CLAUDE.md` and
`AGENTS.md` after their first write. It also leaves `lintel.config.json` untouched.

Removing an agent from the config can remove that agent's Lintel-owned declaration on the next `sync --force`.
It only removes exact paths the CLI owns.

## Agents

Choose Claude Code, Codex, or both. The generated `plugins/linteljs/` directory holds one shared plugin for
selected hosts. Host-specific files point to it instead of copying the standard.

| Path | Written for | Ownership after creation |
| --- | --- | --- |
| `plugins/linteljs/` | Every project | Lintel |
| `.claude/settings.json` | Claude Code | Shared: Lintel merges its plugin entries into what you have |
| `.agents/plugins/marketplace.json` | Codex | Lintel |
| `CLAUDE.md` | Claude Code | You |
| `AGENTS.md` | Codex | You |

The declarations do not install anything. Your agent asks you to trust the directory, install any declared
plugin, and approve hooks when you open the project. The project still lints, builds, and passes its gate if
you decline.

The hooks warn about ESLint without `--fix`, reject banned git operations, and check each file an agent writes
for banned patterns. They inspect command payloads. They do not execute commands.

## Why this is shared

Copied configuration drifts. A project can silently lose a rule while its config still looks like the others.
Lintel puts shared rules in `@linteljs/eslint-config` and keeps generated files reviewable through `sync`.

The tool does not reimplement framework scaffolding. It asks each official generator for a non-interactive
TypeScript project, then applies the standard around it. That keeps framework ownership with the framework and
shared setup in one place.

## Requirements

Node 24.19 or newer is required.

## Related packages

- [`@linteljs/eslint-config`](https://github.com/Faran52/linteljs/tree/main/packages/eslint-config) -
  [`@linteljs/eslint-plugin`](https://github.com/Faran52/linteljs/tree/main/packages/eslint-plugin)

MIT
