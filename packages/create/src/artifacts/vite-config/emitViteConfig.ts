import { type Answers, hasLibrary } from '../../model/answers/answers';
import { targetFor } from '../../model/targets';

// Emits `vite.config.ts` for the five Vite targets; Next, Angular and React Native own their own build. `resolve:
// { tsconfigPaths: true }` resolves the same alias list the ESLint config reads, so nothing is declared twice.

export const emitViteConfig = (answers: Answers): string | null => {
  // Read off the record, so a target that hosts a framework composes both plugins without this emitter knowing which.
  const { vite, vitePlugin } = targetFor(answers);

  if (!vite) {
    return null;
  }

  const tailwind = hasLibrary(answers, 'tailwind');

  const imports = [
    "import { defineConfig } from 'vite';",
    ...vitePlugin.imports,
    ...(tailwind ? ["import tailwindcss from '@tailwindcss/vite';"] : []),
  ].join('\n');

  const calls = [
    ...vitePlugin.calls,
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
