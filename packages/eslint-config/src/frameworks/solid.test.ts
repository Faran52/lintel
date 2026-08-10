import { ruleIdsFor, startsWith } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import base from '../base';

import solid from './solid';

describe('solid', () => {
  it('reports destructured props, which break reactivity in Solid', async () => {
    const code = 'export const Note = (props) => {\n  const { a } = props;\n\n  return <div>{a}</div>;\n};\n';
    const ruleIds = await ruleIdsFor([...base(), ...solid()], code, 'src/pages/Note.tsx');

    expect(ruleIds.some(startsWith('solid/'))).toBe(true);
  });
});
