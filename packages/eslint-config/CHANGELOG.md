# Changelog

## 1.1.3

### Fixed

- An alias declared bare (`'@engine': './src/engine'`, imported as `from '@engine'` with nothing
  after it) got no import-sort bucket. The pattern ended in `/`, which cannot match a bare
  specifier, so a project whose aliases are all barrels had every one of its own imports fall
  through to the node_modules bucket, silently and with lint green. The pattern now admits a slash
  or the end of the specifier. Type imports are unchanged: `simple-import-sort` appends a NUL to
  those, so they still land in the type group.
- The same alias declared twice, once bare and once with `/*`, no longer emits its pattern twice.

Emitted patterns change shape (`^@ui/` becomes `^@ui(?:/|$)`), so a project may find `eslint --fix`
wanting to reorder imports once after upgrading.

## 1.1.2

### Changed

- The README says how to extend the config, which it never did: adding a plugin this package does
  not ship, turning one of its rules off, and scoping an exemption to a path. Also the two things
  that bite first, both confirmed against a real ESLint rather than asserted: a plugin name already
  taken fails the entire config with `Cannot redefine plugin` when the object differs, and
  `eslint.config.js` is emitted rather than preserved, so `sync --force` overwrites edits made to it.

No change to the layers themselves.

## 1.1.1

The same code as 1.1.0. That version was published by hand to bootstrap npm trusted publishing,
which cannot be registered for a package that does not exist yet; this is the first release to go
out through the pipeline that will publish every version after it.

## 1.1.0

### Added

- A `tailwind` library layer on `eslint-plugin-better-tailwindcss`: class order, duplicates and
  conflicts as lint findings. `no-unknown-classes` stays off, since without a per-project
  `entryPoint` the rule cannot tell a custom CSS class from a typo.
- The React layer enables `@linteljs/prefer-destructured-props`, so props are destructured in the
  signature across the React family. Solid keeps the opposite rule its own plugin enforces.

### Fixed

- The naming block registers `check-file` itself, so a folder rule reaching an `.html` or `.css`
  no longer fails with an unresolvable plugin.
- A corrupt `react/package.json` now fails loudly during config construction instead of being
  read as "react is not installed" and crashing later inside `eslint-plugin-react`.

## 1.0.4

First published release.

### Added

- Flat-config layers composed through `defineConfig`, which owns the layer order so the Vue and
  Svelte parsers and `typescript-eslint` always nest correctly.
- One subpath export per layer. A project loads only the frameworks it asked for: a React project
  installs nothing for Vue, Svelte, Solid or Angular.
