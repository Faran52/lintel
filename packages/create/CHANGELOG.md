# Changelog

## 1.4.1

### Added

- **`ignores` in `lintel.config.json`.** The other half of the gap `aliases` closed in 1.4.0, found by
  migrating the third reference repo an hour later: `eslint.config.js` is emitted whole, so an ignore
  added there is gone on the next sync too.

  Deliberately not the place to name a build output. `base()` already ignores whatever `.gitignore`
  does, which covers every generated *directory* a project has by definition, and the migration
  confirmed that handled all but one entry. What is left is the case `.gitignore` cannot express: a
  generated file that is **committed**, which the repo in question has as a compat-data registry its
  CI regenerates and diffs. Nothing in `.gitignore` can name it, because the point of it is to be in
  git.

## 1.4.0

Four gaps three real migrations found, closed together rather than one per release.

### Added

- **`.github/workflows/ci.yml` is emitted.** Everything this CLI shipped was a gate that nothing ran:
  a project got `check`, the hooks and the whole lint surface, and no push exercised them. A
  reference repo renamed `check` and left its workflow calling the old name, so every push failed
  for two days while the project gated clean locally, and `sync` called it up to date because
  `.github/` was nobody's. The run command is derived from `buildScripts`, so the workflow cannot
  name a script `package.json` does not define. A project with more to run adds `deploy.yml` beside
  it; this file stays owned, which is what makes drift a `sync` diff instead of a red build.
- **`aliases` in `lintel.config.json`.** A project's own aliases, merged in after the standard set
  and reaching the ESLint config, the tsconfig paths and the import resolver together. `eslint.config.js`
  is emitted whole, so an alias added there was gone on the next sync, and a reference repo carrying
  nine of them could not adopt the standard at all.
- **`browsers` in `lintel.config.json`.** The stores a project packages for, which is more than one
  only where it ships to both. A second manifest is emitted per extra browser, named for it, because
  Chrome rejects `browser_specific_settings` and AMO requires the gecko id: the build makes one
  bundle and the packaging step swaps the manifest into it. Separate from `browser`, which still
  decides the background shape, the ambient types and the starter code.
- `workers/` is named in the extension's `repo-structure.md`, as the fourth realm beside the
  background, the content script and the page.

### Changed

- **`vite.config.ts`, `vitest.config.ts` and `astro.config.mjs` are birth-only.** What this CLI
  writes is a starting point every real project outgrows inside its first feature: one reference
  extension builds an IIFE bundle per content script plus a native messaging host, another builds a
  second mode for a preview page, and no answer reaches either shape. The emitted vitest excludes are
  the sharper half of it, naming `src/background/index.ts` and `src/typings/**`, which are this CLI's
  guesses at a layout rather than the entry points a project has.

  `preserve` alone was not enough, and the first attempt was wrong in a way the pipeline tests
  caught: a scaffolder writes its own `vite.config.ts` moments before stage 4, so preserving at birth
  handed a new project Vite's defaults instead of this standard's. `applyArtifact` now takes the
  freshness the pipeline already computes, which is exactly the question "is this directory
  scaffolder output". Nothing else changes, because no other preserved file exists yet at birth.

## 1.3.2

### Changed

- Three floors in `versions.ts` moved to what this workspace now installs: `@commitlint/cli` and
  `@commitlint/config-conventional` to `^21.2.2`, and `@eslint-react/eslint-plugin` to `^5.18.6`.
  The carets already admitted all three, so no generated project resolved differently; what changes
  is that the emitted `package.json` names the version the gate was actually run against. Nothing
  else in the table is behind: every other entry is either inside its own caret or held back on
  purpose, which is `typescript` at `~6.0.3` under the `typescript-eslint` peer ceiling,
  `@ngrx/signals` on the rc that peers Angular 22, and `@types/node` tracking the Node major in
  `engines`.

### Fixed

- **`sync` now applies the two merges, so a project that already exists gains what a release adds to
  them.** `.gitignore` and `pnpm-workspace.yaml` were written by a `create` pipeline stage rather than
  being artifacts, and `sync` only writes artifacts. The `peerDependencyRules` allowance shipped in
  1.2.0 therefore reached every new project and no existing one, despite that entry describing it as
  merged "so a project generated before this gains the block". Both are `merged` artifacts now, which
  is the shape `mergeStyleEntry` already used, so the two routes write the same set.

  Found by migrating a real project rather than by a test, and the test that codified the old
  behaviour is why it survived: it asserted neither file was an artifact, reading "a merge is the
  project's" from a list that already held a merge. It now asserts the opposite, and fails when either
  merge leaves the list.

