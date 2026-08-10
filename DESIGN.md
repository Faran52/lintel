# Design

Why lintel exists, and the decisions that are not visible in the code.

Everything else lives with the thing it describes: the layers are documented in
`packages/eslint-config/README.md`, the pipeline in `packages/create/README.md`, and each
non-obvious mechanism in a comment beside the code that needed it. A design document that
restates code goes stale and then misleads.

## The problem

Lint, type, test and agent standards get copied by hand into each new project. The copies drift.

`compatlens/eslint.config.js` (166 lines) and `self-portfolio/eslint.config.js` (200 lines)
were roughly 85% identical: the same `@stylistic` overrides, the same five `import-x` rules,
the same `unused-imports` block, the same sort groups. Comments included, word for word.

They had already diverged in a way that silently disabled a rule:

| setting | self-portfolio | compatlens | `importX.flatConfigs.typescript` |
| --- | --- | --- | --- |
| `import-x/parsers` | absent, so `no-cycle` never fires | `.ts`, `.tsx` only | `.ts`, `.tsx`, `.cts`, `.mts` |
| `import-x/extensions` | absent | absent | 8 extensions |
| `import-x/external-module-folders` | absent | absent | present |

The comment explaining why `import-x/parsers` is required existed only in the repo that had it.
One repo was fixed and the other was not, and nothing could have told you which.

## The goal

One command produces a new project with the standard already applied. One command re-applies it
to a project that already exists. The shared rules live in a published package, so a fix reaches
every project on update instead of being re-copied into some of them.

## Non-goals

These are decisions, not omissions. Re-adding any of them needs an argument.

- **No forked framework templates.** Official scaffolders are shelled out to, never
  reimplemented, with the flags that make them non-interactive and match what later stages emit.
- **Latest version of each framework only.** No version matrix.
- **No JavaScript output.** `@linteljs/create` generates TypeScript, and there is no question about it.
  The standard it ships is a typed one end to end: `type-standards.md` is written against a
  compiler, `scripts/typecheckStaged.ts` is a gate on every commit, `tsc --noEmit` is a leg of
  `check`, and the `.d.ts` naming key exists because declarations do. A JavaScript answer switched
  all of that off and shipped a project holding itself to a lesser standard under the same name,
  which is the drift this repo exists to stop, not a second supported shape. What it cost was one
  spelling per scaffolder (`--template react-ts`, `--ts`, `--types ts`) and a language branch
  through the naming policy, the emitters, the prompts and the argv of four generators.

  A project that recorded `typescript: false` under an older version is refused, not converted:
  `run/sync`'s `readAnswers` throws, so both routes that plan from a recorded block (`sync`, and
  `create --skip-scaffold`) stop before writing. Converting silently would rewrite that project's
  `eslint.config.js`, `tsconfig.json` and scripts as TypeScript over source that is not, which is
  not recoverable without git. `StoredAnswers` keeps the field for that guard alone; `knownAnswers`
  drops it, so no freshly written record carries it forward.
- **No Prettier.** `@stylistic/eslint-plugin` owns formatting as lint rules. One tool, one config,
  no argument about who owns whitespace.
- **No Stryker, no MSW** by default. Both are worth adding to a project that needs them, and
  neither earns its setup cost in an empty one.
- **No Emotion or styled-components.** That was one project's choice, never a standard.
- **No `*Utils` filename suffix in a generated project.** This workspace uses it and enforces it
  on its own `src/utils/` directories, and that stops at the workspace edge. `repo-structure.*.md`
  already puts every shared helper inside a folder named `utils/`, at `lib/utils/` or beside the
  one page that needs it, so the import site reads `./utils/format` and the suffix would make it
  `./utils/formatUtils` for no information gained. Every other entry in the emitted `naming` map
  answers a question the tooling asks: PascalCase for components, camelCase for modules, a spec
  matching the file it tests. This one answers a question of taste, and by the Emotion line above,
  one project's choice is not a standard.
