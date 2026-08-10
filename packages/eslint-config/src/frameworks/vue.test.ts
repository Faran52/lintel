import { join } from 'node:path';

import {
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
import typescript from '../typescript';

import vue from './vue';

describe('vue', () => {
  it('parses a single-file component and reports on its template', async () => {
    const ruleIds = await ruleIdsForFile(vue(), join(SFC_FIXTURES, 'Home.vue'));

    expect(ruleIds).not.toContain(null);
    expect(ruleIds.some(startsWith('vue/'))).toBe(true);
  });

  // `base` lists `@linteljs/union-newline` even though the plugin's `recommended` enables it, because the preset
  // scopes it to `**\/*.{ts,tsx,mts,cts}` and a `<script lang="ts">` is none of those: a widening, not a restatement.
  it('reaches TypeScript inside a script block with the base rules the preset scopes to .ts', async () => {
    const layer = [...base(), ...typescript(), ...vue()];
    const ruleIds = await ruleIdsForFile(layer, join(SFC_FIXTURES, 'ScriptUnion.vue'));

    expect(ruleIds).toContain('@linteljs/union-newline');
  });
});
