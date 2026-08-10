# @linteljs/create

Scaffold a project, then layer a consistent standard on top of it: ESLint flat config,
`tsconfig`, git hooks, test setup, and rules for coding agents.

```bash
pnpm create @linteljs my-app
```

It does not reimplement any framework's scaffolder. It shells out to the official one, then
applies everything that normally gets copied by hand from your last project.

## Why

Copying a config between projects works exactly once. After that the copies drift, and the
drift is silent: a setting missing in one repo can disable a rule outright while the config
still looks right. This tool exists so the shared parts live in one published package
(`@linteljs/eslint-config`) and the copied parts can be re-synced instead of re-copied.

## Targets

| Target | Scaffolder |
| --- | --- |
| React | `pnpm create vite --template react-ts` |
| Next.js | `pnpm create next-app` |
| Vue | `pnpm create vue` |
| Svelte | `pnpm dlx sv create` |
| Solid | `pnpm create vite --template solid-ts` |
| Angular | `pnpm dlx @angular/cli new` |
| Web Extension (MV3) | `pnpm create vite --template vanilla-ts` |
| React Native (Expo) | `pnpm create expo-app` |

Latest version of each. There is no version matrix.

React Native needs **npm 11 on PATH**, whichever package manager you pick. `create-expo-app`
shells out to `npm pack --dry-run --json`, and npm 12 returns an object where npm 11 returned an
array, so the scaffold fails before writing a file with `Could not parse JSON returned from "npm
pack"`. That is [expo/expo#48091](https://github.com/expo/expo/issues/48091), open with no
released fix. Node 24 bundles npm 12, so this bites by default: `npm i -g npm@11` first, and undo
it once a fixed `create-expo-app` ships.

Each is invoked with the flags that make it non-interactive and that match what the later stages
emit. Four of them prompt when handed only a project name (Next, Vue, Svelte and Angular), and
`create-vite`, which the other three use, prompts in a TTY, so `--yes` cannot mean "ask nothing"
while a generator is asking. The full argv per target, with the reason for each flag, is
`scaffold` on each record in `src/model/targets/`.

## What it writes

Six stages, each independently skippable.

1. **Scaffold.** The official generator above.
2. **Lint.** `eslint.config.js` composed from `@linteljs/eslint-config` layers, plus
   `stylelint.config.js`.
3. **Package.** Patches `package.json` (`type`, `packageManager`, `engines`, scripts,
   devDependencies) without clobbering what the scaffolder wrote. Adds `tsconfig.json` with
   the path aliases, appends to `.gitignore`, and merges `pnpm-workspace.yaml`.
4. **Standard.** Everything the standard copies onto disk: the shared `plugins/linteljs/` plugin
   holding the rules and the safety hooks, the host declaration and adapter for each agent you
   selected, a `README.md` composed from your answers, husky + lint-staged + commitlint, the
   banned-pattern checker, the test setup, `vite.config` / `vitest.config`, and a starter test.
   It also runs `git init` where the generator left no repository, because husky installs nothing
   without one and says so only in a line buried in the install output.

   Not called `agent`, though it writes the agent rules. `--skip agent` read like "leave my agent
   rules alone" and took the build config with it, leaving a Vite target that could not build. To
   keep one file rather than a whole stage, use `sync`, which diffs per file and refuses to
   overwrite anything you have edited.
5. **Install.** Runs your package manager.
6. **Fix.** One `eslint . --fix` and one `stylelint --fix` pass over the finished project.

## The gate passes on day one

```bash
pnpm check     # lint && lint:css && typecheck && test:coverage && build
```

That command passes on a project one minute old, on every target, with nothing to run by hand
first. Its coverage thresholds are 100%, and they are not relaxed to get there. Two things make
it hold:

- **A starter test per target**, beside the code the scaffolder wrote. It is the worked example
  a configured-but-empty harness never gives you, and it proves the emitted vitest config really
  does transform that framework's component format.
- **Coverage counts code you write.** The bootstrap entry, a DI provider list, a route table and
  Next's root layout are excluded: they have no behaviour to assert and no branch to miss.
  Anything that does have one counts, and an exclusion that would leave a target measuring
  nothing is not taken. Svelte's root layout is covered for exactly that reason, because
  `--template minimal` writes no other executable line.

Two build-time transforms are switched off for the test run only: the React Compiler and
`vite-plugin-solid`'s HMR wiring. Each rewrites every component around code no test can reach:
measured, one permanently-uncovered branch per component, which would put 100% out of reach of
any React or Solid project, demo code or yours. Both still run for `dev` and `build`.

The generated `eslint.config.js` holds no rule logic, just which layers apply:

```js
import { defineConfig } from '@linteljs/eslint-config/define-config';

const config = await defineConfig({
  framework: 'react',
  typescript: true,
  vitest: true,
  html: true,
  ignores: ['dist/**', 'coverage/**', '.claude/**'],
  aliases: { /* ... */ },
  naming: { /* ... */ },
});

export default config;
```

`defineConfig` rather than a list of spreads, because two things about that list were not the
config file's to get right: the layers have an order that is load bearing, held until now by a
comment, and the framework layer publishes a `simple-import-sort` bucket that has to reach `base`
underneath it. The composer owns both. The layer subpaths all still exist, and spreading them by
hand is still supported for a project that needs to break out.

Improve a rule in `@linteljs/eslint-config`, publish, and every project picks it up on update.
No project holds a private fork of the rules.

## Agents

Two of the questions are about coding agents: which ones this project is for, and which plugins to
declare for them. The AI agents question is a multi-select over Claude Code and Codex, at least one
required; the default is Claude Code alone. The AI plugins question defaults to all three of
Ponytail, Context7 and Frontend Design, and selecting none is a valid answer.

Both hosts read the same thing. `plugins/linteljs/` is one plugin with one skill, one set of
references composed from your answers, and one set of hooks, carrying a manifest for each host
rather than a copy of itself per host. What differs is the host declaration and the adapter:

| File | Written for | Owned by |
| --- | --- | --- |
| `plugins/linteljs/` | always | lintel |
| `.claude/settings.json` | `claude-code` | lintel |
| `.agents/plugins/marketplace.json` | `codex` | lintel |
| `CLAUDE.md` | `claude-code` | you, after the first write |
| `AGENTS.md` | `codex` | you, after the first write |

The adapters are short on purpose. Each points at the skill and names the commands, so the standard
itself lives in one place and an adapter you have edited is never overwritten or removed.

Generating the declarations is not installing anything. Nothing here reaches the network, inspects
what you have installed, or installs a plugin: the files say which marketplaces and plugins this
project expects, and your agent asks you to trust the directory, install them, and approve the
hooks the first time you open it. Declining is a normal answer, and the project still lints, builds
and gates without any of them.

The hooks are the enforcement half, and they are the same three either host runs: a warning when
`eslint` is called without `--fix`, a refusal on the banned git operations, and the banned-pattern
checker over each file written. They read the tool payload and never execute the command they are
inspecting.

## The config file

Creation writes `lintel.config.json` at the project root, and it is the only place your answers are
recorded:

```json
{
  "$schema": "https://raw.githubusercontent.com/Faran52/linteljs/main/schemas/lintel.config.v1.schema.json",
  "schemaVersion": 1,
  "target": "react",
  "testing": "vitest",
  "packageManager": "pnpm",
  "libraries": [],
  "store": false,
  "typeSafety": "strict",
  "agents": ["claude-code"],
  "plugins": ["ponytail", "context7", "frontend-design"]
}
```

The `$schema` line is what gives an editor completion and validation over it. `schemaVersion` is
checked before anything else, so a file written by a newer release tells you to update
`@linteljs/create` rather than failing later on a field this build has never heard of. Edit the file
and re-run `sync` to take the change; there is no command that rewrites it for you.

## Existing projects

```bash
npx @linteljs/create --skip-scaffold
```

Runs stages 2 through 6 against a repository that already exists. This is the path for
projects you previously set up by hand.

Where the directory already holds a `lintel.config.json`, it plans from that and asks nothing, so
re-running cannot re-decide what the project is. Otherwise it runs the questionnaire, and where
nothing answers it, writes nothing and exits 1: this path rewrites `eslint.config.js`,
`tsconfig.json` and the plugin rules, and guessing the framework from a default is not recoverable
without git. Pass `--yes` to mean the defaults on purpose.

## Keeping a project current

```bash
npx @linteljs/create sync
```

Re-applies every file lintel owns, one at a time, showing a diff and writing nothing until you
pass `--force`. That is `plugins/linteljs/`, whose rules and hook scripts have to exist on disk
and so cannot come from an import, the host declarations `.claude/settings.json` and
`.agents/plugins/marketplace.json`, and the configs this CLI emits: `eslint.config.js`,
`stylelint.config.js`, `tsconfig.json`, `vite.config.ts` and `vitest.config.ts`. Those drift for
the same reason the rules do, whenever an option written into them is added or renamed, and `sync`
is how you take such a change with the diff shown first.

The plan comes from `lintel.config.json`, so a Svelte project is never re-planned as a React one.
Sync never asks a question: without that file it stops with

```
lintel.config.json was not found; this is not a LintelJS-managed project
```

and a file naming a schema version this release does not know tells you to update
`@linteljs/create` rather than guessing at it. Either way nothing is written. Sync does not rewrite
`lintel.config.json` itself, so your formatting survives untouched.

Answering the agent question differently is the one case where sync deletes. Drop Claude Code from
`agents` and the next `sync --force` reports `.claude/settings.json` and the Claude plugin manifest
as `obsolete` and removes them, along with any directory that empties out. It removes only the
exact paths this CLI writes: a file you added under `.claude/` yourself is not on that list and
stays.

Four kinds of file are deliberately out of reach. `package.json`, `.gitignore` and
`pnpm-workspace.yaml` are merges, so there is no whole shipped version to diff yours against.
`CLAUDE.md`, `AGENTS.md` and `README.md` are yours to write in once the project exists: sync puts
one back when it is missing and never reports an edited one as drift, so it is never removed even
when its agent is deselected. The starter tests are written once, over what the generator left, and
are your suite from then on.

`scripts/checkBannedPatterns.ts` is out of reach the same way. It holds your own `PROJECT_BANNED`
and `PROJECT_SKIPPED` lists, so sync restores it when it is missing and never writes over it once it
exists. Take a change to the shipped patterns by hand, from the diff.

On React Native, `PROJECT_SKIPPED` arrives seeded with the starter suite and its setup file. Those
mocks stand in for native modules whose published types are `any`, so the annotations that keep the
`no-unsafe-*` rules quiet are the ones the strict floor bans. Delete an entry the day you replace the
starter behind it.

## Options

```
@linteljs/create <name> [options]
@linteljs/create sync [options]

  --skip-scaffold   run stages 2-6 against an existing repository
  --no-install      skip the install and the eslint --fix pass that needs it
  --fresh           with --skip-scaffold, treat the directory as new scaffolder output
  --skip <stage>    skip a stage: scaffold, lint, package, standard, install, fix (repeatable)
  --yes, -y         accept what the project recorded plus the defaults, ask nothing
  --force           sync: overwrite without asking
  --help, -h
```

Nine questions. The first is the project name, which has no default and takes any valid npm package
name; it is skipped when a name was passed as the argument, and with `--skip-scaffold`, where the
directory is already named. The other eight all have a default: framework (`react`), testing
(`vitest`), package manager (`pnpm`), optional libraries (none), a state store (`None`), type safety
(`strict`), AI agents (`claude-code`), and AI plugins (all three). The AI agents question is a
multi-select with at least one required. The answers are written to `lintel.config.json` at the
project root, which is what `sync` and `--skip-scaffold` read. `--yes` declines the questions, not
the file: a recorded target still wins over the default.

Ctrl+C during the questionnaire exits 130 having written nothing, and says so rather than reporting
an error.

There is no language question: every generated project is TypeScript. Each scaffolder is asked for
it in its own spelling (`--template react-ts`, `--ts`, `--types ts`), and `tsconfig.json`, the
`typecheck` gate and the staged typecheck are unconditional.

The store question is a radio over the stores this target can bring, plus None, which is where the
cursor starts: Zustand on React, Next.js and React Native, Pinia on Vue (through `create-vue`'s own
`--pinia`), NgRx SignalStore on Angular. One at a time, so it is a radio and not a checkbox list.
Solid and Svelte are not asked, because the store is the framework's own (`solid-js/store`; `$state`
runes), and neither is the extension target, whose state belongs in `chrome.storage` rather than
memory.