- **A layer never weakens `base`.** Framework layers add rules for their framework. Every
  exemption that survives carries a measurement showing the tooling forced it: a plugin
  double-reporting one defect, a framework owning a filename. "It would be noisy otherwise" is
  not a reason.
- **No forked extension framework.** The `webextension` target is `create-vite --template
  vanilla-ts` plus a manifest, a service worker and `@crxjs/vite-plugin`, which reads the manifest
  and builds each surface the way the browser loads it. WXT and `vite-plugin-web-extension` both
  work, and both bring a project layout of their own that would sit on top of the one
  `repo-structure.webextension.md` describes. The manifest ships with empty `permissions` and
  `host_permissions`: those are the project's security surface, and a template guessing at them is
  how an extension ends up asking for more than it uses.
- **No bespoke React Native ESLint layer.** The target composes `framework: 'react'`, because it
  is React. `eslint-plugin-react-native` peers at `eslint ^9` and would cap `@linteljs/eslint-config`,
  which peers `>=9` and develops on 10. `eslint-config-expo` bundles its own `@typescript-eslint`,
  `eslint-plugin-import`, `eslint-plugin-react` and `react-hooks`, every one colliding with a layer
  `base()` already registers, and undoing that is the thirty lines `next()` carries. What is given
  up is the RN-only style rules (`no-inline-styles`, `no-raw-text`); what is kept is one ESLint
  major and no plugin fighting `base()`.
- **Vitest for React Native too.** One runner across all eight targets, so `testing` is a yes or
  no rather than a choice of runner. It ran on `jest-expo` first, and that reached 71% coverage
  and stopped: three of the template's modules exist only as `.web`, a native run never loads
  them, and jest-expo's own web project does not survive Reanimated's web build. Two vitest
  projects with different `resolve.extensions` do load both, and `babel-preset-expo` is out of the
  path, so `Platform.OS` and `process.env.EXPO_OS` stay runtime reads instead of literals baked in
  at transform time. That is the difference between 71% and 100%.

  The cost is `@srsholmes/vitest-react-native`, at 0.1.x and one maintainer, in the path of the
  gate. It is derived from work by a Vitest maintainer and has CI, and the alternative was a
  target that cannot meet the bar the other seven do. Revisit if it goes unmaintained: the way
  back is `jest-expo` and a lower ceiling, not a lower threshold.
- **No bundler choice for Next.** `create-next-app` made Turbopack unconditional and dropped the
  flag that declined it; `--rspack` is the one alternative. Neither is passed. A generated project
  takes the framework's default, which is the same position every other target is in.

## Targets

Eight: React, Next.js, Vue, Svelte, Solid, Angular, React Native through Expo, and a Manifest V3
browser extension, for which `compatlens` is the reference.

## Project structure

The shape every generated project gets, and the reasoning the per-target
`repo-structure.*.md` files do not carry.

```
src/
  config/                constants, envVars.ts
  typings/               ambient .d.ts only
  assets/  styles/
  components/
    ui/                  primitives
    features/            reusable domain features
  lib/
    store/               universal
    utils/               universal
    services/            domain logic, may never touch HTTP
    providers/           context / DI providers
    apis/                Zod only
    hooks/               conditional, framework-named
  <route unit>/          framework-owned
```

`partials/` is a private slot, allowed inside any page or feature folder, never nested.

`services/` and `apis/` are distinct: `apis/` holds endpoint definitions and Zod
request/response schemas, `services/` holds domain logic with no HTTP dependency.

`src/components/{ui,features}/` applies to every target including the extension, where a
component is a DOM-building module or a custom element rather than a framework component.

### Per framework