## 1.3.1

### Changed

- The shipped agent rules carry what seventeen starter tests were carrying in comments. The
  `type-standards.md` this CLI ships says "No comments in test files. The test name carries the
  meaning", and its own starter tests did not hold to it. Four techniques became rules in
  `testing.react-native.md`, which is where they belonged: why `react-native` is proxied rather than
  spread, why a project's own re-export is the mock target, why `Platform.select` needs
  `resetModules` per platform, and why a `useSyncExternalStore` hook needs all three of its
  callbacks driven. That file also gains the test renderer's limits, and `testing.vue.md` gains the
  mount rule the Vue starter was demonstrating. A rule reaches every test a project writes; a
  comment reached one file.

  The rest folded into test names, which is what the standard asks for. No shipped starter test
  carries a comment now.
- `scripts/checkBannedPatterns.ts`, which every generated project receives, iterates with `for-of`
  rather than `forEach`. Same behaviour: the one place the callback used `return` to skip a line is
  now `continue`, which is what it always meant.

## 1.3.0

### Added

- The `webextension` target takes a **surfaces** answer, `popup`, `background` and `devtools-panel`,
  recorded as `surfaces`. It is the third axis on that one record, and it drives four things at once:
  what `manifest.json` names, which starter files exist, what the build needs a Rollup input for, and
  which entry shells the coverage gate excludes. Absent means the popup and background pair, which is
  the only shape this CLI wrote before the answer existed, so a `lintel.config.json` from then still
  describes its own project.

  It exists because a devtools-panel extension could not be expressed at all. The target assumed a
  background entry, wrote a starter for it, named it in the manifest and excluded it from coverage, so
  an extension that is only a devtools panel had no answer that described it.

  `manifest.json` is now emitted rather than copied from a template, since two axes reach it and a
  file per combination would be twelve templates holding one shape between them. It is still written
  at birth only and never re-synced. The two template files are gone, and so is the record's
  `birthTemplate` field, which nothing else used.

  The panel gets a Rollup input of its own, which is the part that is not obvious: `crx` derives its
  inputs from the manifest, and the manifest names the devtools *page*, whose only job is to call
  `devtools.panels.create` with the panel's URL at runtime. Checked against the crx documentation
  rather than assumed, and covered by an end-to-end case that builds both pages for real.

### Fixed

- A recorded answer that this CLI's own argv path did not know was dropped when replanning. `answersIn`
  rebuilds `Answers` field by field, deliberately, so an answer an older config carries cannot survive
  into a plan; the cost is that a new answer has to be listed there too, and `surfaces` was not, so
  `sync` on a devtools-panel project replanned it as a popup-and-background one. Only the end-to-end
  suite saw it. Now pinned by a test that reads the emitted `vite.config.ts` back.

## 1.2.0

### Added

- An **Astro** target, the ninth, scaffolded with `create astro --template minimal`. It hosts a UI framework through the
  same `hostedFramework` answer the extension target takes, from the same shared parts, so an island is React, Vue,
  Svelte or Solid and the integration (`@astrojs/react` and friends) comes with it. `astro.config.mjs` is emitted rather
  than `vite.config.ts`, because that file is where an Astro project's Vite options are read from, and Tailwind arrives
  through its `vite` key rather than as an integration, `@astrojs/tailwind` having been for Tailwind 3.

  Four things about it were found by running the scaffolder rather than by reading about it, and each is recorded beside
  the code: `esbuild` needs an `allowBuilds` entry or the first `pnpm install` aborts; the vitest config has to go
  through `getViteConfig` from `astro/config`, since there is no `vite.config.ts` to merge; that config needs a bare
  `import 'vitest/config'` for the type augmentation that makes `test` a legal key, without which `astro check` rejects
  it; and the minimal starter is one `.astro` page, so a fresh project had no measurable source and failed the coverage
  gate on `0/0` until a `lib/utils/` pair was shipped with it. That pair is also the smallest demonstration of the rule
  a template cannot teach: `.astro` files are not unit-testable, so logic belongs in `lib/`.

