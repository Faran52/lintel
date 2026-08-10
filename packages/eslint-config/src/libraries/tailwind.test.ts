import { join } from 'node:path';

import { ruleIdsFor, startsWith } from '@mocks/lintText';
import {
  describe,
  expect,
  it,
} from 'vitest';

import base from '../base';
import react from '../frameworks/react';

import tailwind from './tailwind';

import type { Layer } from '../types';

// The plugin resolves `tailwindcss` from cwd, which is the repo root when the whole workspace
// runs; this pins it to the package that actually declares the devDependency.
const CWD_SETTINGS: Layer = [{
  settings: { 'better-tailwindcss': { cwd: join(import.meta.dirname, '../..') } },
}];

const layer = [...base(), ...react(), ...tailwind(), ...CWD_SETTINGS];

describe('tailwind', () => {
  it('reports a duplicate utility in a class string', async () => {
    const code = [
      'export const Card = () => {',
      '  return <div className="p-2 p-2">x</div>;',
      '};',
      '',
    ].join('\n');
    const ruleIds = await ruleIdsFor(layer, code, 'src/components/Card.tsx');

    expect(ruleIds).toContain('better-tailwindcss/no-duplicate-classes');
  });

  it('reports classes out of the enforced order', async () => {
    const code = [
      'export const Card = () => {',
      '  return <div className="text-sm flex">x</div>;',
      '};',
      '',
    ].join('\n');
    const ruleIds = await ruleIdsFor(layer, code, 'src/components/Card.tsx');

    expect(ruleIds).toContain('better-tailwindcss/enforce-consistent-class-order');
  });

  it('stays quiet on a clean class string', async () => {
    const code = [
      'export const Card = () => {',
      '  return <div className="flex p-2 text-sm">x</div>;',
      '};',
      '',
    ].join('\n');
    const ruleIds = await ruleIdsFor(layer, code, 'src/components/Card.tsx');

    expect(ruleIds.some(startsWith('better-tailwindcss/'))).toBe(false);
  });
});
