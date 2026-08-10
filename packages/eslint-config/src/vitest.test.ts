import { ruleIdsFor } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import base from './base';
import vitest from './vitest';

const FOCUSED = "import { it } from 'vitest';\n\nit.only('runs', () => {\n  expect(1).toBe(1);\n});\n";

describe('vitest', () => {
  const layer = [...base(), ...vitest()];

  it('reports a focused test', async () => {
    await expect(ruleIdsFor(layer, FOCUSED, 'src/lib/utils/sample.test.ts'))
      .resolves.toContain('vitest/no-focused-tests');
  });

  it('leaves a non-test file alone', async () => {
    await expect(ruleIdsFor(layer, FOCUSED, 'src/lib/utils/sample.ts'))
      .resolves.not.toContain('vitest/no-focused-tests');
  });
});