| target | route unit | hooks slot | notes |
| --- | --- | --- | --- |
| React | `src/pages/<kebab>/{Name}Page.tsx` | `lib/hooks/` `use*` | closest to the spine |
| Next.js | `src/app/` | `lib/hooks/` `use*` | adds `lib/server/` for `server-only` modules and `src/content/` for static data. No `src/pages/`, which is the dead Pages Router |
| Vue | `src/views/` | `lib/composables/` | with the store answer, `lib/store/` holds Pinia stores, overriding the `src/stores` convention |
| Svelte | `src/routes/` | `lib/hooks/` | `$lib` already points at `src/lib`. SvelteKit's reserved `src/hooks.server.ts` sits at `src/` root, so no clash. Components stay at `src/components/` |
| Solid | `src/pages/` | `lib/primitives/` `create*` | not hooks, because the `use` prefix is wrong in Solid |
| Angular | `src/app/` | `lib/services/`, DI replaces hooks | `src/config/` replaces `src/environments/` |
| React Native (Expo) | `src/app/`, owned by expo-router | `src/hooks/` `use*` | `starterRenames` moves the template's kebab-case components onto the shared convention. Vitest, per the non-goal above. There is CSS: `src/global.css` and one module |
| Web Extension (MV3) | `manifest.json`, which declares every surface | `lib/` directly | `index.html` is the popup; `src/background/` holds the service worker. `src/content-scripts/`, `src/devtools/`, `src/panel/` as surfaces are added; `lib/model/` for domain entities. No `lib/store/` or `lib/providers/`, so neither is aliased |

Extension entry HTML stays flat at the repo root, because the browser resolves `devtools_page` and
panel pages against the extension root, so a nested entry breaks the moment it moves.

### The state store answer

One yes/no question, default no: a fresh project earns a state library the day component state
stops being enough. It is asked only where a choice exists, carried as the `store` slot on the
target record, and a yes lands through one mechanism per target rather than a `switch` in an
emitter:

- **React, Next.js and React Native install Zustand** (`^5.0.14`), the React family's standalone
  store: 49.7M weekly downloads against `@reduxjs/toolkit`'s 26.2M, measured 2026-08-06.
- **Vue passes `--pinia` to `create-vue`**, which installs Pinia itself. The demo-store repair and
  its starter test both gate on the file existing, so a no leaves nothing behind, and the shipped
  `App.test.ts` touches no store so it serves both answers.
- **Angular installs `@ngrx/signals`**; the decision is measured below.
- **Solid and Svelte are not asked.** The store is the framework's own, `createStore` from
  `solid-js/store` and a `$state` rune in a `.svelte.ts` module (`svelte/store` remains for
  interop), so there is no dependency to choose and a question would change nothing. The
  repo-structure heads name the built-in instead.
- **The extension target is not asked** for one reason: an MV3 service worker is torn down between
  events, so in-memory store state dies with it and real state belongs in `chrome.storage`. Its
  layout has no `lib/store/` and never aliased `@store/*`.

The `@store/*` alias stays unconditional everywhere else, whatever the answer: like every alias in
the spine it names where cross-cutting state goes, and the directory appears with the first file
written into it.

#### Angular: `@ngrx/signals` over classic `@ngrx/store`

Measured 2026-08-06 to 2026-08-08:

- Both live in the NgRx monorepo on one release train (both published 21.1.1 the same day, both
  sit at 22.0.0-rc.0), so maintenance and Angular-major tracking separate nothing.
- npm activity: `@ngrx/store` at 981k weekly downloads, `@ngrx/signals` at 519k. The classic
  store's lead is a decade of installed base; SignalStore reached half of it in under three years.
- The model decides it. `ng new` on Angular 22 writes a standalone, signal-first app, and
  SignalStore is the NgRx API built for that model; the classic store's
  actions/reducers/effects/selectors is the RxJS-era shape, and ngrx.io's own signals guide is
  what positions SignalStore for signal-based apps.
- Version: NgRx stable (21.1.1) peers `@angular/core ^21.0.0` and does not admit the Angular 22
  that `@angular/cli@latest` scaffolds; `22.0.0-rc.0` peers `^22.0.0`. The shipped range is
  `^22.0.0-rc.0`, which resolves today and admits every stable 22.x the day it lands, so it
  self-heals on install. Both candidates sit in the same position here, so this chose the range,
  not the package.

### File naming

