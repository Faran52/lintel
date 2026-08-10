import {
  describe,
  expect,
  it,
} from 'vitest';

import { DEFAULT_ANSWERS } from '../answers/answers';

import { svelte } from './svelte';
import { tabsToSpaces } from './utils/targetUtils';

const transformFor = (path: string): (source: string) => string => {
  const fix = (svelte.starterFixes ?? []).find((entry) => {
    return entry.path === path;
  });

  if (fix?.transform === undefined) {
    throw new Error(`no transform for ${path}`);
  }

  return fix.transform;
};

describe('scaffold', () => {
  it('writes the exact argv for the default answers', () => {
    expect(svelte.scaffold('demo-app', DEFAULT_ANSWERS)).toEqual({
      kind: 'dlx',
      args: ['sv', 'create', 'demo-app', '--template', 'minimal', '--types', 'ts', '--no-add-ons', '--no-install'],
    });
  });
});

describe('starterFixes', () => {
  it('adds a title after %sveltekit.head% and strips the non-baseline text-scale meta', () => {
    const source = [
      '<html lang="en">',
      '\t<head>',
      '\t\t<meta name="text-scale" content="scale" />',
      '\t\t%sveltekit.head%',
      '\t</head>',
      '</html>',
      '',
    ].join('\n');

    const output = transformFor('src/app.html')(source);

    expect(output).toContain('<title>App</title>');
    expect(output).not.toContain('text-scale');
    // The inserted title line carries a literal tab of its own, so the composition only reads right
    // if tabsToSpaces runs over the whole replaced result, not just the generator's own indentation.
    expect(output).not.toContain('\t');
  });

  // `--types ts` above is what guarantees the `<script lang="ts">` this annotation needs; in a plain `<script>` it
  // would be a parse error, and there is no answer that produces one any more.
  it('types the props destructure', () => {
    const source = [
      '<script lang="ts">',
      '\tlet { children } = $props();',
      '</script>',
      '',
      '{@render children()}',
      '',
    ].join('\n');

    const output = transformFor('src/routes/+layout.svelte')(source);

    expect(output).toContain("import type { Snippet } from 'svelte';");
    expect(output).toContain('let { children }: { children: Snippet } = $props();');
    expect(output).not.toContain('\t');
  });

  it('wires the page fix straight to tabsToSpaces, with no transform of its own', () => {
    expect(transformFor('src/routes/+page.svelte')).toBe(tabsToSpaces);
  });
});
