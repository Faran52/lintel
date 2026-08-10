import { join } from 'node:path';

import { ruleIdsForFile } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import base from './base';
import typescript from './typescript';

// `fixtures/typed/` carries its own `tsconfig.json`, so `projectService` resolves without the workspace config.
const TYPED_FILE = join(import.meta.dirname, '../__mocks__/fixtures/typed/floating.ts');

// `base.test.ts` cannot cover this: it lints `base()` alone, which never composes
// `strictTypeChecked`, so the rule `base()` switches off is never switched back on there.
const UNUSED_FILE = join(import.meta.dirname, '../__mocks__/fixtures/typed/unused.ts');

// An asset `require` beside a module `require`, so the allowance can be told from the rule.
const REQUIRES_FILE = join(import.meta.dirname, '../__mocks__/fixtures/typed/requires.ts');

describe('typescript', () => {
  it('reports a floating promise, which needs type information to see', async () => {
    await expect(ruleIdsForFile([...base(), ...typescript()], TYPED_FILE))
      .resolves.toContain('@typescript-eslint/no-floating-promises');
  });

  // `strictTypeChecked` inside `typescript()` turns `@typescript-eslint/no-unused-vars` back on after `base()`
  // stood it down, so that layer switches it off again at its tail: deleting that block doubles every finding.
  it('leaves one owner for unused code once the typed layer is composed', async () => {
    const ruleIds = await ruleIdsForFile([...base(), ...typescript()], UNUSED_FILE);

    expect(ruleIds).toContain('unused-imports/no-unused-imports');
    expect(ruleIds).toContain('unused-imports/no-unused-vars');
    expect(ruleIds).not.toContain('@typescript-eslint/no-unused-vars');
    expect(ruleIds).not.toContain('sonarjs/unused-import');
    expect(ruleIds).not.toContain('no-unused-vars');
  });

  // React Native's template names eleven assets this way and `expo/types` declares none, so the ESM form fails
  // to compile. Allowing the extension is not switching the rule off, which the second assertion below checks.
  it('permits a require of a bundler asset while still reporting a require of a module', async () => {
    const ruleIds = await ruleIdsForFile([...base(), ...typescript()], REQUIRES_FILE);
    const reported = ruleIds.filter((ruleId) => {
      return ruleId === '@typescript-eslint/no-require-imports';
    });

    expect(reported).toHaveLength(1);
  });
});