The policy is `packages/create/src/model/naming/naming.ts`, one entry per target. Every glob was
measured at authoring time against `micromatch@4.0.8`, which is what `check-file` matches with;
`naming.test.ts` pins the exact strings, and the end-to-end suite is what re-verifies match
behaviour against real scaffolds, so an edited glob needs a fresh probe before it lands. What
the globs cannot say for themselves:

- **A component file is anything but camelCase.** The rule is negative because the research came
  back empty: React, Solid and Svelte bind every naming rule to the identifier, never the file,
  so there is no upstream mandate to encode, and every file-based router owns spellings no
  positive convention accepts (`page`, `_layout`, `+page@(app)`, `[slug]`, `(tabs)`, `{-$id}`).
  A negative rule admits all of them without a router-sigil grammar, and still rejects the one
  thing the decision bans: a camelCase component.
- **Tests and specs carry no filename key; declarations carry their own.** A test mirrors its
  subject, the subject is already policed, and `check-file` applies every matching key rather
  than the most specific, so `App.test.ts` beside `App.vue` caught by the camelCase script rule
  could satisfy nothing. `.d.ts` files are excluded from the script key for the same
  double-keying reason (`src/**/*.ts` matches `vite-env.d.ts`) and get their own kebab-or-camel
  key instead.
- **A route directory is exempt from the script rule only.** `+page.server.ts` and
  `opengraph-image.ts` are the framework's names and not camelCase; the component rule needs no
  exemption anywhere because router spellings already pass it.
- **Angular is kebab-case, files and folders.** The 2025 style guide spells filenames with
  hyphens, it is the CLI default, and `ng generate` writes it: `UserProfile` lives in
  `user-profile.ts`. One key with no exclusions, because `app.spec.ts` and `app.config.ts`
  reduce to `app` under `ignoreMiddleExtensions`, which is already kebab-case.
- **Router folder segments are granted, not excluded by path**, and only where the framework
  family has a file-based router today or may adopt one: the React family and SvelteKit.
- The policy enumerates what exists and iterates when a framework moves. No grammar for
  hypothetical future routers.

### `lib/apis/`, when Zod is selected

```
lib/apis/
  shared/
    api.ts              base client
    schemas.ts          ErrorSchema, envelope
    entity-schemas.ts   reusable entity shapes
    fields.ts           reusable field primitives
    validations.ts      message builders
  <domain>/<entity>/
    api.ts              typed error variants via ErrorSchema.extend({ errorCode: z.literal })
    schemas.ts          separate request and response schemas per endpoint
    index.ts
```

Request and response are separate schemas per endpoint, never one shape serving both directions.

## Renaming a generated agent file, and the orphan it leaves

`GENERATED_AGENT_TARGETS` is the closed list of exact paths `sync --force` may delete, and it is
also the only thing standing between a rename and a file nobody can remove. A path that leaves the
list stops being removable: it is no longer expected, so it is never written, and it is no longer
in the inventory, so it is never obsolete either. `sync` goes quiet about it and the project keeps
a file this CLI wrote and then forgot.

So a rename inside that inventory is two edits, not one: the new path replaces the old, and the old
path stays behind as a removable entry until every project that could hold it has synced. Renaming
`command-parser.js` to `commandParser.js` needed only the first, because it had never shipped.

## React Native `build`: `expo export --platform web`, and why it took a layout rule

`buildScripts` ends `check` on `pnpm build` for every target, and `build` is a leg the scaffolder
normally writes. `create-expo-app` writes none, because an Expo app ships through `eas build`,
which needs an account and a remote builder. The React Native record is therefore the one that
carries its own: `expo export --platform web`, a real Metro bundle of the app, with static
rendering of every route on top. This section is the measurement behind it; it replaces the open
defect that stood here.

The blocker was never the export command. It was that **six starter suites lived under
`src/app/`, and everything under the route root is a route**: expo-router's context regex
collects every `.ts`/`.tsx` and ignores only `+api`, `+middleware`, `+html` and
`+native-intent`. `getRoutesCore` does accept an `ignore` list, but the runtime reads its options
from `expo.extra.router` in `app.json`, and those regexes cannot survive JSON, so no generated
project can reach it. Measured on expo-router 57.0.11, both failures from one cause:

