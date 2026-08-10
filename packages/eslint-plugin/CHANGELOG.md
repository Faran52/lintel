# Changelog

## 1.1.3

No change to this package. The three versions move together, so this carries the import-sort fix in
`@linteljs/eslint-config`.

## 1.1.2

No change to this package. The three versions move together, so this is 1.1.1 under the version its
release branch named.

## 1.1.1

The same code as 1.1.0. That version was published by hand to bootstrap npm trusted publishing,
which cannot be registered for a package that does not exist yet; this is the first release to go
out through the pipeline that will publish every version after it.

## 1.1.0

### Added

- `prefer-destructured-props`: requires a component's props to be destructured in the signature
  rather than read member by member. Detects components through `memo`/`forwardRef` wrapper
  chains, stays quiet on any whole-value use, on dynamic keys that cannot be destructured, and
  on hooks and helpers. No autofix on purpose: a signature rewrite is not safely automatable.
  Not in `recommended`; the React layer of `@linteljs/eslint-config` opts in. Verified on ESLint 5
  through 10 in the compat matrix.

## 1.0.4

### Added

- ESLint 5 support. The declared peer range always included ESLint 5, but the `.cjs` entry point
  landed in its YAML config branch and failed to load. The entry format now works on every
  supported major.
- `pnpm compat`: packs the tarball, installs ESLint 5 through 10 side by side, and checks that
  every major produces identical fixed output on a fixture that trips every recommended rule.

### Changed

- The CommonJS entry moved from `dist/index.cjs` to `dist/index.js`, with a `dist/package.json`
  marking the directory as CommonJS. Importing the package by name is unaffected.
- The bundle targets Node 12 to match the declared `engines.node >= 12`.

### Fixed

- Rules read `sourceCode`, `physicalFilename` and the scope helpers through a compat layer, so
  they work on ESLint majors before 8.40 instead of silently reporting nothing.
