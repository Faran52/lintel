---
paths:
  - "**/*.{test,spec}.{ts,tsx}"
  - "__mocks__/**/*"
  - "vitest.config.ts"
---

# Testing Rules

Use these rules when touching tests, mocks, or test setup.

## Infrastructure

- **Vitest, the same runner as every other target.** React Native ships untranspiled source
  inside `node_modules`, so a runner has to strip the Flow types before it can load any of it;
  `@srsholmes/vitest-react-native` is the plugin that does, and it stands in for the native
  modules underneath.
- **Two projects, native and web.** A module with a `.web` variant is resolved differently on each
  platform, so a single run loads one and never executes the other. `vitest.config.ts` declares a
  project per platform, and a suite against the web variant takes that variant's name:
  `AnimatedIcon.web.tsx` is pinned by `AnimatedIcon.web.test.tsx`, and only the web project picks
  it up. A test written against the native implementation fails when the web variant resolves under
  it, which is why the two run different files rather than the same ones twice.
- React Native Testing Library. Query by what a user or a screen reader reaches: `getByRole`,
  `getByLabelText`, `getByText`. Never by `testID` where a role or a label exists.
- Test globals are available without import. Do not mix bare and imported styles in one file.
- `__mocks__/setupTests.ts` is the run's `setupFiles`, wired from `vitest.config.ts`. It carries
  the stand-ins for the native modules the template imports: nothing native runs under a unit
  test, so each of those throws at import time rather than returning something wrong.
- Coverage is 100% on statements, branches, functions and lines, the same bar every other target
  carries. `vitest.config.ts` holds the thresholds; never lower one to make a run pass.

## What a component test asserts

- What renders, and what a press changes. A screen is a function of props and state, so a test
  drives it the way a person does and reads back what appears.
- Never assert on a `StyleSheet` object or a resolved style value. If the only difference a prop
  makes is a style, there is nothing to test; say so and skip it.
- Navigation is a boundary: assert that the route changed, not that a navigator internal was
  called with a shape.