- `expo export --platform web`: bundles, then dies at static render on `expect is not defined`,
  which is a test suite executing its module scope as a page.
- `expo export --platform ios`: dies earlier, bundling `@testing-library/react-native` and its
  node-only helpers into the app graph, pulled in through `@mocks/renderScreen`. This was the
  failure a previous measurement left undiagnosed.

With the six suites out of `src/app/`, both platforms export clean, and the exported route list
is exactly `/`, `/explore`, `/_sitemap`, `/+not-found`.

So the layout rule, which the route suites in `model/targets/reactNative.ts` also carry: **no
test file under `src/app/`, ever.** The route suites sit directly in `src/` beside the directory
they cover, named for the route with the path flattened, `app-index.test.tsx` for
`src/app/index.tsx`. A test for the route unit sits beside the route unit the way a test for a
file sits beside the file; a `__tests__/` directory remains out, per the testing standard. Web is
the exported platform because it is the one that also proves static rendering; ios export was
measured green too, and `eas` remains the real shipping path.

One cosmetic seam remains: `@srsholmes/vitest-react-native@0.1.5` passes `hostComponentNames` to
`@testing-library/react-native`, whose v14 dropped the option and warns with a stack trace per
suite. Measured harmless, tests and coverage pass; the fix belongs upstream, and pinning back a
major to silence a warning is the wrong trade.

Do not change the record's `build` or move a test back under `src/app/` without running
`pnpm --filter @linteljs/create test:e2e -t react-native`. That command is the only thing that sees
any of this.

## Workspace lint exemptions

The measurements behind every block in the root `eslint.config.ts`. They live here rather than
inline because each is a paragraph and the config is a list of decisions, not an essay. Each block
there names the heading below that holds its reasoning. An exemption whose measurement is missing
from this section is an exemption to delete.

### Ignores

`dist/`, `coverage/`, `.smoke/`, `.compat/` and `reports/` are tool output. `.smoke/` exists only
while `pnpm smoke` is in flight, `.compat/` only during `pnpm compat`, which installs six ESLint
majors into it, and `reports/` is where `pnpm mutation` writes Stryker's HTML.

`__mocks__/fixtures/` is deliberately defective input for `eslint-config`'s own tests: an import
cycle, an unawaited promise, and an SFC pair. Linting them at the workspace level reports the exact
defect each one exists to trigger, and the `.vue` and `.svelte` pair cannot parse at all without
the layers those tests compose and the workspace config does not.

`assets/mocks/setupTests.angular.ts`, `assets/mocks/setupTests.reactNative.ts`,
`assets/mocks/renderScreen.tsx` and `assets/starter/**` are shipped source, copied to disk by
the CLI and never imported here. Each imports the framework it is written for, and none of those is
installed in this workspace, so every import is unresolvable and every call through one untyped.
They are data here and code only in a generated project, where that project's own `eslint .` judges
them against the same standard. The end-to-end suite is what proves it.

### `'**/utils/*.ts': '*Utils'`

`check-file` takes a raw glob as the naming pattern, not only one of its named cases: the rule
validates the value with `is-glob` and then micromatches the extension-stripped basename against it
directly (`eslint-plugin-check-file@3.3.2`, `filename-naming-convention`). So `*Utils` is a pattern,
and it and the `CAMEL_CASE` entry above it both apply, which is what makes `layoutUtils` the only
shape satisfying the pair.

Proven to fire, not assumed: `src/utils/stray.ts` reports `The filename "stray.ts" does not match
the "*Utils" pattern`, and the same file as `strayUtils.ts` exits 0. `ignoreMiddleExtensions` is on,
so `layoutUtils.test.ts` is judged on `layoutUtils`.

### `resolver: { project: 'packages/*/tsconfig.json' }`

The one place the default resolver cannot work it out for itself. It reads a single tsconfig
discovered from the working directory, which in a workspace is the root, and the root has no
`paths`. Each package's `@mocks/*` lives in its own tsconfig.