- The `webextension` target takes a **browser**, `chrome` or `firefox`, asked only for that target and
  recorded as `browser` in `lintel.config.json`. Firefox gets an event-page manifest with
  `browser_specific_settings.gecko`, `@types/firefox-webext-browser`, and `web-ext` with a `start`
  script that runs the build in a real Firefox. `crx` stays the bundler for both: its own manifest
  type carries both background forms, so the axis changes the manifest and the types and nothing
  else. A config written before this field defaults to `chrome`, which is what the target assumed.
  The background starter and its test come from the browser too: those types declare `browser.*` and
  no `chrome`, and Firefox's install-details type requires `temporary`, so neither file could be
  shared. An end-to-end run caught it, a Firefox project having shipped Chrome's entry and linted as
  three findings on a global its own types never declared.
- The `webextension` target optionally **hosts a UI framework**, `react`, `vue`, `svelte` or `solid`,
  recorded as `hostedFramework`. The framework's Vite plugin runs ahead of `crx`, its ESLint layer
  lints it, its component extension marks a component in place of the directory rule, and its runtime
  package and testing library are installed, since a vanilla scaffold has none of them. Absent means
  the plain-TypeScript extension that was the only shape before. This is what makes a Solid
  extension expressible; DESIGN.md carries the reasoning.
- `targets/utils/frameworkUtils.ts` holds what a UI framework contributes to a target that hosts one
  rather than is one, so the next host composes the same four frameworks without a second copy.
- The emitted `eslint.config.js` names `tailwindEntryPoint` when the tailwind library is answered, read from a new
  `styleEntry` on the target record: the stylesheet that target's own scaffolder writes and already wires. Verified
  against each published template rather than assumed, which is why Svelte has none: `sv create --template minimal`
  ships no stylesheet, so there is no path to name. See the `@linteljs/eslint-config` entry for what the setting buys.
