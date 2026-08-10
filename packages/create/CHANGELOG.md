# Changelog

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
