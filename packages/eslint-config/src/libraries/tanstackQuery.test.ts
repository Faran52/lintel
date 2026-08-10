import { ruleIdsFor, startsWith } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import react from '../frameworks/react';

import tanstackQuery from './tanstackQuery';

describe('tanstackQuery', () => {
  it('reports a query key missing a dependency', async () => {
    const code = [
      "import { useQuery } from '@tanstack/react-query';",
      '',
      'export const useThing = (id) => {',
      '  return useQuery({ queryKey: [\'thing\'], queryFn: () => fetch(`/thing/${id}`) });',
      '};',
      '',
    ].join('\n');
    const ruleIds = await ruleIdsFor([...react(), ...tanstackQuery()], code, 'src/lib/hooks/useThing.ts');

    expect(ruleIds.some(startsWith('@tanstack/query/'))).toBe(true);
  });
});
