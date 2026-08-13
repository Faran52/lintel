import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  type Answers,
  DEFAULT_ANSWERS,
  type HostedFramework,
  type Library,
  type TargetId,
} from '../../model/answers/answers';

import { emitAstroConfig } from './emitAstroConfig';

interface AnswerOverrides {
  target?: TargetId;
  hostedFramework?: HostedFramework;
  libraries?: Library[];
}

const answersFor = (overrides: AnswerOverrides = {}): Answers => {
  return { ...DEFAULT_ANSWERS, target: 'astro', ...overrides };
};

describe('emitAstroConfig', () => {
  // The same shape `emitViteConfig` uses for the targets that own no vite config.
  it('writes nothing for a target that is not astro', () => {
    expect(emitAstroConfig(answersFor({ target: 'react' }))).toBeNull();
    expect(emitAstroConfig(answersFor({ target: 'webextension' }))).toBeNull();
  });

  it('writes a bare config for a site that hosts nothing and takes no library', () => {
    expect(emitAstroConfig(answersFor())).toBe(
      "import { defineConfig } from 'astro/config';\n\nexport default defineConfig({\n});\n",
    );
  });

  // One integration per hosted framework, by Astro's own package names.
  it.each<[HostedFramework, string, string]>([
    ['react', '@astrojs/react', 'react()'],
    ['vue', '@astrojs/vue', 'vue()'],
    ['svelte', '@astrojs/svelte', 'svelte()'],
    ['solid', '@astrojs/solid-js', 'solid()'],
  ])('registers the %s integration', (hostedFramework, specifier, call) => {
    const output = emitAstroConfig(answersFor({ hostedFramework }));

    expect(output).toContain(`from '${specifier}';`);
    expect(output).toContain(`integrations: [${call}],`);
  });

  /**
   * Tailwind arrives as a Vite plugin, not an Astro integration: `@astrojs/tailwind` was for Tailwind 3, and 4 ships
   * `@tailwindcss/vite`. This file's `vite` key is the only route Vite options have into an Astro build.
   */
  it('passes tailwind through the vite key rather than as an integration', () => {
    const output = emitAstroConfig(answersFor({ libraries: ['tailwind'] }));

    expect(output).toContain("import tailwindcss from '@tailwindcss/vite';");
    expect(output).toContain('vite: { plugins: [tailwindcss()] },');
    expect(output).not.toContain('integrations');
  });

  it('carries both where a site hosts a framework and takes tailwind', () => {
    const output = emitAstroConfig(answersFor({ hostedFramework: 'react', libraries: ['tailwind'] }));

    expect(output).toContain('integrations: [react()],');
    expect(output).toContain('vite: { plugins: [tailwindcss()] },');
  });
});
