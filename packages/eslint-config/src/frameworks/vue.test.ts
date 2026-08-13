import { join } from 'node:path';

import {
  messagesForFile,
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

  /**
   * `eslint-plugin-vue` ships no accessibility rule, so this is the only thing standing between a template and an
   * unlabelled control. Asserted as real findings on a real template rather than as config: the preset brings its own
   * parser, and the thing worth pinning is that ours still wins and both still report.
   */
  it('reports accessibility findings on a template', async () => {
    const layer = [...base(), ...typescript(), ...vue()];
    const ruleIds = await ruleIdsForFile(layer, join(SFC_FIXTURES, 'Inaccessible.vue'));

    expect(ruleIds).toContain('vuejs-accessibility/alt-text');
    expect(ruleIds).toContain('vuejs-accessibility/click-events-have-key-events');
  });

  // A parse error carries no rule id, so this is what proves the a11y preset's own parser did not displace ours.
  it('still types a script block with the a11y preset in the layer', async () => {
    const layer = [...base(), ...typescript(), ...vue()];
    const messages = await messagesForFile(layer, join(SFC_FIXTURES, 'Inaccessible.vue'));

    expect(messages.filter((message) => {
      return message.fatal === true;
    })).toEqual([]);
  });

  // `base` lists `@linteljs/union-newline` even though the plugin's `recommended` enables it, because the preset
  // scopes it to `**\/*.{ts,tsx,mts,cts}` and a `<script lang="ts">` is none of those: a widening, not a restatement.
  it('reaches TypeScript inside a script block with the base rules the preset scopes to .ts', async () => {
    const layer = [...base(), ...typescript(), ...vue()];
    const ruleIds = await ruleIdsForFile(layer, join(SFC_FIXTURES, 'ScriptUnion.vue'));

    expect(ruleIds).toContain('@linteljs/union-newline');
  });
});