### `@linteljs/workspace/create-rings`

`model/` is what the user chose, `artifacts/` turns those answers into file text, `run/` is
everything touching disk, argv or a terminal. The direction only ever points inward. That already
held in the import graph before the rule existed: `artifacts/` reached into `answers`, `targets`,
`aliases` and `versions` twenty times and into `cli`, `pipeline`, `sync`, `prompts` and `rewrite`
never. The rule is what stops it quietly stopping.

A route around it through the barrel is not a third zone: `src/index.ts` re-exports from `run/`, so
an inner ring importing it is a cycle, which `import-x/no-cycle` in `base` already reports.

It lives in the workspace config rather than a layer because the ring names are this package's, not
the standard's. It is scoped to source: a test arranges and asserts across rings by nature, and
policing its imports protects nothing.

### `@linteljs/workspace/scripts`

`auditIgnores.js` prints every coverage ignore with its stated reason and `smoke.js` narrates a
pack, so stdout is their output rather than a debugging leftover. `no-console` already allows `warn`
and `error` everywhere, which covers reporting a failure.

It is here rather than in `base()`, where it used to sit as `no-console: 'off'` for `**/*.js`.
Nothing `@linteljs/create` emits logs at all: the only `console` calls it ships are `console.error`,
which `no-console` permits, so that block bought a generated project nothing while handing its
`eslint.config.js`, `stylelint.config.js` and the two `*.config.js` files it copies a free
`console.log`. Neither package publishes `scripts/`.

### `@linteljs/workspace/old-node-runner`

`scripts/runRules.cjs` is the file the `oldest-runtime` CI job runs inside `node:12-alpine`, and it
has to parse there before it can prove anything. Node 12 has no ESM for a `.js` file in a package
that does not say so, and this one is copied out of the package into a bare container directory, so
`require` is the only module system available to it. Written as ESM it fails at parse and the job
reports a syntax error instead of a rule result.

Scoped to that one file. Every other script in the workspace is ESM and stays that way.

### `@linteljs/workspace/ast-identity`

`sonarjs/different-types-comparison` cannot read an AST identity check. ESLint brands every node it
hands a rule: `Rule.Node` is `(Program & { parent: null }) | (Exclude<ESTree.Node, ESTree.Program> &
NodeParentExtension)`. A node reached through a field (`parent.callee`, `parent.object`,
`outer.parent.body`) carries the plain ESTree type instead, and sonarjs reads the intersection and
the union member as disjoint. So it calls `parent.callee === fn` impossible when that is the whole
question the rule is asking.

Measured, not asserted. Removing the block reports exactly six comparisons, and replacing those six
with `false`, the value sonarjs says they already have, fails 38 tests across 6 files. Both halves
are re-measured rather than inherited: the count was 31 when the suite was smaller, so treat the
number as a reading of the day it was taken and re-take it rather than trusting it. If it ever
reaches zero, the reports are right and the block is wrong. The files are named one by one rather
than by directory, so a seventh site has to be added on purpose.

### `@linteljs/workspace/rule-tester`

`RuleTester.run()` registers its cases at module scope, and `sonarjs/no-empty-test-file` looks for a
literal `it` or `test` call in the file. It finds none and calls the file empty. Measured: wrapping
`tsRuleTester.run(...)` in an explicit `describe(...)` does not silence it either, so there is no
shape of the file the rule accepts. The suite it calls empty is most of the tests in this workspace.

Scoped to the RuleTester directory alone. Every other test file in the repo is held to the rule.

### Coverage thresholds, in `vitest.config.ts`

A gate, not an aspiration. Without them `pnpm check` could not fail on coverage at all: the root
config carried none, and a package's own `vitest.config.ts` coverage block is ignored once the run
comes through `projects`.

One key per package rather than a single global block, because a glob key takes its files out of the
global thresholds, so a package dropped from the list would stop being gated without failing
anything. Named one by one, it has to be removed on purpose.