Type safety picks which floor `scripts/checkBannedPatterns.ts` runs and which half of
`plugins/linteljs/skills/linteljs/references/type-standards.md` the project is held to. `strict` bans the escape hatches outright:
every `as unknown`, `unknown` outside a narrowing guard, `Partial<>`, an index signature, and the
three suppression directives. `relaxed` keeps only what a compiler cannot catch on its own, a double
cast erasing a type through `unknown` and an `eslint-disable`, and ships `src/typings/customTypes.d.ts`
for the shapes the strict floor would otherwise force a project to invent.

Everything else is derived: selecting Zod adds the `@apis/*` alias, the `lib/apis/` layout rule
and the dependency, and selecting TanStack Query adds its ESLint plugin rather than only its
binding. No directory is created for either: an alias names where code goes, and the layout is in
the plugin's `repo-structure.md`.

## One dependency

`@linteljs/create` installs one package of its own: [`@clack/prompts`](https://github.com/bombshell-dev/clack),
for the nine questions above. Reading raw keypresses off a real terminal, arrow keys and checkboxes
included, is not something `node:readline` does, and a scaffolder that hands off to another
scaffolder still owes its own nine questions a legible interface rather than a hand-rolled one.
It pulls in a handful of small packages of its own (`@clack/core`, `sisteransi` and two terminal-width
helpers), nothing with a dependency tree of consequence.

Argument parsing uses `node:util.parseArgs`, and `sync` diffs through `git`, which the hooks it
installs already require.

A run with no terminal attached, `--yes` aside, is refused outright rather than read from: this CLI
never pipes a questionnaire, so there is nothing here for a script to answer by mistake.

Requires Node 24.19 or newer.

## Related

- [`@linteljs/eslint-config`](https://github.com/Faran52/linteljs/tree/main/packages/eslint-config): the shareable layers
- [`@linteljs/eslint-plugin`](https://github.com/Faran52/linteljs/tree/main/packages/eslint-plugin): the custom rules

MIT