- The emitted `pnpm-workspace.yaml` carries a `peerDependencyRules.allowedVersions` block for the plugins whose own
  `eslint` peer range closes before the major this CLI installs, so a generated project does not meet four warnings on
  its first install. Four qualify, checked against the installed ranges rather than assumed: `eslint-config-next`
  bundles `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `eslint-plugin-import`, all capped at 9 and all
  registered by the next layer, and the solid layer loads `eslint-plugin-solid`, capped the same way. A plugin stating
  an open range (`>=8.57.0`, `>=9.0.0`) needs nothing and is absent. Read off the dependencies a project installs, so
  an extension or Astro site hosting Solid is covered without naming the combination. Scoped with `>` so the allowance
  reaches only the dependent named, and merged rather than emitted, so a project generated before this gains the block
  while keeping its own `allowBuilds` list and any rule it widened by hand.

### Changed

- A Next project installs `@next/eslint-plugin-next` instead of `eslint-config-next`, following the layer that no longer
  wraps it, and `eslint-plugin-jsx-a11y` is installed by every target whose layers load it rather than by Next alone:
  React, Next and React Native through `react()`, Solid through `solid()`, and an extension hosting either. See the
  `@linteljs/eslint-config` entry. The emitted `peerDependencyRules` block changes with it: `eslint-plugin-react` and
  `eslint-plugin-import` are no longer in a generated project's tree, and the accessibility allowance now appears
  wherever that plugin does.
- A glob carrying a backslash is emitted as `String.raw`, so the folder-naming pattern in `eslint.config.js` reads as
  the pattern it is instead of a doubled copy of it. The escaping was correct either way; this stops the reader
  counting backslashes to work out which.
- `VERSIONS` moves forward to the current release of every entry that had one: `@analogjs/vite-plugin-angular`,
  `@eslint-react/eslint-plugin`, `@vitest/eslint-plugin`, `eslint`, `happy-dom`, `stylelint-config-recess-order` and
  `svelte-check`, plus the manager pins for pnpm, npm, yarn and bun. Four entries deliberately did not move, because
  the `latest` tag is the wrong answer for each: `@ngrx/signals` stays on the 22 rc, since stable 21 peers Angular 21
  while `ng new` writes 22; `@types/node` stays on 24, the LTS `engines.node` already requires; `yarn` stays on the 4
  line, since the `yarn` package's `latest` is still classic 1.x; and `typescript` stays on 6.0, below.
- `typescript` is `~6.0.3`, not `^6.0.3`. `typescript-eslint` peers `>=4.8.4 <6.1.0`, so a caret admits a 6.1 the
  type-aware layer would refuse the moment one publishes. `@linteljs/eslint-config` already pins the tilde in its own
  devDependencies, so this only makes a generated project agree with the layer it installs. The 6.x line ends at
  6.0.3 today (`latest` is already on 7), so it costs a project nothing now.

### Fixed

- **A site or extension hosting Vue could not be generated at all.** `@vitejs/plugin-vue` is on the hosted-Vue
  dependency list and had no entry in the version table, so `astro` and `webextension` hosting Vue threw before writing
  a file. No case reached that combination: the framework axis was exercised with Solid. The table has the entry, the
  composition test now runs over every combination of the browser and hosted-framework answers rather than the
  defaults, and the end-to-end suite has an `astro hosting vue` case.
- Svelte projects gate on accessibility. `svelte-check` now runs with `--fail-on-warnings`, because Svelte reports
  accessibility from the compiler as a warning and `svelte-check` exits 0 on warnings: an `<img>` with no `alt` printed
  `a11y_missing_attribute` and `pnpm check` passed. `eslint-plugin-svelte` v3 carries no accessibility rule to catch it
  instead, so without the flag the category was ungated. The flag also makes every other compiler warning count.
- Vue projects install `eslint-plugin-vuejs-accessibility`, which the `vue()` layer now loads. Without it the first
  `eslint .` in a generated Vue project would die on `ERR_MODULE_NOT_FOUND`.
- The `tailwind` answer now actually wires Tailwind. Installing `tailwindcss`, calling the Vite plugin,
  extending stylelint and enabling the ESLint layer generates nothing on its own: a utility class only
  exists because some CSS file imported the framework, and only `create-next-app --tailwind` wrote that
  line, so on the other seven targets Tailwind was configured and inert. Each target now names the
  stylesheet its own scaffolder writes and wires, verified against every published template, and the
  Tailwind import is merged into it. Svelte is the one that ships no stylesheet at all, so there
  `src/app.css` is created and imported from `src/routes/+layout.svelte`, SvelteKit having no
  convention that loads it.
- `vitest.config.ts` declares `resolve: { tsconfigPaths: true }` on the targets that have no
  `vite.config.ts` to merge, which is Next and Angular. The merge branch inherited it from the vite
  config and React Native's platform projects declare their own, so only the standalone branch went
  without, and every alias this CLI writes into `tsconfig.json` was unresolvable from a test there.
  A generated Next project could not import `@mocks/*` from a test at all, which is the alias the
  shipped test setup exists for. Measured on a real project: 27 of 36 suites failed on the import
  line, and all 36 pass after.
- `.agents/**` is ignored by the emitted `eslint.config.js`, the same as `.claude/**`. This CLI
  writes `.agents/plugins/marketplace.json` itself when the codex agent is answered, so the
  directory is one it knows about; ignoring the claude half and not the codex half failed a real
  project's `pnpm lint` on 82 findings in agent skill files that are not project source.

## 1.1.4

### Fixed

- `.claude/settings.json` is merged rather than emitted. A project keeps its own hooks, its own
  plugins and top-level keys this CLI has never heard of, while the plugins answer still decides
  `enabledPlugins` and `extraKnownMarketplaces`. A real project lost `includeCoAuthoredBy`, a
  PreToolUse hook and two unrelated plugins to one sync before this.
- `sync --force` and the repair pass wrote a generated file straight through `writeFile`, so a
  project with a symbolic link sitting where a generated file belongs got overwritten through it,
  silently taking out whatever the link pointed at. Only `create`'s own pipeline refused this,
  with `O_NOFOLLOW`. `sync`, `repair` and `rewrite` now share that same write, so every path that
  puts a generated file on disk refuses a symlink target the same way.
- `@types/node` is `^24.13.3`, the LTS the `engines` field already requires, rather than `^26`.
- `scripts/typecheckStaged.ts` reads its override by destructuring. Under the version above,
  `env['TYPECHECK_COMMAND']` reads as index-signature access to `dot-notation`, and the dot form it
  asks for is refused by a tsconfig setting `noPropertyAccessFromIndexSignature`.

### Changed

- The test setup is `__mocks__/setupTests.tsx` on React, Next and React Native, where a setup that
  renders anything needs JSX. Vue, Svelte, Angular, Solid and the extension target keep `.ts`. A
  project that already holds one spelling keeps it, config included: the emitted `vitest.config.ts`
  points at the file that is there rather than the one this version would write.
- The README leads with how to run the thing on any runner. It read as pnpm-only, because the
  first line was a bare `pnpm create` and the table of alternatives sat far below it. The target
  table now also says what it never did: each scaffolder is invoked through the package manager
  you answered with, so an npm project scaffolds through `npm create`.

## 1.1.3

No change to this package. The three versions move together, so this carries the import-sort fix in
`@linteljs/eslint-config`.

## 1.1.2

### Changed

- The README documents every way to launch the CLI rather than one, with both the `create`
  shorthand and the `dlx` form for pnpm, npm, Yarn 2+ and Bun. Yarn 1 is called out as the one that
  does not work: its `yarn create @scope` looks for a binary named `create`, and this package's is
  `create-linteljs`, so it installs and then fails to launch. Use `npx` there.

No change to the CLI itself.

## 1.1.1

The same code as 1.1.0. That version was published by hand to bootstrap npm trusted publishing,
which cannot be registered for a package that does not exist yet; this is the first release to go
out through the pipeline that will publish every version after it. Nothing in the package changed,
and the 1.1.0 entry below is the one to read.

## 1.1.0

### Added

- Answers are recorded in `lintel.config.json` at the project root, under a versioned schema, and
  are what `sync` and a second `--skip-scaffold` run read. It replaces the `lintel` field in
  `package.json`, which is no longer written.
- A `sync` command: re-emits what the recorded answers imply and reports each file as unchanged,
  changed, missing or obsolete, writing nothing until `--force`. A file that a changed answer made
  obsolete is removed rather than left behind.
- Two questions about coding agents: which ones the project is for (Claude Code, Codex, at least
  one) and which plugins to declare. Both hosts read one `plugins/linteljs/`, with a manifest each.
- A project name question, asked first and validated as npm would validate it. It is skipped when
  the name came in as an argument, and with `--skip-scaffold`, where the directory is already named.
- A state store answer, resolved per target: Zustand for React, Next.js and React Native,
  `@ngrx/signals` for Angular, and Pinia for Vue, whose `--pinia` flag now follows the answer
  instead of always being passed. Solid and Svelte are never asked: their stores ship inside the
  framework, and the repo-structure rules now say so.
- A Tailwind answer now also wires class linting: `eslint-plugin-better-tailwindcss` joins the
  toolchain and the emitted config loads the `tailwind` layer.
- The shipped test setup grew real content: TanStack Query test defaults when that library is
  chosen, and inert `useNavigate` stand-ins for react-router and TanStack Router on the targets
  that could adopt them. The file is preserved on sync, since projects add their own mocks to it.
- React Native projects get a real `build`: `expo export --platform web`, made possible by moving
  the route-directory starter tests out of `src/app/`, where expo-router treated them as routes.

### Changed

- The questionnaire is asked over `@clack/prompts`, this package's first runtime dependency: arrow
  keys and checkboxes rather than typed text, a hint on every option, and each product spelled the
  way its own documentation spells it. The state store question is a radio over the target's store
  plus None, and the agents question is a checkbox list requiring at least one.
- Ctrl+C during the questionnaire exits 130 having written nothing, and says so plainly. A run with
  no terminal at all is still refused, separately, with advice to pass `--yes`.
- TypeScript only. The language question is gone, every scaffolder is invoked with its TypeScript
  flags, and running against a project that recorded `typescript: false` refuses with a clear
  message rather than silently converting it.
- The filename policy was rebuilt per framework: components may be anything but camelCase, tests
  and specs follow the file they cover instead of carrying a rule of their own, declaration files
  take kebab-case or camelCase, Angular is kebab-case throughout, and router-owned directories
  are exempt from the script rule.
- The pre-commit hook pins its lint-staged config, so a nested config file can no longer hijack
  staged files in a monorepo.

## 1.0.4

First published release.

### Added

- Scaffold any of eight targets with the framework's own official generator, then apply the
  shared standard on top: ESLint config, tsconfig, stylelint, git hooks, test setup and agent
  rules. Targets: React, Next.js, Vue, Svelte, Solid, Angular, React Native through Expo, and
  Manifest V3 browser extensions.
- `@linteljs/create sync` re-applies the files that cannot arrive through an npm update. It shows a
  diff first and never overwrites a file you edited.
- A `typeSafety` answer that picks the banned-pattern floor: `strict` bans every escape hatch,
  while `relaxed` allows a double cast and `eslint-disable` and ships a `CustomTypes` helper for
  common payload shapes.
