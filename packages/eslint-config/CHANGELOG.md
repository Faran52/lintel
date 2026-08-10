# Changelog

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
