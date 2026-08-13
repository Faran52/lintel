import { hasLibrary } from '../../model/answers/answers';
import { targetFor } from '../../model/targets';

import type { Answers, HostedFramework } from '../../model/answers/answers';

/**
 * Emits `astro.config.mjs`, which is where an Astro project's build lives: there is no `vite.config.ts`, and Vite
 * options reach Vite through this file's `vite` key. `.mjs` because that is the name `astro check` and the CLI look for
 * first, and a generated project is `type: module` either way, so the extension is upstream's convention rather than a
 * statement about module format.
 *
 * Returns null for every target that is not Astro, the way `emitViteConfig` returns null for the three that own no
 * Vite config.
 */

// The import and call for the integration that renders a hosted framework's components.
const INTEGRATIONS: Record<HostedFramework, { specifier: string; call: string }> = {
  react: { specifier: '@astrojs/react', call: 'react()' },
  vue: { specifier: '@astrojs/vue', call: 'vue()' },
  svelte: { specifier: '@astrojs/svelte', call: 'svelte()' },
  solid: { specifier: '@astrojs/solid-js', call: 'solid()' },
};

const BINDING: Record<HostedFramework, string> = {
  react: 'react',
  vue: 'vue',
  svelte: 'svelte',
  solid: 'solid',
};

export const emitAstroConfig = (answers: Answers): string | null => {
  if (targetFor(answers).astro !== true) {
    return null;
  }

  const framework = answers.hostedFramework;
  const tailwind = hasLibrary(answers, 'tailwind');

  const imports = [
    "import { defineConfig } from 'astro/config';",
    ...(framework === undefined
      ? []
      : [`import ${BINDING[framework]} from '${INTEGRATIONS[framework].specifier}';`]),
    ...(tailwind ? ["import tailwindcss from '@tailwindcss/vite';"] : []),
  ].join('\n');

  const integrations = framework === undefined
    ? ''
    : `  integrations: [${INTEGRATIONS[framework].call}],\n`;

  /**
   * Tailwind reaches Astro as a Vite plugin, not an Astro integration: the `@astrojs/tailwind` integration was for
   * Tailwind 3, and version 4 ships `@tailwindcss/vite` instead.
   */
  const vite = tailwind ? '  vite: { plugins: [tailwindcss()] },\n' : '';

  return `${imports}

export default defineConfig({
${integrations}${vite}});
`;
};
