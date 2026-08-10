import { join } from 'node:path';

import {
  ruleIdsFor,
  ruleIdsForFile,
  SFC_FIXTURES,
  startsWith,
} from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import base from '../base';

import svelte from './svelte';

const FILENAME_RULE = 'check-file/filename-naming-convention';

describe('svelte', () => {
  // Composed with `base()`, which registers the `import-x` plugin the layer configures to
  // ignore SvelteKit's `$`-prefixed virtual modules.
  it('parses a component and reports on it', async () => {
    const ruleIds = await ruleIdsForFile([...base(), ...svelte()], join(SFC_FIXTURES, 'Page.svelte'));

    expect(ruleIds).not.toContain(null);
    expect(ruleIds.some(startsWith('svelte/'))).toBe(true);
  });

  /**
   * `reserved` proves the exemption load-bearing: a name the convention accepts must be `false` here, keeping
   * the glob no wider than what SvelteKit owns. `.svelte` route files are absent because `projectService: true`
   * throws on a path with no file behind it; the end-to-end suite covers them instead.
   */
  it.each([
    ['src/routes/+page.ts', true],
    ['src/routes/+page.server.ts', true],
    ['src/routes/+server.ts', true],
    ['src/hooks.server.ts', false],
    ['src/service-worker.ts', true],
    ['src/params/integer.ts', false],
    ['src/app.ts', false],
  ])('holds check-file off %s only where the convention rejects it', async (path, reserved) => {
    const naming = { 'src/**/!(*.test|*.spec).ts': 'CAMEL_CASE' } as const;
    const code = 'export const value = 1;\n';

    const unexempted = await ruleIdsFor(base({ naming }), code, path);
    const exempted = await ruleIdsFor([...base({ naming }), ...svelte()], code, path);

    expect(unexempted.includes(FILENAME_RULE)).toBe(reserved);
    expect(exempted).not.toContain(FILENAME_RULE);
  });
});
