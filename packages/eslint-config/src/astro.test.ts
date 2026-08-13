import { ruleIdsFor, startsWith } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import astro from './astro';
import base from './base';

const PAGE = (body: string): string => {
  return `---\nconst title = 'Home';\n---\n\n<h1>{title}</h1>\n${body}\n`;
};

describe('astro', () => {
  it('parses a template and reports an astro rule', async () => {
    // Two conflicting set directives: a recommended rule, and reaching it proves the template parser ran.
    const ruleIds = await ruleIdsFor(
      astro(),
      PAGE('<div set:html={title} set:text={title} />'),
      'src/pages/index.astro',
    );

    expect(ruleIds.some(startsWith('astro/'))).toBe(true);
  });

  /**
   * The accessibility floor `react()` and `solid()` give JSX, reaching Astro markup through the plugin that parses it.
   * The plugin re-exports them under its own namespace, so an Astro project gets them whether or not it hosts a
   * framework, and `eslint-plugin-jsx-a11y` needs no separate registration.
   */
  it('reports an image with no alt text in a template', async () => {
    const ruleIds = await ruleIdsFor(astro(), PAGE('<img src="/a.png" />'), 'src/pages/index.astro');

    expect(ruleIds).toContain('astro/jsx-a11y/alt-text');
  });

  // Scoped, because the plugin leaves its rule entries unglobbed: unscoped, every `.ts` file in the project would be
  // judged by rules about a template it does not contain.
  it('says nothing about a TypeScript file', async () => {
    const ruleIds = await ruleIdsFor(astro(), 'export const value = 1;\n', 'src/lib/utils/sample.ts');

    expect(ruleIds.filter(Boolean)).toEqual([]);
  });

  // Composed, not exclusive: an Astro project still gets the shared rules, which is the point of it being a file type.
  it('stacks under base without either losing its rules', async () => {
    const code = PAGE('<img src="/a.png" />');
    const ruleIds = await ruleIdsFor([...base(), ...astro()], code, 'src/pages/index.astro');

    expect(ruleIds).toContain('astro/jsx-a11y/alt-text');
  });
});
