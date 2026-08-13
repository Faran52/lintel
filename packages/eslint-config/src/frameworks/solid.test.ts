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

  // Solid renders JSX too, and `eslint-plugin-solid` carries no accessibility rules of its own.
  it('reports an image with no alt text', async () => {
    const code = 'export const Logo = () => {\n  return <img src="/a.png" />;\n};\n';
    const ruleIds = await ruleIdsFor([...base(), ...solid()], code, 'src/Logo.tsx');

    expect(ruleIds).toContain('jsx-a11y/alt-text');
  });
});
