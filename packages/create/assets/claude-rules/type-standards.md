# Type and Code Standards

Load before any type tracing, code authoring, or test work.

What ESLint already enforces is not repeated here. `@linteljs/eslint-config` owns line length, quote
style, brace style, import order, filename and folder case, unused imports, and arrow-function
style, because a second copy of those rules in prose only rots. This file carries what a linter cannot
see.

Nothing here is framework-specific. How props are read, and whether reading them a particular way
severs reactivity, is the framework's own rule file: this one shipped React's answer to every
target, and following it in Solid or Vue produces a component that renders once and then silently
stops updating.

## Components

- Arrow function expressions only, including a framework's default export. Never a `function`
  declaration.
- One component per file, named after the file. A container wrapping a presenter is two files.
- Name a component for what it renders, never generically (`Screen`, `DetailsView`, `Wrapper`).
- No `console` except `warn` and `error`.

## Types

- Never `any`, `unknown`, or `Record<string, unknown>`.
  - Carve-out: `unknown` only as the input of a narrowing type guard
    `(value: unknown): value is X` at a genuinely dynamic boundary with no upstream type: a
    caught error, a parsed JSON payload, a server-driven field bag. It must narrow before use. If
    an upstream type exists, type the input instead.
- **No casts to satisfy a type, anywhere, including tests.** No `as X`, no `as unknown as X`, no
  `as never`. A type you can only satisfy with a cast means the fixture or the design is wrong.
  Casting to a bare generic parameter (`as T`) inside the generic that declares it is exempt.
- No `@ts-ignore`, `@ts-expect-error` or `eslint-disable` to get past a type.
- Never assume a type. Trace it through its consumers and the actual data flow. If tracing takes
  more than a minute, ask.
- Object shapes get named `interface` or `type` declarations, placed after the imports. No inline
  object type literals. No index signature where a union of known keys works.
- A derived shape comes from its owner: `ReturnType`, `Parameters`, a schema's inferred type, the
  store's own state type. A hand-written duplicate of a shape that already exists is a lying type
  waiting to drift out from under its source.
- `noUncheckedIndexedAccess` is on, so index access is `T | undefined`. Handle it; do not cast it
  away. Two parallel arrays walked by one index are a smell the compiler is surfacing, so fold them
  into one record.
- No alias or back-compat re-exports of a type or value. Import the canonical definition from its
  home.

## Comments

- A comment says **why**: the constraint that forced the code, the measurement behind a constant,
  the bug a guard prevents. If it restates the code, delete it.
- `//` for one line; JSDoc only when the comment genuinely runs to more.
- No comments in test files. The test name carries the meaning.

## Tests

Load `testing.md` before touching tests, mocks or test setup.
