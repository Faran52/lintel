import {
  type Answers,
  hasLibrary,
  type TargetId,
} from '../../model/answers/answers';
import { type PluginSpec, targetFor } from '../../model/targets';

// Emits `vite.config.ts` for the five Vite targets; Next, Angular and React Native own their own build. `resolve:
// { tsconfigPaths: true }` resolves the same alias list the ESLint config reads, so nothing is declared twice.

/**
 * Off for the test run: the React Compiler's memo cache and `vite-plugin-solid`'s HMR handler each leave one
 * permanently-uncovered branch in every component, putting 100% branch coverage out of reach otherwise. Uses
 * `process.env.VITEST` rather than `mode`, because `vitest.config.ts` merges this file as an object, and a
 * function config cannot be merged.
 */
const OUTSIDE_TESTS = 'process.env.VITEST === undefined';

// What each target contributes to `plugins`; the three non-Vite targets never reach this map (`emitViteConfig` returns
// first) but get an empty spec, not `null`, to avoid untestable branches.
const FRAMEWORK_PLUGINS: Record<TargetId, PluginSpec> = {
  'react': {
    imports: [
      "import react, { reactCompilerPreset } from '@vitejs/plugin-react';",
      "import babel from '@rolldown/plugin-babel';",
    ],
    // Without the compiler the memoisation it exists for never happens, and react-hooks lints against a compiler that
    // isn't running, so it runs for dev and build, not in tests.
    calls: [
      'react()',
      `...(${OUTSIDE_TESTS} ? [babel({ presets: [reactCompilerPreset()] })] : [])`,
    ],
  },
  'vue': { imports: ["import vue from '@vitejs/plugin-vue';"], calls: ['vue()'] },
  /**
   * `sveltekit()`, not `svelte()`: the kit plugin owns the entry too, routing through `src/routes/` and resolving
   * `$app`/`$lib`; the bare plugin fails `vite build` on a missing `index.html`.
   * The adapter argument matters because this file replaces `sv create`'s own config; dropping it leaves
   * `@sveltejs/adapter-auto` installed and unreferenced, and `pnpm build` printing "No adapter specified".
   */
  'svelte': {
    imports: [
      "import adapter from '@sveltejs/adapter-auto';",
      "import { sveltekit } from '@sveltejs/kit/vite';",
    ],
    calls: ['sveltekit({ adapter: adapter() })'],
  },
  'solid': {
    imports: ["import solid from 'vite-plugin-solid';"],
    calls: [`solid({ hot: ${OUTSIDE_TESTS} })`],
  },
  // Not a framework plugin, but the same slot: `crx` turns a vanilla build into an extension build by reading
  // `manifest.json`.
  'webextension': {
    imports: [
      "import { crx } from '@crxjs/vite-plugin';",
      "import manifest from './manifest.json';",
    ],
    calls: ['crx({ manifest })'],
  },
  'next': { imports: [], calls: [] },
  'angular': { imports: [], calls: [] },
  'react-native': { imports: [], calls: [] },
};

export const emitViteConfig = (answers: Answers): string | null => {
  if (!targetFor(answers.target).vite) {
    return null;
  }

  const framework = FRAMEWORK_PLUGINS[answers.target];
  const tailwind = hasLibrary(answers, 'tailwind');

  const imports = [
    "import { defineConfig } from 'vite';",
    ...framework.imports,
    ...(tailwind ? ["import tailwindcss from '@tailwindcss/vite';"] : []),
  ].join('\n');

  const calls = [
    ...framework.calls,
    ...(tailwind ? ['tailwindcss()'] : []),
  ];

  /**
   * One entry per line, like the vitest config beside it: React's compiler call plus tailwind joined is 128 characters,
   * over the emitted 120-char `max-len` with no fixer.
   * No empty-list case: every target here contributes at least one call, so `[]` is a branch no answer can produce.
   */
  const plugins = calls.map((call) => {
    return `    ${call},\n`;
  }).join('');

  return `${imports}

export default defineConfig({
  plugins: [
${plugins}  ],
  resolve: { tsconfigPaths: true },
  server: { port: 3000 },
});
`;
};
