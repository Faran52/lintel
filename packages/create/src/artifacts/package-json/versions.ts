import type { PackageManager } from '../../model/answers/answers';

/**
 * Caret ranges, not pins, so a project picks up patch fixes on install; bump this file and nothing else. Two rules for
 * a new entry: the range must actually resolve (these tests assert on emitted text, never a registry), and a plugin
 * range must be at least what @linteljs/eslint-config declares in its own devDependencies.
 */
export const VERSIONS: Record<string, string> = {
  // Angular's only route onto vitest: it runs the real Angular compiler over the test graph.
  '@analogjs/vite-plugin-angular': '^2.6.4',
  '@babel/core': '^8.0.1',
  '@commitlint/cli': '^21.2.1',
  '@commitlint/config-conventional': '^21.2.0',
  // Reads manifest.json and builds every surface it names: what makes an extension build out of a vanilla one.
  '@crxjs/vite-plugin': '^2.7.1',
  '@eslint-react/eslint-plugin': '^5.18.2',
  '@html-eslint/eslint-plugin': '^0.64.0',
  '@html-eslint/parser': '^0.64.0',
  // NgRx stable (21.x) peers on Angular 21 while `ng new` writes Angular 22; the rc peers `^22.0.0`, and the caret
  // admits every stable 22.x the day it lands, so the range self-heals. Measurements in DESIGN.md.
  '@ngrx/signals': '^22.0.0-rc.0',
  '@rolldown/plugin-babel': '^0.2.3',
  '@solidjs/testing-library': '^0.8.10',
  // What lets vitest load React Native at all: strips the untranspiled Flow types and stands in for native modules.
  '@srsholmes/vitest-react-native': '^0.1.5',
  // The PostCSS half of the pair below, for a target with no vite.config.ts to call a plugin from; same release train,
  // so the two ranges move together.
  '@tailwindcss/postcss': '^4.3.3',
  '@tailwindcss/vite': '^4.3.3',
  '@tanstack/angular-query-experimental': '^5.101.4',
  '@tanstack/eslint-plugin-query': '^5.101.4',
  '@tanstack/react-query': '^5.101.4',
  '@tanstack/solid-query': '^5.101.4',
  // The svelte binding is the one that has moved to 6; the rest of the family is still on 5.
  '@tanstack/svelte-query': '^6.1.38',
  '@tanstack/vue-query': '^5.101.4',
  // An unbundled peer of the React binding, declared not inherited, or pnpm leaves the first render() unresolved.
  '@testing-library/dom': '^10.4.1',
  '@testing-library/react': '^16.3.2',
  '@testing-library/react-native': '^14.0.1',
  '@testing-library/svelte': '^5.4.2',
  '@types/babel__core': '^7.20.5',
  '@types/chrome': '^0.2.5',
  '@types/node': '^26.1.2',
  '@vitejs/plugin-react': '^6.0.5',
  '@vitest/coverage-v8': '^4.1.10',
  '@vitest/eslint-plugin': '^1.6.26',
  '@vue/test-utils': '^2.4.11',
  'angular-eslint': '^22.1.0',
  'babel-plugin-react-compiler': '^1.0.0',
  'eslint': '^10.8.0',
  'eslint-config-next': '^16.3.0',
  // The sibling package: tracks its own version, and versions.test.ts fails the moment they diverge.
  '@linteljs/eslint-config': '^1.1.0',
  'eslint-plugin-react-hooks': '^7.1.1',
  'eslint-plugin-better-tailwindcss': '^4.7.0',
  'eslint-plugin-solid': '^0.14.5',
  'eslint-plugin-svelte': '^3.22.0',
  'eslint-plugin-vue': '^10.10.0',
  'happy-dom': '^20.11.1',
  'husky': '^9.1.7',
  'lint-staged': '^17.3.0',
  // Stylelint's syntax for the `<style>` block of a single-file component. Vue and Svelte only.
  'postcss-html': '^2.0.0',
  // stylelint-config-standard@40 peers on ^17, so the two move together.
  'stylelint': '^17.14.1',
  'stylelint-config-recess-order': '^7.7.0',
  'stylelint-config-standard': '^40.0.0',
  'stylelint-config-tailwindcss': '^1.0.1',
  'svelte-check': '^4.7.4',
  'svelte-eslint-parser': '^1.8.0',
  'tailwindcss': '^4.3.3',
  'typescript': '^6.0.3',
  'vite-plugin-solid': '^2.11.14',
  'vitest': '^4.1.10',
  'vue-eslint-parser': '^10.4.1',
  'vue-tsc': '^3.3.9',
  'zod': '^4.4.3',
  'zustand': '^5.0.14',
};

// Written into `packageManager`, pinning the manager itself: an exact version, since corepack rejects a range.
export const PACKAGE_MANAGER_VERSIONS: Record<PackageManager, string> = {
  pnpm: '11.20.0',
  npm: '11.8.0',
  yarn: '4.10.0',
  bun: '1.3.0',
};

export const NODE_ENGINE = '>=24.19.0';
