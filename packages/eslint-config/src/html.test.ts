import { ruleIdsFor } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import base from './base';
import html from './html';
import typescript from './typescript';

const NO_ALT = '<!doctype html>\n<html lang="en">\n  <body><img src="a.png"></body>\n</html>\n';

describe('html', () => {
  it('reports an img with no alt', async () => {
    await expect(ruleIdsFor(html(), NO_ALT, 'index.html'))
      .resolves.toContain('@html-eslint/require-img-alt');
  });

  it('says nothing about a TypeScript file', async () => {
    const ruleIds = await ruleIdsFor(html(), 'export const value = 1;\n', 'src/lib/utils/sample.ts');

    expect(ruleIds.filter(Boolean)).toEqual([]);
  });

  // Without `**\/*.html` in typescript()'s untyped tail, `index.html` throws "you have used a
  // rule which requires type information" once composed with the type-aware layer.
  it('survives composition with the type-aware layer', async () => {
    await expect(ruleIdsFor([...base(), ...typescript(), ...html()], NO_ALT, 'index.html'))
      .resolves.toContain('@html-eslint/require-img-alt');
  });
});
